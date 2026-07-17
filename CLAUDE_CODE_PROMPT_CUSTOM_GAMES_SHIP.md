# Claude Code Prompt: test and ship the Custom Games build

**Created:** 2026-07-16 by the Cowork planning session
**Master plan:** `CUSTOM_GAMES_MASTER_PLAN.md` (v4.1, repo root). Read "Decisions locked" before touching copy.
**Your job:** one test round, fix what breaks, ship to production, verify the deploy. Everything is already written; nothing new to design.

## What was built this session

**Workstream A, the new /custom-games page:**
- `client/src/pages/CustomGames.tsx` REWRITTEN (964 lines): 12 sections (hero, who this is for, the problem, Amora live with screenshot slots + "Latest from ReGen Civics" strip, four personas, what your game covers, ownership, how it works, pricing $20k milestones + full service $20-$2,000/mo, what we need from you, FAQ, final CTA + StickyThumbCta). Primary CTAs point at `/custom-games/apply`. Waitlist modal kept as secondary. Amora screenshots render from `/images/custom-games/*.png` with a styled fallback until the capture session delivers them.
- `client/src/pages/Home.tsx`: Custom Games link added (~line 915).

**Workstream C, the Sylva intake:**
- `shared/customGameBlueprint.ts` NEW (276): blueprint.json v0.3 zod schemas (`blueprintSchema` strict, `blueprintDraftSchema` partial), credential-shaped strings rejected by refine.
- `shared/companions.ts`: `sylva` persona + `custom-game-application` form spec (43 fields, 12 sections).
- `server/lib/ship-personas.ts`: Sylva system prompt (human voice spec, injection-hardened, deflects any offered secrets).
- `drizzle/0192_custom_game_applications.sql` NEW + matching table in `drizzle/schema.ts`.
- `server/routes/customGameApplications.ts` NEW (185): submit (public, rate-limited on the `custom_game_waitlist` key, sanitized, scored, notifyOwner email), list/get/updateStatus (admin). Registered in `server/routers.ts` beside customGameInquiries.
- `client/src/pages/CustomGamesApply.tsx` NEW (935): FormCompanion + visible 12-section form, autosave (`regen_custom_game_draft`), review-before-submit, success state. Route added in `client/src/App.tsx`.
- `client/src/pages/Admin.tsx`: `AdminCustomGameApplications` queue (status filter, score sort, expandable blueprint + transcript, status dropdown) stacked above the waitlist in the custom-games tab.
- `server/customGameApplications.test.ts` NEW (127): schema acceptance/strictness/credential-rejection + score formula.

**Already verified by the planning session (evidence):** `python3 scripts/audit-truncation.py` = 0 truncated, 0 suspicious across 979 files; em-dash sweep of all touched files = clean; all new file tails intact.

## Step 1: test round

```bash
pnpm check          # riskiest: zod strictObject/.partial() chains in shared/customGameBlueprint.ts,
                    # BlueprintDraft-typed literals in CustomGamesApply.tsx buildBlueprintDraft()
pnpm test           # includes the new server/customGameApplications.test.ts
pnpm build          # bundle must pass; note the known local-only workbox failure is NOT a real error
```

Fix anything red. Don't redesign; smallest fix that keeps the plan's intent.

## Step 2: migration

```bash
npx tsx scripts/run-migration.ts --status
npx tsx scripts/run-migration.ts --all      # applies 0192_custom_game_applications
```

Deploys do not run migrations. This must happen before the deploy goes live or submit will 500.

## Step 3: visual QA

Run dev, then screenshot at 1440px and 390px:
- `/custom-games`: all 12 sections, screenshot fallbacks rendering cleanly, both CTAs firing analytics
- `/custom-games/apply`: form renders all sections; with an Anthropic key in env, Sylva responds and fills fields; WITHOUT a key the plain form must still work end to end
- `/admin` custom-games tab: applications queue renders (submit a test application first)

Known cosmetic gap: `client/public/images/ship/persona-sylva.webp` does not exist, so Sylva shows the emoji fallback portrait. Generate or request one (forest guide, matching the other persona portraits' style) if in scope; otherwise note it for Rye.

## Step 4: ship (targeted staging ONLY)

The working tree contains OTHER sessions' unfinished work (Galley.tsx, Ship.tsx, shipShared.tsx, CREATION_STATION_PLAN.md, a loomio folder, and more), and a git index.lock contention was observed. Stage ONLY these paths, exactly:

```bash
git add CUSTOM_GAMES_MASTER_PLAN.md CLAUDE_CODE_PROMPT_CUSTOM_GAMES_SHIP.md \
  client/src/App.tsx client/src/pages/Admin.tsx client/src/pages/CustomGames.tsx \
  client/src/pages/Home.tsx client/src/pages/CustomGamesApply.tsx \
  drizzle/schema.ts drizzle/0192_custom_game_applications.sql \
  server/lib/ship-personas.ts server/routers.ts server/routes/customGameApplications.ts \
  server/customGameApplications.test.ts \
  shared/companions.ts shared/customGameBlueprint.ts
```

Then: run `/ship` (mandatory, `docs/GOLDEN_RULE.md`), commit as `feat(custom-games): new sales page + Sylva conversational intake`, body explaining the why (income stream, master plan v4.1), push to `main` (standing authorization). Do NOT push if another session appears to be mid-push; check `git fetch && git status` first.

## Step 5: verify the deploy

```bash
pnpm railway:deploys   # poll until the new deploy leaves BUILDING; require SUCCESS
pnpm railway:logs      # if FAILED or CRASHED, pull the reason, fix, repeat
```

Then live checks: `https://regencivics.earth/custom-games` (12 sections, mobile), `/custom-games/apply` (submit a real test application, confirm the owner notification email arrives, confirm it appears in the admin queue, then set its status to declined and note it as test data).

## Step 6: log it

Append the ship to `SHIPPED_LOG.md` (what shipped, commit hash, live URLs). Update the CLAUDE CODE rows below with evidence.

## Handoff Breakdown

| Task | Owner | Status | Evidence |
|---|---|---|---|
| pnpm check / test / build green | CLAUDE CODE | PENDING | |
| Migration 0192 applied | CLAUDE CODE | PENDING | |
| Visual QA screenshots both pages | CLAUDE CODE | PENDING | |
| Targeted commit + push + deploy SUCCESS | CLAUDE CODE | PENDING | |
| Live end-to-end test application | CLAUDE CODE | PENDING | |
| SHIPPED_LOG.md entry | CLAUDE CODE | PENDING | |
| Sylva portrait webp | CLAUDE CODE (generate) or RYE (approve) | PENDING | |
| Amora screenshots for the page | RYE: run the capture prompt at the end of CUSTOM_GAMES_MASTER_PLAN.md in a separate session | PENDING | |
| Full-service copy check ($20-$2,000/mo framing) | RYE: read the pricing section once live | PENDING | |
| Announce / outreach | RYE | PENDING | |

## Out of scope for you (later phases, do not start)

Workstream B (Custom-Game-Foundation extraction from game-amora) waits for the parallel game-amora session's queue to land and a tagged sync point. The rendered Blueprint doc, Build Journey tracker, and generation playbook are Phase 3. It's all in the master plan.
