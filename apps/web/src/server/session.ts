/**
 * Signed-cookie session (I-03). HMAC-SHA256 over the payload with SESSION_SECRET
 * (Web Crypto). httpOnly + secure + sameSite=lax. No server-side session store
 * needed for MVP.
 */
import { cookies } from "next/headers";

const COOKIE = "hl_session";
const MAX_AGE = 60 * 60 * 24 * 30; // 30 days

function b64url(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function b64urlToBytes(s: string): Uint8Array {
  const pad = s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4);
  const bin = atob(pad);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function sign(payload: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(process.env.SESSION_SECRET ?? ""),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return b64url(new Uint8Array(sig));
}

export async function createSession(userId: string): Promise<void> {
  const payload = b64url(new TextEncoder().encode(JSON.stringify({ userId, iat: Date.now() })));
  const value = `${payload}.${await sign(payload)}`;
  cookies().set(COOKIE, value, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function getSessionUserId(): Promise<string | null> {
  const raw = cookies().get(COOKIE)?.value;
  if (!raw) return null;
  const [payload, sig] = raw.split(".");
  if (!payload || !sig) return null;
  if ((await sign(payload)) !== sig) return null;
  try {
    const data = JSON.parse(new TextDecoder().decode(b64urlToBytes(payload))) as { userId?: string };
    return data.userId ?? null;
  } catch {
    return null;
  }
}

export function clearSession(): void {
  cookies().delete(COOKIE);
}

/** Short-lived cookie carrying the OAuth CSRF state between redirect and callback. */
export function setOAuthState(state: string): void {
  cookies().set("hl_oauth_state", state, { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 600 });
}
export function readOAuthState(): string | undefined {
  return cookies().get("hl_oauth_state")?.value;
}
