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
- ⏸ VD-1 Baseline anında "before" PNG yakala → şu an persist edilen tek görüntü "current" (after). Gerçek before/after **yan yana** için baseline-zamanı yakalama + before URL saklama sonraki adım.

> Publish-zamanı görsel akışı tamam: plugin export @1x → base64 → server Private Blob'a yükler → release'e ref'ler işlenir → web proxy ile gösterilir. Plugin: tsc + 150 test + build yeşil. Web (Next/Prisma/Blob) sandbox'ta derlenemez → deploy'da doğrulanır. Önkoşul: Private Blob store projeye bağlı + (yerelde) `BLOB_READ_WRITE_TOKEN`.

## Açık karar (ürün sahibinden)
**Görsel diff için "previous version" nasıl elde edilecek + görseller nereye?**
1. **Baseline'da PNG yakala + Figma clientStorage'a sakla** — ücretsiz, kurulum yok; ama kota (~5MB) birkaç frame ile sınırlı, ölçeklenmez.
2. **Baseline'da PNG yakala + web object storage'a (Vercel Blob) yükle** — ölçeklenir, ekip paylaşımına uygun; Vercel Blob kurulumu + maliyet.
3. **Sadece current + highlight (historical yok)** — before/after yok; en basit, spec'i tam karşılamaz.
