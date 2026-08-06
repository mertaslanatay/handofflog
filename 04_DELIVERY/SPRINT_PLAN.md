# Sprint Plan

`GRANULAR_BACKLOG.md`'deki 77 atomik görevin sprint'lere bölünmüş hali.

## Parametreler

- **Sprint süresi:** 1 hafta (onaylı — DEC-016). 5 iş günü ≈ 25 görev kapasitesi.
- **Varsayım:** 1 geliştirici, ~5 odaklı saat/gün. Ekip büyürse süre sabit kalır, sprint sayısı düşer.
- **Kural 1 — Her sprint sonunda çalışan ürün:** Her sprint demo edilebilir, sevk edilebilir bir artışla biter.
- **Kural 2 — Risk erken:** En belirsiz işler (eşleştirme doğruluğu, büyük dosya performansı, veri kaybı) Sprint 1'e alınır.
- **Kural 3 — Bağımlılık:** Bir görevin ön koşulu aynı veya önceki sprinttedir (doğrulandı).

## Yol haritası (özet)

| Sprint | Tema | Görev | Çalışan ürün çıktısı |
| --- | --- | --- | --- |
| 1 | Risk & Doğruluk | 21 | Gerçek dosyalarda doğru, güvenli, donmayan diff |
| 2 | Dayanıklılık & Review UX | 22 | Tüm hata durumları zarif; gürültü elenebilir; erişilebilir |
| 3 | Yayınla & Faz 1 kapanış | 19 | Tam Publish döngüsü, WCAG AA, telemetri, CI → **Faz 1 sevk** |
| 4 | Faz 2 temel | 9 | Giriş + workspace + release backend'e publish |
| 5 | Faz 2 tüketim | 6 | Timeline, detay, acknowledgement, bildirim, retention |

---

## Sprint 1 — Risk & Doğruluk  *(21 görev)*

**Sprint hedefi:** Ürünün kaderi olan diff doğruluğunu gerçek dosyalarla kanıtla; büyük dosyada donmayı ve veri kaybını mimari olarak imkânsız kıl.

**Neden erken:** Eşleştirme/gürültü doğruluğu ve büyük-dosya performansı ürünün en büyük belirsizliği. Yanlışsa her şey çöker — o yüzden ilk hafta.

- **Kalibrasyon (EPIC A):** A-01, A-02, A-03, A-04, A-05, A-06, A-07, A-08, A-09, A-10
- **Performans & ölçek (EPIC B):** B-01, B-02, B-03, B-07, B-08, B-10
- **Veri kaybı güvenliği (EPIC C):** C-01, C-05, C-07, C-08, C-09

**Çalışan ürün:** Prototip döngüsü + gerçek handoff dosyalarında kalibre edilmiş diff, async traversal (UI donmaz), atomik baseline ve migration iskeleti (eski/ileri versiyon güvenli).

**Çıkış kriteri (Definition of Done):** NFR §4 hedefleri karşılanıyor (false-positive < %1, eşleştirme ≥ %98); 2.000 node < 2 s; hiçbir hata baseline'ı silmiyor; tüm testler + typecheck + build yeşil.

---

## Sprint 2 — Dayanıklılık & Review UX  *(22 görev)*

**Sprint hedefi:** Her hata durumunu zarif ve kurtarılabilir yap; developer'ın gürültüyü hızlı elemesini sağla; erişilebilirliğin çekirdeğini kur.

- **Progress / iptal / kota (EPIC B):** B-04, B-05, B-06, B-09
- **Hata UX & kurtarma (EPIC C):** C-02, C-03, C-04, C-06
- **Review & gürültü yönetimi (EPIC D):** D-01, D-02, D-03, D-04, D-05, D-06, D-07
- **Erişilebilirlik çekirdeği (EPIC F):** F-01, F-02, F-03, F-04, F-05, F-07, F-08

**Çalışan ürün:** İlerleme çubuğu + iptal edilebilir tarama; katalog tabanlı net hata mesajları; re-baseline yıkıcı-onay; toplu include/exclude, kategori/impact filtresi, canvas'a zoom-to-node; klavye ile tam kullanılabilir arayüz.

