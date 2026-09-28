# ReGen Civics — Production Setup Checklist

Use this document to activate all services before going live on Railway + Cloudflare.

---

## 1. Sentry (Error Tracking)

**Status:** Code integrated, DSN not set.

1. Go to [sentry.io](https://sentry.io) → New Project → Node.js (server) + React (client)
2. Copy the DSN from Project Settings → Client Keys
3. Add to Railway environment variables:

```
SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx
VITE_SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx
```

> Both vars use the same DSN value. `VITE_SENTRY_DSN` is exposed to the client bundle.

---

## 2. File Storage — Cloudflare R2

**Status:** Code uses `@aws-sdk/client-s3`, env vars not set.

1. Cloudflare dashboard → R2 → **Create bucket** named `regen-civics-assets`
2. R2 → Manage API Tokens → **Create token** with Object Read & Write on that bucket
3. (Optional but recommended) R2 bucket → Settings → **Custom Domain** → connect `assets.regencivics.earth`
4. Add to Railway:

```
AWS_ACCESS_KEY_ID=<R2 token Access Key ID>
AWS_SECRET_ACCESS_KEY=<R2 token Secret Access Key>
AWS_BUCKET_NAME=regen-civics-assets
AWS_REGION=auto
AWS_ENDPOINT_URL=https://<your-account-id>.r2.cloudflarestorage.com
STORAGE_PUBLIC_URL=https://assets.regencivics.earth
```

> `STORAGE_PUBLIC_URL` is the public base URL for uploaded files. Use your custom domain if set, or the R2 public dev URL (`https://pub-xxx.r2.dev`).

---

## 3. Email — Resend (Magic Links + Notifications)

**Status:** Code sends emails via Resend, API key not set.

1. [resend.com](https://resend.com) → API Keys → **Create key** (full access)
2. Resend → Domains → **Add domain** `regencivics.earth`
3. Copy the DNS records Resend gives you and add them in Cloudflare DNS (SPF, DKIM, DMARC)
4. Wait for domain to verify (usually < 5 minutes)
5. Add to Railway:

```
RESEND_API_KEY=re_xxxxxxxxxxxx
OWNER_EMAIL=you@regencivics.earth
EMAIL_DOMAIN=regencivics.earth
```

> `OWNER_EMAIL` receives all admin notification emails (new applications, LOIs, etc.).

---

## 4. Google OAuth

**Status:** Routes exist, credentials not set.

1. [console.cloud.google.com](https://console.cloud.google.com) → Select project → **APIs & Services → Credentials**
2. **Create OAuth 2.0 Client ID** → Web application
3. Authorised redirect URIs: `https://regencivics.earth/api/oauth/google/callback`
4. Add to Railway:

```
GOOGLE_CLIENT_ID=xxxxxxxxxxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxxxxxxxxxx
```

---

## 5. Apple OAuth

**Status:** Not adding — Google OAuth and magic link email cover login needs.

---

## 6. Google Maps (for /map page only)

**Status:** Frontend updated to use `VITE_GOOGLE_MAPS_API_KEY`, key not set.

1. [console.cloud.google.com](https://console.cloud.google.com) → APIs & Services → **Library**
2. Enable: **Maps JavaScript API**, **Geocoding API**, **Places API**
3. Credentials → Create API Key → Restrict it to your domain (`*.regencivics.earth/*`)
4. Add to Railway:

```
GOOGLE_MAPS_API_KEY=AIzaXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
VITE_GOOGLE_MAPS_API_KEY=AIzaXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

> Same key for both. The `VITE_` prefix exposes it to the client bundle (safe for Maps JS API keys when domain-restricted).

---

## 7. Anthropic (AI Chat)

**Status:** Code uses `ANTHROPIC_API_KEY`, verify it is set.

1. [console.anthropic.com](https://console.anthropic.com) → API Keys → **Create key**
2. Add to Railway:

```
ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxx
```

---

## 8. Core App Variables — Verify All Are Set

| Variable | Description | How to get |
|----------|-------------|------------|
| `DATABASE_URL` | MySQL connection string | Railway MySQL plugin → Connect tab |
| `REDIS_URL` | Redis connection string | Railway Redis plugin → Connect tab |
| `JWT_SECRET` | Session signing key (random 32+ chars) | `openssl rand -base64 32` |
| `APP_URL` | Production URL, no trailing slash | `https://regencivics.earth` |
| `VITE_APP_ID` | App identifier | `regen-civics` |
| `OWNER_OPEN_ID` | Your user ID — grants admin role | See step below |

### Getting your OWNER_OPEN_ID

1. Deploy without `OWNER_OPEN_ID` set
2. Sign in with Google
3. Query the database: `SELECT openId FROM users WHERE email = 'your@email.com';`
4. The value will look like `google:123456789012345678901`
5. Set `OWNER_OPEN_ID` to that value and redeploy

---

## 9. Database Migrations

**Status:** Run manually against Railway MySQL. NOT auto-run on deploy.

Migrations are hand-written `drizzle/NNNN_*.sql` applied by the custom runner
`scripts/run-migration.ts` (tracked in `_migrations_applied`, idempotent). Do
NOT use `drizzle-kit generate` / `migrate` (see `drizzle/README.md` for why).

```bash
pnpm db:migrate:status   # what's applied vs pending
pnpm db:push             # apply all pending (alias for run-migration.ts --all)
```

---

## 10. Cloudflare DNS

Point your domain at Railway:

1. Railway → your service → Settings → **Generate Domain** (or use custom domain)
2. Railway will give you a target hostname (e.g. `regen-civics-production.up.railway.app`)
3. Cloudflare DNS → Add record:
   - Type: `CNAME`
   - Name: `@` (or `www`)
   - Target: your Railway hostname
   - Proxy: **Enabled** (orange cloud)
4. SSL/TLS → set to **Full (strict)**

---

## Status Summary

All services are active and configured. Apple OAuth is intentionally skipped — Google OAuth and magic link email are sufficient for login.

| Service | Status |
|---------|--------|
| Core vars | ✅ Done |
| Database migrations | ✅ Done |
| Google OAuth | ✅ Done |
| Resend email | ✅ Done |
| R2 storage | ✅ Done |
| Sentry | ✅ Done |
| Apple OAuth | — Skipped |
| Google Maps | ✅ Done |
| Anthropic | ✅ Done |
