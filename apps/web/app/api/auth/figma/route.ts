import { NextResponse } from "next/server";
import { loginUrl } from "@/server/figma-auth";
import { setOAuthState } from "@/server/session";

// GET /api/auth/figma — start the Figma OAuth flow.
export async function GET(): Promise<NextResponse> {
  const state = crypto.randomUUID();
  setOAuthState(state);
  return NextResponse.redirect(loginUrl(state));
}
