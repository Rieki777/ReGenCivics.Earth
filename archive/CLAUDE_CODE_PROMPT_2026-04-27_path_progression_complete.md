# Claude Code Handoff: Path Progression complete (Phases 1, 2, 3, 3.1)

You're picking up the path-progression rollout. The full system is built end-to-end across four phases. Phases 1, 2, and 3 are already on `origin/main` (Rye landed those plus the build-fix commits `b62d86a` and `3d3f707` from your previous batch). What's left for you is **Phase 3.1**, plus a quick sanity check across the system.

This doc is the single source of truth for everything you need to do.

## What ships in this batch

Phase 3.1 of `QUEST_PAGE_AND_PATH_PROGRESSION_SPEC.md`. The /quest page Epic section now has:

1. **Open Universe progressive reveal** (spec section 4.3). After Rites complete, only `2 + completedCount` Epic quests are visible; the rest render as moss-overgrown ruins. Order is deterministic per-player via a seeded shuffle so the reveal is consistent across sessions.
2. **Canopy-fall unlock animation** (spec section 9.7). Newly visible cards drift in once with a 0.9s keyframe. Single beat. Stagger delay across cards in the same paint.
3. **Hero-card treatment for threshold quests** (spec section 9.6). Quests 0 (Fire), 13 (Fasting), and 14 (Food Foresting) get an amber ring and soft glow so the eye lands there first.
4. The `LockedQuestCard` (already shipped in Phase 3) is now actually consumed in EpicQuestSection with `unlockHint` and per-quest `glyph`.

What's deferred to Phase 3.2 (not in this batch): wiring the path-portal active filter through into the /quest list rendering. The portals are visible and clickable, but the filter is currently visual-only. That's its own scoped follow-up.

## Files in this batch

| File | Status | What it does |
|---|---|---|
| `shared/openUniverseReveal.ts` | NEW (108 lines) | `seededShuffle<T>` + `computeReveal<T>` + `newlyRevealedIds` helpers. Pure functions, no React. Uses Mulberry32 + FNV-1a hash so the shuffle is identical across browser and Node. |
| `client/src/components/EpicQuestSection.tsx` | EDIT (~ 80 line additions) | Imports `useAuth`, `trpc`, `LockedQuestCard`, `computeReveal`. Reads the player's `questsCompleted` from `playerProfiles.me`, intersects with EPIC_QUESTS ids, runs `computeReveal(sortedQuests, userId, completedEpicCount)`. Renders visible cards normally with the canopy-fall animation; renders locked cards as `<LockedQuestCard>` with the per-quest element glyph and an unlockHint. Adds inline `<style>{...}</style>` for the keyframes. |
| `client/src/pages/Quest.tsx` | EDIT (~ 8 line addition) | Adds hero-card Tailwind classes (`ring-2 ring-amber-300/30 shadow-[0_0_28px_rgba(252,211,77,0.18)]`) when `quest.id === 0 || quest.id === 13 || quest.id === 14`. |
| `PHASE_3_1_PATCH.patch` | NEW | Single git patch with all three above. 741 lines. Apply with `git am`. |

## Apply + push

```bash
# In the repo root, with origin authenticated
git fetch origin
git checkout main
git pull origin main
git am PHASE_3_1_PATCH.patch
git push origin main
```

If `git am` reports a conflict, the most likely cause is that `EpicQuestSection.tsx` had unrelated edits between Phase 3 and now. Resolve manually: my changes only add imports, a new `useMemo` block for `completedEpicIds` and `reveal`, an `animatedIds` state hook, and replace the carousel children with the visible+locked split. The original `sortedQuests`, `EpicCard`, `TIER_CONFIG`, and `celebrating` logic should remain intact.

## Verify after deploy (Railway picks up automatically)

The /quest page Epic Quests section should behave like this:

1. **Pre-Rites players** (less than 14 Rites complete): the Epic section renders all quests as moss-overgrown ruins inside the existing `opacity-40 grayscale pointer-events-none` wrapper. Same gating message as before ("Complete all 13 Rites of Passage to access Epic Quests"). The visual change is the locked cards look like ruins instead of greyed normal cards.

2. **Post-Rites players, 0 Open Universe completed**: 2 cards visible (deterministic shuffle by user id), rest as ruins. Cards animate in with the canopy-fall keyframe on first paint.

3. **After completing 1 Open Universe quest**: 3 cards visible (the original 2 + 2 new ones revealed minus the 1 just completed... actually, the visible count is `2 + completedCount` so completing one reveals 2 more, net +1 visible). Newly revealed cards animate in.

4. **Threshold quests on /quest** (Fire, Fasting, Food Foresting): notice the amber ring/glow vs the regular green Rite cards.

## Smoke test SQL

If you want to verify the data path end-to-end, on a test account:

```sql
-- Pretend the player completed all 14 Rites + a few Epic quests
UPDATE player_profiles
SET questsCompleted = JSON_ARRAY(
  'quest-0','quest-1','quest-2','quest-3','quest-4','quest-5','quest-6',
  'quest-7','quest-8','quest-9','quest-10','quest-11','quest-12','quest-13',
  'epic-block-food-forest'
)
WHERE userId = <test_user_id>;

-- Hard refresh /quest. Epic section should show 3 visible (2 + 1 completed) + ruins.
```

