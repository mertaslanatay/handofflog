import { describe, it, expect } from "vitest";
import { diffSnapshots } from "./diff";
import { buildSnapshotFromSpec, type NodeSpec } from "./testkit";

/** Root resized 300→360; child Box shifts x 10→40 (reflow), plus optional extra. */
function pair(afterParentWidth: number, boxX: number): { before: NodeSpec; after: NodeSpec } {
  const box = (x: number): NodeSpec => ({
    trackingId: "box",
    name: "Box",
    type: "FRAME",
    properties: { x, y: 10, width: 100, height: 40 },
  });
  return {
    before: { trackingId: "root", name: "Root", type: "FRAME", properties: { width: 300 }, children: [box(10)] },
    after: { trackingId: "root", name: "Root", type: "FRAME", properties: { width: afterParentWidth }, children: [box(boxX)] },
  };
}

function diff(mode: "report" | "suppress" | "suppress-on-parent-resize", afterW: number, boxX: number) {
  const { before, after } = pair(afterW, boxX);
  return diffSnapshots(
    buildSnapshotFromSpec(before, { id: "b", scopeId: "sc" }),
    buildSnapshotFromSpec(after, { id: "a", scopeId: "sc" }),
    { positionNoise: mode }
  );
}

describe("A-08 position-noise config", () => {
  it("'report' (default) surfaces the child x change", () => {
    const cs = diff("report", 360, 40);
    const box = cs.modified.find((c) => c.trackingId === "box");
    expect(box?.propertyChanges.some((p) => p.path === "x")).toBe(true);
  });

  it("'suppress' drops x/y changes entirely", () => {
    const cs = diff("suppress", 360, 40);
    expect(cs.modified.find((c) => c.trackingId === "box")).toBeUndefined();
    // The real parent resize is still reported.
    expect(cs.modified.some((c) => c.trackingId === "root")).toBe(true);
  });
});

describe("A-09 suppress-on-parent-resize", () => {
  it("drops child x/y noise when the parent changed size", () => {
    const cs = diff("suppress-on-parent-resize", 360, 40);
    expect(cs.modified.find((c) => c.trackingId === "box")).toBeUndefined();
    expect(cs.modified.some((c) => c.trackingId === "root")).toBe(true);
  });

  it("keeps child x/y when the parent did NOT change size", () => {
    // Parent width unchanged (300), but box still moved → intentional reposition.
    const cs = diff("suppress-on-parent-resize", 300, 40);
    const box = cs.modified.find((c) => c.trackingId === "box");
    expect(box?.propertyChanges.some((p) => p.path === "x")).toBe(true);
  });
});
