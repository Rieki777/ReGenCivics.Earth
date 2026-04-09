# Claude Code Prompt: Post-Audit Cleanup (2026-04-07)

**Context:** This prompt executes the three "out of scope this pass" items flagged in the 2026-04-07 CTO audit. Findings are in `OUT_OF_SCOPE_FINDINGS_2026-04-07.md`. None of these are launch-blocking for Earth Day, but all should ship in a dedicated hardening PR shortly after.

**Before you start:** read these two docs in full.
1. `OUT_OF_SCOPE_FINDINGS_2026-04-07.md`
2. `CSP_NONCE_MIGRATION_PLAN_2026-04-07.md`

Also skim `CLAUDE.md` for the writing rules (no em-dashes, no contrast-framing, no AI word patterns) before touching any user-facing strings or comments.

---

## Track A: CSP Nonce Migration (priority: high, 9-13h)

Execute the 6-phase plan in `CSP_NONCE_MIGRATION_PLAN_2026-04-07.md` exactly as written. Summary of file changes:

1. **Create `server/_core/nonce.ts`** exporting `generateNonce(length = 16)` using `crypto.randomBytes(length).toString('base64url')`.
2. **Edit `server/_core/security.ts`**:
   - Add `cspNonceMiddleware` that calls `generateNonce()` and assigns to `res.locals.nonce`.
   - Update `cspMiddleware` to read `res.locals.nonce` and inject `'nonce-<value>'` into `script-src` and `style-src`.
   - Remove `'unsafe-inline'` from both `script-src` and `style-src`.
   - Remove `'unsafe-eval'` from `script-src`.
3. **Edit `server/_core/index.ts`**:
   - Register `cspNonceMiddleware` BEFORE `cspMiddleware` around line 134.
   - Replace the `res.sendFile` catch-all (lines 44-47) with a cached-read-from-disk + per-request `{{NONCE}}` substitution.
   - Add a dedicated `/offline.html` route that performs the same substitution.
4. **Edit `client/index.html`**:
   - Add `nonce="{{NONCE}}"` to the LCP preload IIFE at line 57.
   - Add `<script nonce="{{NONCE}}">window.__NONCE__="{{NONCE}}";</script>` right before `</body>`.
   - Do NOT add a nonce to JSON-LD blocks (lines 120-182). They are non-executable data and do not need one.
5. **Edit `client/public/offline.html`** line 7: add `nonce="{{NONCE}}"` to the inline `<style>` tag.
6. **Edit `client/src/components/ui/chart.tsx`** lines 70-101: add `nonce={typeof window !== 'undefined' ? (window as any).__NONCE__ : ''}` to the `<style dangerouslySetInnerHTML>` element.

**Test locally before declaring done:**
- `npm run dev`, hit `/bionomics`, confirm no CSP violations in DevTools Console and that the hero image `<link rel="preload">` still fires.
- Visit any page with a Recharts chart, confirm colors render.
- Navigate to `/offline.html`, confirm styles render.
- Hard reload 3 times, confirm the `nonce-<value>` in the `Content-Security-Policy` response header changes each time.
- `npm run build && NODE_ENV=production node dist/index.js`, confirm the CSP header has `'nonce-...'` and does NOT contain `'unsafe-inline'` or `'unsafe-eval'`.
- Submit a forum post containing `<script>alert(1)</script>`, confirm it does not execute.

**Optional safety net:** ship `Content-Security-Policy-Report-Only` in parallel for 24-48h with a `/api/csp-report` endpoint before flipping to enforcing. Skip this if you are confident in the local test pass.

---

## Track B: Fix `citizenship-tiers.test.ts` Schema Drift (priority: medium, 1-2h)

The test references a `citizenshipTier` column that does not exist in the live Railway DB. The live DB has `currentTier`. Pick the path of least resistance:

**Option 1 (preferred, no migration needed):** update `server/citizenship-tiers.test.ts` to assert against `currentTier` instead of `citizenshipTier`. Also update `drizzle/schema.ts` if it references `citizenshipTier` so Drizzle matches the live column. Run `npx drizzle-kit check` to confirm no drift remains.

**Option 2 (only if `citizenshipTier` is semantically distinct from `currentTier`):** write a new migration `drizzle/NNNN_add_citizenship_tier.sql` that adds the `citizenshipTier` column, apply it via `npx tsx scripts/run-migration.ts drizzle/NNNN_add_citizenship_tier.sql`, and update any readers that expected it.

Before choosing, read both `drizzle/schema.ts` and `server/citizenship-tiers.test.ts`, and grep for both column names across `server/` to see which is actually in use in application code. The column that production code writes to wins.

---

## Track C: Harden DB-Dependent Test Guards (priority: medium, 2-4h)

Six test files fail when `DATABASE_URL` is unset because their `.skipIf(skipIfNoDb)` guards do not cover every describe/it block:

1. `server/applications.test.ts`
2. `server/contributions.test.ts`
3. `server/forms.test.ts`
4. `server/forum.test.ts`
5. `server/loi.test.ts`
6. `server/notification-prefs.test.ts`

For each file:
- Find the `skipIfNoDb` import and confirm every `describe` / `it` that touches the DB is gated.
- If `skipIfNoDb` is not defined in scope, import it from wherever the other server tests import it.
- For `forms.test.ts` and `notification-prefs.test.ts`, extend mock coverage where practical so the tests can run without a live DB at all. Look at how existing unit tests in `server/` mock `mysql2/promise` or the Drizzle client and follow the same pattern.

**Verification:**
```
npm test -- --reporter=verbose 2>&1 | tee test-run-post-cleanup.log
```
With no `DATABASE_URL` set, every one of these 6 files should report all tests skipped (not failed). With a real `DATABASE_URL` set, they should pass.

---

## Track D (optional): Split Integration Tests (priority: low, 2h)

If Tracks A-C go smoothly and there is time, split DB-dependent tests into a separate `npm run test:integration` suite:

1. Add a `test:integration` script in `package.json` that runs only `server/*.{applications,contributions,forms,forum,loi,notification-prefs,citizenship-tiers}.test.ts`.
2. Update the existing `test` script to exclude those patterns so unit tests stay fast and green without a DB.
3. Update any CI config that runs `npm test` to also run `npm run test:integration` in an environment with `DATABASE_URL` set.
4. Update `README.md` or the project docs with the new command.

Skip this track entirely if Tracks A-C took the full session.

---

## Ordering and Ground Rules

Work in this order: **Track B → Track C → Track A → Track D**. B and C unblock a clean `npm test` baseline, which makes verifying A much easier.

Commit cadence: one commit per track. Conventional commit messages. Do not squash.

Before declaring each track done, run `npm run typecheck && npm test` and paste the output into the PR body.

Do NOT touch any user-facing copy in this sprint. If you find em-dashes or contrast-framing in files you are editing, leave them alone. Those belong to a separate writing-rules sweep.

Do NOT amend commits. Make new commits for every fix.

When you finish, report back with: the branch name, the 4 (or 3) commit SHAs, the test log, and any deviations from the plan above.
