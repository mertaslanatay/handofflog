# Product Requirements Document

## 1. Ürün adı

Çalışma adı: **Handofflog**

## 2. Problem

Figma tasarımı developer handoff'a gönderildikten sonra tasarımda yapılan değişiklikler çoğu zaman geliştiriciye sistematik biçimde iletilmez. Bu durum eski tasarıma göre geliştirme, tekrar iş, Slack trafiği, QA hataları ve sprint gecikmesi üretir.

## 3. Değer önerisi

**Figma'daki değişiklikleri geliştiricilerin anlayabileceği release notlarına dönüştür.**

## 4. Hedef kullanıcılar

- Product Designer
- UI/UX Designer
- Frontend/Mobile Developer
- Product Manager
- QA Engineer
- Design System Team

### Birincil persona (MVP optimizasyonu)

MVP iki persona için optimize edilir; çakışmada bunlara öncelik verilir:

- **Yayınlayan — Product Designer:** kapsamı seçer, baseline alır, gürültüyü eler, release yayınlar. Ürünün "giriş" tarafı.
- **Tüketen — Frontend/Mobile Developer:** kendini etkileyen değişiklikleri görür, eski/yeni karşılaştırır, acknowledge eder. Ana başarı metriğinin öznesi.

PM/QA/Design System ikincil personadır; onların ihtiyaçları bu ikisini bozmadığı sürece karşılanır.

## 5. Temel kullanıcı işleri

### Designer
- Handoff kapsamını seçmek
- Baseline oluşturmak
- Değişiklikleri taramak
- Gürültülü farkları elemek
- Release yayınlamak

### Developer
- Kendini etkileyen değişiklikleri görmek
- Eski/yeni değerleri karşılaştırmak
- Değişikliği incelediğini belirtmek
- Uygulama durumunu güncellemek

### PM / QA
- Hangi sürümün güncel olduğunu anlamak
- Release kapsamını takip etmek
- Uygulanmamış tasarım değişikliklerini görmek

## 6. Temel akış

Select → Snapshot → Change → Scan → Review → Publish → Acknowledge

## 7. MVP kapsamı

### Figma Plugin
- Frame/section seçimi
- Baseline snapshot
- Manuel değişiklik taraması
- Added/removed/modified node tespiti
- Layout, visual, typography, component property diff
- Changelog düzenleme
- JSON export
- Yerel release geçmişi

### Web Dashboard — sonraki MVP adımı
- Workspace ve proje
- Release timeline
- Release detail
- Developer acknowledgement
- Basit Slack ve e-posta bildirimi

## 8. MVP dışı

- Gerçek zamanlı izleme
- Pixel diff
- GitHub source-code mapping
- Otomatik code generation
- Enterprise analytics
- Billing
- Gelişmiş AI summary

## 9. Başarı metrikleri

- Yayınlanan release sayısı
- Release başına anlamlı değişiklik sayısı
- Developer acknowledgement oranı
- Değişikliklerin okunmasına kadar geçen süre
- Eski tasarıma göre geliştirme kaynaklı hata sayısı

## 10. Ana başarı metriği

**Geliştirmeye başlanmadan önce developer tarafından görülen tasarım değişikliği oranı.**

## 11. Fonksiyonel gereksinimler

- Snapshot aynı girdide deterministik olmalı.
- Değişmeyen node'lar diff listesinde görünmemeli.
- Snapshot verisi sürümlenebilir olmalı.
- Kullanıcı farkları release'e dahil edip çıkarabilmeli.
- Silinen node'lar açıkça gösterilmeli.
- Mixed Figma property değerleri güvenli biçimde normalize edilmeli.
- Büyük frame'lerde tarama UI'ı kilitlememeli.

## 12. Fonksiyonel olmayan gereksinimler

- TypeScript strict mode
- Modüler diff motoru
- Veri şeması versiyonlama
- Hata durumunda snapshot kaybetmeme
- Hassas token veya credential loglamama
- Test edilebilir saf karşılaştırma fonksiyonları

> Sayısal hedefler (performans, ölçek, kota, doğruluk) `03_TECHNICAL/NON_FUNCTIONAL_REQUIREMENTS.md` dosyasında tanımlanır; bu liste yalnızca ilkeleri belirtir.

## 13. Kategori kapsamı (net beklenti)

RELEASE_MODEL zengin bir kategori sözlüğü tanımlar. **Faz 1 motoru** yalnızca Added/Removed, Layout, Visual, Typography, Content, Component, Structural ve (impact olarak) Breaking üretir. Token / Prototype / Accessibility kategorileri yol haritasındadır ve Faz 1'de otomatik üretilmez. Resmi eşleme: `03_TECHNICAL/CATEGORY_IMPACT_MAPPING.md`.

## 14. Varsayımlar & Açık Sorular

Ürünü riske atabilecek, doğrulanması gereken varsayımlar:

- **A1 — Baseline disiplini:** Kullanıcılar handoff anında baseline almayı hatırlayacak. (Risk: unutulursa diff yok.) → Onboarding/hatırlatma ile azaltılır.
- **A2 — Kapsam boyutu:** Handoff kapsamı çoğunlukla tek frame/section ve makul boyutta. (Risk: dev dosyalar performansı bozar.) → NFR eşikleri.
- **A3 — Eşleştirme dayanıklılığı:** trackingId + fallback'ler gerçek dosyalarda %98 doğru eşleştirir. (Risk: sahte add/remove.) → Kalibrasyon çalışması (önceliklendirilmiş).
- **A4 — Gürültü tolere edilebilir:** Kullanıcı kalan gürültüyü hızlı eleyebilir. → Bulk review/filtre UX'i.
- **A5 — Değerin görülme yeri:** Developer değeri asıl Faz 2'de (paylaşım) görecek; Faz 1 tek başına yeterli "aha" veriyor mu? → Erken kullanıcı testi.

**Açık sorular:** Çoklu-frame kapsam MVP'de gerekli mi? Re-baseline'ın "kısmi" (yalnızca yayınlanmış değişiklikleri onayla) sürümü olmalı mı? Instance-heavy dosyalarda component-key eşleştirmesi MVP'ye çekilmeli mi?

## 15. İlgili dokümanlar

- Non-functional hedefler: `03_TECHNICAL/NON_FUNCTIONAL_REQUIREMENTS.md`
- Hata sözleşmesi: `03_TECHNICAL/ERROR_CATALOG.md`
- Şema göçü: `03_TECHNICAL/SCHEMA_MIGRATION.md`
- Güvenlik/gizlilik: `03_TECHNICAL/SECURITY_AND_PRIVACY.md`
- Kategori/etki eşleme: `03_TECHNICAL/CATEGORY_IMPACT_MAPPING.md`
- Metrik enstrümantasyonu: `01_PRODUCT/METRICS_AND_ANALYTICS.md`
- Erişilebilirlik: `02_UX_UI/ACCESSIBILITY_SPEC.md`
- Staff review: `06_REFERENCE/STAFF_ENGINEER_REVIEW.md`
