# OPS PLAYBOOK: Operational Security Procedures

What to do when things break, leak, or need rotating. Procedures here run in <30 minutes each. Ten minutes is the goal.

Last reviewed: 2026-04-25.

---

## Procedure 1: Rotate JWT_SECRET

When: secret leaked, periodic rotation (every 6-12 months), suspected compromise.

Effect: every active session is invalidated immediately. Every user must sign in again.

Steps:

1. Generate a new secret: `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`
2. Update Railway env var `JWT_SECRET` (Railway dashboard → Variables → edit → save).
3. Railway redeploys automatically. Wait ~3 min.
4. Verify: hit `regencivics.earth/api/trpc/auth.me` with an old session cookie. Should return null (session invalid).
5. Verify: sign in fresh from a clean browser. Should succeed.
6. Communicate: forum announcement that everyone needs to sign back in.

Rollback: paste the old JWT_SECRET back. Active sessions resume. (But anyone who signed in during the rotation window has a different cookie and will need to re-auth either way.)

---

## Procedure 2: Rotate webhook secret

When: signature secret leaked, suspected unauthorized webhook traffic.

Affected: Resend (`WEBHOOK_SECRET`), Riverside (`RIVERSIDE_WEBHOOK_SECRET`), Alchemy (per-endpoint key in Hypha bridge), Hypha (`HYPHA_WEBHOOK_SECRET`).

Steps:

1. Provider dashboard: rotate the secret (Resend → Settings → Webhooks → regenerate; equivalent for others).
2. Railway env var: update with the new secret.
3. Railway redeploys.
4. Verify: trigger a test event in the provider dashboard. Should return 200. Logs should show signature verification passing.
5. Verify the rate-limit failure tracker is empty: `recordWebhookFailure` increments per IP; check Railway logs for "[Resend Webhook] Missing" patterns or 429 responses.

If the secret was compromised: also audit the recent webhook history for unexpected events.

---

## Procedure 3: Rotate CRON_SECRET

When: a leak. Probably accidental commit or shoulder-surfed.

Affected endpoints: `/api/cron/governance-jobs`, `/api/cron/event-reminders`, `/api/cron/nightly-batch`.

Steps:

1. Generate new secret: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
2. Update Railway env var `CRON_SECRET`.
3. Update the cron caller (Railway scheduled job, GitHub Actions, external scheduler: wherever the cron is triggered from). Authorization header is `Bearer <CRON_SECRET>`.
4. Verify: trigger one cron from the new caller. Logs should show the job ran. Hit it with the OLD secret: 401.

Comparison is timing-safe (`crypto.timingSafeEqual` per commit `c1dc9d8`), so length-mismatch attempts return immediately without leaking the right length.

---

## Procedure 4: Investigating a suspected compromise

When: a user reports their account did things they didn't do; logs show unexpected admin activity; a known-bad IP is hitting auth endpoints repeatedly.

Initial response (10 min):

1. Capture: timestamp + Railway request IDs + user openId + IP from the request log.
2. If a single account is compromised: revoke its session via DB update (`UPDATE users SET lastSignedIn = NULL WHERE openId = ?` does NOT revoke, but updating cookieSecret rotates everyone). For surgical revocation: add a `sessionInvalidatedAt` timestamp on the user row + check it in `sdk.authenticateRequest`. Today this is not built; if needed, ship it before continuing.
3. If brute-force: check rate-limit middleware logs. If the limit failed, fix it; if it held, the attack was bounded.
4. Communicate: tell the user exactly what we know + what we changed.
5. Document: append to this file as a new "Incident YYYY-MM-DD" section with timeline + remediation.

Forensic data we keep:

- Railway logs: 30 days retention by default.
- DB has `users.lastSignedIn`, `users.createdAt`, `users.updatedAt`. Forum / quest / token actions have `createdAt` + `userId`.
- Sentry has client errors with browser fingerprint, no PII.

---

## Procedure 5: Suspected leaked secret in code

When: `git log -p` reveals a secret; a contributor accidentally commits an .env file; a dependency does an unexpected fetch.

Response:

1. Rotate the secret immediately (per Procedures 1-3 above), even if you'll also expunge from git.
2. Expunge from history if needed. Note: GitHub considers any commit it has fetched to be public regardless of force-push. So rotation is the primary defense; history rewrite is hygiene.
3. Audit: was the secret in any external service's logs (Sentry, Railway, an ngrok tunnel)? Rotate or purge those too.
4. Add the leaked filename to `.gitignore` if it wasn't already.

---

## Procedure 6: Suspected dependency compromise

