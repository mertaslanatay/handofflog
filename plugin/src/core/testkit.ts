/**
 * Pure test helpers for building snapshots WITHOUT the Figma API.
 *
 * This mirrors what the plugin's `buildSnapshot` produces (tracking IDs, child
 * links, per-node hashes) so the Figma-independent core can be exercised end to
 * end in a plain node environment.
 */
import {
  SNAPSHOT_SCHEMA_VERSION,
  type BoundingBox,
  type NodeProperties,
  type NodeSnapshot,
  type Snapshot,
} from "../shared/schema";
import { hashNode } from "./hash";

export interface NodeSpec {
  trackingId: string;
  nodeId?: string;
  name: string;
  type: string;
  componentKey?: string;
  pageName?: string;
  screenName?: string;
  absoluteBoundingBox?: BoundingBox;
  properties?: NodeProperties;
  children?: NodeSpec[];
}

export function buildSnapshotFromSpec(
  root: NodeSpec,
  meta: { id: string; scopeId: string; scopeName?: string; createdAt?: string }
): Snapshot {
  const nodes: Record<string, NodeSnapshot> = {};

  const visit = (spec: NodeSpec, parentTrackingId: string | undefined): string => {
    const properties = spec.properties ?? {};
    const childTrackingIds = (spec.children ?? []).map((c) => visit(c, spec.trackingId));
    const node: NodeSnapshot = {
      trackingId: spec.trackingId,
      nodeId: spec.nodeId ?? spec.trackingId,
      name: spec.name,
      type: spec.type,
      childTrackingIds,
      properties,
      hash: hashNode({ name: spec.name, type: spec.type, properties }),
    };
    if (parentTrackingId !== undefined) node.parentTrackingId = parentTrackingId;
    if (spec.componentKey !== undefined) node.componentKey = spec.componentKey;
    if (spec.pageName !== undefined) node.pageName = spec.pageName;
    if (spec.screenName !== undefined) node.screenName = spec.screenName;
    if (spec.absoluteBoundingBox !== undefined) {
      node.absoluteBoundingBox = spec.absoluteBoundingBox;
    }
    nodes[spec.trackingId] = node;
    return spec.trackingId;
  };

  visit(root, undefined);

  return {
    schemaVersion: SNAPSHOT_SCHEMA_VERSION,
    id: meta.id,
    scopeId: meta.scopeId,
    scopeName: meta.scopeName ?? root.name,
    createdAt: meta.createdAt ?? "2026-01-01T00:00:00.000Z",
    nodes,
  };
}
