/**
 * Pure release helpers (E-07 + build). Figma/DOM-independent so they are fully
 * unit-tested; the plugin main thread calls `buildRelease` to assemble a Release
 * from a ChangeSet and the user's include selection.
 */
import type { ChangeSet, Impact, NodeChange } from "../shared/schema";
import {
  RELEASE_SCHEMA_VERSION,
  type Release,
  type ReleaseType,
} from "../shared/release";
import { excludeFromChangeSet, allTrackingIds } from "./review";

const IMPACT_ORDER: Record<Impact, number> = { low: 0, medium: 1, high: 2, breaking: 3 };

/** Highest impact among a set of changes; "low" when empty. */
export function computeMaxImpact(changes: NodeChange[]): Impact {
  let max: Impact = "low";
  for (const c of changes) {
    if (IMPACT_ORDER[c.impact] > IMPACT_ORDER[max]) max = c.impact;
  }
  return max;
}

/** Suggested (non-binding) release type from max impact (CATEGORY_IMPACT_MAPPING §4). */
export function suggestReleaseType(maxImpact: Impact): ReleaseType {
  switch (maxImpact) {
    case "breaking":
      return "major";
    case "high":
      return "minor";
    case "medium":
      return "minor";
    default:
      return "patch";
  }
}

export interface BuildReleaseInput {
  changeSet: ChangeSet;
  excludedTrackingIds: readonly string[];
  name: string;
  version: string;
  /** Explicit type; when omitted, suggested from impact. */
  type?: ReleaseType;
  description?: string;
  id: string;
  now: string;
  status?: "draft" | "published";
}

/** Assemble a Release from a changeset + include selection (excluded removed). */
export function buildRelease(input: BuildReleaseInput): Release {
  const included = excludeFromChangeSet(input.changeSet, new Set(input.excludedTrackingIds));
  const changes: NodeChange[] = [...included.added, ...included.modified, ...included.removed];
  const impact = computeMaxImpact(changes);
  const status = input.status ?? "published";

  const release: Release = {
    schemaVersion: RELEASE_SCHEMA_VERSION,
    id: input.id,
    scopeId: input.changeSet.scopeId,
    scopeName: input.changeSet.scopeName,
    name: input.name,
    version: input.version,
    type: input.type ?? suggestReleaseType(impact),
    impact,
    status,
    createdAt: input.now,
    baselineSnapshotId: input.changeSet.baselineSnapshotId,
    currentSnapshotId: input.changeSet.currentSnapshotId,
    changes,
  };
  if (input.description !== undefined) release.description = input.description;
  if (status === "published") release.publishedAt = input.now;
  return release;
}

/** Count of "meaningful" changes: included + impact above low (METRICS §5). */
export function meaningfulChangeCount(changeSet: ChangeSet, excludedTrackingIds: readonly string[]): number {
  const included = excludeFromChangeSet(changeSet, new Set(excludedTrackingIds));
  const all = [...included.added, ...included.modified, ...included.removed];
  return all.filter((c) => c.impact !== "low").length;
}

/** Total tracking ids in a changeset (helper re-export for callers). */
export function changeSetTrackingIds(changeSet: ChangeSet): string[] {
  return allTrackingIds(changeSet);
}
