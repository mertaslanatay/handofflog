# Staff Product Engineer Review

**Kapsam:** PRD, Teknik Mimari, UX akışları ve destekleyici dokümanların eleştirel değerlendirmesi.
**Amaç:** Ürünü sevkiyat öncesi olgunlaştırmak — boşlukları kapatmak, riskleri erkene çekmek, kararları netleştirmek.
**Yöntem:** Her bulgu `[Şiddet]` (Blocker / Yüksek / Orta / Düşük) ile işaretlenir ve bir aksiyona bağlanır.

---

## 0. Genel değerlendirme

Dokümantasyon seti bir MVP için beklenenin üzerinde olgun: net problem tanımı, tek bir ana başarı metriği, deterministik diff felsefesi ve fazlara ayrılmış kapsam. Ürünün kalbi doğru yerde — **AI değil, deterministik snapshot diff.** Ana zayıflık, "mutlu yol" iyi tanımlıyken **kenar durumların, sayısal hedeflerin ve güvenlik/gizlilik sınırlarının** yeterince yazılı olmaması. Bu review bu boşlukları kapatan dokümanları da beraberinde getiriyor.

En kritik tek risk teknik değil, ürünsel: **eşleştirme + gürültü doğruluğu düşükse ürün sessizce terk edilir.** Bütün öncelik sıralaması bunu koruyacak şekilde yapılmalı.

---

## 1. PRD eleştirisi

**Güçlü yanlar.** Problem–değer–metrik zinciri temiz. Tek ana metrik ("geliştirmeye başlanmadan önce developer'ın gördüğü değişiklik oranı") ürünü disipline ediyor. Fonksiyonel/non-fonksiyonel ayrımı mevcut.

**Bulgular.**

- `[Yüksek]` **Non-functional gereksinimler ölçülemez.** "Büyük frame'de UI kilitlenmesin" bir hedef değil, bir dilek. Sayısal bütçe yok. → `03_TECHNICAL/NON_FUNCTIONAL_REQUIREMENTS.md` eklendi.
- `[Yüksek]` **Başarı metrikleri enstrümante edilemiyor.** Metrikler tanımlı ama hangi event'ten, nasıl hesaplandığı yok; Faz 1 lokal olduğu için "acknowledgement oranı" ölçülemez bile. → `01_PRODUCT/METRICS_AND_ANALYTICS.md` eklendi.
- `[Orta]` **Kategori seti ile motor çıktısı çelişiyor.** RELEASE_MODEL'de Token / Prototype / Accessibility kategorileri var; diff motoru bunları üretmiyor. Beklenti–gerçeklik farkı. → `03_TECHNICAL/CATEGORY_IMPACT_MAPPING.md` ile Faz 1 kapsamı ve gelecek kategoriler netleştirildi.
- `[Orta]` **Persona var, birincil persona yok.** Altı kullanıcı tipi listeleniyor; MVP'nin kimin için optimize edildiği (öneri: **Designer = yayınlayan**, **Developer = tüketen**) yazılı değil. Karar gerektiğinde kime öncelik verileceği belirsiz.
- `[Orta]` **Varsayımlar ve açık sorular bölümü yok.** "Kullanıcılar baseline'ı disiplinli alacak mı?", "handoff kapsamı tek frame mi çoklu mu?" gibi ürünü batırabilecek varsayımlar kayıt altında değil. → PRD'ye "Varsayımlar & Açık Sorular" bölümü eklendi.
- `[Düşük]` **"Anlamlı değişiklik" tanımsız.** Metriklerde geçiyor ama operasyonel tanımı yok (öneri: include edilmiş + low üstü impact). CATEGORY_IMPACT_MAPPING'de tanımlandı.

---

## 2. Teknik mimari eleştirisi

**Güçlü yanlar.** Katman ayrımı örnek niteliğinde: Figma-bağımlı normalize / Figma-bağımsız saf core / typed mesaj sınırı. Deterministiklik ilkesi hash + stable serialize ile somut. Snapshot versiyonlama zorunlu.

**Bulgular.**

