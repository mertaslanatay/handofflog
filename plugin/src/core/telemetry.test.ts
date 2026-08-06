import { describe, it, expect } from "vitest";
import { createTelemetryEmitter, scopeHash } from "./telemetry";
import { TelemetryEventSchema, type TelemetryEvent } from "../shared/telemetry";

describe("scopeHash", () => {
  it("is deterministic and does not reveal the input", () => {
    expect(scopeHash("scope-1")).toBe(scopeHash("scope-1"));
    expect(scopeHash("scope-1")).not.toBe("scope-1");
    expect(scopeHash("a")).not.toBe(scopeHash("b"));
  });
});

describe("createTelemetryEmitter", () => {
  const sample: TelemetryEvent = { event: "error", code: "UNKNOWN" };

  it("emits nothing while disabled (default-off privacy)", () => {
    const seen: TelemetryEvent[] = [];
    const emitter = createTelemetryEmitter(() => false, (e) => seen.push(e));
    emitter.emit(sample);
    expect(seen).toHaveLength(0);
  });

  it("emits schema-valid events while enabled", () => {
    const seen: TelemetryEvent[] = [];
    let enabled = false;
    const emitter = createTelemetryEmitter(() => enabled, (e) => seen.push(e));
    emitter.emit(sample); // still off
    enabled = true;
    emitter.emit({ event: "scan_completed", scopeHash: scopeHash("s"), added: 1, removed: 0, modified: 2, unchanged: 5, durationMs: 12 });
    expect(seen).toHaveLength(1);
    expect(TelemetryEventSchema.safeParse(seen[0]).success).toBe(true);
  });
});
