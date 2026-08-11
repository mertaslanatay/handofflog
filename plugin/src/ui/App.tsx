import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  BaselineInfo,
  ExportKind,
  PluginError,
  ProgressPayload,
  SelectionSummary,
  SnapshotSummary,
} from "../shared/messages";
import type { ChangeCategory, ChangeSet, Impact, NodeChange, VisualDiffScreen } from "../shared/schema";
import type { VisualDiffPayload } from "../shared/messages";
import type { Release, ReleaseType } from "../shared/release";
import { formatValue } from "../core/classify";
import { filterChanges, sortByImpact, excludeFromChangeSet } from "../core/review";
import { computeMaxImpact, suggestReleaseType } from "../core/release";
import { relativeTime } from "../core/relative-time";
import { summarizeByScreen, screenChangelogLines } from "../core/page-report";
import { onPluginMessage, sendToPlugin } from "./messaging";

type ScopeMode = "selection" | "page";

const RELEASE_TYPES: ReleaseType[] = ["patch", "minor", "major", "hotfix", "content", "design-system"];

type Busy = "idle" | "creating" | "scanning";
type SortDir = "desc" | "asc";

const CATEGORIES: ChangeCategory[] = ["structural", "layout", "visual", "typography", "content", "component"];
const IMPACTS: Impact[] = ["breaking", "high", "medium", "low"];

