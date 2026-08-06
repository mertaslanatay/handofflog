import { describe, it, expect } from "vitest";
import { fnv1a, hashNode } from "./hash";
import type { NodeProperties } from "../shared/schema";

describe("fnv1a", () => {
  it("is deterministic", () => {
    expect(fnv1a("handofflog")).toBe(fnv1a("handofflog"));
  });
  it("produces 8-char hex", () => {
    expect(fnv1a("x")).toMatch(/^[0-9a-f]{8}$/);
  });
  it("differs for different input", () => {
    expect(fnv1a("a")).not.toBe(fnv1a("b"));
  });
});

describe("hashNode", () => {
  const props: NodeProperties = { width: 320, height: 100 };

  it("is stable across calls", () => {
    expect(hashNode({ name: "CTA", type: "FRAME", properties: props })).toBe(
      hashNode({ name: "CTA", type: "FRAME", properties: props })
    );
  });
  it("changes when a supported property changes", () => {
    const a = hashNode({ name: "CTA", type: "FRAME", properties: { width: 320 } });
    const b = hashNode({ name: "CTA", type: "FRAME", properties: { width: 360 } });
    expect(a).not.toBe(b);
  });
  it("changes when the name changes", () => {
    const a = hashNode({ name: "Old", type: "FRAME", properties: props });
    const b = hashNode({ name: "New", type: "FRAME", properties: props });
    expect(a).not.toBe(b);
  });
  it("ignores property key ordering", () => {
    const a = hashNode({ name: "CTA", type: "FRAME", properties: { width: 320, height: 100 } });
    const b = hashNode({ name: "CTA", type: "FRAME", properties: { height: 100, width: 320 } });
    expect(a).toBe(b);
  });
});
