# Claude Code Build Prompt: Riverside to YouTube to Site Pipeline

Date: 2026-06-23
Author: Rye + Claude (Cowork planning session)
Replaces: the Zapier flow that currently feeds `/api/webhooks/riverside`

This document is the build spec for an automated recording pipeline. It removes Zapier from the trigger path, adds real video handling and YouTube publishing, and feeds everything back into the existing `recordings` table, Schedule page, forum, email, and channel notifications that already exist.

Read `CLAUDE.md`, `.ai/docs/STEERING.md`, and `.ai/docs/security/BUILD-PLAYBOOK.md` before touching code. Run the Ship Gate before any VERIFIED claim.

---

## 1. What already exists (do not rebuild)

The spine is already in the repo. The pipeline extends it.

- `server/webhooks/riverside.ts` receives a recording payload, upserts into `recordings`, matches it to an event thread inside a 4 hour window, posts to the forum or replies to the pre-event thread, sets `events.recordingId` and `events.status = "completed"`, emails subscribers, and calls `notifyRecordingReady` for Telegram and WhatsApp. It already normalizes Zapier-style flat keys and drops Zapier test pings.
- `server/routes/recordings.ts` is the admin tRPC router: `list`, `byEventId`, `adminList`, `get`, `update`, `sendEmail`, `delete`.
- `server/lib/videoSummary.ts` fetches a YouTube transcript and writes a Rye-voice summary reply via `invokeLLM`.
- `drizzle/schema.ts` defines `recordings` (line 2224) and `events` (line 2266).
- `client/src/pages/Schedule.tsx` and `client/src/components/admin/AdminRecordingsTab.tsx` render the history.
- Weekly job pattern: `server/jobs/digestJob.ts` shows the idempotency-guard and LLM usage style to mirror.

The point of this build: become the thing that produces the YouTube URL, transcript, chapters, and summary, then hand them to the existing webhook handler (or call the same DB writes directly) so nothing downstream changes.

---

## 2. The hard constraint that shapes the design

Riverside has no native webhooks. Its Business API supports polling only (list recordings, download exported edits), at 1 request per second, on Business plan accounts. The AI cleanup (Magic Audio, filler and silence removal) lives inside Riverside's editor as one-click actions, not as a headless API job.

Two consequences:

1. The trigger is a poller we run, not a Riverside push. This is what replaces Zapier.
2. The cleanup is owned per Rye's choice as "Both": use Riverside's clean export when it exists, fall back to our own ffmpeg trim when it does not. The poller must detect which case it is in.

Tier handling: Rye is unsure whether the account has Business API access. Build the poller behind an interface with two adapters so the trigger source is swappable without touching the pipeline:

- `RiversideApiSource` (Business plan): calls the Riverside Business API directly.
- `WebhookInboxSource` (any plan): keeps a minimal inbound endpoint that a free Make.com scenario or a manual "export ready" POST can hit. This is the fallback that still removes the Zapier dependency.

Both adapters emit the same `DiscoveredRecording` shape into the pipeline.

---

## 3. Architecture

```
[Rye records on Riverside]
        |
        v
[Rye clicks Magic Audio + filler/silence removal, exports]   <- only manual step
        |
        v
TRIGGER (replaces Zapier)
  RiversideApiSource (poll, Business plan)  OR  WebhookInboxSource (Make free / manual POST)
        |
        v
PIPELINE (idempotent state machine, keyed on riversideId)
  1. discover      -> upsert recordings row, set pipelineState
  2. fetch         -> download exported video + transcript + SRT to R2 (or temp)
  3. clean         -> if no Riverside clean export, run ffmpeg/auto-editor trim
  4. chapters      -> build timestamped chapters + tags + Rye-voice description (invokeLLM)
  5. notes         -> extract Decisions made + Action items (invokeLLM)
  6. thumbnail     -> generate channel-consistent thumbnail (nano-banana style)
  7. upload        -> YouTube Data API v3 resumable upload, public, chapters in description
  8. clips         -> pick 2-3 moments, cut vertical clips with ffmpeg, store for social
  9. publishToSite -> write youtubeUrl + transcript + chapters + notes to recordings,
                      then run the existing event-match / forum / email / notify path
        |
        v
[Schedule page, forum thread, subscriber email, Telegram + WhatsApp]
```

Each numbered stage records its own success so a failed run resumes at the failed stage rather than restarting. Auto-publish to public is the chosen behavior; the safety net is idempotency plus a one-row admin status panel with a "retry this stage" control, not a human approval gate.

---

## 4. Where heavy work runs (important)