- `[Blocker → Faz 2 öncesi]` **Güvenlik/gizlilik mimarisi yok.** "Doküman dışarı çıkmaz" ilkesi var ama Faz 2 tam tersini yapıyor (backend'e release + snapshot). Token saklama, veri saklama süresi, erişim kontrolü, Slack webhook güvenliği tanımsız. → `03_TECHNICAL/SECURITY_AND_PRIVACY.md` eklendi. **Bu doküman onaylanmadan Faz 2 kodu başlamamalı.**
- `[Yüksek]` **Eşleştirme stratejisi tek başarısızlık noktası.** trackingId pluginData'ya bağlı; kopyalama, "detach", toplu reorganizasyon ve component swap senaryolarında davranış yazılı değil. Component-key eşleştirmesi "MVP sonrası" deniyor ama instance-heavy dosyalarda MVP'de bile gerekebilir. → NFR + review aksiyonu: gerçek dosyalarla kalibrasyon önce.
- `[Yüksek]` **Migration politikası yok.** schemaVersion literal olarak var ama v1→v2 geçişi, okunamayan versiyon, ileri-uyumluluk tanımsız. Snapshot kalıcı veri olduğundan bu erken borç. → `03_TECHNICAL/SCHEMA_MIGRATION.md` eklendi.
- `[Orta]` **Storage kapasite modeli belirsiz.** clientStorage kotası ve scope başına tek-baseline kararı yazılı değil; büyük ağaç + çok scope kotayı zorlayabilir. → NFR'de kota bütçesi ve degradasyon davranışı tanımlandı.
- `[Orta]` **Hata sözleşmesi eksik.** MESSAGE_CONTRACT hata *kodlarını* veriyor; her koda karşılık UX mesajı, kurtarma ve tetikleyici yok. → `03_TECHNICAL/ERROR_CATALOG.md` eklendi.
- `[Orta]` **Async/iş parçacığı stratejisi yazılı değil.** Büyük traversal main thread'i bloklar; chunking/yield veya progress modeli tanımlanmalı. → NFR'de tanımlandı.
- `[Düşük]` **Observability boşluğu.** Faz 2'de audit log var ama Faz 1'de hata teşhisi için hiçbir iz yok. → METRICS dokümanında opsiyonel lokal hata sayacı önerildi.

---

## 3. UX akışları eleştirisi

**Güçlü yanlar.** Beş temel akış (ilk handoff, tarama, release, hata) net. Empty state metinleri yazılmış. Change card hiyerarşisi (tip → node → property → eski/yeni → etki → include) doğru öncelik sırasında. Erişilebilirlik ilkeleri UI_SPEC'te anılıyor.

**Bulgular.**

- `[Yüksek]` **Baseline "gerçeğin kaynağı" gerilimi görünmez.** Kullanıcı ne zaman re-baseline almalı? Yanlış zamanda re-baseline tüm değişiklik geçmişini kaybettirir (yıkıcı, geri alınamaz). Akışta bu riskli aksiyon için özel bir doğrulama/uyarı tanımı yok. → ERROR_CATALOG + UX önerisi: re-baseline yıkıcı-onay + "kaç değişiklik kaybolacak" özeti.
- `[Yüksek]` **Erişilebilirlik dağınık, ölçülebilir değil.** İlkeler var ama hedef seviye (WCAG 2.1 AA), klavye sıra tanımı, live-region davranışı, kontrast doğrulama yöntemi bir yerde toplanmamış. → `02_UX_UI/ACCESSIBILITY_SPEC.md` eklendi.
- `[Orta]` **Gürültü yönetimi UX'i zayıf.** Ürünün değeri "gürültülü farkları elemek"; ama toplu include/exclude, kategoriye göre filtreleme, "bu tür değişikliği gizle" gibi araçlar akışlarda yok. Developer 200 değişiklikle karşılaşırsa akış çöker. → BACKLOG'a "bulk review & filters" epiki eklendi.
- `[Orta]` **Progress/iptal durumu eksik.** "Scanning" ekranı var ama uzun taramada ilerleme yüzdesi/iptal yok. → NFR + ACCESSIBILITY (live-region) ile bağlandı.
- `[Orta]` **Değişiklik kimliği/gezinme yok.** Change card'tan Figma canvas'ındaki node'a "göster/seç" (zoom-to-node) yok; developer değişikliği bağlamında göremez. Yüksek değerli, düşük maliyetli. → BACKLOG'a eklendi.
- `[Düşük]` **Boş/çok-büyük scope davranışı belirsiz.** "Çok büyük scope" hatası USER_FLOWS'ta anılıyor ama eşik ve UX'i yok. → NFR + ERROR_CATALOG.

---

## 4. Öncelik sırası (bu review'in çıktısı)

1. **Diff doğruluğu & gürültü kalibrasyonu** (gerçek dosyalar) — ürünün kaderi.
2. **Performans + progress + async** (NFR'ye göre).
3. **Hata dayanıklılığı + migration + re-baseline güvenliği** (veri kaybını önle).
4. **Gürültü yönetimi UX'i** (bulk review, filtre, zoom-to-node).
5. **Release döngüsünü tamamla** (Publish + kategori/etki eşlemesi).
6. **Faz 2 — ama önce SECURITY_AND_PRIVACY onayı.**

Bu sıra IMPLEMENTATION_BACKLOG'a yeni epikler olarak işlendi.

---

## 5. Oluşturulan / güncellenen dokümanlar

**Yeni:** NON_FUNCTIONAL_REQUIREMENTS, ERROR_CATALOG, SCHEMA_MIGRATION, SECURITY_AND_PRIVACY, CATEGORY_IMPACT_MAPPING (03_TECHNICAL); METRICS_AND_ANALYTICS (01_PRODUCT); ACCESSIBILITY_SPEC (02_UX_UI); bu review (06_REFERENCE).

**Güncellenen:** PRD (varsayımlar, birincil persona, non-functional referansları), DIFF_ENGINE_SPEC (kategori eşleme referansı), DECISION_LOG (DEC-009…015), IMPLEMENTATION_BACKLOG (Epic 6–9).
