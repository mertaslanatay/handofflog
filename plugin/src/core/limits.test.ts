import { describe, it, expect } from "vitest";
import {
  evaluateScopeSize,
  evaluateSnapshotBytes,
  snapshotByteSize,
  SCOPE_SOFT_LIMIT,
  SCOPE_HARD_LIMIT,
} from "./limits";
import { buildSnapshotFromSpec } from "./testkit";

describe("evaluateScopeSize", () => {
  it("classifies ok / warn / too-large at the thresholds", () => {
    expect(evaluateScopeSize(10)).toBe("ok");
    expect(evaluateScopeSize(SCOPE_SOFT_LIMIT)).toBe("ok");
    expect(evaluateScopeSize(SCOPE_SOFT_LIMIT + 1)).toBe("warn");
    expect(evaluateScopeSize(SCOPE_HARD_LIMIT)).toBe("warn");
    expect(evaluateScopeSize(SCOPE_HARD_LIMIT + 1)).toBe("too-large");
  });
});

describe("evaluateSnapshotBytes", () => {
  it("classifies by byte thresholds", () => {
    expect(evaluateSnapshotBytes(500)).toBe("ok");
    expect(evaluateSnapshotBytes(2_000_000)).toBe("warn");
    expect(evaluateSnapshotBytes(4_000_000)).toBe("too-large");
  });
});

describe("snapshotByteSize", () => {
  it("returns a positive deterministic size", () => {
    const s = buildSnapshotFromSpec(
      { trackingId: "root", name: "F", type: "FRAME", properties: { width: 100 } },
      { id: "s", scopeId: "sc" }
    );
    const a = snapshotByteSize(s);
    const b = snapshotByteSize(s);
    expect(a).toBe(b);
    expect(a).toBeGreaterThan(0);
  });
});
