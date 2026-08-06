/**
 * Prisma-backed Repository (I-05). Implements the same interface the tested
 * services use (@backend/repository), so all business logic + tenant isolation
 * is reused unchanged against a live Postgres. Release payloads are stored as
 * JSON and re-validated with Zod on read.
 */
import type { Repository } from "@backend/repository";
import type {
  Acknowledgement,
  PluginToken,
  Project,
  ReleaseRecord,
  Workspace,
  WorkspaceMember,
  WorkspaceRole,
} from "@backend/domain";
import { ReleaseSchema } from "@shared/release";
import { prisma } from "./db";

function toRole(dbRole: "OWNER" | "MEMBER"): WorkspaceRole {
  return dbRole === "OWNER" ? "owner" : "member";
}
function fromRole(role: WorkspaceRole): "OWNER" | "MEMBER" {
  return role === "owner" ? "OWNER" : "MEMBER";
}

export class PrismaRepository implements Repository {
  async savePluginToken(t: PluginToken): Promise<void> {
    await prisma.pluginToken.create({
      data: {
        id: t.id,
        workspaceId: t.workspaceId,
        projectId: t.projectId,
        userId: t.userId,
        tokenHash: t.tokenHash,
        createdAt: new Date(t.createdAt),
      },
    });
  }

  async findPluginTokenByHash(tokenHash: string): Promise<PluginToken | undefined> {
    const t = await prisma.pluginToken.findUnique({ where: { tokenHash } });
    if (!t) return undefined;
    return {
      id: t.id,
      workspaceId: t.workspaceId,
      projectId: t.projectId,
      userId: t.userId,
      tokenHash: t.tokenHash,
      createdAt: t.createdAt.toISOString(),
      revokedAt: t.revokedAt?.toISOString(),
    };
  }

  async addWorkspace(w: Workspace): Promise<void> {
    await prisma.workspace.create({
      data: { id: w.id, name: w.name, ownerId: w.ownerId, createdAt: new Date(w.createdAt) },
    });
  }

  async addMember(m: WorkspaceMember): Promise<void> {
    await prisma.workspaceMember.create({
      data: { workspaceId: m.workspaceId, userId: m.userId, role: fromRole(m.role) },
    });
  }

  async getMembers(workspaceId: string): Promise<WorkspaceMember[]> {
    const rows = await prisma.workspaceMember.findMany({ where: { workspaceId } });
    return rows.map((r) => ({ workspaceId: r.workspaceId, userId: r.userId, role: toRole(r.role) }));
  }

  async addProject(p: Project): Promise<void> {
    await prisma.project.create({
      data: {
        id: p.id,
        workspaceId: p.workspaceId,
        name: p.name,
        figmaFileKey: p.figmaFileKey ?? null,
        createdAt: new Date(p.createdAt),
      },
    });
  }

  async getProject(projectId: string): Promise<Project | undefined> {
    const p = await prisma.project.findUnique({ where: { id: projectId } });
    if (!p) return undefined;
    return {
      id: p.id,
      workspaceId: p.workspaceId,
      name: p.name,
      figmaFileKey: p.figmaFileKey ?? undefined,
      createdAt: p.createdAt.toISOString(),
    };
  }

  async saveReleaseRecord(record: ReleaseRecord): Promise<void> {
    await prisma.releaseRecord.create({
      data: {
        id: record.id,
        workspaceId: record.workspaceId,
        projectId: record.projectId,
        publishedById: record.publishedById,
        createdAt: new Date(record.createdAt),
        release: record.release as unknown as object,
      },
    });
  }

  async getReleaseRecord(id: string): Promise<ReleaseRecord | undefined> {
    const r = await prisma.releaseRecord.findUnique({ where: { id } });
    return r ? this.mapRelease(r) : undefined;
  }

  async listReleaseRecords(workspaceId: string, projectId?: string): Promise<ReleaseRecord[]> {
    const rows = await prisma.releaseRecord.findMany({
      where: { workspaceId, ...(projectId ? { projectId } : {}) },
      orderBy: { createdAt: "desc" },
    });
    return rows.map((r) => this.mapRelease(r));
  }

  async saveAcknowledgement(ack: Acknowledgement): Promise<void> {
    await prisma.acknowledgement.upsert({
      where: { releaseId_userId: { releaseId: ack.releaseId, userId: ack.userId } },
      update: {},
      create: {
        id: ack.id,
        workspaceId: ack.workspaceId,
        releaseId: ack.releaseId,
        userId: ack.userId,
        status: "REVIEWED",
        acknowledgedAt: new Date(ack.acknowledgedAt),
      },
    });
  }

  async listAcknowledgements(workspaceId: string, releaseId?: string): Promise<Acknowledgement[]> {
    const rows = await prisma.acknowledgement.findMany({
      where: { workspaceId, ...(releaseId ? { releaseId } : {}) },
    });
    return rows.map((a) => ({
      id: a.id,
      workspaceId: a.workspaceId,
      releaseId: a.releaseId,
      userId: a.userId,
      status: "reviewed",
      acknowledgedAt: a.acknowledgedAt.toISOString(),
    }));
  }

  private mapRelease(r: {
    id: string;
    workspaceId: string;
    projectId: string;
    publishedById: string;
    createdAt: Date;
    release: unknown;
  }): ReleaseRecord {
    return {
      id: r.id,
      workspaceId: r.workspaceId,
      projectId: r.projectId,
      publishedById: r.publishedById,
      createdAt: r.createdAt.toISOString(),
      release: ReleaseSchema.parse(r.release),
    };
  }
}
