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

Shipped 2026-07-16 by the ship session. Commit `ab2781d`, live on `regencivics.earth`.

| Task | Owner | Status | Evidence |
|---|---|---|---|
| pnpm check / test / build green | CLAUDE CODE | VERIFIED | `pnpm check` exit 0; 470 passed / 1 skipped across 44 files, incl. `server/customGameApplications.test.ts` (9 tests). `pnpm build`: vite "✓ built in 23.85s", both chunks emitted (`CustomGames` 38.89 kB, `CustomGamesApply` 101.94 kB). The workbox exit-1 is not real: it trips only on `client/public/images/core/raw/*.png`, which `git ls-files` shows are untracked local-only assets CI never sees. |
| Four ship gates | CLAUDE CODE | VERIFIED | Truncation: 986 files, 0 truncated, exit 0 (use `py`, not `python3`, on this box). Links: 627 files / 116 routes / 569 links / 8 anchors all resolve, exit 0 — proves `/custom-games/apply` is registered and the Home link is live. className/keyframes: new pages use only stock `animate-bounce|pulse|spin`, nothing custom to mismatch. Typecheck exit 0. |
| Migration 0192 applied | CLAUDE CODE | VERIFIED | `run-migration.ts --all` -> "1 applied, 0 skipped, 0 failed"; `--status` -> 194/194, 0 pending. Applied **before** the deploy, as required. |
| Visual QA both pages, 1440 + 390 | CLAUDE CODE | VERIFIED | Playwright against the production build (the dev server's CSP nonce blocks Vite's inline React preamble, so dev renders an empty body in headless Chromium — a dev-only artifact, not a page bug). All 12 sections present on both pages, 0 console errors, 0 horizontal overflow at 390px. |
| Targeted commit + push + deploy | CLAUDE CODE | VERIFIED | Exactly the 14 listed paths staged; a concurrent session's Galley/CREATION_STATION/loomio work left untouched. `ab2781d` is an ancestor of `origin/main`. Deploy landed (live index bundle `DcdfkfjA` -> `BOXxowum`); live pages render the new content with 0 page errors. |
| Live end-to-end test application | CLAUDE CODE | VERIFIED | POST to the **deployed** `customGameApplications.submit` -> HTTP 200 `{success:true}`; row id 3 in `custom_game_applications`, score 100 (30 owned + 30 budget + 20 hours + 20 timeline), transcript stored, `notifyOwner` fired. |
| Credential rejection holds in production | CLAUDE CODE | VERIFIED | Live: `llmProvider: "sk-ant-api03-…"` -> HTTP 400 "Provider name only. Keys are entered…"; `llmProvider: "Anthropic"` -> HTTP 200. |
| Test data cleaned up | CLAUDE CODE | VERIFIED | Rows 1-3 (`ZZ TEST%`) set to `declined` with an internal note marking them QA data. Not deleted. |
| SHIPPED_LOG.md entry | CLAUDE CODE | VERIFIED | Top entry, "Custom Games ships — the sales page and the Sylva intake". |
| Owner notification email arrived | RYE | PENDING | Three `notifyOwner` mails fired to rieki.cordon@gmail.com. Only you can confirm inbox delivery. |
| Sylva portrait webp | RYE (decide) | PENDING | `client/public/images/ship/persona-sylva.webp` still absent, so a **mythic forest guide renders with the ship's default anchor emoji** on the live apply page. Cosmetic but visible on a sales funnel. Generating a brand portrait is your call, not a ship blocker. |
| Amora screenshots for the page | RYE: run the capture prompt at the end of CUSTOM_GAMES_MASTER_PLAN.md in a separate session | PENDING | Placeholders render cleanly; caption fixed to "Live screenshot coming soon" (it read "Live screenshot loading in", a dangling sentence). Drop into `/images/custom-games/*.png`. |
| Full-service copy check ($20-$2,000/mo framing) | RYE: read the pricing section once live | PENDING | `CustomGames.tsx:811` renders "$20 to $2,000 per month"; `:784` renders "$20,000". Matches v4.1. Your eyes on the framing. |
| schema.ts `transcript: text()` vs SQL `mediumtext` | RYE (decide) | PENDING | Harmless today (raw-SQL migrations; no length enforced on insert), but `drizzle-kit push` would try to narrow 16MB -> 64KB, and the new drift check does not compare column types. Left alone deliberately: out of the ship's scope. |
| Announce / outreach | RYE | PENDING | |

## Out of scope for you (later phases, do not start)

Workstream B (Custom-Game-Foundation extraction from game-amora) waits for the parallel game-amora session's queue to land and a tagged sync point. The rendered Blueprint doc, Build Journey tracker, and generation playbook are Phase 3. It's all in the master plan.
