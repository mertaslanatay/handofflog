/**
 * Workspace invites (link + optional email). A raw token is generated once and
 * only its SHA-256 hash is stored; the link is APP_BASE_URL/join?token=<raw>.
 * Accepting adds the user to the workspace. Email delivery is a follow-up (the
 * invite is persisted either way, so it also shows as "pending").
 *
 * Note: `prisma.workspaceInvite` is generated at build time (`prisma generate`
 * runs in the Vercel build). A narrow delegate type lets this compile before the
 * client is regenerated locally.
 */
import { createHash, randomBytes } from "crypto";
import { prisma } from "./db";

type Role = "OWNER" | "MEMBER";

interface InviteRow {
  id: string;
  workspaceId: string;
  email: string | null;
  role: Role;
  tokenHash: string;
  createdById: string;
  createdAt: Date;
  acceptedAt: Date | null;
  acceptedById: string | null;
}

interface InviteDelegate {
  create(args: { data: Record<string, unknown> }): Promise<InviteRow>;
  findMany(args: { where: Record<string, unknown>; orderBy?: Record<string, unknown> }): Promise<InviteRow[]>;
  findUnique(args: { where: Record<string, unknown> }): Promise<InviteRow | null>;
  update(args: { where: Record<string, unknown>; data: Record<string, unknown> }): Promise<InviteRow>;
}

function invites(): InviteDelegate {
  return (prisma as unknown as { workspaceInvite: InviteDelegate }).workspaceInvite;
}

function hashToken(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

export async function createInvite(
  workspaceId: string,
  createdById: string,
  opts?: { email?: string | null; role?: Role }
): Promise<{ id: string; token: string }> {
  const token = randomBytes(24).toString("base64url");
  const inv = await invites().create({
    data: {
      workspaceId,
      createdById,
      email: opts?.email ?? null,
      role: opts?.role ?? "MEMBER",
      tokenHash: hashToken(token),
    },
  });
  return { id: inv.id, token };
}

export interface InviteView {
  id: string;
  email: string | null;
  role: Role;
  createdAt: string;
  acceptedAt: string | null;
}

export async function listInvites(workspaceId: string): Promise<InviteView[]> {
  const rows = await invites().findMany({ where: { workspaceId }, orderBy: { createdAt: "desc" } });
  return rows.map((r) => ({
    id: r.id,
    email: r.email,
    role: r.role,
    createdAt: r.createdAt.toISOString(),
    acceptedAt: r.acceptedAt ? r.acceptedAt.toISOString() : null,
  }));
}

/** Accept an invite: add membership (idempotent) and mark accepted. */
export async function acceptInvite(
  rawToken: string,
  userId: string
): Promise<{ workspaceId: string } | null> {
  const inv = await invites().findUnique({ where: { tokenHash: hashToken(rawToken) } });
  if (!inv) return null;
  const existing = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId: inv.workspaceId, userId } },
  });
  if (!existing) {
    await prisma.workspaceMember.create({
      data: { workspaceId: inv.workspaceId, userId, role: inv.role },
    });
  }
  if (!inv.acceptedAt) {
    await invites().update({ where: { id: inv.id }, data: { acceptedAt: new Date(), acceptedById: userId } });
  }
  return { workspaceId: inv.workspaceId };
}
