import { NextRequest, NextResponse } from "next/server";
import { getSessionUserId } from "@/server/session";
import { readFigmaToken } from "@/server/figma-token";
import { fetchAllVersions, fetchNodeAtVersion } from "@/server/figma-api";
import { primaryContext } from "@/server/onboarding";
import { PrismaRepository } from "@/server/repository.prisma";
import { loadSnapshotFromFigmaExport, diffSnapshots, buildRelease } from "@core/index";
import { publishRelease } from "@backend/services";
import type { ReleaseType } from "@shared/release";

export const dynamic = "force-dynamic";

interface Body {
  fileKey?: string;
  pageId?: string;
  from?: string;
  to?: string;
  name?: string;
  type?: ReleaseType;
  description?: string;
}

// Merge point (DEC-035): turn a version-history page diff into a real Release —
// same engine the plugin uses (loadSnapshotFromFigmaExport → diffSnapshots →
// buildRelease), saved to the web timeline with acknowledgement tracking. No
// plugin, no live scan.
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
  const { fileKey, pageId } = body;
  if (!fileKey || !pageId) return NextResponse.json({ error: "missing_params" }, { status: 400 });

  const ctx = await primaryContext(userId);
  if (!ctx) return NextResponse.json({ error: "no_workspace" }, { status: 400 });

  try {
    const versions = await fetchAllVersions(fileKey, token);
    if (versions.length < 2) {
      return NextResponse.json({ error: "need_two_versions", count: versions.length }, { status: 409 });
    }
    const to = body.to ?? versions[0]!.id;
    let from = body.from;
    if (!from) {
      const named = versions.slice(1).find((v) => v.label);
      from = named?.id ?? versions[1]!.id;
    }

    const [beforeCanvas, afterCanvas] = await Promise.all([
      fetchNodeAtVersion(fileKey, pageId, from, token),
      fetchNodeAtVersion(fileKey, pageId, to, token),
    ]);
    if (!afterCanvas) return NextResponse.json({ error: "page_not_found" }, { status: 404 });

    const beforeSnap = loadSnapshotFromFigmaExport(
      beforeCanvas ?? { id: pageId, name: "page", type: "CANVAS", children: [] },
      { snapshotId: `v_${from}`, scopeId: pageId }
    );
    const afterSnap = loadSnapshotFromFigmaExport(afterCanvas, { snapshotId: `v_${to}`, scopeId: pageId });
    const changeSet = diffSnapshots(beforeSnap, afterSnap, { positionNoise: "suppress-on-parent-resize" });

    const total = changeSet.added.length + changeSet.modified.length + changeSet.removed.length;
    if (total === 0) return NextResponse.json({ error: "no_changes" }, { status: 409 });

    const repo = new PrismaRepository();
    const existing = await repo.listReleaseRecords(ctx.workspaceId, ctx.projectId);
    const now = new Date().toISOString();
    const pageName = afterSnap.scopeName || "Handoff";
    const name = body.name?.trim() || `${pageName} — ${now.slice(0, 10)}`;
    const releaseId = crypto.randomUUID();
    const recordId = crypto.randomUUID();

    const release = buildRelease({
      changeSet,
      excludedTrackingIds: [],
      name,
      version: String(existing.length + 1),
      type: body.type,
      description: body.description?.trim() || undefined,
      id: releaseId,
      now,
      status: "published",
    });

    await publishRelease(repo, { userId }, {
      workspaceId: ctx.workspaceId,
      projectId: ctx.projectId,
      release,
      id: recordId,
      now,
    });

    return NextResponse.json({ id: recordId, changeCount: total, name, version: release.version });
  } catch (e) {
    const status = (e as { status?: number }).status;
    if (status === 403) return NextResponse.json({ error: "figma_forbidden" }, { status: 428 });
    if (status === 404) return NextResponse.json({ error: "file_not_found" }, { status: 404 });
    return NextResponse.json({ error: "figma_error", detail: (e as Error).message }, { status: 502 });
  }
}
