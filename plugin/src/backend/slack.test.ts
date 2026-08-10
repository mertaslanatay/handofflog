import { describe, it, expect } from "vitest";
import { buildSlackMessage, notifySlack, type SlackFetch } from "./slack";
import { buildRelease } from "../core/release";
import type { ChangeSet, NodeChange } from "../shared/schema";

function ch(over: Partial<NodeChange>): NodeChange {
  return { trackingId: "t", nodeName: "N", nodeType: "FRAME", kind: "modified", propertyChanges: [], impact: "low", ...over };
}
const cs: ChangeSet = {
  baselineSnapshotId: "b", currentSnapshotId: "c", scopeId: "s", scopeName: "Checkout",
  generatedAt: "t", added: [], modified: [ch({ impact: "high" })], removed: [], unchangedCount: 0,
};
const release = buildRelease({ changeSet: cs, excludedTrackingIds: [], name: "Checkout", version: "1.2.0", id: "rel", now: "t" });

describe("buildSlackMessage", () => {
  it("includes name/version/impact/count + url, no design content", () => {
    const msg = buildSlackMessage(release, "https://app/releases/rec1");
    expect(msg).toContain("Checkout");
    expect(msg).toContain("v1.2.0");
    expect(msg).toContain("high");
    expect(msg).toContain("https://app/releases/rec1");
    // No raw property values / characters leaked.
    expect(msg).not.toContain("characters");
  });
});

describe("notifySlack", () => {
  it("posts JSON and returns true on ok", async () => {
    let sent: unknown;
    const fetchFn: SlackFetch = async (_url, init) => { sent = JSON.parse(init.body); return { ok: true, status: 200 }; };
    expect(await notifySlack(fetchFn, "https://hooks/x", "hello")).toBe(true);
    expect((sent as { text: string }).text).toBe("hello");
  });
  it("returns false (never throws) on failure", async () => {
    const fetchFn: SlackFetch = async () => { throw new Error("network"); };
    expect(await notifySlack(fetchFn, "https://hooks/x", "hi")).toBe(false);
  });
});
