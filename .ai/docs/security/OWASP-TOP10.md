# OWASP TOP 10: Project-Specific Posture

OWASP Top 10 (2021 baseline + 2025 awareness) mapped to ReGen Civics specifics. Each item lists how we're positioned, where the risk lives in code, and what's still open.

Last reviewed: 2026-04-25.

---

## A01:2021: Broken Access Control

**Risk**: a procedure that should be admin-only is accidentally public; a userId comes from `input` instead of `ctx`; one user reads/edits another's data.

**Posture**:
- Every tRPC procedure is explicitly `publicProcedure`, `protectedProcedure`, or `adminProcedure`. Defaults nothing.
- `ctx.user.id` is the only legitimate user identifier source server-side. Procedures that take `userId` from input are an authz hole; we grep for them at audit time.
- `auth.me` is intentionally public so signed-out visitors don't get UNAUTHORIZED on every page mount. `auth.logout` is public so a corrupt-cookie user can recover. All other auth procedures are protected.

**Open / monitored**:
- Recurring grep audit for `userId` reads from `input` vs `ctx`. Last clean: 2026-04-25 audit (item 8 in the audit doc).
- `x-admin-secret` header check on cron + webhook endpoints uses timing-safe comparison via `timingSafeEqualStr` in `server/_core/security.ts` (commit `c1dc9d8`).

**Code**: `server/_core/trpc.ts`, `server/_core/security.ts:timingSafeEqualStr`.

---

## A02:2021: Cryptographic Failures

**Risk**: JWT secret is weak, stored insecurely, or rotated without forcing re-auth.

**Posture**:
- `JWT_SECRET` lives in Railway env. Validated at startup (`server/_core/env.ts`). Never logged.
- Sessions are signed HS256 with `JWT_SECRET`. Verified by `jose` library. 1-year expiry; no refresh.
- HTTPS-only enforced via `secure: true` cookie attribute in production (commit `657f230`). Mixed-content navigations get HSTS-blocked at the edge (Cloudflare).
- OAuth tokens (Google, Apple) are exchanged server-side. Nothing token-related touches the client.

**Open / monitored**:
- Secret rotation: when JWT_SECRET rotates, all in-flight sessions invalidate. Rotation procedure in OPS-PLAYBOOK.
- Apple's id_token signature is verified against the live Apple JWKS via `jose.createRemoteJWKSet` (`server/_core/oauth.ts:getAppleUserInfo`).

**Code**: `server/_core/sdk.ts`, `server/_core/oauth.ts`.

---

## A03:2021: Injection

**Risk**: SQL injection, command injection, NoSQL injection, header injection.

**Posture**:
- Drizzle ORM parameterizes queries by default. The few raw `sql\`\`` template literals use `${var}` parameterization (e.g., `db.execute(sql\`UPDATE users SET ...\${userId}\`)`).
- No `child_process` or shell spawning in user-input paths.
- `sanitizeInput` (`server/_core/security.ts`) is the single chokepoint for user-submitted text before it hits the DB. Applied uniformly in tRPC routers.
- HTML output in forum posts: rendered via `react-markdown` with `sanitizeForClient` from `client/src/utils/sanitize.ts`. Limited to a known-safe markdown subset.
- URLs in markdown `<a>` components: protocol allowlisted (http, https, mailto only) in `client/src/components/ForumMarkdown.tsx`.

**Open / monitored**:
- The XML-strip regex in `server/lib/videoSummary.ts:fetchYouTubeTranscript` is for trusted YouTube response content only; if we ever feed user-controlled XML through it, revisit.
- `sanitizeInput` is currently both stripping tags AND escaping entities (double-escape). Audited 2026-04-25 as low-priority cleanup; functional but worth simplifying.

**Code**: `server/_core/security.ts:sanitizeInput`, `client/src/utils/sanitize.ts`.

---

## A04:2021: Insecure Design

**Risk**: the system architecture has a fundamental flaw that no amount of code review catches.

**Posture**:
- Token writes are private-only on the server. Public chain writes are user-initiated only. (See ADR-7.) Insecure design here would be "server can write to chain on user's behalf"; we explicitly don't.
- No password resets via email-link-then-set-new-password. Instead the email magic link IS the auth path; no shared secret to leak.
- Webhook endpoints fail closed when their secret env var is missing in production (commit `76dc0ab`: `server/webhooks/resend.ts`).
- Logout uses a multi-variant cookie clear (commit `b767d54`) because cross-deploy cookie attribute drift was creating stuck-session bugs.

**Open / monitored**:
- ReGen Guide bot has rate limits on its forum posts (5/week, plus the new 40/day site + 3/day per author for video summaries). If those caps slip, the bot could become noisy.
- Quest reward issuance is gated by `protectedProcedure` + per-user rate limits + idempotency keys. A theoretical replay attack on quest completion would need to bypass all three.

---

## A05:2021: Security Misconfiguration

**Risk**: CORS too open, CSP too permissive, default credentials, debug routes exposed.

**Posture**:
- CSP `connect-src` tightened from `https:` to an explicit allowlist (commit `c1dc9d8`). Live CSP header verified on `regencivics.earth/` 2026-04-25.
- CORS: explicit allowlist in `server/_core/index.ts`. localhost:5173 added for dev.
- `app.set('trust proxy', 1)` set so X-Forwarded-* is honored at exactly one hop (Railway → Cloudflare).
- `Strict-Transport-Security` enforced. `X-Content-Type-Options: nosniff`. `X-Frame-Options: SAMEORIGIN`.
- Production: `NODE_ENV=production` → `secure: true` cookies default, even if `x-forwarded-proto` is missing (commit `657f230`).

