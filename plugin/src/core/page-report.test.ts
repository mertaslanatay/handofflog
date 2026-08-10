import { describe, it, expect } from "vitest";
import { summarizeByScreen, screenChangelogLines } from "./page-report";
import type { ChangeSet, NodeChange } from "../shared/schema";

function ch(over: Partial<NodeChange> & { screen: string }): NodeChange & { screen: string } {
  return {
    trackingId: over.trackingId ?? "t",
    nodeName: over.nodeName ?? "N",
    nodeType: "FRAME",
    kind: over.kind ?? "modified",
    propertyChanges: over.propertyChanges ?? [],
    impact: "low",
    ...over,
  } as NodeChange & { screen: string };
}

const cs = {
  added: [ch({ trackingId: "a", nodeName: "Hero", kind: "added", screen: "Home" })],
  modified: [
    ch({ trackingId: "b", nodeName: "Header", screen: "Dashboard", propertyChanges: [{ path: "fills", category: "visual", previousValue: 1, currentValue: 2, summary: "fills: 1 → 2" }] }),
    ch({ trackingId: "c", nodeName: "Sidebar", screen: "Dashboard", propertyChanges: [{ path: "paddingLeft", category: "layout", previousValue: 8, currentValue: 12, summary: "paddingLeft: 8 → 12" }] }),
  ],
  removed: [] as NodeChange[],
} as unknown as ChangeSet;

const screenOf = (c: NodeChange) => (c as NodeChange & { screen: string }).screen;

describe("summarizeByScreen", () => {
  it("groups changes per screen with counts, most-changed first", () => {
    const out = summarizeByScreen(cs, screenOf);
    expect(out.map((s) => [s.screen, s.count])).toEqual([
      ["Dashboard", 2],
      ["Home", 1],
    ]);
  });
  it("excludes screens with no changes (only changed screens listed)", () => {
    const out = summarizeByScreen(cs, screenOf);
    expect(out.some((s) => s.count === 0)).toBe(false);
  });
});

describe("screenChangelogLines", () => {
  it("produces human bullets", () => {
    const out = summarizeByScreen(cs, screenOf);
    const dashboard = out.find((s) => s.screen === "Dashboard")!;
    const lines = screenChangelogLines(dashboard);
    expect(lines).toContain("Header: fills changed");
    expect(lines).toContain("Sidebar: paddingLeft changed");
  });
});
