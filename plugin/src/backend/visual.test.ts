import { describe, it, expect } from "vitest";
import { assembleVisualScreens } from "./visual";
import type { VisualUpload } from "../shared/release";

const region = (id: string) => ({
  trackingId: id, kind: "modified" as const, x: 0, y: 0, width: 10, height: 10, label: id,
});

const uploads: VisualUpload[] = [
  { screen: "Home", regions: [region("a")], afterBase64: "AAAA", width: 400, height: 800 },
  { screen: "Header", regions: [region("b")], afterBase64: "BBBB", width: 400, height: 120 },
];

describe("assembleVisualScreens (VD-2)", () => {
  it("attaches uploaded refs to matching screens and sorts by name", () => {
    const screens = assembleVisualScreens(uploads, [
      { screen: "Home", after: { pathname: "p/home.png", width: 400, height: 800 } },
      { screen: "Header", after: { pathname: "p/header.png", width: 400, height: 120 } },
    ]);
    expect(screens.map((s) => s.screen)).toEqual(["Header", "Home"]);
    expect(screens.find((s) => s.screen === "Home")?.after?.pathname).toBe("p/home.png");
    expect(screens.find((s) => s.screen === "Home")?.regions[0]?.trackingId).toBe("a");
  });

  it("attaches both before and after refs when present", () => {
    const screens = assembleVisualScreens([uploads[0]!], [
      {
        screen: "Home",
        before: { pathname: "p/before.png", width: 400, height: 800 },
        after: { pathname: "p/after.png", width: 400, height: 800 },
      },
    ]);
    const home = screens.find((s) => s.screen === "Home");
    expect(home?.before?.pathname).toBe("p/before.png");
    expect(home?.after?.pathname).toBe("p/after.png");
  });

  it("keeps regions but omits image when a screen's upload failed", () => {
    const screens = assembleVisualScreens(uploads, [
      { screen: "Home", after: { pathname: "p/home.png", width: 400, height: 800 } },
      { screen: "Header" }, // upload failed
    ]);
    const header = screens.find((s) => s.screen === "Header");
    expect(header?.after).toBeUndefined();
    expect(header?.regions).toHaveLength(1);
  });
});
