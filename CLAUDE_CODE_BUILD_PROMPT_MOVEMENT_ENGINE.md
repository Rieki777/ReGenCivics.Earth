# Claude Code Kickoff Prompt: Build the Movement Coordination Engine

Paste everything below the line into Claude Code from the repo root. It builds the full system defined in the two spec docs already in this repo.

---

You are building the Movement Coordination Engine for ReGen Civics. The complete design lives in two files in the repo root. Read both fully before writing any code:

1. `MOVEMENT_COORDINATION_ENGINE_SPEC_2026-06-23.md` (the system: roles, tasks, bounties, delivery, agents)
2. `CLAUDE_CODE_PROMPT_2026-06-23_RIVERSIDE_YOUTUBE_PIPELINE.md` (the video stages: fetch, clean, chapters, upload, finalize)

Then read, in this order, before touching code: `CLAUDE.md`, `.ai/docs/STEERING.md`, `.ai/docs/security/AI-AUTOMATION-RISKS.md`, `.ai/docs/DECISIONS.md`, and `CONTEXT_THE_TWO_GAMES.md`.

## Confirmed facts (use these exactly)

- YouTube channel: `@SEEDSRegenerativeEconomies`
- Channel ID: `UCzuomEZ3aNbr2LEreGlvWGQ`
- RSS trigger URL: `https://www.youtube.com/feeds/videos.xml?channel_id=UCzuomEZ3aNbr2LEreGlvWGQ`
- Set this as the `YOUTUBE_CHANNEL_ID` env var default in `server/_core/env.ts`, with the RSS poll built around it.
- The RSS feed is verified working and returns the channel's uploads with `yt:videoId`, `title`, `published`. No API key or quota needed for the poll.

## Locked decisions (section 12 of the spec)

1. Token-bounty approval gate: ON. Proposed tasks wait in an admin review queue until Rye approves before they reach any person.
2. Completion consent: a circle steward consents before payout, EXCEPT auto-pay when `bountyAmount` is below a `game_variables` threshold key `coordination.auto_pay_bounty_max` (default 0, meaning consent always required until Rye raises it).
3. Edited cut: published as a separate YouTube video; the raw live cut is preserved.
4. Bounty currency: `$ReGen` for game-side roles, `$RCivics` for fund-side roles (`roleHolders.kind`). Default `regen` when kind is unknown.

## How to work

- Build in the five phases from the spec, in order. Do not start a phase until the previous one passes the Ship Gate.
- After each phase, stop and give me a short report: what shipped, the Ship Gate output, and any HUMAN steps from the Handoff table I need to do before the next phase can run live.
- Respect the token model in `CLAUDE.md`: every bounty goes through `creditPrivateTokens` with the new source tag `call_task_bounty`. Never write public balances.
- Respect the writing rules: zero em-dashes, no contrast-framing, no banned AI words, in all copy, comments, forum text, emails, and notifications.
- All transcript text sent to an LLM is untrusted: sanitize input, cap length, label generated output with bot provenance, and rate-limit, per `AI-AUTOMATION-RISKS.md`.
- Use `invokeLLM` (see `server/lib/videoSummary.ts` and `server/jobs/digestJob.ts` for the pattern). Use the migration runner `scripts/run-migration.ts` for SQL, never ad-hoc DB scripts.
- Heavy work (ffmpeg, downloads, YouTube upload) runs in the worker `server/worker/pipelineWorker.ts`, not the web process. Intermediate media goes to R2.

## Phase 1: foundation (build first)

- Write the migration `drizzle/0XXX_movement_coordination.sql` creating `roleHolders` and `callTasks` and the `recordings` column additions, plus the matching `schema.ts` definitions and `$inferSelect`/`$inferInsert` types. Use the exact column sets in the spec.
- Write `scripts/seed-role-holders.ts` that reads all 20 roles from `client/src/data/gameRoles.ts`, derives a stable `roleSlug` per role, and inserts one `roleHolders` row each with `userId = NULL`, carrying `roleTitle`, `kind`, `circle`, and an `aliases` array seeded from `characterName` and `title`.
- Build a small admin form to set `roleHolders.userId` per role (new tab or section in the admin area), plus tRPC procedures to list and update holders (`adminProcedure`).
- Add `callTasks` admin and player tRPC procedures: create, list-by-assignee, list-by-recording, claim, submit, approve, decline, consent, and the reward call.
- Do not wire video yet. Verify by creating a task by hand and confirming it can be routed to a holder and rewarded through `creditPrivateTokens`.
- Append the ADR to `.ai/docs/DECISIONS.md` and the `DOMAIN-LANGUAGE.md` entries for "call task" and "role holder", and add `call_task_bounty` to the documented source-tag list.

## Phase 2: ingest and understand

- Build the YouTube RSS poll source and integrate it into the worker. Diff against `recordings.youtubeVideoId`, ignore videos under 120s and titles matching a configurable skip pattern, idempotent on `youtubeVideoId`.
- On a new video: upsert a `recordings` row with `recordingKind = "raw"` and publish it to the site immediately (Schedule page).
- Transcribe via the YouTube timedtext approach already in `videoSummary.ts`, with a Whisper fallback stub.
- Two LLM passes: synthesize (`overview`, `chaptersJson`, `decisionsJson`, `actionItemsJson`) and extract-tasks (role-tagged proposals, each requiring an exact `evidenceQuote` and `evidenceTimestampSeconds`, no quote means no task). Write proposals as `callTasks` rows at `status = "proposed"`.

## Phase 3: gate and deliver

- Build the admin review queue (AdminTasksTab) showing each proposed task with its evidence quote, a timestamped play link, resolved assignee, and suggested bounty. Approve, edit bounty, reassign, decline, individually and in bulk. Approve stamps `approvedBy` and flips to `open`.
- On `open`, create a `notifications` row for the assignee (respect `roleHolders.notifyEmail`/`notifyInApp`), and render the task in `PlayerProfile.tsx` as an open task with its sociocratic overview and bounty. Open-to-circle tasks (no holder) render on `Opportunity.tsx`.

## Phase 4: reward and edit

- Build claim, submit (artifact pattern from `questCompletions`), steward consent, and the `creditPrivateTokens` payout writing `rewardLedgerId`, with the auto-pay threshold rule from locked decision 2.
- Build the edited-cut path: Riverside clean export if available, else ffmpeg/auto-editor trim of the YouTube download, re-upload as a separate video, set `editedYoutubeUrl`. Enrich the Schedule page with chapters, the timestamped transcript, overview, decisions, and action items.

## Phase 5: flywheel

- Build the weekly coordination agent (nudge stale claims, re-open expired tasks to the circle, report to Rye) and the roles-reconciliation agent (diff `gameRoles.ts` against `roleHolders`), modeled on `digestJob.ts`. No agent awards tokens or messages a holder without passing the two gates.

## Ship Gate (run before any VERIFIED claim, every phase)

```bash
python3 scripts/audit-truncation.py
rg -g '*.css' '<any-new-className>' client/src/
pnpm typecheck
```

Every fix marked VERIFIED needs evidence (file:line, grep result, or script output). No evidence means status stays CODED. When you hit a HUMAN step from either spec's Handoff table (Railway env vars, running the migration, filling role holders, Google OAuth, git push), stop and tell me exactly what to do, then continue with everything that does not depend on it.

Start with Phase 1. Confirm you have read both specs and the steering docs, then begin.
