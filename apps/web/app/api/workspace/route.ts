import { NextResponse } from "next/server";
import { getSessionUserId, clearSession } from "@/server/session";
import { primaryWorkspaceId } from "@/server/onboarding";
import { PrismaRepository } from "@/server/repository.prisma";
import { deleteWorkspace } from "@backend/services";
import { AuthzError } from "@backend/authz";

// DELETE /api/workspace — owner deletes their workspace and all data (I-15).
export async function DELETE(): Promise<NextResponse> {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const workspaceId = await primaryWorkspaceId(userId);
  if (!workspaceId) return NextResponse.json({ error: "no_workspace" }, { status: 400 });

  const repo = new PrismaRepository();
  try {
    await deleteWorkspace(repo, { userId }, workspaceId);
    clearSession();
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: "delete_failed" }, { status: err instanceof AuthzError ? 403 : 400 });
  }
}
