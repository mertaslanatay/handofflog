# Decision Log

Cowork her önemli teknik veya ürün kararını aşağıdaki formatta eklemelidir.

---

## DEC-001 — Snapshot tabanlı karşılaştırma

**Durum:** Kabul edildi  
**Karar:** MVP, Figma Version History yerine Handofflog baseline snapshot'ını ana karşılaştırma kaynağı olarak kullanır.  
**Gerekçe:** Property seviyesinde deterministik karşılaştırma ve release kapsamı kontrolü gerekir.  
**Sonuç:** Snapshot schema versioning zorunludur.

---

## DEC-002 — Private plugin first

**Durum:** Kabul edildi  
**Karar:** İlk hedef marketplace ürünü değil, ekip içinde çalışan private plugin'dir.  
**Gerekçe:** Diff doğruluğu doğrulanmadan SaaS ve entegrasyon kapsamı büyütülmemelidir.

---

## DEC-003 — Prototip build zinciri: esbuild + vitest

**Durum:** Kabul edildi  
**Karar:** Plugin main (`dist/code.js`) ve UI (`dist/ui.html`) esbuild ile iki ayrı IIFE bundle olarak üretilir; UI JS tek HTML dosyasına inline edilir. Testler vitest ile `node` ortamında koşar.  
**Gerekçe:** Figma plugin'leri tek dosya `code.js` ve tek `ui.html` bekler; esbuild hızlı ve sıfır-config'e yakındır. Vitest `node` ortamı, core diff motorunun Figma/DOM'dan bağımsızlığını test seviyesinde garanti eder.  
**Alternatifler:** webpack (daha ağır), Figma resmi plugin template (React kurulumu manuel).  
**Sonuç:** `npm run verify` = typecheck + test + build tek kapı olarak kullanılır.

---

## DEC-004 — Deterministik hash için FNV-1a (non-crypto)

**Durum:** Kabul edildi  
**Karar:** Node fingerprint'i, canonical `stableStringify` çıktısı üzerinde 32-bit FNV-1a ile üretilir (SHA-256 yerine).  
**Gerekçe:** DIFF_ENGINE_SPEC "hızlı deterministik non-cryptographic hash" seçeneğini açıkça izinli kılar. İhtiyaç yalnızca değişmemiş node'ları hızla elemektir; kriptografik güç gerekmez ve WebCrypto async bağımlılığından kaçınılır.  
**Alternatifler:** SHA-256 (async, daha yavaş, gereksiz).  
**Sonuç:** Child tracking ID'leri node hash'ine dahil edilmez; yapısal (children) değişiklik ayrı bir structural PropertyChange olarak raporlanır.

---

## DEC-005 — Float gürültüsü: 3 ondalık hassasiyete yuvarlama

**Durum:** Kabul edildi  
**Karar:** Tüm sayısal property'ler serialization/karşılaştırma öncesi 3 ondalığa yuvarlanır; `-0` → `0` normalize edilir.  
**Gerekçe:** Figma layout hesapları sub-piksel gürültü üretir; yuvarlama false-positive diff'leri engeller.  
**Sonuç:** 375 → 375.0001 gibi farklar "değişiklik yok" olarak görülür (test ile doğrulandı).

---

## DEC-006 — Tracking ID kaynağı: node pluginData

**Durum:** Kabul edildi  
**Karar:** Stable tracking ID node üzerinde küçük bir `handofflog:tid` pluginData anahtarında saklanır; scopeId olarak root node'un tracking ID'si kullanılır.  
**Gerekçe:** Rename/yeniden konumlandırma sonrası eşleştirme için stabil kimlik gerekir. DATA_SCHEMA MVP'de küçük tracking ID yazımına izin verir; büyük snapshot pluginData'ya yazılmaz (clientStorage kullanılır).  
**Alternatifler:** Yalnızca nodeId (kopyalama/yeniden oluşturmada kırılır).  
**Sonuç:** Eşleştirme önceliği: trackingId → nodeId → parent+type+name imzası. Component-key eşleştirmesi MVP sonrasına ertelendi.

---

## DEC-007 — Storage dayanıklılığı: bozuk baseline silinmez

