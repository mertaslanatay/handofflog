import { describe, it, expect } from "vitest";
import { measureFalsePositives, measureMatchAccuracy, jitterSnapshot } from "./calibration";
import { diffSnapshots } from "./diff";
import { buildSnapshotFromSpec, type NodeSpec } from "./testkit";
import { loadSnapshotFromFigmaExport } from "./fixture-loader";
import { REAL_FIXTURE_PAIRS } from "./fixtures/real/pairs";

function scene(): NodeSpec {
  return {
    trackingId: "root",
    name: "Screen",
    type: "FRAME",
    properties: { width: 375, height: 600 },
    children: [
      { trackingId: "a", name: "A", type: "TEXT", properties: { characters: "A", x: 10, y: 10 } },
      { trackingId: "b", name: "B", type: "FRAME", properties: { width: 320, height: 48, x: 10, y: 40 } },
      { trackingId: "c", name: "C", type: "TEXT", properties: { characters: "C", x: 10, y: 100 } },
    ],
  };
}

describe("A-03 false positives", () => {
  const snapshot = buildSnapshotFromSpec(scene(), { id: "s", scopeId: "sc" });

  it("sub-precision jitter yields zero false positives", () => {
    const r = measureFalsePositives("scene", snapshot, 0.0004);
    expect(r.falsePositives).toBe(0);
    expect(r.rate).toBe(0);
  });

  it("real fixture 'before' snapshots have zero false positives", () => {
    for (const pair of REAL_FIXTURE_PAIRS) {
      const before = loadSnapshotFromFigmaExport(pair.before);
      const r = measureFalsePositives(pair.name, before, 0.0004);
      expect(r.rate).toBeLessThan(0.01);
    }
  });

  it("supra-precision jitter is detected (harness is not blind)", () => {
    const r = measureFalsePositives("scene", snapshot, 0.01);
    expect(r.falsePositives).toBeGreaterThan(0);
  });

  it("jitterSnapshot keeps node count and re-hashes", () => {
    const j = jitterSnapshot(snapshot, 0.0004);
    expect(Object.keys(j.nodes)).toHaveLength(Object.keys(snapshot.nodes).length);
  });
});

describe("A-04 match accuracy", () => {
  it("rename + reorder keeps 100% match (no spurious add/remove)", () => {
    const before = buildSnapshotFromSpec(scene(), { id: "b", scopeId: "sc" });
    const after = buildSnapshotFromSpec(
      {
        trackingId: "root",
        name: "Screen",
        type: "FRAME",
        properties: { width: 375, height: 600 },
        children: [
          { trackingId: "c", name: "C renamed", type: "TEXT", properties: { characters: "C", x: 10, y: 100 } },
          { trackingId: "a", name: "A renamed", type: "TEXT", properties: { characters: "A", x: 10, y: 10 } },
          { trackingId: "b", name: "B renamed", type: "FRAME", properties: { width: 320, height: 48, x: 10, y: 40 } },
        ],
      },
      { id: "a", scopeId: "sc" }
    );
    const r = measureMatchAccuracy("rename-reorder", before, after);
    expect(r.retained).toBe(4);
    expect(r.spurious).toBe(0);
    expect(r.accuracy).toBe(1);
    // And no node is spuriously added/removed.
    const cs = diffSnapshots(before, after);
    expect(cs.added).toHaveLength(0);
    expect(cs.removed).toHaveLength(0);
  });
});
