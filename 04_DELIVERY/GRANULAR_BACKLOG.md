# Granular Backlog — Atomik Görevler

Bu, `IMPLEMENTATION_BACKLOG.md` epiclerinin ≤1 saatlik, tek başına geliştirilebilir, test edilebilir ve tek commit'e sığan görevlere bölünmüş halidir.

## Görev sözleşmesi

Her görev şu dört kuralı sağlar:

- **≤ 1 saat:** Tek oturumda bitirilebilir. Büyük iş bölünmüştür.
- **Bağımsız:** Yalnızca listelenen bağımlılıklar tamamsa başlar; başka görevi beklemez.
- **Test edilebilir:** "Test" sütunundaki doğrulama yazılır (unit/fixture/manuel).
- **Commit edilebilir:** "Commit" sütunu tek bir Conventional Commit mesajıdır.

**Durum:** ✅ prototipte tamam · ⬜ yapılacak.
**Tahmin:** S ≤ 30 dk · M ≤ 60 dk.
**Bağ.:** ön koşul görev ID'leri (— = yok).

> Faz 1 çekirdek döngüsü (Select → Snapshot → Change → Scan → Review → Export) prototipte çalışıyor. Aşağıdaki görevler onu **sevk edilebilir ürüne** taşır ve Faz 2'yi hazırlar.

---

## EPIC A — Diff doğruluğu & gürültü kalibrasyonu  *(review önceliği #1)*

| ID | Görev | Test | Commit | Bağ. | Süre |
| --- | --- | --- | --- | --- | --- |
| ✅ A-01 | Gerçek Figma export JSON'unu core testkit'e yükleyen fixture loader | Loader 1 dosyayı snapshot'a çevirir | `feat(core): add Figma-export fixture loader` | — | M |
| ✅ A-02 | 3 gerçek handoff dosyasının önce/sonra çiftlerini `fixtures/real/` altına ekle | Çiftler parse ediliyor | `test(core): add real handoff fixture pairs` | A-01 | M |
| ✅ A-03 | False-positive ölçüm harness'i (değişmeyen çift → 0 modified) | Oran < %1 raporlanır | `test(core): add false-positive measurement harness` | A-02 | M |
| ✅ A-04 | Eşleştirme doğruluğu harness'i (rename/reorder) | add+remove yerine modified ≥ %98 | `test(core): add match-accuracy harness` | A-02 | M |
| ✅ A-05 | Reorder yalnız `structural`, absolute pos gürültüsü ayrı | Reorder → sadece structural change | `fix(core): treat child reorder as structural only` | A-04 | M |
| ✅ A-06 | Detach-instance senaryosu davranışını tanımla + test | Detach → beklenen kind | `test(core): cover detached instance matching` | A-04 | M |
| ✅ A-07 | Component-key eşleştirmesini matcher'a ekle (swap desteği) | Swap → modified/component | `feat(core): add component-key node matching` | A-04 | M |
| ✅ A-08 | Child-position gürültü filtresini config parametresi yap | Toggle açık/kapalı test | `feat(core): make child-position noise filter configurable` | A-05 | M |
| ✅ A-09 | Parent-resize kaynaklı child x/y gürültü bastırma (opsiyonel) | Resize → child pos change bastırılır | `feat(core): suppress parent-resize child position noise` | A-08 | M |
| ✅ A-10 | Kalibrasyon sonucu raporunu README/TEST_PLAN'a işle | Rapor dosyası üretiliyor | `docs(test): record diff calibration results` | A-03,A-04 | S |

---

## EPIC B — Performans, ölçek, dayanıklılık

