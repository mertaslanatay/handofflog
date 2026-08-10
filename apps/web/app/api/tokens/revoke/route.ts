import { NextResponse } from "next/server";
import { getSessionUserId } from "@/server/session";
import { primaryWorkspaceId } from "@/server/onboarding";
import { PrismaRepository } from "@/server/repository.prisma";
import { revokePluginTokens } from "@backend/services";
import { AuthzError } from "@backend/authz";

// POST /api/tokens/revoke — invalidate all connection tokens for the workspace.
export async function POST(): Promise<NextResponse> {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const workspaceId = await primaryWorkspaceId(userId);
  if (!workspaceId) return NextResponse.json({ error: "no_workspace" }, { status: 400 });

  const repo = new PrismaRepository();
  try {
    await revokePluginTokens(repo, { userId }, workspaceId, new Date().toISOString());
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: "revoke_failed" }, { status: err instanceof AuthzError ? 403 : 400 });
  }
}
