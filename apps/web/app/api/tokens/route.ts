import { NextResponse } from "next/server";
import { getSessionUserId } from "@/server/session";
import { primaryWorkspaceId } from "@/server/onboarding";
import { PrismaRepository } from "@/server/repository.prisma";
import { prisma } from "@/server/db";
import { mintPluginToken } from "@backend/services";
import { generatePluginToken } from "@backend/tokens";

// POST /api/tokens — mint a plugin connection token (shown once).
export async function POST(): Promise<NextResponse> {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const workspaceId = await primaryWorkspaceId(userId);
  if (!workspaceId) return NextResponse.json({ error: "no_workspace" }, { status: 400 });
  const project = await prisma.project.findFirst({ where: { workspaceId } });
  if (!project) return NextResponse.json({ error: "no_project" }, { status: 400 });

  const raw = generatePluginToken();
  const repo = new PrismaRepository();
  try {
    await mintPluginToken(repo, { userId }, {
      workspaceId,
      projectId: project.id,
      id: crypto.randomUUID(),
      rawToken: raw,
      now: new Date().toISOString(),
    });
    return NextResponse.json({ token: raw });
  } catch {
    return NextResponse.json({ error: "mint_failed" }, { status: 403 });
  }
}
