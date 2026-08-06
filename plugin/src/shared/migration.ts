/**
 * Snapshot schema migration (SCHEMA_MIGRATION policy).
 *
 * Pure and shared (plugin + future backend must use the SAME migration chain —
 * SCHEMA_MIGRATION §7). Given a stored snapshot of any known version, upgrade it
 * to the current version and validate. A stored version NEWER than this build is
 * refused (SCHEMA_VERSION_UNSUPPORTED); unreadable data is reported as failed so
 * callers can preserve it rather than delete (never lose a baseline).
 */
import { z } from "zod";
import { SNAPSHOT_SCHEMA_VERSION, SnapshotSchema, type Snapshot } from "./schema";

export type MigrationErrorCode = "SCHEMA_VERSION_UNSUPPORTED" | "MIGRATION_FAILED";

export class MigrationError extends Error {
  public readonly code: MigrationErrorCode;
  constructor(code: MigrationErrorCode, message: string) {
    super(message);
    this.name = "MigrationError";
    this.code = code;
  }
}

/** A migration transforms a snapshot object from version N to N+1. */
export type MigrationFn = (input: Record<string, unknown>) => Record<string, unknown>;

/**
 * Registry keyed by source version. Empty today (v1 is current). When v2 lands,
 * add `1: migrate_v1_to_v2` and a round-trip fixture test (SCHEMA_MIGRATION §5).
 */
const MIGRATIONS: Readonly<Record<number, MigrationFn>> = {};

const VersionedSchema = z.object({ schemaVersion: z.number() }).passthrough();

/** Read, upgrade, and validate a stored snapshot value. */
export function migrateSnapshot(raw: unknown): Snapshot {
  const versioned = VersionedSchema.safeParse(raw);
  if (!versioned.success) {
    throw new MigrationError(
      "MIGRATION_FAILED",
      "Snapshot has no readable schemaVersion."
    );
  }

  let version = versioned.data.schemaVersion;
  if (version > SNAPSHOT_SCHEMA_VERSION) {
    throw new MigrationError(
      "SCHEMA_VERSION_UNSUPPORTED",
      `Snapshot schemaVersion ${version} is newer than supported ${SNAPSHOT_SCHEMA_VERSION}.`
    );
  }

  let data = versioned.data as Record<string, unknown>;
  while (version < SNAPSHOT_SCHEMA_VERSION) {
    const step = MIGRATIONS[version];
    if (!step) {
      throw new MigrationError(
        "MIGRATION_FAILED",
        `No migration registered from schemaVersion ${version}.`
      );
    }
    data = step(data);
    version += 1;
    data.schemaVersion = version;
  }

  const parsed = SnapshotSchema.safeParse(data);
  if (!parsed.success) {
    throw new MigrationError(
      "MIGRATION_FAILED",
      "Migrated snapshot failed schema validation."
    );
  }
  return parsed.data;
}
