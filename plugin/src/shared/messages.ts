/**
 * Typed message contract between the plugin main thread and the UI iframe.
 *
 * Both directions are validated at runtime with Zod before being acted upon, so
 * a malformed or unexpected message can never crash the other side. This is the
 * ONLY channel the two contexts use to communicate.
 */
import { z } from "zod";
import { ChangeSetSchema, VisualDiffScreenSchema } from "./schema";
import { ReleaseSchema, ReleaseTypeSchema } from "./release";

// --- Payloads ----------------------------------------------------------------

export const SelectionSummarySchema = z.object({
  hasSelection: z.boolean(),
  supported: z.boolean(),
  nodeId: z.string().optional(),
  nodeName: z.string().optional(),
  nodeType: z.string().optional(),
  /** Reason the selection is unsupported, when `supported` is false. */
  reason: z.string().optional(),
});
export type SelectionSummary = z.infer<typeof SelectionSummarySchema>;

export const SnapshotSummarySchema = z.object({
  snapshotId: z.string(),
  scopeId: z.string(),
  scopeName: z.string(),
  nodeCount: z.number(),
  createdAt: z.string(),
  isReplacingBaseline: z.boolean(),
});
export type SnapshotSummary = z.infer<typeof SnapshotSummarySchema>;

export const BaselineInfoSchema = z.object({
  scopeId: z.string(),
  scopeName: z.string(),
  snapshotId: z.string(),
  nodeCount: z.number(),
  createdAt: z.string(),
});
export type BaselineInfo = z.infer<typeof BaselineInfoSchema>;

export const InitPayloadSchema = z.object({
  selection: SelectionSummarySchema,
  /** Baseline for the current selection's scope, if one exists. */
  baseline: BaselineInfoSchema.optional(),
  /** Opt-in telemetry state (default false). */
  telemetryEnabled: z.boolean(),
  /** Whether a backend connection token is stored (plugin↔team app). */
  backendConnected: z.boolean(),
  /** Active Figma file name (Feature 3). Project name isn't exposed by the API. */
  fileName: z.string().optional(),
});
export type InitPayload = z.infer<typeof InitPayloadSchema>;

export const PublishReleaseInputSchema = z.object({
  name: z.string(),
  version: z.string(),
  type: ReleaseTypeSchema.optional(),
  description: z.string().optional(),
  excludedTrackingIds: z.array(z.string()).optional(),
});
export type PublishReleaseInput = z.infer<typeof PublishReleaseInputSchema>;

export const ReleasesLoadedSchema = z.object({ releases: z.array(ReleaseSchema) });
export type ReleasesLoaded = z.infer<typeof ReleasesLoadedSchema>;

export const PluginErrorCodeSchema = z.enum([
  "NO_SELECTION",
  "UNSUPPORTED_SELECTION",
  "SCOPE_TOO_LARGE",
  "BASELINE_NOT_FOUND",
  "BASELINE_CORRUPT",
  "SCHEMA_VERSION_UNSUPPORTED",
  "STORAGE_ERROR",
  "SNAPSHOT_ERROR",
  "FONT_ACCESS_ERROR",
  "EXPORT_EMPTY",
  "UNKNOWN",
]);
export type PluginErrorCode = z.infer<typeof PluginErrorCodeSchema>;

export const PluginErrorSchema = z.object({
  code: PluginErrorCodeSchema,
  message: z.string(),
  recoverable: z.boolean(),
});
export type PluginError = z.infer<typeof PluginErrorSchema>;

export const ScopeModeSchema = z.enum(["selection", "page"]);
export type ScopeMode = z.infer<typeof ScopeModeSchema>;

export const CreateBaselineInputSchema = z.object({
  /** Optional explicit scope name; defaults to the selected node's name. */
  scopeName: z.string().optional(),
  /** "selection" (default) = selected frame; "page" = whole current page. */
  scopeMode: ScopeModeSchema.optional(),
});
export type CreateBaselineInput = z.infer<typeof CreateBaselineInputSchema>;

export const ScanInputSchema = z.object({
  scopeMode: ScopeModeSchema.optional(),
});
export type ScanInput = z.infer<typeof ScanInputSchema>;

export const ExportKindSchema = z.enum(["baseline", "current", "changeset"]);
export type ExportKind = z.infer<typeof ExportKindSchema>;

