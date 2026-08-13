import { NextRequest, NextResponse } from "next/server";
import { exchangeAndFetchProfile } from "@/server/figma-auth";
import { createSession, readOAuthState } from "@/server/session";
import { storeFigmaToken } from "@/server/figma-token";
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
    const { profile, accessToken } = await exchangeAndFetchProfile(code);
    const { userId } = await ensureUserAndWorkspace(profile);
    await createSession(userId);
    await storeFigmaToken(accessToken);
    return NextResponse.redirect(new URL("/releases", req.url));
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("oauth_callback_error", err);
    const reason = err instanceof Error ? err.message : "unknown";
    return NextResponse.redirect(
      new URL(`/?error=oauth_failed&reason=${encodeURIComponent(reason)}`, req.url)
    );
  }
}
