/**
 * Pure review helpers for the changes list: filtering, sorting, search, and
 * exclusion (D-01…D-07). Figma- and DOM-independent so they are unit-tested in
 * node; the React UI is a thin shell over these functions and the plugin reuses
 * `excludeFromChangeSet` to honor the include selection on export.
 */
import type {
  ChangeCategory,
  ChangeSet,
  Impact,
  NodeChange,
} from "../shared/schema";

const IMPACT_ORDER: Record<Impact, number> = { low: 0, medium: 1, high: 2, breaking: 3 };

export interface ReviewFilter {
  categories?: ReadonlySet<ChangeCategory>;
  impacts?: ReadonlySet<Impact>;
  /** Case-insensitive substring match on node name. */
  query?: string;
}

function matchesCategory(change: NodeChange, categories: ReadonlySet<ChangeCategory>): boolean {
  // Added/removed nodes have no property changes; keep them visible.
  if (change.kind !== "modified") return true;
  return change.propertyChanges.some((pc) => categories.has(pc.category));
}

export function filterChanges(changes: NodeChange[], filter: ReviewFilter): NodeChange[] {
  const q = filter.query?.trim().toLowerCase();
  return changes.filter((change) => {
    if (filter.categories && filter.categories.size > 0 && !matchesCategory(change, filter.categories)) {
      return false;
    }
    if (filter.impacts && filter.impacts.size > 0 && !filter.impacts.has(change.impact)) {
      return false;
    }
    if (q && q.length > 0 && !change.nodeName.toLowerCase().includes(q)) {
      return false;
    }
    return true;
  });
}

export function sortByImpact(changes: NodeChange[], direction: "asc" | "desc" = "desc"): NodeChange[] {
  const factor = direction === "desc" ? -1 : 1;
  return [...changes].sort((a, b) => {
    const d = (IMPACT_ORDER[a.impact] - IMPACT_ORDER[b.impact]) * factor;
    if (d !== 0) return d;
    // Stable tiebreak: name then trackingId.
    if (a.nodeName !== b.nodeName) return a.nodeName < b.nodeName ? -1 : 1;
    return a.trackingId < b.trackingId ? -1 : a.trackingId > b.trackingId ? 1 : 0;
  });
}

/** All tracking IDs in a changeset (for bulk select-all). */
export function allTrackingIds(changeSet: ChangeSet): string[] {
  return [...changeSet.added, ...changeSet.modified, ...changeSet.removed].map((c) => c.trackingId);
}

/** Return a changeset with the excluded tracking IDs removed (D-07). */
export function excludeFromChangeSet(
  changeSet: ChangeSet,
  excluded: ReadonlySet<string>
): ChangeSet {
  const keep = (c: NodeChange): boolean => !excluded.has(c.trackingId);
  return {
    ...changeSet,
    added: changeSet.added.filter(keep),
    modified: changeSet.modified.filter(keep),
    removed: changeSet.removed.filter(keep),
  };
}
