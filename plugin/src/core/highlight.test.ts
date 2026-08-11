import { describe, it, expect } from "vitest";
import { diffSnapshots } from "./diff";
import { highlightsByScreen } from "./highlight";
import { buildSnapshotFromSpec, type NodeSpec } from "./testkit";

/**
 * Two screens with absolute bounds:
 *   Home   frame @ (0,0,400,800)   → Hero  @ (20,50,360,200)
 *   Header frame @ (500,0,400,120) → Logo  @ (520,10,80,40)
 */
function page(mods: { heroText: string; logoW: number; extra?: boolean }): NodeSpec {
  const home: NodeSpec = {
    trackingId: "home", name: "Home", type: "FRAME", pageName: "P", screenName: "Home",
    absoluteBoundingBox: { x: 0, y: 0, width: 400, height: 800 },
    children: [
      {
        trackingId: "hero", name: "Hero", type: "FRAME", pageName: "P", screenName: "Home",
        absoluteBoundingBox: { x: 20, y: 50, width: 360, height: 200 },
        properties: { characters: mods.heroText },
      },
    ],
  };
  if (mods.extra) {
    home.children!.push({
      trackingId: "badge", name: "Badge", type: "FRAME", pageName: "P", screenName: "Home",
      absoluteBoundingBox: { x: 300, y: 60, width: 40, height: 40 },
      properties: { width: 40 },
    });
  }
  return {
    trackingId: "page", name: "P", type: "PAGE", pageName: "P",
    children: [
      home,
      {
        trackingId: "header", name: "Header", type: "FRAME", pageName: "P", screenName: "Header",
        absoluteBoundingBox: { x: 500, y: 0, width: 400, height: 120 },
        children: [
          {
            trackingId: "logo", name: "Logo", type: "FRAME", pageName: "P", screenName: "Header",
            absoluteBoundingBox: { x: 520, y: 10, width: mods.logoW, height: 40 },
            properties: { width: mods.logoW },
          },
        ],
      },
    ],
  };
}

describe("highlightsByScreen (VD-5)", () => {
  it("locates modified regions relative to each screen's origin", () => {
    const before = buildSnapshotFromSpec(page({ heroText: "Hi", logoW: 80 }), { id: "b", scopeId: "s" });
    const after = buildSnapshotFromSpec(page({ heroText: "Hello", logoW: 100 }), { id: "c", scopeId: "s" });

    const cs = diffSnapshots(before, after);
    const screens = highlightsByScreen(cs, before, after);

    const home = screens.find((s) => s.screen === "Home");
    const hero = home?.regions.find((r) => r.trackingId === "hero");
    // Hero abs (20,50) minus Home origin (0,0) → (20,50); size preserved.
    expect(hero).toMatchObject({ kind: "modified", x: 20, y: 50, width: 360, height: 200, label: "Hero" });

    const header = screens.find((s) => s.screen === "Header");
    const logo = header?.regions.find((r) => r.trackingId === "logo");
    // Logo abs (520,10) minus Header origin (500,0) → (20,10).
    expect(logo).toMatchObject({ kind: "modified", x: 20, y: 10 });
  });

  it("places added nodes from current and skips screens with no changes", () => {
    const before = buildSnapshotFromSpec(page({ heroText: "Hi", logoW: 80 }), { id: "b", scopeId: "s" });
    const after = buildSnapshotFromSpec(page({ heroText: "Hi", logoW: 80, extra: true }), { id: "c", scopeId: "s" });

    const cs = diffSnapshots(before, after);
    const screens = highlightsByScreen(cs, before, after);

    // Only Home changed (Badge added); Header absent.
    expect(screens.map((s) => s.screen)).toEqual(["Home"]);
    const badge = screens.find((s) => s.screen === "Home")?.regions.find((r) => r.trackingId === "badge");
    expect(badge).toMatchObject({ kind: "added", x: 300, y: 60 });
  });

  it("places removed nodes from baseline", () => {
    const before = buildSnapshotFromSpec(page({ heroText: "Hi", logoW: 80, extra: true }), { id: "b", scopeId: "s" });
    const after = buildSnapshotFromSpec(page({ heroText: "Hi", logoW: 80 }), { id: "c", scopeId: "s" });

    const cs = diffSnapshots(before, after);
    const screens = highlightsByScreen(cs, before, after);
    const badge = screens.find((s) => s.screen === "Home")?.regions.find((r) => r.trackingId === "badge");
    expect(badge).toMatchObject({ kind: "removed", x: 300, y: 60 });
  });

  it("skips changes whose nodes have no captured bounds", () => {
    const noBounds = (t: string): NodeSpec => ({
      trackingId: "page", name: "P", type: "PAGE", pageName: "P",
      children: [{
        trackingId: "home", name: "Home", type: "FRAME", pageName: "P", screenName: "Home",
        absoluteBoundingBox: { x: 0, y: 0, width: 100, height: 100 },
        children: [{ trackingId: "x", name: "X", type: "FRAME", pageName: "P", screenName: "Home", properties: { characters: t } }],
      }],
    });
    const before = buildSnapshotFromSpec(noBounds("a"), { id: "b", scopeId: "s" });
    const after = buildSnapshotFromSpec(noBounds("b"), { id: "c", scopeId: "s" });
    const cs = diffSnapshots(before, after);
    // Change exists but node "x" has no box → no region, so no screen entry.
    expect(highlightsByScreen(cs, before, after)).toEqual([]);
  });
});
