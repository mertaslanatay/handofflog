import { NextRequest, NextResponse } from "next/server";
import { exchangeAndFetchProfile } from "@/server/figma-auth";
import { createSession, readOAuthState } from "@/server/session";
import { ensureUserAndWorkspace } from "@/server/onboarding";

// GET /api/auth/figma/callback — OAuth redirect target.
export async function GET(req: NextRequest): Promise<NextResponse> {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const expected = readOAuthState();

  if (!code || !state || !expected || state !== expected) {
    return NextResponse.redirect(new URL("/?error=oauth_state", req.url));
  }

  try {
    const profile = await exchangeAndFetchProfile(code);
    const { userId } = await ensureUserAndWorkspace(profile);
    await createSession(userId);
    return NextResponse.redirect(new URL("/releases", req.url));
  } catch {
    return NextResponse.redirect(new URL("/?error=oauth_failed", req.url));
  }
}
