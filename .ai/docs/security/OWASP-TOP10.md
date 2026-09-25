# OWASP TOP 10: Project-Specific Posture

OWASP Top 10 (2021 baseline + 2025 awareness) mapped to ReGen Civics specifics. Each item lists how we're positioned, where the risk lives in code, and what's still open.

Last reviewed: 2026-06-30 (full codebase re-audit; corrections tagged `2026-06-30 audit` inline).

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

**Campaigns and project stewards (2026-09-24)**, each pinned by `server/campaign-security.test.ts` (every guard was planted back once and a test failed):
- **One steward gate.** `server/lib/project-steward.ts` decides who holds a land project's tools: admins and superadmins, the campaign creator, the application's applicant and `stewardUserId`, and approved `land_project` org-claim holders. Every campaign steward procedure calls `assertCampaignSteward`; the eight inline `campaign.userId !== ctx.user.id` checks are gone. `applications.stewardUpdate` uses `canStewardApplication` (it used to accept an approved claim of any org type whose id matched).
- **Deliberate widening.** Every project steward now sees contributor names, emails and phone numbers through `campaigns.getContributionsForOwner`. They run the project. The helper is the only gate.
- **Status transitions.** `campaigns.updateStatus` let an owner set any status, so a creator could publish past review or mark their own campaign complete. The tables in `shared/campaignStatus.ts` now decide: stewards send a draft for review and cancel; publish, complete and reject are admin moves. Updates are conditional on the status read, so two admins cannot double-apply.
- **Create ownership.** `campaigns.create` required nothing but a shared client-side password ("222", `verifyCampaignAccess`, now removed). A non-admin must name an application they applied for or steward, with status approved or active.
- **Applicant list.** `applicantsForCampaign.list` returned every submitted, approved and active application to any signed-in user. Non-admins now get only their own approved or active rows.
- **Unpublished children.** `getItems`, `getPartnerLinks`, `getActivity`, `listUpdates`, `getImages` and `getContributions` return `[]` for a draft, pending or rejected campaign unless the caller stewards it; `getById` returns `null`. Before, a draft's needs and journal were readable by counting ids.
- **Cancelled before it went live (2026-09-24).** `canSeeCampaign` counted `cancelled` as published, so a draft or in-review campaign that was cancelled became readable by anyone through `getById`, `list` and the project page. `isPublicCampaign` (`server/lib/project-steward.ts`) now makes a cancelled campaign public only if it has a `startedAt` or `publishedAt`; its SQL twin `publicCampaignSql` filters global search, and the embed widget and OG card refuse unpublished campaigns (both used to render any id, drafts included; not yet under test). The rule and the search filter are pinned by `server/campaign-visibility.test.ts` and `server/public-projection-2.pii.test.ts`; each was planted back once and a test failed.

- **Steward tools on the project page (2026-09-24).** Every new steward procedure (`setAcceptedHours`, `setNeedHours`, `cancel`, `followerCounts`, and the `released` status on `updateContributionStatus`) calls `assertCampaignSteward`; `canSteward` only answers a boolean. `projects.getPublic` shows draft, pending and sent-back campaigns only to that project's stewards, gives no public page to an application still in review, and reads only `projectName`, `location`, `country` and `status` from the application. Pinned by `server/projects.test.ts` and `server/role-hours.test.ts`.
- **Review fixes (2026-09-24, second pass)**, pinned by `server/campaign-security.test.ts` section 7:
  - `orgClaims.approve` runs its "project already has a different steward" check BEFORE marking the claim approved. It used to approve first and then throw CONFLICT, leaving an approved land_project claim, which `project-steward.ts` counts as a full steward (contact details, accept, cancel). The admin claims panel now shows the application's real project name beside the name the claimant typed. Production claims approved through the old path need a one-off audit (see the deploy notes).
  - `campaigns.getContributions` (public) builds each row from an allowlist (`PUBLIC_CONTRIBUTION_FIELDS`) and shows visitors only offers that stand (accepted, fulfilled, thanked). It used to strip four contact fields and return everything else, including the stewards' private notes to a contributor (`ownerNotes`), account ids and bridge keys, for every status.
  - `campaigns.follow` and `subscribeByEmail` answer NOT_FOUND for a campaign the caller cannot see, and update and cancel notices never reach followers of a campaign that never went live. A follow by id used to deliver a draft's title, updates and cancel message to a stranger.
  - Sign-in links draw on their own hourly email budget (`sendEmail({ budget: 'auth' })`), so a burst of campaign notices or offers can no longer use up the shared 50-an-hour cap and stop people signing in. Fan-out campaign notices (update, cancelled, completed, role filled) email by the daily digest.
