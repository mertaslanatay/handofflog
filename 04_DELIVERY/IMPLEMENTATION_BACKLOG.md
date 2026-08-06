# Implementation Backlog

> **Phase 01 status (updated):** Çalışan teknik prototip `plugin/` altında.
> Çalışan döngü: **Select → Snapshot → Change → Scan → Review → Export**.
> Kapı: `npm run verify` (tsc strict + 29 vitest testi + esbuild build) — geçiyor.

## Epic 1 — Plugin foundation

- [x] Figma plugin scaffold — `manifest.json`, `build.mjs` (esbuild → dist/)
- [x] TypeScript strict configuration — `tsconfig.json` (strict + noUnchecked*, no `any`)
- [x] React UI scaffold — `src/ui/index.tsx`, `App.tsx`
- [x] Typed main/UI messaging — `src/shared/messages.ts` (Zod-validated iki yön)
- [x] Error boundary — `src/ui/ErrorBoundary.tsx`
- [x] Basic plugin layout — overview + footer aksiyonları

## Epic 2 — Snapshot

- [x] Selection validation — `src/plugin/main.ts` `resolveScopeNode`
- [x] Node traversal — `src/plugin/snapshot.ts`
- [x] Property normalizers — `src/plugin/normalize.ts` (mixed/paint/font)
- [x] Tracking ID — `src/plugin/tracking.ts` (pluginData)
- [x] Stable serialization — `src/core/serialize.ts`
- [x] Hash generation — `src/core/hash.ts` (FNV-1a)
- [x] Client storage adapter — `src/plugin/storage.ts`
- [x] Snapshot schema migration structure — `shared/migration.ts` runner + ileri-versiyon reddi (C-07/08/09)

## Epic 3 — Diff

- [x] Node matching — `src/core/match.ts` (trackingId → nodeId → imza)
- [x] Added node detection — `src/core/diff.ts`
- [x] Removed node detection — `src/core/diff.ts`
- [x] Modified node detection — `src/core/diff.ts`
- [x] Property-level comparison — `comparePropertyMaps`
- [x] Category classification — `src/core/classify.ts`
- [x] Impact rule engine — `impactForNodeChange`
- [x] Human-readable messages — `summarize` (ör. `width: 320 → 360`)

## Epic 4 — UI

- [x] Empty baseline state
- [x] Create baseline flow
- [x] Scanning state — `aria-live` status
- [x] Changes list — added/modified/removed grupları
- [x] Change detail — property, eski→yeni, kategori, impact
- [x] Include/exclude selection — change card include toggle
- [ ] Release form — Flow C / Phase 02 kapsamı; Phase 01 çekirdek döngü dışı
- [x] Success state — baseline sonrası overview güncellenir

## Epic 5 — Quality

- [x] Unit tests — 29 test (serialize, hash, diff, schema)
- [x] Snapshot fixtures — `src/core/testkit.ts` + spec builder
- [ ] Large-frame performance test — MVP sonrası (henüz yazılmadı)
- [x] Mixed value tests — `diff.test.ts` mixed sentinel
- [x] Storage corruption recovery — `loadBaseline` `corrupt` durumu (baseline silinmez)
- [x] Manual QA checklist — `plugin/README.md` "Manual test"
- [x] Build documentation — `plugin/README.md`

## Epic 6 — Diff doğruluğu & gürültü (Staff review önceliği #1) — Sprint 1 ✅

- [x] Kalibrasyon seti (temsili, DEC-017 — gerçek export'la değiştirilecek)
- [x] False-positive ve eşleştirme doğruluğu ölçümü (harness + testler, %0 FP / %100 match)
- [x] Rename / reorder / detach / component-swap senaryolarını doğrula
- [x] Component-key eşleştirmesini MVP'ye çek (matcher + loader; canlı doldurma TD-002)
- [x] Child-position gürültü toggle'ı (`positionNoise` 3 mod; gerçek veri kalibrasyonu bekliyor)

## Epic 7 — Performans, ölçek, dayanıklılık — Sprint 1 (kısmi)

- [x] Async/chunked traversal + 50ms bloklama kuralı (B-03; runtime Figma-manuel TD-004)
- [x] Scanning progress + iptal (B-04/B-05/B-06)
- [x] SCOPE_TOO_LARGE yumuşak/sert eşik davranışı (B-01/B-02)
- [x] Large-frame performans testi (NFR bütçesi) (B-07, pure diff)
- [x] Storage kota degradasyonu (baseline silmeden) (B-09; runtime Figma-manuel)
- [x] Schema migration iskeleti + versiyon reddi testleri (C-07/08/09)
- [x] Re-baseline yıkıcı-onay akışı (C-04)

## Epic 8 — Gürültü yönetimi & review UX — Sprint 2 (çoğu ✅)

- [x] Bulk include/exclude (D-01)
- [x] Kategori/impact'e göre filtre + sıralama + arama (D-02/03/06)
- [~] "Bu tür değişikliği gizle" — filtre var, kalıcılık yok (D-04 kısmi, TD-007)
- [x] Change card → canvas zoom-to-node (D-05)
- [~] Erişilebilirlik: F-01..05/07/08 uygulandı; kontrast CI (F-06) + manuel QA Sprint 3 (TD-008)

## Epic 9 — Release döngüsü & Faz 2 hazırlığı — Sprint 3 (çoğu ✅)

- [x] Release formu (Flow C) + include seçimini release'e bağla (E-02/E-03/D-07)
- [x] `handofflog:releases` yerel geçmiş (E-06; storage releases key)
- [x] Kategori/etki → release türü önerisi (E-07, CATEGORY_IMPACT_MAPPING §4)
- [x] Telemetri opt-in event iskeleti (G-01..G-05, METRICS; G-06 özet UI ertelendi TD-010)
- [x] CI pipeline (H-04, `.github/workflows/ci.yml`)
- [~] Diff motorunu `packages/` altına ayır — ertelendi (DEC-026/TD-009)
- [ ] Faz 2 güvenlik kapısı: SECURITY_AND_PRIVACY uyum listesi (Faz 2 başında)

> **Faz 1 durumu:** Temel döngü **Select → Snapshot → Change → Scan → Review → Publish** uçtan uca çalışıyor (publish snapshot'ı yeni baseline'a terfi ettiriyor). `npm run verify` yeşil; CI kuruldu. Faz 1 sevke hazır (runtime Figma manuel QA turu önerilir).

## Definition of Done

Bir madde yalnızca:
- Kod tamamlandıysa,
- Testleri geçtiyse,
- Hata durumu ele alındıysa,
- İlgili doküman güncellendiyse
tamamlanmış sayılır.
