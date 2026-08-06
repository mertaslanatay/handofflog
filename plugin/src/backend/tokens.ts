/**
 * Plugin connection tokens. The web app mints a random token bound to a
 * (workspace, project, user); only its SHA-256 hash is stored. The Figma plugin
 * sends the raw token as a Bearer credential; the backend resolves context by
 * hash lookup. Pure (Web Crypto) and testable.
 */
function b64url(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** Generate a fresh opaque token (raw value shown to the user once). */
export function generatePluginToken(): string {
  return b64url(globalThis.crypto.getRandomValues(new Uint8Array(32)));
}

/** SHA-256 hex digest — what we persist and look up by. */
export async function hashToken(token: string): Promise<string> {
  const data = new TextEncoder().encode(token);
  const digest = await globalThis.crypto.subtle.digest("SHA-256", data as BufferSource);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
