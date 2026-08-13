/**
 * Figma version-history probe (DEC-034) — pure, Figma-independent, unit-tested in
 * node. Replaces heavy live-document traversal (which froze Figma, TD-004): the
 * web backend reads Figma's own version history over REST and diffs areas from
 * that. This module holds only the pure logic (URL/path building, response
 * parsing, node normalization + diff); the network fetch is injected by the web
 * server layer (apps/web/src/server/figma-api.ts).
 *
 * Figma version history is FILE-level (not per-frame). "How many versions" is a
 * file property; "did this AREA change" is answered by diffing that node's
 * subtree between two versions. Node ids are stable across a file's history, so
 * they key the match directly (no tracking-id write, no document mutation).
 */

// --- version list ---------------------------------------------------------

export interface FigmaVersionUser {
  id?: string;
  handle?: string;
  img_url?: string;
  email?: string;
}

export interface FigmaVersion {
  id: string;
  created_at: string;
  label: string | null;
  description: string | null;
  user: FigmaVersionUser;
  thumbnail_url?: string;
}

export interface VersionsPage {
  versions: FigmaVersion[];
  nextPage: string | null;
}

/** GET file versions (Tier 2, scope file_versions:read). */
export function versionsPath(fileKey: string): string {
  return `/v1/files/${encodeURIComponent(fileKey)}/versions`;
}

/** GET file nodes at a specific version (scope files:read). */
export function nodesPath(fileKey: string, nodeIds: string[], version?: string): string {
  const q = new URLSearchParams({ ids: nodeIds.join(",") });
  if (version) q.set("version", version);
  return `/v1/files/${encodeURIComponent(fileKey)}/nodes?${q.toString()}`;
}

/** Parse one page of the versions endpoint (defensive: never throws on shape). */
export function parseVersionsResponse(json: unknown): VersionsPage {
  const obj = (json ?? {}) as { versions?: unknown; pagination?: { next_page?: string | null } };
  const versions = Array.isArray(obj.versions) ? (obj.versions as FigmaVersion[]) : [];
  const nextPage = (obj.pagination && obj.pagination.next_page) || null;
  return { versions, nextPage };
}

export interface VersionSummary {
  total: number;
  named: number;
  autosave: number;
}

export function summarizeVersions(versions: FigmaVersion[]): VersionSummary {
  const named = versions.filter((v) => !!v.label).length;
  return { total: versions.length, named, autosave: versions.length - named };
}

// --- node normalization + area diff --------------------------------------

export interface FigmaNode {
  id?: string;
  name?: string;
  type?: string;
  visible?: boolean;
  opacity?: number;
  characters?: string;
  cornerRadius?: number;
  layoutMode?: string;
  itemSpacing?: number;
  paddingTop?: number;
  paddingRight?: number;
  paddingBottom?: number;
  paddingLeft?: number;
  absoluteBoundingBox?: { width?: number; height?: number } | null;
  style?: { fontSize?: number } | null;
  fills?: unknown;
  strokes?: unknown;
  children?: FigmaNode[];
}

export interface NormalizedNode {
  name?: string;
  type?: string;
  w?: number;
  h?: number;
  visible: boolean;
  opacity: number;
  characters?: string;
  fontSize?: number;
  cornerRadius?: number;
  layoutMode?: string;
  itemSpacing?: number;
  padding: (number | undefined)[];
  fills: string;
  strokes: string;
  childCount: number;
}

/** Round to 3 decimals to absorb Figma sub-pixel noise (mirrors DEC-005). */
function r3(n: number | undefined): number | undefined {
  return typeof n === "number" ? Math.round(n * 1000) / 1000 : undefined;
}

export function normalizeFigmaNode(node: FigmaNode): NormalizedNode {
  const b = node.absoluteBoundingBox ?? {};
  return {
    name: node.name,
    type: node.type,
    w: r3(b.width),
    h: r3(b.height),
    visible: node.visible !== false,
    opacity: r3(node.opacity) ?? 1,
    characters: node.characters,
    fontSize: r3(node.style?.fontSize),
    cornerRadius: r3(node.cornerRadius),
    layoutMode: node.layoutMode,
    itemSpacing: r3(node.itemSpacing),
    padding: [node.paddingTop, node.paddingRight, node.paddingBottom, node.paddingLeft].map(r3),
    fills: JSON.stringify(node.fills ?? []),
    strokes: JSON.stringify(node.strokes ?? []),
    childCount: node.children?.length ?? 0,
  };
}

/** Flatten a subtree into a Map keyed by node id (ids are stable across versions). */
export function flattenFigmaTree(
  root: FigmaNode | null | undefined,
  map: Map<string, NormalizedNode> = new Map()
): Map<string, NormalizedNode> {
  if (!root || !root.id) return map;
  map.set(root.id, normalizeFigmaNode(root));
  for (const c of root.children ?? []) flattenFigmaTree(c, map);
  return map;
}

export interface NodeRef {
  id: string;
  name?: string;
  type?: string;
}
export interface ModifiedNode extends NodeRef {
  fields: string[];
}
export interface NodeMapDiff {
  added: NodeRef[];
  removed: NodeRef[];
  modified: ModifiedNode[];
}

export function diffNodeMaps(
  before: Map<string, NormalizedNode>,
  after: Map<string, NormalizedNode>
): NodeMapDiff {
  const added: NodeRef[] = [];
  const removed: NodeRef[] = [];
  const modified: ModifiedNode[] = [];
  for (const [id, a] of after) {
    const b = before.get(id);
    if (!b) {
      added.push({ id, name: a.name, type: a.type });
      continue;
    }
    if (JSON.stringify(a) !== JSON.stringify(b)) {
      const fields = (Object.keys(a) as (keyof NormalizedNode)[])
        .filter((k) => JSON.stringify(a[k]) !== JSON.stringify(b[k]))
        .map((k) => String(k));
      modified.push({ id, name: a.name, type: a.type, fields });
    }
  }
  for (const [id, b] of before) {
    if (!after.has(id)) removed.push({ id, name: b.name, type: b.type });
  }
  return { added, removed, modified };
}

export interface AreaChange {
  nodeId: string;
  label?: string;
  changed: boolean;
  nodeCount: number;
  diff: NodeMapDiff;
}

/** Compare one area (node subtree) between an older and a newer version. */
export function areaChange(
  nodeId: string,
  beforeRoot: FigmaNode | null,
  afterRoot: FigmaNode | null
): AreaChange {
  const bMap = flattenFigmaTree(beforeRoot);
  const aMap = flattenFigmaTree(afterRoot);
  const diff = diffNodeMaps(bMap, aMap);
  const changed = diff.added.length + diff.removed.length + diff.modified.length > 0;
  const label = (afterRoot ?? beforeRoot)?.name;
  return { nodeId, label, changed, nodeCount: aMap.size || bMap.size, diff };
}
