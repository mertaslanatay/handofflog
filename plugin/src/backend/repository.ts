/**
 * Persistence abstraction (I-04/I-05). The service layer talks to this interface
 * only, so business logic is DB-agnostic and unit-testable via the in-memory
 * implementation. The Next.js/Prisma adapter (deploy-time) implements the same
 * interface; see apps/web/prisma/schema.prisma for the concrete schema.
 */
import type {
  Acknowledgement,
  PluginToken,
  Project,
  ReleaseRecord,
  Workspace,
  WorkspaceMember,
} from "./domain";

export interface Repository {
  savePluginToken(token: PluginToken): Promise<void>;
  findPluginTokenByHash(tokenHash: string): Promise<PluginToken | undefined>;
  /** Revoke all active plugin tokens for a workspace (e.g. after a leak). */
  revokeTokensForWorkspace(workspaceId: string, now: string): Promise<void>;
  /** Delete a workspace and all of its data (I-15 right-to-deletion). */
  deleteWorkspace(workspaceId: string): Promise<void>;
  addWorkspace(workspace: Workspace): Promise<void>;
  addMember(member: WorkspaceMember): Promise<void>;
  getMembers(workspaceId: string): Promise<WorkspaceMember[]>;
  addProject(project: Project): Promise<void>;
  getProject(projectId: string): Promise<Project | undefined>;
  saveReleaseRecord(record: ReleaseRecord): Promise<void>;
  getReleaseRecord(id: string): Promise<ReleaseRecord | undefined>;
  listReleaseRecords(workspaceId: string, projectId?: string): Promise<ReleaseRecord[]>;
  saveAcknowledgement(ack: Acknowledgement): Promise<void>;
  listAcknowledgements(workspaceId: string, releaseId?: string): Promise<Acknowledgement[]>;
}

/** In-memory Repository for tests and local development. */
export class InMemoryRepository implements Repository {
  private workspaces: Workspace[] = [];
  private members: WorkspaceMember[] = [];
  private projects: Project[] = [];
  private releases: ReleaseRecord[] = [];
  private acks: Acknowledgement[] = [];
  private tokens: PluginToken[] = [];

  async savePluginToken(token: PluginToken): Promise<void> {
    this.tokens.push(token);
  }
  async findPluginTokenByHash(tokenHash: string): Promise<PluginToken | undefined> {
    return this.tokens.find((t) => t.tokenHash === tokenHash);
  }

  async revokeTokensForWorkspace(workspaceId: string, now: string): Promise<void> {
    this.tokens = this.tokens.map((t) =>
      t.workspaceId === workspaceId && !t.revokedAt ? { ...t, revokedAt: now } : t
    );
  }

  async deleteWorkspace(workspaceId: string): Promise<void> {
    this.workspaces = this.workspaces.filter((w) => w.id !== workspaceId);
    this.members = this.members.filter((m) => m.workspaceId !== workspaceId);
    this.projects = this.projects.filter((p) => p.workspaceId !== workspaceId);
    this.releases = this.releases.filter((r) => r.workspaceId !== workspaceId);
    this.acks = this.acks.filter((a) => a.workspaceId !== workspaceId);
    this.tokens = this.tokens.filter((t) => t.workspaceId !== workspaceId);
  }

  async addWorkspace(workspace: Workspace): Promise<void> {
    this.workspaces.push(workspace);
  }
  async addMember(member: WorkspaceMember): Promise<void> {
    this.members.push(member);
  }
  async getMembers(workspaceId: string): Promise<WorkspaceMember[]> {
    return this.members.filter((m) => m.workspaceId === workspaceId);
  }
  async addProject(project: Project): Promise<void> {
    this.projects.push(project);
  }
  async getProject(projectId: string): Promise<Project | undefined> {
    return this.projects.find((p) => p.id === projectId);
  }
  async saveReleaseRecord(record: ReleaseRecord): Promise<void> {
    this.releases.push(record);
  }
  async getReleaseRecord(id: string): Promise<ReleaseRecord | undefined> {
    return this.releases.find((r) => r.id === id);
  }
  async listReleaseRecords(workspaceId: string, projectId?: string): Promise<ReleaseRecord[]> {
    return this.releases
      .filter((r) => r.workspaceId === workspaceId && (projectId ? r.projectId === projectId : true))
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  }
  async saveAcknowledgement(ack: Acknowledgement): Promise<void> {
    this.acks.push(ack);
  }
  async listAcknowledgements(workspaceId: string, releaseId?: string): Promise<Acknowledgement[]> {
    return this.acks.filter(
      (a) => a.workspaceId === workspaceId && (releaseId ? a.releaseId === releaseId : true)
    );
  }
}
