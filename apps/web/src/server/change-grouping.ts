/**
 * Group a ChangeSet's node changes by their owning screen (top-level frame),
 * with each change reduced to a kind + node + human property-change summaries.
 * Feeds the AI narration prompt (DEC-035/AI). Pure over the two REST canvases.
 */
import type { ChangeSet, NodeChange } from "@shared/schema";

interface RNode {
  id?: string;
  name?: string;
  children?: RNode[];
}

function nodeScreenMap(canvas: RNode | null): Map<string, string> {
  const m = new Map<string, string>();
  for (const screen of canvas?.children ?? []) {
    if (!screen.id) continue;
    const name = screen.name ?? screen.id;
    const walk = (n: RNode): void => {
      if (!n.id) return;
      m.set(n.id, name);
      for (const c of n.children ?? []) walk(c);
    };
    walk(screen);
  }
  return m;
}

export interface ScreenChangeGroup {
  screen: string;
  changes: { kind: string; node: string; type: string; details: string[] }[];
}

export function groupChangesByScreen(
  beforeCanvas: unknown,
  afterCanvas: unknown,
  changeSet: ChangeSet
): ScreenChangeGroup[] {
  const after = nodeScreenMap((afterCanvas ?? null) as RNode | null);
  const before = nodeScreenMap((beforeCanvas ?? null) as RNode | null);
  const groups = new Map<string, ScreenChangeGroup>();

  const push = (c: NodeChange, screen: string): void => {
    let g = groups.get(screen);
    if (!g) {
      g = { screen, changes: [] };
      groups.set(screen, g);
    }
    g.changes.push({
      kind: c.kind,
      node: c.nodeName,
      type: c.nodeType,
      details: c.propertyChanges.map((p) => p.summary),
    });
  };

  for (const c of changeSet.added) {
    const s = after.get(c.trackingId);
    if (s) push(c, s);
  }
  for (const c of changeSet.modified) {
    const s = after.get(c.trackingId);
    if (s) push(c, s);
  }
  for (const c of changeSet.removed) {
    const s = before.get(c.trackingId);
    if (s) push(c, s);
  }
  return Array.from(groups.values());
}