- **Email-list unsubscribe (2026-09-24).** `campaigns.unsubscribeEmailFollow` is public by design: a 32-character `nanoid` token from the letter's footer is the only credential, and it can only remove rows (`this` removes the rows carrying the token; `all` removes every campaign-follower and waitlist row for that token's email). It answers `{ ok: true }` for any token, so it cannot be used to test tokens or learn emails, and the token is never logged. Pinned by `server/outbound-audience.test.ts`.

**Code**: `server/_core/trpc.ts`, `server/_core/security.ts:timingSafeEqualStr`, `server/lib/project-steward.ts`, `shared/campaignStatus.ts`.

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
- `sanitizeInput` (`server/_core/security.ts`) strips all tags + escapes entities. **Update (2026-06-30):** now backed by the vetted `sanitize-html` library (strict `allowedTags: []`), replacing the hand-rolled regex. Coverage widened: forum posts/replies, campaigns, features, gratitude, agreements, claims, plus (new this pass) profiles (`server/routes/players.ts`) and direct messages (`server/routes/messages.ts`). A `sanitizeRichText` variant with a markdown-safe tag allowlist is provided for future rich-text fields (not yet wired).
- HTML output in forum posts: rendered via `react-markdown` with `sanitizeForClient` from `client/src/utils/sanitize.ts`. Limited to a known-safe markdown subset.
- URLs in markdown `<a>` components: protocol allowlisted (http, https, mailto only) in `client/src/components/ForumMarkdown.tsx`.

**Open / monitored**:
- The XML-strip regex in `server/lib/videoSummary.ts:fetchYouTubeTranscript` is for trusted YouTube response content only; if we ever feed user-controlled XML through it, revisit.
- `sanitizeInput` entity-encodes stray `<`/`>`/`&` in text after tag-stripping (via `sanitize-html`). Fields rendered through React/`react-markdown` are also output-escaped; the belt-and-suspenders double-encode is intentional for non-HTML sinks (email, plain-text). Low priority.

- **Email HTML (2026-09-24).** The contribution-status emails interpolated contributor names, campaign titles and the steward's free-text note raw into HTML, so a note could carry a link or markup into someone's inbox. Every value now goes through `textForEmail` (`shared/htmlText.ts`: decode the basic entities once, then escape), which also stops sanitized values printing as `&amp;amp;`. The same applies to `notifyOwner` (`server/_core/notification.ts`) and the notification email and digest renderers. Steward notes (`ownerNotes`), campaign titles and project names are now stored through `sanitizeInput`. Pinned by `shared/htmlText.test.ts` and `server/campaign-security.test.ts` section 6.

**Code**: `server/_core/security.ts:sanitizeInput`, `client/src/utils/sanitize.ts`, `shared/htmlText.ts`.

---

## A04:2021: Insecure Design

**Risk**: the system architecture has a fundamental flaw that no amount of code review catches.

**Posture**:
- Token writes are private-only on the server. Public chain writes are user-initiated only. (See ADR-7.) Insecure design here would be "server can write to chain on user's behalf"; we explicitly don't.
- No password resets via email-link-then-set-new-password. Instead the email magic link IS the auth path; no shared secret to leak.
- Webhooks verify HMAC over the raw request string captured once by the global `express.json({ verify })` in `server/_core/index.ts` (stored as `req.rawBody`). **Finding + fix (2026-06-30):** GitHub + Riverside handlers additionally mounted their own route-level `express.raw()`, which no-ops after the global parser has consumed the stream, leaving `req.body` a parsed object. GitHub then called `createHmac().update(object)` → TypeError throw → no response → GitHub's 10s delivery timeout; Riverside re-serialized with `JSON.stringify(req.body)` → HMAC never matched → silent 401. Fixed by reading `req.rawBody` and removing the route-level parser (matching `resend`/`loomio`/`hypha`). Note: both webhook secrets ARE configured in Railway; Riverside's is intentionally absent and its handler is secret-optional (secondary ingest path). Resend fails open in non-production only.
- Logout uses a multi-variant cookie clear (commit `b767d54`) because cross-deploy cookie attribute drift was creating stuck-session bugs.

