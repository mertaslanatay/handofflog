/**
 * Client-storage adapter for baselines.
 *
 * Hard rule (master prompt + ACCEPTANCE_CRITERIA): a storage or parse failure
 * must NEVER delete an existing baseline. Reads that hit corrupt data surface a
 * typed error and leave the stored bytes untouched so the user can recover.
 */
import { z } from "zod";
import {
  StorageKeys,
  SnapshotSchema,
  type Snapshot,
} from "../shared/schema";
import { migrateSnapshot, MigrationError } from "../shared/migration";
import { safeParseReleaseHistory, type Release } from "../shared/release";

export type StorageErrorCode = "STORAGE_ERROR" | "SNAPSHOT_ERROR";

export class StorageError extends Error {
  public readonly code: StorageErrorCode;
  constructor(code: StorageErrorCode, message: string) {
    super(message);
    this.name = "StorageError";
    this.code = code;
  }
}

export type LoadResult =
  | { status: "found"; snapshot: Snapshot }
  | { status: "empty" }
  | { status: "unsupported" }
  | { status: "corrupt"; raw: unknown };

/**
 * Load a baseline. Stored data is run through the migration chain so older
 * snapshots upgrade transparently. Never mutates storage, even when the stored
 * value is bad — a corrupt or future-version baseline is preserved, not deleted.
 */
export async function loadBaseline(scopeId: string): Promise<LoadResult> {
  let raw: unknown;
  try {
    raw = await figma.clientStorage.getAsync(StorageKeys.snapshot(scopeId));
  } catch (err) {
    throw new StorageError(
      "STORAGE_ERROR",
      `Could not read baseline: ${errorMessage(err)}`
    );
  }
  if (raw === undefined || raw === null) return { status: "empty" };

  try {
    return { status: "found", snapshot: migrateSnapshot(raw) };
  } catch (err) {
    if (err instanceof MigrationError && err.code === "SCHEMA_VERSION_UNSUPPORTED") {
      return { status: "unsupported" };
    }
    // Do NOT delete — hand the raw bytes back so nothing is lost.
    return { status: "corrupt", raw };
  }
}

/**
 * Persist a baseline snapshot, overwriting any previous one for the scope.
 *
 * The snapshot is validated BEFORE the write, so an invalid snapshot can never
 * overwrite a good baseline (C-05). `clientStorage.setAsync` is atomic per key,
 * so a failed write leaves the previous value intact.
 */
export async function saveBaseline(snapshot: Snapshot): Promise<void> {
  const validated = SnapshotSchema.safeParse(snapshot);
  if (!validated.success) {
    throw new StorageError(
      "SNAPSHOT_ERROR",
      "Refusing to persist an invalid snapshot; existing baseline preserved."
    );
  }
  try {
    await figma.clientStorage.setAsync(
      StorageKeys.snapshot(validated.data.scopeId),
      validated.data
    );
  } catch (err) {
    throw new StorageError(
      "STORAGE_ERROR",
      `Could not save baseline: ${errorMessage(err)}`
    );
  }
}

// --- Releases (E) ------------------------------------------------------------

/** Load a scope's release history (newest first); [] when none/invalid. */
export async function loadReleases(scopeId: string): Promise<Release[]> {
  let raw: unknown;
  try {
    raw = await figma.clientStorage.getAsync(StorageKeys.releases(scopeId));
  } catch (err) {
    throw new StorageError("STORAGE_ERROR", `Could not read releases: ${errorMessage(err)}`);
  }
  if (raw === undefined || raw === null) return [];
  const parsed = safeParseReleaseHistory(raw);
  return parsed.success ? parsed.data.releases : [];
}

/** Persist a scope's release history. */
export async function saveReleases(scopeId: string, releases: Release[]): Promise<void> {
  try {
    await figma.clientStorage.setAsync(StorageKeys.releases(scopeId), { scopeId, releases });
  } catch (err) {
    throw new StorageError("STORAGE_ERROR", `Could not save releases: ${errorMessage(err)}`);
  }
}

// --- Settings (telemetry opt-in) --------------------------------------------

export interface Settings {
  telemetryEnabled: boolean;
  /** Backend connection token pasted from the web app (optional). */
  backendToken?: string;
}

const SettingsSchema = z.object({
  telemetryEnabled: z.boolean(),
  backendToken: z.string().optional(),
});

export async function loadSettings(): Promise<Settings> {
  try {
    const raw = await figma.clientStorage.getAsync(StorageKeys.settings);
    const parsed = SettingsSchema.safeParse(raw);
    return parsed.success ? parsed.data : { telemetryEnabled: false };
  } catch {
    return { telemetryEnabled: false };
  }
}

export async function saveSettings(settings: Settings): Promise<void> {
  try {
    await figma.clientStorage.setAsync(StorageKeys.settings, settings);
  } catch (err) {
    throw new StorageError("STORAGE_ERROR", `Could not save settings: ${errorMessage(err)}`);
  }
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