export function App(): JSX.Element {
  const [selection, setSelection] = useState<SelectionSummary | undefined>();
  const [baseline, setBaseline] = useState<BaselineInfo | undefined>();
  const [snapshot, setSnapshot] = useState<SnapshotSummary | undefined>();
  const [changeSet, setChangeSet] = useState<ChangeSet | undefined>();
  const [error, setError] = useState<PluginError | undefined>();
  const [busy, setBusy] = useState<Busy>("idle");
  const [progress, setProgress] = useState<ProgressPayload | undefined>();
  const [excluded, setExcluded] = useState<ReadonlySet<string>>(new Set());
  const [categories, setCategories] = useState<ReadonlySet<ChangeCategory>>(new Set());
  const [impacts, setImpacts] = useState<ReadonlySet<Impact>>(new Set());
  const [query, setQuery] = useState("");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [confirmRebaseline, setConfirmRebaseline] = useState(false);
  const [telemetryEnabled, setTelemetryEnabled] = useState(false);
  const [backendConnected, setBackendConnected] = useState(false);
  const [fileName, setFileName] = useState<string | undefined>();
  const [scopeMode, setScopeMode] = useState<ScopeMode>("selection");
  const [releases, setReleases] = useState<Release[]>([]);
  const [visualDiff, setVisualDiff] = useState<VisualDiffPayload | undefined>();
  const [visualDiffBusy, setVisualDiffBusy] = useState(false);

  useEffect(() => {
    const off = onPluginMessage((message) => {
      switch (message.type) {
        case "INIT":
          setSelection(message.payload.selection);
          setBaseline(message.payload.baseline);
          setTelemetryEnabled(message.payload.telemetryEnabled);
          setBackendConnected(message.payload.backendConnected);
          setFileName(message.payload.fileName);
          sendToPlugin({ type: "GET_RELEASES" });
          break;
        case "RELEASES_LOADED":
          setReleases(message.payload.releases);
          break;
        case "RELEASE_PUBLISHED":
          setBusy("idle");
          setError(undefined);
          setChangeSet(undefined);
          setExcluded(new Set());
          sendToPlugin({ type: "GET_INIT" });
          sendToPlugin({ type: "GET_RELEASES" });
          break;
        case "SELECTION_CHANGED":
          setSelection(message.payload);
          break;
        case "PROGRESS":
          setProgress(message.payload);
          break;
        case "SNAPSHOT_CREATED":
          setBusy("idle");
          setError(undefined);
          setProgress(undefined);
          setSnapshot(message.payload);
          setChangeSet(undefined);
          setBaseline({
            scopeId: message.payload.scopeId,
            scopeName: message.payload.scopeName,
            snapshotId: message.payload.snapshotId,
            nodeCount: message.payload.nodeCount,
            createdAt: message.payload.createdAt,
          });
          break;
        case "SCAN_COMPLETED":
          setBusy("idle");
          setError(undefined);
          setProgress(undefined);
          setChangeSet(message.payload);
          setExcluded(new Set());
          setVisualDiff(undefined);
          break;
        case "VISUAL_DIFF":
          setVisualDiffBusy(false);
          setVisualDiff(message.payload);
          break;
        case "EXPORT_READY":
          downloadJson(message.payload.filename, message.payload.json);
          break;
        case "ERROR":
          setBusy("idle");
          setProgress(undefined);
          setError(message.payload);
          break;
      }
    });
    sendToPlugin({ type: "GET_INIT" });
    return off;
  }, []);

  const startCreateBaseline = useCallback(() => {
    setBusy("creating");
    setError(undefined);
    sendToPlugin({ type: "CREATE_BASELINE", payload: { scopeMode } });
  }, [scopeMode]);

  const onCreateBaselineClick = useCallback(() => {
    if (baseline) setConfirmRebaseline(true);
    else startCreateBaseline();
  }, [baseline, startCreateBaseline]);

  const scan = useCallback(() => {
    setBusy("scanning");
    setError(undefined);
    setProgress(undefined);
    sendToPlugin({ type: "SCAN_CHANGES", payload: { scopeMode } });
  }, [scopeMode]);

  const cancelScan = useCallback(() => {
    sendToPlugin({ type: "CANCEL_SCAN" });
    setBusy("idle");
    setProgress(undefined);
  }, []);

  const requestVisualDiff = useCallback(() => {
    setVisualDiffBusy(true);
    setError(undefined);
    sendToPlugin({ type: "GET_VISUAL_DIFF" });
  }, []);

  const exportJson = useCallback(
    (kind: ExportKind) => {
      if (kind === "changeset") {
        sendToPlugin({ type: "EXPORT_JSON", payload: { kind, excludedTrackingIds: [...excluded] } });
      } else {
        sendToPlugin({ type: "EXPORT_JSON", payload: { kind } });
      }
    },
    [excluded]
  );

  const toggleExclude = useCallback((trackingId: string) => {
    setExcluded((prev) => {
      const next = new Set(prev);
      if (next.has(trackingId)) next.delete(trackingId);
      else next.add(trackingId);
      return next;
    });
  }, []);

  const setBulk = useCallback((ids: string[], exclude: boolean) => {
    setExcluded((prev) => {
      const next = new Set(prev);
      for (const id of ids) {
        if (exclude) next.add(id);
        else next.delete(id);
      }
      return next;
    });
  }, []);

  const zoomTo = useCallback((nodeId: string | undefined) => {
    if (nodeId) sendToPlugin({ type: "SELECT_NODE", payload: { nodeId } });
  }, []);

  const view = useCallback(
    (list: NodeChange[]): NodeChange[] =>
      sortByImpact(filterChanges(list, { categories, impacts, query }), sortDir),
    [categories, impacts, query, sortDir]
  );

  const publish = useCallback(
    (form: { name: string; version: string; type: ReleaseType; description: string }) => {
      sendToPlugin({
        type: "PUBLISH_RELEASE",
        payload: {
          name: form.name,
          version: form.version,
          type: form.type,
          description: form.description.trim() ? form.description.trim() : undefined,
          excludedTrackingIds: [...excluded],
        },
      });
    },
    [excluded]
  );

  const toggleTelemetry = useCallback(() => {
    setTelemetryEnabled((v) => {
      const next = !v;
      sendToPlugin({ type: "SET_TELEMETRY", payload: { enabled: next } });
      return next;
    });
  }, []);

  const canScan = Boolean(baseline) && selection?.supported === true;

  const liveMessage = useMemo(() => {
    if (progress) {
      const pct = progress.total ? Math.round((progress.processed / progress.total) * 100) : undefined;
      return `İşleniyor: ${progress.processed}${progress.total ? ` / ${progress.total}` : ""} node${pct !== undefined ? ` (%${pct})` : ""}.`;
    }
    if (changeSet) {
      return `${changeSet.added.length} eklendi, ${changeSet.modified.length} değişti, ${changeSet.removed.length} silindi.`;
    }
    return "";
  }, [progress, changeSet]);

  return (
    <div className="hl-app">
      <div className="sr-only" aria-live="polite" role="status">
        {liveMessage}
      </div>

      <div className="hl-scroll">
        <header>
          <h1>Handofflog</h1>
          <p className="hl-muted">Snapshot-based design change tracking</p>
          {fileName ? (
            <dl className="hl-overview" aria-label="Project" style={{ marginBottom: 8 }}>
              <div>
                <dt>File</dt>
                <dd>{fileName}</dd>
              </div>
            </dl>
          ) : null}
          <div className="hl-filters" role="group" aria-label="Tarama kapsamı" style={{ marginBottom: 8 }}>
            <span className="hl-count">Scope:</span>
            <button className="hl-chip" aria-pressed={scopeMode === "selection"} onClick={() => setScopeMode("selection")}>
              Selection
            </button>
            <button className="hl-chip" aria-pressed={scopeMode === "page"} onClick={() => setScopeMode("page")}>
              Current Page
            </button>
          </div>
          <label className="hl-toggle" htmlFor="telemetry-toggle">
            <input id="telemetry-toggle" type="checkbox" checked={telemetryEnabled} onChange={toggleTelemetry} />
            Anonim kullanım istatistikleri (opt-in)
          </label>
          <BackendConnect
            connected={backendConnected}
            onSave={(token) => sendToPlugin({ type: "SET_BACKEND_TOKEN", payload: { token } })}
          />
        </header>

        {error && (
          <div className="hl-banner" role="alert">
            {error.message}
          </div>
        )}

        <Overview selection={selection} baseline={baseline} snapshot={snapshot} changeSet={changeSet} />

        <MainContent
          selection={selection}
          baseline={baseline}
          changeSet={changeSet}
          busy={busy}
          progress={progress}
          excluded={excluded}
          categories={categories}
          impacts={impacts}
          query={query}
          sortDir={sortDir}
          onCreateBaseline={onCreateBaselineClick}
          onScan={scan}
          onCancel={cancelScan}
          onToggleExclude={toggleExclude}
          onBulk={setBulk}
          onZoom={zoomTo}
          onToggleCategory={(c) => setCategories((p) => toggleInSet(p, c))}
          onToggleImpact={(i) => setImpacts((p) => toggleInSet(p, i))}
          onQuery={setQuery}
          onToggleSort={() => setSortDir((d) => (d === "desc" ? "asc" : "desc"))}
          view={view}
        />

        {changeSet && hasChanges(changeSet) && (
          <VisualDiffSection payload={visualDiff} busy={visualDiffBusy} onRequest={requestVisualDiff} />
        )}

        {changeSet && hasChanges(changeSet) && (
          <PublishSection changeSet={changeSet} excluded={excluded} onPublish={publish} />
        )}

        {releases.length > 0 && <ReleaseHistory releases={releases} />}
      </div>

      <footer className="hl-footer">
        <button onClick={onCreateBaselineClick} disabled={selection?.supported !== true || busy !== "idle"}>
          {baseline ? "Re-baseline" : "Create Baseline"}
        </button>
        <button className="hl-primary" onClick={scan} disabled={!canScan || busy !== "idle"}>
          {busy === "scanning" ? "Scanning…" : "Scan Changes"}
        </button>
        <button onClick={() => exportJson("baseline")} disabled={!baseline}>
          Export Baseline
        </button>
        <button onClick={() => exportJson("changeset")} disabled={!changeSet}>
          Export ChangeSet
        </button>
      </footer>

      {confirmRebaseline && (
        <ConfirmDialog
          message={`Yeni baseline mevcut baseline'ın yerine geçecek ve taranmamış değişiklik referansları sıfırlanacak. Devam edilsin mi?`}
          confirmLabel="Re-baseline"
          onConfirm={() => {
            setConfirmRebaseline(false);
            startCreateBaseline();
          }}
          onCancel={() => setConfirmRebaseline(false)}
        />
      )}
    </div>
  );
}

