import { describe, it, expect } from "vitest";
import { relativeTime, formatDateTime } from "./relative-time";

const NOW = Date.parse("2026-08-10T12:00:00.000Z");
const ago = (ms: number) => new Date(NOW - ms).toISOString();
const MIN = 60_000, HR = 3_600_000, DAY = 86_400_000;

describe("relativeTime", () => {
  it("covers the spec examples and ladder", () => {
    expect(relativeTime(ago(10_000), NOW)).toBe("just now");
    expect(relativeTime(ago(2 * MIN), NOW)).toBe("2 minutes ago");
    expect(relativeTime(ago(2 * HR), NOW)).toBe("2 hours ago");
    expect(relativeTime(ago(26 * HR), NOW)).toBe("Yesterday");
    expect(relativeTime(ago(3 * DAY), NOW)).toBe("3 days ago");
    expect(relativeTime(ago(9 * DAY), NOW)).toBe("Last week");
    expect(relativeTime(ago(20 * DAY), NOW)).toBe("2 weeks ago");
  });
  it("returns input on invalid date", () => {
    expect(relativeTime("nope", NOW)).toBe("nope");
  });
});

describe("formatDateTime", () => {
  it("splits ISO into date + time", () => {
    expect(formatDateTime("2026-08-10T12:34:56.000Z")).toEqual({ date: "2026-08-10", time: "12:34" });
  });
});
