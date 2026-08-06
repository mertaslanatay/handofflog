/**
 * Backend business logic (I-05/I-09/I-12/I-13), framework-agnostic and tenant-
 * safe. Next.js route handlers are thin wrappers: parse request → call a service
 * → serialize. Every service asserts workspace access and re-filters results by
 * workspace (defense in depth). Fully unit-tested via InMemoryRepository.
 */
import type { Acknowledgement, PluginToken, ReleaseRecord } from "./domain";
import type { Repository } from "./repository";
import type { Release } from "../shared/release";
import {
  assertRole,
  assertWorkspaceAccess,
  AuthzError,
  canPublish,
  filterByWorkspace,
} from "./authz";
import { hashToken } from "./tokens";

export class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NotFoundError";
  }
}

export interface AuthContext {
  userId: string;
}

export interface PublishInput {
  workspaceId: string;
  projectId: string;
  release: Release;
  id: string;
  now: string;
}

/** Publish a release into a workspace/project (I-09). */
export async function publishRelease(
  repo: Repository,
  ctx: AuthContext,
  input: PublishInput
): Promise<ReleaseRecord> {
  const members = await repo.getMembers(input.workspaceId);
  const role = assertWorkspaceAccess(members, ctx.userId, input.workspaceId);
  assertRole(role, canPublish);

  const project = await repo.getProject(input.projectId);
  if (!project || project.workspaceId !== input.workspaceId) {
    throw new NotFoundError("Project not found in this workspace.");
  }

  const record: ReleaseRecord = {
    id: input.id,
    workspaceId: input.workspaceId,
    projectId: input.projectId,
    publishedById: ctx.userId,
    createdAt: input.now,
    release: input.release,
  };
  await repo.saveReleaseRecord(record);
  return record;
}

/**
 * Publish from the Figma plugin using a connection token (raw token → hash
 * lookup → resolved context). The plugin never sends workspace/project ids.
 */
export async function publishReleaseWithToken(
  repo: Repository,
  rawToken: string,
  input: { release: Release; id: string; now: string }
): Promise<ReleaseRecord> {
  const token = await repo.findPluginTokenByHash(await hashToken(rawToken));
  if (!token || token.revokedAt) {
    throw new AuthzError("NOT_A_MEMBER", "Invalid or revoked plugin token.");
  }
  return publishRelease(repo, { userId: token.userId }, {
    workspaceId: token.workspaceId,
    projectId: token.projectId,
    release: input.release,
    id: input.id,
    now: input.now,
  });
}

/** Mint a connection token for a project; returns the raw token + the record. */
export async function mintPluginToken(
  repo: Repository,
  ctx: AuthContext,
  input: { workspaceId: string; projectId: string; id: string; rawToken: string; now: string }
): Promise<PluginToken> {
  const members = await repo.getMembers(input.workspaceId);
  const role = assertWorkspaceAccess(members, ctx.userId, input.workspaceId);
  assertRole(role, canPublish);

  const project = await repo.getProject(input.projectId);
  if (!project || project.workspaceId !== input.workspaceId) {
    throw new NotFoundError("Project not found in this workspace.");
  }

  const token: PluginToken = {
    id: input.id,
    workspaceId: input.workspaceId,
    projectId: input.projectId,
    userId: ctx.userId,
    tokenHash: await hashToken(input.rawToken),
    createdAt: input.now,
  };
  await repo.savePluginToken(token);
  return token;
}

/** Release timeline for a workspace/project (I-10), tenant-scoped. */
export async function listReleases(
  repo: Repository,
  ctx: AuthContext,
  workspaceId: string,
  projectId?: string
): Promise<ReleaseRecord[]> {
  const members = await repo.getMembers(workspaceId);
  assertWorkspaceAccess(members, ctx.userId, workspaceId);
  const records = await repo.listReleaseRecords(workspaceId, projectId);
  return filterByWorkspace(records, workspaceId);
}

/** Mark a release as reviewed by the current developer (I-12). Idempotent. */
export async function acknowledgeRelease(
  repo: Repository,
  ctx: AuthContext,
  input: { workspaceId: string; releaseId: string; id: string; now: string }
): Promise<Acknowledgement> {
  const members = await repo.getMembers(input.workspaceId);
  assertWorkspaceAccess(members, ctx.userId, input.workspaceId);

  const record = await repo.getReleaseRecord(input.releaseId);
  if (!record || record.workspaceId !== input.workspaceId) {
    throw new NotFoundError("Release not found in this workspace.");
  }

  const existing = (await repo.listAcknowledgements(input.workspaceId, input.releaseId)).find(
    (a) => a.userId === ctx.userId
  );
  if (existing) return existing;

  const ack: Acknowledgement = {
    id: input.id,
    workspaceId: input.workspaceId,
    releaseId: input.releaseId,
    userId: ctx.userId,
    status: "reviewed",
    acknowledgedAt: input.now,
  };
  await repo.saveAcknowledgement(ack);
  return ack;
}

export interface AcknowledgementRate {
  acknowledged: number;
  total: number;
  rate: number;
}

/**
 * Acknowledgement rate for a release (I-13): distinct members who reviewed it
 * over total members. This is the North-Star-adjacent visibility metric.
 */
export async function acknowledgementRate(
  repo: Repository,
  ctx: AuthContext,
  workspaceId: string,
  releaseId: string
): Promise<AcknowledgementRate> {
  const members = await repo.getMembers(workspaceId);
  assertWorkspaceAccess(members, ctx.userId, workspaceId);

  const acks = await repo.listAcknowledgements(workspaceId, releaseId);
  const distinct = new Set(acks.map((a) => a.userId));
  const total = members.length;
  return {
    acknowledged: distinct.size,
    total,
    rate: total === 0 ? 0 : distinct.size / total,
  };
}
