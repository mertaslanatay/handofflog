# Metrics & Analytics

PRD başarı metriklerini listeler ama nasıl ölçüleceğini tanımlamaz. Bu doküman her metriği bir event'e ve bir hesaplamaya bağlar. Faz 1 lokal olduğundan hangi metriklerin ancak Faz 2'de ölçülebildiği açıkça işaretlenir.

## 1. Kuzey Yıldızı metriği

**Geliştirmeye başlanmadan önce developer tarafından görülen tasarım değişikliği oranı.**

```
NSM = (developer'ın implementasyondan önce acknowledge ettiği anlamlı değişiklik)
      / (yayınlanan toplam anlamlı değişiklik)
```

- "Anlamlı değişiklik": include edilmiş + impact > low (bkz. CATEGORY_IMPACT_MAPPING §5).
- **Ölçülebilirlik:** Faz 2 gerekir (acknowledgement backend'de). Faz 1'de yalnızca "yayınlanan anlamlı değişiklik" (payda) lokal ölçülebilir.

## 2. Metrik → Event → Hesaplama

| Metrik | Event(ler) | Hesaplama | Faz |
| --- | --- | --- | --- |
| Yayınlanan release sayısı | `release_published` | Sayım | 1 (lokal) / 2 |
| Release başına anlamlı değişiklik | `release_published{meaningful_count}` | Ortalama | 1 / 2 |
| Developer acknowledgement oranı | `release_viewed`, `change_acknowledged` | ack / yayınlanan | 2 |
| Okunmaya kadar geçen süre | `release_published`, `release_viewed` | median(viewed − published) | 2 |
| Eski tasarıma göre hata sayısı | Manuel/anket + `change_acknowledged` | Karşılaştırmalı çalışma | 2+ |
| Baseline→scan dönüşümü | `baseline_created`, `scan_completed` | scan / baseline | 1 |
| Gürültü elenme oranı | `scan_completed{total}`, `release_published{included}` | 1 − included/total | 1 / 2 |

## 3. Faz 1 event şeması (lokal, anonim)

Faz 1 varsayılan olarak **hiçbir şeyi ağ üzerinden göndermez** (bkz. SECURITY_AND_PRIVACY). Aşağıdaki event'ler yalnızca opt-in telemetride veya lokal teşhis sayacında tutulur. İçerik (metin, isim) **asla** event'e girmez.

```
event: baseline_created   { scopeHash, nodeCount, durationMs, schemaVersion }
event: scan_completed     { scopeHash, added, removed, modified, unchanged, durationMs }
event: change_included    { scopeHash, category, impact }     // toggle aggregate
event: release_published  { scopeHash, changeCount, meaningfulCount, maxImpact }
event: error              { code }                            // PII'siz
```

- `scopeHash`: scopeId'nin geri döndürülemez hash'i (izleme değil, gruplama için).
- Sayısal alanlar dışında hiçbir serbest metin yok.

## 4. Gizlilik ve rıza

- Telemetri **varsayılan kapalı / opt-in**. Kapalıyken hiçbir event üretilmez.
- Doküman içeriği, karakter metni, node adı, token asla toplanmaz.
- Faz 2'de kimliğe bağlı metrikler (acknowledgement) yalnızca workspace içi, yetkiye tabi görünür.

## 5. Guardrail (koruyucu) metrikler

Büyümeyi kovalarken ürünü bozmamak için izlenir:

- **False-positive şikayet sinyali:** exclude edilen low-impact değişiklik oranı yüksekse motor gürültülüdür.
- **Terk (abandonment):** scan sonrası release yayınlamadan kapatma oranı.
- **Performans regresyonu:** `durationMs` p95 NFR bütçesini aşıyor mu.

## 6. Raporlama

- Faz 1: lokal, kullanıcının kendi görebildiği basit özet (opsiyonel).
- Faz 2: workspace dashboard'unda NSM + guardrail'ler; haftalık trend.
