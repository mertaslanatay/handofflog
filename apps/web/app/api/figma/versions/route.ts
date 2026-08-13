import { NextRequest, NextResponse } from "next/server";
import { getSessionUserId } from "@/server/session";
import { readFigmaToken } from "@/server/figma-token";
import { fetchAllVersions } from "@/server/figma-api";
import { summarizeVersions } from "@core/figma-versions";

export const dynamic = "force-dynamic";

// Version history for a file (DEC-034). Tenant guard: must be logged in and hold
// a connected Figma token; the token scopes what the user can already see.
export async function GET(req: NextRequest): Promise<NextResponse> {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const token = await readFigmaToken();
  if (!token) return NextResponse.json({ error: "figma_not_connected" }, { status: 428 });

  const fileKey = new URL(req.url).searchParams.get("fileKey");
  if (!fileKey) return NextResponse.json({ error: "missing_fileKey" }, { status: 400 });

  try {
    const versions = await fetchAllVersions(fileKey, token);
    return NextResponse.json({ summary: summarizeVersions(versions), versions });
  } catch (e) {
    const status = (e as { status?: number }).status;
    if (status === 403) return NextResponse.json({ error: "figma_forbidden" }, { status: 428 });
    if (status === 404) return NextResponse.json({ error: "file_not_found" }, { status: 404 });
    return NextResponse.json({ error: "figma_error", detail: (e as Error).message }, { status: 502 });
  }
}
