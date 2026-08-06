import { describe, it, expect } from "vitest";
import { roundNumber, stableStringify, stableEquals } from "./serialize";

describe("roundNumber", () => {
  it("rounds to fixed precision and collapses -0", () => {
    expect(roundNumber(1.23456)).toBe(1.235);
    expect(roundNumber(-0)).toBe(0);
    expect(roundNumber(0.1 + 0.2)).toBe(0.3);
  });
  it("coerces non-finite values to 0", () => {
    expect(roundNumber(NaN)).toBe(0);
    expect(roundNumber(Infinity)).toBe(0);
  });
});

describe("stableStringify", () => {
  it("sorts object keys deterministically", () => {
    expect(stableStringify({ b: 1, a: 2 })).toBe(stableStringify({ a: 2, b: 1 }));
  });
  it("drops undefined values", () => {
    expect(stableStringify({ a: 1, b: undefined })).toBe(stableStringify({ a: 1 }));
  });
  it("erases floating point noise via rounding", () => {
    expect(stableStringify({ w: 0.1 + 0.2 })).toBe(stableStringify({ w: 0.3 }));
  });
  it("is order-sensitive for arrays", () => {
    expect(stableStringify([1, 2])).not.toBe(stableStringify([2, 1]));
  });
});

describe("stableEquals", () => {
  it("treats key order as irrelevant", () => {
    expect(stableEquals({ x: 1, y: 2 }, { y: 2, x: 1 })).toBe(true);
  });
  it("distinguishes different values", () => {
    expect(stableEquals({ x: 1 }, { x: 2 })).toBe(false);
  });
});
