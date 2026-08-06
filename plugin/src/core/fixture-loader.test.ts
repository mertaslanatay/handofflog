import { describe, it, expect } from "vitest";
import { loadSnapshotFromFigmaExport } from "./fixture-loader";
import { SnapshotSchema } from "../shared/schema";
import { diffSnapshots } from "./diff";
import sampleExport from "./fixtures/sample-figma-export.json";

describe("loadSnapshotFromFigmaExport", () => {
  const snapshot = loadSnapshotFromFigmaExport(sampleExport);

  it("produces a schema-valid snapshot from a real-shaped export", () => {
    expect(SnapshotSchema.safeParse(snapshot).success).toBe(true);
    expect(snapshot.schemaVersion).toBe(1);
  });

  it("captures the full node tree (frame + text + nested button + label)", () => {
    expect(Object.keys(snapshot.nodes)).toHaveLength(4);
    expect(snapshot.scopeName).toBe("Checkout");
    for (const node of Object.values(snapshot.nodes)) {
      expect(node.hash).toMatch(/^[0-9a-f]{8}$/);
    }
  });

  it("maps geometry and auto-layout from the export", () => {
    const frame = snapshot.nodes["10:2"];
    expect(frame?.properties.width).toBe(375);
    expect(frame?.properties.layoutMode).toBe("VERTICAL");
    expect(frame?.properties.paddingLeft).toBe(24);
    expect(frame?.childTrackingIds).toEqual(["10:3", "10:4"]);
  });

  it("maps solid fills and corner radius", () => {
    const button = snapshot.nodes["10:4"];
    expect(button?.properties.cornerRadius).toBe(8);
    expect(button?.properties.fills?.[0]?.type).toBe("SOLID");
    expect(button?.properties.fills?.[0]?.color).toEqual({ r: 0.05, g: 0.6, b: 1 });
  });

  it("maps text: characters, font, and both line-height units", () => {
    const label = snapshot.nodes["10:3"];
    expect(label?.properties.characters).toBe("Continue");
    expect(label?.properties.fontSize).toBe(16);
    expect(label?.properties.fontName).toEqual({ family: "Inter", style: "Semi Bold" });
    expect(label?.properties.lineHeight).toEqual({ unit: "PIXELS", value: 24 });

    const buttonLabel = snapshot.nodes["10:5"];
    expect(buttonLabel?.properties.lineHeight).toEqual({ unit: "PERCENT", value: 140 });
    expect(buttonLabel?.properties.letterSpacing).toEqual({ unit: "PIXELS", value: 0.2 });
  });

  it("is deterministic and diff-clean against itself", () => {
    const again = loadSnapshotFromFigmaExport(sampleExport);
    const result = diffSnapshots(snapshot, again);
    expect(result.added).toHaveLength(0);
    expect(result.removed).toHaveLength(0);
    expect(result.modified).toHaveLength(0);
    expect(result.unchangedCount).toBe(4);
  });

  it("rejects a malformed export loudly", () => {
    expect(() => loadSnapshotFromFigmaExport({ fills: "not-an-array" })).toThrow();
  });

  it("assigns deterministic synthetic ids when a node id is missing", () => {
    const noId = {
      name: "Root",
      type: "FRAME",
      children: [
        { name: "A", type: "TEXT", characters: "x" },
        { name: "B", type: "TEXT", characters: "y" },
      ],
    };
    const a = loadSnapshotFromFigmaExport(noId);
    const b = loadSnapshotFromFigmaExport(noId);
    expect(Object.keys(a.nodes)).toEqual(Object.keys(b.nodes));
    expect(Object.keys(a.nodes)).toContain("synthetic:0");
    expect(Object.keys(a.nodes)).toHaveLength(3);
  });

  it("throws on duplicate node ids instead of silently overwriting", () => {
    const dup = {
      id: "1:1",
      name: "Root",
      type: "FRAME",
      children: [
        { id: "1:2", name: "A", type: "TEXT", characters: "x" },
        { id: "1:2", name: "B", type: "TEXT", characters: "y" },
      ],
    };
    expect(() => loadSnapshotFromFigmaExport(dup)).toThrow(/Duplicate node id/);
  });
});
