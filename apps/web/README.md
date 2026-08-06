# Handofflog Web (Phase 2)

Private team web app: Figma OAuth login, release timeline, developer
acknowledgement. Thin Next.js (App Router) layer over the tested backend logic
in `../../plugin/src/backend` (services, authz, crypto, oauth) and
`../../plugin/src/shared` (release/domain schemas).

> Deploy target: **Vercel + hosted Postgres (Neon)**, Figma OAuth (DEC-028).
> Secrets live in Vercel env / local `.env.local` — never in code.

## Structure

```
apps/web/
  prisma/schema.prisma        # DB schema (I-04)
  src/server/
    db.ts                     # Prisma client
    repository.prisma.ts      # Repository impl over Postgres
    session.ts                # signed-cookie session (HMAC)
    figma-auth.ts             # OAuth token exchange + profile
    onboarding.ts             # find/create user + workspace
  app/
    page.tsx                  # login
    releases/page.tsx         # timeline (server component)
    api/auth/figma/route.ts           # start OAuth
    api/auth/figma/callback/route.ts  # OAuth callback → session
    api/releases/route.ts             # POST publish · GET list
    api/releases/[id]/ack/route.ts    # POST ack · GET rate
```

## Environment

Copy `.env.example` → `.env.local` and fill it (or pull from Vercel). Required:
`DATABASE_URL`, `DATABASE_URL_UNPOOLED` (Neon direct, for migrations),
`FIGMA_OAUTH_CLIENT_ID`, `FIGMA_OAUTH_CLIENT_SECRET`, `FIGMA_OAUTH_REDIRECT_URI`,
`APP_BASE_URL`, `SESSION_SECRET`, `ENCRYPTION_KEY_BASE64`.
(The Vercel–Neon integration provides `DATABASE_URL*` automatically.)

## Local run

```bash
cd apps/web
npm install
npx prisma generate
npx prisma migrate dev --name init   # creates tables in your dev DB
npm run dev                          # http://localhost:3000
```

## Deploy (Vercel)

1. In the Vercel project → **Settings → General → Root Directory** = `apps/web`.
2. **Settings → Environment Variables**: ensure all env vars above are present
   (DB vars are already added by the Neon integration; add the Figma + app
   ones). `FIGMA_OAUTH_REDIRECT_URI` must equal
   `https://<your-domain>/api/auth/figma/callback` and match the Figma app.
3. Connect your Git repo (or `vercel` CLI) and deploy.
4. Apply the schema to the production DB:
   ```bash
   npx prisma migrate deploy   # uses DATABASE_URL_UNPOOLED
   ```

## Plugin connection (done)

End-to-end wired: the web app mints a connection token (`POST /api/tokens`,
UI at `/connect`) bound to the user's workspace+project; only its SHA-256 hash
is stored. The Figma plugin stores the raw token (Settings → *Ekip sunucusu*)
and sends it as `Authorization: Bearer` on Publish; `POST /api/releases`
resolves workspace/project/user from the token. So: **plugin Publish → release
appears in the web timeline.**

## Remaining wiring (tracked)

- **UI:** release detail/compare (I-11), developer inbox + ack button + rate
  display (I-12/I-13 UI), Slack webhook (I-14), retention/delete (I-15).
