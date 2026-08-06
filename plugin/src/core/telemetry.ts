/**
 * Telemetry emitter (G-03/G-04). Pure and Figma-independent. The emitter is a
 * no-op whenever telemetry is disabled, so with the default-off setting nothing
 * is ever produced. `scopeHash` is a one-way digest used only for grouping.
 */
import type { TelemetryEvent } from "../shared/telemetry";
import { fnv1a } from "./hash";

/** Irreversible scope identifier for telemetry grouping (not user tracking). */
export function scopeHash(scopeId: string): string {
  return fnv1a(scopeId);
}

export interface TelemetryEmitter {
  emit(event: TelemetryEvent): void;
}

/**
 * Create an emitter. `isEnabled()` is checked on every emit so toggling the
 * setting takes effect immediately; when it returns false, `sink` is never called.
 */
export function createTelemetryEmitter(
  isEnabled: () => boolean,
  sink: (event: TelemetryEvent) => void
): TelemetryEmitter {
  return {
    emit(event: TelemetryEvent): void {
      if (!isEnabled()) return;
      sink(event);
    },
  };
}
