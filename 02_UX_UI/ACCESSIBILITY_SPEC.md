# Accessibility Specification

Hedef: **WCAG 2.1 AA.** PLUGIN_UI_SPEC'teki erişilebilirlik ilkelerini ölçülebilir, test edilebilir kabul kriterlerine dönüştürür. Plugin (Figma iframe) ve Faz 2 web app'i kapsar.

## 1. Klavye erişimi

- Tüm etkileşimli öğeler (butonlar, include toggle, sekmeler, kart aksiyonları) Tab ile erişilebilir ve mantıksal sırada.
- Sıra: Overview aksiyonları → değişiklik grupları (Added → Modified → Removed) → grup içinde kart sırası → footer aksiyonları.
- Enter/Space ile tetikleme; Esc ile açık diyaloğu (ör. re-baseline onayı) kapatma.
- Klavye tuzağı (focus trap) yok; diyalog açıkken focus diyalog içinde döner ve kapanınca tetikleyen öğeye döner.

## 2. Focus görünürlüğü

- Her odaklanabilir öğede görünür focus halkası (yalnızca hover'a güvenme).
- Kontrast: focus göstergesi çevresine karşı ≥ 3:1.
- Figma light/dark temasının ikisinde de görünür (theme değişkenleri ile).

## 3. Renkten bağımsız durum

- Added/Modified/Removed yalnızca renkle değil; metin etiketi + konum (ayrı gruplar) + ikon/şekil ile de ayrışır.
- Impact (low/medium/high/breaking) metinle yazılır; yalnızca renk rozeti kullanılmaz.
- `del`/`ins` (eski→yeni) yalnızca üstü çizili/renk değil, ok işareti ve etiketle desteklenir.

## 4. Kontrast

- Metin ≥ 4.5:1; büyük metin (≥ 18px veya 14px bold) ≥ 3:1.
- Etkileşimli sınırlar/ikonlar ≥ 3:1.
- Kontrast, Figma light **ve** dark temada doğrulanır (theme token'ları AA'yı garanti edecek şekilde seçilir).

## 5. Dinamik içerik / ekran okuyucu

- Tarama sonuçları bir `aria-live="polite"` bölgesinde duyurulur ("12 değişiklik bulundu: 3 eklendi, 7 değişti, 2 silindi").
- Uzun taramada progress `aria-live` ile periyodik duyurulur; spam yapılmaz (ör. %25 adımlarla).
- Hata mesajları `role="alert"` ile anında duyurulur.
- Boş durumlar anlamlı metinle okunur (dekoratif ikonlar `aria-hidden`).

## 6. Yapı ve etiketleme

- Semantik başlık hiyerarşisi (h1 → h2 grup başlıkları).
- Her form kontrolünün (include checkbox) erişilebilir adı var: "Include {node adı} in release".
- İkon-only butonlarda `aria-label`.
- Landmark/bölge etiketleri (Overview, Changes) ile gezinme kolaylığı.

## 7. Hareket ve zaman

- Zorunlu zaman sınırı yok; tarama kullanıcı hızında.
- `prefers-reduced-motion` saygı görür; kritik bilgi yalnızca animasyonla aktarılmaz.

## 8. Dokunma/hedef (Faz 2 web)

- Dokunmatik hedefler ≥ 24×24 CSS px (AA), tercihen 44×44.

## 9. Kabul kriterleri (test edilebilir)

- [ ] Tüm akış fareyle hiç dokunmadan tamamlanabiliyor (baseline → scan → include → export).
- [ ] Ekran okuyucu tarama sonucunu ve hata durumlarını doğru okuyor.
- [ ] Otomatik kontrast denetimi (light+dark) AA'dan geçiyor.
- [ ] Focus her zaman görünür ve mantıklı sırada.
- [ ] Durum bilgisi renk kapalıyken de anlaşılıyor (gri tonlama testi).

## 10. Doğrulama yöntemi

- Otomatik: kontrast ve rol/ad denetimi (CI'da statik kontrol + manuel eksen).
- Manuel: klavye-only geçiş + en az bir ekran okuyucu (VoiceOver) ile akış turu, TEST_PLAN'a eklenir.
