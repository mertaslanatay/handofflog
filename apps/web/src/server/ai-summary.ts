/**
 * AI narration of a diff (DEC-008: narration, not detection). Turns the
 * deterministic per-screen change groups into short, human-language Turkish
 * bullets via the Anthropic Messages API. No-ops (returns null) when
 * ANTHROPIC_API_KEY is absent, so publishing never depends on it.
 */
import type { AiScreenSummary } from "@shared/release";
import type { ScreenChangeGroup } from "./change-grouping";

function extractJson(text: string): unknown {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end < 0) return null;
  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch {
    return null;
  }
}

export async function generateAiSummary(groups: ScreenChangeGroup[]): Promise<AiScreenSummary[] | null> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key || groups.length === 0) return null;
  const model = process.env.ANTHROPIC_MODEL || "claude-3-5-haiku-latest";

  const input = groups.slice(0, 12).map((g) => ({ screen: g.screen, changes: g.changes.slice(0, 40) }));
  const system =
    "Sen bir tasarım-değişikliği özetleyicisisin. SADECE sana verilen deterministik diff verisini kullan; " +
    "yeni bilgi UYDURMA. Her ekran için yapılan değişiklikleri ürün diliyle KISA Türkçe maddelere çevir " +
    '(ör. "Header\'daki başlık metni \\"Devam\\"dan \\"Öde\\"ye değişti", "Yeni bir buton eklendi", ' +
    '"Kullanıcı ikonu gizlendi"). Teknik jargon yerine anlaşılır ifade kullan. Çıktıyı SADECE şu JSON ' +
    'formatında ver, başka metin yazma: {"screens":[{"screen":"...","bullets":["..."]}]}';
  const user = "Diff verisi (JSON):\n" + JSON.stringify(input);

  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 30000);
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({ model, max_tokens: 1500, system, messages: [{ role: "user", content: user }] }),
      signal: ctrl.signal,
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    const data = (await res.json()) as { content?: { type: string; text?: string }[] };
    const text = (data.content ?? []).map((c) => c.text ?? "").join("");
    const parsed = extractJson(text) as { screens?: unknown } | null;
    if (!parsed || !Array.isArray(parsed.screens)) return null;
    const out: AiScreenSummary[] = [];
    for (const s of parsed.screens) {
      const so = s as { screen?: unknown; bullets?: unknown };
      if (typeof so.screen === "string" && Array.isArray(so.bullets)) {
        out.push({ screen: so.screen, bullets: so.bullets.filter((b): b is string => typeof b === "string") });
      }
    }
    return out.length ? out : null;
  } catch {
    return null;
  }
}
