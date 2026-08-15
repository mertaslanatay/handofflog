import { NextRequest, NextResponse } from "next/server";
import { getSessionUserId } from "@/server/session";
import { readFigmaToken } from "@/server/figma-token";
import { fetchPages } from "@/server/figma-api";

export const dynamic = "force-dynamic";

// List the Figma pages (left-panel Pages) of a file, for the handoff-page picker.
export async function GET(req: NextRequest): Promise<NextResponse> {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const token = await readFigmaToken();
  if (!token) return NextResponse.json({ error: "figma_not_connected" }, { status: 428 });
  const fileKey = new URL(req.url).searchParams.get("fileKey");
  if (!fileKey) return NextResponse.json({ error: "missing_fileKey" }, { status: 400 });
  try {
    const pages = await fetchPages(fileKey, token);
    return NextResponse.json({ pages });
  } catch (e) {
    const status = (e as { status?: number }).status;
    if (status === 403) return NextResponse.json({ error: "figma_forbidden" }, { status: 428 });
    if (status === 404) return NextResponse.json({ error: "file_not_found" }, { status: 404 });
    if (status === 429) return NextResponse.json({ error: "figma_rate_limited" }, { status: 429 });
    return NextResponse.json({ error: "figma_error", detail: (e as Error).message }, { status: 502 });
  }
}