ffmpeg trimming, clip cutting, and large file downloads must not run inside the Express web process. Add a separate worker entrypoint (`server/worker/pipelineWorker.ts`) deployed as its own Railway service (or a Railway cron service) sharing the same repo and `DATABASE_URL`. The web process only exposes the inbound endpoint and the admin tRPC controls. The worker does the downloading, ffmpeg, LLM calls, and YouTube upload.

Intermediate media (downloaded source, trimmed output, clips, thumbnail) goes to Cloudflare R2 (`assets.regencivics.earth`), not the container filesystem, so a redeploy mid-job does not lose state. Clean up R2 temp objects after `publishToSite` succeeds.

---

## 5. Database changes

New migration: `drizzle/0XXX_recording_pipeline.sql` (pick the next number). Add columns to `recordings`. Do not alter existing columns.

```sql
ALTER TABLE recordings
  ADD COLUMN pipelineState JSON NULL,            -- per-stage status, see shape below
  ADD COLUMN sourceVideoUrl VARCHAR(512) NULL,   -- R2 key/url of the fetched export
  ADD COLUMN cleanedVideoUrl VARCHAR(512) NULL,  -- R2 key/url after our trim (null if Riverside already clean)
  ADD COLUMN srtUrl VARCHAR(512) NULL,           -- R2 key/url of the SRT
  ADD COLUMN transcriptJson JSON NULL,           -- timestamped segments [{ start, end, text }]
  ADD COLUMN chaptersJson JSON NULL,             -- [{ tSeconds, title }]
  ADD COLUMN decisionsJson JSON NULL,            -- [string] decisions made
  ADD COLUMN actionItemsJson JSON NULL,          -- [{ owner, item }]
  ADD COLUMN clipsJson JSON NULL,                -- [{ r2Url, startSeconds, endSeconds, caption }]
  ADD COLUMN youtubeVideoId VARCHAR(32) NULL,    -- raw video id, for idempotent upload guard
  ADD COLUMN publishVisibility VARCHAR(16) NULL, -- "public" (chosen default)
  ADD COLUMN lastError TEXT NULL,
  ADD COLUMN attemptCount INT NOT NULL DEFAULT 0;
```

`pipelineState` shape (one object, append-only per stage):

```json
{
  "discover":      { "status": "done", "at": "ISO" },
  "fetch":         { "status": "done", "at": "ISO" },
  "clean":         { "status": "skipped", "reason": "riverside_export_clean" },
  "chapters":      { "status": "done", "at": "ISO" },
  "notes":         { "status": "done", "at": "ISO" },
  "thumbnail":     { "status": "done", "at": "ISO" },
  "upload":        { "status": "done", "at": "ISO", "videoId": "abc123" },
  "clips":         { "status": "done", "at": "ISO" },
  "publishToSite": { "status": "done", "at": "ISO" }
}
```

Stage status vocabulary: `pending`, `running`, `done`, `skipped`, `failed`. Update `schema.ts` to match, run via `npx tsx scripts/run-migration.ts drizzle/0XXX_recording_pipeline.sql` (HUMAN step, needs Railway DB).

---

## 6. New modules and responsibilities

All new server code under `server/lib/recording-pipeline/`.

| File | Responsibility |
|------|----------------|
| `index.ts` | `runPipeline(riversideId)` orchestrator. Loads state, runs each stage in order, skips done stages, writes `pipelineState`, catches per-stage errors into `lastError` + `attemptCount`. Mirror the duplicate-guard discipline in `digestJob.ts`. |
| `sources/types.ts` | `DiscoveredRecording` type and `RecordingSource` interface (`listNew(): Promise<DiscoveredRecording[]>`). |
| `sources/riversideApi.ts` | Business API adapter. Polls recordings, respects 1 req/sec, returns exports with a `isCleanExport` flag based on which Riverside export preset produced them. |
| `sources/webhookInbox.ts` | Reads from a small `pipeline_inbox` queue table that the inbound endpoint writes to. Lets the free Make.com scenario or a manual POST feed the pipeline. |
| `stages/fetch.ts` | Download export + transcript + SRT to R2. Parse SRT into `transcriptJson`. |
| `stages/clean.ts` | If `isCleanExport` is false, run `auto-editor` (preferred) or ffmpeg `silenceremove` to trim dead air. Write `cleanedVideoUrl`. Otherwise mark `skipped`. |
| `stages/chapters.ts` | From `transcriptJson`, call `invokeLLM` to produce `chaptersJson`, a Rye-voice description, and tags. Format chapters for YouTube as lines `0:00 Intro`, `3:12 Topic`. First chapter must be `0:00`. |
| `stages/notes.ts` | `invokeLLM` to extract `decisionsJson` and `actionItemsJson`. For governance-relevant sessions this is the structured record. |
| `stages/thumbnail.ts` | Generate a channel-consistent thumbnail (title + date) using the `nano-banana-pro` / `regen-character-art` style. Store in R2, set `recordings.thumbnailUrl`. |
| `stages/upload.ts` | YouTube Data API v3 resumable upload. Guard: if `youtubeVideoId` already set, skip. Set title, description (with chapters), tags, `privacyStatus: "public"`, category, and thumbnail via `thumbnails.set`. |
| `stages/clips.ts` | `invokeLLM` selects 2-3 high-signal spans from `transcriptJson`; ffmpeg cuts vertical (1080x1920) clips; store in R2 as `clipsJson`. Hand captions to the `regen-content-repurposing` skill output format. |
| `stages/publishToSite.ts` | Write `youtubeUrl`, `transcript`, `transcriptJson`, `chaptersJson`, `aiSummary`, notes onto the `recordings` row, then invoke the existing event-match + forum + email + notify path. Reuse the functions in `server/webhooks/riverside.ts`; refactor those into a shared `server/lib/recording-pipeline/finalize.ts` so both the webhook and the pipeline call one code path. |
| `youtube/client.ts` | OAuth2 client from a stored refresh token (`googleapis`). Token refresh handled here. |

