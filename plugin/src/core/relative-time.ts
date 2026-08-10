/**
 * Human-readable relative time (Feature 2: "2 hours ago", "Yesterday",
 * "Last week"). Pure and deterministic given `nowMs`, so it is unit-testable.
 */
export function relativeTime(iso: string, nowMs: number): string {
  const then = Date.parse(iso);
  if (Number.isNaN(then)) return iso;
  const s = Math.max(0, Math.floor((nowMs - then) / 1000));

  if (s < 45) return "just now";
  const m = Math.floor(s / 60);
  if (m < 1) return "just now";
  if (m === 1) return "1 minute ago";
  if (m < 60) return `${m} minutes ago`;

  const h = Math.floor(m / 60);
  if (h === 1) return "1 hour ago";
  if (h < 24) return `${h} hours ago`;

  const d = Math.floor(h / 24);
  if (d === 1) return "Yesterday";
  if (d < 7) return `${d} days ago`;
  if (d < 14) return "Last week";

  const w = Math.floor(d / 7);
  if (w < 5) return `${w} weeks ago`;

  const mo = Math.floor(d / 30);
  if (mo === 1) return "1 month ago";
  if (mo < 12) return `${mo} months ago`;

  const y = Math.floor(d / 365);
  return y === 1 ? "1 year ago" : `${y} years ago`;
}

/** Split an ISO timestamp into date + time parts for release metadata display. */
export function formatDateTime(iso: string): { date: string; time: string } {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return { date: iso, time: "" };
  return {
    date: d.toISOString().slice(0, 10),
    time: d.toISOString().slice(11, 16),
  };
}
