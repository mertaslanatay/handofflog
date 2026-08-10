/**
 * Plugin main thread (Figma sandbox).
 *
 * Responsibilities: read the selection, drive snapshot/scan/export, talk to
 * storage, and communicate with the UI iframe over the typed, runtime-validated
 * message contract. All diff logic lives in the Figma-independent core; this
 * file only bridges the Figma API to that core.
 */
import {
  safeParseUIToPluginMessage,
  type BaselineInfo,
  type PluginError,
  type PluginToUIMessage,
  type SelectionSummary,
} from "../shared/messages";
import type { ExportInput, PublishReleaseInput } from "../shared/messages";
import { pluginError } from "../shared/error-catalog";
import type { ChangeSet, Snapshot } from "../shared/schema";
import { diffSnapshots } from "../core/diff";
import { excludeFromChangeSet } from "../core/review";
import { buildRelease, meaningfulChangeCount } from "../core/release";
import { createTelemetryEmitter, scopeHash } from "../core/telemetry";
import type { TelemetryEvent } from "../shared/telemetry";
import {
  loadReleases,
  saveReleases,
  loadSettings,
  saveSettings,
} from "./storage";
import {
  evaluateScopeSize,
  evaluateSnapshotBytes,
  snapshotByteSize,
} from "../core/limits";
import {
  buildSnapshot,
  countNodes,
  CancelledError,
  SUPPORTED_SCOPE_TYPES,
  type ScopeRoot,
} from "./snapshot";
import type { ScopeMode } from "../shared/messages";
import { loadBaseline, saveBaseline, StorageError } from "./storage";
import { createReleaseApiClient } from "../backend/api-client";
import type { Release } from "../shared/release";

let scanCancelled = false;

/** Team backend base URL (must match manifest networkAccess.allowedDomains). */
const BACKEND_BASE_URL = "https://handofflog-lime.vercel.app";

// --- Session cache (main thread is otherwise stateless between messages) ------
let lastBaseline: Snapshot | undefined;
let lastCurrent: Snapshot | undefined;
let lastChangeSet: ChangeSet | undefined;
let lastScopeId: string | undefined;
let telemetryEnabled = false;
let backendToken: string | undefined;

const telemetry = createTelemetryEmitter(
  () => telemetryEnabled,
  (event: TelemetryEvent) => {
    // Opt-in only; stays local (no network in Phase 1). Scaffold for Phase 2.
    // eslint-disable-next-line no-console
    console.log("[handofflog:telemetry]", JSON.stringify(event));
  }
);

figma.showUI(__html__, { width: 380, height: 640, themeColors: true });

// --- Messaging helpers -------------------------------------------------------

function post(message: PluginToUIMessage): void {
  figma.ui.postMessage(message);
}

function postError(error: PluginError): void {
  post({ type: "ERROR", payload: error });
}

function postInit(selection: SelectionSummary, baseline?: BaselineInfo): void {
  const backendConnected = backendToken !== undefined && backendToken.length > 0;
  const fileName = figma.root.name;
  post({
    type: "INIT",
    payload: baseline
      ? { selection, baseline, telemetryEnabled, backendConnected, fileName }
      : { selection, telemetryEnabled, backendConnected, fileName },
  });
}

// --- Selection --------------------------------------------------------------

type ScopeResult =
  | { ok: true; node: SceneNode }
  | { ok: false; error: PluginError };

function resolveScopeNode(): ScopeResult {
  const selection = figma.currentPage.selection;
  if (selection.length === 0) {
    return {
      ok: false,
      error: {
        code: "NO_SELECTION",
        message: "Takip etmek istediğin frame veya section'ı seç.",
        recoverable: true,
      },
    };
  }
  if (selection.length > 1) {
    return {
      ok: false,
      error: {
        code: "UNSUPPORTED_SELECTION",
        message: "Tek bir frame veya section seç.",
        recoverable: true,
      },
    };
  }
  const node = selection[0];
  if (!node || !SUPPORTED_SCOPE_TYPES.has(node.type)) {
    return {
      ok: false,
      error: {
        code: "UNSUPPORTED_SELECTION",
        message: `Bu node tipi (${node?.type ?? "?"}) scope olarak desteklenmiyor.`,
        recoverable: true,
      },
    };
  }
  return { ok: true, node };
}

function selectionSummary(): SelectionSummary {
  const result = resolveScopeNode();
  if (result.ok) {
    return {
      hasSelection: true,
      supported: true,
      nodeId: result.node.id,
      nodeName: result.node.name,
      nodeType: result.node.type,
    };
  }
  return {
    hasSelection: result.error.code !== "NO_SELECTION",
    supported: false,
    reason: result.error.message,
  };
}

