import { describe, it, expect } from "vitest";
import { generatePluginToken, hashToken } from "./tokens";

describe("plugin tokens", () => {
  it("generates distinct url-safe tokens", () => {
    const a = generatePluginToken();
    const b = generatePluginToken();
    expect(a).not.toBe(b);
    expect(a).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it("hashes deterministically and irreversibly", async () => {
    const t = generatePluginToken();
    const h1 = await hashToken(t);
    const h2 = await hashToken(t);
    expect(h1).toBe(h2);
    expect(h1).toMatch(/^[0-9a-f]{64}$/);
    expect(h1).not.toContain(t);
  });
});
