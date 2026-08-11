import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUserId } from "@/server/session";
import { PrismaRepository } from "@/server/repository.prisma";
import { publishRelease, publishReleaseWithToken, listReleases } from "@backend/services";
import { AuthzError } from "@backend/authz";
import { buildSlackMessage, notifySlack } from "@backend/slack";
import { ReleaseSchema, VisualUploadSchema } from "@shared/release";
import { assembleVisualScreens } from "@backend/visual";
import { uploadVisualScreens } from "@/server/blob";

async function maybeNotifySlack(text: string): Promise<void> {
  const webhook = process.env.SLACK_WEBHOOK_URL;
  if (!webhook) return;
  await notifySlack(
    async (u, init) => {
      const r = await fetch(u, init);
      return { ok: r.ok, status: r.status };
    },
    webhook,
    text
  );
}

// The Figma plugin calls this cross-origin with an Authorization header, which
// triggers a CORS preflight. Allow it (auth is the Bearer token, not cookies).
const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, content-type",
};

export function OPTIONS(): NextResponse {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

const SessionPublishBody = z.object({
  workspaceId: z.string(),
  projectId: z.string(),
  release: ReleaseSchema,
});
const TokenPublishBody = z.object({
  release: ReleaseSchema,
  visualUploads: z.array(VisualUploadSchema).optional(),
});

// POST /api/releases — publish a release.
//  - Figma plugin: `Authorization: Bearer <connection-token>` + { release }.
//  - Web session:  cookie session + { workspaceId, projectId, release }.
export async function POST(req: NextRequest): Promise<NextResponse> {
  const repo = new PrismaRepository();
  const now = new Date().toISOString();
  const auth = req.headers.get("authorization");

  if (auth?.startsWith("Bearer ")) {
    const body = TokenPublishBody.safeParse(await req.json().catch(() => null));
    if (!body.success) {
      return NextResponse.json({ error: "bad_request" }, { status: 400, headers: CORS_HEADERS });
    }
    try {
      const releaseId = crypto.randomUUID();
      let releaseToStore = body.data.release;
      // Upload visual-diff screenshots to Private Blob (best-effort). If the
      // store isn't configured, publish still succeeds without images.
      const uploads = body.data.visualUploads;
      if (uploads && uploads.length > 0) {
        try {
          const uploaded = await uploadVisualScreens(releaseId, uploads);
          releaseToStore = {
            ...releaseToStore,
            visualDiff: assembleVisualScreens(uploads, uploaded),
          };
        } catch {
          // Blob unavailable → keep the release, drop the visual diff.
        }
      }
      const rec = await publishReleaseWithToken(repo, auth.slice(7), {
        release: releaseToStore,
        id: releaseId,
        now,
      });
      await maybeNotifySlack(
        buildSlackMessage(rec.release, `${process.env.APP_BASE_URL ?? ""}/releases/${rec.id}`)
      );
      return NextResponse.json({ release: rec.release }, { headers: CORS_HEADERS });
    } catch (err) {
      return NextResponse.json(
        { error: "publish_failed" },
        { status: err instanceof AuthzError ? 403 : 400, headers: CORS_HEADERS }
      );
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
