# Error Catalog

MESSAGE_CONTRACT'taki her `PluginError.code` için tek kaynak: tetikleyici koşul, kullanıcıya gösterilecek mesaj, kurtarma aksiyonu ve `recoverable` bayrağı. UI metinleri bu dokümandan alınır; kod ve UX tutarlı kalır.

## Genel ilkeler

Her hata üç şeyi garanti eder: **ne olduğunu söyler**, **kullanıcının verisini korur**, **tekrar denenebilir bir çıkış sunar.** Hiçbir hata mevcut baseline'ı silmez. Token, credential veya doküman içeriği log'a yazılmaz.

## Katalog

| Kod | Tetikleyici | Kullanıcı mesajı | Kurtarma | recoverable |
| --- | --- | --- | --- | --- |
| `NO_SELECTION` | Canvas'ta hiçbir şey seçili değil | "Takip etmek istediğin frame veya section'ı seç." | Seçim yapılınca otomatik güncelle | true |
| `UNSUPPORTED_SELECTION` | Birden çok node veya desteklenmeyen tip seçili | "Tek bir frame veya section seç. Bu tip ({type}) desteklenmiyor." | Uygun tek node seç | true |
| `SCOPE_TOO_LARGE` | Node sayısı sert limiti (10.000) aşıyor | "Bu scope çok büyük. Daha küçük bir frame seç." | Daha dar kapsam seç | true |
| `BASELINE_NOT_FOUND` | Baseline'ı olmayan scope'ta scan denendi | "Bu seçim için henüz baseline oluşturulmadı." | `Create Baseline` CTA | true |
| `STORAGE_ERROR` | clientStorage okuma/yazma başarısız veya kota dolu | "Kayıt işlemi başarısız. Mevcut baseline korundu." | Tekrar dene / eski scope'ları temizle | true |
| `SNAPSHOT_ERROR` | Traversal/normalize sırasında beklenmeyen durum | "Snapshot oluşturulamadı. Tasarım verisi değiştirilmedi." | Tekrar dene; sürerse dar kapsam | true |
| `BASELINE_CORRUPT` | Saklı baseline schema doğrulamasından geçmedi | "Kayıtlı baseline okunamadı. Veri korundu; yeni baseline oluşturabilirsin." | Yeni baseline (eski veri silinmez) | true |
| `SCHEMA_VERSION_UNSUPPORTED` | Snapshot versiyonu bu plugin sürümünden yeni | "Bu baseline daha yeni bir sürümle oluşturulmuş. Plugin'i güncelle." | Plugin güncelle veya yeni baseline | true |
| `FONT_ACCESS_ERROR` | Text node'da font/metrik okunamadı | "Bir metin katmanı okunamadı; o property atlandı." | Diğer değişiklikler yine de raporlanır | true |
| `EXPORT_EMPTY` | Export edilecek veri yok | "Export edilecek veri yok. Önce baseline oluştur veya tarama yap." | Baseline/scan yap | true |
| `UNKNOWN` | Sınıflandırılamayan hata | "Beklenmeyen bir hata oluştu. Tasarım verisi değiştirilmedi." | Tekrar dene; sürerse geri bildirim | true |

> Not: MESSAGE_CONTRACT'taki `PluginErrorCode` enum'una Faz 1'de `SCOPE_TOO_LARGE`, `BASELINE_CORRUPT`, `SCHEMA_VERSION_UNSUPPORTED`, `FONT_ACCESS_ERROR`, `EXPORT_EMPTY` eklenmelidir (mevcut kodlar korunarak). Bu genişletme geriye uyumludur.

## Yıkıcı aksiyon: Re-baseline

Hata değil ama en yüksek veri-kaybı riski taşıyan aksiyon.

- **Koşul:** Aktif baseline varken tekrar `Create Baseline`.
- **Davranış:** Onay diyaloğu göster: "Yeni baseline mevcut baseline'ın yerine geçecek. Taranmamış {N} olası değişiklik referansı sıfırlanacak. Devam?"
- **Kural:** Onaydan önce eski baseline silinmez; onay sonrası atomik olarak değiştirilir (önce yaz, sonra eski referansı bırak).

## Log politikası

- Sadece hata `code` + teknik mesaj (PII'siz) lokal konsola yazılabilir.
- Doküman içeriği, karakter metni, token, fileKey **loglanmaz**.
- Faz 2 backend hataları için ayrı politika: bkz. SECURITY_AND_PRIVACY.
