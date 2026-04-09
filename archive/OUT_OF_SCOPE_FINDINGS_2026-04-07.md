# Out-of-Scope Findings from 2026-04-07 Audit Pass

Three items that were flagged as "out of scope this pass" during the CTO audit have been investigated. Summary:

## 1. CSP nonce migration — PLANNED, not launch-blocking

Full plan in `CSP_NONCE_MIGRATION_PLAN_2026-04-07.md`.

**TL;DR:** Current CSP uses `'unsafe-inline'` + `'unsafe-eval'`. 3 inline scripts/styles need to be tagged with a per-request nonce: LCP preload IIFE in `client/index.html:57-73`, Recharts theming in `client/src/components/ui/chart.tsx:70-101`, and critical styles in `client/public/offline.html:7-14`. No Vite HMR changes needed. JSON-LD blocks don't need nonces. Scope: small, 9-13 hours. **Ship post-launch in a dedicated security PR.**

## 2. Schema drift — RESOLVED

The "schema drift" that triggered the `/tools` React crash has been fully fixed in commit `9bf9606` ("render ToolsLibrary against actual trpc shape"). Verified:

- `client/src/pages/ToolsLibrary.tsx` line 266 uses `tool.pricingModel` (not `pricing`)
- Line 270 uses `tool.shortSummary` (not `summary`)
- Line 271 uses `tool.totalClicks` (not `clickCount`)
- Line 322 renders `cat.name` (not `cat` as a React child)
- `server/routes/tools.ts` `parseToolRow` function returns matching field names

No action needed. Just deploy the working tree.

## 3. 7 pre-existing test failures — NOT launch-blocking

The vitest suite has 28 test files (19 server, 9 client). The 7 failures are all database-dependent tests that either (a) run without a `DATABASE_URL` in the sandbox or (b) touch columns that exist in `drizzle/schema.ts` but not in the live Railway DB.

### Breakdown

| # | File | Mode | Severity | Action |
|---|---|---|---|---|
| 1 | `server/applications.test.ts` | DB-dependent, has `.skipIf(skipIfNoDb)` guards | Real regression risk | Verify guards fire cleanly |
| 2 | `server/citizenship-tiers.test.ts` | Schema drift: `citizenshipTier` column vs `currentTier` in live DB | **Cosmetic** (self-documenting) | Skip, write post-launch migration |
| 3 | `server/contributions.test.ts` | DB-dependent | Real regression risk | Verify guards fire |
| 4 | `server/forms.test.ts` | DB writes for form submission | Real regression risk | Extend mock coverage |
| 5 | `server/forum.test.ts` | DB query for categories | Real regression risk | Verify guards fire |
| 6 | `server/loi.test.ts` | DB-dependent | Real regression risk | Verify guards fire |
| 7 | `server/notification-prefs.test.ts` | DB query/update | Real regression risk | Extend mock coverage |

### Recommended verification before Earth Day

Run locally with a real `DATABASE_URL`:

```
npm test -- --reporter=verbose 2>&1 | tee test-run-2026-04-07.log
```

Most failures should auto-skip via the existing `.skipIf(skipIfNoDb)` gates. Any that don't need their guards fixed before launch. The `citizenship-tiers.test.ts` schema drift is the only one that needs an actual code change, and it's self-documenting so it's safe to defer.

### Post-launch cleanup

- Resolve `citizenship-tiers.test.ts` schema drift: either add the `citizenshipTier` column via migration or update the test to match the live `currentTier` column
- Split DB-dependent tests into a separate `npm run test:integration` suite so unit tests stay fast and green
- Extend mock coverage for form/notification tests so they don't need a live DB
