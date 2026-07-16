# Fixes to Make — 2026-06-25 — Make CI Green (stop the build-failure emails)

This document continues the fixes series. Goal: stop the "Run failed: CI - main"
email that arrives on every push. CI has been red on **every** run for a long
time (verified runs #335 through #362 on GitHub Actions, all failed).

## TL;DR

CI does not fail at typecheck or build. It fails at the **Unit tests** step
(`pnpm test` → vitest). There are 10 error annotations. **None of them are real
product bugs.** They are all test-environment problems:

1. Two DB-integration test files run against a MySQL that does not exist in CI.
2. The jsdom test environment is missing a `scrollIntoView` stub.
3. The Navigation test has an incomplete tRPC mock.
4. The logout test asserts an old cookie-count that the handler intentionally changed.

Four small edits fix all 10 annotations. All four are source/test edits Claude
Code can make. The only human step is `git push`.

---

## Root cause analysis (from GitHub Actions run #362, commit a7958f5)

The job `Typecheck · Test · Build` runs: `tsc --noEmit` → `pnpm audit` (advisory)
→ `pnpm test` → `pnpm build`. It dies at `pnpm test` after ~1m50s, so typecheck
already passes and build never runs. The 10 annotations group cleanly:

| Failing test | Real bug? | Category |
|---|---|---|
| `server/emoji-reactions.test.ts` (2 cases) | No | Hits real MySQL, none in CI |
| `server/email-features.test.ts` (3 cases) | No | Hits real MySQL, none in CI |
| `client/.../Navigation.test.tsx` (1 case) | No | Incomplete tRPC mock |
| `client/.../AuthDialog.test.tsx` (3 unhandled) | No | jsdom missing `scrollIntoView` |
| `server/auth.logout.test.ts` (1 case) | No | Stale assertion (cookie count) |

The "1 warning" is the GitHub-runner Node 20 deprecation notice. It is advisory
and does not fail the build. Optional cleanup noted at the bottom.

---

## Fix 1 — DB-integration tests run with no database in CI (High)

**Status:** CODED (patch below, not yet applied/pushed)

**Symptom:** 5 of the 10 annotations are `TRPCError: Failed query: select ...`
against `postReactions`, `investor_inquiries`, and `newsletter_subscribers`.

**Root cause:** The CI sets `DATABASE_URL: mysql://test:test@localhost:3306/test`
but spins up no MySQL service, and these two test files issue real queries. The
`test` script already excludes seven DB-integration files (`applications`,
`forum`, `citizenship-tiers`, `notification-prefs`, `loi`, `forms`,
`contributions`) for exactly this reason and routes them to `test:integration`
(run locally against the real DB). `emoji-reactions.test.ts` and
`email-features.test.ts` are the same kind of test but were never added to the
exclude list, so they leak into CI and fail.

**Fix:** Move them into the integration bucket, matching the existing pattern.

In `package.json`, change the `test` script to add two excludes (append before
the closing quote):

```
--exclude "server/emoji-reactions.test.ts" --exclude "server/email-features.test.ts"
```

So the full `test` script becomes:

```json
"test": "vitest run --exclude \"**/node_modules/**\" --exclude \"**/dist/**\" --exclude \"server/applications.test.ts\" --exclude \"server/forum.test.ts\" --exclude \"server/citizenship-tiers.test.ts\" --exclude \"server/notification-prefs.test.ts\" --exclude \"server/loi.test.ts\" --exclude \"server/forms.test.ts\" --exclude \"server/contributions.test.ts\" --exclude \"server/emoji-reactions.test.ts\" --exclude \"server/email-features.test.ts\"",
```

And add the same two files to `test:integration` so they still run locally:

```json
"test:integration": "vitest run server/applications.test.ts server/forum.test.ts server/citizenship-tiers.test.ts server/notification-prefs.test.ts server/loi.test.ts server/forms.test.ts server/contributions.test.ts server/emoji-reactions.test.ts server/email-features.test.ts",
```

**Files changed:** `package.json`

**Alternative (if you want these to actually run in CI):** add a MySQL service
container to `.github/workflows/ci.yml` and run migrations before `pnpm test`.
Heavier and can introduce flakiness. The exclude approach above matches the
design already in the repo, so it is the recommended path.

---

## Fix 2 — jsdom missing `scrollIntoView` (Medium)

**Status:** CODED

**Symptom:** 3 unhandled errors: `TypeError: el.scrollIntoView is not a function`
originating from `client/src/components/AuthDialog.test.tsx`.

**Root cause:** `AuthDialog.tsx:209` calls `el.scrollIntoView(...)` inside a
`setTimeout` on the email field's `onFocus`. jsdom does not implement
`scrollIntoView`. The timer fires after the test finishes, so it surfaces as an
unhandled rejection and fails the run.

**Fix:** Stub it in the global test setup. Replace the contents of
`client/src/test-setup.ts`:

```ts
import '@testing-library/jest-dom';
import { vi } from 'vitest';

// jsdom does not implement layout methods. Several components (e.g. AuthDialog)
// call scrollIntoView on focus; without this stub the deferred call surfaces as
// an unhandled "el.scrollIntoView is not a function" error and fails the run.
Element.prototype.scrollIntoView = vi.fn();
```

**Files changed:** `client/src/test-setup.ts`

---

## Fix 3 — Navigation test has an incomplete tRPC mock (Medium)

**Status:** CODED

**Symptom:** `Navigation.test.tsx > renders navigation with logo` throws
`TypeError: Cannot read properties of undefined (reading 'myApplications')` at
`useContextualCTA.ts:25`.

**Root cause:** `Navigation` renders `<MobileTabBar />` directly (line 1304).
`MobileTabBar` → `useSmartNav` → `useContextualCTA`, which calls
`trpc.applications.myApplications.useQuery` and `trpc.quest.myCompletions.useQuery`.
The test's `@/lib/trpc` mock only defines `messages` and `userProfiles`, so
`trpc.applications` is `undefined` and the read crashes. The test already stubs
`SmartBottomNav` for the same reason ("uses trpc + hooks internally") but
`MobileTabBar` was missed when it was added to the nav.

**Fix:** Stub `MobileTabBar` the same way `SmartBottomNav` is stubbed. Add this
mock alongside the other `vi.mock(...)` calls near the top of
`client/src/components/Navigation.test.tsx` (it is a default export):

```tsx
// Mock MobileTabBar (uses trpc + smart-nav hooks internally, like SmartBottomNav)
vi.mock('@/components/mobile/MobileTabBar', () => ({
  default: () => <nav data-testid="mobile-tab-bar">Mobile Tabs</nav>,
}));
```

**Files changed:** `client/src/components/Navigation.test.tsx`

---

## Fix 4 — Stale cookie-count assertion in logout test (Medium)

**Status:** CODED

**Symptom:** `auth.logout.test.ts:52` — `expected [ ...(2) ] to have a length of
1 but got 2`.

**Root cause:** This is a stale test, not a bug. The logout handler was
intentionally changed to call `clearAllSessionCookies(...)`, which clears every
session-cookie variant (the handler comment explains the Safari multi-cookie
case where two `app_session_id` values exist from different deploy eras). It now
clears 2 cookies. The test still asserts exactly 1.

**Fix:** Assert that the session cookie is among those cleared, with the right
options, instead of asserting an exact count. Replace the three assertions after
`expect(result).toEqual({ success: true });` in
`server/auth.logout.test.ts`:

```ts
    expect(result).toEqual({ success: true });

    // logout clears ALL session-cookie variants (Safari multi-cookie case),
    // so there may be more than one. Assert the canonical session cookie is
    // among them and cleared with the correct options.
    expect(clearedCookies.length).toBeGreaterThanOrEqual(1);
    const sessionClear = clearedCookies.find((c) => c.name === COOKIE_NAME);
    expect(sessionClear).toBeDefined();
    expect(sessionClear?.options).toMatchObject({
      maxAge: -1,
      secure: true,
      sameSite: "none",
      httpOnly: true,
      path: "/",
    });
```

**Files changed:** `server/auth.logout.test.ts`

---

## After applying — verify locally before pushing

From repo root on your machine (these run the same gates CI runs):

```bash
pnpm exec tsc --noEmit      # should already pass
pnpm test                   # should now exit 0 (was failing here)
pnpm build                  # confirm the build step is green too
```

`pnpm test` is the gate that was failing. Once it is green, the email stops.
`test:integration` still needs a real `DATABASE_URL` and is run locally only, as
before.

---

## Optional cleanup (not blocking, no email impact)

The "1 warning" in CI is GitHub deprecating Node 20 for `actions/checkout@v4`,
`actions/setup-node@v4`, and `pnpm/action-setup@v4`. It does not fail the build.
When convenient, bump these to their latest major in `.github/workflows/ci.yml`
(and `contrast-audit` workflow if it pins the same). Low priority.

---

## Note on the local working copy

The Cowork sandbox's copy of the repo was fully NUL-corrupted (all 670 `.ts/.tsx`
files truncated, git index unreadable), so these patches were written against the
**clean source on GitHub**, not the local mirror. Your real GitHub `main` is
healthy. If your Windows working copy ever shows the same truncation symptom,
re-clone fresh before committing, since committing a truncated file is what the
ship-gate in CLAUDE.md exists to catch.

