/**
 * Property classification, impact rules, and human-readable formatting.
 * Pure and deterministic — the same change always yields the same category,
 * impact, and summary string.
 */
import type {
  ChangeCategory,
  Impact,
  NodeChange,
  PropertyChange,
} from "../shared/schema";
import { MIXED } from "../shared/schema";

/** Top-level property path → change category. */
const CATEGORY_BY_PATH: Record<string, ChangeCategory> = {
  // structural identity
  name: "structural",
  type: "structural",
  children: "structural",
  // layout / geometry / auto-layout
  x: "layout",
  y: "layout",
  width: "layout",
  height: "layout",
  layoutMode: "layout",
  itemSpacing: "layout",
  paddingTop: "layout",
  paddingRight: "layout",
  paddingBottom: "layout",
  paddingLeft: "layout",
  // visual
  visible: "visual",
  opacity: "visual",
  fills: "visual",
  strokes: "visual",
  cornerRadius: "visual",
  // typography
  characters: "content",
  fontSize: "typography",
  fontName: "typography",
  lineHeight: "typography",
  letterSpacing: "typography",
  // component api
  componentProperties: "component",
  variantProperties: "component",
};

export function categoryForPath(path: string): ChangeCategory {
  const top = path.split(".")[0] ?? path;
  return CATEGORY_BY_PATH[top] ?? "visual";
}

const IMPACT_ORDER: Record<Impact, number> = {
  low: 0,
  medium: 1,
  high: 2,
  breaking: 3,
};

export function maxImpact(a: Impact, b: Impact): Impact {
  return IMPACT_ORDER[a] >= IMPACT_ORDER[b] ? a : b;
}

/** Per-property impact. Deterministic mapping, independent of value. */
export function impactForPath(path: string): Impact {
  const top = path.split(".")[0] ?? path;
  switch (top) {
    case "type":
      return "breaking";
    case "componentProperties":
    case "variantProperties":
      return "high";
    case "characters":
    case "children":
      return "medium";
    case "width":
    case "height":
      return "medium";
    default:
      return "low";
  }
}

/** Impact of a whole node change from its kind + property impacts. */
export function impactForNodeChange(
  kind: NodeChange["kind"],
  propertyChanges: PropertyChange[]
): Impact {
  if (kind === "removed") return "high";
  let impact: Impact = kind === "added" ? "medium" : "low";
  for (const pc of propertyChanges) {
    impact = maxImpact(impact, impactForPath(pc.path));
  }
  return impact;
}

/** Compact, deterministic, human-readable rendering of a normalized value. */
export function formatValue(value: unknown): string {
  if (value === undefined) return "∅";
  if (value === null) return "null";
  if (value === MIXED) return "mixed";
  const t = typeof value;
  if (t === "string") return JSON.stringify(value);
  if (t === "number" || t === "boolean") return String(value);
  // arrays / objects — compact JSON with sorted keys for stability
  return sortedJson(value);
}

export function summarize(
  path: string,
  previousValue: unknown,
  currentValue: unknown
): string {
  return `${path}: ${formatValue(previousValue)} → ${formatValue(currentValue)}`;
}

function sortedJson(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(sortedJson).join(", ")}]`;
  }
  if (value && typeof value === "object") {
    const obj = value as Record<string, unknown>;
    const keys = Object.keys(obj)
      .filter((k) => obj[k] !== undefined)
      .sort();
    return `{${keys.map((k) => `${k}: ${sortedJson(obj[k])}`).join(", ")}}`;
  }
  if (typeof value === "string") return JSON.stringify(value);
  return String(value);
}