**Durum:** Kabul edildi  
**Karar:** `loadBaseline` bozuk/parse edilemeyen veriyle karşılaşırsa `corrupt` durumu döndürür ve saklanan byte'lara dokunmaz; hata kullanıcıya typed olarak iletilir.  
**Gerekçe:** ACCEPTANCE_CRITERIA ve master prompt: hata durumunda mevcut baseline silinmemelidir.  
**Sonuç:** Kullanıcı veri kaybı yaşamadan yeni baseline oluşturabilir.

---

## DEC-008 — Impact/kategori kuralları deterministik ve değerden bağımsız

**Durum:** Kabul edildi  
**Karar:** Kategori ve impact, property path'ine göre sabit tablolardan türetilir (ör. `type`→structural/breaking, `characters`→content/medium, `width`→layout/medium). Node impact'i, kind + property impact'lerinin maksimumudur.  
**Gerekçe:** Deterministik, tekrar üretilebilir changelog çıktısı; AI motoru diff'in yerine geçmez.  
**Sonuç:** Aynı değişiklik her zaman aynı kategori/impact/summary üretir (test ile doğrulandı).

---

## DEC-009 — Ölçülebilir non-functional hedefler zorunlu

**Durum:** Kabul edildi  
**Karar:** "Hızlı/kilitlenmesin" gibi ifadeler sayısal bütçeye bağlanır; `NON_FUNCTIONAL_REQUIREMENTS.md` tek kaynaktır. NFR ihlali release blocker'dır.  
**Gerekçe:** Ölçülemeyen hedef doğrulanamaz; performans regresyonu sessizce girer.  
**Sonuç:** Her performans hedefi için large-frame fixture + zaman ölçümlü test gerekir.

---

## DEC-010 — Hata sözleşmesi tek kaynak (Error Catalog)

**Durum:** Kabul edildi  
**Karar:** Her hata kodu için mesaj/kurtarma/tetikleyici `ERROR_CATALOG.md`'de tanımlanır; UI metni buradan gelir. Enum'a `SCOPE_TOO_LARGE`, `BASELINE_CORRUPT`, `SCHEMA_VERSION_UNSUPPORTED`, `FONT_ACCESS_ERROR`, `EXPORT_EMPTY` geriye uyumlu eklenir.  
**Gerekçe:** MESSAGE_CONTRACT yalnızca kodları veriyordu; UX tutarsızlığı ve boşluk riski vardı.  
**Sonuç:** Re-baseline yıkıcı-onay akışı zorunlu hale geldi.

---

## DEC-011 — Şema göç politikası ilk günden

**Durum:** Kabul edildi  
**Karar:** Sıralı, saf migration fonksiyonları; ileri versiyon reddedilir; migration başarısızsa veri korunur. `SCHEMA_MIGRATION.md` tek kaynak.  
**Gerekçe:** Snapshot kalıcı veri; sonradan eklenen göç mantığı veri kaybı riski taşır.  
**Alternatifler:** "Gerektiğinde ekleriz" (reddedildi — erken borç).

---

## DEC-012 — Faz 2 güvenlik kapısı

**Durum:** Kabul edildi  
**Karar:** `SECURITY_AND_PRIVACY.md` onaylanmadan Faz 2 (backend) kodu başlamaz. Publish anında veri-paylaşımı kullanıcıya bildirilir; telemetri opt-in.  
**Gerekçe:** Faz 2, Faz 1'in "lokal" garantisini tersine çevirir; token/retention/tenant izolasyonu önceden çözülmeli.  
**Sonuç:** Faz 2 uyum kontrol listesi eklendi.

---

## DEC-013 — Faz 1 kategori kapsamı sınırlı

**Durum:** Kabul edildi  
**Karar:** Faz 1 motoru Token/Prototype/Accessibility kategorilerini otomatik üretmez; yalnızca deterministik property→kategori tablosundakiler. `CATEGORY_IMPACT_MAPPING.md` tek kaynak.  
**Gerekçe:** RELEASE_MODEL beklentisi ile motor gerçekliği arasındaki boşluğu kapatmak; kapsam sürünmesini önlemek.  
**Sonuç:** UI/export bu kategorileri Faz 1'de göstermez; yol haritasında kalır.

---

## DEC-014 — "Anlamlı değişiklik" operasyonel tanımı

