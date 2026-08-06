import { describe, it, expect } from "vitest";
import {
  PluginToUIMessageSchema,
  UIToPluginMessageSchema,
  PluginErrorCodeSchema,
  safeParseUIToPluginMessage,
} from "./messages";

describe("plugin error codes (C-01)", () => {
  it("includes the extended codes", () => {
    for (const code of [
      "NO_SELECTION",
      "UNSUPPORTED_SELECTION",
      "SCOPE_TOO_LARGE",
      "BASELINE_NOT_FOUND",
      "BASELINE_CORRUPT",
      "SCHEMA_VERSION_UNSUPPORTED",
      "STORAGE_ERROR",
      "SNAPSHOT_ERROR",
      "FONT_ACCESS_ERROR",
      "EXPORT_EMPTY",
      "UNKNOWN",
    ]) {
      expect(PluginErrorCodeSchema.safeParse(code).success).toBe(true);
    }
  });

  it("rejects an unknown code", () => {
    expect(PluginErrorCodeSchema.safeParse("WAT").success).toBe(false);
  });
});

describe("message contract validation", () => {
  it("accepts a well-formed ERROR message with a new code", () => {
    const msg = {
      type: "ERROR",
      payload: { code: "SCOPE_TOO_LARGE", message: "too big", recoverable: true },
    };
    expect(PluginToUIMessageSchema.safeParse(msg).success).toBe(true);
  });

  it("accepts valid UI→plugin messages", () => {
    expect(safeParseUIToPluginMessage({ type: "GET_INIT" }).success).toBe(true);
    expect(safeParseUIToPluginMessage({ type: "CREATE_BASELINE", payload: {} }).success).toBe(true);
    expect(
      safeParseUIToPluginMessage({ type: "EXPORT_JSON", payload: { kind: "changeset" } }).success
    ).toBe(true);
  });

  it("rejects an unknown message type", () => {
    expect(UIToPluginMessageSchema.safeParse({ type: "NOPE" }).success).toBe(false);
  });

  it("accepts Sprint 2 additions (PROGRESS, CANCEL_SCAN, SELECT_NODE, export exclusions)", () => {
    expect(
      PluginToUIMessageSchema.safeParse({ type: "PROGRESS", payload: { phase: "scan", processed: 100, total: 500 } }).success
    ).toBe(true);
    expect(safeParseUIToPluginMessage({ type: "CANCEL_SCAN" }).success).toBe(true);
    expect(safeParseUIToPluginMessage({ type: "SELECT_NODE", payload: { nodeId: "1:2" } }).success).toBe(true);
    expect(
      safeParseUIToPluginMessage({ type: "EXPORT_JSON", payload: { kind: "changeset", excludedTrackingIds: ["a"] } }).success
    ).toBe(true);
  });

  it("accepts Sprint 3 release/telemetry messages", () => {
    expect(
      safeParseUIToPluginMessage({
        type: "PUBLISH_RELEASE",
        payload: { name: "v2", version: "2.0.0", type: "major", excludedTrackingIds: [] },
      }).success
    ).toBe(true);
    expect(safeParseUIToPluginMessage({ type: "GET_RELEASES" }).success).toBe(true);
    expect(safeParseUIToPluginMessage({ type: "SET_TELEMETRY", payload: { enabled: true } }).success).toBe(true);
    expect(
      PluginToUIMessageSchema.safeParse({ type: "RELEASES_LOADED", payload: { releases: [] } }).success
    ).toBe(true);
  });

  it("requires telemetryEnabled + backendConnected in INIT payload", () => {
    const base = { selection: { hasSelection: false, supported: false } };
    expect(PluginToUIMessageSchema.safeParse({ type: "INIT", payload: base }).success).toBe(false);
    expect(
      PluginToUIMessageSchema.safeParse({ type: "INIT", payload: { ...base, telemetryEnabled: false } }).success
    ).toBe(false);
    expect(
      PluginToUIMessageSchema.safeParse({
        type: "INIT",
        payload: { ...base, telemetryEnabled: false, backendConnected: false },
      }).success
    ).toBe(true);
  });
});
