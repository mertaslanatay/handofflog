import { NextRequest, NextResponse } from "next/server";
import { getSessionUserId } from "@/server/session";
import { primaryWorkspaceId } from "@/server/onboarding";
import { createInvite, listInvites } from "@/server/invites";
import { prisma } from "@/server/db";

export const dynamic = "force-dynamic";

async function ownerWorkspace(userId: string): Promise<string | null> {
  const wsId = await primaryWorkspaceId(userId);
  if (!wsId) return null;
  const m = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId: wsId, userId } },
  });
  return m && m.role === "OWNER" ? wsId : null;
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const wsId = await ownerWorkspace(userId);
  if (!wsId) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  let email: string | undefined;
  try {
    const b = (await req.json()) as { email?: unknown };
    if (typeof b.email === "string" && b.email.trim()) email = b.email.trim();
  } catch {
    // empty body → link invite
  }
  const { token } = await createInvite(wsId, userId, { email });
  return NextResponse.json({ token });
}

export async function GET(): Promise<NextResponse> {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const wsId = await primaryWorkspaceId(userId);
  if (!wsId) return NextResponse.json({ invites: [] });
  return NextResponse.json({ invites: await listInvites(wsId) });
}
