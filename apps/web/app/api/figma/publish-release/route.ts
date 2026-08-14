import { NextRequest, NextResponse } from "next/server";
import { getSessionUserId } from "@/server/session";
import { readFigmaToken } from "@/server/figma-token";
import {
  fetchAllVersions,
  fetchNodeAtVersion,
  fetchImages,
  imageUrlToBase64,
} from "@/server/figma-api";
import { primaryContext } from "@/server/onboarding";
import { PrismaRepository } from "@/server/repository.prisma";
import { computeScreenVisuals } from "@/server/visual-figma";
import { groupChangesByScreen } from "@/server/change-grouping";
import { generateAiSummary } from "@/server/ai-summary";
import { uploadVisualScreens } from "@/server/blob";
import { loadSnapshotFromFigmaExport, diffSnapshots, buildRelease } from "@core/index";
import { assembleVisualScreens } from "@backend/visual";
import { publishRelease } from "@backend/services";
import type { Release, ReleaseType, VisualUpload } from "@shared/release";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

interface Body {
  fileKey?: string;
  pageId?: string;
  from?: string;
  to?: string;
  name?: string;
  type?: ReleaseType;
  description?: string;
  visual?: boolean;
  ai?: boolean;
}

const SCREEN_CAP = 8;

// Merge point (DEC-035): turn a version-history page diff into a real Release —
// same engine the plugin uses. Optionally renders before/after screenshots via
// the Figma images API (with `version`) and stores them in Private Blob, so the
// web Release gets a visual diff too (best-effort).
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
    const recordId = crypto.randomUUID();

    const release = buildRelease({
      changeSet,
      excludedTrackingIds: [],
      name,
      version: String(existing.length + 1),
      type: body.type,
      description: body.description?.trim() || undefined,
      id: recordId,
      now,
      status: "published",
    });

    // Visual diff (best-effort): render changed screens before/after, upload.
    let releaseToStore: Release = release;
    if (body.visual !== false) {
      try {
        const visuals = computeScreenVisuals(beforeCanvas, afterCanvas, changeSet).slice(0, SCREEN_CAP);
        const afterIds = visuals.filter((v) => v.afterBox).map((v) => v.screenId);
        const beforeIds = visuals.filter((v) => v.beforeBox).map((v) => v.screenId);
        const [afterImgs, beforeImgs] = await Promise.all([
          afterIds.length ? fetchImages(fileKey, afterIds, to, token) : Promise.resolve({} as Record<string, string | null>),
          beforeIds.length ? fetchImages(fileKey, beforeIds, from, token) : Promise.resolve({} as Record<string, string | null>),
        ]);
        const uploads: VisualUpload[] = [];
        for (const v of visuals) {
          const u: VisualUpload = {
            screen: v.name,
            regions: v.regions,
            width: Math.round(v.afterBox?.width ?? v.beforeBox?.width ?? 0),
            height: Math.round(v.afterBox?.height ?? v.beforeBox?.height ?? 0),
          };
          const aUrl = afterImgs[v.screenId];
          if (aUrl) {
            const b = await imageUrlToBase64(aUrl);
            if (b) u.afterBase64 = b;
          }
          const bUrl = beforeImgs[v.screenId];
          if (bUrl) {
            const b = await imageUrlToBase64(bUrl);
            if (b) {
              u.beforeBase64 = b;
              if (v.beforeBox) {
                u.beforeWidth = Math.round(v.beforeBox.width);
                u.beforeHeight = Math.round(v.beforeBox.height);
              }
            }
          }
          uploads.push(u);
        }
        if (uploads.some((u) => u.afterBase64 || u.beforeBase64)) {
          const uploaded = await uploadVisualScreens(recordId, uploads);
          releaseToStore = { ...release, visualDiff: assembleVisualScreens(uploads, uploaded) };
        }
      } catch {
        // Visual diff failed (e.g. Blob not configured) → publish text-only.
      }
    }

    if (body.ai !== false) {
      try {
        const groups = groupChangesByScreen(beforeCanvas, afterCanvas, changeSet);
        const summary = await generateAiSummary(groups);
        if (summary) releaseToStore = { ...releaseToStore, aiSummary: summary };
      } catch {
        // AI summary unavailable → publish without it.
      }
    }

    await publishRelease(repo, { userId }, {
      workspaceId: ctx.workspaceId,
      projectId: ctx.projectId,
      release: releaseToStore,
      id: recordId,
      now,
    });

    return NextResponse.json({
      id: recordId,
      changeCount: total,
      name,
      version: release.version,
      visualScreens: releaseToStore.visualDiff?.length ?? 0,
    });
  } catch (e) {
    const status = (e as { status?: number }).status;
    if (status === 403) return NextResponse.json({ error: "figma_forbidden" }, { status: 428 });
    if (status === 404) return NextResponse.json({ error: "file_not_found" }, { status: 404 });
    return NextResponse.json({ error: "figma_error", detail: (e as Error).message }, { status: 502 });
  }
}