function scopeIdFor(node: ScopeRoot): string {
  // The root's stable tracking ID is also the scope key, so the same frame/page
  // maps to the same baseline across sessions.
  const existing = node.getPluginData("handofflog:tid");
  return existing.length > 0 ? existing : `tid_${node.id.replace(/[^a-zA-Z0-9]/g, "_")}`;
}

type ScopeResolution =
  | { ok: true; root: ScopeRoot }
  | { ok: false; error: PluginError };

/** Resolve the scope root for the requested mode (selection frame vs whole page). */
function resolveScope(mode: ScopeMode): ScopeResolution {
  if (mode === "page") {
    return { ok: true, root: figma.currentPage };
  }
  const result = resolveScopeNode();
  return result.ok ? { ok: true, root: result.node } : { ok: false, error: result.error };
}

function genId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function baselineInfo(snapshot: Snapshot): BaselineInfo {
  return {
    scopeId: snapshot.scopeId,
    scopeName: snapshot.scopeName,
    snapshotId: snapshot.id,
    nodeCount: Object.keys(snapshot.nodes).length,
    createdAt: snapshot.createdAt,
  };
}

// --- Actions ----------------------------------------------------------------

/** Gate oversized scopes and return the node count for progress (B-01/B-02). */
function checkScope(node: ScopeRoot): { total: number } {
  const total = countNodes(node);
  const verdict = evaluateScopeSize(total);
  // Warn but never block — page scanning is inherently large (DEC-031).
  if (verdict === "too-large") {
    figma.notify("Çok büyük scope: tarama uzun sürebilir; kaydedilemezse daha dar bir kapsam dene.");
  } else if (verdict === "warn") {
    figma.notify("Büyük scope: işlem biraz uzun sürebilir.");
  }
  return { total };
}

/** Non-blocking warning when a snapshot is unusually large (B-10). */
function maybeWarnSnapshotSize(snapshot: Snapshot): void {
  if (evaluateSnapshotBytes(snapshotByteSize(snapshot)) === "too-large") {
    figma.notify("Snapshot beklenenden büyük; performans etkilenebilir.");
  }
}

async function sendInit(): Promise<void> {
  const settings = await loadSettings();
  telemetryEnabled = settings.telemetryEnabled;
  backendToken = settings.backendToken;
  const selection = selectionSummary();
  const scope = resolveScopeNode();
  if (!scope.ok) {
    postInit(selection);
    return;
  }
  const scopeId = scopeIdFor(scope.node);
  lastScopeId = scopeId;
  try {
    const loaded = await loadBaseline(scopeId);
    if (loaded.status === "found") {
      lastBaseline = loaded.snapshot;
      postInit(selection, baselineInfo(loaded.snapshot));
      return;
    }
    if (loaded.status === "unsupported") {
      postInit(selection);
      postError({
        code: "SCHEMA_VERSION_UNSUPPORTED",
        message: "Bu baseline daha yeni bir sürümle oluşturulmuş. Plugin'i güncelle.",
        recoverable: true,
      });
      return;
    }
    if (loaded.status === "corrupt") {
      postInit(selection);
      postError({
        code: "BASELINE_CORRUPT",
        message: "Kayıtlı baseline okunamadı. Veri korundu; yeni baseline oluşturabilirsin.",
        recoverable: true,
      });
      return;
    }
    postInit(selection);
  } catch (err) {
    postInit(selection);
    postError(toPluginError(err));
  }
}

async function createBaseline(input: { scopeMode?: ScopeMode }): Promise<void> {
  const mode = input.scopeMode ?? "selection";
  const scope = resolveScope(mode);
  if (!scope.ok) return postError(scope.error);

  const scopeId = scopeIdFor(scope.root);
  lastScopeId = scopeId;
  let isReplacing = false;
  try {
    const existing = await loadBaseline(scopeId);
    isReplacing = existing.status === "found";
  } catch {
    // A read failure here shouldn't block creating a fresh baseline.
  }

  const { total } = checkScope(scope.root);

  const startedAt = Date.now();
  try {
    const { snapshot, nodeCount } = await buildSnapshot(scope.root, {
      scopeId,
      now: new Date().toISOString(),
      snapshotId: genId("snap"),
      persistTrackingIds: mode !== "page",
      onProgress: (processed) =>
        post({ type: "PROGRESS", payload: { phase: "baseline", processed, total } }),
    });
    maybeWarnSnapshotSize(snapshot);
    await saveBaseline(snapshot);
    telemetry.emit({
      event: "baseline_created",
      scopeHash: scopeHash(scopeId),
      nodeCount,
      durationMs: Date.now() - startedAt,
      schemaVersion: snapshot.schemaVersion,
    });
    lastBaseline = snapshot;
    lastCurrent = undefined;
    lastChangeSet = undefined;
    post({
      type: "SNAPSHOT_CREATED",
      payload: {
        snapshotId: snapshot.id,
        scopeId: snapshot.scopeId,
        scopeName: snapshot.scopeName,
        nodeCount,
        createdAt: snapshot.createdAt,
        isReplacingBaseline: isReplacing,
      },
    });
  } catch (err) {
    postError(toPluginError(err));
  }
}