## Cross-reference: what's already on origin/main

For context, here's the path-progression timeline. Everything below is already in `origin/main` from previous batches:

- **Phase 1** (commit history before the recent build fixes): `drizzle/0134_path_progression.sql` migration, `player_paths` + `tier_events` tables, `server/lib/tierDetector.ts`, `POST /api/cron/tier-detector` endpoint, inline detector calls at quest completion + application approval, `shared/questPools.ts`.
- **Phase 2** (commit `28b6679 feat(profile): Your Paths section + tRPC playerPaths router`): `server/routes/playerPaths.ts` tRPC router (`getMyPaths`, `declarePath`, `markBonusClaimed`), `client/src/components/YourPaths.tsx`, mounted in `PlayerProfile.tsx` Quests tab.
- **Build fix** (commit `b62d86a`): you fixed a duplicate trailing block in YourPaths.tsx.
- **Phase 3** (commit `3d3f707 fix(build): add missing PathPortalsSelector + CitizenshipTierSidebar components`): the moss-ruin LockedQuestCard rewrite, the four-portal selector, the citizenship tier sidebar, mounted in Quest.tsx as `<PathProgressionSection>`.
- **Phase 3.1** (this batch): see above.

If the Phase 1 migration is already applied on production (Rye ran it earlier), no DB action needed. Confirm with `npx tsx scripts/run-migration.ts --status` and check that `0134_path_progression.sql` shows as applied.

## Known follow-ups (Phase 3.2, not in this batch)

These are small, contained, deferred. Don't ship them in this PR; they're notes for the next time we're in /quest.

1. **Wire active path filter into the quest list.** PathPortalsSelector tracks `activePath` in local state (PathProgressionSection in Quest.tsx). Currently visual-only. The wiring needs either a context, a URL hash, or a lifted state pattern so the seasonal sections + EpicQuestSection can filter by element matching the active path.
2. **Ally + Land Project Steward criteria + Sage criterion.** Server-side stubs in `server/lib/tierDetector.ts` return `met: false` until the schemas land. Specifically:
   - Land Project Steward needs `applications.seasonsCompleted` or a per-application game-launch table.
   - Alliance Partner Co-Creator needs tool-usage attribution + alliance-proposal type tag.
   - Alliance Partner Steward needs swap-log tables.
   - Sage needs daily contribution score snapshots + a "current season" helper.
3. **Hypha redemption webhook flips `coCreatorBonusClaimedAt`.** The `markBonusClaimed` mutation on `playerPathsRouter` is exposed but not wired into the Alchemy webhook receiver. Until then, State C (claimed banner) only fires after a manual SQL update. Small follow-up: in `server/lib/hypha-bridge/webhook-receiver.ts` (or wherever the on-chain Transfer event is handled for tier-bonus ledger entries), call `markBonusClaimed({ path, tier })` once the Transfer matches a `tier_bonus_*` ledger entry.

## Voice + writing checks

All copy in this batch passes the project rules: no em-dashes, no contrast-framing ("not X, but Y"), no AI-pattern phrases, no rhetorical-question openers. The only user-visible string from this batch is the `unlockHint`: "Reveals as you complete your current Open Universe quests".

## Truncation audit

Pre-existing FUSE artifacts in this dev environment (NOT in this batch, NOT in your repo): `client/src/pages/Opportunity.tsx` and `server/routes/newsletter.ts` showed truncation locally but git HEAD has them clean. Ignore them; they're a quirk of the workstation, not a code issue.

## Recovery if anything goes wrong

Phase 3.1 is purely additive UI/UX. The whole batch reverts to no-op by reverting commit `b2f742c` (the patch's commit hash). The Phase 1 + Phase 2 + Phase 3 backend stays intact regardless.

If `EpicQuestSection.tsx` has a runtime error, the existing ErrorBoundary on /quest scopes the failure. The fallback experience: the player sees a blank Epic section and the rest of the page works normally. Check Sentry for the stack and revert if needed.

## Quick mental model for what just shipped end-to-end

A new player creates an account → auto-declared on the ReGen Player path. They see four portals on /quest: their declared one glows, the others are outline silhouettes inviting them to join. The Profile Quests tab shows a "Your Paths" section with a checklist: "Complete the 14 Rites of Passage (3/14)" with a "View Rites" button. They walk the Rites. As they finish each one, the moss-ruin Open Universe quests stay walled off; the Rite cards animate completion. When they finish the 14th Rite, the tier detector cron (every 15 min) fires `co_creator_earned` on the ReGen Player path, credits 77 RGVoice to their private ledger, and the Profile flips State A → State B. They see a single big button: "Claim 77 RGVoice on Hypha →". They click. The existing Hypha bridge handles the redirect. Once the on-chain Transfer fires (Phase 3.2 wiring still needed for the auto-flip), the Profile flips State B → State C: a calm earned banner.

The /quest page Epic section, meanwhile, has just unlocked. Two random Open Universe quests rise from the canopy. The rest stand as moss-overgrown ruins waiting their turn.

That's the whole arc.
