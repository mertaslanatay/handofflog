/**
 * Real-file fixture loader (A-01).
 *
 * Converts a Figma REST-API node tree (the shape returned by
 * `GET /v1/files/:key/nodes`) into a Handofflog `Snapshot`, WITHOUT touching the
 * Figma plugin global. This lets us capture real handoff designs as plain JSON
 * and run the pure core diff engine against them in a node test environment —
 * the foundation for the calibration harnesses in A-03 / A-04.
 *
 * It intentionally mirrors the plugin's live normalizer (`src/plugin/normalize`)
 * so a snapshot loaded from an export is comparable to one built in Figma:
 * same rounding, same `mixed` handling, same supported-property set, same hash.
 */
import { z } from "zod";
import {
  SNAPSHOT_SCHEMA_VERSION,
  SnapshotSchema,
  type NodeProperties,
  type NodeSnapshot,
  type NormalizedPaint,
  type Snapshot,
} from "../shared/schema";
import { hashNode, fnv1a } from "./hash";
import { roundNumber } from "./serialize";

// --- Lenient input schema (Figma REST) --------------------------------------
// Only the fields we read are typed; `.passthrough()` tolerates the rest of the
// (large) real payload so fixtures need no hand-trimming.

const RestColorSchema = z
  .object({ r: z.number(), g: z.number(), b: z.number(), a: z.number().optional() })
  .passthrough();

const RestPaintSchema = z
  .object({
    type: z.string(),
    visible: z.boolean().optional(),
    opacity: z.number().optional(),
    blendMode: z.string().optional(),
    color: RestColorSchema.optional(),
    gradientStops: z
      .array(z.object({ position: z.number().optional(), color: RestColorSchema.optional() }).passthrough())
      .optional(),
    imageRef: z.string().optional(),
  })
  .passthrough();

const RestTextStyleSchema = z
  .object({
    fontFamily: z.string().optional(),
    fontStyle: z.string().optional(),
    fontWeight: z.number().optional(),
    fontSize: z.number().optional(),
    lineHeightPx: z.number().optional(),
    lineHeightPercentFontSize: z.number().optional(),
    lineHeightUnit: z.string().optional(),
    letterSpacing: z.number().optional(),
  })
  .passthrough();

const RestBoxSchema = z
  .object({
    x: z.number().optional(),
    y: z.number().optional(),
    width: z.number().optional(),
    height: z.number().optional(),
  })
  .passthrough();

export interface FigmaExportNode {
  id?: string;
  name?: string;
  type?: string;
  visible?: boolean;
  opacity?: number;
  absoluteBoundingBox?: z.infer<typeof RestBoxSchema>;
  fills?: z.infer<typeof RestPaintSchema>[];
  strokes?: z.infer<typeof RestPaintSchema>[];
  cornerRadius?: number;
  rectangleCornerRadii?: number[];
  layoutMode?: string;
  itemSpacing?: number;
  paddingLeft?: number;
  paddingRight?: number;
  paddingTop?: number;
  paddingBottom?: number;
  characters?: string;
  style?: z.infer<typeof RestTextStyleSchema>;
  componentId?: string;
  componentProperties?: Record<string, unknown>;
  variantProperties?: Record<string, string>;
  children?: FigmaExportNode[];
}

const FigmaExportNodeSchema: z.ZodType<FigmaExportNode> = z.lazy(() =>
  z
    .object({
      id: z.string().optional(),
      name: z.string().optional(),
      type: z.string().optional(),
      visible: z.boolean().optional(),
      opacity: z.number().optional(),
      absoluteBoundingBox: RestBoxSchema.optional(),
      fills: z.array(RestPaintSchema).optional(),
      strokes: z.array(RestPaintSchema).optional(),
      cornerRadius: z.number().optional(),
      rectangleCornerRadii: z.array(z.number()).optional(),
      layoutMode: z.string().optional(),
      itemSpacing: z.number().optional(),
      paddingLeft: z.number().optional(),
      paddingRight: z.number().optional(),
      paddingTop: z.number().optional(),
      paddingBottom: z.number().optional(),
      characters: z.string().optional(),
      style: RestTextStyleSchema.optional(),
      componentId: z.string().optional(),
      componentProperties: z.record(z.string(), z.unknown()).optional(),
      variantProperties: z.record(z.string(), z.string()).optional(),
      children: z.array(FigmaExportNodeSchema).optional(),
    })
    .passthrough()
);

