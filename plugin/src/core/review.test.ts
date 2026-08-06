import { describe, it, expect } from "vitest";
import { filterChanges, sortByImpact, allTrackingIds, excludeFromChangeSet } from "./review";
import type { ChangeSet, NodeChange } from "../shared/schema";

function change(over: Partial<NodeChange>): NodeChange {
  return {
    trackingId: "t",
    nodeName: "Node",
    nodeType: "FRAME",
    kind: "modified",
    propertyChanges: [],
    impact: "low",
    ...over,
  };
}

const changes: NodeChange[] = [
  change({ trackingId: "a", nodeName: "Alpha", impact: "low", propertyChanges: [{ path: "x", category: "layout", previousValue: 1, currentValue: 2, summary: "x" }] }),
  change({ trackingId: "b", nodeName: "Beta", impact: "breaking", kind: "removed" }),
  change({ trackingId: "c", nodeName: "Gamma", impact: "medium", propertyChanges: [{ path: "characters", category: "content", previousValue: "a", currentValue: "b", summary: "c" }] }),
];

describe("filterChanges", () => {
  it("filters modified by category, keeps added/removed", () => {
    const out = filterChanges(changes, { categories: new Set(["content"]) });
    expect(out.map((c) => c.trackingId).sort()).toEqual(["b", "c"]); // c matches content, b is removed
  });
  it("filters by impact", () => {
    const out = filterChanges(changes, { impacts: new Set(["breaking"]) });
    expect(out.map((c) => c.trackingId)).toEqual(["b"]);
  });
  it("searches by node name (case-insensitive)", () => {
    expect(filterChanges(changes, { query: "amm" }).map((c) => c.trackingId)).toEqual(["c"]);
  });
  it("combines filters with AND", () => {
    expect(filterChanges(changes, { impacts: new Set(["medium"]), query: "gam" }).map((c) => c.trackingId)).toEqual(["c"]);
  });
});

describe("sortByImpact", () => {
  it("orders breaking→low by default", () => {
    expect(sortByImpact(changes).map((c) => c.impact)).toEqual(["breaking", "medium", "low"]);
  });
  it("ascending reverses", () => {
    expect(sortByImpact(changes, "asc").map((c) => c.impact)).toEqual(["low", "medium", "breaking"]);
  });
});

describe("exclusion (D-07)", () => {
  const cs: ChangeSet = {
    baselineSnapshotId: "b",
    currentSnapshotId: "c",
    scopeId: "s",
    scopeName: "S",
    generatedAt: "t",
    added: [change({ trackingId: "a", kind: "added" })],
    modified: [change({ trackingId: "m" })],
    removed: [change({ trackingId: "r", kind: "removed" })],
    unchangedCount: 5,
  };

  it("lists all tracking ids", () => {
    expect(allTrackingIds(cs).sort()).toEqual(["a", "m", "r"]);
  });
  it("removes excluded nodes but keeps unchangedCount", () => {
    const out = excludeFromChangeSet(cs, new Set(["m", "r"]));
    expect(out.added.map((c) => c.trackingId)).toEqual(["a"]);
    expect(out.modified).toHaveLength(0);
    expect(out.removed).toHaveLength(0);
    expect(out.unchangedCount).toBe(5);
  });
});
