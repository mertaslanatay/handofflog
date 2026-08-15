import { NextRequest, NextResponse } from "next/server";
import { getSessionUserId } from "@/server/session";
import { readFigmaToken } from "@/server/figma-token";
import { fetchAllVersions, fetchNodeAtVersion } from "@/server/figma-api";
import { areaChange, normalizeNodeId } from "@core/figma-versions";

export const dynamic = "force-dynamic";

interface Body {
  fileKey?: string;
  nodeIds?: string[];
  from?: string;
  to?: string;
}

// Diff one or more areas (node subtrees) between two versions (default: the two
// most recent). from = older/before, to = newer/after.
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
  const nodeIds = (body.nodeIds ?? []).map((s) => normalizeNodeId(s)).filter(Boolean);
  if (!fileKey || nodeIds.length === 0) {
    return NextResponse.json({ error: "missing_params" }, { status: 400 });
  }

  try {
    const versions = await fetchAllVersions(fileKey, token);
    if (versions.length < 2) {
      return NextResponse.json({ error: "need_two_versions", count: versions.length }, { status: 409 });
    }
    const to = body.to ?? versions[0]!.id;
    const from = body.from ?? versions[1]!.id;

    const results = await Promise.all(
      nodeIds.map(async (nodeId) => {
        const [before, after] = await Promise.all([
          fetchNodeAtVersion(fileKey, nodeId, from, token),
          fetchNodeAtVersion(fileKey, nodeId, to, token),
        ]);
        return areaChange(nodeId, before, after);
      })
    );
    return NextResponse.json({ from, to, results });
  } catch (e) {
    const status = (e as { status?: number }).status;
    if (status === 403) return NextResponse.json({ error: "figma_forbidden" }, { status: 428 });
    if (status === 404) return NextResponse.json({ error: "file_not_found" }, { status: 404 });
    if (status === 429) return NextResponse.json({ error: "figma_rate_limited" }, { status: 429 });
    return NextResponse.json({ error: "figma_error", detail: (e as Error).message }, { status: 502 });
  }
}