Worker entry: `server/worker/pipelineWorker.ts` runs `listNew()` on an interval (default 5 min), enqueues new ids, and runs `runPipeline` for each with a concurrency of 1 to respect the YouTube quota and Riverside rate limit.

---

## 7. YouTube upload detail

Use `googleapis`. Auth is OAuth2 with a long-lived refresh token (Rye generates once, stored as a Railway env var). An upload costs roughly 1600 quota units against a default 10000/day, which is about six uploads per day. That is plenty for the session cadence; do not batch-upload backlog without raising quota.

Description template (chapters render automatically when the first line is `0:00`):

```
{one-paragraph Rye-voice overview}

Chapters
0:00 {title}
{t} {title}
...

Transcript and discussion: https://regencivics.earth/community/post/{forumPostId}
More sessions: https://regencivics.earth/schedule
```

Idempotency: before uploading, re-check `youtubeVideoId` and `pipelineState.upload`. Never upload twice for one `riversideId`.

---

## 8. The 10 improvements, mapped to stages

1. Real chapter markers: `stages/chapters.ts` + description template + Schedule page render.
2. Review gate: not chosen. Rye selected fully auto-publish. Keep `publishVisibility` so a gate can be switched on later by setting it to `unlisted` and adding an admin approve button. Leave the column and a TODO comment, build nothing else.
3. Timestamped transcript on the Schedule page: store `transcriptJson`, render a collapsible, searchable block that deep-links into the YouTube player at `&t={seconds}s`.
4. Idempotent and resumable: the `pipelineState` machine in `index.ts`.
5. Social clips: `stages/clips.ts`.
6. Own silence trim as safety net: `stages/clean.ts` fallback.
7. Auto thumbnail: `stages/thumbnail.ts`.
8. Deterministic event match: add an optional `eventId` to `DiscoveredRecording`. When Rye creates the Riverside room from an event, pass the event id through (room name convention `event-{id}-...` or a mapping row), so `finalize.ts` matches on id first and falls back to the existing 4 hour window only when absent.
9. Observability: extend `AdminRecordingsTab.tsx` with a per-recording stage strip (nine dots, color by status), `lastError`, and a "retry stage" mutation on `recordingsRouter`.
10. Decisions and action items: `stages/notes.ts`, rendered on the Schedule page and posted into the forum thread as a structured block beneath the summary.

---

## 9. Front-end changes

- `client/src/pages/Schedule.tsx`: for completed events, render chapters (clickable, deep-linking into YouTube), a collapsible timestamped transcript, and a "Decisions and action items" block when present.
- `client/src/components/admin/AdminRecordingsTab.tsx`: stage status strip, `lastError` display, "retry stage" and "re-run pipeline" buttons.
- New tRPC procedures on `recordingsRouter`: `retryStage({ id, stage })`, `rerun({ id })`, and a richer `get` that returns the new JSON columns. Keep them `adminProcedure`.

---

## 10. Environment variables (Railway)

| Var | Purpose | Who sets |
|-----|---------|----------|
| `RIVERSIDE_API_KEY` | Business API auth (only if Business plan) | Rye |
| `RIVERSIDE_PROJECT_ID` | Which Riverside project to poll | Rye |
| `YOUTUBE_CLIENT_ID` | OAuth2 client | Rye |
| `YOUTUBE_CLIENT_SECRET` | OAuth2 client | Rye |
| `YOUTUBE_REFRESH_TOKEN` | Long-lived upload auth | Rye (one-time consent flow) |
| `YOUTUBE_CHANNEL_ID` | Target channel | Rye |
| `R2_PIPELINE_BUCKET` | Temp media bucket (reuse existing R2 creds) | Rye |
| `PIPELINE_POLL_INTERVAL_MS` | Worker interval, default 300000 | optional |
| `PIPELINE_INBOX_SECRET` | Auth for the manual/Make inbound POST | Rye |

