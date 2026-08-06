import { describe, it, expect } from "vitest";
import { buildRelease, computeMaxImpact, suggestReleaseType, meaningfulChangeCount } from "./release";
import { ReleaseSchema } from "../shared/release";
import type { ChangeSet, NodeChange } from "../shared/schema";

function ch(over: Partial<NodeChange>): NodeChange {
  return { trackingId: "t", nodeName: "N", nodeType: "FRAME", kind: "modified", propertyChanges: [], impact: "low", ...over };
}

const changeSet: ChangeSet = {
  baselineSnapshotId: "b",
  currentSnapshotId: "c",
  scopeId: "s",
  scopeName: "Checkout",
  generatedAt: "t",
  added: [ch({ trackingId: "a", kind: "added", impact: "medium" })],
  modified: [ch({ trackingId: "m", impact: "breaking" })],
  removed: [ch({ trackingId: "r", kind: "removed", impact: "high" })],
  unchangedCount: 3,
};

describe("suggestReleaseType", () => {
  it("maps impact to type", () => {
    expect(suggestReleaseType("breaking")).toBe("major");
    expect(suggestReleaseType("high")).toBe("minor");
    expect(suggestReleaseType("medium")).toBe("minor");
    expect(suggestReleaseType("low")).toBe("patch");
  });
});

describe("computeMaxImpact", () => {
  it("returns the highest impact", () => {
    expect(computeMaxImpact([ch({ impact: "low" }), ch({ impact: "high" })])).toBe("high");
    expect(computeMaxImpact([])).toBe("low");
  });
});

describe("buildRelease", () => {
  it("assembles a schema-valid published release with excluded removed", () => {
    const rel = buildRelease({
      changeSet,
      excludedTrackingIds: ["r"], // drop the removed node
      name: "Checkout v2",
      version: "2.0.0",
      id: "rel_1",
      now: "2026-08-06T00:00:00.000Z",
    });
    expect(ReleaseSchema.safeParse(rel).success).toBe(true);
    expect(rel.changes.map((c) => c.trackingId).sort()).toEqual(["a", "m"]);
    expect(rel.impact).toBe("breaking"); // m is breaking
    expect(rel.type).toBe("major"); // suggested from breaking
    expect(rel.status).toBe("published");
    expect(rel.publishedAt).toBe("2026-08-06T00:00:00.000Z");
  });

  it("honors an explicit type and draft status", () => {
    const rel = buildRelease({
      changeSet,
      excludedTrackingIds: [],
      name: "n",
      version: "1.0.0",
      type: "hotfix",
      status: "draft",
      id: "rel_2",
      now: "t",
    });
    expect(rel.type).toBe("hotfix");
    expect(rel.status).toBe("draft");
    expect(rel.publishedAt).toBeUndefined();
  });
});

describe("meaningfulChangeCount", () => {
  it("counts included changes above low impact", () => {
    expect(meaningfulChangeCount(changeSet, [])).toBe(3); // medium, breaking, high
    expect(meaningfulChangeCount(changeSet, ["m", "r"])).toBe(1); // only added(medium)
  });
});
