/**
 * The core diff engine entry point.
 *
 * `diffSnapshots(baseline, current)` is a pure function of its two snapshot
 * arguments — it never touches the Figma global, storage, or the DOM, so it is
 * fully unit-testable in a plain node environment. Given identical snapshots it
 * always returns an identical, deterministically-ordered ChangeSet.
 */
import {
  SUPPORTED_PROPERTIES,
  type ChangeSet,
  type NodeChange,
  type NodeProperties,
  type NodeSnapshot,
  type PropertyChange,
  type Snapshot,
  type SupportedProperty,
} from "../shared/schema";
import { stableEquals } from "./serialize";
import { matchNodes } from "./match";
import {
  categoryForPath,
  impactForNodeChange,
  summarize,
} from "./classify";

/** Property-set compared per node (name/type live on the node, not properties). */
const COMPARABLE_PROPERTY_KEYS: readonly SupportedProperty[] = SUPPORTED_PROPERTIES.filter(
  (p): p is SupportedProperty => p !== "name" && p !== "type"
);

/**
 * How to treat child x/y position changes:
 *  - "report": always report (default; fully faithful).
 *  - "suppress": never report x/y-only movement (aggressive noise removal).
 *  - "suppress-on-parent-resize": report x/y unless the node's parent changed
 *    size — i.e. drop the reflow noise that a container resize induces, but keep
 *    intentional repositioning. Recommended once calibrated.
 */
export type PositionNoiseMode = "report" | "suppress" | "suppress-on-parent-resize";

export interface DiffOptions {
  /**
   * When true, a child-order/child-set change on a node is reported as a
   * `children` structural PropertyChange. Defaults to true.
   */
  detectStructural?: boolean;
  /** Child position-noise handling. Defaults to "report". */
  positionNoise?: PositionNoiseMode;
}

export function diffSnapshots(
  baseline: Snapshot,
  current: Snapshot,
  options: DiffOptions = {}
): ChangeSet {
  const detectStructural = options.detectStructural ?? true;
  const positionNoise = options.positionNoise ?? "report";
  const { pairs, removed, added } = matchNodes(baseline, current);

  const addedChanges: NodeChange[] = added.map((node) =>
    wholeNodeChange(node, "added")
  );
  const removedChanges: NodeChange[] = removed.map((node) =>
    wholeNodeChange(node, "removed")
  );

  // Pass 1: collect raw property changes per modified node.
  const rawEntries: Array<{ current: NodeSnapshot; changes: PropertyChange[] }> = [];
  let unchangedCount = 0;

  for (const { baseline: b, current: c } of pairs) {
    // Fast path: equal fingerprints ⇒ no tracked property changed. Structural
    // (child) changes are checked separately because they are excluded from the
    // node hash by design.
    const structuralChanges = detectStructural ? compareChildren(b, c) : [];
    if (b.hash === c.hash && structuralChanges.length === 0) {
      unchangedCount++;
      continue;
    }

    const propertyChanges = comparePropertyMaps(b.properties, c.properties);
    const nameChange = compareName(b, c);
    const typeChange = compareType(b, c);
    const allChanges = [...nameChange, ...typeChange, ...propertyChanges, ...structuralChanges];

    if (allChanges.length === 0) {
      unchangedCount++;
      continue;
    }
    rawEntries.push({ current: c, changes: allChanges });
  }

  // Pass 2: apply position-noise suppression, then assemble modified changes.
  const resizedParents = new Set<string>();
  if (positionNoise === "suppress-on-parent-resize") {
    for (const entry of rawEntries) {
      if (entry.changes.some((ch) => ch.path === "width" || ch.path === "height")) {
        resizedParents.add(entry.current.trackingId);
      }
    }
  }

  const modifiedChanges: NodeChange[] = [];
  for (const entry of rawEntries) {
    const kept =
      positionNoise === "report"
        ? entry.changes
        : entry.changes.filter((ch) => keepPositionChange(ch, entry.current, positionNoise, resizedParents));
    if (kept.length === 0) {
      unchangedCount++;
      continue;
    }
    modifiedChanges.push(toModifiedChange(entry.current, kept));
  }

  return {
    baselineSnapshotId: baseline.id,
    currentSnapshotId: current.id,
    scopeId: current.scopeId,
    scopeName: current.scopeName,
    generatedAt: current.createdAt,
    added: sortChanges(addedChanges),
    removed: sortChanges(removedChanges),
    modified: sortChanges(modifiedChanges),
    unchangedCount,
  };
}

