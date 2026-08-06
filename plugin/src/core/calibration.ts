/**
 * Diff calibration harnesses (A-03 false positives, A-04 match accuracy).
 *
 * Pure, Figma-independent. These functions quantify the two properties the
 * product's value depends on, so they can be asserted in tests and reported
 * (A-10). They operate on snapshots — feed them real exports via
 * `loadSnapshotFromFigmaExport` for trustworthy numbers.
 */
import type { Snapshot, NodeSnapshot } from "../shared/schema";
import { diffSnapshots, type DiffOptions } from "./diff";
import { hashNode } from "./hash";
import { roundNumber } from "./serialize";

export interface DiffStats {
  added: number;
  removed: number;
  modified: number;
  unchanged: number;
}

export function diffStats(
  before: Snapshot,
  after: Snapshot,
  options?: DiffOptions
): DiffStats {
  const cs = diffSnapshots(before, after, options);
  return {
    added: cs.added.length,
    removed: cs.removed.length,
    modified: cs.modified.length,
    unchanged: cs.unchangedCount,
  };
}

// --- A-03: false positives ---------------------------------------------------

export interface FalsePositiveResult {
  name: string;
  totalNodes: number;
  falsePositives: number;
  rate: number;
}

/**
 * A false positive is any reported change when nothing meaningful changed. We
 * simulate a re-scan with sub-precision floating-point jitter (the exact noise
 * rounding is meant to erase) and count any resulting changes.
 */
export function measureFalsePositives(
  name: string,
  snapshot: Snapshot,
  epsilon = 0.0004
): FalsePositiveResult {
  const noisy = jitterSnapshot(snapshot, epsilon);
  const cs = diffStats(snapshot, noisy);
  const totalNodes = Object.keys(snapshot.nodes).length;
  const falsePositives = cs.added + cs.removed + cs.modified;
  return {
    name,
    totalNodes,
    falsePositives,
    rate: totalNodes === 0 ? 0 : falsePositives / totalNodes,
  };
}

/**
 * Return a copy of the snapshot with `epsilon` added to every numeric geometry
 * property, re-rounded and re-hashed exactly as a real normalize pass would.
 * Sub-precision epsilon must round away (no changes); supra-precision must not.
 */
export function jitterSnapshot(snapshot: Snapshot, epsilon: number): Snapshot {
  const nodes: Record<string, NodeSnapshot> = {};
  for (const [id, node] of Object.entries(snapshot.nodes)) {
    const p = node.properties;
    const properties = { ...p };
    for (const key of ["x", "y", "width", "height"] as const) {
      const v = p[key];
      if (typeof v === "number") properties[key] = roundNumber(v + epsilon);
    }
    nodes[id] = {
      ...node,
      properties,
      hash: hashNode({ name: node.name, type: node.type, properties }),
    };
  }
  return { ...snapshot, id: `${snapshot.id}-jitter`, nodes };
}

// --- A-04: match accuracy ----------------------------------------------------

export interface MatchAccuracyResult {
  name: string;
  /** Nodes present in both snapshots by nodeId (ground-truth retained set). */
  retained: number;
  /** Retained nodes the matcher wrongly reported as removed. */
  spurious: number;
  accuracy: number;
}

/**
 * Ground truth: a node whose nodeId appears in both snapshots is "retained" and
 * must be matched (never appear as removed). Accuracy = 1 − spurious/retained.
 * Exercises rename/reorder/id-change robustness of the matcher.
 */
export function measureMatchAccuracy(
  name: string,
  before: Snapshot,
  after: Snapshot,
  options?: DiffOptions
): MatchAccuracyResult {
  const beforeIds = new Set(Object.values(before.nodes).map((n) => n.nodeId));
  const afterIds = new Set(Object.values(after.nodes).map((n) => n.nodeId));
  const retained = [...beforeIds].filter((id) => afterIds.has(id));

  const cs = diffSnapshots(before, after, options);
  const removedIds = new Set(cs.removed.map((c) => c.nodeId));
  const spurious = retained.filter((id) => removedIds.has(id)).length;

  return {
    name,
    retained: retained.length,
    spurious,
    accuracy: retained.length === 0 ? 1 : 1 - spurious / retained.length,
  };
}
