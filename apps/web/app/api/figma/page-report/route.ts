import { NextRequest, NextResponse } from "next/server";
import { getSessionUserId } from "@/server/session";
import { readFigmaToken } from "@/server/figma-token";
import { fetchAllVersions, fetchNodeAtVersion } from "@/server/figma-api";
import { buildPageReport } from "@core/figma-versions";

export const dynamic = "force-dynamic";

interface Body {
  fileKey?: string;
  pageId?: string;
  from?: string;
  to?: string;
}

// Automatic per-screen change report for a whole handoff page (Figma page)
// between two versions. Default: from = most recent NAMED version (checkpoint),
// to = latest. No manual node entry — every top-level frame (screen) is scanned,
// including added/removed screens (page-level primitive summary).
export async function POST(req: NextRequest): Promise<NextResponse> {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const token = await readFigmaToken();
  if (!token) return NextResponse.json({ error: "figma_not_connected" }, { status: 428 });

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "bad_json" }, { status: 400 });
  }
  const fileKey = body.fileKey;
  const pageId = body.pageId;
  if (!fileKey || !pageId) return NextResponse.json({ error: "missing_params" }, { status: 400 });

  try {
    let to = body.to;
    let from = body.from;
    if (!to || !from) {
      const versions = await fetchAllVersions(fileKey, token);
      if (versions.length < 2) {
        return NextResponse.json({ error: "need_two_versions", count: versions.length }, { status: 409 });
      }
      to = to ?? versions[0]!.id;
      if (!from) {
        const named = versions.slice(1).find((v) => v.label);
        from = named?.id ?? versions[1]!.id;
      }
    }

    const [beforeCanvas, afterCanvas] = await Promise.all([
      fetchNodeAtVersion(fileKey, pageId, from, token),
      fetchNodeAtVersion(fileKey, pageId, to, token),
    ]);

    const report = buildPageReport(beforeCanvas, afterCanvas);
    return NextResponse.json({ from: { id: from }, to: { id: to }, report });
  } catch (e) {
    const status = (e as { status?: number }).status;
    if (status === 403) return NextResponse.json({ error: "figma_forbidden" }, { status: 428 });
    if (status === 404) return NextResponse.json({ error: "file_not_found" }, { status: 404 });
    if (status === 429) return NextResponse.json({ error: "figma_rate_limited" }, { status: 429 });
    return NextResponse.json({ error: "figma_error", detail: (e as Error).message }, { status: 502 });
  }
}