async function scanChanges(input: { scopeMode?: ScopeMode }): Promise<void> {
  const mode = input.scopeMode ?? "selection";
  const scope = resolveScope(mode);
  if (!scope.ok) return postError(scope.error);

  const scopeId = scopeIdFor(scope.root);
  lastScopeId = scopeId;
  let baseline: Snapshot;
  try {
    const loaded = await loadBaseline(scopeId);
    if (loaded.status === "empty") {
      return postError({
        code: "BASELINE_NOT_FOUND",
        message: "Bu seçim için henüz baseline oluşturulmadı.",
        recoverable: true,
      });
    }
    if (loaded.status === "unsupported") {
      return postError({
        code: "SCHEMA_VERSION_UNSUPPORTED",
        message: "Baseline daha yeni bir sürümle oluşturulmuş. Plugin'i güncelle.",
        recoverable: true,
      });
    }
    if (loaded.status === "corrupt") {
      return postError({
        code: "BASELINE_CORRUPT",
        message: "Baseline bozuk görünüyor. Veri korundu; yeni baseline oluştur.",
        recoverable: true,
      });
    }
    baseline = loaded.snapshot;
  } catch (err) {
    return postError(toPluginError(err));
  }

  const { total } = checkScope(scope.root);

  scanCancelled = false;
  const startedAt = Date.now();
  try {
    const { snapshot: current } = await buildSnapshot(scope.root, {
      scopeId,
      now: new Date().toISOString(),
      snapshotId: genId("snap"),
      persistTrackingIds: mode !== "page",
      onProgress: (processed) =>
        post({ type: "PROGRESS", payload: { phase: "scan", processed, total } }),
      shouldCancel: () => scanCancelled,
    });
    const changeSet = diffSnapshots(baseline, current);
    lastBaseline = baseline;
    lastCurrent = current;
    lastChangeSet = changeSet;
    post({ type: "SCAN_COMPLETED", payload: changeSet });
    telemetry.emit({
      event: "scan_completed",
      scopeHash: scopeHash(scopeId),
      added: changeSet.added.length,
      removed: changeSet.removed.length,
      modified: changeSet.modified.length,
      unchanged: changeSet.unchangedCount,
      durationMs: Date.now() - startedAt,
    });
  } catch (err) {
    if (err instanceof CancelledError) return; // user cancelled; UI already reset
    postError(toPluginError(err));
  }
}

async function selectNode(nodeId: string): Promise<void> {
  try {
    const node = await figma.getNodeByIdAsync(nodeId);
    if (node && node.type !== "PAGE" && node.type !== "DOCUMENT") {
      const scene = node as SceneNode;
      figma.currentPage.selection = [scene];
      figma.viewport.scrollAndZoomIntoView([scene]);
    }
  } catch (err) {
    postError(toPluginError(err));
  }
}

async function publishRelease(input: PublishReleaseInput): Promise<void> {
  if (lastChangeSet === undefined || lastCurrent === undefined || lastScopeId === undefined) {
    return postError(
      pluginError("EXPORT_EMPTY", "Yayınlanacak bir tarama sonucu yok. Önce Scan Changes yap.")
    );
  }

  const scopeId = lastScopeId; // scope of the last baseline/scan (selection or page)
  const excluded = input.excludedTrackingIds ?? [];
  const meaningful = meaningfulChangeCount(lastChangeSet, excluded);
  const release = buildRelease({
    changeSet: lastChangeSet,
    excludedTrackingIds: excluded,
    name: input.name,
    version: input.version,
    type: input.type,
    description: input.description,
    id: genId("rel"),
    now: new Date().toISOString(),
    status: "published",
  });

  try {
    const history = await loadReleases(scopeId);
    await saveReleases(scopeId, [release, ...history]);
    // Promote the scanned snapshot to the new baseline (validated + atomic).
    await saveBaseline(lastCurrent);
    lastBaseline = lastCurrent;
    lastChangeSet = undefined;
    post({ type: "RELEASE_PUBLISHED", payload: release });
    telemetry.emit({
      event: "release_published",
      scopeHash: scopeHash(scopeId),
      changeCount: release.changes.length,
      meaningfulCount: meaningful,
      maxImpact: release.impact,
    });
    void pushReleaseToBackend(release);
  } catch (err) {
    postError(toPluginError(err));
  }
}

