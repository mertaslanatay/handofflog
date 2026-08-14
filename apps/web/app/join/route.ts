import { NextRequest, NextResponse } from "next/server";
import { getSessionUserId } from "@/server/session";
import { acceptInvite } from "@/server/invites";

export const dynamic = "force-dynamic";

// GET /join?token=... — accept a workspace invite. If not logged in, stash the
// token and send through Figma OAuth; the callback finishes the accept.
export async function GET(req: NextRequest): Promise<NextResponse> {
  const token = new URL(req.url).searchParams.get("token");
  if (!token) return NextResponse.redirect(new URL("/", req.url));

  const userId = await getSessionUserId();
  if (!userId) {
    const res = NextResponse.redirect(new URL("/api/auth/figma", req.url));
    res.cookies.set("hl_invite", token, { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 600 });
    return res;
  }
  const joined = await acceptInvite(token, userId);
  return NextResponse.redirect(new URL(joined ? "/releases" : "/?error=invite_invalid", req.url));
}
