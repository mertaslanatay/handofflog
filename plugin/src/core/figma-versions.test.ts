import { describe, it, expect } from "vitest";
import {
  parseVersionsResponse,
  summarizeVersions,
  versionsPath,
  nodesPath,
  normalizeFigmaNode,
  flattenFigmaTree,
  areaChange,
  normalizeNodeId,
  type FigmaNode,
  type FigmaVersion,
} from "./figma-versions";

const v = (id: string, label: string | null): FigmaVersion => ({
  id,
  created_at: "2026-08-01T00:00:00Z",
  label,
  description: null,
  user: { handle: "mert" },
});

describe("figma-versions: paths", () => {
  it("builds the versions path", () => {
    expect(versionsPath("AbC123")).toBe("/v1/files/AbC123/versions");
  });
  it("builds nodes path with ids and version", () => {
    expect(nodesPath("K", ["1:2", "3:4"], "999")).toBe("/v1/files/K/nodes?ids=1%3A2%2C3%3A4&version=999");
  });
  it("omits version when not given", () => {
    expect(nodesPath("K", ["1:2"])).toBe("/v1/files/K/nodes?ids=1%3A2");
  });
});

describe("figma-versions: parse + summarize", () => {
  it("parses versions and next_page", () => {
    const page = parseVersionsResponse({ versions: [v("1", "R1")], pagination: { next_page: "http://x/next" } });
    expect(page.versions).toHaveLength(1);
    expect(page.nextPage).toBe("http://x/next");
  });
  it("is defensive on bad shapes", () => {
    expect(parseVersionsResponse(null)).toEqual({ versions: [], nextPage: null });
    expect(parseVersionsResponse({})).toEqual({ versions: [], nextPage: null });
  });
  it("counts named vs autosave", () => {
    expect(summarizeVersions([v("1", "R1"), v("2", null), v("3", null)])).toEqual({
      total: 3,
      named: 1,
      autosave: 2,
    });
  });
});

describe("figma-versions: normalize", () => {
  it("rounds sub-pixel noise to 3 decimals", () => {
    const n = normalizeFigmaNode({ id: "a", absoluteBoundingBox: { width: 320.00019, height: 48 } });
    expect(n.w).toBe(320);
    expect(n.h).toBe(48);
  });
  it("defaults opacity + visible", () => {
    const n = normalizeFigmaNode({ id: "a" });
    expect(n.opacity).toBe(1);
    expect(n.visible).toBe(true);
  });
});

const tree = (over: Partial<FigmaNode> = {}): FigmaNode => ({
  id: "root",
  name: "Card",
  type: "FRAME",
  absoluteBoundingBox: { width: 320, height: 120 },
  children: [
    { id: "t", name: "Title", type: "TEXT", characters: "Hello" },
    { id: "b", name: "Button", type: "FRAME", absoluteBoundingBox: { width: 100, height: 40 } },
  ],
  ...over,
});

describe("figma-versions: diff + areaChange", () => {
  it("flattens by node id", () => {
    expect(flattenFigmaTree(tree()).size).toBe(3);
  });

  it("reports unchanged area", () => {
    const res = areaChange("root", tree(), tree());
    expect(res.changed).toBe(false);
    expect(res.nodeCount).toBe(3);
    expect(res.diff.modified).toHaveLength(0);
  });

  it("detects a modified property with the changed field name", () => {
    const before = tree();
    const after = tree({
      children: [
        { id: "t", name: "Title", type: "TEXT", characters: "Pay now" },
        { id: "b", name: "Button", type: "FRAME", absoluteBoundingBox: { width: 100, height: 40 } },
      ],
    });
    const res = areaChange("root", before, after);
    expect(res.changed).toBe(true);
    expect(res.diff.modified.map((m) => m.id)).toContain("t");
    const t = res.diff.modified.find((m) => m.id === "t");
    expect(t?.fields).toContain("characters");
  });

  it("detects added and removed nodes", () => {
    const before = tree();
    const after = tree({
      children: [
        { id: "t", name: "Title", type: "TEXT", characters: "Hello" },
        { id: "c", name: "Badge", type: "FRAME" },
      ],
    });
    const { diff } = areaChange("root", before, after);
    expect(diff.added.map((n) => n.id)).toContain("c");
    expect(diff.removed.map((n) => n.id)).toContain("b");
  });

  it("handles a node absent in one version", () => {
    const res = areaChange("root", null, tree());
    expect(res.changed).toBe(true);
    expect(res.diff.added).toHaveLength(3);
  });
});

describe("figma-versions: normalizeNodeId", () => {
  it("extracts + colonizes from a full Figma URL", () => {
    expect(
      normalizeNodeId("https://www.figma.com/design/K/Name?node-id=917-19497&t=mIK6-1")
    ).toBe("917:19497");
  });
  it("converts the dash form", () => {
    expect(normalizeNodeId("917-19497")).toBe("917:19497");
  });
  it("keeps the colon form and trims whitespace", () => {
    expect(normalizeNodeId("  917:19497 ")).toBe("917:19497");
  });
});
