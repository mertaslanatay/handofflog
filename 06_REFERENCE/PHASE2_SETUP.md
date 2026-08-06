# Faz 2 — Senin Sağlaman Gerekenler (Provisioning Checklist)

Bu adımlar hesap/servis kurulumu ve gizli anahtarlar içerdiği için **senin**
tarafında yapılmalı. Tamamlayıp değerleri bir yere kaydettiğinde "devam et" de;
ben route handler'ları, web UI ve deploy konfigürasyonunu bunlara bağlarım.
Secret'ların kendisini bana yapıştırma — yalnızca "hazır" demen yeterli.

## 1. Hesaplar / servisler (3 tane)

1. **Vercel** hesabı — Next.js web app'i barındırmak için. Bir proje oluştur
   (henüz repo bağlamana gerek yok). Uygulama alan adını belirle
   (ör. `handofflog.vercel.app` veya kendi domain'in) — **redirect URI için
   gerekli**.
2. **Hosted PostgreSQL** — Neon veya Supabase (ikisi de ücretsiz başlangıç
   sunar). Bir veritabanı oluştur ve **connection string**'i (DATABASE_URL) al.
3. **Figma OAuth uygulaması** — https://www.figma.com/developers/apps → "Create
   new app" (veya OAuth app). Şunları gireceksin:
   - **Callback / redirect URL:** `https://<app-domain>/api/auth/figma/callback`
     (adım 1'deki domain ile birebir aynı olmalı).
   - Oluşunca **Client ID** ve **Client Secret** verir.

> İsteğe bağlı: **Slack** — release bildirimi (I-14) istiyorsan bir "Incoming
> Webhook" URL'i oluştur. İstemezsen bu adımı atla, sonra eklenebilir.

## 2. Bana gerekecek env değişkenleri (Vercel'e sen gireceksin)

Kodun beklediği isimler (değerleri sen dolduracaksın, secret'ları Vercel'in
Environment Variables ekranına koyacaksın):

| Değişken | Nereden | Not |
| --- | --- | --- |
| `DATABASE_URL` | Neon/Supabase | Postgres bağlantı dizesi |
| `FIGMA_OAUTH_CLIENT_ID` | Figma app | — |
| `FIGMA_OAUTH_CLIENT_SECRET` | Figma app | gizli |
| `FIGMA_OAUTH_REDIRECT_URI` | sen belirlersin | `https://<app-domain>/api/auth/figma/callback` |
| `APP_BASE_URL` | sen belirlersin | `https://<app-domain>` |
| `SESSION_SECRET` | sen üret | rastgele uzun dize (oturum imzası) |
| `ENCRYPTION_KEY_BASE64` | sen üret | 32-byte base64 (token/webhook şifreleme) |
| `SLACK_WEBHOOK_URL` | Slack (opsiyonel) | verilirse şifreli saklanır |

**İki anahtarı sen üreteceksin** (terminalde, tek satır):

```bash
# ENCRYPTION_KEY_BASE64 (32 byte)
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
# SESSION_SECRET
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

## 3. Plugin tarafı (deploy'dan sonra, küçük ayar)

- `plugin/manifest.json` → `networkAccess.allowedDomains` senin app domain'ini
  içerecek şekilde güncellenecek (şu an `"none"`). Bunu ben yaparım; sadece
  domain'i bilmem yeterli.

## 4. Senden ihtiyacım olan tek şey (özet)

"Devam et" derken şunların **hazır olduğunu** belirt (değerleri paylaşma):

- [ ] Vercel projesi + app domain'i belli
- [ ] Postgres (Neon/Supabase) DATABASE_URL hazır
- [ ] Figma OAuth app: Client ID/Secret alındı, redirect URI ayarlandı
- [ ] `ENCRYPTION_KEY_BASE64` ve `SESSION_SECRET` üretildi
- [ ] (Opsiyonel) Slack webhook URL'i
- [ ] App domain'ini bana söyle (manifest + redirect URI tutarlılığı için)

## 5. Ben ne yapacağım ("devam et" sonrası)

- Next.js `apps/web` iskeleti + route handler'ları (mevcut `backend/services`,
  `authz`, `crypto`, `oauth-figma`, `prisma/schema.prisma` üzerine ince
  sarmalayıcı).
- OAuth callback + oturum, workspace/project/release/ack endpoint'leri.
- Web UI: release timeline, detail, developer inbox, acknowledgement oranı.
- Slack webhook (verilirse), retention/silme akışı (I-15) — **canlıya çıkmadan**.
- Plugin API client'ı publish akışına bağlama + manifest domain güncellemesi.

> Not: Gerçek `.env` dosyasını veya secret'ları koda/commit'e koymam; her şey
> Vercel env üzerinden okunur. Deploy'u (Vercel'e bağlama, `prisma migrate`) sen
> tetikleyeceksin; ben kodu ve komutları hazırlarım.
