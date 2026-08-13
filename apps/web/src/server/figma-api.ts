/**
 * Figma REST calls for version history (DEC-034). Thin network layer over the
 * pure @core/figma-versions builders/parsers; the OAuth access token is injected
 * by the caller (read from the encrypted cookie). No document is traversed inside
 * Figma — this is what replaces the freeze-prone live scan (TD-004).
 */
import {
  versionsPath,
  nodesPath,
  parseVersionsResponse,
  type FigmaVersion,
  type FigmaNode,
} from "@core/figma-versions";

const FIGMA_API = "https://api.figma.com";

interface FigmaHttpError extends Error {
  status?: number;
}

async function figmaGet(pathOrUrl: string, token: string): Promise<unknown> {
  const url = pathOrUrl.startsWith("http") ? pathOrUrl : FIGMA_API + pathOrUrl;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
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