type RestPaint = z.infer<typeof RestPaintSchema>;
type RestTextStyle = z.infer<typeof RestTextStyleSchema>;

export interface LoadOptions {
  /** Snapshot id; defaults to a deterministic value derived from the root id. */
  snapshotId?: string;
  /** Scope id; defaults to the root node id. */
  scopeId?: string;
  fileKey?: string;
  createdAt?: string;
}

// --- Property normalization (pure, mirrors plugin/normalize) ------------------

function normalizePaint(paint: RestPaint): NormalizedPaint {
  const out: NormalizedPaint = { type: paint.type };
  if (paint.visible !== undefined) out.visible = paint.visible;
  if (paint.opacity !== undefined) out.opacity = roundNumber(paint.opacity);
  if (paint.blendMode !== undefined) out.blendMode = paint.blendMode;

  if (paint.type === "SOLID" && paint.color) {
    out.color = {
      r: roundNumber(paint.color.r),
      g: roundNumber(paint.color.g),
      b: roundNumber(paint.color.b),
    };
  } else if (paint.gradientStops) {
    out.detail = fnv1a(
      JSON.stringify(
        paint.gradientStops.map((s) => ({
          position: roundNumber(s.position ?? 0),
          color: s.color ?? null,
        }))
      )
    );
  } else if (paint.imageRef) {
    out.detail = fnv1a(paint.imageRef);
  }
  return out;
}

function normalizeLineHeight(style: RestTextStyle): NodeProperties["lineHeight"] {
  const unit = style.lineHeightUnit;
  if (unit === undefined) return undefined;
  if (unit === "PIXELS" && style.lineHeightPx !== undefined) {
    return { unit: "PIXELS", value: roundNumber(style.lineHeightPx) };
  }
  if (unit === "FONT_SIZE_%" && style.lineHeightPercentFontSize !== undefined) {
    return { unit: "PERCENT", value: roundNumber(style.lineHeightPercentFontSize) };
  }
  // "INTRINSIC_%" (and anything else) means Figma's "Auto" line height.
  return { unit: "AUTO" };
}

function normalizeProperties(node: FigmaExportNode): NodeProperties {
  const props: NodeProperties = {};
  const box = node.absoluteBoundingBox;
  if (box) {
    if (box.x !== undefined) props.x = roundNumber(box.x);
    if (box.y !== undefined) props.y = roundNumber(box.y);
    if (box.width !== undefined) props.width = roundNumber(box.width);
    if (box.height !== undefined) props.height = roundNumber(box.height);
  }

  if (node.visible !== undefined) props.visible = node.visible;
  if (node.opacity !== undefined) props.opacity = roundNumber(node.opacity);

  if (node.fills) props.fills = node.fills.map(normalizePaint);
  if (node.strokes) props.strokes = node.strokes.map(normalizePaint);

  if (node.rectangleCornerRadii) {
    props.cornerRadius = node.rectangleCornerRadii.map((r) => roundNumber(r));
  } else if (node.cornerRadius !== undefined) {
    props.cornerRadius = roundNumber(node.cornerRadius);
  }

  if (node.layoutMode !== undefined && node.layoutMode !== "NONE") {
    props.layoutMode = node.layoutMode;
    if (node.itemSpacing !== undefined) props.itemSpacing = roundNumber(node.itemSpacing);
    if (node.paddingTop !== undefined) props.paddingTop = roundNumber(node.paddingTop);
    if (node.paddingRight !== undefined) props.paddingRight = roundNumber(node.paddingRight);
    if (node.paddingBottom !== undefined) props.paddingBottom = roundNumber(node.paddingBottom);
    if (node.paddingLeft !== undefined) props.paddingLeft = roundNumber(node.paddingLeft);
  }

  if (node.type === "TEXT") {
    if (node.characters !== undefined) props.characters = node.characters;
    const style = node.style;
    if (style) {
      if (style.fontSize !== undefined) props.fontSize = roundNumber(style.fontSize);
      if (style.fontFamily !== undefined) {
        props.fontName = {
          family: style.fontFamily,
          style: style.fontStyle ?? (style.fontWeight !== undefined ? String(style.fontWeight) : ""),
        };
      }
      const lineHeight = normalizeLineHeight(style);
      if (lineHeight !== undefined) props.lineHeight = lineHeight;
      if (style.letterSpacing !== undefined) {
        props.letterSpacing = { unit: "PIXELS", value: roundNumber(style.letterSpacing) };
      }
    }
  }

  if (node.componentProperties) {
    const reduced: Record<string, unknown> = {};
    for (const key of Object.keys(node.componentProperties).sort()) {
      const entry = node.componentProperties[key];
      reduced[key] =
        entry && typeof entry === "object" && "value" in entry
          ? (entry as { value: unknown }).value
          : entry;
    }
    props.componentProperties = reduced;
  }
  if (node.variantProperties) props.variantProperties = { ...node.variantProperties };

  return props;
}

