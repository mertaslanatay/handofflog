/**
 * Snapshot construction from a live Figma selection.
 *
 * Traverses the selected node's subtree, normalizes each node, assigns a stable
 * tracking identity, and computes a per-node fingerprint. Produces a plain,
 * serializable `Snapshot` — no Figma objects leak into the result.
 */
import {
  SNAPSHOT_SCHEMA_VERSION,
  type NodeSnapshot,
  type Snapshot,
} from "../shared/schema";
import { hashNode } from "../core/hash";
import { normalizeNodeProperties } from "./normalize";
import { ensureTrackingId } from "./tracking";

/** Node types that can be used as a tracking scope root. */
export const SUPPORTED_SCOPE_TYPES: ReadonlySet<string> = new Set([
  "FRAME",
  "SECTION",
  "COMPONENT",
  "COMPONENT_SET",
  "INSTANCE",
  "GROUP",
]);

export interface BuildSnapshotResult {
  snapshot: Snapshot;
  nodeCount: number;
}

/** A scope root can be a single frame/section (selection) or a whole page. */
export type ScopeRoot = SceneNode | PageNode;

function hasChildren(node: ScopeRoot): node is ScopeRoot & ChildrenMixin {
  return "children" in node;
}

/** Hard depth cap to prevent runaway recursion (NFR §2). */
export const MAX_TRAVERSAL_DEPTH = 200;
/** Nodes processed between cooperative yields to the main thread (NFR §1). */
export const TRAVERSAL_CHUNK = 200;

/** Cheap pre-count of the subtree size, used to gate oversized scopes (B-02). */
export function countNodes(root: ScopeRoot): number {
  let count = 0;
  const walk = (node: ScopeRoot): void => {
    count++;
    if (hasChildren(node)) {
      for (const child of node.children) walk(child);
    }
  };
  walk(root);
  return count;
}

/** Yield control to the main thread so long traversals never freeze the UI. */
function yieldToMain(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

/** Thrown when a traversal is cancelled cooperatively (B-06). */
export class CancelledError extends Error {
  constructor() {
    super("Traversal cancelled.");
    this.name = "CancelledError";
  }
}

/**
 * Build a snapshot rooted at `root`. Traversal is chunked (yields to the main
 * thread every `TRAVERSAL_CHUNK` nodes so the UI stays responsive) and guarded
 * against pathological depth and node-id cycles. New tracking IDs are persisted
 * to plugin data so nodes can be matched on the next scan.
 */
export async function buildSnapshot(
  root: ScopeRoot,
  args: {
    scopeId: string;
    fileKey?: string;
    now: string;
    snapshotId: string;
    onProgress?: (processed: number) => void;
    shouldCancel?: () => boolean;
  }
): Promise<BuildSnapshotResult> {
  const nodes: Record<string, NodeSnapshot> = {};
  const visitedNodeIds = new Set<string>();
  let processed = 0;

  const isPageRoot = root.type === "PAGE";
  const pageName = isPageRoot ? root.name : figma.currentPage.name;

  const visit = async (
    node: ScopeRoot,
    parentTrackingId: string | undefined,
    depth: number,
    screenName: string | undefined
  ): Promise<string> => {
    if (depth > MAX_TRAVERSAL_DEPTH) {
      throw new Error(`Node tree exceeds max depth ${MAX_TRAVERSAL_DEPTH}.`);
    }
    if (visitedNodeIds.has(node.id)) {
      throw new Error(`Cycle detected at node ${node.id}.`);
    }
    visitedNodeIds.add(node.id);

    // Figma methods below exist on both SceneNode and PageNode; a page root has
    // no geometry so normalize simply returns an empty property bag.
    const sceneNode = node as SceneNode;
    const trackingId = ensureTrackingId(sceneNode);
    const properties = node.type === "PAGE" ? {} : normalizeNodeProperties(sceneNode);

    const childTrackingIds: string[] = [];
    if (hasChildren(node)) {
      for (const child of node.children) {
        // Direct children of the page root each start a new "screen".
        const childScreen = isPageRoot && node.id === root.id ? child.name : screenName;
        childTrackingIds.push(await visit(child, trackingId, depth + 1, childScreen));
        if (++processed % TRAVERSAL_CHUNK === 0) {
          if (args.shouldCancel?.()) throw new CancelledError();
          args.onProgress?.(processed);
          await yieldToMain();
        }
      }
    }

    const snapshot: NodeSnapshot = {
      trackingId,
      nodeId: node.id,
      name: node.name,
      type: node.type,
      childTrackingIds,
      properties,
      hash: hashNode({ name: node.name, type: node.type, properties }),
    };
    if (parentTrackingId !== undefined) {
      snapshot.parentTrackingId = parentTrackingId;
    }
    snapshot.pageName = pageName;
    if (screenName !== undefined) snapshot.screenName = screenName;
    nodes[trackingId] = snapshot;
    return trackingId;
  };

  await visit(root, undefined, 0, isPageRoot ? undefined : root.name);

  const snapshot: Snapshot = {
    schemaVersion: SNAPSHOT_SCHEMA_VERSION,
    id: args.snapshotId,
    scopeId: args.scopeId,
    scopeName: root.name,
    createdAt: args.now,
    nodes,
  };
  if (args.fileKey !== undefined) {
    snapshot.fileKey = args.fileKey;
  }

  return { snapshot, nodeCount: Object.keys(nodes).length };
}
