/**
 * Release data model (E-01). A Release packages the user-selected changes from a
 * scan into a shareable, versioned changelog entry. Mirrors RELEASE_MODEL.md;
 * MVP status set is Draft/Published/Archived. Stored under
 * `handofflog:releases:<scopeId>` (DATA_SCHEMA).
 */
import { z } from "zod";
import { HighlightRegionSchema, ImpactSchema, NodeChangeSchema } from "./schema";

export const RELEASE_SCHEMA_VERSION = 1 as const;

// --- Visual diff persistence (Feature 1 / VD-2) ------------------------------

/** A stored screenshot reference. `pathname` is the object-storage key; the web
 *  app streams the bytes through an authenticated proxy (Private Blob). */
export const PersistedScreenshotSchema = z.object({
  pathname: z.string(),
  width: z.number(),
  height: z.number(),
});
export type PersistedScreenshot = z.infer<typeof PersistedScreenshotSchema>;

/** Per-screen visual diff stored on a Release (refs only — never base64). */
export const ReleaseVisualScreenSchema = z.object({
  screen: z.string(),
  regions: z.array(HighlightRegionSchema),
  before: PersistedScreenshotSchema.optional(),
  after: PersistedScreenshotSchema.optional(),
});
export type ReleaseVisualScreen = z.infer<typeof ReleaseVisualScreenSchema>;

/** Wire payload the plugin sends at publish time: raw base64 PNGs the server
 *  uploads to object storage before persisting the release. Kept separate from
 *  the stored Release so base64 never lands in clientStorage or the DB. */
export const VisualUploadSchema = z.object({
  screen: z.string(),
  regions: z.array(HighlightRegionSchema),
  /** base64-encoded PNG bytes (no `data:` prefix); omitted if export failed. */
  afterBase64: z.string().optional(),
  /** base64 "before" image captured at baseline time; enables side-by-side. */
  beforeBase64: z.string().optional(),
  width: z.number(),
  height: z.number(),
  /** Before-image dimensions (may differ from after if the screen was resized). */
  beforeWidth: z.number().optional(),
  beforeHeight: z.number().optional(),
});
export type VisualUpload = z.infer<typeof VisualUploadSchema>;

export const ReleaseTypeSchema = z.enum([
  "patch",
  "minor",
  "major",
  "hotfix",
  "content",
  "design-system",
]);
export type ReleaseType = z.infer<typeof ReleaseTypeSchema>;

export const ReleaseStatusSchema = z.enum(["draft", "published", "archived"]);
export type ReleaseStatus = z.infer<typeof ReleaseStatusSchema>;

/** AI-generated, human-language summary of the diff, grouped per screen. It is a
 *  presentation layer over the deterministic changes (DEC-008) — never a source
 *  of truth. Additive/optional; generated server-side at publish time. */
export const AiScreenSummarySchema = z.object({
  screen: z.string(),
  bullets: z.array(z.string()),
});
export type AiScreenSummary = z.infer<typeof AiScreenSummarySchema>;

export const ReleaseSchema = z.object({
  schemaVersion: z.literal(RELEASE_SCHEMA_VERSION),
  id: z.string(),
  scopeId: z.string(),
  scopeName: z.string(),
  name: z.string(),
  version: z.string(),
  type: ReleaseTypeSchema,
  impact: ImpactSchema,
  description: z.string().optional(),
  status: ReleaseStatusSchema,
  createdAt: z.string(),
  publishedAt: z.string().optional(),
  baselineSnapshotId: z.string(),
  currentSnapshotId: z.string(),
  /** The included changes (excluded ones already removed). */
  changes: z.array(NodeChangeSchema),
  /** Persisted per-screen visual diff (refs only). Populated server-side after
   *  uploading screenshots; absent on plugin-local releases. Additive/optional. */
  visualDiff: z.array(ReleaseVisualScreenSchema).optional(),
  /** Optional AI narration of the changes (DEC-008: narration, not detection). */
  aiSummary: z.array(AiScreenSummarySchema).optional(),
});
export type Release = z.infer<typeof ReleaseSchema>;

/** A scope's release history: newest first. */
export const ReleaseHistorySchema = z.object({
  scopeId: z.string(),
  releases: z.array(ReleaseSchema),
});
export type ReleaseHistory = z.infer<typeof ReleaseHistorySchema>;

export function safeParseReleaseHistory(
  value: unknown
): z.SafeParseReturnType<unknown, ReleaseHistory> {
  return ReleaseHistorySchema.safeParse(value);
}
