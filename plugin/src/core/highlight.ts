/**
 * Visual-diff highlight extraction (Feature 1 / VD-5).
 *
 * Pure and Figma-independent: given a ChangeSet and the two snapshots it was
 * computed from, produce, per screen, the rectangles that should be outlined on
 * the exported screenshots. Coordinates are relative to each screen's top-left
 * origin so they map straight onto the screen's PNG.
 *
 * Side convention (consumed by the viewer, VD-6):
 *   - `added`    → draw on the AFTER image (node exists only in current)
 *   - `removed`  → draw on the BEFORE image (node existed only in baseline)
 *   - `modified` → draw on BOTH images
 */
import type {
  ChangeSet,
  HighlightRegion,
  NodeChange,
  NodeSnapshot,
  Snapshot,
} from "../shared/schema";

export interface ScreenHighlights {
  screen: string;
  regions: HighlightRegion[];
}

/**
 * Find the top node of a screen subtree: the shallowest node carrying
 * `screenName` (its parent is the page root, or carries a different / no
 * screen). Its absolute box is the screen's coordinate origin.
 */
export function findScreenRoot(
  snapshot: Snapshot,
  screenName: string
): NodeSnapshot | undefined {
  for (const node of Object.values(snapshot.nodes)) {
    if (node.screenName !== screenName) continue;
    const parent = node.parentTrackingId
      ? snapshot.nodes[node.parentTrackingId]
      : undefined;
    if (!parent || parent.screenName !== screenName) return node;
  }
  return undefined;
}

/** Region for a single change, in coords relative to `origin`; undefined when
 *  the node or the screen has no captured bounds. */
function regionFor(
  change: NodeChange,
  snapshot: Snapshot,
  origin: { x: number; y: number }
): HighlightRegion | undefined {
  const node = snapshot.nodes[change.trackingId];
  const box = node?.absoluteBoundingBox;
  if (!box) return undefined;
  return {
    trackingId: change.trackingId,
    kind: change.kind,
    x: round(box.x - origin.x),
    y: round(box.y - origin.y),
    width: round(box.width),
    height: round(box.height),
    label: change.nodeName,
  };
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Compute highlight regions grouped by screen. `added`/`modified` are located in
 * the current snapshot, `removed` in the baseline. Deterministic ordering:
 * screens by name, regions by trackingId.
 */
export function highlightsByScreen(
  changeSet: ChangeSet,
  baseline: Snapshot,
  current: Snapshot
): ScreenHighlights[] {
  const byScreen = new Map<string, HighlightRegion[]>();

  const add = (change: NodeChange, source: Snapshot): void => {
    const screen = change.screenName;
    if (screen === undefined) return; // no screen → cannot place on an image
    const root = findScreenRoot(source, screen);
    const origin = root?.absoluteBoundingBox;
    if (!origin) return;
    const region = regionFor(change, source, origin);
    if (!region) return;
    const list = byScreen.get(screen) ?? [];
    list.push(region);
    byScreen.set(screen, list);
  };

  for (const c of changeSet.added) add(c, current);
  for (const c of changeSet.modified) add(c, current);
  for (const c of changeSet.removed) add(c, baseline);

  return Array.from(byScreen.entries())
    .map(([screen, regions]) => ({
      screen,
      regions: regions.sort((a, b) => a.trackingId.localeCompare(b.trackingId)),
    }))
    .sort((a, b) => a.screen.localeCompare(b.screen));
}
