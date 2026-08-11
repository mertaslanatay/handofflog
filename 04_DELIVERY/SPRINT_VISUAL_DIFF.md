# Sprint — Visual Design Change Tracking

Ürün sahibi gereksinimlerinin (Visual Diff + zengin release + proje algılama +
page-bazlı tarama + page changelog) ≤1 saatlik, test edilebilir görevlere bölümü.
Bağlam: DEC-031. Görev sözleşmesi GRANULAR_BACKLOG ile aynı.

**Durum:** ✅ tamam · ⬜ yapılacak · ⏸ depolama kararına bağlı · ◑ kısmi

## Feature 2 — Release metadata (version/date/time/relative) ✅
- ✅ VM-1 `relativeTime` + `formatDateTime` çekirdek yardımcı (testli)
- ✅ VM-2 Plugin release history + web list/detay'da version + tarih + "2 hours ago"

## Feature 3 — Aktif proje/dosya algılama ✅ (file)
- ✅ PF-1 Plugin: `figma.root.name` → INIT `fileName`
  - Not: Figma plugin API **project name** vermiyor (yalnızca file). Project için REST + token gerekir → "File" gösteriliyor, "Project" opsiyonel/sonra.
- ✅ PF-2 UI: Release ekranı üstünde File bloğu

## Feature 4 — Page-bazlı tarama ("Scan Current Page") ✅
- ✅ SC-1 `summarizeByScreen` / `screenChangelogLines` çekirdek (testli)
- ✅ SC-2 Snapshot'a `pageName` + `screenName` (top-level frame) — plugin doldurur
- ✅ SC-3 Diff çıktısına screen bilgisi taşındı (NodeChange additive)
- ✅ SC-4 Plugin: "Current Page" scope modu — page root traversal
- ✅ SC-5 UI: Screens özeti (değişen ekranlar + sayı)

## Feature 5 — Page-level changelog + sayılar ✅
- ✅ PC-1 Per-screen sayım/changelog çekirdek
- ✅ PC-2 UI: her ekranın yanında "N changes" + bullet changelog

> Runtime (Figma) tarafı manuel test bekliyor; tsc+build+141 test yeşil.

## Feature 1 — Visual Diff (storage = **Vercel Blob**, DEC-031)
- ✅ VD-4 Screenshot veri/mesaj kontratı — `BoundingBox`, `absoluteBoundingBox` (hash-dışı), `HighlightRegion`, `ScreenshotRef`, `VisualDiffScreen`, `VISUAL_DIFF` mesajı + `GET_VISUAL_DIFF` isteği.
- ✅ VD-5 Değişen layer bounding-box çıkarımı — `core/highlight.ts` `highlightsByScreen` (ekran orijinine göre, saf, testli).
- ✅ VD-3 Scan'de current PNG yakala — plugin `buildVisualDiff` `exportAsync` @2x, dataUri olarak UI'a.
- ✅ VD-6 (yerel yarı) UI viewer: current görüntü + mor-dashed highlight + "Changed" etiketi (`%` bazlı ölçek), `App.tsx` `VisualDiffSection`.
- ◑ VD-7 "Show Visual Diff" butonu ile açılıyor; changelog-maddesine-tıkla → viewer bağlama sonraki adım.
- ✅ VD-2 Publish anında "current + highlight" ekran görüntülerini **Private Vercel Blob**'a yükle (`@vercel/blob` `put access:'private'`), release JSON'una `visualDiff` ref'leri (pathname+dims) olarak sakla. Web'de kimlik-doğrulamalı okuma proxy'si (`/api/screenshots`, workspace üyelik kontrolü). Prisma migration gerekmez (release Json).
- ✅ VD-6 (kalıcı yarı) Web release detay sayfasında ekran görüntüsü + highlight overlay (`%` bazlı).
- ✅ VD-1 Baseline anında "before" PNG yakala (backend bağlıysa) → clientStorage'da `baseshots:<scopeId>` (base64, best-effort, kotayı bloke etmez). Publish'te before+after birlikte `visualUploads` ile gider; server ikisini de Blob'a yükler. Publish sonrası baseshots, current (after) ile tazelenir → bir sonraki döngüde before hazır.
- ✅ VD-6 (yan yana) Web detay sayfasında **Önce (baseline) | Sonra (güncel)** iki panel; before'da removed+modified, after'da added+modified highlight'ları.

> Tam before/after akışı tamam. Plugin: tsc + 151 test + build yeşil. Web deploy'da doğrulanır.
> **Runtime notu:** "before" yalnızca **backend bağlıyken oluşturulan** baseline'lar için var. Bu güncellemeden önceki baseline'lar before içermez → o release'ler after-only görünür. Backend'e bağlan, sonra **yeni baseline** oluştur.

## Açık karar (ürün sahibinden)
**Görsel diff için "previous version" nasıl elde edilecek + görseller nereye?**
1. **Baseline'da PNG yakala + Figma clientStorage'a sakla** — ücretsiz, kurulum yok; ama kota (~5MB) birkaç frame ile sınırlı, ölçeklenmez.
2. **Baseline'da PNG yakala + web object storage'a (Vercel Blob) yükle** — ölçeklenir, ekip paylaşımına uygun; Vercel Blob kurulumu + maliyet.
3. **Sadece current + highlight (historical yok)** — before/after yok; en basit, spec'i tam karşılamaz.
