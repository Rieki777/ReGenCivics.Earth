# Path Progression: Phase 1 Handoff

Phase 1 of `QUEST_PAGE_AND_PATH_PROGRESSION_SPEC.md`. Backend foundation: data model, tier detection, and the cron entrypoint that runs the detector for all users every 15 minutes. No UI in this phase; that's Phase 2 (Profile Quests tab) and Phase 3 (Quest page redesign).

What's coded and ready to ship: drizzle migration `0134_path_progression.sql`, two new tables (`player_paths`, `tier_events`), the `server/lib/tierDetector.ts` module with idempotent per-path checks, the `POST /api/cron/tier-detector` endpoint, inline tier-detector calls at quest completion and application approval, and auto-declare path soft triggers at quest completion (ReGen Player) and application creation (Land Project). Plus a shared `shared/questPools.ts` module so the detector knows which quest IDs are Rites.

Not coded yet (deferred to a later phase): Land Project Steward criterion (needs season + game-launch tracking schema), Alliance Partner criteria (needs tool-usage + alliance proposal type), Sage criterion (needs daily contribution snapshot table). Those return `met: false` from their stubs so they're no-ops, not false positives.

## Files in this batch

| File | Status | What it does |
|---|---|---|
| `QUEST_PAGE_AND_PATH_PROGRESSION_SPEC.md` | NEW (committed earlier) | Standing spec, supersedes tier sections of CITIZENSHIP_TIERS_SPEC and QUEST_PROGRESSION_SPEC. |
| `drizzle/0134_path_progression.sql` | NEW | Migration: creates `player_paths` and `tier_events`. |
| `drizzle/schema.ts` | EDIT | Added `playerPaths` and `tierEvents` table definitions + types. |
| `shared/questPools.ts` | NEW | Quest pool/path metadata + `isRiteOfPassage()` helper. |
| `server/lib/tierDetector.ts` | NEW | Tier detection core: `declarePath`, `detectTierProgression`, `detectTierProgressionForAllUsers`. |
| `server/_core/index.ts` | EDIT | Added `POST /api/cron/tier-detector` endpoint with CRON_SECRET auth. |
| `server/routes/players.ts` | EDIT | Quest completion handler now declares ReGen Player path + runs detector. |
| `server/routes/applications.ts` | EDIT | Application create declares Land Project path; status update to 'approved' runs detector inline. |

## Handoff Breakdown

### Claude Code can do autonomously

| Task | Status | Evidence |
|---|---|---|
| Migration file authored | CODED | `drizzle/0134_path_progression.sql` lines 1-65 |
| schema.ts updated with `playerPaths` + `tierEvents` | CODED | `drizzle/schema.ts` lines 640-715 |
| Quest pool helper module | CODED | `shared/questPools.ts` lines 1-118 |
| Tier detector core | CODED | `server/lib/tierDetector.ts` lines 1-340 |
| Cron endpoint | CODED | `server/_core/index.ts` lines 517-541 |
| Inline detector wiring at quest completion | CODED | `server/routes/players.ts` lines 1297-1305 |
| Inline detector wiring at application approval | CODED | `server/routes/applications.ts` lines 263-281 |
| Auto-declare paths on relevant actions | CODED | quest.complete and applications.create |
| Truncation audit clean | VERIFIED | `python3 scripts/audit-truncation.py` returns 0/0 |
| Em-dash check on new files | VERIFIED | grep returns no results |
| Typecheck clean for new code | VERIFIED | `tsc --noEmit` no errors in new files |

### Rye must do (cannot run from this session)

| Task | Why this needs you | What to do |
|---|---|---|
| Push current local commits | No GitHub credentials in this session | `git push` from your authenticated machine |
| Run migration `0134_path_progression.sql` on Railway DB | DATABASE_URL secret is in Railway only | `npx tsx scripts/run-migration.ts drizzle/0134_path_progression.sql` from a machine with the production DATABASE_URL set, or via the Railway dashboard SQL console. Verify via `npx tsx scripts/run-migration.ts --status`. |
| Configure Railway cron to hit `/api/cron/tier-detector` every 15 min | Railway dashboard access | Railway dashboard → service → settings → cron jobs. Add: `*/15 * * * *` running `curl -X POST -H "Authorization: Bearer $CRON_SECRET" $APP_URL/api/cron/tier-detector` |
| Smoke test on staging or production | Need a live account with a real quest completion or application | After deploy, complete a Rite of Passage or get an application approved on a test account. Wait up to 15 minutes (or trigger the cron manually). Verify: `SELECT * FROM tier_events WHERE userId = ?` shows the matching `co_creator_earned` row, and `user_token_ledger` shows a +77 RGVoice credit with source `tier_bonus_co_creator`. |

## Verification commands

After Rye runs the migration and deploys, these queries confirm the system is wired correctly. Run via Railway DB console or any tool with DATABASE_URL access.

```sql
-- 1. Tables exist with the right shape
DESCRIBE player_paths;
DESCRIBE tier_events;

-- 2. No tier events fired yet (forward-only, this is correct on day 1)
SELECT COUNT(*) FROM tier_events;
-- Expected: 0

-- 3. After someone completes a quest, their path should be declared
SELECT * FROM player_paths WHERE userId = <test_user_id>;
-- Expected: 1 row, path='player', declaredAt = recent

-- 4. After someone completes all 14 Rites, tier should be earned
SELECT te.*, ledger.amount, ledger.source
FROM tier_events te
LEFT JOIN user_token_ledger ledger ON ledger.sourceId = te.id AND ledger.source = 'tier_bonus_co_creator'
WHERE te.userId = <test_user_id> AND te.eventType = 'co_creator_earned';
-- Expected: 1 row, amountCredited=77, ledger.amount=77

-- 5. Cron endpoint responds
-- curl -X POST -H "Authorization: Bearer $CRON_SECRET" https://regencivics.earth/api/cron/tier-detector
-- Expected: { "ok": true, "scanned": <N>, "earned": 0 } on first run
```

## What Phase 1 deliberately does NOT do

- No retroactive tier grants. Players who already meet criteria at migration time stay at their current tier (per Rye's "forward-only" answer to backfill question).
- No UI changes. Players will not see anything new on the Profile or Quest page until Phase 2 ships.
- No notifications when a tier earns. The `fireTierEvent` helper has a comment hook for this; we'll add the notification path in Phase 2 alongside the Profile UI so the in-app banner and the Profile state arrive in the same release.
- No Land Project Steward, Alliance criteria, or Sage criterion. These need schema work that's its own scope.

## What's next (Phase 2 preview)

Profile Quests tab gets the Your Paths section. State A (action checklist with concrete buttons), State B (single Claim button when criteria met), State C (calm earned banner). The Hypha claim flow plugs into the existing `playerProfiles.requestClaim` with a new intent type. ETA: 1 week of implementation once Phase 1 lands and is verified.

## Recovery if this batch breaks production

If `/api/cron/tier-detector` errors loudly, disable the cron job in Railway and the system reverts to no-op (no tier events created, no bonuses paid). The data model is additive: the migration only creates new tables, it doesn't ALTER existing ones, so rollback is just `DROP TABLE player_paths, tier_events;` and a redeploy of the previous git revision.

If a tier event fires incorrectly (false positive), delete the row from `tier_events` and the ledger entry from `user_token_ledger` (find by `source = 'tier_bonus_co_creator'` and matching `sourceId`). The detector is idempotent and won't re-credit if the row is recreated, but it will re-fire if the rows are deleted, so handle deletes carefully.
