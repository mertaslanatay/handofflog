/** AI narration via Google Gemini (free tier). No-ops without GEMINI_API_KEY. */
import type { AiScreenSummary } from "@shared/release";
import type { ScreenChangeGroup } from "./change-grouping";
import { SUMMARY_SYSTEM, buildSummaryInput, parseSummaryScreens } from "./summary-shared";

export async function generateGeminiSummary(groups: ScreenChangeGroup[]): Promise<AiScreenSummary[] | null> {
  const key = process.env.GEMINI_API_KEY;
  if (!key || groups.length === 0) return null;
  const model = process.env.GEMINI_MODEL || "gemini-flash-latest";
  const user = "Diff verisi (JSON):\n" + JSON.stringify(buildSummaryInput(groups));
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 30000);
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SUMMARY_SYSTEM }] },
        contents: [{ role: "user", parts: [{ text: user }] }],
        generationConfig: { responseMimeType: "application/json", maxOutputTokens: 1500 },
      }),
      signal: ctrl.signal,
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    const data = (await res.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
    const text = (data.candidates?.[0]?.content?.parts ?? []).map((p) => p.text ?? "").join("");
    return parseSummaryScreens(text);
  } catch {
    return null;
  }
}