function Overview(props: {
  selection: SelectionSummary | undefined;
  baseline: BaselineInfo | undefined;
  snapshot: SnapshotSummary | undefined;
  changeSet: ChangeSet | undefined;
}): JSX.Element {
  const { selection, baseline, changeSet } = props;
  const scopeName = baseline?.scopeName ?? selection?.nodeName ?? "—";
  const lastResult = changeSet
    ? `${changeSet.added.length} added · ${changeSet.modified.length} modified · ${changeSet.removed.length} removed`
    : "—";
  return (
    <dl className="hl-overview" aria-label="Overview">
      <div>
        <dt>Scope</dt>
        <dd>{scopeName}</dd>
      </div>
      <div>
        <dt>Tracked nodes</dt>
        <dd className="hl-count">{baseline?.nodeCount ?? "—"}</dd>
      </div>
      <div>
        <dt>Baseline</dt>
        <dd>{baseline ? formatDate(baseline.createdAt) : "None"}</dd>
      </div>
      <div>
        <dt>Last scan</dt>
        <dd>{lastResult}</dd>
      </div>
    </dl>
  );
}

interface MainContentProps {
  selection: SelectionSummary | undefined;
  baseline: BaselineInfo | undefined;
  changeSet: ChangeSet | undefined;
  busy: Busy;
  progress: ProgressPayload | undefined;
  excluded: ReadonlySet<string>;
  categories: ReadonlySet<ChangeCategory>;
  impacts: ReadonlySet<Impact>;
  query: string;
  sortDir: SortDir;
  onCreateBaseline: () => void;
  onScan: () => void;
  onCancel: () => void;
  onToggleExclude: (trackingId: string) => void;
  onBulk: (ids: string[], exclude: boolean) => void;
  onZoom: (nodeId: string | undefined) => void;
  onToggleCategory: (c: ChangeCategory) => void;
  onToggleImpact: (i: Impact) => void;
  onQuery: (q: string) => void;
  onToggleSort: () => void;
  view: (list: NodeChange[]) => NodeChange[];
}

