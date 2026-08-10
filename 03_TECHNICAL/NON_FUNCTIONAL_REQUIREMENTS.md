# Non-Functional Requirements (NFR)

Ölçülebilir hedefler. "Hızlı", "kilitlenmesin" gibi ifadeler burada sayıya bağlanır. Her hedef test edilebilir olmalıdır (bkz. TEST_PLAN).

## 1. Performans bütçesi (Figma Plugin)

Referans donanım: son 3 yıl orta seviye dizüstü, Figma desktop.

| Senaryo | Node sayısı | Hedef | Sert limit |
| --- | --- | --- | --- |
| Baseline oluşturma | ≤ 500 | < 400 ms | 1 s |
| Baseline oluşturma | ≤ 2.000 | < 1.5 s | 3 s |
| Tarama (scan) | ≤ 500 | < 500 ms | 1.5 s |
| Tarama (scan) | ≤ 2.000 | < 2 s | 4 s |
| UI etkileşim gecikmesi (tık→tepki) | — | < 100 ms | 200 ms |
| İlk açılış (INIT) | — | < 300 ms | 600 ms |

**UI bloklama kuralı:** Ana thread hiçbir işte 50 ms'den uzun kesintisiz bloklamamalı. 800+ node traversal'ı chunk'lara bölünüp `yield` edilmeli; UI her chunk sonrası progress alabilmeli.

## 2. Ölçek limitleri ve degradasyon

- **Yumuşak eşik:** 10.000 node. Aşılınca UI uyarır ("Büyük scope, tarama uzun sürebilir") ama devam eder. (Page-bazlı tarama için yükseltildi — DEC-031.)
- **Sert eşik:** 60.000 node. Aşılınca "SCOPE_TOO_LARGE" ile kibarca durdurulur; baseline bozulmaz. Not: çok büyük sayfalarda snapshot clientStorage kotasını (~5MB) aşabilir → `STORAGE_ERROR` (baseline korunur). Kalıcı çözüm: sayfa snapshot'larını web/object storage'a taşımak (Faz 2+).
- **Derinlik:** 50+ seviye iç içe geçmede uyarı; sonsuz döngü koruması (ziyaret edilen id seti) zorunlu.

## 3. Bellek ve storage bütçesi

- Tek snapshot serialize boyutu hedef < 1 MB, sert limit 3 MB.
- `figma.clientStorage` pratik kotası ~5 MB varsayılır. Scope başına **yalnızca 1 baseline** saklanır (karar: DEC-006 uzantısı). Release geçmişi ayrı key'de özet olarak tutulur, tam snapshot değil.
- Kota dolarsa: yeni yazma reddedilir, **mevcut baseline silinmez**, kullanıcıya `STORAGE_ERROR` ve "eski scope'ları temizle" önerisi gösterilir.

## 4. Determinizm ve doğruluk hedefleri

- Aynı girdi → byte-özdeş snapshot ve ChangeSet (regresyon testiyle korunur).
- **False-positive oranı hedefi:** kalibrasyon dosyalarında değişmeyen node'ların < %1'i sahte "modified" üretmeli.
- **Eşleştirme doğruluğu hedefi:** rename/reorder senaryolarında node'ların ≥ %98'i add+remove yerine "modified" olarak eşleşmeli.

## 5. Güvenilirlik

- Hiçbir hata durumu mevcut baseline'ı silmemeli (mutlak kural).
- Snapshot parse edilemezse `corrupt` durumu; ham veri korunur.
- Plugin crash sonrası yeniden açılışta son baseline erişilebilir kalmalı.

## 6. Uyumluluk

- Figma Plugin API `documentAccess: dynamic-page` ile uyumlu; async sayfa erişimi gerektiğinde `loadAsync` kullanılır.
- TypeScript strict; `any` yasak.
- Desteklenen editör: Figma (Design). FigJam ve Slides Faz 1 kapsamı dışında.

## 7. Erişilebilirlik

Hedef: **WCAG 2.1 AA.** Detay ve kabul kriterleri: `02_UX_UI/ACCESSIBILITY_SPEC.md`.

## 8. Test edilebilirlik

- Bütün performans hedefleri için bir "large-frame" fixture ve zaman ölçümlü test bulunmalı.
- NFR ihlali = release blocker.
