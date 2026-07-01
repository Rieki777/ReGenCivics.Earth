Context: I (Rye) was working with Claude in Cowork to finish wiring REDIS_URL for the
Redis-backed CSRF/rate-limit code (commits e291af0, c04ad6f already on origin/main) and
to smoke-test the OAuth/sanitization changes from the same audit. REDIS_URL is now set
correctly on the Railway app service (confirmed in the dashboard), pointing at the
existing "Redis" service.

During smoke testing, Cowork found two real bugs and already fixed them in the working
tree at this repo path, but could NOT commit them cleanly: that sandbox's filesystem has
a known FUSE silent-truncation bug (documented in .ai/docs/STEERING.md and
~/.claude/memories/cowork-vm-quirks.md) that corrupted a git object mid-commit. The bad
commit was caught and reverted before it reached origin, so origin/main and this local
main are both clean at commit 9928c2e ("fix(worker): shell-wrap uvicorn start so PORT
expands"). The two fixes exist correctly in the working tree right now as uncommitted
changes. Your job: verify them, commit them properly, ship them, and verify Redis comes
up live.

Read first: .ai/docs/STEERING.md (ship gate, section 3), .ai/docs/security/CHECKLIST.md,
.ai/docs/security/OWASP-TOP10.md (A01, A03, A07).

## Task 0 — Clean up stuck git state

1. Check for and remove any stale lock files: `.git/HEAD.lock`, `.git/refs/heads/main.lock`,
   `.git/index.lock`. If present and no git process is actually running, delete them.
2. Confirm `git status` and `git log --oneline -3` look sane: HEAD should be at `9928c2e`
   or later, not the reverted bad commit. Confirm `git fsck` doesn't complain about the
   ref state.
3. Do NOT run `git add -A` or `git add .` anywhere in this task. The working tree has
   ~30 unrelated uncommitted files from other in-progress work. Only stage the exact
   files named below.

## Task 1 — Verify the two pending fixes are intact (not truncated)

Check these two files in the working tree. They should NOT match origin's committed
version (they should already contain the fixes described below). If either file looks
truncated, cut off mid-statement, or missing content compared to what's described,
STOP and tell me rather than committing broken code.

Run `python3 scripts/audit-truncation.py` first as a baseline sanity check.

**`server/_core/index.ts`** — should have:
- New import: `import { initCacheOnStartup, setupCacheShutdownHandlers } from "../cacheInit";`
  added near the existing `import { isCacheAvailable } from "../cache";` line.
- In `startServer()`, right before the `server.listen(port, ...)` call, two new lines:
  `await initCacheOnStartup();` and `setupCacheShutdownHandlers();`, with a comment
  explaining `initCacheOnStartup()` was previously defined in `cacheInit.ts` but never
  invoked anywhere, so Redis never connected even with REDIS_URL set.

**`server/routes/auth.ts`** — should have:
- New import: `import { sanitizeInput } from "../_core/security";`
- A new `cleanText` helper (mirrors the one already in `server/routes/players.ts`):
  ```ts
  const cleanText = <T extends string | null | undefined>(v: T): T =>
    (typeof v === "string" ? (sanitizeInput(v) as T) : v);
  ```
- In `userProfilesRouter.updateProfile`'s mutation, the raw
  `await db.upsertUserProfile(ctx.user.id, input);` replaced with a version that passes
  `displayName`, `bio`, `location`, `investmentRange`, `projectName`, `organizationName`,
  and `questInterests` through `cleanText()` before the DB write. URL fields (avatarUrl,
  bannerUrl, projectUrl, website) stay untouched, matching the pattern in players.ts.
- The rest of the file, including the `list` publicProcedure below `updateProfile`
  (member search/pagination), must still be complete and syntactically valid. This is
  the part that got corrupted in the Cowork sandbox, so check it closely.

If `server/routes/auth.ts` is missing the `list` procedure body or looks cut off, the
correct version is: same as origin/main's `server/routes/auth.ts`, with only the
`updateProfile` mutation body changed as described above. Reconstruct from
`git show origin/main:server/routes/auth.ts` if needed, then re-apply just the
`updateProfile` change.

## Task 2 — Ship gate

```bash
python3 scripts/audit-truncation.py
pnpm typecheck
```

Both must be clean (or only show pre-existing unrelated failures you can confirm are
NOT in these two files) before committing.

## Task 3 — Commit and push

1. `git fetch origin` then `git rebase origin/main` (local main may be behind; do not
   force-push, do not skip this).
2. Two separate commits, staging only the relevant file each time:

   Commit A (`server/_core/index.ts` only):
   ```
   fix(security): wire up dormant Redis cache init on server bootstrap

   initCacheOnStartup()/setupCacheShutdownHandlers() (server/cacheInit.ts) were
   defined but never called from the server bootstrap. REDIS_URL is now set on
   Railway but /health still reported cache:disconnected because the connection
   was never attempted. Now called before server.listen(), gated the same way
   isCacheAvailable() already gates every call site (CSRF tokens, webhook-failure
   buckets, rate limiting), so this is a safe no-op when REDIS_URL is unset.
   ```

   Commit B (`server/routes/auth.ts` only):
   ```
   fix(security): sanitize profile update fields in auth.ts

   userProfiles.updateProfile (the mutation behind Settings > Edit Profile) wrote
   displayName/bio/location/investmentRange/projectName/organizationName/
   questInterests straight to the DB with no sanitization, unlike the equivalent
   players.ts:update procedure. Confirmed live: saved <script>alert(1)</script>
   into the location field on regencivics.earth and it was stored raw. Added the
   same cleanText()/sanitizeInput() wrapper players.ts already uses for these
   fields. URL fields (avatarUrl, bannerUrl, projectUrl, website) are left
   untouched, matching that existing pattern.

   Found while smoke-testing the 2026-06-30 security audit (e291af0, c04ad6f).
   ```
3. Push: `git push origin main`.

## Task 4 — Verify the deploy

Railway auto-deploys on push to main. Wait for the build to finish (check Railway
dashboard or `railway logs` if the CLI is authenticated locally), then:

1. `curl -s https://regencivics.earth/health` — confirm `"cache":"connected"` (was
   `"disconnected"` before this fix, even with REDIS_URL set).
2. `curl -s https://regencivics.earth/api/csrf-token` — should return a token, no 500.
3. If Railway CLI is available and authenticated: `railway logs` for the app service,
   grep for `Redis connected` to confirm the boot-time log line now fires.
4. Quickly sanity check the profile sanitization fix: this needs a logged-in session,
   so either test manually in a browser, or skip and note it as unverified if no
   session is available from this environment.

## Task 5 — Update security docs (only after Task 4 confirms cache:connected)

Update `.ai/docs/security/CHECKLIST.md` and `.ai/docs/security/OWASP-TOP10.md` (A01
section, the paragraph currently reading "Blocked until REDIS_URL is set in the
environment"). Flip both from "blocked" to "done", with today's date and a one-line
evidence note (e.g. "confirmed via /health showing cache:connected, <date>"). Also add
a short note to OWASP-TOP10.md A03 (Injection) documenting the auth.ts sanitization gap
that was found and fixed, so it doesn't quietly regress again.

Commit as:
```
docs(security): confirm Redis cache live + document auth.ts sanitization fix
```

## Constraints

- No force-push. Rebase, don't merge, to keep history linear with the rest of main.
- Don't touch, stage, or commit any of the other ~30 unrelated modified files sitting
  in the working tree.
- Don't run `git add -A`, `git add .`, or `git commit -a` anywhere in this task.
- If anything looks inconsistent with what's described above (missing fix, different
  code shape, merge conflicts on rebase), stop and report back rather than guessing.

Report back: both commits pushed (y/n + SHAs), ship gate results, /health output
before and after, and whether the security docs got updated.
