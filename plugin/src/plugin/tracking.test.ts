import { describe, it, expect } from "vitest";
import { resolveTrackingId, readTrackingId } from "./tracking";

/** Minimal SceneNode stand-in that records plugin-data writes. */
function fakeNode(id: string, initial?: string) {
  const store: Record<string, string> = {};
  if (initial !== undefined) store["handofflog:tid"] = initial;
  let writes = 0;
  const node = {
    id,
    getPluginData: (key: string): string => store[key] ?? "",
    setPluginData: (key: string, value: string): void => {
      writes++;
      store[key] = value;
    },
    get writes() {
      return writes;
    },
  };
  return node as unknown as SceneNode & { writes: number };
}

describe("resolveTrackingId persistence (page-scan performance)", () => {
  it("persist=false derives a stable id from node.id WITHOUT writing plugin data", () => {
    const node = fakeNode("1:23") as SceneNode & { writes: number };
    const id = resolveTrackingId(node, false);
    expect(id).toBe("tid_1_23");
    expect(node.writes).toBe(0); // the key performance guarantee for page scans
  });

  it("persist=true writes the id once so it survives rename/re-parenting", () => {
    const node = fakeNode("1:23") as SceneNode & { writes: number };
    const id = resolveTrackingId(node, true);
    expect(id).toBe("tid_1_23");
    expect(node.writes).toBe(1);
    expect(readTrackingId(node)).toBe("tid_1_23");
  });

  it("honors a pre-existing persisted id in both modes (no rewrite)", () => {
    const a = fakeNode("1:99", "tid_custom") as SceneNode & { writes: number };
    expect(resolveTrackingId(a, false)).toBe("tid_custom");
    expect(a.writes).toBe(0);

    const b = fakeNode("1:99", "tid_custom") as SceneNode & { writes: number };
    expect(resolveTrackingId(b, true)).toBe("tid_custom");
    expect(b.writes).toBe(0);
  });
});
