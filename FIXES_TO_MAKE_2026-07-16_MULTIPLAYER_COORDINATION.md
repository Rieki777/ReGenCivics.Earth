# FIXES TO MAKE: Multiplayer Mode + Coordination Layer (2026-07-16)

Build prompt: `CLAUDE_CODE_PROMPT_2026-07-16_MULTIPLAYER_COORDINATION.md`. Source of truth: `MISSION_FOUNDATIONS_15_IMPROVEMENTS_2026-07-16.md` (Decision log binding). This doc tracks all five phases; Phase A is built, Phases B through E follow in order.

## Phase A: Multiplayer Mode. Status per item

| # | Item | Owner | Status | Evidence |
|---|------|-------|--------|----------|
| A1 | Migration `drizzle/0194_multiplayer_quest_crews.sql` (quest_crews, quest_crew_members, quest_crew_signups) | CLAUDE CODE | CODED (not applied) | `node scripts/check-migration-numbers.mjs` → "Migration numbering clean (196 files, next free: 0195)" |
| A1 | Drizzle schema types for the three tables | CLAUDE CODE | VERIFIED | `drizzle/schema.ts:4834-4890`; `pnpm check` exit 0 |
| A2 | Five multiplayer quest drafts + SDT scores | CLAUDE CODE | CODED, awaiting ratification | `shared/multiplayerQuests.ts` (all `status: "draft"`); test "launch quests stay draft until Rye ratifies" passes |
| A2 | SDT rubric added to the quest-builder skill | CLAUDE CODE | VERIFIED | `.claude/skills/regen-quest-builder/SKILL.md` "SDT Rubric" + "Multiplayer quests" sections |
| A3 | Signup + crew lifecycle tRPC router (`questCrews`) | CLAUDE CODE | VERIFIED | `server/routes/questCrews.ts`; registered `server/routers.ts:115`; `pnpm check` exit 0 |
| A3 | Deterministic assembly job (crews at min size, refills, crew chat thread, formation emails, completion sweep) | CLAUDE CODE | VERIFIED | `server/jobs/questCrewAssembly.ts`; pure rules in `server/lib/questCrews.ts`; 17/17 tests pass (`npx vitest run server/questCrews.test.ts`) |
| A3 | Cron endpoint `POST /api/cron/quest-crew-assembly` | CLAUDE CODE | VERIFIED | `server/_core/index.ts` (timing-safe CRON_SECRET gate, same shape as tier-detector) |
| A4 | `/multiplayer` page (quest list, live counts, signup form, my crews) | CLAUDE CODE | CODED | `client/src/pages/Multiplayer.tsx`; route in `client/src/App.tsx` |
| A4 | Quest page multiplayer banner (renders only when live quests exist) | CLAUDE CODE | CODED | `client/src/components/MultiplayerQuestsBanner.tsx`; mounted in `client/src/pages/Quest.tsx` |
| A4 | Player dashboard "Crews" tab | CLAUDE CODE | CODED | `client/src/components/profile/YourCrewsTab.tsx`; tab wired in `client/src/pages/PlayerProfile.tsx` |
| — | Ship gate | CLAUDE CODE | VERIFIED | truncation audit: "Scanned 1009 source files, TRUNCATED: 0, SUSPICIOUS: 0"; `pnpm check` exit 0; `pnpm test` 511 passed / 48 files; no new CSS classNames added (Tailwind utilities only, gate 2 N/A); migration numbers clean |

Items marked CODED become VERIFIED after deploy + a live walk of the flow on regencivics.earth (STEERING §4).

## Design decisions made while building (flag anything you want changed)

1. **There is no quest table.** Verified in `drizzle/schema.ts`: quest definitions are file-based (`client/src/data/questData.ts`) and `quest_completions.questId` is a varchar key. So the prompt's third migration (crewSizeMin/Max on the quest table) became `shared/multiplayerQuests.ts`, the single source both server and client read. Nothing about existing solo quests changes.
2. **bioregionId int, not bioregion varchar.** The verified vocabulary is the `bioregions` table (One Earth framework, picked by ID everywhere: forum posts, player profiles). Crew tables reference it the same way.
3. **A signups table was needed.** The prompt's A3 flow (form at min, overflow starts the next crew, one active signup per player per quest) requires `quest_crew_signups`; added to the same migration.
4. **Crew chat is a thread in a new "Crew Chats" forum category.** The forum has no member-only visibility mechanism today, so the crew's home is public like all forum content ("private-ish" as the prompt says: scoped, named, and linked only to members). If you want true member-only threads, that's a cross-cutting forum change; say the word and it becomes its own item.
5. **Welcome posts and completion moments post as a new system user** `regen-crews` ("ReGen Civics Crews", openId `quest-crews-system`), same idempotent pattern as the elder bots. Added to SYSTEM_HANDLES so it never receives mention notifications.
6. **No new token mechanics** (per the prompt): completing a crew quest walks the existing `quests.complete` flow; rewards ride the existing Hypha quest_completion path. The assembly job never touches balances.
7. **Formation email idempotency** is the `formationEmailSentAt` stamp per member row: one email per member per crew, ever. Emails are only stamped on a real send (EMAIL_HOLD and limiter blocks stay due), capped at 50 per run, 150ms apart.

