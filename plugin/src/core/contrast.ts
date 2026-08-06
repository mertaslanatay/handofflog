/**
 * WCAG 2.1 contrast math (F-06). Pure; used to assert the UI's fallback color
 * tokens meet AA. (Figma theme variables override these at runtime; the
 * fallbacks are what we control and test.)
 */
export interface Rgb8 {
  r: number;
  g: number;
  b: number;
}

export function parseHex(hex: string): Rgb8 {
  const h = hex.replace("#", "").trim();
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  if ([r, g, b].some((v) => Number.isNaN(v))) throw new Error(`Invalid hex: ${hex}`);
  return { r, g, b };
}

function channelLuminance(value8: number): number {
  const s = value8 / 255;
  return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}

export function relativeLuminance(hex: string): number {
  const { r, g, b } = parseHex(hex);
  return 0.2126 * channelLuminance(r) + 0.7152 * channelLuminance(g) + 0.0722 * channelLuminance(b);
}

export function contrastRatio(hexA: string, hexB: string): number {
  const la = relativeLuminance(hexA);
  const lb = relativeLuminance(hexB);
  const lighter = Math.max(la, lb);
  const darker = Math.min(la, lb);
  return (lighter + 0.05) / (darker + 0.05);
}

/** AA: 4.5:1 for normal text, 3:1 for large text / UI components. */
export function meetsAA(ratio: number, large = false): boolean {
  return ratio >= (large ? 3 : 4.5);
}