**Durum:** Kabul edildi  
**Karar:** Anlamlı değişiklik = include edilmiş + impact > low. Metrik ölçümlerinde bu tanım kullanılır.  
**Gerekçe:** Başarı metriği bu tanıma dayanıyor; belirsizse metrik anlamsız.  
**Sonuç:** METRICS_AND_ANALYTICS bu tanımı kullanır.

---

## DEC-015 — Telemetri varsayılan kapalı (opt-in), içerik toplanmaz

**Durum:** Kabul edildi  
**Karar:** Faz 1 varsayılan olarak ağ üzerinden hiçbir şey göndermez; telemetri opt-in. Event'ler yalnızca sayısal/anonim; doküman içeriği/isim/token asla toplanmaz.  
**Gerekçe:** Gizlilik ilkesi + kullanıcı güveni; içerik hassas olabilir.  
**Sonuç:** Event şeması `scopeHash` ve sayısal alanlarla sınırlı.

---

## DEC-016 — Sprint süresi: 1 hafta

**Durum:** Kabul edildi (kullanıcı onayı)
**Karar:** Sprint süresi 1 hafta (~25 görev kapasitesi). Backlog 5 sprinte bölündü: Faz 1 üç sprintte sevk, Faz 2 iki sprintte. Detay `04_DELIVERY/SPRINT_PLAN.md`.
**Gerekçe:** Görevler atomik (≤1h) olduğundan 1 hafta, her sprint sonunda çalışan/demo edilebilir ürün çıkaran en kısa sürdürülebilir kadans. Riskli işler (kalibrasyon, performans, veri kaybı) Sprint 1'e alındı.
**Alternatifler:** 3 iş günü (çok sıkışık entegrasyon/test), 2 hafta ("minimal tut" isteğine ters).
**Sonuç:** Ekip büyürse süre sabit, sprint sayısı düşer.

---

## DEC-017 — Kalibrasyon fixture'ları başlangıçta temsili

**Durum:** Kabul edildi (kısıt kaynaklı)
**Karar:** A-02 gerçek handoff çiftleri, geliştirme ortamında canlı Figma hesabına erişim olmadığından REST formatında **temsili** olarak yazıldı (`fixtures/real/checkout|card|nav`). Loader ve harness gerçek export'la birebir çalışacak biçimde tasarlandı.
**Gerekçe:** İlerlemeyi bloke etmeden A-01/A-03/A-04 zincirini kurmak; format ve boru hattı gerçek veriyle aynı.
**Alternatifler:** Kullanıcıdan gerçek dosya beklemek (bloke eder); adımı atlamak (harness temelsiz kalır).
**Sonuç:** Güvenilir doğruluk sayıları için bu fixture'lar gerçek export'larla değiştirilmeli (yakalama adımları `fixtures/real/README.md`). **Risk olarak A-03/A-04'e taşındı.**

---

## DEC-018 — Bug düzeltmesi: node `type` değişimi diff'te yakalanmıyordu

**Durum:** Kabul edildi (Sprint 1)
**Karar:** Diff motoru `name` farkını yakalıyor ama `type` farkını hiç karşılaştırmıyordu; INSTANCE→FRAME (detach) gibi type değişiklikleri sessizce "unchanged" sayılıyordu. `compareType` eklendi (kategori structural, impact breaking).
**Gerekçe:** A-06 için önce failing test yazıldı, kök neden bulundu, düzeltildi (regression test kalıcı). CATEGORY_IMPACT_MAPPING type→breaking beklentisiyle uyumlu.
**Sonuç:** Silinen/eklenen değil, gerçek modified/breaking olarak raporlanıyor.

---

## DEC-019 — `componentKey` additive şema alanı + component-key eşleştirmesi

**Durum:** Kabul edildi (Sprint 1)
**Karar:** `NodeSnapshot`'a opsiyonel `componentKey` eklendi (hash'e dahil DEĞİL, yalnızca eşleştirme metadata'sı). Matcher önceliği: trackingId → nodeId → **componentKey** → signature (DIFF_ENGINE_SPEC ile uyumlu).
**Gerekçe:** Instance id değişse/rename olsa bile aynı bileşenin eşleşmesi (A-07). Additive+optional olduğundan SCHEMA_MIGRATION'a göre versiyon artmaz.
**Sonuç:** Şu an loader/test yolunda aktif; canlı plugin doldurması TD-002 olarak açık.

---

