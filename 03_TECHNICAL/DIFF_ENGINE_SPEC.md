# Diff Engine Specification

## Pipeline

1. Validate scope
2. Traverse nodes
3. Normalize properties
4. Assign tracking identity
5. Stable serialize
6. Generate hash
7. Match baseline/current nodes
8. Detect added/removed
9. Compare changed node properties
10. Classify and format changes

## Gürültü azaltma

- Floating point değerleri belirli hassasiyete yuvarla.
- Undefined alanları serialization'dan çıkar.
- Paint ve effect dizilerini stabil sırada işle.
- Figma mixed değerini açık bir sentinel'a dönüştür.
- Görsel olarak etkisiz internal metadata'yı karşılaştırma.
- Child order değişikliğini ayrı structural change olarak ele al.
- Parent size değişiminden doğan child absolute position gürültüsünü yapılandırılabilir yap.

## Hash

- Stable JSON serialization
- SHA-256 veya hızlı deterministik non-cryptographic hash
- Node hash'i yalnızca desteklenen property'lerden oluşmalı
- Child hash'leri node hash'ine varsayılan olarak dahil edilmemeli; subtree hash ayrıca üretilebilir

## Node matching

1. trackingId
2. nodeId
3. component key
4. parent tracking ID + type + name
5. Yapısal benzerlik — MVP sonrası

## Kabul örnekleri

- Width 320 → 360: modified/layout
- Text “Continue” → “Pay Now”: modified/content
- Yeni error state: added
- Node silinmesi: removed
- Layer rename: modified/structural
- Sıra değişimi: modified/structural

## Kategori ve impact eşlemesi

Property → kategori ve property → impact tabloları ile RELEASE_MODEL sözlüğüne resmi eşleme `03_TECHNICAL/CATEGORY_IMPACT_MAPPING.md` dosyasındadır ve motor davranışının tek kaynağıdır. Yeni property eklenirken bu tablo + normalize/hash kapsamı + regresyon fixture'ı birlikte güncellenir (aksi halde property "desteklenmiş" sayılmaz).
