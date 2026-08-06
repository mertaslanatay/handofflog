/**
 * Phase 2 backend domain model (PHASE_02_PRIVATE_TEAM_APP).
 *
 * Pure Zod schemas — no DB, no network, no framework. Figma-independent and
 * fully unit-testable. This lives in-repo for now (reuses the installed test
 * runner + zod); it moves to `apps/web` when the monorepo split lands (TD-009).
 * Storage minimization (SECURITY_AND_PRIVACY): a ReleaseRecord references the
 * already-normalized Release; no raw document binaries are stored.
 */
import { z } from "zod";
import { ReleaseSchema } from "../shared/release";

export const WorkspaceRoleSchema = z.enum(["owner", "member"]);
export type WorkspaceRole = z.infer<typeof WorkspaceRoleSchema>;

export const UserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  displayName: z.string().optional(),
});
export type User = z.infer<typeof UserSchema>;

export const WorkspaceSchema = z.object({
  id: z.string(),
  name: z.string(),
  ownerId: z.string(),
  createdAt: z.string(),
});
export type Workspace = z.infer<typeof WorkspaceSchema>;

export const WorkspaceMemberSchema = z.object({
  workspaceId: z.string(),
  userId: z.string(),
  role: WorkspaceRoleSchema,
});
export type WorkspaceMember = z.infer<typeof WorkspaceMemberSchema>;

export const ProjectSchema = z.object({
  id: z.string(),
  workspaceId: z.string(),
  name: z.string(),
  figmaFileKey: z.string().optional(),
  createdAt: z.string(),
});
export type Project = z.infer<typeof ProjectSchema>;

export const ReleaseRecordSchema = z.object({
  id: z.string(),
  workspaceId: z.string(),
  projectId: z.string(),
  publishedById: z.string(),
  createdAt: z.string(),
  release: ReleaseSchema,
});
export type ReleaseRecord = z.infer<typeof ReleaseRecordSchema>;

export const AcknowledgementSchema = z.object({
  id: z.string(),
  workspaceId: z.string(),
  releaseId: z.string(),
  userId: z.string(),
  status: z.literal("reviewed"),
  acknowledgedAt: z.string(),
});
export type Acknowledgement = z.infer<typeof AcknowledgementSchema>;

export const PluginTokenSchema = z.object({
  id: z.string(),
  workspaceId: z.string(),
  projectId: z.string(),
  userId: z.string(),
  /** SHA-256 hex of the raw token; the raw token is never stored. */
  tokenHash: z.string(),
  createdAt: z.string(),
  revokedAt: z.string().optional(),
});
export type PluginToken = z.infer<typeof PluginTokenSchema>;

/** Anything scoped to a workspace, for tenant-isolation helpers. */
export interface WorkspaceScoped {
  workspaceId: string;
}