## DEC-020 — Child-position gürültü modları

**Durum:** Kabul edildi (Sprint 1)
**Karar:** `DiffOptions.positionNoise`: `report` (varsayılan), `suppress`, `suppress-on-parent-resize`. Varsayılan faithful (`report`); gerçek veriyle kalibre edilince önerilen `suppress-on-parent-resize`.
**Gerekçe:** Parent-resize kaynaklı child x/y kayması en yaygın gürültü kaynağı (A-08/A-09). Deterministik ve konfigüre edilebilir; varsayılanı değiştirmek veri gerektirir.
**Sonuç:** CALIBRATION_RESULTS'ta önerilen varsayılan not edildi.

---

## DEC-021 — Snapshot traversal async + chunked + guarded (public API değişimi)

**Durum:** Kabul edildi (Sprint 1)
**Karar:** `buildSnapshot` artık `Promise<BuildSnapshotResult>` döndürüyor; `TRAVERSAL_CHUNK` node'da bir main-thread'e yield ediyor, `MAX_TRAVERSAL_DEPTH` derinlik guard'ı ve nodeId-cycle guard'ı var. Scope boyutu `countNodes`+`evaluateScopeSize` ile gate'leniyor.
**Gerekçe:** NFR §1/§2 — büyük frame'de UI donmasın; runaway recursion/cycle koruması. `buildSnapshot` yalnızca plugin main'de çağrılıyor (call-site'lar await'e çevrildi).
**Sonuç:** Runtime doğrulama Figma-manuel (TD-004); saf limit/guard mantığı unit testli.

---

## DEC-022 — Review mantığı saf modülde; UI ince kabuk

**Durum:** Kabul edildi (Sprint 2)
**Karar:** Filtre/sıralama/arama/exclusion mantığı `core/review.ts` içinde saf (Figma/DOM bağımsız) fonksiyonlar olarak yazıldı; React UI bunları çağıran ince kabuk. Aynı `excludeFromChangeSet` plugin export'unda da kullanılıyor (D-07 tek kaynak).
**Gerekçe:** UI'ı node ortamında test edememe sınırını, mantığı saf katmana taşıyarak aştık (%97 review coverage). DOM test altyapısı (jsdom) eklemeden yüksek güven.
**Sonuç:** React bileşenleri typecheck+build ile doğrulanıyor; a11y/runtime Figma-manuel (TD-008).

---

## DEC-023 — Progress/cancel/select-node kontrat genişletmesi

**Durum:** Kabul edildi (Sprint 2)
**Karar:** Contract'a `PROGRESS` (main→UI), `CANCEL_SCAN`/`SELECT_NODE` (UI→main) ve `EXPORT_JSON.excludedTrackingIds` eklendi. `buildSnapshot` chunk sınırında `onProgress`/`shouldCancel` çağırıyor; iptal `CancelledError` ile kooperatif.
**Gerekçe:** NFR §1 (progress), B-06 (iptal), D-05 (zoom-to-node), D-07 (export exclusion). Hepsi typed+Zod-validated.
**Sonuç:** Exhaustiveness guard yeni mesajları derleme anında yakaladı (güvenli genişletme).

---

## DEC-024 — Release modeli + publish, snapshot'ı baseline'a terfi ettirir

**Durum:** Kabul edildi (Sprint 3)
**Karar:** `shared/release.ts` (Zod) + `core/release.ts` (saf `buildRelease`/`suggestReleaseType`). Publish, seçili (excluded hariç) değişiklikleri versiyonlu Release'e paketler, `handofflog:releases:<scopeId>`'e prepend eder ve **taranan snapshot'ı yeni baseline'a terfi ettirir** (validated + atomik). Release türü impact'ten önerilir ama kullanıcı ezebilir.
**Gerekçe:** Temel döngüyü Publish→Acknowledge yönünde tamamlamak (Flow C); METRICS "meaningful change" payda ölçümü.
**Sonuç:** Durum kümesi MVP'de Draft/Published; Archived UI'ı ertelendi (E-08 kısmi).

---

## DEC-025 — Telemetri opt-in, varsayılan kapalı, lokal-only sink

