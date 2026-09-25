# BUILD PLAYBOOK: Pre-Merge Security Checklist

The 10-minute pre-merge security pass. Run through every item before claiming a feature is VERIFIED. If something can't be answered cleanly, surface it before the commit lands.

Last reviewed: 2026-04-25.

---

## 1. tRPC procedures

For every new procedure:

- [ ] Is it `publicProcedure`, `protectedProcedure`, or `adminProcedure`? Decision is explicit, not defaulted.
- [ ] Inputs validated by Zod with concrete bounds (`.max(N)`, `.min(N)`, `.regex(...)`). No `z.any()` unless deeply justified.
- [ ] User identifier comes from `ctx.user.id`, never from input.
- [ ] If a mutation, does it need a per-procedure rate limit? `rateLimited({ windowMs, max })` from `server/_core/trpc.ts` is the path.
- [ ] If it touches tokens, does it use `db.creditPrivateTokens` (writes) and `playerProfiles.getMyTokens` (reads)? Never write public balances.
- [ ] If it touches another user's resource, does it verify ownership / admin status?

### Public email-list procedures (worked example, 2026-09-24)

`campaigns.joinWaitlist`, `campaigns.subscribeByEmail` and `campaigns.unsubscribeEmailFollow` take input from anyone, signed in or not. The pattern every public list procedure follows:

