# Security, Privacy & Data Retention

Handofflog tasarım içeriğini (metinler, yapı, property'ler) işler. Bu içerik hassas olabilir (yayınlanmamış ürün, fiyat, isim). Bu doküman veri sınırlarını ve güvenlik kurallarını tanımlar. **Faz 2 (backend) bu doküman onaylanmadan başlamamalıdır.**

## 1. Veri sınıflandırması

| Veri | Sınıf | Örnek |
| --- | --- | --- |
| Doküman içeriği | Gizli | `characters`, node adları, yapı |
| Snapshot / ChangeSet | Gizli türev | Normalize edilmiş içerik |
| Tracking ID / nodeId | Düşük hassasiyet | Eşleştirme kimlikleri |
| fileKey | Orta | Dosya tanımlayıcı |
| Access token (Faz 2) | Sır | OAuth / API token |
| Kullanım telemetrisi | Anonim/aggregate | Sayaçlar (bkz. METRICS) |

## 2. Faz 1 — lokal güvenlik modeli

- **Veri yerelde kalır.** Snapshot yalnızca `figma.clientStorage`'da; hiçbir ağ çağrısı yapılmaz. `manifest.json` → `networkAccess.allowedDomains: ["none"]`.
- **Kullanıcı aksiyonu olmadan hiçbir içerik dışarı çıkmaz** (ACCEPTANCE_CRITERIA). Export yalnızca kullanıcının açık aksiyonuyla, lokal dosya olarak indirilir.
- **Loglama:** Doküman içeriği, karakter metni, token, fileKey loglanmaz. Sadece hata kodları/teknik mesajlar (PII'siz).
- **Plugin data:** Node üzerine yalnızca küçük tracking ID yazılır; snapshot node'a yazılmaz. Tracking ID hassas veri içermez.

## 3. Faz 2 — backend güvenlik gereksinimleri

Backend'e veri gitmesi Faz 1'in "lokal" garantisini değiştirir; bu **kullanıcıya açıkça bildirilmeli** (publish akışında onay).

- **Kimlik:** OAuth 2.0 (Figma/SSO). Token'lar yalnızca sunucu tarafında şifreli saklanır; istemciye sızmaz; loglanmaz.
- **Yetkilendirme:** Workspace-scoped erişim; kullanıcı yalnızca üyesi olduğu workspace release'lerini görür. En az yetki ilkesi.
- **Transport:** Tüm trafik TLS. Slack webhook URL'leri sır olarak saklanır, mesaj içeriği minimuma indirilir (release başlığı + link; ham tasarım içeriği webhook'a gönderilmez).
- **Depolama:** DB'de gizli veri "at rest" şifreli. Object storage'da snapshot erişimi imzalı/expiring URL ile.
- **Multi-tenancy:** Workspace izolasyonu her sorguda zorunlu (row-level veya schema-level).
- **Audit log:** Kim neyi ne zaman yayınladı/gördü/acknowledge etti (PII minimizasyonu ile).

## 4. Veri saklama (retention)

| Veri | Saklama | Silme |
| --- | --- | --- |
| Lokal baseline (Faz 1) | Kullanıcı silene / re-baseline'a kadar | Kullanıcı kontrolünde |
| Backend snapshot (Faz 2) | Aktif proje süresince | Proje/workspace silinince kaskad |
| Release kaydı | Konfigüre edilebilir (öneri: 24 ay) | Retention sonunda arşiv/sil |
| Audit log | Öneri: 12 ay | Süre sonunda sil |
| Token | Oturum/yenileme süresince | İptal/çıkışta hemen sil |

- **Kullanıcı hakkı:** Workspace sahibi verinin dışa aktarımını ve tam silinmesini isteyebilmeli (GDPR/KVKK "silme" ve "taşınabilirlik").

## 5. Gizlilik ilkeleri

- **Veri minimizasyonu:** Ürün için gerekmeyen alan toplanmaz/saklanmaz. Görsel binary'ler snapshot'a gömülmez (yalnızca ref digest).
- **Amaç sınırlaması:** Tasarım içeriği yalnızca changelog üretimi için kullanılır; model eğitimi vb. için kullanılmaz.
- **Şeffaflık:** İçeriğin backend'e gideceği publish anında kullanıcıya bildirilir.
- **AI özellikleri:** Bir AI özet katmanı eklenirse, hangi verinin nereye gittiği ayrıca dokümante edilmeli ve varsayılan **kapalı/opt-in** olmalı.

## 6. Tehdit modeli (özet)

| Tehdit | Önlem |
| --- | --- |
| Token sızıntısı | Sunucu tarafı şifreli saklama, loglamama, kısa ömür |
| Yetkisiz workspace erişimi | Scoped authz + tenant izolasyonu |
| Webhook ele geçirme | Sır saklama, minimal içerik, imzalı istek |
| Kötü niyetli/bozuk snapshot | Zod doğrulama, boyut limitleri, güvenli parse |
| Aşırı içerik ifşası | Veri minimizasyonu, binary gömmeme |

## 7. Uyum kontrol listesi (Faz 2 kapısı)

- [~] OAuth + token saklama tasarımı — at-rest şifreleme (`backend/crypto.ts`) hazır; sağlayıcı seçimi + secret yönetimi **kullanıcı kararı bekliyor**
- [x] Tenant izolasyon — `backend/authz.ts` (assertWorkspaceAccess + filterByWorkspace) testli
- [x] At-rest şifreleme — AES-256-GCM (Web Crypto), round-trip testli · TLS: hosting kararında
- [ ] Retention + silme akışı (I-15; canlı DB gerekli)
- [ ] Publish onayında veri-paylaşımı bildirimi (I-09 UI)
- [ ] Webhook sır yönetimi (I-14; crypto helper'ı kullanacak)

> Kod düzeyinde güvenlik temeli (izolasyon + şifreleme) hazır ve testli. Kalan
> kalemler canlı provisioning (hosting, DB, OAuth secret) gerektirir —
> DEC-027 ve Sprint 4 raporundaki sorulara bağlı.
