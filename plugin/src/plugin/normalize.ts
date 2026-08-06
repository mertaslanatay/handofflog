/**
 * Figma node → normalized `NodeProperties`.
 *
 * This is the ONLY layer allowed to read live Figma API objects. It converts
 * volatile, non-serializable values (readonly arrays, `figma.mixed`, paint
 * objects, large image refs) into the plain, deterministic shapes defined in
 * the shared schema. Figma API objects are never stored directly.
 */
import type {
  NodeProperties,
  NormalizedFont,
  NormalizedLetterSpacing,
  NormalizedLineHeight,
  NormalizedPaint,
} from "../shared/schema";
import { MIXED } from "../shared/schema";
import { fnv1a } from "../core/hash";
import { roundNumber } from "../core/serialize";

function isMixed(value: unknown): boolean {
  return value === figma.mixed;
}

/** Read a property that may not exist on this node type. */
function read<T>(node: SceneNode, key: string): T | undefined {
  if (key in node) {
    return (node as unknown as Record<string, T>)[key];
  }
  return undefined;
}

function normalizePaints(
  value: readonly Paint[] | typeof figma.mixed | undefined
): NormalizedPaint[] | undefined {
  if (value === undefined || isMixed(value)) return undefined;
  const paints = value as readonly Paint[];
  return paints.map(normalizePaint);
}

function normalizePaint(paint: Paint): NormalizedPaint {
  const base: NormalizedPaint = { type: paint.type };
  if (paint.visible !== undefined) base.visible = paint.visible;
  if (paint.opacity !== undefined) base.opacity = roundNumber(paint.opacity);
  if (paint.blendMode !== undefined) base.blendMode = paint.blendMode;

  if (paint.type === "SOLID") {
    base.color = {
      r: roundNumber(paint.color.r),
      g: roundNumber(paint.color.g),
      b: roundNumber(paint.color.b),
    };
  } else if (
    paint.type === "GRADIENT_LINEAR" ||
    paint.type === "GRADIENT_RADIAL" ||
    paint.type === "GRADIENT_ANGULAR" ||
    paint.type === "GRADIENT_DIAMOND"
  ) {
    base.detail = fnv1a(
      JSON.stringify(
        paint.gradientStops.map((s) => ({
          position: roundNumber(s.position),
          color: s.color,
        }))
      )
    );
  } else if (paint.type === "IMAGE") {
    // Never embed image binaries; a stable ref digest is enough for diffing.
    base.detail = paint.imageHash ? fnv1a(paint.imageHash) : "no-image";
  }
  return base;
}

function normalizeCornerRadius(
  node: SceneNode
): NodeProperties["cornerRadius"] {
  if (!("cornerRadius" in node)) return undefined;
  const value = read<number | typeof figma.mixed>(node, "cornerRadius");
  if (value === undefined) return undefined;
  if (isMixed(value)) {
    // Fall back to the four individual corners if available.
    const corners: number[] = [];
    for (const key of [
      "topLeftRadius",
      "topRightRadius",
      "bottomRightRadius",
      "bottomLeftRadius",
    ]) {
      const c = read<number>(node, key);
      if (typeof c === "number") corners.push(roundNumber(c));
    }
    return corners.length > 0 ? corners : MIXED;
  }
  return roundNumber(value as number);
}

function normalizeFontName(
  value: FontName | typeof figma.mixed | undefined
): NormalizedFont | typeof MIXED | undefined {
  if (value === undefined) return undefined;
  if (isMixed(value)) return MIXED;
  const font = value as FontName;
  return { family: font.family, style: font.style };
}

function normalizeFontSize(
  value: number | typeof figma.mixed | undefined
): number | typeof MIXED | undefined {
  if (value === undefined) return undefined;
  if (isMixed(value)) return MIXED;
  return roundNumber(value as number);
}

function normalizeLineHeight(
  value: LineHeight | typeof figma.mixed | undefined
): NormalizedLineHeight | undefined {
  if (value === undefined) return undefined;
  if (isMixed(value)) return MIXED;
  const lh = value as LineHeight;
  if (lh.unit === "AUTO") return { unit: "AUTO" };
  return { unit: lh.unit, value: roundNumber(lh.value) };
}

