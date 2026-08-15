/**
 * Figma REST calls for version history (DEC-034). Thin network layer over the
 * pure @core/figma-versions builders/parsers; the OAuth access token is injected
 * by the caller. On HTTP 429 (rate limit) it waits briefly and retries once.
 */
import {
  versionsPath,
  nodesPath,
  parseVersionsResponse,
  filePath,
  parsePagesResponse,
  type FigmaVersion,
  type FigmaNode,
  type PageInfo,
} from "@core/figma-versions";

const FIGMA_API = "https://api.figma.com";

interface FigmaHttpError extends Error {
  status?: number;
}

async function figmaGet(pathOrUrl: string, token: string): Promise<unknown> {
  const url = pathOrUrl.startsWith("http") ? pathOrUrl : FIGMA_API + pathOrUrl;
  const headers = { Authorization: `Bearer ${token}` };
  let res = await fetch(url, { headers });
  if (res.status === 429) {
    const ra = Number(res.headers.get("retry-after"));
    const waitMs = (Number.isFinite(ra) && ra > 0 ? Math.min(ra, 2) : 1.5) * 1000;
    await new Promise((r) => setTimeout(r, waitMs));
    res = await fetch(url, { headers });
  }
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    const err: FigmaHttpError = new Error(`figma_http_${res.status}: ${body.slice(0, 200)}`);
    err.status = res.status;
    throw err;
  }
  return res.json();
}

export async function fetchAllVersions(fileKey: string, token: string): Promise<FigmaVersion[]> {
  const out: FigmaVersion[] = [];
  let next: string | null = versionsPath(fileKey);
  let guard = 0;
  while (next && guard++ < 200) {
    const page = parseVersionsResponse(await figmaGet(next, token));
    out.push(...page.versions);
    next = page.nextPage;
  }
  return out;
}

export async function fetchNodeAtVersion(
  fileKey: string,
  nodeId: string,
  version: string | undefined,
  token: string
): Promise<FigmaNode | null> {
  const json = (await figmaGet(nodesPath(fileKey, [nodeId], version), token)) as {
    nodes?: Record<string, { document?: FigmaNode } | undefined>;
  };
  return json.nodes?.[nodeId]?.document ?? null;
}

export async function fetchPages(fileKey: string, token: string): Promise<PageInfo[]> {
  const json = await figmaGet(filePath(fileKey, { depth: 1 }), token);
  return parsePagesResponse(json);
}

/** Render PNGs of nodes at a specific version. Returns nodeId → temporary URL. */
export async function fetchImages(
  fileKey: string,
  ids: string[],
  version: string | undefined,
  token: string
): Promise<Record<string, string | null>> {
  if (ids.length === 0) return {};
  const q = new URLSearchParams({ ids: ids.join(","), format: "png", scale: "2" });
  if (version) q.set("version", version);
  const json = (await figmaGet(`/v1/images/${encodeURIComponent(fileKey)}?${q.toString()}`, token)) as {
    images?: Record<string, string | null>;
  };
  return json.images ?? {};
}

/** Fetch an image URL and return base64 (no data: prefix). Bounded by a timeout. */
export async function imageUrlToBase64(url: string): Promise<string | null> {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 12000);
    const res = await fetch(url, { signal: ctrl.signal });
    clearTimeout(timer);
    if (!res.ok) return null;
    const ab = await res.arrayBuffer();
    return Buffer.from(ab).toString("base64");
  } catch {
    return null;
  }
}
