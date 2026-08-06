import { describe, it, expect } from "vitest";
import { contrastRatio, meetsAA, relativeLuminance } from "./contrast";

describe("contrast math", () => {
  it("black on white is 21:1", () => {
    expect(Math.round(contrastRatio("#000000", "#ffffff"))).toBe(21);
  });
  it("white on white is 1:1", () => {
    expect(contrastRatio("#ffffff", "#ffffff")).toBeCloseTo(1, 5);
  });
  it("luminance is ordered", () => {
    expect(relativeLuminance("#ffffff")).toBeGreaterThan(relativeLuminance("#808080"));
  });
});

describe("F-06 UI fallback tokens meet WCAG AA on light background", () => {
  const BG = "#ffffff";
  // Text-like fallback colors used in styles.ts.
  const textTokens: Record<string, string> = {
    "text-primary": "#1a1a1a",
    "text-secondary": "#666666",
    "impact-low": "#6b7280",
    "impact-medium": "#b45309",
    "impact-high": "#c2410c",
    "impact-breaking": "#b91c1c",
    "danger-text": "#b91c1c",
    "brand-onwhite": "#005a9e",
  };

  for (const [name, hex] of Object.entries(textTokens)) {
    it(`${name} (${hex}) ≥ 4.5:1`, () => {
      const ratio = contrastRatio(hex, BG);
      expect(meetsAA(ratio)).toBe(true);
    });
  }
});
