/**
 * Private Vercel Blob helpers (Feature 1 / VD-2).
 *
 * Screenshots are sensitive design IP, so the store is PRIVATE: uploads and
 * reads require authentication. On Vercel the SDK authenticates via OIDC when
 * the store is connected to the project; locally it uses BLOB_READ_WRITE_TOKEN.
 * We never expose blob URLs directly — reads go through an authenticated proxy
 * route (app/api/screenshots) that verifies workspace membership.
 */
import { put, get } from "@vercel/blob";
import type { VisualUpload } from "@shared/release";
import type { UploadedScreenshot } from "@backend/visual";

/** Deterministic, collision-free pathname scoped to a release. */
function screenshotPath(
  releaseId: string,
  index: number,
  screen: string,
  side: "before" | "after"
): string {
  const safe = screen.replace(/[^a-zA-Z0-9-_]/g, "_").slice(0, 40) || "screen";
  return `screenshots/${releaseId}/${index}-${side}-${safe}.png`;
}

async function putPng(pathname: string, base64: string): Promise<string> {
  const bytes = Buffer.from(base64, "base64");
  const res = await put(pathname, bytes, {
    access: "private",
    contentType: "image/png",
    addRandomSuffix: false,
  });
  return res.pathname;
}

/** True when the release id can be recovered from a proxy pathname. */
export function releaseIdFromPath(pathname: string): string | undefined {
  const parts = pathname.split("/");
  return parts[0] === "screenshots" && parts.length >= 3 ? parts[1] : undefined;
}

/**
 * Upload each screen's "after" PNG (base64) to the private store. Best-effort
 * per screen: a failed upload yields an entry with no image so the changelog
 * still lists the screen. Requires @vercel/blob >= 2.3.
 */
export async function uploadVisualScreens(
  releaseId: string,
  uploads: VisualUpload[]
): Promise<UploadedScreenshot[]> {
  const out: UploadedScreenshot[] = [];
  for (const [i, u] of uploads.entries()) {
    const entry: UploadedScreenshot = { screen: u.screen };
    if (u.afterBase64) {
      try {
        const pathname = await putPng(screenshotPath(releaseId, i, u.screen, "after"), u.afterBase64);
        entry.after = { pathname, width: u.width, height: u.height };
      } catch {
        // keep entry without after image
      }
    }
    if (u.beforeBase64) {
      try {
        const pathname = await putPng(screenshotPath(releaseId, i, u.screen, "before"), u.beforeBase64);
        entry.before = {
          pathname,
          width: u.beforeWidth ?? u.width,
          height: u.beforeHeight ?? u.height,
        };
      } catch {
        // keep entry without before image
      }
    }
    out.push(entry);
  }
  return out;
}

export interface BlobReadResult {
  stream: ReadableStream;
  contentType: string;
}

/** Stream a private blob's bytes (caller must have authorized the request). */
export async function readScreenshot(pathname: string): Promise<BlobReadResult | undefined> {
  const result = await get(pathname, { access: "private" });
  if (!result || result.statusCode !== 200) return undefined;
  return { stream: result.stream, contentType: result.blob.contentType };
}
