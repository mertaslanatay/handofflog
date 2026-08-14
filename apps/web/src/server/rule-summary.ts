/**
 * Rule-based, API-free change summary (free alternative to the AI narration,
 * DEC-037). Turns the deterministic per-screen change groups into readable
 * Turkish bullets. Same output shape as the AI path (AiScreenSummary[]), so the
 * UI renders it identically; the route falls back to this when no AI key is set.
 */
import type { AiScreenSummary } from "@shared/release";
import type { ScreenChangeGroup } from "./change-grouping";

/** One detail is `<path>: <old> → <new>` (from classify.summarize). */
function phraseFor(detail: string): string {
  const idx = detail.indexOf(": ");
  const pathPart = idx >= 0 ? detail.slice(0, idx) : detail;
  const valuePart = idx >= 0 ? detail.slice(idx + 2) : "";
  const top = pathPart.split(".")[0] ?? pathPart;
  switch (top) {
    case "characters":
      return `metni ${valuePart}`;
    case "width":
      return `genişlik ${valuePart}`;
    case "height":
      return `yükseklik ${valuePart}`;
    case "x":
    case "y":
      return "konumu değişti";
    case "fontSize":
      return `yazı boyutu ${valuePart}`;
    case "fontName":
      return "yazı tipi değişti";
    case "lineHeight":
      return "satır yüksekliği değişti";
    case "letterSpacing":
      return "harf aralığı değişti";
    case "opacity":
      return `saydamlığı ${valuePart}`;
    case "cornerRadius":
      return "köşe yarıçapı değişti";
    case "fills":
      return "rengi değişti";
    case "strokes":
      return "kenarlığı değişti";
    case "visible":
      return /→\s*false/.test(valuePart) ? "gizlendi" : "görünür yapıldı";
    case "layoutMode":
    case "itemSpacing":
    case "paddingTop":
    case "paddingRight":
    case "paddingBottom":
    case "paddingLeft":
      return "yerleşimi değişti";
    case "componentProperties":
    case "variantProperties":
      return "bileşen ayarı değişti";
    case "name":
      return `yeniden adlandırıldı (${valuePart})`;
    case "type":
      return `türü değişti (${valuePart})`;
    default:
      return `${top} değişti`;
  }
}

function uniquePhrases(details: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const d of details) {
    const p = phraseFor(d);
    if (!seen.has(p)) {
      seen.add(p);
      out.push(p);
    }
  }
  return out;
}

const CAP = 25;

export function ruleBasedSummary(groups: ScreenChangeGroup[]): AiScreenSummary[] {
  const out: AiScreenSummary[] = [];
  for (const g of groups) {
    const bullets: string[] = [];
    for (const c of g.changes) {
      if (c.kind === "added") {
        bullets.push(`Yeni öğe eklendi: “${c.node}”`);
        continue;
      }
      if (c.kind === "removed") {
        bullets.push(`“${c.node}” kaldırıldı`);
        continue;
      }
      const phrases = uniquePhrases(c.details);
      if (phrases.length === 1 && (phrases[0] === "gizlendi" || phrases[0] === "görünür yapıldı")) {
        bullets.push(`“${c.node}” ${phrases[0]}`);
      } else if (phrases.length > 0) {
        bullets.push(`“${c.node}” güncellendi — ${phrases.join(", ")}`);
      } else {
        bullets.push(`“${c.node}” güncellendi`);
      }
    }
    if (bullets.length === 0) continue;
    const capped = bullets.slice(0, CAP);
    if (bullets.length > CAP) capped.push(`… +${bullets.length - CAP} değişiklik daha`);
    out.push({ screen: g.screen, bullets: capped });
  }
  return out;
}
