import { describe, it, expect } from "vitest";
import { loadSnapshotFromFigmaExport } from "./fixture-loader";
import { diffSnapshots } from "./diff";
import { SnapshotSchema, type ChangeSet, type NodeChange } from "../shared/schema";
import { REAL_FIXTURE_PAIRS } from "./fixtures/real/pairs";

function loadPair(name: string): { before: ReturnType<typeof loadSnapshotFromFigmaExport>; after: ReturnType<typeof loadSnapshotFromFigmaExport> } {
  const pair = REAL_FIXTURE_PAIRS.find((p) => p.name === name);
  if (!pair) throw new Error(`missing pair ${name}`);
  return {
    before: loadSnapshotFromFigmaExport(pair.before),
    after: loadSnapshotFromFigmaExport(pair.after),
  };
}

function has(changes: NodeChange[], trackingId: string): NodeChange | undefined {
  return changes.find((c) => c.trackingId === trackingId);
}

describe("real handoff fixture pairs — parse & determinism", () => {
  for (const pair of REAL_FIXTURE_PAIRS) {
    it(`"${pair.name}" both sides parse into valid snapshots`, () => {
      const before = loadSnapshotFromFigmaExport(pair.before);
      const after = loadSnapshotFromFigmaExport(pair.after);
      expect(SnapshotSchema.safeParse(before).success).toBe(true);
      expect(SnapshotSchema.safeParse(after).success).toBe(true);
    });

    it(`"${pair.name}" diff is deterministic`, () => {
      const before = loadSnapshotFromFigmaExport(pair.before);
      const after = loadSnapshotFromFigmaExport(pair.after);
      const a: ChangeSet = diffSnapshots(before, after);
      const b: ChangeSet = diffSnapshots(before, after);
      expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    });
  }
});

describe("real handoff fixture pairs — expected change buckets", () => {
  it("checkout: added error, text edit, button resize; no removals", () => {
    const { before, after } = loadPair("checkout");
    const cs = diffSnapshots(before, after);
    expect(cs.added.map((c) => c.trackingId)).toContain("c:5");
    expect(cs.removed).toHaveLength(0);
    const label = has(cs.modified, "c:2");
    expect(label?.propertyChanges.some((p) => p.path === "characters" && p.category === "content")).toBe(true);
    const button = has(cs.modified, "c:3");
    expect(button?.propertyChanges.some((p) => p.path === "width" && p.category === "layout")).toBe(true);
  });

  it("card: visual + layout + typography; no add/remove", () => {
    const { before, after } = loadPair("card");
    const cs = diffSnapshots(before, after);
    expect(cs.added).toHaveLength(0);
    expect(cs.removed).toHaveLength(0);
    const card = has(cs.modified, "k:1");
    const cats = new Set(card?.propertyChanges.map((p) => p.category));
    expect(cats.has("visual")).toBe(true); // fills / cornerRadius
    expect(cats.has("layout")).toBe(true); // padding
    const title = has(cs.modified, "k:2");
    expect(title?.propertyChanges.some((p) => p.path === "fontSize" && p.category === "typography")).toBe(true);
  });

  it("nav: removed item, component variant change, structural child change", () => {
    const { before, after } = loadPair("nav");
    const cs = diffSnapshots(before, after);
    expect(cs.removed.map((c) => c.trackingId)).toContain("n:3");
    const profile = has(cs.modified, "n:4");
    expect(profile?.propertyChanges.some((p) => p.path === "componentProperties" && p.category === "component")).toBe(true);
    const nav = has(cs.modified, "n:1");
    expect(nav?.propertyChanges.some((p) => p.path === "children" && p.category === "structural")).toBe(true);
  });
});
