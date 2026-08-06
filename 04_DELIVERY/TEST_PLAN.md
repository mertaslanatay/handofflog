# Test Plan

## Unit test alanları

- normalizeNumber
- normalizePaints
- normalizeFont
- stableSerialize
- createHash
- matchNodes
- compareProperties
- classifyChange
- calculateImpact

## Fixture setleri

1. Değişiklik yok
2. Width değişti
3. Text değişti
4. Node eklendi
5. Node silindi
6. Node yeniden adlandırıldı
7. Auto layout padding değişti
8. Fill değişti
9. Font mixed
10. Component property değişti
11. Child order değişti
12. Storage verisi bozuk

## Manuel Figma QA

- Frame
- Section
- Component
- Component set
- Instance
- Auto layout
- Text
- Rectangle
- Vector
- Hidden layer
- Nested component
- Large repeated list

## Regresyon kuralı

Her bulunan bug için:
- Minimal fixture ekle
- Önce failing test yaz
- Fix uygula
- Test planına senaryo ekle
