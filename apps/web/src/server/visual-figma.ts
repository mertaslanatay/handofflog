/**
 * Compute per-screen highlight regions for the version-history → Release visual
 * diff (DEC-035 + Feature 1), directly from the two REST canvas trees. Mirrors
 * core/highlight.ts semantics: added/modified located in the AFTER tree, removed
 * in the BEFORE tree; coordinates relative to each screen's origin.
 */
import type { ChangeSet, HighlightRegion, NodeChange } from "@shared/schema";

interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}
interface RNode {
  id?: string;
  name?: string;
  absoluteBoundingBox?: { x?: number; y?: number; width?: number; height?: number } | null;
  children?: RNode[];
}
interface ScreenIndex {
  nodeScreen: Map<string, string>;
  screenBox: Map<string, Box>;
  screenName: Map<string, string>;
  nodeBox: Map<string, Box>;
}

function boxOf(n: RNode): Box | undefined {
  const b = n.absoluteBoundingBox;
  if (!b || b.x == null || b.y == null || b.width == null || b.height == null) return undefined;
  return { x: b.x, y: b.y, width: b.width, height: b.height };
}

function indexCanvas(canvas: RNode | null): ScreenIndex {
  const idx: ScreenIndex = {
    nodeScreen: new Map(),
    screenBox: new Map(),
    screenName: new Map(),
    nodeBox: new Map(),
  };
  for (const screen of canvas?.children ?? []) {
    if (!screen.id) continue;
    const sBox = boxOf(screen);
    if (sBox) idx.screenBox.set(screen.id, sBox);
    idx.screenName.set(screen.id, screen.name ?? screen.id);
    const walk = (n: RNode): void => {
      if (!n.id) return;
      idx.nodeScreen.set(n.id, screen.id!);
      const b = boxOf(n);
      if (b) idx.nodeBox.set(n.id, b);
      for (const c of n.children ?? []) walk(c);
    };
    walk(screen);
  }
  return idx;
}

const r2 = (n: number): number => Math.round(n * 100) / 100;

export interface ScreenVisual {
  screenId: string;
  name: string;
  afterBox?: Box;
  beforeBox?: Box;
  regions: HighlightRegion[];
}

export function computeScreenVisuals(
  beforeCanvas: unknown,
  afterCanvas: unknown,
  changeSet: ChangeSet
): ScreenVisual[] {
  const A = indexCanvas((afterCanvas ?? null) as RNode | null);
  const B = indexCanvas((beforeCanvas ?? null) as RNode | null);
  const screens = new Map<string, ScreenVisual>();

  const ensure = (sid: string, name: string): ScreenVisual => {
    let s = screens.get(sid);
    if (!s) {
      s = { screenId: sid, name, regions: [] };
      screens.set(sid, s);
    }
    return s;
  };

  const addRegion = (c: NodeChange, side: "A" | "B"): void => {
    const idx = side === "A" ? A : B;
    const sid = idx.nodeScreen.get(c.trackingId);
    if (!sid) return;
    const origin = idx.screenBox.get(sid);
    const box = idx.nodeBox.get(c.trackingId);
    if (!origin || !box) return;
    const s = ensure(sid, idx.screenName.get(sid) ?? sid);
    s.regions.push({
      trackingId: c.trackingId,
      kind: c.kind,
      x: r2(box.x - origin.x),
      y: r2(box.y - origin.y),
      width: r2(box.width),
      height: r2(box.height),
      label: c.nodeName,
    });
  };

  for (const c of changeSet.added) addRegion(c, "A");
  for (const c of changeSet.modified) addRegion(c, "A");
  for (const c of changeSet.removed) addRegion(c, "B");

  for (const s of screens.values()) {
    const a = A.screenBox.get(s.screenId);
    const b = B.screenBox.get(s.screenId);
    if (a) s.afterBox = a;
    if (b) s.beforeBox = b;
    s.regions.sort((x, y) => x.trackingId.localeCompare(y.trackingId));
  }
  return Array.from(screens.values());
}
