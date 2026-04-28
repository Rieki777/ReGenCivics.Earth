# Claude Code Handoff: Phase 3.2 (path filter + schema-gap criteria)

This is the final handoff for the path-progression rollout. Everything from Phase 1 through Phase 3.1 plus the Hypha bonus-claim cascade is already on `origin/main` (you handled all of those, including commits `d0d2e5b`, `386d7e0`, and the archive sweep `706f0df`). This batch closes out three of the four Phase 3.2 follow-ups I left in the previous handoff:

1. **Path filter wiring** (spec section 9.2). The four portals at the top of /quest now persist their selection in the URL hash and downstream sections subscribe.
2. **Land Project Steward criterion** (spec section 3.3). Schema migration + tier-detector implementation.
3. **Alliance Partner Co-Creator criterion** (spec section 3.2). Tier-detector implementation against existing tools data, no schema changes needed.

The fourth follow-up (Sage daily contribution snapshots) is still its own scope and remains stubbed.

Plus: I've already configured the Railway tier-detector cron in the dashboard. The new `cron-tier-detector` service runs `*/15 * * * *`, posts to `/api/cron/tier-detector` with the shared CRON_SECRET. EMAIL_REPLY_TO is already absent from the Railway service variables (no cleanup needed).

## Files in this batch

