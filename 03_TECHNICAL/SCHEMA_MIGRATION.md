# Snapshot Schema Migration Policy

Snapshot kalıcı veridir; kullanıcı aylar önce alınmış bir baseline ile bugünkü plugin sürümünde tarama yapabilir. Bu yüzden şema değişimi bir "sonra düşünürüz" konusu değil, ilk günden gereken bir sözleşmedir.

## 1. Versiyonlama ilkeleri

- Her snapshot `schemaVersion: number` taşır (zorunlu, DEC-001).
- Versiyon **monoton artan tam sayıdır**; Faz 1 = `1`.
- Versiyon yalnızca **geriye uyumsuz** (breaking) şema değişiminde artar. Yeni *opsiyonel* alan eklemek versiyon artırmaz.

## 2. Değişiklik türleri

| Tür | Örnek | Versiyon artar mı? | Aksiyon |
| --- | --- | --- | --- |
| Additive (opsiyonel alan) | yeni opsiyonel property | Hayır | Eski snapshot geçerli kalır |
| Additive (zorunlu alan) | yeni zorunlu alan | Evet | Migration ile default doldur |
| Rename / tip değişimi | alan adı/tipi değişir | Evet | Migration ile dönüştür |
| Silme | alan kaldırılır | Evet | Migration ile at |
| Anlam değişimi | aynı alan farklı birim | Evet | Migration ile yeniden hesapla |

## 3. Migration mimarisi

- Saf, sıralı migration fonksiyonları: `migrate_v1_to_v2`, `migrate_v2_to_v3`, … Her biri girdi versiyonundan bir sonrakine dönüştürür ve **saf/deterministik** olmalıdır (Figma API'ye dokunmaz).
- Yükleme akışı: snapshot okunur → `schemaVersion` bakılır → hedefe kadar migration zinciri uygulanır → Zod ile doğrulanır → kullanılır.
- Migration çıktısı yalnızca doğrulamayı geçerse geri yazılır; **yazma başarısız olsa bile eski veri silinmez.**

## 4. Uyumsuzluk kuralları

- **Daha eski snapshot (v_stored < v_current):** migration uygulanır, sessizce yükseltilir.
- **Daha yeni snapshot (v_stored > v_current):** güvenli değil. `SCHEMA_VERSION_UNSUPPORTED` hatası; kullanıcı plugin'i güncellemeye yönlendirilir. Eski veriye dokunulmaz.
- **Migration başarısız / veri anlamlandırılamıyor:** `BASELINE_CORRUPT` gibi ele alınır; ham veri korunur, kullanıcı yeni baseline oluşturabilir.

## 5. Test gereksinimi

- Her yeni versiyon için: bir önceki versiyonun fixture'ı + migration sonrası beklenen çıktı testi.
- "Round-trip" testi: v1 fixture → migrate → doğrula → alan bütünlüğü.
- Downgrade senaryosu testi: gelecekten gelen versiyon reddediliyor mu?

## 6. Export uyumu

- Export edilen JSON her zaman `schemaVersion` içerir (ACCEPTANCE_CRITERIA).
- Dışa aktarılmış eski JSON tekrar içe alınırsa aynı migration zincirinden geçer.

## 7. Faz 2 notu

Backend snapshot'ları da aynı versiyon alanını taşır. Migration mantığı paylaşılan `packages/schemas` içinde tek kaynak olmalı; plugin ve backend aynı migration fonksiyonlarını kullanmalı (kopya mantık = kaçınılmaz uyumsuzluk).