- **List mail is admin-sent only (2026-09-24).** People who follow a campaign by email, or join the crowdpool waitlist, are never mailed automatically. Rye sends to them from admin Outbound, which re-resolves the list at send time (anyone who left since the preview is `skipped_unsub`) and gives every letter that person's own token stop link (`server/lib/outboundAudience.ts`, `shared/letterHtml.ts` `listFooter`). An old newsletter audience parses and hashes exactly as before, so a stored preview approval still binds to what goes out. There is no double opt-in yet (open question for Rye; small volumes, silent upsert, stop link on every letter).
- **Hours capacity cannot be overfilled (2026-09-24).** Accepting hours on a role locks the need's row (`SELECT ... FOR UPDATE`) and sums the standing hours inside one transaction, so simultaneous accepts cannot pass the hours the role needs; counters are recomputed from rows. Pinned by `server/role-hours.test.ts` (five simultaneous accepts on a 40-hour role).

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
- Permissions-Policy: `camera=()`, `geolocation=()`, `payment=()` stay off. `microphone=(self)` so admin dictation and companion voice can request the mic on this origin. A prior `microphone=()` value made Allow in the address bar a no-op.
- Production: `NODE_ENV=production` → `secure: true` cookies default, even if `x-forwarded-proto` is missing (commit `657f230`).
- 2026-07-17, companion voices (ADR-44): `script-src` gained `'wasm-unsafe-eval'` (WebAssembly compile only; grants nothing to eval), `worker-src 'self' blob:` added (onnxruntime-web threading workers), and `connect-src` gained `https://huggingface.co https://*.huggingface.co https://*.hf.co` (Kokoro model download, one ~90MB browser-cached fetch) plus `https://cdn.jsdelivr.net` (ONNX WASM binary). All serve static model artifacts; no script execution granted to those origins beyond the pre-existing jsdelivr `script-src` entry. The hosted `companion.speak` procedure is public but rate-limited (`companion_tts`), text-capped at 600 chars, registry-validated voice keys only, and server-cached, bounding third-party TTS spend per client.

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
- OAuth `state` is HMAC-SHA256 signed. **Update (2026-06-30):** `state` now carries `{ returnTo, nonce, issued-at }` with an HMAC keyed by `JWT_SECRET`; every callback (Google, Apple, GitHub link) verifies the signature constant-time and rejects states older than a 15-min TTL before any token exchange. `normalizeReturnTo()` still defends returnTo poisoning (commit `cf1fb25`). An attacker can no longer forge or replay a `state`. `oauth.ts:signState/verifyState`.
- Cookie clearing on logout removes ALL three variant cookies (host-only, `.regencivics.earth`, no-dot) so a corrupt cookie state can self-recover (commit `b767d54`).

**Open / monitored**:
- Magic-link rate-limit: not yet rate-limited per email. A spammer could flood a target's inbox. To-do.
- Session revocation: today, the only revocation is cookie expiry. No global "log out everywhere" flow.
- OAuth `state` is HMAC-signed (done 2026-06-30). Remaining hardening: a browser-bound nonce cookie would fully close login-CSRF, but Apple's cross-site `form_post` callback won't send a `SameSite=lax` cookie and this codebase avoids `SameSite=none` (Safari drops it — see `cookies.ts`). Deferred.
- Session cookie is 1-year, `SameSite=lax`, HttpOnly, `secure` forced true in prod. Long-lived credential; consider shorter expiry + refresh.
- CSRF token store + webhook-failure rate-limit buckets are Redis-backed. **Update (2026-07-01):** `generate/validateCSRFToken` and `isWebhookFailureBlocked/recordWebhookFailure` now read/write through the shared `../cache` Redis layer when `REDIS_URL` is set (keys `csrf:*`, `webhookfail:*`), so they hold across Railway replicas and restarts; they fall back to the per-instance in-memory maps only when Redis is unavailable. The functions are now async; CSRF compare also upgraded to `timingSafeEqualStr`. The main `rateLimitMiddleware` was already Redis-backed via the same layer. (Confirmed live 2026-07-01: /health shows cache:connected. Required both the missing initCacheOnStartup() wiring and a Redis container redeploy on Railway.)

**Code**: `server/_core/oauth.ts`, `server/routes/auth.ts`, `server/_core/cookies.ts`.

---

## A08:2021: Software + Data Integrity Failures

**Risk**: code or data is modified by an attacker between trusted sources and the server (CI/CD compromise, supply chain, deserialization).

**Posture**:
- Railway pulls from GitHub on push. Branch protection on `main` is the human gate.
- Webhooks verify HMAC signatures (Alchemy, Loomio, Resend, GitHub, Riverside) over `req.rawBody`. GitHub + Riverside were fixed on 2026-06-30 (double body-parse crash/401; see A04). **Anti-pattern to avoid:** mounting a route-level `express.raw()` after the global `express.json()` — it no-ops and breaks signature verification. Riverside is secret-optional by design; Resend fails open in non-production only.
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
