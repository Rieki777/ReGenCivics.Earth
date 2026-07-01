# Claude Code Build Prompt: Complete the Coordination Engine

Date: 2026-07-01
Author: Rye + Claude (Cowork planning)

Scope: everything remaining to complete the session-recording automation and the roles and holders admin. This is the executable version of the "Remaining work" sections A to F in `COORDINATION_ENGINE_WORKFLOW.md` (the canonical current-state doc). Read that and `MOVEMENT_COORDINATION_ENGINE_SPEC_2026-06-23.md` (the vision) before starting.

## Start here (Stage 2)

Stages 0 and 1 are built and committed but unpushed (on top of `dc6eac7`/`b4fd69e`). This revision picks up at Phase 2, which turned out to be mostly wired already (see Phase 2 below).

Build one stage at a time with a checkpoint between stages. Two reasons: the Railway production database is not reachable from your environment (only Rye's push-and-run reaches it), and Rye commits to this repo between turns, so stacking several stages of unpushed migrations would diverge and conflict.

Per-stage rhythm:

1. You build the stage and commit it. Do not push.
2. Rye pushes, runs that stage's migration against Railway, deploys, and verifies live.
3. You resume the next stage on the synced base.

Current checkpoint: Stages 0 and 1 wait on Rye to push, run migration 0150, deploy, and verify. Do not stack Stage 2's migration on top of the unpushed 0-1 commits. Once Rye confirms 0-1 are live, build Stage 2 (the artifact-submission gap in Phase 2), commit, and hand back for the next checkpoint.

Task list: Phase 1 done; Phases 2, 3, 4 remaining; Phase 5 deferred. Run the ship gate before marking any stage done.

## Read first

- `CLAUDE.md`, `.ai/docs/STEERING.md` (note section 11, deterministic-first), `.ai/docs/security/AI-AUTOMATION-RISKS.md`, `CONTEXT_THE_TWO_GAMES.md`.
- Skills that apply: `regen-railway-crons`, `regen-deterministic-first`, `regen-database-sql`, `regen-seasonal-roles`, `regen-ship-gate`, `regen-fixes-handoff`.

## Ground rules

- Writing rules: zero em-dashes, no contrast framing, no AI-tell vocabulary, in all user-facing copy, notifications, emails, and shipped comments.
- Token model: every payout goes through `db.creditPrivateTokens` with source `call_task_bounty`. Never write public balances. Reads use total; writes touch private only.
- Deterministic-first (STEERING 11): everything in this doc except the two existing LLM passes in the pipeline is deterministic. Build it as plain tRPC, SQL, and crons. Do not add new LLM calls.
- AI-automation-risks: the token-bounty approval gate and the consent-before-payout gate stay. No task reaches a person or pays out without them.
- Verify current state before editing. The Cowork sandbox checkout this doc was drafted against was divergent and unreliable, so treat the file and schema references here as a starting map, not gospel. You are in the real repo; confirm the actual schema and files first, and run the ship gate after each phase.

## Phase 1: Close the recording-to-community loop (DONE, stages 0-1)

Reported complete. Intended outcome: a new YouTube upload is ingested, understood, published to the community, and rendered on the Schedule page. Before starting Phase 2, confirm each item actually shipped and is live, and backfill any gap:

- `recordings` has `chaptersJson` and `transcriptJson` columns, migration applied.
- The pipeline stores `chaptersJson` and a timestamped `transcriptJson`.
- A shared finalize module (event-match, subscriber email, forum thread, channel notify) exists and is called by both the Riverside webhook and the pipeline, with double-post guards.
- A new poll-ingested recording sends the subscriber email, creates or replies to the event thread, sets `events.recordingId` and `status='completed'`, and pings the channels.
- The Schedule page renders overview, clickable chapters (deep-linking with `&t={seconds}s`), decisions, action items, and a collapsible transcript.

If all of these hold on production, proceed to Phase 2.

## Phase 2: Task lifecycle (mostly wired, one real gap)

Mapped in Stage 2. The lifecycle is already built on the `bounties` table (`sourceType='call_task'`). Confirmed procedures and states:

- `accept` (maintainer) flips the task to `accepted` and inserts the notification (server around line 348).
- `claimRole` moves it to `in_review`.
- `consentAndPay` pays out via `payRole`, using `creditPrivateTokens` with source `call_task_bounty`.
- `complete` moves it to `completed`.

So the store convergence (`bounties`) and every hop except one are done. The single genuine gap is the artifact-submission step: the claimant submits proof-of-work before consent, and there is no `submitArtifact` procedure or storage today.

### 2.1 Add artifact submission

- Schema migration: an artifact store, reusing the `quest_completions` artifact shape (photo, text, link, video), keyed to the bounty and the claimant.
- Server: a `submitArtifact` procedure that records the artifact and moves the task into the submitted / in-review state, positioned before `consentAndPay`.
- Client: the submission UI on the holder's task view, and show the submitted artifact to the maintainer at consent time.

Keep both gates intact: the maintainer accept gate and the consent-before-payout gate. Nothing else in the lifecycle needs rebuilding. After inserting the artifact step, verify the existing hops (`accept`, `claimRole`, `consentAndPay`, `complete`) still pass end to end, and that the task renders with its overview and bounty on `client/src/pages/PlayerProfile.tsx` and on `client/src/pages/Opportunity.tsx` when open-to-circle.

## Phase 3: Roles in the database, holders admin, invite flow

Goal: Rye manages roles and people directly from admin. Decisions locked: roles move into the database; new members join by invite only.

### 3.1 `roles` table plus seed

Migration plus `drizzle/schema.ts`: a new `roles` table holding every field in the `GameRole` interface in `client/src/data/gameRoles.ts`: title, slug (unique), kind (game or fund), circle, tagline, purpose, powers (json), rights (json), responsibilities (json), domains, band, tokenAward, maxTokenAward, hoursPerWeek, deliverables (json), seed, harvest, seasons (json), assignment, color, emoji, characterImage, sceneImage, cardImagePosition, aliases (json), active, plus timestamps. Write a one-shot seed script in `scripts/` that populates the table from `gameRoles.ts`.

### 3.2 Repoint reads to the table

- The Team page `client/src/pages/Team.tsx` reads roles from a new `roles` tRPC query instead of importing `gameRoles.ts`.
- The pipeline's role catalog (the `roleHolders` and aliases load in `coordinationPipeline.ts`) reads from the `roles` table joined with `roleHolders`.

Keep `gameRoles.ts` in the repo as the seed source of record until the table is confirmed live, then remove the import.

### 3.3 Flywheel change

`server/jobs/coordinationFlywheel.ts`: the roles-reconciliation step stops diffing `gameRoles.ts` against `roleHolders`. Instead it keeps `roleHolders` rows and seasons in sync with the `roles` table (ensure a holder shell row exists per active role, carry the season). Retire the code diff.

### 3.4 Admin role CRUD

Extend `/admin -> Role Holders` and its router: add, edit, and deactivate a role, with the fields from 3.1. Changes go live without a deploy. Character art stays as image files referenced by the `characterImage` and `sceneImage` path columns.

### 3.5 Invite flow for new members

Add an invite path: enter name plus email, create a pending profile, send a magic-link invite via Resend (reuse the existing email magic-link auth). The pending profile is assignable to a role immediately. On invite acceptance, link the account to the pending profile so claims and rewards flow. No name-only placeholders.

### 3.6 Role Holders admin improvements

- Member search by name, email, and handle, with a result card (name, current roles) before assign.
- Person-first view: search a person, see and edit all of that person's roles.
- Multiple holders per role, and one person across multiple roles.
- Coverage summary at the top (filled of total, uncovered circles).
- Alias assist: on assign, auto-suggest the person's first name, nickname, and handle as role aliases.
- Assignment audit log (who assigned or removed, and when).

### 3.7 Update the seasonal-roles skill

`.claude/skills/regen-seasonal-roles/`: it currently generates a `gameRoles` code array. Update it to write new roles into the `roles` table (or emit seed rows for it) so season transitions use the database.

## Phase 4: Robustness

### 4.1 Transcript fallback

Add a Whisper (or equivalent) transcript fallback in the pipeline for videos with no YouTube captions, so every session gets understood. The fallback triggers deterministically in code; the transcription service call is the one external dependency. Store into `transcript` and `transcriptJson`. Needs a transcription API key as a Railway env var (Handoff H6).

## Phase 5: Deferred, do not build unless Rye asks

Enrichments, not the spine. Leave them out of this build: edited cut (dead-air and filler removal), social clips, auto thumbnails, pushing chapters into the YouTube description via the Data API, and a weekly plain-language coordination digest to Rye.

## Sequencing

- Phase 1 is done (stages 0-1). Start at Phase 2.
- Phase 2: confirm the store convergence (2.1, decided: `bounties`), then wire the lifecycle (2.2).
- Phase 3 is the largest. Do 3.1 to 3.3 (table, seed, repoint, flywheel) before 3.4 to 3.6 (admin CRUD, invite, improvements). 3.7 last.
- Phase 4 can slot in any time now.

## Ship gate (mandatory before any VERIFIED or DONE)

Run from repo root:

```
python3 scripts/audit-truncation.py
rg -g '*.css' '<any-new-className>' client/src/
pnpm typecheck
```

No VERIFIED without evidence (file:line, grep result, or output). For load-bearing changes (the Phase 2 reward path, the Phase 3 auth and invite), verify on production via Claude in Chrome per STEERING section 4.

## Handoff Breakdown: Who Does What

Corrected after the Stage 2 mapping. Claude Code confirmed it cannot reach the Railway production database and does not push to the remote, and Rye commits between turns. So the build runs one stage at a time with a checkpoint: Claude Code builds and commits, Rye pushes and runs the migration and deploys and verifies, then Claude Code resumes on the synced base.

### CLAUDE CODE (per stage)

- Build the stage: schema migration file, server procedures, client UI. Run the ship gate.
- Commit with a clear message. Do not push, and do not stack the next stage's migration on unpushed commits.
- After Rye syncs, resume the next stage on the updated base.

Stage status:

- Stage 0 (webhook fix, security reconciliation): committed, waiting on Rye to push and deploy.
- Stage 1 (recording-to-community loop): committed, needs migration 0150 run.
- Stage 2 (task lifecycle): mostly wired; only the artifact-submission gap remains (Phase 2.1).
- Stage 3 (roles in database, holders admin, invite): planned, the largest.
- Stage 4 (Whisper fallback): planned.

### YOU (Rye): the checkpoint, per stage

- Push Claude Code's stage commits.
- Run that stage's migration against Railway MySQL: `npx tsx scripts/run-migration.ts drizzle/<NNNN>_...sql`, plus `npx tsx scripts/seed-roles.ts` for the Stage 3 roles seed. Only your machine reaches the production DB.
- Deploy and verify the feature live.
- Immediate: push, run migration 0150, deploy, and verify Stages 0 and 1, so Claude Code can build Stage 2 on a synced base.
- Later and conditional: add a transcription API key (only if Stage 4 Whisper is built); invite the real members and confirm holders once the Stage 3 invite UI ships. Season Facilitator is already assigned, so nothing is blocked meanwhile.

### Decisions, already made (no waiting)

- Task store: `bounties` (`sourceType='call_task'`). Confirmed in Stage 2: the lifecycle is already wired there.
- Riverside webhook: keep as a secondary ingest path.
- Season Facilitator holder: assigned to Rieki Cordon.
