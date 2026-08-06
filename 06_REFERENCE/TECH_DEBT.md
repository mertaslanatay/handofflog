# Technical Debt Register

Açık, kasıtlı teknik borçlar. Her madde: neden var, riski, önerilen çözüm/task.

## TD-001 — Normalizer ikiye bölünmüş (loader ↔ plugin)

**Durum:** Açık
`src/core/fixture-loader.ts` (REST) ve `src/plugin/normalize.ts` (canlı Figma)
aynı normalize mantığını ayrı yazıyor. Iraksarlarsa kalibrasyon canlı davranışı
yanlış temsil eder.
**Risk:** Orta. **Çözüm:** Ortak "supported property registry" + saf map fonksiyonları; her iki katman aynı kaynaktan türesin. (A-epic sonrası refactor.)

## TD-002 — Plugin `componentKey` doldurmuyor

**Durum:** Açık
Component-key eşleştirmesi (A-07) matcher + loader'da aktif; ama `plugin/snapshot.ts`
canlı taramada `componentKey` set etmiyor (dynamic-page'de `getMainComponentAsync`
gerekiyor). Yani component-key eşleştirmesi şu an yalnızca export/test yolunda çalışır.
**Risk:** Orta (instance-swap canlı senaryoda henüz yakalanmaz). **Çözüm:** Async traversal içinde `getMainComponentAsync().key` ile doldur (B-03 async altyapısı hazır).

## TD-003 — `visible` paritesi (REST vs canlı)

**Durum:** Açık
REST export `visible`'ı true iken atlar; canlı normalizer her zaman set eder.
Export-baseline'ı canlı-scan ile karşılaştırınca sahte `visible` farkı doğabilir.
Kalibrasyon export↔export olduğu için şu an maskeli.
**Risk:** Düşük-Orta. **Çözüm:** İki tarafı da aynı varsayılana hizala (yoksa `visible: true` kabul et).

## TD-004 — Plugin-thread davranışı unit test edilemiyor

**Durum:** Kabul edilen sınırlama
`snapshot.ts` (async chunked traversal, depth/cycle guard), `storage.ts`,
`main.ts` Figma global'ine bağlı; node ortamında koşulamaz. Saf mantık
(limits, migration, diff, calibration) tam test edildi; entegrasyon runtime'ı
**Figma manuel testi** gerektirir (TEST_PLAN "Manuel Figma QA").
**Risk:** Orta. **Çözüm:** Figma manuel QA turu + ileride ince bir figma API adapter arayüzü ile mock'lanabilir hale getirme.

## TD-005 — Progress/iptal — ÇÖZÜLDÜ (Sprint 2)

**Durum:** Kapandı. `PROGRESS` mesajı + `onProgress`/`shouldCancel` + UI progress bar/iptal eklendi (B-04/05/06).

## TD-007 — Kategori "mute" oturumlar arası kalıcı değil

**Durum:** Açık (D-04 kısmi)
Kategori filtresi gizlemeyi sağlıyor ama seçim oturum içinde; clientStorage
settings ile kalıcılık yapılmadı.
**Risk:** Düşük. **Çözüm:** `SET_SETTINGS` mesajı + clientStorage settings key (Sprint 3/4).

## TD-009 — Monorepo packages extraction ertelendi (H-01/02/03)

**Durum:** Açık (DEC-026)
Diff-engine/schemas hâlâ `plugin/src` altında; `packages/` ayrımı Faz 2 öncesi
refactor adımına ertelendi. Core zaten Figma-bağımsız ve izole.
**Risk:** Düşük. **Çözüm:** Faz 2 hazırlık adımı; TS project references.

## TD-010 — Telemetri lokal özet UI yok (G-06)

**Durum:** Açık
Telemetri emit ediliyor (console, opt-in) ama lokal özet görünümü (G-06)
yapılmadı; Faz 2'de dashboard'a taşınacak.
**Risk:** Düşük. **Çözüm:** Faz 2 dashboard veya basit lokal sayaç görünümü.

## TD-011 — Release durumları: Archived UI yok (E-08 kısmi)

**Durum:** Açık
`buildRelease` draft/published destekliyor; Archived geçişi için UI yok.
**Risk:** Düşük. **Çözüm:** Release history'de arşivle aksiyonu (Sprint sonrası).

## TD-012 — Faz 2 backend kodu geçici olarak plugin repo'sunda

**Durum:** Açık (DEC-027)
`plugin/src/backend/` altındaki domain/authz/crypto/api-client, mevcut test
altyapısını kullanmak için geçici olarak plugin repo'sunda. Plugin bundle'ına
sızmıyor (esbuild entry'lerinden erişilmiyor — doğrulandı) ama mimari olarak
`apps/web`'e ait.
**Risk:** Düşük. **Çözüm:** Monorepo split ile `apps/web`'e taşı (TD-009 ile birlikte).

## TD-008 — UI a11y ve plugin runtime Figma-manuel doğrulanıyor

**Durum:** Kabul edilen sınırlama
React UI (progress, filtre, dialog, a11y attribute'ları) ve plugin-thread
davranışı (progress/cancel/select-node/font-tolerance/quota) node ortamında
test edilemiyor; saf mantık (review, error-catalog, messages) tam testli.
**Risk:** Orta. **Çözüm:** Figma manuel QA turu (TEST_PLAN) + F-06 kontrast CI (Sprint 3) + ileride jsdom+RTL.

## TD-006 — `letterSpacing`/`fontName.style` fidelity (loader)

**Durum:** Açık
Loader `letterSpacing`'i her zaman PIXELS, `fontName.style`'ı yoksa fontWeight'ten
türetiyor (REST'te net değil). Kalibrasyon için kabul edilebilir.
**Risk:** Düşük. **Çözüm:** Gerçek export alanlarına göre ince ayar.