export const ExportInputSchema = z.object({
  kind: ExportKindSchema,
  /** Tracking IDs the user excluded; changeset export omits them (D-07). */
  excludedTrackingIds: z.array(z.string()).optional(),
});
export type ExportInput = z.infer<typeof ExportInputSchema>;

export const ProgressPhaseSchema = z.enum(["baseline", "scan"]);
export type ProgressPhase = z.infer<typeof ProgressPhaseSchema>;

export const ProgressPayloadSchema = z.object({
  phase: ProgressPhaseSchema,
  processed: z.number(),
  total: z.number().optional(),
});
export type ProgressPayload = z.infer<typeof ProgressPayloadSchema>;

export const SelectNodeInputSchema = z.object({ nodeId: z.string() });
export type SelectNodeInput = z.infer<typeof SelectNodeInputSchema>;

export const ExportReadySchema = z.object({
  kind: ExportKindSchema,
  filename: z.string(),
  json: z.string(),
});
export type ExportReady = z.infer<typeof ExportReadySchema>;

/** Visual diff result: per-screen before/after images + highlight regions.
 *  `partial` is true when some screens were skipped (size/cap) so the UI can
 *  say so instead of implying completeness. */
export const VisualDiffPayloadSchema = z.object({
  screens: z.array(VisualDiffScreenSchema),
  partial: z.boolean().default(false),
});
export type VisualDiffPayload = z.infer<typeof VisualDiffPayloadSchema>;

// --- Plugin main → UI --------------------------------------------------------

export const PluginToUIMessageSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("INIT"), payload: InitPayloadSchema }),
  z.object({ type: z.literal("SELECTION_CHANGED"), payload: SelectionSummarySchema }),
  z.object({ type: z.literal("SNAPSHOT_CREATED"), payload: SnapshotSummarySchema }),
  z.object({ type: z.literal("SCAN_COMPLETED"), payload: ChangeSetSchema }),
  z.object({ type: z.literal("PROGRESS"), payload: ProgressPayloadSchema }),
  z.object({ type: z.literal("RELEASE_PUBLISHED"), payload: ReleaseSchema }),
  z.object({ type: z.literal("RELEASES_LOADED"), payload: ReleasesLoadedSchema }),
  z.object({ type: z.literal("EXPORT_READY"), payload: ExportReadySchema }),
  z.object({ type: z.literal("VISUAL_DIFF"), payload: VisualDiffPayloadSchema }),
  z.object({ type: z.literal("ERROR"), payload: PluginErrorSchema }),
]);
export type PluginToUIMessage = z.infer<typeof PluginToUIMessageSchema>;

// --- UI → Plugin main --------------------------------------------------------

export const UIToPluginMessageSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("GET_INIT") }),
  z.object({ type: z.literal("CREATE_BASELINE"), payload: CreateBaselineInputSchema }),
  z.object({ type: z.literal("SCAN_CHANGES"), payload: ScanInputSchema }),
  z.object({ type: z.literal("CANCEL_SCAN") }),
  z.object({ type: z.literal("GET_VISUAL_DIFF") }),
  z.object({ type: z.literal("SELECT_NODE"), payload: SelectNodeInputSchema }),
  z.object({ type: z.literal("PUBLISH_RELEASE"), payload: PublishReleaseInputSchema }),
  z.object({ type: z.literal("GET_RELEASES") }),
  z.object({ type: z.literal("SET_TELEMETRY"), payload: z.object({ enabled: z.boolean() }) }),
  z.object({ type: z.literal("SET_BACKEND_TOKEN"), payload: z.object({ token: z.string() }) }),
  z.object({ type: z.literal("EXPORT_JSON"), payload: ExportInputSchema }),
  z.object({ type: z.literal("CLOSE_PLUGIN") }),
]);
export type UIToPluginMessage = z.infer<typeof UIToPluginMessageSchema>;

export function parsePluginToUIMessage(value: unknown): PluginToUIMessage {
  return PluginToUIMessageSchema.parse(value);
}

export function safeParseUIToPluginMessage(
  value: unknown
): z.SafeParseReturnType<unknown, UIToPluginMessage> {
  return UIToPluginMessageSchema.safeParse(value);
}
