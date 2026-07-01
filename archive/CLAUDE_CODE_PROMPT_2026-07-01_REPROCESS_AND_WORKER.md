# Claude Code Prompt: reprocess mutation + commit the transcription worker + test-data cleanup

Paste the section below into Claude Code. It runs against the real repo (`origin/main`), which is ahead of the Cowork checkout. Verify current state before editing; treat file/line references as a map, not gospel.

---

You are working in the ReGenCivics.Earth repo on `origin/main`. Three tasks. Build, run the ship gate, commit, push. Do not touch Railway (env vars and deploys are Rye's). Follow the writing rules (zero em-dashes, no contrast framing, no AI-tell words) in every comment and string.

Background: the coordination pipeline ingests YouTube recordings but skips any already-ingested video, and YouTube captions come back empty for these videos, so all 15 production recordings have null overviews. Two gaps: no way to force-synthesize an existing recording, and no transcription fallback deployed. The worker is already built at `transcription-worker/`. The full context and the reprocess code are in `FIXES_TO_MAKE_2026-07-01_reprocess-and-whisper.md`.

## Task 1: reprocess path for an existing recording

Goal: an admin can force one already-ingested recording through the understand + publish path (transcript, synthesize, extract-tasks, finalize), reusing the exact shipped functions so nothing drifts.

1. In `server/jobs/coordinationPipeline.ts`:
   - Factor the main loop's holder-loading query (the roles + roleHolders load that builds the `holders` array and `holderByRole` map) into a small exported `loadHolders(db)` helper. Call it from both the loop and the new function below so they cannot diverge. Do not duplicate the query.
   - Add an exported `reprocessRecording(recordingId: number)` that mirrors the loop body for a single existing recording: load the row, `loadHolders`, fetch transcript via `fetchYouTubeTranscript` then `fetchYouTubeTranscriptSegments`, fall back to `transcribeFallback` when there are no captions, write `transcript` + `transcriptJson`, run `runSynthesizePass` and write `overview` / `decisionsJson` / `actionItemsJson` / `chaptersJson` / `aiSummary`, run `runExtractTasksPass` and insert the proposed `call_task` bounties + `bountyRoles` exactly as the loop does, then call `finalizeRecording(recordingId)`. Return `{ ok, transcript, synthesized, tasksProposed, reason? }`. The reference implementation is in `FIXES_TO_MAKE_2026-07-01_reprocess-and-whisper.md` (Fix 2a); align field names to the actual loop.
   - The daily LLM cap + transcript sanitize already live inside `runSynthesizePass` / `runExtractTasksPass`, so calling those inherits both guards. Add no new LLM calls.

2. In `server/routes/recordings.ts`, add an admin mutation:

   ```ts
   reprocess: adminProcedure
     .input(z.object({ id: z.number().int().positive() }))
     .mutation(async ({ input }) => {
       const { reprocessRecording } = await import("../jobs/coordinationPipeline");
       return reprocessRecording(input.id);
     }),
   ```

3. Ship gate, must pass:
   ```
   python3 scripts/audit-truncation.py
   pnpm typecheck
   ```
   No new className or keyframes here, so the CSS grep gate does not apply. Provide evidence (typecheck exit 0, the two changed files).

## Task 2: commit the transcription worker

The worker is already written at `transcription-worker/` (FastAPI + yt-dlp + faster-whisper, matching the `transcribeFallback` contract; default local backend, optional Groq/OpenAI). Commit the folder so Railway can deploy from it. Do not deploy it and do not set any env vars. Confirm the four files are present and unmodified: `main.py`, `Dockerfile`, `requirements.txt`, `README.md`, plus `.env.example`.

## Task 3: test-data cleanup script

The 2026-07-01 Cowork verification left throwaway rows in production. Write `scripts/cleanup-test-data-2026-07-01.ts` (mysql2 via `DATABASE_URL`, same pattern as the other one-shot scripts) that deletes, in FK-safe order:
- `bounty_artifacts`, `bounty_events`, `bounty_roles`, then `bounties` for `bounties.id = 1` (the "TEST — coordination engine payout check" bounty; already completed + reversed).
- `role_assignment_log` rows for `roleSlug = 'tool-curator'` created 2026-07-01 (the invited/assigned/removed test entries).
- `pending_members` row `id = 1` (`rieki.cordon+invitetest@gmail.com`).
- `users` row `id = 5091510` (`rieki.cordon+invitetest@gmail.com`) and any `user_token_ledger` rows for it.
Make it idempotent and print what it deleted. Do not run it; Rye runs it against prod. Guard it so it only touches those exact ids.

## Commit + push

One commit per task or a single tidy commit, clear messages explaining the why. Push to `origin/main`. Then update `SHIPPED_LOG.md` with a one-paragraph entry and move `FIXES_TO_MAKE_2026-07-01_reprocess-and-whisper.md` to `archive/` per the repo convention.

## Handoff Breakdown — Who Does What

### YOU (Rye) — after Claude Code pushes

| # | Task | Command / Where |
|---|------|-----------------|
| 1 | Deploy `transcription-worker/` as a new Railway service | Railway, deploy from the `transcription-worker/` subdirectory (Dockerfile) |
| 2 | Set `WORKER_API_KEY` on the worker | Railway env; generate with `openssl rand -hex 32` |
| 3 | Set `TRANSCRIPTION_WORKER_URL` + `TRANSCRIPTION_API_KEY` on `ReGenCivics.Earth` (`TRANSCRIPTION_API_KEY` == worker `WORKER_API_KEY`), redeploy | Railway env |
| 4 | Run the cleanup script | `npx tsx scripts/cleanup-test-data-2026-07-01.ts` |
| 5 | Trigger reprocess for recording 9 and verify | Admin browser console, or ask Cowork to drive it: `recordings.reprocess({ id: 9 })`, then check the Schedule page expands with overview + chapters + transcript, the community email/forum fired once, and proposals appear in `/admin -> Call Tasks` |

### CLAUDE CODE — this session

| # | Task | Status target |
|---|------|--------------|
| 1 | `reprocessRecording` + `recordings.reprocess` mutation | VERIFIED (ship gate green) |
| 2 | Commit the `transcription-worker/` folder | DONE |
| 3 | `scripts/cleanup-test-data-2026-07-01.ts` | SCRIPTS READY (Rye runs) |

### Reference ids for the cleanup

- Test bounty: `bounties.id = 1` (completed, doer role reversed).
- Test invite: `pending_members.id = 1`, `users.id = 5091510`, email `rieki.cordon+invitetest@gmail.com`.
- Tool Curator holder (id 10) is already reset to open; no action needed there.
