import { describe, it, expect } from "vitest";
import { migrateSnapshot, MigrationError } from "./migration";
import { buildSnapshotFromSpec } from "../core/testkit";

const v1 = buildSnapshotFromSpec(
  { trackingId: "root", name: "F", type: "FRAME", properties: { width: 100 } },
  { id: "s", scopeId: "sc" }
);

describe("migrateSnapshot", () => {
  it("passes a current-version snapshot through and validates it", () => {
    const out = migrateSnapshot(JSON.parse(JSON.stringify(v1)));
    expect(out.schemaVersion).toBe(1);
    expect(out.id).toBe("s");
  });

  it("rejects a snapshot from a newer schema version", () => {
    const future = { ...JSON.parse(JSON.stringify(v1)), schemaVersion: 2 };
    try {
      migrateSnapshot(future);
      throw new Error("should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(MigrationError);
      expect((err as MigrationError).code).toBe("SCHEMA_VERSION_UNSUPPORTED");
    }
  });

  it("fails loudly on data with no readable schemaVersion", () => {
    try {
      migrateSnapshot({ nope: true });
      throw new Error("should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(MigrationError);
      expect((err as MigrationError).code).toBe("MIGRATION_FAILED");
    }
  });

  it("fails when a required migration step is missing", () => {
    // schemaVersion 0 would need a 0→1 migration which is not registered.
    const legacy = { ...JSON.parse(JSON.stringify(v1)), schemaVersion: 0 };
    expect(() => migrateSnapshot(legacy)).toThrow(MigrationError);
  });
});