`server/_core/env.ts` should validate these are present when the worker boots, with clear startup errors, following the existing env pattern. The worker should refuse to start the `RiversideApiSource` if `RIVERSIDE_API_KEY` is missing and fall back to `WebhookInboxSource`.

---

## 11. Build order (still phased even though scope is "everything")

Phase 1, prove the spine end to end: migration, `index.ts` state machine, `webhookInbox` source, `fetch`, `chapters`, `upload`, `finalize` refactor, `publishToSite`. Outcome: a manual POST of a recording id results in a public YouTube video with chapters and a populated Schedule page entry.

Phase 2, automate the trigger and harden: `riversideApi` source, the worker service, idempotency retries, `AdminRecordingsTab` observability, deterministic event match.

Phase 3, the cleanup and enrichment stages: `clean` fallback, `notes`, `thumbnail`, `clips`, Schedule page transcript and decisions rendering.

Ship Phase 1 behind the worker before layering 2 and 3. Do not mark anything VERIFIED without the Ship Gate.

---

## 12. Ship Gate (mandatory before any VERIFIED or DONE)

```bash
python3 scripts/audit-truncation.py
rg -g '*.css' '<any-new-className>' client/src/
pnpm typecheck
```

Every row in the Handoff table below that claims VERIFIED needs evidence (file:line, grep result, or script output). No evidence means the status stays CODED.

---

## Handoff Breakdown: Who Does What

### YOU (Rye): things only you can do

| # | Task | Why only you | Command / Where |
|---|------|-------------|-----------------|
| H1 | Confirm Riverside plan tier and whether Business API access exists | Account login required | Riverside dashboard, Settings, Plan |
| H2 | Generate Riverside API key + project id (if Business) | Account login | Riverside dashboard, Integrations |
| H3 | Create a Google Cloud project, enable YouTube Data API v3, create OAuth2 client | Google account + console | console.cloud.google.com |
| H4 | Run the one-time OAuth consent flow to mint `YOUTUBE_REFRESH_TOKEN` | Browser consent, your YouTube channel | script `scripts/youtube-auth.ts` (Claude Code writes it, you run it) |
| H5 | Set all Railway env vars from section 10 | Railway dashboard login | Railway, Variables |
| H6 | Run the pipeline migration | Railway DB only reachable from your machine | `npx tsx scripts/run-migration.ts drizzle/0XXX_recording_pipeline.sql` |
| H7 | Add the worker as a Railway service (start command `tsx server/worker/pipelineWorker.ts`) | Railway dashboard | Railway, New Service from repo |
| H8 | After recording, click Magic Audio + filler/silence removal and export in Riverside | In-app action, not API | Riverside editor |
| H9 | `git add -A && git commit && git push` to deploy | Claude Code may hold index.lock | local terminal |
| H10 | Approve the Railway deploy | Railway dashboard | Railway |

### CLAUDE CODE: already done or can be done without you

| # | Task | Status |
|---|------|--------|
| C1 | This build doc | DONE |
| C2 | Migration SQL + `schema.ts` columns | CODED (after build) |
| C3 | `server/lib/recording-pipeline/` orchestrator + stages | CODED (after build) |
| C4 | `sources/riversideApi.ts` and `sources/webhookInbox.ts` adapters | CODED (after build) |
| C5 | `youtube/client.ts` + `stages/upload.ts` | CODED (after build) |
| C6 | `scripts/youtube-auth.ts` consent helper for H4 | CODED (after build) |
| C7 | Refactor `riverside.ts` finalize path into shared `finalize.ts` | CODED (after build) |
| C8 | `recordingsRouter` new procedures (`retryStage`, `rerun`, richer `get`) | CODED (after build) |
| C9 | `AdminRecordingsTab.tsx` observability strip | CODED (after build) |
| C10 | `Schedule.tsx` chapters, transcript, decisions rendering | CODED (after build) |
| C11 | `pipelineWorker.ts` worker entry | CODED (after build) |

### WAITING ON YOU before Claude Code can proceed

- H1 gates which trigger source is primary. Until confirmed, Claude Code builds both adapters and defaults the worker to `WebhookInboxSource`.
- H3 and H4 gate any real YouTube upload test. Claude Code can build and typecheck the upload stage without them, but cannot verify a live upload until the refresh token exists.
- H6 gates any live pipeline run, since the new columns must exist first.
```
