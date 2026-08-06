/**
 * At-rest encryption helpers (I-07). AES-256-GCM via Web Crypto (available in
 * Node 20+ and the browser), so no Node-only dependency. Used to encrypt secrets
 * (e.g. OAuth tokens, Slack webhook URLs) before they touch storage
 * (SECURITY_AND_PRIVACY §3). Keys come from the environment, never hard-coded.
 */
export interface EncryptedPayload {
  /** Base64 IV (12 bytes). */
  iv: string;
  /** Base64 ciphertext (includes GCM auth tag). */
  ciphertext: string;
}

const subtle = globalThis.crypto.subtle;

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}

function base64ToBytes(b64: string): Uint8Array {
  const binary = atob(b64);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}

/** Generate a fresh 256-bit key, base64-encoded (store via env/secret manager). */
export function generateKeyBase64(): string {
  return bytesToBase64(globalThis.crypto.getRandomValues(new Uint8Array(32)));
}

async function importKey(keyBase64: string): Promise<CryptoKey> {
  const raw = base64ToBytes(keyBase64);
  return subtle.importKey("raw", raw as BufferSource, { name: "AES-GCM" }, false, [
    "encrypt",
    "decrypt",
  ]);
}

export async function encryptString(plaintext: string, keyBase64: string): Promise<EncryptedPayload> {
  const key = await importKey(keyBase64);
  const iv = globalThis.crypto.getRandomValues(new Uint8Array(12));
  const data = new TextEncoder().encode(plaintext);
  const cipher = await subtle.encrypt(
    { name: "AES-GCM", iv: iv as BufferSource },
    key,
    data as BufferSource
  );
  return { iv: bytesToBase64(iv), ciphertext: bytesToBase64(new Uint8Array(cipher)) };
}

export async function decryptString(payload: EncryptedPayload, keyBase64: string): Promise<string> {
  const key = await importKey(keyBase64);
  const iv = base64ToBytes(payload.iv);
  const cipher = base64ToBytes(payload.ciphertext);
  const plain = await subtle.decrypt(
    { name: "AES-GCM", iv: iv as BufferSource },
    key,
    cipher as BufferSource
  );
  return new TextDecoder().decode(plain);
}