| File | Status | What it does |
|---|---|---|
| `client/src/hooks/useActivePathHash.ts` | NEW (84 lines) | `useActivePathHash` syncs filter state to `#path=investor`. `pathToElement` maps path slug to elemental theme (player→fire, investor→water, land_project→earth, ally→air). History uses `replaceState` so toggling doesn't pollute the back stack. |
| `client/src/pages/Quest.tsx` | EDIT (~6 lines) | `PathProgressionSection` swaps local `useState` for `useActivePathHash`. Imports the hook. |
| `client/src/components/EpicQuestSection.tsx` | EDIT (~10 lines) | Subscribes to `useActivePathHash` and filters `EPIC_QUESTS` by element when an active path is set. Path filter is applied before sort and computeReveal so the Open Universe reveal pool is path-scoped. |
| `drizzle/0135_path_steward_criteria.sql` | NEW (26 lines) | `ALTER TABLE applications ADD COLUMN seasonsCompleted INT NOT NULL DEFAULT 0, ADD COLUMN gameLaunchedAt TIMESTAMP NULL`. |
| `drizzle/schema.ts` | EDIT (6 lines) | Mirror the migration in the Drizzle schema. |
| `server/lib/tierDetector.ts` | EDIT (~110 lines) | `checkLandProjectSteward` reads `applications.seasonsCompleted` + `gameLaunchedAt`, fires when both signals are present on any of the user's applications. `checkAllyCoCreator` reads `regenTools` where `submittedBy = userId AND status = 'approved'`, then groups `regenToolClicks` by `toolId` counting `DISTINCT userId`, fires when any approved tool has 11+ distinct users. |
| `PHASE_3_2_PATCH.patch` | NEW | Single git patch with all six files above. 1011 lines (mostly EpicQuestSection's whole-file rewrite due to line-ending normalization; the actual delta is small). |

## Apply + push + migrate

```bash
# In repo root, authenticated to origin
git fetch origin
git checkout main
git pull origin main
git am PHASE_3_2_PATCH.patch
git push origin main

# After Railway picks up the deploy, run the migration on production
npx tsx scripts/run-migration.ts drizzle/0135_path_steward_criteria.sql
```

Verify migration applied:

```bash
npx tsx scripts/run-migration.ts --status
# Expect: 0135_path_steward_criteria.sql shown as applied
```

## Smoke test

### Path filter
1. Open `https://regencivics.earth/quest` while signed in.
2. Click any portal. URL should update to `…/quest#path=<slug>`.
3. Hard-refresh: filter persists; Epic section narrows to the matching element (player→fire-themed, investor→water-themed, etc).
4. Click the same portal again to clear the filter; URL hash drops back to no `path` param; Epic section shows all elements.

### Land Project Steward
On a test account that has an approved application:

```sql
UPDATE applications
SET seasonsCompleted = 1, gameLaunchedAt = NOW()
WHERE userId = <test_user_id>
  AND status IN ('approved', 'active')
LIMIT 1;
```

Wait up to 15 minutes for the cron, or trigger inline by completing any quest. Verify:

```sql
SELECT * FROM tier_events
WHERE userId = <test_user_id> AND eventType = 'steward_earned' AND path = 'land_project';

SELECT amount, source, sourceRef
FROM user_token_ledger
WHERE userId = <test_user_id> AND source = 'tier_bonus_steward';
```

Expect a row with `amountCredited = 144` in `tier_events` and a matching `+144` ledger entry.

### Alliance Partner Co-Creator
On a test account that submitted an approved tool:

1. Make sure the tool has `status = 'approved'` and `submittedBy = <test_user_id>`.
2. Insert 11+ distinct user clicks:

```sql
INSERT INTO regen_tool_clicks (toolId, userId, clickedAt)
SELECT <tool_id>, u.id, NOW()
FROM users u
LIMIT 12;
```

3. Trigger the cron (or wait 15 min). Verify `tier_events` shows `co_creator_earned` with `path = 'ally'`.

## What's deferred to Phase 3.3 (still not in this batch)

| Item | Why | Suggested next step |
|---|---|---|
| Sage criterion (daily contribution percentile) | Needs daily snapshot table | New migration `0136_daily_contribution_snapshots.sql` + a nightly-batch job that takes a snapshot. Then `checkSage` reads snapshots over the current season and computes percentile-met-day-count vs total-season-days. |
| Alliance Partner Steward (resource swap + token swap) | Needs swap-log tables OR proposal-type tagging | Smallest scope: add `proposals.intent` enum extension `resource_swap` and `token_swap`. Detector reads votes/approvals. Larger scope: new `alliance_swaps` table. |
| Path filter applied to seasonal Rite sections | The Rites are universal so filtering them by element is debatable; spec section 9.2 doesn't require it | If shipped, would tint inactive-element season sections. Low priority. |

## Voice + writing

No new user-visible strings in this batch. The path filter exposes `#path=…` in the URL hash but no human copy. All criterion notes (e.g., `"Top tool has N distinct users; need 11"`) stay in `tier_events.details` for admin debugging only.

## Truncation audit + typecheck

Local FUSE artifacts in this dev environment showed up on `client/src/App.tsx`, `server/_core/notify.ts`, `server/lib/hypha-bridge/webhook-receiver.ts`, `client/src/pages/Opportunity.tsx`, `server/_core/email.ts`, and `server/routes/newsletter.ts`. None of them are included in this patch. Git HEAD has them clean; you'll be applying the patch on a clean checkout.

Phase 3.2 specific files: typecheck clean, no NUL bytes, no em-dashes in new content.

## Recovery

Phase 3.2 is purely additive. If it breaks production:
- The migration adds two nullable / default-0 columns; reverting is a `DROP COLUMN seasonsCompleted, DROP COLUMN gameLaunchedAt` on `applications`.
- The tier_detector criterion changes are reads only (no writes that aren't already idempotent via `tier_events`).
- The path-filter UI is scoped to the EpicQuestSection wrapper; the page's existing ErrorBoundary catches any hook hiccups.

Revert by `git revert <commit_sha_a26b610>` and redeploy.

## Cumulative status of the path-progression system

After you ship this batch, the spec is implemented end-to-end except for two named items:

| Spec section | Status |
|---|---|
| 2 Path model (4 paths in parallel) | DONE |
| 3.1 Explorer (default on signup) | DONE |
| 3.2 Co-Creator: ReGen Player (14 Rites) | DONE |
| 3.2 Co-Creator: Investor (LOI) | DONE |
| 3.2 Co-Creator: Land Project (application approved) | DONE |
| 3.2 Co-Creator: Alliance Partner (tool with 11+ users) | **DONE this batch** |
| 3.3 Steward: ReGen Player (33 quests + 144 votes) | DONE |
| 3.3 Steward: Investor (investment + Fund vote) | DONE |
| 3.3 Steward: Land Project (season + Game launched) | **DONE this batch** |
| 3.3 Steward: Alliance Partner (resource + token swap) | **STILL STUBBED** (Phase 3.3 follow-up) |
| 3.4 Sage (top 80th percentile sustained) | **STILL STUBBED** (Phase 3.3 follow-up) |
| 4.1 Welcome Aboard ring | Pre-existing |
| 4.2 Rites of Passage (all 14 unlocked) | DONE |
| 4.3 Open Universe progressive reveal | DONE |
| 5 Hypha claim flow + auto-claimed flag | DONE |
| 6 Data model | DONE |
| 7 Tier-grant detection cron | DONE (cron also configured in Railway dashboard) |
| 8 Profile Quests tab | DONE |
| 9.2 Four-portal selector | DONE |
| 9.2 Active path filter | **DONE this batch** |
| 9.3 Citizenship tier sidebar | DONE |
| 9.4 Season ring | Pre-existing |
| 9.6 Hero-card threshold quests | DONE |
| 9.7 Canopy-fall unlock animation | DONE |
| 9.8 Moss-ruin locked cards | DONE |
| 11 ADR | DONE in spec doc |

Two checkboxes left in the entire 14-section spec. Both are scoped follow-ups, not blockers. The system is functionally complete and deployable.
