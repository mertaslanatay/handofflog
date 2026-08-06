import { describe, it, expect } from "vitest";
import { generateKeyBase64, encryptString, decryptString } from "./crypto";

describe("at-rest encryption (AES-GCM)", () => {
  it("round-trips a secret", async () => {
    const key = generateKeyBase64();
    const secret = "figma-oauth-token-abc123";
    const enc = await encryptString(secret, key);
    expect(enc.ciphertext).not.toContain(secret);
    expect(await decryptString(enc, key)).toBe(secret);
  });

  it("produces a fresh IV each time (non-deterministic ciphertext)", async () => {
    const key = generateKeyBase64();
    const a = await encryptString("same", key);
    const b = await encryptString("same", key);
    expect(a.iv).not.toBe(b.iv);
    expect(a.ciphertext).not.toBe(b.ciphertext);
  });

  it("fails to decrypt with the wrong key", async () => {
    const enc = await encryptString("secret", generateKeyBase64());
    await expect(decryptString(enc, generateKeyBase64())).rejects.toBeTruthy();
  });
});