// --- Public API --------------------------------------------------------------

/**
 * Load a `Snapshot` from a Figma REST node tree (single root node). The output
 * is validated against `SnapshotSchema` before return, so a malformed export
 * fails loudly rather than producing a subtly-wrong snapshot.
 *
 * Tracking identity uses the node id (export has no plugin data) — this matches
 * the matcher's documented fallback precedence (trackingId → nodeId → …).
 */
export function loadSnapshotFromFigmaExport(
  input: unknown,
  options: LoadOptions = {}
): Snapshot {
  const root = FigmaExportNodeSchema.parse(input);
  const rootId = root.id ?? "root";
  const nodes: Record<string, NodeSnapshot> = {};

  const visit = (
    node: FigmaExportNode,
    parentTrackingId: string | undefined,
    path: string
  ): string => {
    // Real exports always carry a stable id. The path-based fallback keeps
    // identity deterministic and O(1) when an id is missing — the previous
    // `Object.keys(nodes).length` counter was order-sensitive and O(n²).
    const nodeId = node.id ?? `synthetic:${path}`;
    const trackingId = nodeId;
    const name = node.name ?? "";
    const type = node.type ?? "UNKNOWN";
    const properties = normalizeProperties(node);

    const childTrackingIds: string[] = [];
    const children = node.children ?? [];
    for (let i = 0; i < children.length; i++) {
      const child = children[i];
      if (child === undefined) continue;
      childTrackingIds.push(visit(child, trackingId, `${path}/${i}`));
    }

    // Duplicate ids would silently overwrite a sibling/branch and corrupt the
    // tree; fail loudly instead. Checked just before insertion so it catches
    // collisions regardless of traversal order.
    if (nodes[trackingId] !== undefined) {
      throw new Error(`Duplicate node id in Figma export: "${trackingId}"`);
    }

    const snapshot: NodeSnapshot = {
      trackingId,
      nodeId,
      name,
      type,
      childTrackingIds,
      properties,
      hash: hashNode({ name, type, properties }),
    };
    if (parentTrackingId !== undefined) snapshot.parentTrackingId = parentTrackingId;
    if (node.componentId !== undefined) snapshot.componentKey = node.componentId;
    nodes[trackingId] = snapshot;
    return trackingId;
  };

  visit(root, undefined, "0");

  const snapshot: Snapshot = {
    schemaVersion: SNAPSHOT_SCHEMA_VERSION,
    id: options.snapshotId ?? `export_${rootId}`,
    scopeId: options.scopeId ?? rootId,
    scopeName: root.name ?? rootId,
    createdAt: options.createdAt ?? "2026-01-01T00:00:00.000Z",
    nodes,
  };
  if (options.fileKey !== undefined) snapshot.fileKey = options.fileKey;

  // Guarantee the loader can never emit an invalid snapshot.
  return SnapshotSchema.parse(snapshot);
}
