/**
 * Stable tracking identity for nodes.
 *
 * Precedence (DATA_SCHEMA "Stable tracking ID"):
 *   1. Plugin-data tracking ID (written once, survives re-parenting/rename)
 *   2. Node ID
 *   3. Deterministic fallback signature
 *
 * Only a tiny string is written to plugin data — never a snapshot. Reading is
 * side-effect free; `ensureTrackingId` writes the ID only if absent.
 */
const TRACKING_KEY = "handofflog:tid";

function sanitize(raw: string): string {
  return raw.replace(/[^a-zA-Z0-9]/g, "_");
}

/** Read an existing tracking ID without mutating the document. */
export function readTrackingId(node: SceneNode): string | undefined {
  const existing = node.getPluginData(TRACKING_KEY);
  return existing.length > 0 ? existing : undefined;
}

/** Return the node's tracking ID, assigning & persisting one if needed. */
export function ensureTrackingId(node: SceneNode): string {
  return resolveTrackingId(node, true);
}

/**
 * Resolve a node's tracking ID.
 *
 * When `persist` is true (selection scope, small subtrees) a fresh ID is written
 * to plugin data so it survives rename/re-parenting. When `persist` is false
 * (page scans, potentially tens of thousands of nodes) we deliberately AVOID the
 * per-node `setPluginData` write: it is a synchronous document mutation that
 * dirties the file and dominates page-scan time. `node.id` is already stable for
 * the lifetime of a node, so it is a perfectly good tracking key for matching
 * across scans without touching the document. Any pre-existing persisted ID is
 * still honored so selection- and page-scoped baselines stay compatible.
 */
export function resolveTrackingId(node: SceneNode, persist: boolean): string {
  const existing = readTrackingId(node);
  if (existing) return existing;
  const id = `tid_${sanitize(node.id)}`;
  if (persist) node.setPluginData(TRACKING_KEY, id);
  return id;
}

/** Deterministic fallback identity when plugin data cannot be used. */
export function fallbackTrackingId(
  node: SceneNode,
  parentTrackingId: string | undefined
): string {
  return `sig_${sanitize(parentTrackingId ?? "root")}_${node.type}_${sanitize(node.name)}`;
}