function MainContent(props: MainContentProps): JSX.Element {
  const { selection, baseline, changeSet, busy, progress } = props;

  if (!selection || selection.supported !== true) {
    return (
      <EmptyState
        message={selection?.reason ?? "Takip etmek istediğin frame veya section'ı Figma canvas'ından seç."}
        cta="Use Current Selection"
        onClick={() => sendToPlugin({ type: "GET_INIT" })}
      />
    );
  }

  if (!baseline) {
    return (
      <EmptyState
        message="Bu seçim için henüz başlangıç sürümü oluşturulmadı."
        cta={busy === "creating" ? "Creating…" : "Create Baseline"}
        onClick={props.onCreateBaseline}
        disabled={busy !== "idle"}
      />
    );
  }

  if (busy === "scanning") {
    return <ProgressView progress={progress} onCancel={props.onCancel} />;
  }

  if (!changeSet) {
    return (
      <EmptyState
        message="Baseline hazır. Değişiklikleri görmek için tarama yap."
        cta="Scan Changes"
        onClick={props.onScan}
      />
    );
  }

  const total = changeSet.added.length + changeSet.modified.length + changeSet.removed.length;
  if (total === 0) {
    return (
      <EmptyState message="Baseline'dan bu yana takip edilen bir değişiklik bulunamadı." cta="Scan Again" onClick={props.onScan} />
    );
  }

  return (
    <div>
      <ScreensSummary changeSet={changeSet} />
      <Toolbar {...props} />
      <ChangeGroup title="Added" changes={props.view(changeSet.added)} {...props} />
      <ChangeGroup title="Modified" changes={props.view(changeSet.modified)} {...props} />
      <ChangeGroup title="Removed" changes={props.view(changeSet.removed)} {...props} />
      <p className="hl-muted hl-count">{changeSet.unchangedCount} node unchanged</p>
    </div>
  );
}

function Toolbar(props: MainContentProps): JSX.Element {
  return (
    <div className="hl-toolbar">
      <input
        className="hl-search"
        type="search"
        placeholder="Node adına göre ara…"
        value={props.query}
        onChange={(e) => props.onQuery(e.target.value)}
        aria-label="Değişiklikleri node adına göre filtrele"
      />
      <div className="hl-filters" role="group" aria-label="Kategori filtresi">
        {CATEGORIES.map((c) => (
          <button
            key={c}
            className="hl-chip"
            aria-pressed={props.categories.has(c)}
            onClick={() => props.onToggleCategory(c)}
          >
            {c}
          </button>
        ))}
      </div>
      <div className="hl-filters" role="group" aria-label="Etki filtresi">
        {IMPACTS.map((i) => (
          <button key={i} className="hl-chip" aria-pressed={props.impacts.has(i)} onClick={() => props.onToggleImpact(i)}>
            {i}
          </button>
        ))}
        <button className="hl-chip" onClick={props.onToggleSort} aria-label="Etkiye göre sıralama yönünü değiştir">
          Impact {props.sortDir === "desc" ? "↓" : "↑"}
        </button>
      </div>
    </div>
  );
}

