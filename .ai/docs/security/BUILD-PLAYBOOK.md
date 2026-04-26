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
