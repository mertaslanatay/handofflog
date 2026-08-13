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

/**
 * Accepts a Figma node id in any form the user is likely to paste — a full file
 * URL, the `node-id=917-19497` query value, the dash form `917-19497`, or the API
 * form `917:19497` — and returns the API form (`917:19497`).
 */
export function normalizeNodeId(input: string): string {
  let s = input.trim();
  const m = s.match(/node-id=([^&\s]+)/i);
  if (m && m[1]) s = decodeURIComponent(m[1]);
  return s.replace(/-/g, ":");
}

// --- page report (per-screen, human-readable change lines) ---------------

export interface PageInfo {
  id: string;
  name: string;
}

/** Parse a depth=1 GET file response into the list of Figma pages (canvases). */
export function parsePagesResponse(json: unknown): PageInfo[] {
  const doc = (json as { document?: { children?: { id?: string; name?: string }[] } })?.document;
  const kids = doc?.children ?? [];
  const out: PageInfo[] = [];
  for (const c of kids) if (c.id) out.push({ id: c.id, name: c.name ?? c.id });
  return out;
}

export function filePath(fileKey: string, opts?: { depth?: number; version?: string }): string {
  const q = new URLSearchParams();
  if (opts?.depth != null) q.set("depth", String(opts.depth));
  if (opts?.version) q.set("version", opts.version);
  const qs = q.toString();
  return `/v1/files/${encodeURIComponent(fileKey)}${qs ? "?" + qs : ""}`;
}

const FIELD_LABELS: Record<string, string> = {
  name: "isim",
  type: "tip",
  w: "genişlik",
  h: "yükseklik",
  visible: "görünürlük",
  opacity: "opaklık",
  characters: "metin",
  fontSize: "yazı boyutu",
  cornerRadius: "köşe yarıçapı",
  layoutMode: "yerleşim modu",
  itemSpacing: "öğe aralığı",
  padding: "iç boşluk",
  fills: "dolgu/renk",
  strokes: "çizgi/kenar",
  childCount: "alt öğe sayısı",
};

function truncate(s: string, n = 40): string {
  return s.length > n ? s.slice(0, n) + "…" : s;
}

function fmtValue(field: string, value: unknown): string {
  if (value === undefined || value === null) return "—";
  if (field === "characters" && typeof value === "string") return `“${truncate(value)}”`;
  if (field === "visible") return value ? "görünür" : "gizli";
  if (field === "padding" && Array.isArray(value)) return value.map((v) => (v == null ? "—" : String(v))).join("/");
  if (typeof value === "string") return value;
  return String(value);
}

function fieldChangeText(field: string, before: unknown, after: unknown): string {
  const label = FIELD_LABELS[field] ?? field;
  if (field === "fills" || field === "strokes") return `${label} değişti`;
  return `${label}: ${fmtValue(field, before)} → ${fmtValue(field, after)}`;
}

export interface ChangeLine {
  kind: "added" | "removed" | "modified";
  node: string;
  nodeType?: string;
  text: string;
}

/** Human-readable change lines for one screen (area) between two versions. */
export function screenChangeLines(
  beforeRoot: FigmaNode | null,
  afterRoot: FigmaNode | null
): ChangeLine[] {
  const before = flattenFigmaTree(beforeRoot);
  const after = flattenFigmaTree(afterRoot);
  const lines: ChangeLine[] = [];
  for (const [id, a] of after) {
    const b = before.get(id);
    if (!b) {
      lines.push({ kind: "added", node: a.name ?? id, nodeType: a.type, text: `yeni: ${a.type ?? "node"} “${a.name ?? id}”` });
      continue;
    }
    for (const key of Object.keys(a) as (keyof NormalizedNode)[]) {
      if (JSON.stringify(a[key]) !== JSON.stringify(b[key])) {
        lines.push({
          kind: "modified",
          node: a.name ?? id,
          nodeType: a.type,
          text: `${a.name ?? id}: ${fieldChangeText(String(key), b[key], a[key])}`,
        });
      }
    }
  }
  for (const [id, b] of before) {
    if (!after.has(id)) lines.push({ kind: "removed", node: b.name ?? id, nodeType: b.type, text: `silinen: ${b.type ?? "node"} “${b.name ?? id}”` });
  }
  return lines;
}

export type ScreenStatus = "added" | "removed" | "modified" | "unchanged";
export interface ScreenReport {
  screenId: string;
  name: string;
  status: ScreenStatus;
  changeCount: number;
  changes: ChangeLine[];
}
export interface PageTotals {
  screens: number;
  added: number;
  removed: number;
  modified: number;
  unchanged: number;
  changes: number;
}
export interface PageReport {
  totals: PageTotals;
  screens: ScreenReport[];
}

/** Top-level frames (screens) of a Figma page canvas, keyed by stable node id. */
function screensOf(canvas: FigmaNode | null): Map<string, FigmaNode> {
  const m = new Map<string, FigmaNode>();
  for (const child of canvas?.children ?? []) if (child.id) m.set(child.id, child);
  return m;
}

/** Per-screen change report for a whole handoff page between two versions. */
export function buildPageReport(
  beforeCanvas: FigmaNode | null,
  afterCanvas: FigmaNode | null
): PageReport {
  const before = screensOf(beforeCanvas);
  const after = screensOf(afterCanvas);
  const screens: ScreenReport[] = [];

  for (const [id, aNode] of after) {
    const bNode = before.get(id);
    if (!bNode) {
      screens.push({ screenId: id, name: aNode.name ?? id, status: "added", changeCount: 1, changes: [{ kind: "added", node: aNode.name ?? id, nodeType: aNode.type, text: "yeni ekran eklendi" }] });
      continue;
    }
    const lines = screenChangeLines(bNode, aNode);
    screens.push({ screenId: id, name: aNode.name ?? id, status: lines.length ? "modified" : "unchanged", changeCount: lines.length, changes: lines });
  }
  for (const [id, bNode] of before) {
    if (!after.has(id)) screens.push({ screenId: id, name: bNode.name ?? id, status: "removed", changeCount: 1, changes: [{ kind: "removed", node: bNode.name ?? id, nodeType: bNode.type, text: "ekran silindi" }] });
  }

  const totals: PageTotals = {
    screens: screens.length,
    added: screens.filter((s) => s.status === "added").length,
    removed: screens.filter((s) => s.status === "removed").length,
    modified: screens.filter((s) => s.status === "modified").length,
    unchanged: screens.filter((s) => s.status === "unchanged").length,
    changes: screens.reduce((n, s) => n + s.changeCount, 0),
  };
  const rank = (s: ScreenReport): number => (s.status === "unchanged" ? 1 : 0);
  screens.sort((a, b) => rank(a) - rank(b));
  return { totals, screens };
}
