# CHECKLIST: Quarterly Self-Audit

The list of things to verify haven't drifted. Run quarterly + after every significant deploy.

Last full pass: 2026-04-25.
Partial re-audit: 2026-06-30 (corrections tagged inline).
Next due: 2026-07-25.

Format: each item has a status (`ok` / `open` / `n/a`) and a date of last check.

---

## Auth + sessions

- [x] `JWT_SECRET` is in Railway env, validated at startup, never logged. (2026-04-25: ok)
- [x] Cookie attributes: `httpOnly`, `secure` (prod fallback to true), `sameSite=lax`, `domain=.regencivics.earth`. (2026-04-25: ok)
- [x] `clearAllSessionCookies` clears all 3 variants on logout + before fresh sign-in. (2026-04-25: ok per commit `b767d54`)
- [x] OAuth state validation rejects `error=auth_failed` paths to prevent loop. (2026-04-25: ok per commit `cf1fb25`)
- [ ] OAuth `state` signed/nonce-bound against login CSRF. (2026-06-30: open — state is base64url-encoded only, not signed)
- [x] `auth.me` is publicProcedure (intentional). `auth.logout` is publicProcedure (allows recovery). (2026-04-25: ok)
- [ ] Magic-link rate limit: not yet bounded per-email. (2026-04-25: open)
- [ ] Session revocation: only via cookie expiry today. No global "log out everywhere" flow. (2026-04-25: open, not blocking)

## Webhooks

- [x] Resend webhook signature verification fails closed in production. (2026-04-25: ok per commit `76dc0ab`; fails open in non-production by design)
- [x] GitHub + Riverside webhooks fail closed when their signing secret is unset. (2026-06-30: FIXED — were fail-open before. Requires `GITHUB_WEBHOOK_SECRET` / `RIVERSIDE_WEBHOOK_SECRET` set in Railway, or these endpoints now return 401)
- [x] CRON_SECRET timing-safe comparison via `timingSafeEqualStr`. (2026-04-25: ok per commit `c1dc9d8`)
- [x] x-admin-secret on `buffer.ts`, `farcaster.ts`, riverside resend-email: timing-safe. (2026-04-25: ok per commit `c1dc9d8`)
- [x] Webhook signature failure rate-limit: 5/min per IP. (2026-04-25: ok per commit `c1dc9d8`)
- [ ] Hypha-Alchemy webhook: signature verification + rate-limit. (2026-04-25: verify still ok)

## Input handling + injection

- [x] No raw SQL string concatenation. All `sql\`\`` uses `${var}` interpolation. (2026-04-25: ok per audit)
- [x] No `eval` / `new Function` / `vm.runInContext` in user-input paths. (2026-04-25: ok per repo grep)
- [ ] `sanitizeInput` is the chokepoint for user content into DB. (2026-06-30: OPEN — corrects prior "ok". Only forum posts/replies are sanitized; profiles, messages, campaign text are not. Hand-rolled regex, not a vetted library.)
- [x] `sanitizeForClient` + URL allowlist (http/https/mailto) on markdown render. (2026-04-25: ok)

## CSP + security headers

