import { describe, it, expect } from "vitest";
import { diffSnapshots } from "./diff";
import { summarizeByScreen } from "./page-report";
import { buildSnapshotFromSpec, type NodeSpec } from "./testkit";

/** A page with two screens (top-level frames), each with a child. */
function page(mods: { header: string; hero: string }): NodeSpec {
  return {
    trackingId: "page", name: "Dashboard", type: "PAGE", pageName: "Dashboard",
    children: [
      {
        trackingId: "s1", name: "Home", type: "FRAME", pageName: "Dashboard", screenName: "Home",
        children: [{ trackingId: "hero", name: "Hero", type: "FRAME", pageName: "Dashboard", screenName: "Home", properties: { characters: mods.hero } }],
      },
      {
        trackingId: "s2", name: "Header", type: "FRAME", pageName: "Dashboard", screenName: "Header",
        children: [{ trackingId: "logo", name: "Logo", type: "FRAME", pageName: "Dashboard", screenName: "Header", properties: { width: mods.header === "x" ? 100 : 120 } }],
      },
    ],
  };
}

describe("page-based diff → screen grouping (Feature 4/5)", () => {
  it("carries screenName onto changes and groups them per screen", () => {
    const before = buildSnapshotFromSpec(page({ header: "x", hero: "Welcome" }), { id: "b", scopeId: "sc" });
    const after = buildSnapshotFromSpec(page({ header: "y", hero: "Hello" }), { id: "c", scopeId: "sc" });

    const cs = diffSnapshots(before, after);
    // Changes carry screenName from the snapshot.
    const heroChange = cs.modified.find((c) => c.trackingId === "hero");
    expect(heroChange?.screenName).toBe("Home");

    const byScreen = summarizeByScreen(cs); // default resolver uses screenName
    const screens = byScreen.map((s) => s.screen);
    expect(screens).toContain("Home");
    expect(screens).toContain("Header");
    // Every listed screen has at least one change.
    expect(byScreen.every((s) => s.count > 0)).toBe(true);
  });
});
