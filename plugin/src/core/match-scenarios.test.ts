import { describe, it, expect } from "vitest";
import { diffSnapshots } from "./diff";
import { buildSnapshotFromSpec, type NodeSpec } from "./testkit";

function withChildren(children: NodeSpec[]): NodeSpec {
  return { trackingId: "root", name: "Root", type: "FRAME", properties: { width: 300 }, children };
}

describe("A-05 reorder is structural, not add/remove", () => {
  it("swapping child order keeps nodes matched and reports children structural", () => {
    const before = buildSnapshotFromSpec(
      withChildren([
        { trackingId: "x", name: "X", type: "TEXT", properties: { characters: "x" } },
        { trackingId: "y", name: "Y", type: "TEXT", properties: { characters: "y" } },
      ]),
      { id: "b", scopeId: "sc" }
    );
    const after = buildSnapshotFromSpec(
      withChildren([
        { trackingId: "y", name: "Y", type: "TEXT", properties: { characters: "y" } },
        { trackingId: "x", name: "X", type: "TEXT", properties: { characters: "x" } },
      ]),
      { id: "a", scopeId: "sc" }
    );
    const cs = diffSnapshots(before, after);
    expect(cs.added).toHaveLength(0);
    expect(cs.removed).toHaveLength(0);
    const root = cs.modified.find((c) => c.trackingId === "root");
    expect(root?.propertyChanges.some((p) => p.path === "children" && p.category === "structural")).toBe(true);
  });
});

describe("A-06 detached instance matches by id, reports type change", () => {
  it("INSTANCE → FRAME is a modified/structural breaking change, not add+remove", () => {
    const before = buildSnapshotFromSpec(
      { trackingId: "i", nodeId: "n1", name: "Card", type: "INSTANCE", properties: { width: 200 } },
      { id: "b", scopeId: "sc" }
    );
    const after = buildSnapshotFromSpec(
      { trackingId: "i", nodeId: "n1", name: "Card", type: "FRAME", properties: { width: 200 } },
      { id: "a", scopeId: "sc" }
    );
    const cs = diffSnapshots(before, after);
    expect(cs.added).toHaveLength(0);
    expect(cs.removed).toHaveLength(0);
    const node = cs.modified.find((c) => c.trackingId === "i");
    const typeChange = node?.propertyChanges.find((p) => p.path === "type");
    expect(typeChange?.category).toBe("structural");
    expect(node?.impact).toBe("breaking");
  });
});

describe("A-07 component-key matching survives id change", () => {
  it("instance with new tracking/node id but same componentKey+name is matched", () => {
    const before = buildSnapshotFromSpec(
      { trackingId: "t1", nodeId: "n1", name: "Btn", type: "INSTANCE", componentKey: "K", properties: { width: 120 } },
      { id: "b", scopeId: "sc" }
    );
    const after = buildSnapshotFromSpec(
      // Renamed AND re-ided → trackingId, nodeId and signature all differ; only
      // the shared componentKey can match these two.
      { trackingId: "t2", nodeId: "n2", name: "Menu", type: "INSTANCE", componentKey: "K", properties: { width: 140 } },
      { id: "a", scopeId: "sc" }
    );
    const cs = diffSnapshots(before, after);
    // Matched via componentKey → modified, NOT a remove+add pair.
    expect(cs.added).toHaveLength(0);
    expect(cs.removed).toHaveLength(0);
    const node = cs.modified.find((c) => c.nodeType === "INSTANCE");
    expect(node?.propertyChanges.some((p) => p.path === "width")).toBe(true);
  });

  it("without componentKey the id change falls back to add+remove", () => {
    const before = buildSnapshotFromSpec(
      { trackingId: "t1", nodeId: "n1", name: "Solo", type: "RECTANGLE", properties: { width: 120 } },
      { id: "b", scopeId: "sc" }
    );
    const after = buildSnapshotFromSpec(
      { trackingId: "t2", nodeId: "n2", name: "Different", type: "RECTANGLE", properties: { width: 140 } },
      { id: "a", scopeId: "sc" }
    );
    const cs = diffSnapshots(before, after);
    expect(cs.added.length + cs.removed.length).toBeGreaterThan(0);
  });
});
