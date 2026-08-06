/**
 * Scope-size and snapshot-size thresholds (NFR §2, §3). Pure and testable; the
 * plugin main thread consumes these to warn or block before doing heavy work,
 * so the limits live here rather than being buried in Figma-dependent code.
 */
import type { Snapshot } from "../shared/schema";
import { stableStringify } from "./serialize";

/** Above this node count the UI warns but proceeds. */
export const SCOPE_SOFT_LIMIT = 2000;
/** Above this node count a scope is refused (SCOPE_TOO_LARGE). */
export const SCOPE_HARD_LIMIT = 10000;

/** Snapshot byte-size warn / hard thresholds. */
export const SNAPSHOT_SIZE_WARN_BYTES = 1_000_000;
export const SNAPSHOT_SIZE_HARD_BYTES = 3_000_000;

export type SizeVerdict = "ok" | "warn" | "too-large";

export function evaluateScopeSize(nodeCount: number): SizeVerdict {
  if (nodeCount > SCOPE_HARD_LIMIT) return "too-large";
  if (nodeCount > SCOPE_SOFT_LIMIT) return "warn";
  return "ok";
}

export function evaluateSnapshotBytes(bytes: number): SizeVerdict {
  if (bytes > SNAPSHOT_SIZE_HARD_BYTES) return "too-large";
  if (bytes > SNAPSHOT_SIZE_WARN_BYTES) return "warn";
  return "ok";
}

/** Deterministic byte-size estimate of a snapshot's serialized form. */
export function snapshotByteSize(snapshot: Snapshot): number {
  // stableStringify is canonical; byte length via UTF-8 code-unit count.
  return utf8ByteLength(stableStringify(snapshot));
}

function utf8ByteLength(s: string): number {
  let bytes = 0;
  for (let i = 0; i < s.length; i++) {
    const code = s.charCodeAt(i);
    if (code < 0x80) bytes += 1;
    else if (code < 0x800) bytes += 2;
    else if (code >= 0xd800 && code <= 0xdbff) {
      bytes += 4; // surrogate pair (counts once here, skip low surrogate)
      i++;
    } else bytes += 3;
  }
  return bytes;
}
