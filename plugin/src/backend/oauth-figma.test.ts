import { describe, it, expect } from "vitest";
import { buildAuthorizeUrl, buildTokenExchangeRequest, FIGMA_TOKEN_URL } from "./oauth-figma";

describe("Figma OAuth builders", () => {
  it("builds an authorize URL with state and scopes", () => {
    const url = new URL(buildAuthorizeUrl({ clientId: "cid", redirectUri: "https://app/cb" }, "xyz"));
    expect(url.origin + url.pathname).toBe("https://www.figma.com/oauth");
    expect(url.searchParams.get("client_id")).toBe("cid");
    expect(url.searchParams.get("state")).toBe("xyz");
    expect(url.searchParams.get("response_type")).toBe("code");
    expect(url.searchParams.get("scope")).toBe("file_read");
  });

  it("builds a form-encoded token-exchange request", () => {
    const req = buildTokenExchangeRequest({ clientId: "cid", clientSecret: "sec", redirectUri: "https://app/cb", code: "abc" });
    expect(req.url).toBe(FIGMA_TOKEN_URL);
    expect(req.method).toBe("POST");
    expect(req.headers["content-type"]).toBe("application/x-www-form-urlencoded");
    const body = new URLSearchParams(req.body);
    expect(body.get("grant_type")).toBe("authorization_code");
    expect(body.get("code")).toBe("abc");
  });
});
