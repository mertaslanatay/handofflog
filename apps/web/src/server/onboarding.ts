/**
 * First-login provisioning: find-or-create the user and ensure they have a
 * workspace + default project. Keeps the MVP flow one-click after OAuth.
 */
import { prisma } from "./db";
import type { FigmaProfile } from "./figma-auth";

export interface UserContext {
  userId: string;
  workspaceId: string;
  projectId: string;
}

export async function ensureUserAndWorkspace(profile: FigmaProfile): Promise<UserContext> {
  const user = await prisma.user.upsert({
    where: { email: profile.email },
    update: { displayName: profile.name ?? undefined },
    create: { email: profile.email, displayName: profile.name ?? null },
  });

  const membership = await prisma.workspaceMember.findFirst({ where: { userId: user.id } });
  if (membership) {
    const project =
      (await prisma.project.findFirst({ where: { workspaceId: membership.workspaceId } })) ??
      (await prisma.project.create({ data: { workspaceId: membership.workspaceId, name: "Default Project" } }));
    return { userId: user.id, workspaceId: membership.workspaceId, projectId: project.id };
  }

  const workspace = await prisma.workspace.create({
    data: { name: `${profile.name ?? "My"} Team`, ownerId: user.id },
  });
  await prisma.workspaceMember.create({
    data: { workspaceId: workspace.id, userId: user.id, role: "OWNER" },
  });
  const project = await prisma.project.create({
    data: { workspaceId: workspace.id, name: "Default Project" },
  });
  return { userId: user.id, workspaceId: workspace.id, projectId: project.id };
}

/** The user's primary (first) workspace, for read views. */
export async function primaryWorkspaceId(userId: string): Promise<string | null> {
  const m = await prisma.workspaceMember.findFirst({ where: { userId } });
  return m?.workspaceId ?? null;
}
