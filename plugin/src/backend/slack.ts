/**
 * Slack release notification (I-14). Pure message builder + injected-fetch
 * sender. Minimal content only — release name/version/impact/count + a link.
 * No design content is sent to Slack (SECURITY_AND_PRIVACY §3).
 */
import type { Release } from "../shared/release";

export function buildSlackMessage(release: Release, releaseUrl: string): string {
  return (
    `:package: New release *${release.name}* v${release.version} ` +
    `(${release.impact}) — ${release.changes.length} change(s)\n${releaseUrl}`
  );
}

export type SlackFetch = (
  url: string,
  init: { method: string; headers: Record<string, string>; body: string }
) => Promise<{ ok: boolean; status: number }>;

/** Post a message to a Slack incoming webhook. Best-effort; never throws. */
export async function notifySlack(
  fetchFn: SlackFetch,
  webhookUrl: string,
  text: string
): Promise<boolean> {
  try {
    const res = await fetchFn(webhookUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text }),
    });
    return res.ok;
  } catch {
    return false;
  }
}
