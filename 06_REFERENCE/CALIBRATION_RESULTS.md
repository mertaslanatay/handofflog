# Diff Calibration Results (A-10)

Sprint 1'de kurulan kalibrasyon harness'larının (`src/core/calibration.ts`)
mevcut fixture'lar üzerindeki sonuçları. Hedefler NON_FUNCTIONAL_REQUIREMENTS §4.

## Yöntem

- **False-positive (A-03):** Bir snapshot, sub-precision (0.0004) float jitter ile
  yeniden taranmış gibi karşılaştırılır (`measureFalsePositives`). Yuvarlamanın
  gürültüyü tamamen silmesi beklenir → 0 değişiklik.
- **Match accuracy (A-04):** nodeId'si iki tarafta da bulunan node'lar "retained"
  kabul edilir; matcher bunları `removed` olarak raporlarsa "spurious" sayılır
  (`measureMatchAccuracy`). accuracy = 1 − spurious/retained.

## Sonuçlar

| Ölçüm | Fixture | Hedef | Ölçülen |
| --- | --- | --- | --- |
| False-positive oranı | checkout / card / nav (before) | < %1 | **%0** |
| False-positive oranı | sentetik sahne | < %1 | **%0** |
| Match accuracy | rename + reorder | ≥ %98 | **%100** |
| Harness duyarlılığı | supra-precision (0.01) jitter | > 0 tespit | **tespit edildi** |

Tümü otomatik testlerle doğrulanır (`calibration.test.ts`, `real-pairs.test.ts`).

## Kritik uyarı (güvenilirlik)

Bu sayılar **temsili** REST-shaped fixture'lar üzerinde ölçüldü; canlı bir Figma
hesabından yakalanmış gerçek export'lar değil (DEC-017). Boru hattı ve harness
gerçek veriyle birebir aynı çalışır; ancak **yayın öncesi güvenilir doğruluk
sayıları için gerçek yakalamalarla tekrar ölçülmelidir** (yakalama adımları:
`plugin/src/core/fixtures/real/README.md`). Bu, A-03/A-04'ün açık riski olarak
STAFF_ENGINEER_REVIEW ve TECH_DEBT'te kayıtlıdır.

## Gürültü modları

Kalibrasyon sırasında keşfedilen child-position gürültüsü için diff motoruna
üç mod eklendi (DiffOptions.positionNoise): `report` (varsayılan), `suppress`,
`suppress-on-parent-resize`. Gerçek veriyle kalibre edilince önerilen varsayılan
`suppress-on-parent-resize` olacaktır (şu an faithful `report` varsayılan).
