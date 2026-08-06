/**
 * Node matching between a baseline and a current snapshot.
 *
 * Matching precedence (DIFF_ENGINE_SPEC "Node matching"):
 *   1. trackingId
 *   2. nodeId
 *   3. parentTrackingId + type + name  (structural signature)
 *
 * Component-key matching is intentionally deferred past the Phase 01 property
 * set. Iteration order is sorted so results are fully deterministic.
 */
import type { NodeSnapshot, Snapshot } from "../shared/schema";

export interface NodePair {
  baseline: NodeSnapshot;
  current: NodeSnapshot;
}

export interface MatchResult {
  pairs: NodePair[];
  removed: NodeSnapshot[];
  added: NodeSnapshot[];
}

function signature(node: NodeSnapshot): string {
  return `${node.parentTrackingId ?? "∅"}::${node.type}::${node.name}`;
}

/** Push a value into a Map of arrays. */
function index<K>(map: Map<K, string[]>, key: K, trackingId: string): void {
  const existing = map.get(key);
  if (existing) existing.push(trackingId);
  else map.set(key, [trackingId]);
}

function takeFirstUnused(
  candidates: string[] | undefined,
  used: Set<string>
): string | undefined {
  if (!candidates) return undefined;
  for (const id of [...candidates].sort()) {
    if (!used.has(id)) return id;
  }
  return undefined;
}

export function matchNodes(baseline: Snapshot, current: Snapshot): MatchResult {
  const currentNodes = current.nodes;
  const byNodeId = new Map<string, string[]>();
  const byComponentKey = new Map<string, string[]>();
  const bySignature = new Map<string, string[]>();

  for (const trackingId of Object.keys(currentNodes).sort()) {
    const node = currentNodes[trackingId];
    if (!node) continue;
    index(byNodeId, node.nodeId, trackingId);
    if (node.componentKey !== undefined) index(byComponentKey, node.componentKey, trackingId);
    index(bySignature, signature(node), trackingId);
  }

  const usedCurrent = new Set<string>();
  const pairs: NodePair[] = [];
  const removed: NodeSnapshot[] = [];

  for (const trackingId of Object.keys(baseline.nodes).sort()) {
    const baseNode = baseline.nodes[trackingId];
    if (!baseNode) continue;

    let matchId: string | undefined;

    // 1. trackingId
    if (currentNodes[trackingId] && !usedCurrent.has(trackingId)) {
      matchId = trackingId;
    }
    // 2. nodeId
    if (matchId === undefined) {
      matchId = takeFirstUnused(byNodeId.get(baseNode.nodeId), usedCurrent);
    }
    // 3. component key (survives instance replacement / id change / rename)
    if (matchId === undefined && baseNode.componentKey !== undefined) {
      matchId = takeFirstUnused(byComponentKey.get(baseNode.componentKey), usedCurrent);
    }
    // 4. structural signature
    if (matchId === undefined) {
      matchId = takeFirstUnused(bySignature.get(signature(baseNode)), usedCurrent);
    }

    if (matchId !== undefined) {
      const currentNode = currentNodes[matchId];
      if (currentNode) {
        usedCurrent.add(matchId);
        pairs.push({ baseline: baseNode, current: currentNode });
        continue;
      }
    }
    removed.push(baseNode);
  }

  const added: NodeSnapshot[] = [];
  for (const trackingId of Object.keys(currentNodes).sort()) {
    if (!usedCurrent.has(trackingId)) {
      const node = currentNodes[trackingId];
      if (node) added.push(node);
    }
  }

  return { pairs, removed, added };
}