| ID | Görev | Test | Commit | Bağ. | Süre |
| --- | --- | --- | --- | --- | --- |
| ✅ B-01 | Node sayacı + yumuşak eşik (2.000) uyarı payload'u | 2.001 node → uyarı | `feat(plugin): warn on soft scope-size threshold` | — | S |
| ✅ B-02 | `SCOPE_TOO_LARGE` sert eşik (10.000) hatası | Eşik aşımı → hata, baseline korunur | `feat(plugin): block oversized scope safely` | B-01,C-01 | M |
| ✅ B-03 | Async/chunked traversal (her N node yield) | Bloklama < 50 ms ölçülür (Figma-manuel) | `perf(plugin): chunk node traversal to avoid UI block` | — | M |
| ✅ B-04 | `PROGRESS` mesaj tipini contract'a ekle | Zod schema geçer | `feat(shared): add PROGRESS message type` | — | S |
| ✅ B-05 | UI progress göstergesi + aria-live | Progress render + duyuru (runtime Figma-manuel) | `feat(ui): show scan progress with live region` | B-03,B-04 | M |
| ✅ B-06 | Tarama iptali (`CANCEL_SCAN`) | İptal sonrası state temiz | `feat(plugin): support scan cancellation` | B-03 | M |
| ✅ B-07 | Large-frame perf fixture + zamanlı test | 2.000 node < 2 s (NFR) | `test(plugin): add large-frame performance test` | B-03 | M |
| ✅ B-08 | Traversal döngü/derinlik koruması (visited set) | Aşırı derinlik → guard | `fix(plugin): guard traversal depth and cycles` | — | S |
| ✅ B-09 | Storage kota degradasyonu (yazma reddi, baseline intact) | Mock kota dolu → STORAGE_ERROR, veri durur (runtime Figma-manuel) | `fix(plugin): degrade gracefully on storage quota` | C-01 | M |
| ✅ B-10 | Snapshot boyut ölçümü + >3 MB uyarısı | 3 MB üstü → uyarı | `feat(plugin): warn on oversized snapshot` | — | S |

---

## EPIC C — Hata sözleşmesi, migration, re-baseline güvenliği

| ID | Görev | Test | Commit | Bağ. | Süre |
| --- | --- | --- | --- | --- | --- |
| ✅ C-01 | `PluginErrorCode` enum'unu genişlet (5 yeni kod) | Schema validate, mevcut kodlar bozulmaz | `feat(shared): extend plugin error codes` | — | S |
| ✅ C-02 | ERROR_CATALOG mesajlarını tek map'ten UI'a bağla | Her kod bir mesaj döndürür | `refactor(ui): source error copy from catalog map` | C-01 | M |
| ✅ C-03 | `BASELINE_CORRUPT` UI kurtarma akışı | Bozuk veri → mesaj, veri durur | `feat(ui): handle corrupt baseline recovery` | C-02 | M |
| ✅ C-04 | Re-baseline yıkıcı-onay diyaloğu | Onaysız baseline değişmez | `feat(ui): confirm destructive re-baseline` | C-02 | M |
| ✅ C-05 | Atomik baseline değiştirme (yazma-öncesi doğrulama) | Yazma başarısız → eski baseline durur | `fix(plugin): make baseline replace atomic` | — | M |
| ✅ C-06 | `FONT_ACCESS_ERROR`: property atla, akış sürer | Font hata mock → diğer diff'ler gelir (try/catch; runtime Figma-manuel) | `fix(plugin): tolerate font access errors` | C-01 | M |
| ✅ C-07 | Migration registry + runner iskeleti | v1 passthrough testi | `feat(shared): add snapshot migration runner` | — | M |
| ✅ C-08 | İleri versiyon reddi (`SCHEMA_VERSION_UNSUPPORTED`) | v2 snapshot v1 plugin → hata, veri korunur | `feat(shared): reject unsupported schema versions` | C-07 | S |
| ✅ C-09 | Migration round-trip test iskeleti (v1 fixture) | v1 fixture → migrate → doğrula | `test(shared): add migration round-trip scaffold` | C-07 | S |

---

## EPIC D — Review UX & gürültü yönetimi

| ID | Görev | Test | Commit | Bağ. | Süre |
| --- | --- | --- | --- | --- | --- |
| ✅ D-01 | Toplu include/exclude (tümü / grup) | Toggle state doğru | `feat(ui): add bulk include/exclude` | — | S |
| ✅ D-02 | Kategoriye göre filtre | Filtre listesi doğru | `feat(ui): filter changes by category` | — | M |
| ✅ D-03 | Impact'e göre filtre + sıralama | Sıra/filtre doğru | `feat(ui): filter and sort by impact` | — | S |
| ◑ D-04 | Kategori "sustur" (mute) + kalıcılık | Mute persist, gizlenir | `feat(ui): mute change categories persistently` | D-02 | M |
| ✅ D-05 | Change card → canvas zoom-to-node (`SELECT_NODE`) | Contract + plugin node seç/zoom | `feat(plugin): zoom to node from change card` | B-04 | M |
| ✅ D-06 | Node adına göre arama kutusu | Arama filtreler | `feat(ui): add change search box` | — | S |
| ✅ D-07 | Include state'ini export'a yansıt (excluded hariç) | Export excluded'ı içermez | `feat(ui): respect include selection in export` | — | M |

> ◑ D-04: Kategori gizleme (filtre) çalışıyor; **oturumlar arası kalıcılık** (mute persist) yapılmadı → TD-007.

---

## EPIC E — Release döngüsü (Publish)