---

## Fix 5 — Clear the Node 20 deprecation warning (Low, optional)

**Status:** CODED

**Symptom:** The "1 warning" on every run: `Node.js 20 is deprecated. The
following actions target Node.js 20 but are being forced to run on Node.js 24:
actions/checkout@v4, actions/setup-node@v4, pnpm/action-setup@v4`.

**Root cause:** Runners now default to Node 24 (the forced-migration date has
passed). The `@v4` majors of these actions still declare Node 20 in their
metadata, so GitHub prints the warning. It does not fail the build, so this is
cosmetic, but it is easy to silence by moving to the Node-24 action majors.

**Fix:** Bump the action versions. These are line-for-line `uses:` replacements,
nothing else in the file changes (existing comments stay put).

In `.github/workflows/ci.yml`:

| Line | From | To |
|---|---|---|
| 16 | `- uses: actions/checkout@v4` | `- uses: actions/checkout@v5` |
| 18 | `- uses: pnpm/action-setup@v4` | `- uses: pnpm/action-setup@v4` (pin latest v4.x, e.g. `@v4.4.0`) |
| 20 | `- uses: actions/setup-node@v4` | `- uses: actions/setup-node@v5` |
| 53 | `uses: actions/upload-artifact@v4` | `uses: actions/upload-artifact@v4` (leave; not in the warning) |
| 66 | `- uses: actions/checkout@v4` | `- uses: actions/checkout@v5` |
| 69 | `uses: actions/download-artifact@v4` | `uses: actions/download-artifact@v4` (leave) |
| 81 | `uses: treosh/lighthouse-ci-action@v11` | `uses: treosh/lighthouse-ci-action@v12` |

