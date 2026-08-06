/**
 * Release data model (E-01). A Release packages the user-selected changes from a
 * scan into a shareable, versioned changelog entry. Mirrors RELEASE_MODEL.md;
 * MVP status set is Draft/Published/Archived. Stored under
 * `handofflog:releases:<scopeId>` (DATA_SCHEMA).
 */
import { z } from "zod";
import { ImpactSchema, NodeChangeSchema } from "./schema";

export const RELEASE_SCHEMA_VERSION = 1 as const;

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
