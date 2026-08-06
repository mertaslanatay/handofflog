import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUserId } from "@/server/session";
import { PrismaRepository } from "@/server/repository.prisma";
import { publishRelease, publishReleaseWithToken, listReleases } from "@backend/services";
import { AuthzError } from "@backend/authz";
import { ReleaseSchema } from "@shared/release";

const SessionPublishBody = z.object({
  workspaceId: z.string(),
  projectId: z.string(),
  release: ReleaseSchema,
});
const TokenPublishBody = z.object({ release: ReleaseSchema });

// POST /api/releases — publish a release.
//  - Figma plugin: `Authorization: Bearer <connection-token>` + { release }.
//  - Web session:  cookie session + { workspaceId, projectId, release }.
export async function POST(req: NextRequest): Promise<NextResponse> {
  const repo = new PrismaRepository();
  const now = new Date().toISOString();
  const auth = req.headers.get("authorization");

  if (auth?.startsWith("Bearer ")) {
    const body = TokenPublishBody.safeParse(await req.json().catch(() => null));
    if (!body.success) return NextResponse.json({ error: "bad_request" }, { status: 400 });
    try {
      const rec = await publishReleaseWithToken(repo, auth.slice(7), {
        release: body.data.release,
        id: crypto.randomUUID(),
        now,
      });
      return NextResponse.json({ release: rec.release });
    } catch (err) {
      return NextResponse.json({ error: "publish_failed" }, { status: err instanceof AuthzError ? 403 : 400 });
    }
  }

  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = SessionPublishBody.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "bad_request" }, { status: 400 });
  try {
    const record = await publishRelease(repo, { userId }, {
      workspaceId: body.data.workspaceId,
      projectId: body.data.projectId,
      release: body.data.release,
      id: crypto.randomUUID(),
      now,
    });
    return NextResponse.json({ release: record.release });
  } catch (err) {
    return NextResponse.json({ error: "publish_failed" }, { status: err instanceof AuthzError ? 403 : 400 });
  }
}

// GET /api/releases?workspaceId=&projectId= — release timeline.
export async function GET(req: NextRequest): Promise<NextResponse> {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const workspaceId = url.searchParams.get("workspaceId");
  if (!workspaceId) return NextResponse.json({ error: "workspaceId_required" }, { status: 400 });
  const projectId = url.searchParams.get("projectId") ?? undefined;

  const repo = new PrismaRepository();
  try {
    const releases = await listReleases(repo, { userId }, workspaceId, projectId);
    return NextResponse.json({ releases });
  } catch {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
}