Notes:
- `actions/checkout@v5` and `actions/setup-node@v5` run on Node 24 and clear the
  warning. `@v6` of both also exists if you prefer newest; v5 is the lower-risk
  Node-24 bump and keeps the existing `cache: pnpm` behavior unchanged.
- `pnpm/action-setup`: the floating `@v4` tag tracks the latest v4.x (currently
  ~v4.4.0), which is Node-24 compatible. Pinning the exact patch (`@v4.4.0`) is
  the most reproducible. Confirm the newest tag on the releases page when you
  apply.
- `actions/upload-artifact@v4` / `download-artifact@v4` were not named in the
  warning; leave them to keep the artifact handshake versions matched.
- `treosh/lighthouse-ci-action@v12` is the Node-24 line; optional, and only
  affects the Lighthouse job (which is already non-blocking).

**Same actions also appear in `.github/workflows/contrast-audit.yml`** (it pins
`pnpm/action-setup@v2`, `actions/checkout@v4`, `actions/setup-node@v4`,
`actions/github-script@v7`). If you want that workflow quiet too: bump
`checkout@v4 → v5`, `setup-node@v4 → v5`, `pnpm/action-setup@v2 → v4`, and
`github-script@v7 → v8`. Not urgent; contrast-audit does not email you on every
push.

**Files changed:** `.github/workflows/ci.yml` (and optionally
`.github/workflows/contrast-audit.yml`)

---

## Handoff Breakdown — Who Does What

### YOU (Rye) — things only you can do

| # | Task | Why only you | Command / Where |
|---|------|-------------|-----------------|
| H1 | Apply the 4 patches and push (or run Claude Code locally to apply them, then push) | `git push` needs your GitHub auth | `git add -A && git commit -m "fix(ci): green the test step — exclude DB-integration tests, stub scrollIntoView, complete Navigation trpc mock, fix stale logout assertion" && git push` |
| H2 | Run the local verify commands before pushing | Confirms green before the email stops | `pnpm exec tsc --noEmit && pnpm test && pnpm build` |

### CLAUDE CODE — already done or can be done without you

| # | Task | Status |
|---|------|--------|
| 1 | Exclude `emoji-reactions` + `email-features` from CI `test`, add to `test:integration` (`package.json`) | CODED |
| 2 | Stub `scrollIntoView` in `client/src/test-setup.ts` | CODED |
| 3 | Mock `MobileTabBar` in `Navigation.test.tsx` | CODED |
| 4 | Fix stale cookie assertion in `server/auth.logout.test.ts` | CODED |
| 5 | Bump CI action versions to clear Node 20 warning (`.github/workflows/ci.yml`) | CODED (optional, cosmetic) |

### WAITING ON YOU before Claude Code can proceed

Nothing is blocked. All four edits are mechanical and specified above with exact
replacement code. Apply, verify, push.
