/**
 * Deterministic serialization primitives for the diff engine.
 *
 * Pure TypeScript — no Figma, no DOM. The whole engine's determinism rests on
 * this file: identical inputs must always produce byte-identical strings so
 * hashes and equality checks are stable across runs and machines.
 */

/** Decimal places numbers are rounded to before hashing/comparison. */
export const NUMERIC_PRECISION = 3;

/** Round a float to a fixed precision, collapsing -0 to 0 and NaN to 0. */
export function roundNumber(value: number, precision = NUMERIC_PRECISION): number {
  if (!Number.isFinite(value)) return 0;
  const factor = Math.pow(10, precision);
  const rounded = Math.round(value * factor) / factor;
  return rounded === 0 ? 0 : rounded;
}

/**
 * Stable JSON serialization:
 *  - object keys are sorted,
 *  - `undefined` values (and undefined array holes) are dropped,
 *  - numbers are rounded to a fixed precision to erase floating-point noise.
 *
 * The output is not intended to be re-parsed; it is a canonical fingerprint.
 */
export function stableStringify(value: unknown): string {
  if (value === undefined) return "undefined";
  if (value === null) return "null";

  const t = typeof value;
  if (t === "number") return numberToken(value as number);
  if (t === "boolean") return (value as boolean) ? "true" : "false";
  if (t === "string") return JSON.stringify(value);

  if (Array.isArray(value)) {
    const items = value.map((item) =>
      item === undefined ? "null" : stableStringify(item)
    );
    return `[${items.join(",")}]`;
  }

  if (t === "object") {
    const obj = value as Record<string, unknown>;
    const keys = Object.keys(obj)
      .filter((k) => obj[k] !== undefined)
      .sort();
    const entries = keys.map((k) => `${JSON.stringify(k)}:${stableStringify(obj[k])}`);
    return `{${entries.join(",")}}`;
  }

  // Symbols, functions, bigint — should never reach here for normalized data.
  return JSON.stringify(String(value));
}

function numberToken(n: number): string {
  return String(roundNumber(n));
}

/** Canonical equality: two normalized values are equal iff their tokens match. */
export function stableEquals(a: unknown, b: unknown): boolean {
  return stableStringify(a) === stableStringify(b);
}
