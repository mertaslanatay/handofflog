/**
 * Handofflog shared data schema (Phase 01).
 *
 * Single source of truth for the snapshot / diff data model. Types are derived
 * from Zod schemas via `z.infer` so that runtime validation and static types can
 * never drift apart. This module is pure data + validation and MUST NOT import
 * the Figma API or any DOM/React code — it is shared by the plugin main thread,
 * the UI iframe, and the Figma-independent core diff engine.
 */
import { z } from "zod";

/** Bump when the on-disk snapshot shape changes in a non-backward-compatible way. */
export const SNAPSHOT_SCHEMA_VERSION = 1 as const;
export type SnapshotSchemaVersion = typeof SNAPSHOT_SCHEMA_VERSION;

/**
 * Sentinel used in place of Figma's `figma.mixed` symbol, which cannot be
 * serialized. Normalizers convert `figma.mixed` into this string.
 */
export const MIXED = "mixed" as const;
export type Mixed = typeof MIXED;

/** Properties the Phase 01 prototype tracks. Kept in sync with the master prompt. */
export const SUPPORTED_PROPERTIES = [
  "name",
  "type",
  "x",
  "y",
  "width",
  "height",
  "visible",
  "opacity",
  "fills",
  "strokes",
  "cornerRadius",
  "layoutMode",
  "itemSpacing",
  "paddingTop",
  "paddingRight",
  "paddingBottom",
  "paddingLeft",
  "characters",
  "fontSize",
  "fontName",
  "lineHeight",
  "letterSpacing",
  "componentProperties",
  "variantProperties",
] as const;
export type SupportedProperty = (typeof SUPPORTED_PROPERTIES)[number];

// --- Normalized value shapes -------------------------------------------------

export const RgbSchema = z.object({
  r: z.number(),
  g: z.number(),
  b: z.number(),
});
export type Rgb = z.infer<typeof RgbSchema>;

/** A Figma Paint reduced to the fields that matter for a design changelog. */
export const NormalizedPaintSchema = z.object({
  type: z.string(),
  visible: z.boolean().optional(),
  opacity: z.number().optional(),
  color: RgbSchema.optional(),
  blendMode: z.string().optional(),
  /** Stable digest of gradient stops / image ref so large payloads stay out. */
  detail: z.string().optional(),
});
export type NormalizedPaint = z.infer<typeof NormalizedPaintSchema>;

export const NormalizedFontSchema = z.object({
  family: z.string(),
  style: z.string(),
});
export type NormalizedFont = z.infer<typeof NormalizedFontSchema>;

export const NormalizedLineHeightSchema = z.union([
  z.object({ unit: z.literal("AUTO") }),
  z.object({ unit: z.enum(["PIXELS", "PERCENT"]), value: z.number() }),
  z.literal(MIXED),
]);
export type NormalizedLineHeight = z.infer<typeof NormalizedLineHeightSchema>;

export const NormalizedLetterSpacingSchema = z.union([
  z.object({ unit: z.enum(["PIXELS", "PERCENT"]), value: z.number() }),
  z.literal(MIXED),
]);
export type NormalizedLetterSpacing = z.infer<
  typeof NormalizedLetterSpacingSchema
>;

// --- Node properties ---------------------------------------------------------

export const NodePropertiesSchema = z.object({
  x: z.number().optional(),
  y: z.number().optional(),
  width: z.number().optional(),
  height: z.number().optional(),
  visible: z.boolean().optional(),
  opacity: z.number().optional(),

  fills: z.array(NormalizedPaintSchema).optional(),
  strokes: z.array(NormalizedPaintSchema).optional(),
  cornerRadius: z.union([z.number(), z.array(z.number()), z.literal(MIXED)]).optional(),

  layoutMode: z.string().optional(),
  itemSpacing: z.number().optional(),
  paddingTop: z.number().optional(),
  paddingRight: z.number().optional(),
  paddingBottom: z.number().optional(),
  paddingLeft: z.number().optional(),

  characters: z.string().optional(),
  fontSize: z.union([z.number(), z.literal(MIXED)]).optional(),
  fontName: z.union([NormalizedFontSchema, z.literal(MIXED)]).optional(),
  lineHeight: NormalizedLineHeightSchema.optional(),
  letterSpacing: NormalizedLetterSpacingSchema.optional(),

  componentProperties: z.record(z.string(), z.unknown()).optional(),
  variantProperties: z.record(z.string(), z.string()).optional(),
});
export type NodeProperties = z.infer<typeof NodePropertiesSchema>;

