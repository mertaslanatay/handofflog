# Faz 2 — Kimlik/Kurulum Bilgileri (senin için)

## Önce dürüst not

**Hesapları senin adına açamam** (Vercel, Postgres, Figma). Bunlar kimlik + e‑posta
doğrulaması + hizmet sözleşmesi kabulü gerektiriyor ve bende bu hesaplara/e‑postana
erişim yok; başkasının adına hesap açmak da bu servislerin kurallarına aykırı.

**Senin adına yapabildiğim kısmı yaptım:** iki secret'ı üretip yerleştirdim ve
tüm konfigürasyonu doldurmaya hazır hale getirdim. Sana kalan: 3 hesabı aç ve
4 değeri kopyala‑yapıştır.

## Ben ne hazırladım

- `apps/web/.env.local` → **iki secret önceden dolduruldu** (aşağıda), gerisi
  için yer tutucular hazır. Bu dosya gitignore'lu (commit edilmez).
- `apps/web/.env.example` → paylaşılabilir şablon.
- Üretilen değerler (bunlar hazır, dokunma):
  - `ENCRYPTION_KEY_BASE64` = `/BYP+72PDK/4Ab2Haq5IqW1P5T6UWn6f2c9qhu+PRqQ=`
  - `SESSION_SECRET` = `jVF1slONJISi2-v8PQS1s4Z8d3fOiIF6d6SxdIQL9WvazoS0MynPn1ZD-9Uo2EyT`

> Güvenlik: Bu iki değeri gizli tut. Sızarsa yukarıdaki `node -e ...` komutlarıyla
> yeniden üretip değiştir.

## Senin yapacağın 3 adım (tahmini 15 dk)

### 1) Postgres — Neon (önerilen, ücretsiz)
1. https://neon.tech → Sign up.
2. "Create project" → bölge seç.
3. Dashboard'da **Connection string**'i kopyala (psql/URI formatı, `sslmode=require` içeren).
4. `apps/web/.env.local` içinde `DATABASE_URL="..."` satırına yapıştır.

(Supabase tercih edersen: supabase.com → New project → Settings → Database →
Connection string → URI.)

### 2) Vercel — barındırma + domain
1. https://vercel.com → Sign up (GitHub ile giriş kolay).
2. Şimdilik proje oluşturman yeterli; **app domain'ini** belirle
   (ör. `handofflog.vercel.app` veya kendi domain'in).
3. Bu domain'i not et → bana söyleyeceğin tek şey bu.
4. `.env.local` içinde `APP_BASE_URL` ve `FIGMA_OAUTH_REDIRECT_URI`'daki
   `YOUR-APP-DOMAIN` yerine bu domain'i yaz.

### 3) Figma OAuth uygulaması
1. https://www.figma.com/developers/apps → **Create new app** (OAuth).
2. **Callback/redirect URL:** `https://<app-domain>/api/auth/figma/callback`
   (adım 2'deki domain ile birebir aynı).
3. Oluşunca **Client ID** ve **Client Secret**'i kopyala.
4. `.env.local` içinde `FIGMA_OAUTH_CLIENT_ID` ve `FIGMA_OAUTH_CLIENT_SECRET`'e yapıştır.

### (Opsiyonel) Slack bildirimi
- Slack workspace → Incoming Webhooks → yeni webhook URL → `SLACK_WEBHOOK_URL`'e yaz.
- İstemezsen boş bırak; sonra eklenebilir.

## Bittiğinde bana ne söyle

Sadece şunu yaz: **"hazır, domain: `<app-domain>`"**
(Secret'ların değerlerini bana YAPIŞTIRMA — onlar `.env.local`'da ve Vercel env'de kalır.)

Ardından ben:
- Next.js `apps/web` iskeleti + route handler'ları (mevcut `backend/*` + `prisma/schema.prisma` üzerine),
- OAuth callback + oturum, workspace/release/ack endpoint'leri, web UI,
- plugin `manifest.json` → `networkAccess` domain güncellemesi,
- `prisma migrate` ve Vercel deploy komutlarını (sen tetikleyeceksin) hazırlarım.

## Deploy anında (ben komutları vereceğim, sen çalıştıracaksın)

- Vercel env'e `.env.local`'daki tüm değişkenleri gir.
- `npx prisma migrate deploy` (DB şemasını uygular).
- Vercel'e deploy (GitHub bağlama veya `vercel` CLI).