function ChangeGroup(
  props: MainContentProps & { title: string; changes: NodeChange[] }
): JSX.Element | null {
  if (props.changes.length === 0) return null;
  const ids = allTrackingIdsOf(props.changes);
  return (
    <section>
      <h2>
        {props.title} <span className="hl-count">({props.changes.length})</span>
      </h2>
      <div className="hl-bulk">
        <button className="hl-link" onClick={() => props.onBulk(ids, false)}>
          Tümünü dahil et
        </button>
        <button className="hl-link" onClick={() => props.onBulk(ids, true)}>
          Tümünü çıkar
        </button>
      </div>
      {props.changes.map((change) => (
        <ChangeCard
          key={change.trackingId}
          change={change}
          included={!props.excluded.has(change.trackingId)}
          onToggle={props.onToggleExclude}
          onZoom={props.onZoom}
        />
      ))}
    </section>
  );
}

function ChangeCard(props: {
  change: NodeChange;
  included: boolean;
  onToggle: (trackingId: string) => void;
  onZoom: (nodeId: string | undefined) => void;
}): JSX.Element {
  const { change, included, onToggle, onZoom } = props;
  const toggleId = `include-${change.trackingId}`;
  return (
    <div className={`hl-change hl-change--${change.kind}`}>
      <div className="hl-change__body">
        <div className="hl-change__title">
          <span className="hl-kind">{change.kind}</span>
          <button className="hl-link" onClick={() => onZoom(change.nodeId)} aria-label={`${change.nodeName} node'unu canvas'ta göster`}>
            {change.nodeName}
          </button>
          <span className="hl-cat">{change.nodeType}</span>
        </div>
        {change.propertyChanges.map((pc, i) => (
          <div className="hl-diff" key={`${pc.path}-${i}`}>
            <strong>{pc.path}</strong> <span className="hl-cat">({pc.category})</span>{" "}
            <del>{formatValue(pc.previousValue)}</del> → <ins>{formatValue(pc.currentValue)}</ins>
          </div>
        ))}
      </div>
      <span className={`hl-impact hl-impact--${change.impact}`} aria-label={`impact ${impactLabel(change.impact)}`}>
        {impactLabel(change.impact)}
      </span>
      <label className="hl-toggle" htmlFor={toggleId}>
        <input id={toggleId} type="checkbox" checked={included} onChange={() => onToggle(change.trackingId)} />
        <span className="sr-only">{`${change.nodeName} değişikliğini release'e dahil et`}</span>
        Include
      </label>
    </div>
  );
}

function ProgressView(props: { progress: ProgressPayload | undefined; onCancel: () => void }): JSX.Element {
  const { progress } = props;
  const pct = progress?.total ? Math.min(100, Math.round((progress.processed / progress.total) * 100)) : undefined;
  return (
    <div className="hl-progress" role="status" aria-live="polite">
      <p className="hl-muted">
        Taranıyor… {progress ? `${progress.processed}${progress.total ? ` / ${progress.total}` : ""}` : ""}
      </p>
      <div
        className="hl-progress__track"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct ?? undefined}
      >
        <div className="hl-progress__fill" style={{ width: pct !== undefined ? `${pct}%` : "40%" }} />
      </div>
      <button onClick={props.onCancel} style={{ marginTop: 10 }}>
        İptal
      </button>
    </div>
  );
}