function toModifiedChange(
  node: NodeSnapshot,
  changes: PropertyChange[]
): NodeChange {
  return {
    trackingId: node.trackingId,
    nodeId: node.nodeId,
    nodeName: node.name,
    nodeType: node.type,
    kind: "modified",
    propertyChanges: changes,
    impact: impactForNodeChange("modified", changes),
  };
}

/** Whether an x/y position change survives the configured noise mode. */
function keepPositionChange(
  change: PropertyChange,
  current: NodeSnapshot,
  mode: PositionNoiseMode,
  resizedParents: ReadonlySet<string>
): boolean {
  if (change.path !== "x" && change.path !== "y") return true;
  if (mode === "suppress") return false;
  // "suppress-on-parent-resize": drop x/y only when the parent changed size.
  const parent = current.parentTrackingId;
  return !(parent !== undefined && resizedParents.has(parent));
}

function wholeNodeChange(
  node: NodeSnapshot,
  kind: "added" | "removed"
): NodeChange {
  return {
    trackingId: node.trackingId,
    nodeId: node.nodeId,
    nodeName: node.name,
    nodeType: node.type,
    kind,
    propertyChanges: [],
    impact: impactForNodeChange(kind, []),
  };
}

function compareName(b: NodeSnapshot, c: NodeSnapshot): PropertyChange[] {
  if (b.name === c.name) return [];
  return [makeChange("name", b.name, c.name)];
}

/** A node type change (e.g. instance detach) — structural/breaking. */
function compareType(b: NodeSnapshot, c: NodeSnapshot): PropertyChange[] {
  if (b.type === c.type) return [];
  return [makeChange("type", b.type, c.type)];
}

function comparePropertyMaps(
  before: NodeProperties,
  after: NodeProperties
): PropertyChange[] {
  const changes: PropertyChange[] = [];
  for (const key of COMPARABLE_PROPERTY_KEYS) {
    const prev = (before as Record<string, unknown>)[key];
    const curr = (after as Record<string, unknown>)[key];
    if (prev === undefined && curr === undefined) continue;
    if (!stableEquals(prev, curr)) {
      changes.push(makeChange(key, prev, curr));
    }
  }
  return changes;
}

function compareChildren(b: NodeSnapshot, c: NodeSnapshot): PropertyChange[] {
  if (stableEquals(b.childTrackingIds, c.childTrackingIds)) return [];
  return [makeChange("children", b.childTrackingIds, c.childTrackingIds)];
}

function makeChange(
  path: string,
  previousValue: unknown,
  currentValue: unknown
): PropertyChange {
  return {
    path,
    category: categoryForPath(path),
    previousValue,
    currentValue,
    summary: summarize(path, previousValue, currentValue),
  };
}

/** Deterministic ordering: by node name, then trackingId, then first path. */
function sortChanges(changes: NodeChange[]): NodeChange[] {
  return [...changes].sort((a, b) => {
    if (a.nodeName !== b.nodeName) return a.nodeName < b.nodeName ? -1 : 1;
    if (a.trackingId !== b.trackingId) return a.trackingId < b.trackingId ? -1 : 1;
    const pa = a.propertyChanges[0]?.path ?? "";
    const pb = b.propertyChanges[0]?.path ?? "";
    return pa < pb ? -1 : pa > pb ? 1 : 0;
  });
}
