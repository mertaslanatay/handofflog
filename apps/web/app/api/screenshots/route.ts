import { NextRequest, NextResponse } from "next/server";
import { getSessionUserId } from "@/server/session";
import { PrismaRepository } from "@/server/repository.prisma";
import { readScreenshot, releaseIdFromPath } from "@/server/blob";

export const dynamic = "force-dynamic";

/**
 * GET /api/screenshots?pathname=screenshots/<releaseId>/<file>.png
 *
 * Authenticated proxy for PRIVATE visual-diff images. Verifies the caller is a
 * member of the release's workspace before streaming, so design screenshots are
 * never served to users outside the tenant. Auth is checked right next to the
 * blob read (per Vercel's guidance — no CDN caching of private content).
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const pathname = req.nextUrl.searchParams.get("pathname");
  if (!pathname || !pathname.startsWith("screenshots/")) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const releaseId = releaseIdFromPath(pathname);
  if (!releaseId) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  const repo = new PrismaRepository();
  const record = await repo.getReleaseRecord(releaseId);
  if (!record) return NextResponse.json({ error: "not_found" }, { status: 404 });

  // Tenant isolation: only workspace members may view the screenshot.
  const members = await repo.getMembers(record.workspaceId);
  if (!members.some((m) => m.userId === userId)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const blob = await readScreenshot(pathname);
  if (!blob) return NextResponse.json({ error: "not_found" }, { status: 404 });

  return new NextResponse(blob.stream, {
    headers: {
      "Content-Type": blob.contentType,
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, no-cache",
    },
  });
}
