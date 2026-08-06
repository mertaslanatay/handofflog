import { describe, it, expect } from "vitest";
import { createReleaseApiClient, ApiError, type FetchLike } from "./api-client";
import { buildRelease } from "../core/release";
import type { ChangeSet } from "../shared/schema";

const changeSet: ChangeSet = {
  baselineSnapshotId: "b",
  currentSnapshotId: "c",
  scopeId: "s",
  scopeName: "Checkout",
  generatedAt: "t",
  added: [],
  modified: [],
  removed: [],
  unchangedCount: 0,
};
const release = buildRelease({ changeSet, excludedTrackingIds: [], name: "v1", version: "1.0.0", id: "rel", now: "t" });

describe("release API client", () => {
  it("posts the release with auth header and parses the response", async () => {
    const calls: Array<{ url: string; init?: Parameters<FetchLike>[1] }> = [];
    const fetch: FetchLike = async (url, init) => {
      calls.push({ url, init });
      return { ok: true, status: 200, json: async () => ({ release }) };
    };
    const client = createReleaseApiClient({ baseUrl: "https://api.example.com/", token: "tok", fetch });
    const out = await client.publishRelease(release);

    expect(out.id).toBe("rel");
    const call = calls[0]!;
    expect(call.url).toBe("https://api.example.com/api/releases");
    expect(call.init?.headers?.authorization).toBe("Bearer tok");
    expect(JSON.parse(call.init?.body ?? "{}").release.id).toBe("rel");
  });

  it("throws ApiError on non-2xx", async () => {
    const fetch: FetchLike = async () => ({ ok: false, status: 403, json: async () => ({}) });
    const client = createReleaseApiClient({ baseUrl: "https://api.example.com", token: "t", fetch });
    await expect(client.publishRelease(release)).rejects.toBeInstanceOf(ApiError);
  });

  it("throws on a malformed response", async () => {
    const fetch: FetchLike = async () => ({ ok: true, status: 200, json: async () => ({ nope: true }) });
    const client = createReleaseApiClient({ baseUrl: "https://api.example.com", token: "t", fetch });
    await expect(client.publishRelease(release)).rejects.toBeInstanceOf(ApiError);
  });
});
