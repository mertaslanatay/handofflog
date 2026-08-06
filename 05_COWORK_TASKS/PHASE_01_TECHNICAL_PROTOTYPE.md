# Phase 01 — Technical Prototype

## Görev

Bu workspace içindeki dokümanları temel alarak çalışan bir Figma plugin teknik prototipi oluştur.

## Çıktı

- Çalıştırılabilir plugin
- React tabanlı plugin UI
- Seçili frame/section snapshot'ı
- Baseline storage
- Manuel scan
- Added/removed/modified sonuçları
- Property-level diff
- JSON export
- Unit testler
- Kurulum dokümantasyonu

## Uygulama adımları

1. Proje scaffold oluştur.
2. Manifest ve build ayarlarını tamamla.
3. Shared schema ve message contract yaz.
4. Selection validator geliştir.
5. Snapshot normalizer geliştir.
6. Stable serializer ve hash geliştir.
7. Storage adapter geliştir.
8. Diff engine geliştir.
9. UI akışlarını bağla.
10. Unit test ve fixture'ları yaz.
11. Figma'da manuel test talimatlarını oluştur.

## Teknik kısıtlar

- TypeScript strict
- `any` kullanma; zorunlu durumda açıklama ekle.
- Core diff engine Figma global objesine bağımlı olmasın.
- Plugin main ile UI arasında typed messages kullan.
- Snapshot schemaVersion zorunlu olsun.
- Storage hatalarında baseline'ı silme.
- Deterministik sonuç üret.

## Tamamlanma kriteri

Bir frame baseline alındıktan sonra width, text ve child ekleme değişiklikleri yapıldığında scan sonucu bu üç farkı doğru biçimde göstermelidir.