- [ ] `checkRateLimit(ctx, <action>)` per IP before any database work (`campaign_follow_email` for sign-ups, `campaign_list_unsubscribe` for the stop link).
- [ ] No enumeration: the answer is the same `{ ok: true }` whether the email was already on the list, the token matched a row, or the token matched nothing. A duplicate sign-up is a silent upsert on a unique key.
- [ ] The server decides anything that scopes the row (the waitlist's `seasonNumber` comes from `regenSeasonSpan()` on the server, never from the client).
- [ ] Tokens are `nanoid(32)`, validated as exactly 32 characters, and never logged, echoed, or put in an error message. A token only ever removes rows; it never reads one back to the caller.
- [ ] Lists are mailed only from admin Outbound (`server/lib/outboundAudience.ts`), each letter with that person's own stop link, never the newsletter prefs link.
- [ ] Pinned by `server/outbound-audience.test.ts`.

### Money routes (worked example, 2026-09-25)

A money route is a URL a project steward types that the server later fetches (the nightly hydration job reads the partner's page for its raised figure). That makes it a user-supplied URL in a server fetch, section 6 below, plus an authorization split. The pattern (`server/lib/partner-links.ts`, `campaigns.addPartnerLink` / `removePartnerLink` / `getPartnerLinksForSteward` / `reviewPartnerLink`, `hydrateCampaignPartnerLinks` in `server/routes/batchJobs.ts`):

- [ ] **Allowlisted hosts, checked on the way in.** `validateRouteUrl(partner, url)`: parse with `new URL`, `https:` only, no username or password, default port, hostname exactly on that partner's list, a path past the front page, at most 512 characters. No suffix or substring matching, so `maearth.com.evil.test` and `evilmaearth.com` fail. The refusal names the partner and its first host so the steward knows what to paste.
- [ ] **Two roles.** A project steward adds and removes (`assertCampaignSteward` only); a ReGen Civics admin verifies (`adminProcedure`). A new row is `pending` and appears nowhere public until verified. The admin also sets the currency of the partner page's numbers.
- [ ] **Public reads use an explicit column list** and filter to `verified` (plus `example` on example campaigns). Review fields (`proofUrl`, `reviewNote`, `addedBy`, `verifiedBy`) stay in the steward and admin read.
- [ ] **The fetcher trusts nothing it stored.** It loads verified rows only, re-runs `validateRouteUrl` before each fetch, uses `redirect: 'manual'`, and follows one 3xx only when `isAllowedHop` keeps it on the same partner's hosts. A refused URL, an off-host or second redirect, a non-200 or a timeout all count as failed and leave the cached numbers alone.
- [ ] **Logs carry the row id, never the URL.**
- [ ] **Ship the fetch hardening with the write path.** A procedure that lets people store URLs must not reach production before the fetcher that reads them is fenced (OWASP A10).
- [ ] Pinned by `server/partner-links.test.ts` (allowlist, look-alikes, IP literals, hops), `server/partner-hydration.test.ts` (verified-only loader, manual redirects, one hop) and `server/money-routes.test.ts` (roles, visibility, example campaigns, the loan route rail).

## 2. Webhooks

For any new inbound webhook:

- [ ] Signature verification on every request. `WEBHOOK_SECRET` (or equivalent) required env var.
- [ ] Fails closed in production: missing secret or missing signature → 401 / 403, never accept.
- [ ] Per-IP rate-limit on signature failures via `recordWebhookFailure(ip, scope)` in `server/_core/security.ts`.
- [ ] Idempotency key handled: a retried delivery doesn't double-write.
- [ ] No PII in logs.

## 3. Cookies + sessions

For any code that sets or reads a cookie:

- [ ] Use `getSessionCookieOptions(req)` or document why you're not.
- [ ] `httpOnly: true`, `secure: <isSecureRequest+prod fallback>`, `sameSite: "lax"`, `path: "/"`, `domain: ".regencivics.earth"` (production).
- [ ] On logout / clear: use `clearAllSessionCookies(req, res)` to handle multi-variant cleanup.
- [ ] Cookie name + path + domain match between set and clear (browsers identify cookies by this triple).

## 4. Public input handling

For any code that consumes user-submitted text:

- [ ] Bounded length (Zod `.max(N)`) at the entry point.
- [ ] Stored after `sanitizeInput` (server-side).
- [ ] Rendered after `sanitizeForClient` (markdown surface) or React's default escaping.
- [ ] If pasted into an HTML attribute: escape or use a known-safe component.
- [ ] If sent to an LLM: see `AI-AUTOMATION-RISKS.md`.

## 5. URLs in user content

- [ ] Protocol allowlist: `http:`, `https:`, `mailto:` only. Anything else → render as `#`.
- [ ] Open in new tab + `rel="noopener noreferrer"` for cross-origin links.
- [ ] If embedding (iframe, video): use the existing `VideoEmbed` parser; don't roll new iframe creators.

## 6. Outbound HTTP from the server

For any new `fetch()` call from the server:

- [ ] URL is built from a known-good template, not a user-supplied raw URL.
- [ ] If the URL DOES come from user input (e.g. link preview, transcript fetcher): SSRF guard (reject private/loopback addresses, see OWASP-TOP10 A10).
- [ ] Timeout set (`AbortController` or library option).
- [ ] Error handling distinguishes "transient" (retry-worthy) from "permanent" (log + fail).
- [ ] Don't log the full URL if it could contain a token / secret.

## 7. Environment variables

- [ ] Added to `.env.example` with a one-line comment.
- [ ] Required-in-production env vars: validated at startup in `server/_core/env.ts:REQUIRED`.
- [ ] Never logged in any path.
- [ ] If a client-side env var: prefix `VITE_` and assume it's public.

## 8. SQL + ORM

- [ ] Use Drizzle's typed query builder by default.
- [ ] If you're writing `sql\`...\``, ALL user input is interpolated via `${var}` (which parameterizes), never via string concat.
- [ ] No `db.execute(sql.raw(userInput))` ever.

## 9. New deps

- [ ] Check the package's last-publish date. Stale or unmaintained → revisit.
- [ ] Check the dep tree (`pnpm why <pkg>`): small + well-known is preferable.
- [ ] Don't add a dep for a 5-line utility you can write inline.
- [ ] After install: `pnpm install` should succeed with `ignore-scripts=true` (no postinstall script needed).

## 10. Output to logs / Sentry

- [ ] Do NOT log: passwords, tokens, secrets, JWT contents, full request bodies for authed routes, full email headers, raw cookie values.
- [ ] DO log: error messages, redacted user identifiers (e.g., `userId=42` not `user="rye@pm.me"`), request paths, status codes.
- [ ] Sentry: rate-limited via Sentry config (`tracesSampleRate: 0.1`). Don't capture user-input strings into breadcrumbs.

---

## When you're touching auth specifically

Auth changes are higher-stakes. Add this:

- [ ] Read `OWASP-TOP10.md` A07 before touching the OAuth flow.
- [ ] Verify cookie is set / cleared on actual production via Claude in Chrome (`STEERING.md` Section 4 mandate).
- [ ] Test the rollback path: if your change breaks, can a stuck user log out + back in to recover?
- [ ] Test the multi-variant cookie scenario: a stale `app_session_id` from a previous deploy era should not block the new flow.

## When you're touching webhooks specifically

- [ ] Verify the webhook in dev with a curl that includes the right signature header.
- [ ] Verify rate limiting kicks in: 6 unsigned attempts from same IP → 429 on attempt 6.
- [ ] Verify retry idempotency: feed the same payload twice; second one should be a no-op.

## When you're adding LLM-driven content

- [ ] Read `AI-AUTOMATION-RISKS.md` end to end.
- [ ] Output rate-limited (per-user + per-resource).
- [ ] Output cost-bounded (max tokens per call, max calls per day).
- [ ] User-input content reaching the LLM is sanitized + length-bounded.
- [ ] LLM output rendered through the same sanitizer as user content (don't trust LLM output).
- [ ] Bot-attributed posts include a provenance line in the body so users know it's AI.

---

## Pre-merge command sequence

```bash
# 1. Truncation gate (mandatory after every commit)
python3 scripts/audit-truncation.py

# 2. Type check
pnpm typecheck

# 3. Em-dash check on changed user-facing files (per project Writing Rules)
git diff --name-only HEAD | grep -E "client/src/(pages|components)" | xargs -I {} grep -l "-" {} 2>/dev/null

# 4. Ensure new className has matching CSS
git diff HEAD | grep "+.*className=" | rg "className=\"([^\"]+)\"" -or '$1' | tr ' ' '\n' | sort -u | xargs -I {} rg -g '*.css' '\.{}' client/src/

# 5. If you added a new env var, confirm .env.example was updated
git diff HEAD -- .env.example
```

## Pre-deploy verification (post-push)

`STEERING.md` Section 4 mandate: load-bearing changes get verified live via Claude in Chrome before declaring DONE. The pattern is documented there + in `~/.claude/memories/rye-working-style.md`.
