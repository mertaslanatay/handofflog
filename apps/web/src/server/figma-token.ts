/**
 * The logged-in user's Figma OAuth access token, needed to read version history
 * (DEC-034). Stored AES-GCM-encrypted (reusing @backend/crypto + ENCRYPTION_KEY_
 * BASE64) in an httpOnly, secure, sameSite=lax cookie — never in plaintext, never
 * in the DB. Cleared on logout / workspace delete.
 */
import { cookies } from "next/headers";
import { encryptString, decryptString } from "@backend/crypto";

const COOKIE = "hl_fig";
const MAX_AGE = 60 * 60 * 24 * 30; // 30 days

function key(): string {
  const k = process.env.ENCRYPTION_KEY_BASE64;
  if (!k) throw new Error("Missing env: ENCRYPTION_KEY_BASE64");
  return k;
}

export async function storeFigmaToken(accessToken: string): Promise<void> {
  const enc = await encryptString(accessToken, key());
  cookies().set(COOKIE, `${enc.iv}.${enc.ciphertext}`, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function readFigmaToken(): Promise<string | null> {
  const raw = cookies().get(COOKIE)?.value;
  if (!raw) return null;
  const dot = raw.indexOf(".");
  if (dot < 0) return null;
  const iv = raw.slice(0, dot);
  const ciphertext = raw.slice(dot + 1);
  try {
    return await decryptString({ iv, ciphertext }, key());
  } catch {
    return null;
  }
}

export function clearFigmaToken(): void {
  cookies().delete(COOKIE);
}
