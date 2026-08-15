/** AI narration via Anthropic Messages API. No-ops without ANTHROPIC_API_KEY. */
import type { AiScreenSummary } from "@shared/release";
import type { ScreenChangeGroup } from "./change-grouping";
import { SUMMARY_SYSTEM, buildSummaryInput, parseSummaryScreens } from "./summary-shared";

export async function generateAiSummary(groups: ScreenChangeGroup[]): Promise<AiScreenSummary[] | null> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key || groups.length === 0) return null;
  const model = process.env.ANTHROPIC_MODEL || "claude-haiku-4-5";
  const user = "Diff verisi (JSON):\n" + JSON.stringify(buildSummaryInput(groups));
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 30000);
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model, max_tokens: 1500, system: SUMMARY_SYSTEM, messages: [{ role: "user", content: user }] }),
      signal: ctrl.signal,
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    const data = (await res.json()) as { content?: { type: string; text?: string }[] };
    const text = (data.content ?? []).map((c) => c.text ?? "").join("");
    return parseSummaryScreens(text);
  } catch {
    return null;
  }
}