**Open / monitored**:
- `script-src 'unsafe-inline'` is still present because Tailwind v4, Radix, shadcn/ui inject runtime `<style>` blocks without a nonce hook. Migrating to nonce-only is tracked as `CSP_NONCE_MIGRATION_PLAN`.
- Dev origins: `localhost:5173` is hardcoded in CORS. If we ever move dev port, update.

**Code**: `server/_core/security.ts:cspMiddleware`, `securityHeadersMiddleware`, `server/_core/cookies.ts`, `server/_core/index.ts`.

---

## A06:2021: Vulnerable + Outdated Components

**Risk**: a dependency has a known CVE; we're shipping it because we never updated.

**Posture**:
- `package.json` reviewed at audit time (last 2026-04-25: no obvious end-of-life packages).
- `pnpm install --frozen-lockfile` on Railway deploys (deterministic builds).
- Supply-chain hardening (added 2026-04-25): `.npmrc` with `ignore-scripts=true` blocks malicious postinstall scripts; `engine-strict=true` enforces the project's Node version at install.

**Open / monitored**:
- We don't run `pnpm audit` in CI today. Should add as a non-blocking check.
- Dependabot or Renovate could automate updates; not configured.

---

## A07:2021: Identification + Authentication Failures

**Risk**: weak session handling, password recovery flaws, credential stuffing.

**Posture**:
- No passwords (OAuth + magic link only). Removes the entire credential-stuffing surface.
- Magic link: 32-char nanoid token, 15-minute expiry, single-use (consumed on first verify). Stored in `email_tokens` table.
- OAuth state parameter is signed via base64 + decoded server-side; our state-recycle bug from 2026-04-25 (commit `cf1fb25`) was about returnTo poisoning, not state forgery.
- Cookie clearing on logout removes ALL three variant cookies (host-only, `.regencivics.earth`, no-dot) so a corrupt cookie state can self-recover (commit `b767d54`).

**Open / monitored**:
- Magic-link rate-limit: not yet rate-limited per email. A spammer could flood a target's inbox. To-do.
- Session revocation: today, the only revocation is cookie expiry. No global "log out everywhere" flow.

**Code**: `server/_core/oauth.ts`, `server/routes/auth.ts`, `server/_core/cookies.ts`.

---

## A08:2021: Software + Data Integrity Failures

**Risk**: code or data is modified by an attacker between trusted sources and the server (CI/CD compromise, supply chain, deserialization).

**Posture**:
- Railway pulls from GitHub on push. Branch protection on `main` is the human gate.
- Webhooks verify HMAC signatures (Resend, Riverside, Alchemy). Unsigned webhooks fail closed in production.
- The `cron-governance-jobs` and `cron-event-reminders` endpoints validate a Bearer token via `crypto.timingSafeEqual` (commits `76dc0ab` + `c1dc9d8`).
- No `eval()` or `new Function()` in the codebase. Verified by repo-wide grep.
- JSON body parsing is sanity-bounded (`limit: "50mb"`).

**Open / monitored**:
- No package signature verification (npm packages aren't signed by default). Mitigation: `ignore-scripts=true` + `engine-strict=true` (added 2026-04-25).
- Possible additional: `pnpm-workspace.yaml` `minimumReleaseAge` (delay package updates by N days). Not yet adopted; trade-off in DECISIONS.

---

## A09:2021: Security Logging + Monitoring Failures

**Risk**: an attacker is in our system and we have no idea.

**Posture**:
- Sentry on the client (`VITE_SENTRY_DSN`). Captures unhandled errors + sampled traces (10% rate). Initialized on first user interaction or 10s after load (whichever first) so it doesn't block initial render.
- Server: console.log + console.error to Railway log stream. No structured logging today.
- Webhook signature failures: rate-limited per-IP via `recordWebhookFailure`. Repeated failures from one IP show up in logs.

**Open / monitored**:
- No SIEM. No alert routing on suspicious patterns. If a brute-force happens overnight, we wouldn't know until someone notices in the morning.
- No login-anomaly detection (impossible-travel, multi-account-from-one-IP, etc).
- Potential: Railway log alerts + Pagerduty / Discord webhook for critical errors.

---

## A10:2021: Server-Side Request Forgery (SSRF)

**Risk**: server fetches a URL controlled by an attacker, gaining access to internal services.

**Posture**:
- Server fetches happen in known places: link-preview (`open-graph-scraper`), YouTube transcript fetcher (`server/lib/videoSummary.ts`), Hypha bridge, OAuth token exchanges. All call known-domain endpoints.
- Link-preview fetcher: `ogs({ url, timeout: 5 })` honors the user-supplied URL. Risk: a link to `http://169.254.169.254/` (AWS metadata) or a private RFC 1918 address could pull internal data.
- Mitigation today: Railway runs in a managed environment with no exposed metadata service of value. But this is a posture gap.

**Open / monitored**:
- Add a URL allowlist or block-list in the link-preview fetcher: reject `localhost`, `127.0.0.0/8`, `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`, `169.254.0.0/16`, `::1`, etc.
- Same for YouTube transcript fetcher (it only ever fetches `youtube.com`, but enforcing that explicitly hardens it).

---

## OWASP 2025 forward-look

OWASP Top 10 2025 will likely include API-specific items (rate limit absence, broken object property authorization). We're already enforcing per-procedure rate limits and authz; the documentation here is the spec.

LLM-specific risks (prompt injection, model output trust, training-data leakage) are covered in `AI-AUTOMATION-RISKS.md`.
