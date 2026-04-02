# Security Audit Report
## 2026-04-01 (Pre-Open-Source)

Audit performed before making the repository public. Covers credential
exposure, authentication gaps, injection risks, and infrastructure hardening.

---

## Credential Exposure (RESOLVED)

### What was found

11 files had the Railway database password hardcoded in connection strings.
4 files had a Google Gemini API key hardcoded. The .env file containing
production credentials was tracked in version control.

### What was fixed

All hardcoded credentials replaced with `process.env.DATABASE_URL` or
`os.environ.get("GEMINI_API_KEY")` references. Each script now validates
the env var exists before running. .gitignore updated to exclude .bat files
and API key files. .env was already in .gitignore.

### Still needed (Rye)

**Rotate the Railway database password immediately.** The old password has
been in the git history. Even after sanitizing the files, anyone who cloned
the repo before can see it. Go to Railway dashboard, generate a new password,
update your local .env.

**Rotate the Gemini API key.** Same reason. Generate a new one in Google AI
Studio and update your local environment.

**Consider using `git filter-branch` or BFG Repo Cleaner** to purge the old
credentials from git history before making the repo public. Without this
step, the old passwords are still accessible in old commits.

---

## Critical Findings

### 1. SQL injection via string concatenation

**File:** `server/routes/events.ts` (lines ~773, ~808)

**Issue:** Recording IDs and event IDs are joined with `.join(",")` and
interpolated directly into SQL templates. If input validation is bypassed
or the code is refactored, this becomes an injection vector.

**Fix:** Replace with Drizzle ORM's `inArray()` operator:
```typescript
// Replace:
.where(sql`id IN (${recordingIds.join(",")})`)
// With:
.where(inArray(recordings.id, recordingIds))
```

**Priority:** Fix before open-sourcing. External contributors will find this.

---

## High Findings

### 2. Unprotected contribution withdrawal

**File:** `server/routes/campaigns.ts` (lines ~370-390)

**Issue:** The `withdrawContribution` mutation uses `publicProcedure` and
validates only by email match. Anyone who knows a user's email and
contribution ID can withdraw their contribution without authentication.

**Fix:** Change to `protectedProcedure`. Verify the authenticated user's
ID matches the contribution owner, not just the email.

### 3. Unprotected event signup cancellation

**File:** `server/routes/events.ts` (lines ~327-350)

**Issue:** `cancelSignup` is a public procedure that takes email + eventId.
Anyone with someone's email can cancel their event registration.

**Fix:** Same as above. Require authentication. Verify the user owns the
signup.

### 4. Optional cron endpoint authentication

**File:** `server/_core/index.ts` (lines ~409-420)

**Issue:** The `/api/cron/event-reminders` endpoint checks for `CRON_SECRET`
but if the env var is not set, the endpoint is completely open. Anyone can
trigger reminder emails.

**Fix:** Make `CRON_SECRET` mandatory. Throw on startup if not set.

### 5. Apple OAuth JWT not verified

**File:** `server/_core/oauth.ts` (lines ~93-100)

**Issue:** The Apple OAuth callback decodes the JWT payload by base64-
decoding the middle segment without verifying the signature. The comment
says "Apple already signed it" but the code never checks the signature.
An attacker can forge arbitrary claims.

**Fix:** Use `jose` library's `jwtVerify` with Apple's public JWKS from
`https://appleid.apple.com/auth/keys`. The `jose` library is already a
dependency.

---

## Medium Findings

### 6. Missing rate limiting on write endpoints

**File:** `server/_core/index.ts`

**Issue:** Rate limiting is applied to newsletter subscribe and application
submit, but not to forum posts, forum replies, direct messages, quest
completions, or contribution claims. An attacker (or a bot) could spam the
forum or inflate contribution metrics.

**Fix:** Add rate limiting to all write-heavy tRPC mutations. Suggested:
forum.createPost (5/min), forum.createReply (10/min), messages.send (50/min).

### 7. File upload validation missing

**File:** `server/storage.ts`

**Issue:** The `storagePut` function accepts arbitrary buffers with no size
limit, no content type validation, and no filename sanitization. Directory
traversal via the key parameter is theoretically possible.

**Fix:** Add maximum file size check (10MB default), content type allowlist,
and key sanitization (strip `../` sequences, restrict to alphanumeric +
dots/hyphens/slashes).

### 8. CSRF token memory leak

**File:** `server/_core/security.ts`

**Issue:** CSRF tokens are stored in an in-memory Map. Expired tokens (15min
TTL) are checked on validation but never cleaned up. Over time this map
grows unbounded.

**Fix:** Add a periodic cleanup interval (every 30 minutes, delete tokens
older than 15 minutes). Or move to Redis with TTL.

### 9. Permissive Content Security Policy

**File:** `server/_core/security.ts`

**Issue:** CSP includes `'unsafe-inline'` and `'unsafe-eval'` for scripts,
which significantly weakens XSS protection. If an attacker finds an XSS
vector, CSP will not block it.

**Fix:** Migrate to nonce-based CSP. This is a larger change and can be done
post-launch, but should be tracked as a security improvement.

---

## Low Findings

### 10. No format validation on email magic link tokens

**File:** `server/_core/oauth.ts`

Tokens generated with nanoid(32) are not format-validated during
verification. Low risk because tokens are random and expire in 15 minutes.
Add a regex check for defense in depth.

### 11. Forum search input not length-limited

**File:** `server/routes/auth.ts`

The member search accepts unbounded string input for LIKE queries. Not a
SQL injection risk (Drizzle parameterizes) but could cause performance
issues with very long search strings. Add `.max(100)` to the Zod schema.

---

## Remediation Priority

| Priority | Finding | Effort |
|----------|---------|--------|
| Before open-source | Rotate Railway password | 5 min (Rye) |
| Before open-source | Rotate Gemini API key | 5 min (Rye) |
| Before open-source | Purge git history of old credentials | 30 min (Rye) |
| Before open-source | Fix SQL injection (#1) | 15 min (Claude Code) |
| Before open-source | Fix Apple JWT verification (#5) | 30 min (Claude Code) |
| First sprint | Auth on withdrawal + cancellation (#2, #3) | 30 min (Claude Code) |
| First sprint | Mandatory cron auth (#4) | 10 min (Claude Code) |
| First sprint | Rate limiting expansion (#6) | 30 min (Claude Code) |
| Second sprint | File upload validation (#7) | 30 min (Claude Code) |
| Second sprint | CSRF cleanup (#8) | 15 min (Claude Code) |
| Later | CSP hardening (#9) | 2-4 hours |
| Later | Input validation (#10, #11) | 15 min |

---

## Handoff

### Rye must do

- Rotate Railway database password in Railway dashboard
- Rotate Gemini API key in Google AI Studio
- Update local .env with new credentials
- Run BFG Repo Cleaner or git filter-branch to purge credential history
- Push the cleaned repo to a fresh remote (or force push after purge)

### Claude Code can do

- Fix SQL injection in events.ts (#1)
- Implement Apple JWT verification (#5)
- Add authentication to withdrawal and cancellation (#2, #3)
- Make cron auth mandatory (#4)
- Add rate limiting to write endpoints (#6)
- Add file upload validation (#7)
- Add CSRF token cleanup (#8)