**Çıkış kriteri:** ERROR_CATALOG'daki her kod bir kurtarma akışına bağlı; fareyle dokunmadan tam akış tamamlanabiliyor; excluded değişiklikler export'a girmiyor.

---

## Sprint 3 — Yayınla & Faz 1 kapanış  *(19 görev)*

**Sprint hedefi:** Temel döngüyü Publish ile tamamla, ölçümü aç, kaliteyi CI ile sabitle — Faz 1'i sevk et.

- **Release döngüsü (EPIC E):** E-01, E-02, E-03, E-04, E-05, E-06, E-07, E-08
- **Telemetri opt-in (EPIC G):** G-01, G-02, G-03, G-04, G-05, G-06
- **Erişilebilirlik tamam (EPIC F):** F-06
- **Monorepo & CI (EPIC H):** H-01, H-02, H-03, H-04

**Çalışan ürün:** Select → Snapshot → Change → Scan → Review → **Publish** tam döngüsü; yerel release geçmişi + JSON export; opt-in telemetri; WCAG AA kontrast doğrulaması; monorepo + CI pipeline.

**Çıkış kriteri:** Publish sonrası snapshot atomik olarak yeni baseline oluyor; ACCESSIBILITY_SPEC kabul kriterleri geçiyor; CI (typecheck+test+build) yeşil. **→ Faz 1 sürüm etiketi.**

---

## Sprint 4 — Faz 2 temel  *(9 görev)*  ·  ön koşul: SECURITY_AND_PRIVACY uyum listesi ✅

**Sprint hedefi:** Ekip uygulamasının iskeletini kur: kimlik, veri modeli, tenant izolasyonu ve plugin'den backend'e release publish.

- **Backend temel (EPIC I):** I-01, I-02, I-03, I-04, I-05, I-06, I-07, I-08, I-09

**Çalışan ürün:** Kullanıcı giriş yapar, workspace oluşturur, plugin projeyi bağlar ve bir release backend'e yayınlanır.

**Çıkış kriteri:** Tenant izolasyon testi geçiyor; token at-rest şifreli; publish endpoint plugin client'tan çalışıyor. (Not: Faz 2 görevleri daha çok entegrasyon/bilinmezlik içerdiğinden sprint yükü kasıtlı olarak hafif — risk tamponu.)

---

## Sprint 5 — Faz 2 tüketim  *(6 görev)*

**Sprint hedefi:** Developer tarafını ve kapanış akışlarını tamamla; ürünün ana metriğini (acknowledgement) ölçülebilir kıl.

- **Tüketim & kapanış (EPIC I):** I-10, I-11, I-12, I-13, I-14, I-15

**Çalışan ürün:** Developer web'de release timeline/detay görür, "reviewed" işaretler; designer acknowledgement oranını görür; Slack bildirimi; retention/silme akışı.

**Çıkış kriteri:** Uçtan uca: designer publish → Slack/inbox → developer reviewed → designer oran görür. Retention/silme çalışıyor. **→ Faz 2 private team sürümü.**

---

## Riskin sprint dağılımı

| Risk | Ele alındığı yer |
| --- | --- |
| Eşleştirme/gürültü doğruluğu (en yüksek) | Sprint 1 (EPIC A) |
| Büyük dosyada UI donması | Sprint 1 (B-03, B-07) |
| Veri kaybı / bozuk baseline | Sprint 1 (C-01, C-05, C-07..09) |
| Hata durumları / kullanıcı kafası karışması | Sprint 2 (EPIC C UX + D) |
| Erişilebilirlik uyumu | Sprint 2–3 (EPIC F) |
| Güvenlik/gizlilik (Faz 2) | Sprint 4 öncesi kapı + I-06, I-07 |

## Notlar

- **Boşta kapasite:** EPIC F (erişilebilirlik) ve H-04 (CI) çoğu göreve bağımsız; erken sprintlerde artan kapasiteyle öne çekilebilir.
- **Ekip 2+ kişiyse:** Sprint 2'den itibaren C (hata) / D (UX) / F (a11y) ayrı geliştiricilere paralel dağıtılabilir; A ve B tek kişide toplanmalı (çekirdek tutarlılık).
- **Kapsam kesintisi gerekirse:** G (telemetri) ve H (monorepo) Faz 1 sevkinden sonraya ertelenebilir; döngü yine çalışır.