| ID | Görev | Test | Commit | Bağ. | Süre |
| --- | --- | --- | --- | --- | --- |
| ✅ E-01 | Release veri modeli + Zod (`releases` key) | Schema validate | `feat(shared): add release schema` | — | M |
| ✅ E-02 | Release formu UI (ad, version, tür, açıklama) | Form doğrulama | `feat(ui): add release form` | E-01 | M |
| ✅ E-03 | Publish: seçili diff'ler → release kaydı | Publish → releases'e eklenir | `feat(plugin): publish selected changes as release` | E-01,D-07 | M |
| ✅ E-04 | Publish sonrası snapshot yeni baseline olur | Publish → baseline güncel, atomik | `feat(plugin): promote snapshot to baseline on publish` | E-03,C-05 | M |
| ✅ E-05 | Release JSON export (release changes changeset export'a dahil) | Re-parse edilebilir | `feat(plugin): export release as JSON` | E-01 | S |
| ✅ E-06 | Yerel release geçmişi (Releases listesi) | Liste render | `feat(ui): show local release history` | E-01 | M |
| ✅ E-07 | Release türü önerisi (max impact → tür) | Mapping doğru | `feat(core): suggest release type from impact` | E-01 | S |
| ◑ E-08 | Durum geçişleri Draft→Published→Archived | Published çalışıyor; Archived UI yok → TD-011 | `feat(plugin): support release status transitions` | E-03 | M |

---

## EPIC F — Erişilebilirlik (WCAG 2.1 AA)

| ID | Görev | Test | Commit | Bağ. | Süre |
| --- | --- | --- | --- | --- | --- |
| ✅ F-01 | Klavye tab sırası audit + düzelt | Fareyle dokunmadan tam akış (native tab order; a11y QA manuel) | `fix(ui): correct keyboard tab order` | — | M |
| ✅ F-02 | Görünür focus halkası (light+dark) | Focus her yerde görünür | `fix(ui): ensure visible focus ring` | — | S |
| ✅ F-03 | Renkten bağımsız durum (etiket+ikon) | Gri tonlamada anlaşılır | `fix(ui): convey state without color alone` | — | S |
| ✅ F-04 | Tarama sonucu `aria-live` duyurusu | Ekran okuyucu okur | `feat(ui): announce scan results via live region` | — | S |
| ✅ F-05 | Hata `role="alert"` duyurusu | Hata anında okunur | `fix(ui): announce errors with role alert` | — | S |
| ✅ F-06 | Kontrast token denetimi | AA'dan geçer (marka mavisi #0d99ff→#005a9e düzeltildi) | `test(ui): add contrast token check` | — | M |
| ✅ F-07 | include checkbox erişilebilir ad | "Include {node}" adı | `fix(ui): label include toggles accessibly` | — | S |
| ✅ F-08 | `prefers-reduced-motion` desteği | Azaltılmış hareket saygı | `fix(ui): honor reduced-motion preference` | — | S |

---

## EPIC G — Metrik / telemetri (opt-in)

| ID | Görev | Test | Commit | Bağ. | Süre |
| --- | --- | --- | --- | --- | --- |
| ✅ G-01 | Telemetri opt-in ayarı (header toggle), varsayılan kapalı | Varsayılan kapalı | `feat(ui): add opt-in telemetry setting` | — | S |
| ✅ G-02 | Event şeması + Zod (scopeHash, sayısal) | Schema validate | `feat(shared): add telemetry event schema` | — | S |
| ✅ G-03 | Event emitter (kapalıyken no-op) | Kapalı → 0 event | `feat(core): add no-op-safe event emitter` | G-01,G-02 | M |
| ✅ G-04 | `scopeHash` geri-döndürülemez hash | Aynı scope → aynı hash, geri dönmez | `feat(core): hash scope id for telemetry` | G-02 | S |
| ✅ G-05 | baseline/scan/publish event'lerini bağla | Aksiyon → event | `feat(plugin): emit lifecycle telemetry events` | G-03,G-04 | M |
| ◑ G-06 | Lokal özet görünümü (opsiyonel) | Emit var (console); özet UI yok → TD-010 | `feat(ui): show local metrics summary` | G-05 | M |

---

## EPIC H — Refactor / monorepo hazırlığı

| ID | Görev | Test | Commit | Bağ. | Süre |
| --- | --- | --- | --- | --- | --- |
| ⏸ H-01 | Diff motorunu `packages/diff-engine`'e taşı | Ertelendi (DEC-026/TD-009) | `refactor(repo): extract diff-engine package` | — | M |
| ⏸ H-02 | Shared schema'yı `packages/schemas`'e taşı | Ertelendi (DEC-026/TD-009) | `refactor(repo): extract schemas package` | H-01 | M |
| ⏸ H-03 | TS project references kur | Ertelendi (DEC-026/TD-009) | `chore(repo): add tsconfig project references` | H-02 | M |
| ✅ H-04 | CI pipeline (typecheck + test + build) | `.github/workflows/ci.yml` | `chore(ci): add verify pipeline` | — | M |

---

## EPIC I — Faz 2: Private Team App  *(ön koşul: SECURITY_AND_PRIVACY uyum listesi ✅)*

| ID | Görev | Test | Commit | Bağ. | Süre |
| --- | --- | --- | --- | --- | --- |
| ⏸ I-01 | Next.js app scaffold | **Provisioning-blocked** (hosting/ağır kurulum) | `feat(web): scaffold next.js app` | — | M |
| ◑ I-02 | OAuth = Figma (DEC-028); authorize + token-exchange builder | `backend/oauth-figma.ts` testli; callback/secret deploy'da | `feat(web): configure oauth provider` | I-01 | M |
| ⏸ I-03 | OAuth callback + oturum | **Blocked**: secret/hosting (builder hazır) | `feat(web): handle oauth callback and session` | I-02 | M |
| ✅ I-04 | DB şeması (workspace/project/release/ack) | `apps/web/prisma/schema.prisma` + `backend/domain.ts` (Zod); migration deploy'da | `feat(web): add database schema` | I-01 | M |
| ◑ I-05 | Workspace/release servis mantığı | `backend/services.ts` + repository (in-memory testli); HTTP route deploy'da | `feat(web): add workspace api` | I-03,I-04 | M |
| ✅ I-06 | Tenant izolasyon (authz) + test | Çapraz erişim reddi (`backend/authz.ts`, testli) | `feat(web): enforce tenant isolation` | I-04 | M |
| ✅ I-07 | Token/at-rest şifreleme yardımcıları | AES-GCM round-trip testli (`backend/crypto.ts`) | `feat(web): add at-rest encryption for secrets` | I-04 | M |
| ✅ I-08 | Plugin API client (injected fetch) | İstemci istek atar + parse (`backend/api-client.ts`, mock-testli) | `feat(plugin): add backend api client` | E-03 | M |
| ◑ I-09 | Release publish servis + client | `services.publishRelease` + `api-client` testli; HTTP route deploy'da | `feat(web): add release publish endpoint` | I-05,I-08 | M |
| ✅ I-10 | Release timeline UI | `/releases` listesi (canlı) | `feat(web): add release timeline` | I-09 | M |
| ✅ I-11 | Release detail view | `/releases/[id]` — release + değişiklik listesi | `feat(web): add release detail view` | I-10 | M |
| ✅ I-12 | Developer acknowledgement (reviewed) | AckPanel "İncelendi işaretle" → POST ack | `feat(web): add developer acknowledgement` | I-11 | M |
| ✅ I-13 | Acknowledgement oranı (designer görünürlüğü) | Detay sayfasında oran + bar | `feat(web): show acknowledgement rate` | I-12 | M |
| I-14 | Slack webhook (minimal içerik) | Webhook tetiklenir | `feat(web): notify slack on publish` | I-09 | M |
| I-15 | Retention / silme akışı | Silme kaskadı çalışır | `feat(web): implement data retention and deletion` | I-04 | M |

---

## Özet ve sprint önerisi

**Toplam:** 77 atomik görev — A(10) B(10) C(9) D(7) E(8) F(8) G(6) H(4) I(15).

Önerilen sıra (STAFF_ENGINEER_REVIEW önceliklerine uyumlu):

1. **Sprint 1 — Güven:** EPIC A (kalibrasyon) — ürünün kaderi burada.
2. **Sprint 2 — Sağlamlık:** EPIC B + C (performans, hata, migration, re-baseline).
3. **Sprint 3 — Kullanılabilirlik:** EPIC D + F (gürültü yönetimi, erişilebilirlik).
4. **Sprint 4 — Yayınla:** EPIC E + G (release döngüsü, telemetri).
5. **Sprint 5 — Hazırlık:** EPIC H (monorepo/CI).
6. **Sprint 6+ — Paylaş:** EPIC I (Faz 2) — yalnızca güvenlik kapısı geçildikten sonra.

**Paralelleştirme:** F (erişilebilirlik) ve H-04 (CI) çoğu göreve bağımsız; boşta kalan kapasiteyle her sprintte ilerletilebilir. A ve B çekirdek olduğundan tek kişide toplanmalı; D/E/F ayrı geliştiricilere dağıtılabilir.