**Durum:** Kabul edildi (Sprint 3)
**Karar:** `core/telemetry.ts` emitter, `isEnabled()` false iken hiçbir şey üretmez. Faz 1'de sink yalnızca lokal (console); ağ yok. `scopeHash` = fnv1a (geri döndürülemez gruplama). Ayar clientStorage settings'te saklanır.
**Gerekçe:** SECURITY_AND_PRIVACY + METRICS: içerik toplanmaz, varsayılan kapalı, kullanıcı kontrolü.
**Sonuç:** Faz 2 forwarding için iskele hazır; G-06 lokal özet UI ertelendi (TD-010).

---

## DEC-026 — Monorepo `packages/` extraction Faz 1 sevkinden sonraya ertelendi

**Durum:** Kabul edildi (Sprint 3)
**Karar:** H-01/02/03 (diff-engine ve schemas'ı `packages/`e taşıma) ertelendi; H-04 (CI) uygulandı.
**Gerekçe:** Faz 1 sevkinin hemen öncesinde tüm import yollarını değiştirmek çalışan build'i geniş çaplı kırma riski taşır, kullanıcıya anlık değer katmaz. SPRINT_PLAN "H ertelenebilir" diyor. En güvenli/sürdürülebilir karar.
**Sonuç:** Faz 2 öncesi ayrı bir refactor adımında yapılacak (TD-009). Core zaten `src/core` altında izole ve Figma-bağımsız.

---

## DEC-027 — Faz 2 güvenlik temeli önce, provider-agnostik & in-repo (geçici)

**Durum:** Kabul edildi (Sprint 4 kısmi)
**Karar:** Faz 2'nin sağlanabilir/testable güvenlik çekirdeği önce yazıldı: tenant izolasyon authz, AES-GCM at-rest şifreleme (Web Crypto), domain Zod modeli, plugin→backend API client (injected fetch). Kod `plugin/src/backend/` altında geçici olarak duruyor (mevcut test altyapısını kullanmak için); monorepo split'te `apps/web`'e taşınacak (TD-009/TD-012). Stack PHASE_02'deki gibi (Next.js, PostgreSQL, OAuth, object storage, Slack) — mimari zaten kararlı; kod bunlara **soyutlama** ile bağlı (fetch/DB/OAuth enjekte edilir), somut sağlayıcıya bağlı değil.
**Gerekçe:** OAuth secret'ları, canlı DB ve hosting bu ortamda yok ve gerçek kullanıcı verisi/ücretli servis kararları kullanıcı onayı gerektirir (stop-condition). Sağlayıcıdan bağımsız güvenlik temeli bunlara dokunmadan tam test edilebilir.
**Sonuç:** I-06/I-07/I-08 + domain uygulandı ve testlendi. I-01 (Next.js scaffold), I-02/03 (OAuth), I-05/09 (canlı API/DB) **provisioning'e bağlı** — kullanıcıya kimlik sağlayıcı, hosting ve retention kararları sorulacak.

---

## DEC-028 — Faz 2 sağlayıcı seçimleri (kullanıcı onayı)

**Durum:** Kabul edildi (kullanıcı)
**Karar:** Kimlik = **Figma OAuth** (`file_read` scope); barındırma = **Vercel + hosted Postgres** (Neon/Supabase, Prisma); ilerleme = **kod + soyutlama + testler** (gerçek deploy'u kullanıcı yapar). Backend mantığı repository/service soyutlamasıyla DB/framework-bağımsız yazıldı; Next.js route'ları ince sarmalayıcı olacak.
**Gerekçe:** PHASE_02 ile uyumlu, en düşük sürtünme; secret/hosting/gerçek veri bu ortamda yok, kod tarafı tam test edilebilir.
**Sonuç:** `apps/web/prisma/schema.prisma` (I-04) + `backend/{repository,services,oauth-figma}` (I-05/09/12/13 mantığı + I-02 builder) uygulandı ve testlendi. Route wiring + canlı migration + OAuth secret/callback deploy adımında.

---

## DEC-029 — Plugin↔backend kimlik: hash'lenmiş bağlantı token'ı

**Durum:** Kabul edildi (Sprint 5)
**Karar:** Web app, kullanıcının workspace+project'ine bağlı rastgele bir "connection token" üretir; yalnızca SHA-256 hash'i saklanır (ham token bir kez gösterilir). Plugin ham token'ı clientStorage settings'te saklar ve Publish'te `Authorization: Bearer` ile gönderir; backend workspace/project/user'ı token'dan çözer. Plugin hiçbir zaman workspace/project id göndermez.
**Gerekçe:** Figma plugin'inde tam OAuth oturumu taşımak karmaşık; token-paste akışı MVP için en basit güvenli yol. Hash saklama sızıntı riskini azaltır.
**Alternatifler:** Plugin içi OAuth (karmaşık), paylaşılan API key (daha az güvenli).
**Sonuç:** `backend/tokens.ts` + `publishReleaseWithToken` testli; plugin push best-effort (offline'da yerel yayın korunur). Token revocation UI'ı sonraya (TD).

---

## DEC-030 — Faz 2 canlıya alındı (uçtan uca doğrulandı)

**Durum:** Kabul edildi (canlı)
**Karar:** Web app Vercel'de yayında (`handofflog-lime.vercel.app`), Neon Postgres bağlı, Figma OAuth ile giriş çalışıyor; plugin bağlantı token'ıyla backend'e publish ediyor ve release web `/releases`'te görünüyor.
**Yol boyunca çözülen canlı-yapılandırma sorunları (gelecek referansı):**
- Iki-paket zod çözümü: `next.config` webpack alias + tsconfig path; build-time TS/ESLint kontrolü geçici kapatıldı (TD-013).
- Doğru domain `handofflog-lime.vercel.app` (eski `handofflog.vercel.app` dummy projede kaldı); env + Figma redirect + manifest + `BACKEND_BASE_URL` buna göre.
- Figma OAuth scope = `current_user:read` (eski `file_read`/`files:read` "Invalid scopes for app").
- Figma redirect URL uygulamada birebir kayıtlı olmalı.
- Vercel env değerleri boş eklenmişti (`FIGMA_OAUTH_CLIENT_ID`, `SESSION_SECRET`) → girildi + redeploy. ("Zero-length key" = boş SESSION_SECRET.)
- Plugin→backend CORS: `POST /api/releases` için OPTIONS + CORS başlıkları eklendi.
**Sonuç:** Faz 2 temel akışı (Publish→timeline) sevk edildi. Kalan UI/özellikler opsiyonel.

## DEC-031 — Kapsam genişlemesi: Visual Design Change Tracking

**Durum:** Önerildi (ürün sahibi talebi) — depolama kararı bekliyor
**Karar:** Ürün, metinsel changelog'un yanında **görsel diff** (önceki/şimdiki ekran görüntüsü yan yana + değişen alanda mor-dashed highlight), **page-bazlı tarama**, **release metadata** ve **aktif proje/dosya algılama** ile "Visual Design Change Tracking Platform"a genişletiliyor. Bu, PRD/RELEASE_MODEL'deki "pixel-level visual diff MVP-dışı" kararını **bilinçli olarak geçersiz kılar** (ürün sahibi kararı).
**Mimari sonuç (kritik):** "Previous version" görselini gösterebilmek için **baseline anında ekran görüntüsü yakalanıp saklanmalı** (`node.exportAsync` PNG). Snapshot'lar şu an görsel tutmuyor. Görsellerin nereye saklanacağı bir depolama/maliyet kararı: Figma `clientStorage` (kota ~5MB, birkaç frame) vs web object storage (Vercel Blob/S3 — provisioning). Bu netleşmeden görsel-diff boru hattı yazılmayacak.
**Şimdilik yapıldı (depolamadan bağımsız):** relative-time (Feature 2) + ekran-bazlı gruplama/sayım (Feature 4/5) çekirdek yardımcıları, testli.
**Kalan tasklar:** `04_DELIVERY/SPRINT_VISUAL_DIFF.md`.

## TD-013 — Web build'inde TS/ESLint kontrolü kapalı

**Durum:** Açık
`next.config` `ignoreBuildErrors`/`ignoreDuringBuilds` açık (cross-package tip artefaktı yüzünden). Kod plugin projesinde strict + testli. Monorepo split'inden (TD-009) sonra kapatılıp gerçek build-time tip kontrolü geri açılmalı.
**Risk:** Orta. **Çözüm:** TD-009 ile birlikte.

**Durum:** Önerildi / Kabul edildi / Değiştirildi  
**Karar:**  
**Gerekçe:**  
**Alternatifler:**  
**Sonuç:**
