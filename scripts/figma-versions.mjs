#!/usr/bin/env node
// scripts/figma-versions.mjs
//
// Figma version-history probe — no live document traversal, so it never freezes
// Figma. Lists a file's version history (how many versions, when, by whom) and,
// optionally, checks whether specific AREAS (node ids) changed between the two
// most recent versions by diffing their subtrees node-by-node.
//
// Zero dependencies — needs only Node 18+ (global fetch).
//
// USAGE
//   FIGMA_TOKEN=figd_xxx node scripts/figma-versions.mjs <FILE_KEY> [nodeIdA,nodeIdB,...]
//   FIGMA_TOKEN=figd_xxx node scripts/figma-versions.mjs <FILE_KEY> --json > versions.json
//
//   FILE_KEY   from the file URL: https://www.figma.com/design/<FILE_KEY>/<name>
//   node ids   optional; copy from Figma (right-click a frame → Copy/Paste as →
//              Copy link, the node-id is the `node-id=1%3A23` part → "1:23").
//   FIGMA_TOKEN a Figma Personal Access Token:
//              figma.com → Settings → Security → Personal access tokens →
//              generate one with read access to "File content" and "File versions".
//
// Optional env:
//   VERSION_FROM / VERSION_TO   diff between these two version ids instead of the
//                               two most recent (VERSION_FROM = older/before).

const API = "https://api.figma.com/v1";

const fileKey = process.argv[2];
const secondArg = process.argv[3];
const asJson = process.argv.includes("--json");
const nodeIds =
  secondArg && !secondArg.startsWith("--")
    ? secondArg.split(",").map((s) => s.trim()).filter(Boolean)
    : [];

const token = process.env.FIGMA_TOKEN;

function die(msg) {
  console.error("\n✖ " + msg + "\n");
  process.exit(1);
}

if (!token) die("FIGMA_TOKEN yok. Örnek: FIGMA_TOKEN=figd_xxx node scripts/figma-versions.mjs <FILE_KEY>");
if (!fileKey) die("FILE_KEY yok. Dosya URL'sindeki /design/<FILE_KEY>/ kısmını ver.");

async function figma(path) {
  const url = path.startsWith("http") ? path : API + path;
  const res = await fetch(url, { headers: { "X-Figma-Token": token } });
  if (res.status === 403)
    die("403 — token geçersiz/expired ya da yetkisi yetersiz. PAT'te 'File content' + 'File versions' read açık mı?");
  if (res.status === 404) die("404 — file key ya da version id bulunamadı. FILE_KEY doğru mu?");
  if (res.status === 429) die("429 — Figma rate limit. Biraz bekleyip tekrar dene.");
  if (!res.ok) die(`HTTP ${res.status} — ${await res.text().catch(() => "")}`);
  return res.json();
}

async function fetchAllVersions(key) {
  const out = [];
  let next = `/files/${key}/versions`;
  let guard = 0;
  while (next && guard++ < 200) {
    const page = await figma(next);
    out.push(...(page.versions || []));
    next = page.pagination && page.pagination.next_page ? page.pagination.next_page : null;
  }
  return out; // newest first
}

// --- lightweight, deterministic node normalization for the area diff ---
const r3 = (n) => (typeof n === "number" ? Math.round(n * 1000) / 1000 : n);

function normalize(node) {
  const b = node.absoluteBoundingBox || {};
  return {
    name: node.name,
    type: node.type,
    w: r3(b.width),
    h: r3(b.height),
    visible: node.visible !== false,
    opacity: r3(node.opacity ?? 1),
    characters: node.characters,
    fontSize: r3(node.style && node.style.fontSize),
    cornerRadius: r3(node.cornerRadius),
    layoutMode: node.layoutMode,
    itemSpacing: r3(node.itemSpacing),
    padding: [node.paddingTop, node.paddingRight, node.paddingBottom, node.paddingLeft].map(r3),
    fills: JSON.stringify(node.fills || []),
    strokes: JSON.stringify(node.strokes || []),
    childCount: (node.children || []).length,
  };
}