- [x] CSP `default-src 'self'`. (2026-04-25: ok)
- [x] CSP `connect-src` is an explicit allowlist (not `https:` blanket). (2026-04-25: ok per commit `c1dc9d8`)
- [x] HSTS, X-Content-Type-Options, X-Frame-Options, Referrer-Policy all set. (2026-04-25: ok)
- [x] Cross-Origin-Opener-Policy: `same-origin-allow-popups`. (2026-04-25: ok)
- [ ] `script-src 'unsafe-inline'` migration to nonce-only. (2026-04-25: open, tracked in CSP_NONCE_MIGRATION_PLAN)
- [ ] `style-src 'unsafe-inline'` migration. Lower priority (inline styles can't execute code). (2026-04-25: open)

## Supply chain

- [x] `pnpm install --frozen-lockfile` on Railway deploy. (2026-04-25: ok per `vercel.json` and Railway config)
- [x] `.npmrc` with `ignore-scripts=true` blocks postinstall scripts. (2026-04-25: ok, added Day 3 of `.ai/` adoption)
- [x] `.npmrc` with `engine-strict=true` enforces Node version at install. (2026-04-25: ok)
- [ ] `pnpm audit` in CI. (2026-04-25: open)
- [ ] Dependabot / Renovate for automated updates. (2026-04-25: open)
- [ ] `pnpm-workspace.yaml` `minimumReleaseAge` (delay package updates). (2026-04-25: open, considered but not adopted)

## Logging + monitoring

- [x] Sentry on client (`VITE_SENTRY_DSN`). (2026-04-25: ok)
- [x] Server logs to Railway log stream. (2026-04-25: ok)
- [x] No PII in logs (verified by repo grep for console.log + email/token patterns). (2026-04-25: ok)
- [ ] Structured server-side logging (JSON, log levels). (2026-04-25: open)
- [ ] Anomaly alerts (login failures, rate limit trips, webhook failures). (2026-04-25: open)
- [ ] Cost circuit-breaker for LLM calls if daily spend exceeds threshold. (2026-04-25: open)

## SSRF + outbound HTTP

- [x] Server fetches: known-domain endpoints only. (2026-04-25: ok)
- [x] Link-preview fetcher (`open-graph-scraper`) honors user-supplied URL. Theoretical SSRF risk. (2026-04-25: open, mitigation in OWASP-TOP10 A10)
- [ ] URL block-list for private/loopback addresses on link-preview. (2026-04-25: open)
- [x] YouTube transcript fetcher hardcoded to `youtube.com`. (2026-04-25: ok per `server/lib/videoSummary.ts`)

## AI / LLM

- [x] System prompts contain no secrets. (2026-04-25: ok)
- [x] LLM output rendered through same sanitizer as user content. (2026-04-25: ok)
- [x] Bot replies include provenance line. (2026-04-25: ok)
- [x] Per-feature rate limits on LLM calls. (2026-04-25: ok per `server/lib/videoSummary.ts` + `server/lib/regenGuide.ts`)
- [ ] Pre-filter user input for prompt injection patterns. (2026-04-25: open, deferred until first observed exploit)
- [ ] Cost circuit-breaker. (2026-04-25: open)
- [ ] Quarterly system prompt review. (next: 2026-07-25)

## Privy auth migration cleanup

- [x] Privy stub files removed from main site. (2026-04-25: ok per commit `657f230`)
- [x] `ENV.authProvider` field removed. (2026-04-25: ok)
- [x] Database columns kept for data preservation. (2026-04-25: ok)
- [ ] `apps/gov/` Privy auth: still in use. Document its threat model + rotation procedures separately. (2026-04-25: open, not blocking)

## Cowork-specific

- [x] FUSE truncation audit script (`audit-truncation.py`) is run before every commit. (2026-04-25: ok)
- [x] Plumbing-style git commit pattern documented in `cowork-vm-quirks.md` for stuck `.git/index.lock`. (2026-04-25: ok)
- [x] Cowork agents follow `verify-on-production` protocol for load-bearing changes. (2026-04-25: ok per working-style memory)

## Documentation freshness

- [ ] Quarterly review: read every file in `.ai/docs/security/` end to end. (next: 2026-07-25)
- [ ] After every security-related commit: append to relevant doc. (ongoing)
- [ ] Update PRINCIPLES if a new posture rule emerges. (ongoing)
- [ ] OPS-PLAYBOOK incident entries: append for every prod incident. (ongoing)

---

## How to use this checklist

When running quarterly: go through each `[x]` and confirm still true. Date the line. If anything moved to `open`, add a note + a follow-up task.

When in doubt about an `open` item: surface in an AskUserQuestion with the trade-off framed clearly.
