import { describe, it, expect } from "vitest";
import { diffSnapshots } from "./diff";
import { buildSnapshotFromSpec, type NodeSpec } from "./testkit";
import type { NodeChange } from "../shared/schema";

function findByTracking(changes: NodeChange[], trackingId: string): NodeChange | undefined {
  return changes.find((c) => c.trackingId === trackingId);
}

/** Baseline: a checkout frame with a text label and a button. */
function baselineSpec(): NodeSpec {
  return {
    trackingId: "root",
    name: "Checkout",
    type: "FRAME",
    properties: { width: 375, height: 600 },
    children: [
      {
        trackingId: "label",
        name: "Label",
        type: "TEXT",
        properties: { characters: "Continue", fontSize: 16 },
      },
      {
        trackingId: "button",
        name: "Button",
        type: "FRAME",
        properties: { width: 320, height: 48 },
      },
    ],
  };
}

describe("diffSnapshots — completion criteria (width, text, child add)", () => {
  const baseline = buildSnapshotFromSpec(baselineSpec(), { id: "base", scopeId: "s1" });

  const current = buildSnapshotFromSpec(
    {
      trackingId: "root",
      name: "Checkout",
      type: "FRAME",
      properties: { width: 375, height: 600 },
      children: [
        {
          trackingId: "label",
          name: "Label",
          type: "TEXT",
          properties: { characters: "Pay Now", fontSize: 16 }, // text change
        },
        {
          trackingId: "button",
          name: "Button",
          type: "FRAME",
          properties: { width: 360, height: 48 }, // width change
        },
        {
          trackingId: "error",
          name: "Error",
          type: "FRAME",
          properties: { width: 320, height: 20 }, // new child
        },
      ],
    },
    { id: "cur", scopeId: "s1" }
  );

  const result = diffSnapshots(baseline, current);

  it("detects the width change as modified/layout", () => {
    const button = findByTracking(result.modified, "button");
    expect(button).toBeDefined();
    const widthChange = button?.propertyChanges.find((p) => p.path === "width");
    expect(widthChange?.category).toBe("layout");
    expect(widthChange?.previousValue).toBe(320);
    expect(widthChange?.currentValue).toBe(360);
    expect(widthChange?.summary).toBe("width: 320 → 360");
    expect(button?.impact).toBe("medium");
  });

  it("detects the text change as modified/content", () => {
    const label = findByTracking(result.modified, "label");
    expect(label).toBeDefined();
    const contentChange = label?.propertyChanges.find((p) => p.path === "characters");
    expect(contentChange?.category).toBe("content");
    expect(contentChange?.summary).toBe('characters: "Continue" → "Pay Now"');
  });

  it("detects the added child as an added node", () => {
    expect(result.added).toHaveLength(1);
    expect(result.added[0]?.trackingId).toBe("error");
    expect(result.added[0]?.kind).toBe("added");
  });

  it("reports the parent's child-set change as structural", () => {
    const root = findByTracking(result.modified, "root");
    const childChange = root?.propertyChanges.find((p) => p.path === "children");
    expect(childChange?.category).toBe("structural");
  });

  it("produces no removed nodes", () => {
    expect(result.removed).toHaveLength(0);
  });
});

describe("diffSnapshots — no false positives & determinism", () => {
  const baseline = buildSnapshotFromSpec(baselineSpec(), { id: "base", scopeId: "s1" });

  it("reports zero changes when nothing changed", () => {
    const current = buildSnapshotFromSpec(baselineSpec(), { id: "cur", scopeId: "s1" });
    const result = diffSnapshots(baseline, current);
    expect(result.added).toHaveLength(0);
    expect(result.removed).toHaveLength(0);
    expect(result.modified).toHaveLength(0);
    expect(result.unchangedCount).toBe(3);
  });

  it("is deterministic across repeated runs", () => {
    const current = buildSnapshotFromSpec(baselineSpec(), { id: "cur", scopeId: "s1" });
    expect(JSON.stringify(diffSnapshots(baseline, current))).toBe(
      JSON.stringify(diffSnapshots(baseline, current))
    );
  });

  it("ignores floating-point noise below precision", () => {
    const current = buildSnapshotFromSpec(
      {
        ...baselineSpec(),
        properties: { width: 375.0001, height: 600 },
      },
      { id: "cur", scopeId: "s1" }
    );
    const result = diffSnapshots(baseline, current);
    expect(result.modified).toHaveLength(0);
  });
});

describe("diffSnapshots — removals, renames, mixed values", () => {
  const baseline = buildSnapshotFromSpec(baselineSpec(), { id: "base", scopeId: "s1" });

  it("detects a removed node", () => {
    const current = buildSnapshotFromSpec(
      {
        trackingId: "root",
        name: "Checkout",
        type: "FRAME",
        properties: { width: 375, height: 600 },
        children: [
          { trackingId: "label", name: "Label", type: "TEXT", properties: { characters: "Continue", fontSize: 16 } },
        ],
      },
      { id: "cur", scopeId: "s1" }
    );
    const result = diffSnapshots(baseline, current);
    expect(result.removed.map((r) => r.trackingId)).toContain("button");
    expect(result.removed[0]?.impact).toBe("high");
  });

  it("treats a rename as modified/structural, not add+remove", () => {
    const renamed = buildSnapshotFromSpec(
      {
        ...baselineSpec(),
        children: [
          { trackingId: "label", name: "Renamed Label", type: "TEXT", properties: { characters: "Continue", fontSize: 16 } },
          { trackingId: "button", name: "Button", type: "FRAME", properties: { width: 320, height: 48 } },
        ],
      },
      { id: "cur", scopeId: "s1" }
    );
    const result = diffSnapshots(baseline, renamed);
    expect(result.added).toHaveLength(0);
    expect(result.removed).toHaveLength(0);
    const label = result.modified.find((c) => c.trackingId === "label");
    const nameChange = label?.propertyChanges.find((p) => p.path === "name");
    expect(nameChange?.category).toBe("structural");
  });

  it("handles the mixed sentinel as a real change", () => {
    const current = buildSnapshotFromSpec(
      {
        ...baselineSpec(),
        children: [
          { trackingId: "label", name: "Label", type: "TEXT", properties: { characters: "Continue", fontSize: "mixed" } },
          { trackingId: "button", name: "Button", type: "FRAME", properties: { width: 320, height: 48 } },
        ],
      },
      { id: "cur", scopeId: "s1" }
    );
    const result = diffSnapshots(baseline, current);
    const label = result.modified.find((c) => c.trackingId === "label");
    const fontChange = label?.propertyChanges.find((p) => p.path === "fontSize");
    expect(fontChange?.category).toBe("typography");
    expect(fontChange?.currentValue).toBe("mixed");
  });
});
