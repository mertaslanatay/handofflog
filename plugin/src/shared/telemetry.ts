/**
 * Opt-in telemetry event schema (G-02). METRICS_AND_ANALYTICS §3. Numeric /
 * anonymous only — never document content, names, or tokens. Off by default.
 */
import { z } from "zod";
import { ImpactSchema } from "./schema";

export const TelemetryEventSchema = z.discriminatedUnion("event", [
  z.object({
    event: z.literal("baseline_created"),
    scopeHash: z.string(),
    nodeCount: z.number(),
    durationMs: z.number(),
    schemaVersion: z.number(),
  }),
  z.object({
    event: z.literal("scan_completed"),
    scopeHash: z.string(),
    added: z.number(),
    removed: z.number(),
    modified: z.number(),
    unchanged: z.number(),
    durationMs: z.number(),
  }),
  z.object({
    event: z.literal("release_published"),
    scopeHash: z.string(),
    changeCount: z.number(),
    meaningfulCount: z.number(),
    maxImpact: ImpactSchema,
  }),
  z.object({
    event: z.literal("error"),
    code: z.string(),
  }),
]);
export type TelemetryEvent = z.infer<typeof TelemetryEventSchema>;