// --- Snapshot ----------------------------------------------------------------

export const NodeSnapshotSchema = z.object({
  trackingId: z.string(),
  nodeId: z.string(),
  parentTrackingId: z.string().optional(),
  name: z.string(),
  type: z.string(),
  /**
   * Component key/id for instances, used as a matching signal when trackingId
   * and nodeId both fail (e.g. an instance is replaced). Matching-only metadata;
   * intentionally excluded from `hash`. Additive & optional — no schema bump.
   */
  componentKey: z.string().optional(),
  childTrackingIds: z.array(z.string()),
  properties: NodePropertiesSchema,
  hash: z.string(),
});
export type NodeSnapshot = z.infer<typeof NodeSnapshotSchema>;

export const SnapshotSchema = z.object({
  schemaVersion: z.literal(SNAPSHOT_SCHEMA_VERSION),
  id: z.string(),
  fileKey: z.string().optional(),
  scopeId: z.string(),
  scopeName: z.string(),
  createdAt: z.string(),
  nodes: z.record(z.string(), NodeSnapshotSchema),
});
export type Snapshot = z.infer<typeof SnapshotSchema>;

// --- Diff result -------------------------------------------------------------

export const ChangeCategorySchema = z.enum([
  "layout",
  "visual",
  "typography",
  "content",
  "component",
  "structural",
]);
export type ChangeCategory = z.infer<typeof ChangeCategorySchema>;

export const ImpactSchema = z.enum(["low", "medium", "high", "breaking"]);
export type Impact = z.infer<typeof ImpactSchema>;

export const ChangeKindSchema = z.enum(["added", "removed", "modified"]);
export type ChangeKind = z.infer<typeof ChangeKindSchema>;

export const PropertyChangeSchema = z.object({
  path: z.string(),
  category: ChangeCategorySchema,
  previousValue: z.unknown(),
  currentValue: z.unknown(),
  /** Deterministic, human-readable summary, e.g. `width: 320 → 360`. */
  summary: z.string(),
});
export type PropertyChange = z.infer<typeof PropertyChangeSchema>;

export const NodeChangeSchema = z.object({
  trackingId: z.string(),
  nodeId: z.string().optional(),
  nodeName: z.string(),
  nodeType: z.string(),
  kind: ChangeKindSchema,
  propertyChanges: z.array(PropertyChangeSchema),
  impact: ImpactSchema,
});
export type NodeChange = z.infer<typeof NodeChangeSchema>;

export const ChangeSetSchema = z.object({
  baselineSnapshotId: z.string(),
  currentSnapshotId: z.string(),
  scopeId: z.string(),
  scopeName: z.string(),
  generatedAt: z.string(),
  added: z.array(NodeChangeSchema),
  removed: z.array(NodeChangeSchema),
  modified: z.array(NodeChangeSchema),
  unchangedCount: z.number(),
});
export type ChangeSet = z.infer<typeof ChangeSetSchema>;

// --- Storage keys ------------------------------------------------------------

export const StorageKeys = {
  snapshot: (scopeId: string): string => `handofflog:snapshot:${scopeId}`,
  releases: (scopeId: string): string => `handofflog:releases:${scopeId}`,
  settings: "handofflog:settings",
} as const;

/**
 * Parse & validate an unknown value into a Snapshot. Throws on invalid data —
 * callers that hold an existing baseline must NOT delete it on a parse failure.
 */
export function parseSnapshot(value: unknown): Snapshot {
  return SnapshotSchema.parse(value);
}

export function safeParseSnapshot(
  value: unknown
): z.SafeParseReturnType<unknown, Snapshot> {
  return SnapshotSchema.safeParse(value);
}