async function getReleases(): Promise<void> {
  // Prefer the last active scope (works for page mode too); fall back to selection.
  let scopeId = lastScopeId;
  if (scopeId === undefined) {
    const scope = resolveScopeNode();
    if (!scope.ok) return post({ type: "RELEASES_LOADED", payload: { releases: [] } });
    scopeId = scopeIdFor(scope.node);
  }
  try {
    const releases = await loadReleases(scopeId);
    post({ type: "RELEASES_LOADED", payload: { releases } });
  } catch (err) {
    postError(toPluginError(err));
  }
}

async function setTelemetry(enabled: boolean): Promise<void> {
  telemetryEnabled = enabled;
  try {
    await saveSettings({ telemetryEnabled: enabled, backendToken });
  } catch (err) {
    postError(toPluginError(err));
  }
}

async function setBackendToken(token: string): Promise<void> {
  backendToken = token.trim().length > 0 ? token.trim() : undefined;
  try {
    await saveSettings({ telemetryEnabled, backendToken });
    figma.notify(backendToken ? "Ekip sunucusuna bağlandı." : "Bağlantı token'ı temizlendi.");
  } catch (err) {
    postError(toPluginError(err));
  }
}

/** Push a published release to the team backend (best-effort; local stays authoritative). */
async function pushReleaseToBackend(release: Release): Promise<void> {
  if (!backendToken) return;
  try {
    const client = createReleaseApiClient({
      baseUrl: BACKEND_BASE_URL,
      token: backendToken,
      fetch: async (url, init) => {
        const res = await fetch(url, init as RequestInit);
        return { ok: res.ok, status: res.status, json: () => res.json() };
      },
    });
    await client.publishRelease(release);
    figma.notify("Release ekip sunucusuna gönderildi.");
  } catch {
    figma.notify("Release yerelde kaydedildi; sunucuya gönderilemedi.");
  }
}

function exportJson(input: ExportInput): void {
  const { kind } = input;
  let value: unknown;
  if (kind === "baseline") {
    value = lastBaseline;
  } else if (kind === "current") {
    value = lastCurrent;
  } else if (
    lastChangeSet !== undefined &&
    input.excludedTrackingIds &&
    input.excludedTrackingIds.length > 0
  ) {
    value = excludeFromChangeSet(lastChangeSet, new Set(input.excludedTrackingIds));
  } else {
    value = lastChangeSet;
  }

  if (value === undefined) {
    return postError(pluginError("EXPORT_EMPTY"));
  }
  post({
    type: "EXPORT_READY",
    payload: {
      kind,
      filename: `handofflog-${kind}-${Date.now()}.json`,
      json: JSON.stringify(value, null, 2),
    },
  });
}

function toPluginError(err: unknown): PluginError {
  if (err instanceof StorageError) {
    return { code: err.code, message: err.message, recoverable: true };
  }
  return {
    code: "UNKNOWN",
    message: err instanceof Error ? err.message : String(err),
    recoverable: true,
  };
}

// --- Wiring -----------------------------------------------------------------

figma.on("selectionchange", () => {
  post({ type: "SELECTION_CHANGED", payload: selectionSummary() });
});

figma.ui.onmessage = (raw: unknown) => {
  const parsed = safeParseUIToPluginMessage(raw);
  if (!parsed.success) {
    postError({
      code: "UNKNOWN",
      message: "Geçersiz mesaj alındı.",
      recoverable: true,
    });
    return;
  }
  const message = parsed.data;
  switch (message.type) {
    case "GET_INIT":
      void sendInit();
      break;
    case "CREATE_BASELINE":
      void createBaseline(message.payload);
      break;
    case "SCAN_CHANGES":
      void scanChanges(message.payload);
      break;
    case "CANCEL_SCAN":
      scanCancelled = true;
      break;
    case "SELECT_NODE":
      void selectNode(message.payload.nodeId);
      break;
    case "PUBLISH_RELEASE":
      void publishRelease(message.payload);
      break;
    case "GET_RELEASES":
      void getReleases();
      break;
    case "SET_TELEMETRY":
      void setTelemetry(message.payload.enabled);
      break;
    case "SET_BACKEND_TOKEN":
      void setBackendToken(message.payload.token);
      break;
    case "EXPORT_JSON":
      exportJson(message.payload);
      break;
    case "CLOSE_PLUGIN":
      figma.closePlugin();
      break;
    default: {
      // Exhaustiveness guard.
      const _never: never = message;
      void _never;
    }
  }
};

// Kick off the initial handshake.
void sendInit();
