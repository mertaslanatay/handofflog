# Category & Impact Mapping

RELEASE_MODEL ürünsel kategori/etki sözlüğünü tanımlar; DIFF_ENGINE bunları üreten motordur. Bu doküman ikisi arasındaki **resmi eşlemeyi** kurar ve Faz 1'de neyin gerçekten üretildiğini netleştirir. Amaç: beklenti (RELEASE_MODEL) ile gerçeklik (motor çıktısı) arasındaki boşluğu kapatmak.

## 1. Property → Kategori (Faz 1, deterministik)

Kategori, değişen property'nin path'inden sabit tabloyla türetilir (değerden bağımsız, deterministik).

| Property | Kategori |
| --- | --- |
| name, type, children (child set/sıra) | structural |
| x, y, width, height, layoutMode, itemSpacing, padding* | layout |
| visible, opacity, fills, strokes, cornerRadius | visual |
| fontSize, fontName, lineHeight, letterSpacing | typography |
| characters | content |
| componentProperties, variantProperties | component |

## 2. Property → Impact (Faz 1)

Node impact'i, kind + property impact'lerinin **maksimumudur** (low < medium < high < breaking).

| Property / durum | Impact |
| --- | --- |
| type değişimi | breaking |
| node silinmesi (removed) | high |
| componentProperties, variantProperties | high |
| width, height | medium |
| characters (content) | medium |
| children (yapısal) | medium |
| node eklenmesi (added) | medium |
| name (rename) | low |
| x, y, opacity, fills, strokes, cornerRadius, layout*, typography* | low |

> Bu tablo motor davranışının tek kaynağıdır; değişirse regresyon testi güncellenir.

## 3. RELEASE_MODEL kategorileri ↔ motor durumu

RELEASE_MODEL zengin bir sözlük tanımlar. Faz 1 hepsini otomatik üretmez:

| RELEASE_MODEL kategorisi | Faz 1 durumu | Nasıl elde edilir |
| --- | --- | --- |
| Added / Removed | ✅ Otomatik | Node matching |
| Layout / Visual / Typography / Content / Component / Structural | ✅ Otomatik | Property→kategori tablosu |
| Breaking | ✅ Otomatik (impact) | type değişimi / silme |
| Token | ⏳ Faz sonrası | Variable/style binding izlemesi gerekir |
| Prototype | ⏳ Faz sonrası | reactions/flow property'leri gerekir |
| Accessibility | ⏳ Faz sonrası | Kontrast/hedef-boyut analizi gerekir; türetilmiş kategori |

**Karar:** Faz 1 çıktısı yukarıdaki ✅ kategorilerle sınırlıdır. UI ve export "Token/Prototype/Accessibility" kategorilerini Faz 1'de göstermez; RELEASE_MODEL bunları yol haritası olarak korur.

## 4. Release türü ile ilişki

Release türü (Patch/Minor/Major/Hotfix/Content/Design System) **kullanıcı tarafından** seçilir; motor otomatik atamaz. Ancak öneri (suggestion) üretilebilir:

| İçerilen en yüksek impact | Önerilen release türü |
| --- | --- |
| breaking | Major |
| high | Minor |
| medium | Minor / Content Update |
| yalnızca low | Patch |

Öneri bağlayıcı değildir; kullanıcı ezebilir (deterministik + insan kontrolü).

## 5. "Anlamlı değişiklik" tanımı

Başarı metriklerinde geçen "anlamlı değişiklik" operasyonel olarak:

> Release'e **include edilmiş** ve impact'i **low'un üstünde** (medium/high/breaking) olan node değişikliği.

Bu tanım METRICS_AND_ANALYTICS'te ölçüm için kullanılır.

## 6. Genişletme kuralı

Yeni property desteği eklenirken: (1) bu tabloya kategori+impact satırı eklenir, (2) normalize + hash kapsamı güncellenir, (3) regresyon fixture'ı eklenir. Üçü birden yapılmadan property "destekleniyor" sayılmaz.
