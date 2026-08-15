/** Shared bits for the AI narration providers (Anthropic, Gemini). */
import type { AiScreenSummary } from "@shared/release";
import type { ScreenChangeGroup } from "./change-grouping";

export const SUMMARY_SYSTEM = [
  "Sen bir tasarım-değişikliği özetleyicisisin. SADECE sana verilen deterministik diff verisini kullan; yeni bilgi UYDURMA.",
  "Her ekran için yapılan değişiklikleri ürün diliyle KISA Türkçe maddelere çevir",
  '(ör. "başlık metni Devam’dan Öde’ye değişti", "yeni bir buton eklendi", "kullanıcı ikonu gizlendi").',
  "Teknik jargon yerine anlaşılır ifade kullan.",
  'Çıktıyı SADECE şu JSON formatında ver, başka metin yazma: {"screens":[{"screen":"...","bullets":["..."]}]}',
].join(" ");

export function buildSummaryInput(groups: ScreenChangeGroup[]): unknown {
  return groups.slice(0, 12).map((g) => ({ screen: g.screen, changes: g.changes.slice(0, 40) }));
}

export function parseSummaryScreens(text: string): AiScreenSummary[] | null {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end < 0) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(text.slice(start, end + 1));
  } catch {
    return null;
  }
  const screens = (parsed as { screens?: unknown }).screens;
  if (!Array.isArray(screens)) return null;
  const out: AiScreenSummary[] = [];
  for (const s of screens) {
    const so = s as { screen?: unknown; bullets?: unknown };
    if (typeof so.screen === "string" && Array.isArray(so.bullets)) {
      out.push({ screen: so.screen, bullets: so.bullets.filter((b): b is string => typeof b === "string") });
    }
  }
  return out.length ? out : null;
}
