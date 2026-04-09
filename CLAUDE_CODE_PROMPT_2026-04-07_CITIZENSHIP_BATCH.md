# Claude Code Prompt: Citizenship Tier Batch Verification (M-1)

**Priority: MEDIUM — nice to ship before launch, not blocking**

Read `CITIZENSHIP_TIERS_SPEC.md` before starting.

---

## What you are doing

The `checkCitizenshipTiers` function exists in `batchJobs.ts` and is supposedly running nightly. Nobody has ever verified it end-to-end. This prompt closes that gap: prove the cron fires, prove demotions happen, prove grace-period notifications go out.

---

## Step 1: Find the batch job and read it fully

Grep for `checkCitizenshipTiers` across `server/`. Read every file that references it:
- Where is the function defined?
- What does it do exactly? (query users, check tier thresholds, demote, send notification?)
- Where is it scheduled? (look for cron registration in `server/_core/index.ts` or wherever batchJobs are registered)

Document what you find in a brief comment block at the top of the script you are about to write.

---

## Step 2: Write a one-off verification script

Create `scripts/verify-citizenship-batch.ts`. It must:

1. **Seed a test user** (or find an existing non-admin user with a known tier) with:
   - A citizenship tier that should demote on next check (e.g., `Citizen` but with zero qualifying activity in the last 30 days)
   - A `gracePeriodEndsAt` timestamp in the past so the grace period has lapsed

2. **Invoke `checkCitizenshipTiers` directly** (import it, call it — don't wait for cron)

3. **Assert**:
   - The test user's tier dropped to the expected lower tier
   - A row was created in the notifications table (or wherever notification records live) for that user
   - Log PASS or FAIL for each assertion with the actual vs expected values

4. **Clean up** the test user afterward (DELETE WHERE email = 'test-tier-batch@regencivics.earth' or similar)

The script should exit with code 0 on PASS and code 1 on FAIL.

Run it:
```bash
npx tsx scripts/verify-citizenship-batch.ts
```

Report the full output.

---

## Step 3: Verify the cron is registered

Search `server/_core/index.ts` and any scheduler files for where batch jobs are registered. Confirm:
- `checkCitizenshipTiers` is in the nightly cron schedule
- The cron expression fires at midnight or similar (not at an interval that would miss the grace period window)

If it is NOT registered, add it to the scheduler in the correct location. The cron should run once per day, off-peak hours.

---

## Step 4: Fix any bugs found

If the batch job:
- Queries the wrong column names (there was a `citizenshipTier` vs `currentTier` schema drift — check which column the live DB actually has)
- Does not create notification rows
- Crashes on missing data

Fix the bugs. Do not paper over them with try/catch silencing.

---

## Verification

```bash
npx tsx scripts/verify-citizenship-batch.ts
# Expected: all assertions PASS, exit code 0
```

---

## Commit

```
test(citizenship): end-to-end verification of tier demotion batch job

Script confirms checkCitizenshipTiers demotes users with lapsed grace
periods and creates notification rows. Cron registration confirmed in
server/_core/index.ts.
```

If bugs were fixed, add a second commit:
```
fix(citizenship): [describe the actual bug]
```
