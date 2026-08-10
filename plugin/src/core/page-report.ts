/**
 * Screen/page-level change aggregation (Feature 4 & 5). Pure: given the flat
 * change list and a resolver that maps each change to its screen (top-level
 * frame/artboard) or page, produce per-screen changelogs with counts. Only
 * screens WITH changes are returned (empty screens are excluded per spec).
 */
import type { NodeChange } from "../shared/schema";

export interface ScreenChangelog {
  screen: string;
  count: number;
  changes: NodeChange[];
}

/** Default: use the change's own screenName (set by the diff engine). */
const defaultScreenOf = (change: NodeChange): string => change.screenName ?? "—";

export function summarizeByScreen(
  changeSet: { added: NodeChange[]; modified: NodeChange[]; removed: NodeChange[] },
  screenOf: (change: NodeChange) => string = defaultScreenOf
): ScreenChangelog[] {
  const all = [...changeSet.added, ...changeSet.modified, ...changeSet.removed];
  const byScreen = new Map<string, NodeChange[]>();

  for (const change of all) {
    const screen = screenOf(change);
    const list = byScreen.get(screen);
    if (list) list.push(change);
    else byScreen.set(screen, [change]);
  }

  return [...byScreen.entries()]
    .map(([screen, changes]) => ({ screen, count: changes.length, changes }))
    .filter((s) => s.count > 0)
    .sort((a, b) => (b.count - a.count) || (a.screen < b.screen ? -1 : 1));
}

/** Short human summary lines for a screen (Feature 5 changelog bullets). */
export function screenChangelogLines(entry: ScreenChangelog, max = 8): string[] {
  return entry.changes.slice(0, max).map((c) => {
    if (c.kind === "added") return `${c.nodeName} added`;
    if (c.kind === "removed") return `${c.nodeName} removed`;
    const first = c.propertyChanges[0];
    return first ? `${c.nodeName}: ${first.path} changed` : `${c.nodeName} updated`;
  });
}
