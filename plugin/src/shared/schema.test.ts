import { describe, it, expect } from "vitest";
import { parseSnapshot, safeParseSnapshot, ChangeSetSchema } from "./schema";
import { buildSnapshotFromSpec } from "../core/testkit";
import { diffSnapshots } from "../core/diff";

describe("snapshot schema", () => {
  const snapshot = buildSnapshotFromSpec(
    { trackingId: "root", name: "Frame", type: "FRAME", properties: { width: 100 } },
    { id: "s", scopeId: "sc" }
  );

  it("round-trips through JSON and validation (exports re-parse)", () => {
    const json = JSON.stringify(snapshot);
    const parsed = parseSnapshot(JSON.parse(json));
    expect(parsed.schemaVersion).toBe(1);
    expect(parsed.id).toBe("s");
  });

  it("rejects a snapshot missing schemaVersion", () => {
    const bad = { ...snapshot } as Record<string, unknown>;
    delete bad.schemaVersion;
    expect(safeParseSnapshot(bad).success).toBe(false);
  });
});

describe("changeset schema", () => {
  it("validates a produced changeset", () => {
    const base = buildSnapshotFromSpec(
      { trackingId: "root", name: "F", type: "FRAME", properties: { width: 100 } },
      { id: "b", scopeId: "sc" }
    );
    const cur = buildSnapshotFromSpec(
      { trackingId: "root", name: "F", type: "FRAME", properties: { width: 120 } },
      { id: "c", scopeId: "sc" }
    );
    const changeSet = diffSnapshots(base, cur);
    expect(ChangeSetSchema.safeParse(changeSet).success).toBe(true);
  });
});