When: a postinstall script ran during install (shouldn't because of `ignore-scripts=true`); a package version bump doesn't match its npm release notes; community thread reports a maintainer compromise.

Response:

1. Pin the suspect package to its prior known-safe version in `package.json`.
2. Delete `node_modules/` + `pnpm-lock.yaml`. Re-install (`pnpm install --frozen-lockfile=false` for the rebuild, then commit the new lockfile).
3. Read the package's npm changelog + GitHub release. Diff the version range we ran against the safe version.
4. If the package was malicious: rotate any secret that ever appeared in env / process memory while it was running. (`pnpm audit`, `npm audit` retroactively shows known-CVE; doesn't catch novel attacks.)
5. Document in DECISIONS.md.

---

## Procedure 7: Suspicious user-content abuse (forum)

When: a forum post contains spam, doxxing, illegal content, prompt-injection-style adversarial content for the AI summary bot, etc.

Response:

1. Soft-delete: `forumPosts.deletedAt = NOW()` (currently we may not have that column: if not, set `content = '[removed]'`).
2. If the content was passed to an LLM: review the AI summary reply. Delete it too if needed.
3. If repeat offender: ban the user via `users.role = 'banned'` (need to add this enum if not present) + invalidate session.
4. Document in DECISIONS.md or a moderation log.

---

## Procedure 8: Restore from the FUSE truncation pattern (Cowork-specific)

When: Cowork agent flags truncated source files (the `audit-truncation.py` script reports TRUNCATED > 0).

Response:

1. The agent reads the list, restores each file from HEAD via `git show HEAD:path > /tmp/restore && cp /tmp/restore path`.
2. Re-run the truncation audit. Should now show 0/0.
3. Re-apply any intentional edits that were on the truncated files (the restore wipes them).
4. The agent commits via the `GIT_INDEX_FILE` plumbing pattern (FUSE blocks the index lock).

This is OPS-PLAYBOOK material because if it happens DURING a deploy, it's a real outage. Pattern documented in `~/.claude/memories/cowork-vm-quirks.md`.

---

## Procedure 9: Service worker cache poisoning

When: users report stale assets after a deploy; they see broken images or old JS chunks.

Response:

1. Verify the cache name in `vite.config.ts:runtimeCaching` is current (we're at `images-v3` since 2026-04-25).
2. Verify `cleanupOutdatedCaches: true` in Workbox config.
3. If a known cache is poisoned: bump the cache name (e.g., `images-v3` → `images-v4`). Add an explicit `caches.delete('images-v3')` in `client/src/main.tsx` so the next SW activation purges it.
4. Communicate: most users self-heal on next page load (the controllerchange listener in main.tsx forces a reload).

History: `images-v2` was poisoned by CloudFront 503s before we added the `cacheableResponse: { statuses: [0, 200] }` plugin. Fixed in commit `7179492`, cleanup in commit `c1dc9d8`.

---

## Procedure 10: User reports they can't log in

This is the most common operational ask. Run through this checklist:

1. Verify the bug is real: ask for browser + device + steps. Have them open DevTools → Application → Cookies → check for `app_session_id`.
2. Try the obvious recovery path: clear cookies for `regencivics.earth` (Settings → Site Settings → all data) → retry sign-in.
3. If still broken: have them screenshot DevTools Network panel during the sign-in click. Look for:
   - The redirect URL to Google: state param decode. Check for poisoning (`error=auth_failed`).
   - The callback response: `Set-Cookie` header (httpOnly so DevTools shows it server-side; check Application → Cookies after).
   - Auth.me request after callback: should return user, not null.
4. Common known bugs (now fixed):
   - 2026-04-24: `verifySession` rejected sessions because `appId` was empty (commit `74e3c4c`).
   - 2026-04-25: multi-cookie variant pollution (commit `b767d54`).
   - 2026-04-25: `secure: false` cookies on Apple form_post (commit `657f230`).
   - 2026-04-25: OAuth state error-recycle loop (commit `cf1fb25`).
5. If none match: capture the network log + cookies + request IDs. File a SHIPPED_LOG entry + a FIXES_TO_MAKE doc.

---

## Procedure 11: OAuth callback returns 401 from Google

When: Railway logs show `[OAuth] Google callback failed Error: Google token exchange failed: status=401 ...`. Users see `/?error=auth_failed&reason=google_401`. Sign-in succeeds at Google's account chooser but fails on the round-trip back to us.

This means Google's token endpoint rejected our `client_id` + `client_secret` pair. Code is correct; environment is wrong.

Steps (5 minutes):

1. **Check the captured Google response body.** Railway logs after commit (TBD) include the full Google error. Look for:
   - `"error": "invalid_client"` → secret is wrong or expired.
   - `"error": "unauthorized_client"` → grant type not allowed; consent screen issue.
   - `"error": "redirect_uri_mismatch"` → APP_URL on Railway doesn't match a registered URI.
   - `"error": "invalid_grant"` → code reused or expired (>10min). Usually transient; try again.

2. **Check Google Cloud Console** (https://console.cloud.google.com/apis/credentials):
   - Open the OAuth 2.0 Client ID for ReGen Civics.
   - Confirm `Authorized redirect URIs` includes:
     - `https://regencivics.earth/api/oauth/google/callback`
     - `http://localhost:3000/api/oauth/google/callback` (for dev)
   - If you see a recent "Client secret rotated" notification, you must update the Railway env var (step 3).

3. **Verify Railway env vars match Google Cloud:**
   - Open Railway dashboard → ReGenCivics.Earth service → Variables.
   - `GOOGLE_CLIENT_ID` must equal exactly the Client ID shown in Google Cloud Console.
   - `GOOGLE_CLIENT_SECRET` must equal the latest secret. If Google Cloud shows multiple secrets, the most recent one is active. Older secrets stop working after their grace period.
   - `APP_URL` must be `https://regencivics.earth` (no trailing slash, no `www.` prefix unless that's also a registered URI).
   - **Watch for whitespace.** Paste-from-clipboard sometimes includes a leading/trailing newline. Edit the env var and re-paste cleanly.

4. **If the secret really did rotate:**
   - Click "Add Secret" in Google Cloud Console (don't delete the old one yet, that breaks active sessions, though sessions are JWT-cookie-based so the only at-risk users are the ones mid-OAuth-flow).
   - Copy the new secret immediately (Google shows it once).
   - Paste into Railway `GOOGLE_CLIENT_SECRET`. Save.
   - Railway will auto-redeploy. Wait ~2 min.
   - Test sign-in via Claude in Chrome OR your own browser. Logs should now show 200 from token exchange.
   - Once verified, delete the old secret in Google Cloud.

5. **Verify on production after env var update:**
   - Hard refresh the live site, click Sign In, complete Google flow.
   - Railway logs should show `[inf] ... GET /api/oauth/google/callback 302` (success), not `[OAuth] Google callback failed`.
   - User lands on `/` with their avatar visible top-right.

6. **Document in OPS-PLAYBOOK incident log** (template below).

History: this exact failure happened 2026-04-26 with 100% failure rate observed in Railway logs. Initially suspected as cookie / state / Privy code bugs (which were also fixed in earlier commits b767d54, 657f230, cf1fb25), but the actual root cause was an env-var mismatch surfaced only by improved logging.

---

## Incident log template

When something breaks, append a section like this at the bottom of OPS-PLAYBOOK:

```
## Incident YYYY-MM-DD: <short title>

- Reported: who, when, how
- Symptom: what users saw
- Diagnosis: what was broken
- Fix: commit SHA + summary
- Time to mitigate: minutes from report to fix-deployed
- Prevention: what changed in CHECKLIST.md or PRINCIPLES.md
```

We don't have a long incident history yet: that's a good thing. Keep it that way.

---

## Finding 2026-06-30: fail-open webhook signature verification

- Reported: internal codebase re-audit, 2026-06-30. No live exploit observed.
- Symptom: none user-visible. `POST /api/webhooks/github` and `POST /api/webhooks/riverside` skipped HMAC verification entirely when their secret env var was unset, processing unauthenticated payloads (fail-open). Resend fails open in non-production only.
- Diagnosis: the guard was `if (GITHUB_WEBHOOK_SECRET && !verify(...))` (GitHub) and `if (secret) { verify } else { skip }` (Riverside), so an empty secret bypassed verification.
- Fix: reject with 401 when the secret is unset — `server/webhooks/github.ts`, `server/webhooks/riverside.ts`. Now consistent with Alchemy + Loomio, which already fail closed.
- REQUIRED human follow-up: set `GITHUB_WEBHOOK_SECRET` and `RIVERSIDE_WEBHOOK_SECRET` in Railway. Until then, these endpoints return 401 and the GitHub merge-automation + Riverside recording pipeline are paused. This is the correct trade-off: an unauthenticated webhook is worse than a disabled one. Setting the secrets restores verified operation.
- Prevention: CHECKLIST "Webhooks" + "Input handling" updated; OWASP-TOP10 A03/A04/A07/A08 corrected.
