import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUserId } from "@/server/session";
import { PrismaRepository } from "@/server/repository.prisma";
import { acknowledgeRelease, acknowledgementRate } from "@backend/services";

const AckBody = z.object({ workspaceId: z.string() });

// POST /api/releases/:id/ack — developer marks a release reviewed.
export async function POST(req: NextRequest, ctx: { params: { id: string } }): Promise<NextResponse> {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const parsed = AckBody.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  const repo = new PrismaRepository();
  try {
    const ack = await acknowledgeRelease(repo, { userId }, {
      workspaceId: parsed.data.workspaceId,
      releaseId: ctx.params.id,
      id: crypto.randomUUID(),
      now: new Date().toISOString(),
    });
    return NextResponse.json({ ack });
  } catch {
    return NextResponse.json({ error: "ack_failed" }, { status: 403 });
  }
}

// GET /api/releases/:id/ack?workspaceId= — acknowledgement rate for the release.
export async function GET(req: NextRequest, ctx: { params: { id: string } }): Promise<NextResponse> {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const workspaceId = new URL(req.url).searchParams.get("workspaceId");
  if (!workspaceId) return NextResponse.json({ error: "workspaceId_required" }, { status: 400 });

  const repo = new PrismaRepository();
  try {
    const rate = await acknowledgementRate(repo, { userId }, workspaceId, ctx.params.id);
    return NextResponse.json(rate);
  } catch {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
}
