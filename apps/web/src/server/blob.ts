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
function screenshotPath(releaseId: string, index: number, screen: string): string {
  const safe = screen.replace(/[^a-zA-Z0-9-_]/g, "_").slice(0, 40) || "screen";
  return `screenshots/${releaseId}/${index}-${safe}.png`;
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
    if (!u.afterBase64) {
      out.push({ screen: u.screen });
      continue;
    }
    try {
      const bytes = Buffer.from(u.afterBase64, "base64");
      const res = await put(screenshotPath(releaseId, i, u.screen), bytes, {
        access: "private",
        contentType: "image/png",
        addRandomSuffix: false,
      });
      out.push({
        screen: u.screen,
        after: { pathname: res.pathname, width: u.width, height: u.height },
      });
    } catch {
      out.push({ screen: u.screen });
    }
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
