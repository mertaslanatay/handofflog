import { describe, it, expect } from "vitest";
import { diffSnapshots } from "./diff";
import { buildSnapshotFromSpec, type NodeSpec } from "./testkit";

/** Build a wide tree of `count` leaf nodes under one root. */
function bigScene(count: number, mutateEvery: number): { before: NodeSpec; after: NodeSpec } {
  const children = (mutate: boolean): NodeSpec[] =>
    Array.from({ length: count }, (_, i) => ({
      trackingId: `n${i}`,
      name: `Node ${i}`,
      type: "FRAME",
      properties: { x: i, y: 0, width: mutate && i % mutateEvery === 0 ? 101 : 100, height: 40 },
    }));
  return {
    before: { trackingId: "root", name: "Root", type: "FRAME", properties: { width: 1000 }, children: children(false) },
    after: { trackingId: "root", name: "Root", type: "FRAME", properties: { width: 1000 }, children: children(true) },
  };
}

describe("B-07 large-frame diff performance (NFR §1: ≤2000 nodes < 2s)", () => {
  it("diffs a ~2000-node scope well under the budget", () => {
    const { before, after } = bigScene(2000, 10);
    const b = buildSnapshotFromSpec(before, { id: "b", scopeId: "sc" });
    const a = buildSnapshotFromSpec(after, { id: "a", scopeId: "sc" });

    const start = performance.now();
    const cs = diffSnapshots(b, a);
    const elapsed = performance.now() - start;

    // 200 mutated (every 10th of 2000) → all detected.
    expect(cs.modified.length).toBe(200);
    expect(elapsed).toBeLessThan(2000);
  });
});
