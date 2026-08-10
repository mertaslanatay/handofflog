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

## Feature 1 — Visual Diff (⏸ storage = **Vercel Blob** kararı verildi, DEC-031)
- ⏸ VD-1 Baseline anında değişebilecek node'ların PNG'sini `exportAsync` ile yakala
- ⏸ VD-2 Görselleri sakla (Figma clientStorage **veya** web object storage — KARAR)
- ⏸ VD-3 Scan'de current PNG yakala
- ⏸ VD-4 Screenshot mesaj/veri kontratı
- ⬜ VD-5 Değişen layer bounding-box'larını diff'ten çıkar (highlight için) — depolamadan bağımsız hazırlanabilir
- ⏸ VD-6 UI: yan yana viewer (aynı ölçek/konum) + mor-dashed highlight + "Changed" etiketi
- ⏸ VD-7 Changelog maddesine tıkla → Visual Diff aç

## Açık karar (ürün sahibinden)
**Görsel diff için "previous version" nasıl elde edilecek + görseller nereye?**
1. **Baseline'da PNG yakala + Figma clientStorage'a sakla** — ücretsiz, kurulum yok; ama kota (~5MB) birkaç frame ile sınırlı, ölçeklenmez.
2. **Baseline'da PNG yakala + web object storage'a (Vercel Blob) yükle** — ölçeklenir, ekip paylaşımına uygun; Vercel Blob kurulumu + maliyet.
3. **Sadece current + highlight (historical yok)** — before/after yok; en basit, spec'i tam karşılamaz.