## The five quest drafts for your ratification (item 1)

Full copy (description, story card, roles, steps, done, SDT scores) lives in `shared/multiplayerQuests.ts`. Ratifying = edit any copy you want, then flip `status: "draft"` to `"live"` per quest. Drafts render nowhere and accept no signups. Summary:

| Quest | Crew | Reward | SDT (A/C/R) |
|-------|------|--------|-------------|
| River Cleanup Crew (crew-quest-1): scout, haulers, sorter, documenter clear a stretch of water | 3 to 7 | 144 $ReGen + 1 RGVoice | 4/4/5 |
| Seed Swap (crew-quest-2): host, growers, driver, scribe run a bioregion seed swap | 3 to 7 | 144 $ReGen + 1 RGVoice | 5/3/4 |
| Community Meal (crew-quest-3): gleaner, cook, host, inviter cook one meal from gleaned and local food | 3 to 7 | 144 $ReGen + 1 RGVoice | 4/4/5 |
| Land Project Work Party (crew-quest-4): liaison, tool keeper, hands, documenter give a land project one crew day | 4 to 7 | 144 $ReGen + 1 RGVoice | 3/5/5 |
| Bioregion Story Harvest (crew-quest-5): interviewer, recorder, writer record an elder's memory of the place, consent-first | 3 to 5 | 144 $ReGen + 1 RGVoice | 4/4/5 |

Rewards default to 144 $ReGen + 1 RGVoice (a step above the 111 solo default, for the coordination). Yours to change.

Also delete the test `"launch quests stay draft until Rye ratifies (none live yet)"` in `server/questCrews.test.ts` when you flip the first quest live; it exists to guard drafts until then.

---

## Handoff Breakdown — Who Does What

### YOU (Rye) — things only you can do

| # | Task | Why only you | Command / Where |
|---|------|-------------|-----------------|
| 1 | Ratify the five quest drafts: edit copy/rewards in `shared/multiplayerQuests.ts`, flip `status` to `"live"` (and delete the draft-guard test), commit | Player-facing voice is yours | See table above |
| 2 | Apply migration 0194 on Railway, then verify | DB access is yours; deploys don't run migrations | PowerShell from repo root: load `.env` into `$env:`, then `npx tsx scripts/run-migration.ts --all` and `npx tsx scripts/run-migration.ts --status` |
| 3 | Push to main AFTER step 2 (code queries the new tables; pushing first would deploy against missing tables) | Standing flow for this build | `/ship` then `git push`, then `pnpm railway:deploys` until SUCCESS |
| 4 | Create the Railway cron service for assembly | Railway dashboard is yours | Per `regen-railway-crons` skill: `curlimages/curl:latest`, start command `sh -c 'curl -X POST https://regencivics.earth/api/cron/quest-crew-assembly -H "Authorization: Bearer $CRON_SECRET"'`, `CRON_SECRET` = `${{"ReGenCivics.Earth".CRON_SECRET}}`, schedule suggestion `*/30 * * * *`, rename `cron-quest-crew-assembly`, run once and read Deploy Logs for the JSON report (not just green) |
| 5 | Live verification after deploy: open /multiplayer on regencivics.earth, sign in, sign up for a live quest, confirm the flow | STEERING §4, load-bearing surface | Claude can drive this with you via browser once deployed |

### CLAUDE CODE — done this session (no action needed)

| # | Task | Status |
|---|------|--------|
| A | Migration 0194 + schema types | CODED / VERIFIED (see table) |
| B | Five quest drafts + SDT rubric in skill | CODED, awaiting your ratification |
| C | questCrews router + assembly job + cron endpoint + tests | VERIFIED (ship gate green) |
| D | /multiplayer page, Quest page banner, profile Crews tab | CODED, verify live after deploy |

### WAITING ON YOU

- Phase A go-live: items 1, 2, 3, 4 above, in that order.
- Phase B (map layer + needs/offers board) starts after Phase A ships, per the build prompt's phase gate.