function normalizeLetterSpacing(
  value: LetterSpacing | typeof figma.mixed | undefined
): NormalizedLetterSpacing | undefined {
  if (value === undefined) return undefined;
  if (isMixed(value)) return MIXED;
  const ls = value as LetterSpacing;
  return { unit: ls.unit, value: roundNumber(ls.value) };
}

function setIfNumber(
  target: NodeProperties,
  key: keyof NodeProperties,
  value: unknown
): void {
  if (typeof value === "number") {
    (target as Record<string, unknown>)[key] = roundNumber(value);
  }
}

/**
 * Build the normalized property bag for a single node. Only properties that
 * actually exist on the node are populated; everything else is left undefined
 * and dropped from serialization.
 */
export function normalizeNodeProperties(node: SceneNode): NodeProperties {
  const props: NodeProperties = {};

  setIfNumber(props, "x", read(node, "x"));
  setIfNumber(props, "y", read(node, "y"));
  setIfNumber(props, "width", read(node, "width"));
  setIfNumber(props, "height", read(node, "height"));

  const visible = read<boolean>(node, "visible");
  if (typeof visible === "boolean") props.visible = visible;

  const opacity = read<number>(node, "opacity");
  if (typeof opacity === "number") props.opacity = roundNumber(opacity);

  const fills = normalizePaints(
    read<readonly Paint[] | typeof figma.mixed>(node, "fills")
  );
  if (fills !== undefined) props.fills = fills;

  const strokes = read<readonly Paint[]>(node, "strokes");
  if (strokes !== undefined) {
    const normalized = normalizePaints(strokes);
    if (normalized !== undefined) props.strokes = normalized;
  }

  const cornerRadius = normalizeCornerRadius(node);
  if (cornerRadius !== undefined) props.cornerRadius = cornerRadius;

  const layoutMode = read<string>(node, "layoutMode");
  if (typeof layoutMode === "string" && layoutMode !== "NONE") {
    props.layoutMode = layoutMode;
    setIfNumber(props, "itemSpacing", read(node, "itemSpacing"));
    setIfNumber(props, "paddingTop", read(node, "paddingTop"));
    setIfNumber(props, "paddingRight", read(node, "paddingRight"));
    setIfNumber(props, "paddingBottom", read(node, "paddingBottom"));
    setIfNumber(props, "paddingLeft", read(node, "paddingLeft"));
  }

  if (node.type === "TEXT") {
    // C-06: tolerate font/metric access errors — skip unreadable text props but
    // keep the node and all other diffs rather than failing the whole snapshot.
    try {
      const text = node as TextNode;
      props.characters = text.characters;
      const fs = normalizeFontSize(text.fontSize);
      if (fs !== undefined) props.fontSize = fs;
      const fn = normalizeFontName(text.fontName);
      if (fn !== undefined) props.fontName = fn;
      const lh = normalizeLineHeight(text.lineHeight);
      if (lh !== undefined) props.lineHeight = lh;
      const ls = normalizeLetterSpacing(text.letterSpacing);
      if (ls !== undefined) props.letterSpacing = ls;
    } catch {
      // Property left unset; diff simply won't report it for this node.
    }
  }

  const componentProperties = read<Record<string, unknown>>(
    node,
    "componentProperties"
  );
  if (componentProperties && typeof componentProperties === "object") {
    props.componentProperties = normalizeComponentProperties(componentProperties);
  }

  const variantProperties = read<Record<string, string> | null>(
    node,
    "variantProperties"
  );
  if (variantProperties && typeof variantProperties === "object") {
    props.variantProperties = { ...variantProperties };
  }

  return props;
}

/** Reduce component property descriptors to their bound values. */
function normalizeComponentProperties(
  raw: Record<string, unknown>
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(raw).sort()) {
    const entry = raw[key];
    if (entry && typeof entry === "object" && "value" in entry) {
      out[key] = (entry as { value: unknown }).value;
    } else {
      out[key] = entry;
    }
  }
  return out;
}
