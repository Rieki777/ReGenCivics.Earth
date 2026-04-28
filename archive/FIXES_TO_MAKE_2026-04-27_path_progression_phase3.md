# Path Progression: Phase 3 Handoff

Phase 3 of `QUEST_PAGE_AND_PATH_PROGRESSION_SPEC.md`. The /quest page now reads as a path-aware journey: four elemental portals at the top, citizenship tier sidebar above them, locked quest cards rendered as moss-overgrown stone ruins.

The work is in `PHASE_3_PATCH.patch` (commit `75e91e6` locally). Apply the same way as Phase 2: `git am PHASE_3_PATCH.patch && git push`.

## What ships

| File | Status | What it does |
|---|---|---|
| `client/src/components/LockedQuestCard.tsx` | REWRITE | Complete redesign per spec section 9.8: stone-arch silhouette + moss + bioluminescent glyph (fire / water / earth / air). Backward-compatible prop API, plus new optional `glyph` and `unlockHint` props. |
| `client/src/components/PathPortalsSelector.tsx` | NEW | Four elemental portals in a row. Aurora glow on declared paths. Hollow Knight fade-in shimmer on first paint. Tap-to-filter for declared paths, tap-to-add (routes to Profile) for undeclared. |
| `client/src/components/CitizenshipTierSidebar.tsx` | NEW | Vertical or horizontal timeline of Explorer / Co-Creator / Steward / Sage. Current rung pulses; next rung visible. Tap-targets scroll to relevant page section. |
| `client/src/pages/Quest.tsx` | EDIT | Imports the three components and adds a `<PathProgressionSection>` directly below the hero. Reads from the Phase 2 `playerPaths.getMyPaths` query. |
| `PHASE_3_PATCH.patch` | NEW | Single git patch with all four files above. 777 lines. |

## Handoff Breakdown

### Claude Code can do autonomously (already done)

| Task | Status | Evidence |
|---|---|---|
| LockedQuestCard rewrite (moss ruin) | CODED | client/src/components/LockedQuestCard.tsx 1-170 |
| PathPortalsSelector | CODED | client/src/components/PathPortalsSelector.tsx 1-207 |
| CitizenshipTierSidebar | CODED | client/src/components/CitizenshipTierSidebar.tsx 1-226 |
| Mount in Quest.tsx | CODED | client/src/pages/Quest.tsx adds PathProgressionSection below hero |
| Em-dash check | VERIFIED | grep returns no matches in new files |
| Typecheck on new code | VERIFIED | tsc returns 0 errors in Phase 3 files |
| Phase 3 patch file | NEW | PHASE_3_PATCH.patch |

### Rye must do

| Task | Why this needs you | Command |
|---|---|---|
| Apply patch + push | No GitHub credentials in this session | `git am PHASE_3_PATCH.patch && git push` |
| Visual sanity check on staging | I can't render the page from here | After deploy, open `https://regencivics.earth/quest` and confirm the four portals appear below the hero, with the tier sidebar above. Hover a locked quest card if any are visible: should show the moss ruin. |

## Smoke test after deploy

1. Open `https://regencivics.earth/quest`
2. Below the hero, you should see "Choose your path" with four portal icons (fire / water / earth / air) and a horizontal tier pill row to the right.
3. If you've declared any paths via Profile, the matching portals render with aurora glow. Undeclared portals render as outline silhouettes with "tap to add" subtext.
4. Tap an undeclared portal: redirects to `/profile?tab=quests` (where the Add a Path modal lives from Phase 2).
5. Tap a declared portal: toggles the active filter (visual only for now; full filter behavior is Phase 3.1).
6. Anywhere a `<LockedQuestCard>` renders today (currently in the EpicQuestSection and progressive-unlock sections), the visual should now be the moss-overgrown ruin instead of a greyed lock-icon card. Hover the ruin: tooltip with the unlock hint, if the parent supplies one.

## What's deferred to Phase 3.1

Per spec section 9 there's more I didn't ship in this batch. Each is its own contained piece:

1. **Hero-card treatment for threshold quests** (spec 9.6). Fire, Food Foresting, and the first revealed Open Universe quest get full-bleed hero-style cards. Mostly Tailwind class additions plus a conditional in the existing card render.
2. **Canopy-fall unlock animation** (spec 9.7). Single-beat reveal animation when a new Open Universe quest unlocks. CSS keyframes + a small timing hook.
3. **Open Universe two-at-a-time reveal logic** (spec 4.3). Phase 1 tagged the data via `shared/questPools.ts`. Phase 3.1 needs:
   - A deterministic-shuffle utility seeded by user id.
   - Render N visible Open Universe quests where N = 2 + (number completed).
   - Hide the rest behind moss-ruin silhouettes.
4. **Path filter actually filters the list** (spec 9.2). The portal selector tracks active path in local state; Phase 3.1 wires that filter into the existing quest-list rendering paths in Quest.tsx.

These are all small follow-ups now that the components exist. Ship them next time we're in /quest.

## Notes

- The path portals reuse the same path enum values as the Phase 1 schema and Phase 2 router (`player`, `investor`, `land_project`, `ally`). No new types.
- The portal route for undeclared paths goes to `/profile?tab=quests` rather than opening an inline modal. Reasoning: the Add a Path UX is already polished in the Profile, and dedicated modals on /quest would duplicate logic. Easy to invert later if Rye wants the inline experience.
- `LockedQuestCard` is backward-compatible. Existing call-sites that pass only `title` and `subtitle` continue to work; the component picks `earth` as the default glyph and skips the tooltip.
- The Phase 2 patch already shipped Profile-side changes that reference `playerPaths.getMyPaths`. Phase 3 reuses the same query so there's nothing new on the server.
- I noticed the original patch's `data?.redirectUrl` reference was wrong (the requestClaim mutation returns `hyphaUrl`). The disk version in this session has been corrected to `data?.hyphaUrl`. If the Phase 2 patch already landed with the wrong field, ship the correction in this Phase 3 patch (it's included).

## Recovery if anything looks wrong

The Phase 3 changes are pure UI/layout and live entirely in the client bundle. If the new section breaks the page, the existing ErrorBoundary on /quest scopes the failure. Roll back by reverting commit `75e91e6` and redeploying. Phase 1 + Phase 2 backend stays intact.