function flatten(node, map) {
  if (!node || !node.id) return map;
  map.set(node.id, normalize(node));
  for (const c of node.children || []) flatten(c, map);
  return map;
}

function diffMaps(before, after) {
  const added = [], removed = [], modified = [];
  for (const [id, a] of after) {
    if (!before.has(id)) added.push(a);
    else if (JSON.stringify(before.get(id)) !== JSON.stringify(a)) {
      const b = before.get(id);
      const fields = Object.keys(a).filter((k) => JSON.stringify(a[k]) !== JSON.stringify(b[k]));
      modified.push({ name: a.name, type: a.type, fields });
    }
  }
  for (const [id, b] of before) if (!after.has(id)) removed.push(b);
  return { added, removed, modified };
}

async function fetchArea(key, nodeId, versionId) {
  const q = new URLSearchParams({ ids: nodeId });
  if (versionId) q.set("version", versionId);
  const data = await figma(`/files/${key}/nodes?${q.toString()}`);
  const entry = data.nodes && data.nodes[nodeId];
  return entry ? entry.document : null;
}

(async () => {
  const versions = await fetchAllVersions(fileKey);

  if (asJson) {
    console.log(JSON.stringify(versions, null, 2));
    return;
  }

  const named = versions.filter((v) => v.label);
  console.log(`\n📄 File: ${fileKey}`);
  console.log(`🕓 Toplam versiyon: ${versions.length}  (isimli/named: ${named.length}, autosave: ${versions.length - named.length})\n`);

  const show = versions.slice(0, 20);
  for (const v of show) {
    const when = new Date(v.created_at).toISOString().replace("T", " ").slice(0, 16);
    const who = (v.user && (v.user.handle || v.user.email)) || "—";
    const tag = v.label ? `★ ${v.label}` : "· (autosave)";
    console.log(`  ${when}  ${who.padEnd(20)}  ${tag}   [id ${v.id}]`);
  }
  if (versions.length > show.length) console.log(`  … +${versions.length - show.length} tane daha`);

  if (nodeIds.length === 0) {
    console.log(`\nℹ️  Bir alanın değişip değişmediğini görmek için node id'leri ekle:`);
    console.log(`   FIGMA_TOKEN=… node scripts/figma-versions.mjs ${fileKey} 1:23,4:56\n`);
    return;
  }

  const from = process.env.VERSION_FROM || (versions[1] && versions[1].id);
  const to = process.env.VERSION_TO || (versions[0] && versions[0].id);
  if (!from || !to) die("Alan diff'i için en az 2 versiyon gerekiyor.");

  console.log(`\n🔍 Alan karşılaştırması  (before ${from} → after ${to})`);
  for (const nodeId of nodeIds) {
    const [beforeRoot, afterRoot] = await Promise.all([
      fetchArea(fileKey, nodeId, from),
      fetchArea(fileKey, nodeId, to),
    ]);
    if (!beforeRoot && !afterRoot) {
      console.log(`\n  ${nodeId}: iki versiyonda da bulunamadı`);
      continue;
    }
    const bMap = flatten(beforeRoot, new Map());
    const aMap = flatten(afterRoot, new Map());
    const { added, removed, modified } = diffMaps(bMap, aMap);
    const changed = added.length + removed.length + modified.length;
    const label = (afterRoot || beforeRoot).name;
    if (changed === 0) {
      console.log(`\n  ✅ ${label} (${nodeId}): DEĞİŞMEMİŞ  (${aMap.size} node)`);
    } else {
      console.log(`\n  🟣 ${label} (${nodeId}): DEĞİŞMİŞ — +${added.length} / -${removed.length} / ~${modified.length}`);
      for (const m of modified.slice(0, 8)) console.log(`       ~ ${m.type} "${m.name}": ${m.fields.join(", ")}`);
      for (const a of added.slice(0, 5)) console.log(`       + ${a.type} "${a.name}"`);
      for (const rm of removed.slice(0, 5)) console.log(`       - ${rm.type} "${rm.name}"`);
    }
  }
  console.log("");
})().catch((e) => die(String(e && e.stack ? e.stack : e)));
