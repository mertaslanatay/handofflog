/**
 * Deterministic, non-cryptographic hashing for node fingerprints.
 *
 * The diff engine only needs a fast, stable digest to short-circuit unchanged
 * nodes — not cryptographic strength. A 32-bit FNV-1a over the canonical
 * `stableStringify` output satisfies the spec ("hızlı deterministik hash").
 */
import type { NodeProperties } from "../shared/schema";
import { stableStringify } from "./serialize";

/** FNV-1a 32-bit hash → 8-char zero-padded hex string. */
export function fnv1a(input: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    // hash *= 16777619, kept in 32-bit range via Math.imul.
    hash = Math.imul(hash, 0x01000193);
  }
  // Coerce to unsigned 32-bit then hex.
  return (hash >>> 0).toString(16).padStart(8, "0");
}

/**
 * Fingerprint of a single node from its *supported* properties only.
 *
 * Child tracking IDs are deliberately excluded so that structural changes are
 * detected separately (see DIFF_ENGINE_SPEC "Hash"). Name and type are included
 * because a rename/retype is a tracked property change.
 */
export function hashNode(input: {
  name: string;
  type: string;
  properties: NodeProperties;
}): string {
  const canonical = stableStringify({
    name: input.name,
    type: input.type,
    properties: input.properties,
  });
  return fnv1a(canonical);
}