function ConfirmDialog(props: {
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}): JSX.Element {
  return (
    <div className="hl-dialog-backdrop" onClick={props.onCancel}>
      <div
        className="hl-dialog"
        role="dialog"
        aria-modal="true"
        aria-label="Onay"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          if (e.key === "Escape") props.onCancel();
        }}
      >
        <p>{props.message}</p>
        <div className="hl-dialog__actions">
          <button onClick={props.onCancel}>Vazgeç</button>
          <button className="hl-primary" onClick={props.onConfirm} autoFocus>
            {props.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function EmptyState(props: { message: string; cta: string; onClick: () => void; disabled?: boolean }): JSX.Element {
  return (
    <div className="hl-empty">
      <p className="hl-muted">{props.message}</p>
      <button className="hl-primary" onClick={props.onClick} disabled={props.disabled ?? false}>
        {props.cta}
      </button>
    </div>
  );
}

function PublishSection(props: {
  changeSet: ChangeSet;
  excluded: ReadonlySet<string>;
  onPublish: (form: { name: string; version: string; type: ReleaseType; description: string }) => void;
}): JSX.Element {
  const included = useMemo(
    () => excludeFromChangeSet(props.changeSet, new Set(props.excluded)),
    [props.changeSet, props.excluded]
  );
  const includedChanges = [...included.added, ...included.modified, ...included.removed];
  const suggested = suggestReleaseType(computeMaxImpact(includedChanges));

  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [version, setVersion] = useState("");
  const [type, setType] = useState<ReleaseType>(suggested);
  const [description, setDescription] = useState("");

  if (!open) {
    return (
      <section>
        <h2>Publish</h2>
        <p className="hl-muted hl-count">
          {includedChanges.length} değişiklik dahil · önerilen tür: {suggested}
        </p>
        <button
          className="hl-primary"
          disabled={includedChanges.length === 0}
          onClick={() => {
            setType(suggested);
            setOpen(true);
          }}
        >
          Create Release
        </button>
      </section>
    );
  }

  const valid = name.trim().length > 0 && version.trim().length > 0;
  return (
    <section>
      <h2>Publish</h2>
      <div className="hl-toolbar">
        <input className="hl-search" placeholder="Release adı" value={name} onChange={(e) => setName(e.target.value)} aria-label="Release adı" />
        <input className="hl-search" placeholder="Versiyon (örn. 1.2.0)" value={version} onChange={(e) => setVersion(e.target.value)} aria-label="Versiyon" />
        <label className="hl-toggle" htmlFor="release-type">
          Tür
          <select id="release-type" value={type} onChange={(e) => setType(e.target.value as ReleaseType)}>
            {RELEASE_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
        <textarea className="hl-search" placeholder="Açıklama (opsiyonel)" value={description} onChange={(e) => setDescription(e.target.value)} aria-label="Açıklama" rows={2} />
      </div>
      <div className="hl-bulk">
        <button
          className="hl-primary"
          disabled={!valid}
          onClick={() => props.onPublish({ name: name.trim(), version: version.trim(), type, description })}
        >
          Publish Release
        </button>
        <button onClick={() => setOpen(false)}>Vazgeç</button>
      </div>
    </section>
  );
}

function ReleaseHistory(props: { releases: Release[] }): JSX.Element {
  return (
    <section>
      <h2>
        Releases <span className="hl-count">({props.releases.length})</span>
      </h2>
      {props.releases.map((r) => (
        <div className="hl-card" key={r.id}>
          <div className="hl-change__title">
            <strong>{r.name}</strong>
            <span className="hl-cat">
              v{r.version} · {r.type}
            </span>
            <span className={`hl-impact hl-impact--${r.impact}`}>{impactLabel(r.impact)}</span>
          </div>
          <p className="hl-muted hl-count">
            {r.changes.length} değişiklik · {r.status} · {formatDate(r.publishedAt ?? r.createdAt)} ·{" "}
            {relativeTime(r.publishedAt ?? r.createdAt, Date.now())}
          </p>
          {r.description ? <p>{r.description}</p> : null}
        </div>
      ))}
    </section>
  );
}

function hasChanges(cs: ChangeSet): boolean {
  return cs.added.length + cs.modified.length + cs.removed.length > 0;
}

const KIND_COLOR: Record<string, string> = {
  added: "#16a34a",
  removed: "#dc2626",
  modified: "#7c3aed",
};

function VisualDiffSection(props: {
  payload: VisualDiffPayload | undefined;
  busy: boolean;
  onRequest: () => void;
}): JSX.Element {
  const { payload, busy, onRequest } = props;
  return (
    <section>
      <h2>Visual Diff</h2>
      {!payload && (
        <>
          <p className="hl-muted hl-count">
            Değişen ekranların görüntüsünü, değişen katmanlar işaretli olarak gör.
          </p>
          <button className="hl-primary" onClick={onRequest} disabled={busy}>
            {busy ? "Görüntü hazırlanıyor…" : "Show Visual Diff"}
          </button>
        </>
      )}
      {payload && payload.screens.length === 0 && (
        <p className="hl-muted hl-count">
          İşaretlenecek konumlu değişiklik bulunamadı (koordinat bilgisi olmayan değişiklikler atlanır).
        </p>
      )}
      {payload &&
        payload.screens.map((screen) => (
          <VisualDiffScreenView key={screen.screen} screen={screen} />
        ))}
      {payload && (
        <div className="hl-bulk" style={{ marginTop: 8 }}>
          {payload.partial && (
            <span className="hl-muted hl-count">Bazı ekranlar atlandı (çok fazla ekran).</span>
          )}
          <button className="hl-link" onClick={onRequest} disabled={busy}>
            {busy ? "Yenileniyor…" : "Yenile"}
          </button>
        </div>
      )}
    </section>
  );
}

function VisualDiffScreenView({ screen }: { screen: VisualDiffScreen }): JSX.Element {
  const img = screen.after;
  const w = img?.width ?? 0;
  const h = img?.height ?? 0;
  return (
    <div className="hl-card">
      <div className="hl-change__title">
        <strong>{screen.screen}</strong>
        <span className="hl-count">{screen.regions.length} değişiklik</span>
      </div>
      {img?.dataUri && w > 0 && h > 0 ? (
        <div style={{ position: "relative", width: "100%", marginTop: 6 }}>
          <img
            src={img.dataUri}
            alt={`${screen.screen} güncel görünüm`}
            style={{ display: "block", width: "100%", height: "auto", borderRadius: 4 }}
          />
          {screen.regions.map((r) => {
            const color = KIND_COLOR[r.kind] ?? "#7c3aed";
            return (
              <div
                key={r.trackingId}
                title={`${r.label} (${r.kind})`}
                style={{
                  position: "absolute",
                  left: `${(r.x / w) * 100}%`,
                  top: `${(r.y / h) * 100}%`,
                  width: `${(r.width / w) * 100}%`,
                  height: `${(r.height / h) * 100}%`,
                  border: `2px dashed ${color}`,
                  boxSizing: "border-box",
                  pointerEvents: "none",
                }}
              >
                <span
                  style={{
                    position: "absolute",
                    top: -14,
                    left: 0,
                    fontSize: 9,
                    lineHeight: "12px",
                    padding: "0 3px",
                    background: color,
                    color: "#fff",
                    borderRadius: 2,
                    whiteSpace: "nowrap",
                    maxWidth: "100%",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  Changed
                </span>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="hl-muted hl-count" style={{ marginTop: 4 }}>
          Bu ekran için görüntü alınamadı; değişen katmanlar: {screen.regions.map((r) => r.label).join(", ") || "—"}
        </p>
      )}
    </div>
  );
}

function ScreensSummary({ changeSet }: { changeSet: ChangeSet }): JSX.Element | null {
  const screens = summarizeByScreen(changeSet);
  if (screens.length === 0) return null;
  return (
    <section>
      <h2>Screens</h2>
      {screens.map((s) => (
        <div className="hl-card" key={s.screen}>
          <div className="hl-change__title">
            <strong>{s.screen}</strong> <span className="hl-count">{s.count} changes</span>
          </div>
          <ul style={{ margin: "4px 0 0", paddingLeft: 16 }}>
            {screenChangelogLines(s).map((line, i) => (
              <li key={i} className="hl-diff">
                {line}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </section>
  );
}

function BackendConnect(props: { connected: boolean; onSave: (token: string) => void }): JSX.Element {
  const [token, setToken] = useState("");
  const [open, setOpen] = useState(false);
  if (!open) {
    return (
      <p className="hl-count" style={{ marginTop: 4 }}>
        Ekip sunucusu: {props.connected ? "bağlı ✓" : "bağlı değil"}{" "}
        <button className="hl-link" onClick={() => setOpen(true)}>
          {props.connected ? "değiştir" : "bağlan"}
        </button>
      </p>
    );
  }
  return (
    <div className="hl-toolbar" style={{ marginTop: 6 }}>
      <input
        className="hl-search"
        type="password"
        placeholder="Bağlantı token'ını yapıştır"
        value={token}
        onChange={(e) => setToken(e.target.value)}
        aria-label="Ekip sunucusu bağlantı token'ı"
      />
      <div className="hl-bulk">
        <button
          className="hl-primary"
          onClick={() => {
            props.onSave(token);
            setOpen(false);
            setToken("");
          }}
        >
          Kaydet
        </button>
        <button onClick={() => setOpen(false)}>Vazgeç</button>
      </div>
    </div>
  );
}

function toggleInSet<T>(set: ReadonlySet<T>, value: T): Set<T> {
  const next = new Set(set);
  if (next.has(value)) next.delete(value);
  else next.add(value);
  return next;
}

function allTrackingIdsOf(changes: NodeChange[]): string[] {
  return changes.map((c) => c.trackingId);
}

function impactLabel(impact: Impact): string {
  return impact.charAt(0).toUpperCase() + impact.slice(1);
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString();
}

function downloadJson(filename: string, json: string): void {
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
