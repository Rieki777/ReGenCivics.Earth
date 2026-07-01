# Coordination Engine Workflow (canonical)

This is the canonical, current-state description of how ReGen Civics turns a recorded session into coordinated, rewarded work across the movement. Future sessions: read this before touching recordings, the Schedule page, roles, holders, the transcription worker, or the coordination crons. It supersedes the older Riverside-webhook recording plan.

As of 2026-07-01 the full loop is built, deployed, and verified live on production. Migrations `0150`, `0151`, `0152` are applied. A recorded session is ingested from YouTube, transcribed (captions when present, the self-hosted Whisper worker when not), understood, published once to the community, rendered on the Schedule page, and turned into role-tagged tasks that run all the way to a consented payout. The end-to-end run was confirmed on recording 9 (`h2K_f-E4hJM`), a caption-less video that the worker transcribed into 217 timestamped segments, then synthesized into an overview, ten chapters, decisions, and action items, and published to the forum. What remains is a short list of human and maintenance items near the end.

Companion docs: `MOVEMENT_COORDINATION_ENGINE_SPEC_2026-06-23.md` is the fuller vision and data model. `transcription-worker/README.md` documents the worker service.

## Trigger

The video is already on YouTube. We do not record to Riverside and upload a cut. The session is posted to the `@SEEDSRegenerativeEconomies` channel, and the pipeline watches that channel.

- Automatic: the `cron-coordination-pipeline` Railway cron runs every 10 minutes and POSTs to `/api/cron/coordination-pipeline` with `Authorization: Bearer $CRON_SECRET`. See `regen-railway-crons`.
- Manual: `/admin -> Tasks -> Run pipeline now`.

Both call `runCoordinationPipeline` in `server/jobs/coordinationPipeline.ts`.

## What one pipeline pass does

1. Poll the public channel uploads RSS: `https://www.youtube.com/feeds/videos.xml?channel_id={YOUTUBE_CHANNEL_ID}`. No API key, no quota. Returns the latest ~15 uploads. Default channel id `UCzuomEZ3aNbr2LEreGlvWGQ`.
2. Diff against `recordings.youtubeVideoId`. Anything already ingested is skipped, so the pass is idempotent. To re-run an already-ingested recording on purpose, use the reprocess path (below), not the poll.
3. Guard rails: skip titles matching `COORDINATION_TITLE_SKIP_REGEX` (default `^(short:|shorts:|test:|debug:)`), and skip videos shorter than `COORDINATION_MIN_DURATION_SECONDS` (default 120) when the duration is known. Duration is read best-effort from the watch page; unknown does not block. Up to 5 new videos per pass.
4. Upsert a `recordings` row at `recordingKind='raw'` with the YouTube url, video id, published date, and thumbnail. `riversideId` is synthesized as `yt:{videoId}` since no Riverside webhook produced it. The Schedule page can show the raw cut right away.
5. Transcript. First the public timedtext endpoint: `fetchYouTubeTranscript` (flat text) and `fetchYouTubeTranscriptSegments` (timestamped `{ start, text }`) in `server/lib/videoSummary.ts`. That endpoint is now unreliable: YouTube returns empty for most videos even when captions exist on the site, so in practice the caption path usually yields nothing and the Whisper worker does the work. When captions are empty, `transcribeFallback(videoId)` posts to the transcription worker and returns `{ text, segments }`. The pipeline writes `recordings.transcript` and `recordings.transcriptJson`. If neither source yields a transcript, the video is ingested but not understood on this pass.
6. Two LLM passes on the transcript, the only place tokens are spent:
   - synthesize: writes `recordings.overview`, `decisionsJson`, `actionItemsJson`, mirrors overview into `aiSummary`, and produces chapters. Chapters are persisted to `recordings.chaptersJson` as `{ tSeconds, title }`.
   - extractTasks: role-tagged task proposals. Every proposal must carry an exact transcript quote and an approximate timestamp; proposals without a quote are dropped. Each becomes a `bounties` row (`sourceType='call_task'`, `workStatus='proposed'`, `tokenType='regen'`) plus a `bountyRoles` doer row assigned to the matched role holder, or left unfilled when the role is open. A history or vision talk with no assignable work correctly yields zero proposals.
7. Finalize. The pass calls `finalizeRecording(rec.id)` to publish the recording to the community. This is the same code path the Riverside webhook uses, so a recording is published exactly once (see below).

Safety, per `.ai/docs/security/AI-AUTOMATION-RISKS.md`: transcripts are sanitized (control and injection characters stripped, capped at 60k chars) before any LLM call; a site-wide daily LLM cap (`COORDINATION_DAILY_LLM_LIMIT`, default 40) plus per-video idempotency bound the cost; every generated row carries bot provenance (`createdByAgent='coordination-engine'`).

## The transcription worker

`transcription-worker/` is a self-hosted service (FastAPI + yt-dlp + faster-whisper) deployed as its own Railway service in the ReGen Civics project. It exists because YouTube's caption endpoint returns empty for most of our videos, so the worker is effectively the main transcript source, not a rare fallback. Its default backend is open-source faster-whisper running on the container CPU, with a one-variable swap to Groq or OpenAI if speed is ever wanted. Full deploy notes: `transcription-worker/README.md`.

Contract, matched by `transcribeFallback` in `server/lib/videoSummary.ts`:

```
POST /
Authorization: Bearer <TRANSCRIPTION_API_KEY>
{ "videoId": "...", "youtubeUrl": "https://www.youtube.com/watch?v=..." }
-> 200 { "text": "...", "segments": [{ "start": <int seconds>, "text": "..." }] }
```

`GET /` is an unauthenticated health check. The main app reaches it at `TRANSCRIPTION_WORKER_URL` with `TRANSCRIPTION_API_KEY` (which must equal the worker's `WORKER_API_KEY`). Both are set in production.

Known constraint: YouTube blocks datacenter IPs, so `yt-dlp` can be refused from Railway. The worker mitigates this by running the latest `yt-dlp` and trying several player clients (`default,android,ios,web_safari,tv`, tunable via `YTDLP_PLAYER_CLIENTS`), and it surfaces yt-dlp's real error on failure. If YouTube hard-blocks the IP anyway, the reliable fix is cookies: export a `cookies.txt` from a logged-in browser and set `YTDLP_COOKIES_FILE` on the worker. Cookies work but expire every few weeks, so it is periodic maintenance. Videos that do carry accessible captions need none of this.

## Force-synthesize an existing recording

The poll hard-skips any already-ingested video, and the RSS feed only carries the latest ~15 uploads, so neither the cron nor a re-poll can re-run an old recording. `reprocessRecording(recordingId)` in `coordinationPipeline.ts` runs the same transcript, synthesize, extract-tasks, and finalize path against one existing row, and the admin mutation `recordings.reprocess({ id })` triggers it. Use it to backfill understanding on a recording that was ingested before the worker existed, or to re-run after a prompt change. It is idempotent: finalize guards on `emailSent` and `forumPostId`, and the synthesize columns overwrite in place. Note that a full run transcribes the audio, so it can take a few minutes and the HTTP response may return a gateway page while the server finishes; check the recording's fields to confirm completion.

## Publish once: the shared finalize module

`server/lib/recording-finalize.ts` holds `finalizeRecording(recordingId)` and `sendRecordingEmail`. It is the single publish path, called by the YouTube-poll pipeline, the reprocess path, and the Riverside webhook. One pass does:

- Event match: find a pre-existing Schedule event and forum thread inside the time window. On a match it sets `events.recordingId` and `events.status='completed'` and reuses the event's `forumThreadId`. With no match it creates a recording forum post.
- Forum thread: create or reuse, then store the id on `recordings.forumPostId`.
- Subscriber email: `sendRecordingEmail` to the subscriber list.
- Channel notify: Telegram and WhatsApp.

Idempotency: the recording's own `forumPostId` guards the forum and event step, and `emailSent` guards the email step, so `finalizeRecording` is safe to call repeatedly on the same recording and never double-posts across the ingest paths.

## The Schedule page

`recordings.getPublic` serves the understood recording. Each recording on `client/src/pages/Schedule.tsx` expands to its overview, clickable chapters that deep-link into the YouTube player (`&t={seconds}s`), the decisions, the action items, and a collapsible transcript.

## The task lifecycle and the reward

There is no `callTasks` table. The whole lifecycle runs on `bounties` and `bountyRoles` with `sourceType='call_task'`. The hops:

1. proposed: the pipeline writes the proposal. It sits in `/admin -> Tasks` for Rye to approve, edit, reassign, or decline.
2. accepted: the maintainer accept gate. Approval fires the in-app notification and opens the task on the holder's profile, or on the Opportunity board when the role is open.
3. claimed: the holder claims the role (`in_review` on the role row).
4. artifact submitted: the doer submits proof-of-work through `bounties.submitArtifact`, which writes a row to the `bounty_artifacts` table (link or text, reusing the `quest_completions` artifact shape), moves the task to `workStatus='in_review'`, and notifies the maintainer who accepted it. `adminQueue` gained a `review` filter, and the "Awaiting Review" admin tab shows the submitted artifact.
5. consent and pay: the consent-before-payout gate. Approve and pay runs `complete` then `payRole`, which credits the reward through `creditPrivateTokens` with source `call_task_bounty`. For a call task the doer is the only paid role, so the separation-of-duties hold does not trigger; a payout can be reversed during the settlement window via `bounties.reverse`.
6. completed.

Both gates stay intact: the maintainer accept gate and the consent-before-payout gate. No task reaches a person or pays out without them. The pipeline itself never writes token balances; it only proposes work. See the token model in `CLAUDE.md`.

## The daily flywheel

The `cron-coordination-flywheel` Railway cron runs daily at 09:00 UTC and POSTs to `/api/cron/coordination-flywheel`, calling `runCoordinationFlywheel` in `server/jobs/coordinationFlywheel.ts`. Two agents:

- roles reconcile: keep the `roleHolders` table in sync with the role catalog. The source of truth is the `roles` table (seeded from `gameRoles.ts`). The old on-disk `gameRoles.ts` parser is retired to a fallback that runs only when the `roles` table is empty, so a fresh database still reconciles. Insert a holder shell row per active role, refresh drifted titles and aliases, leave the rest unchanged.
- stale-claim sweep: nudge claims that have gone quiet and expire ones past the window, using date math against the configured thresholds.

Report shape: `{ staleClaims: { nudged, expired, scanned }, rolesReconcile: { inserted, updated, unchanged, total } }`.

## Roles in the database, holders admin, invite flow

Roles live in the database. The `roles` table is the source of truth for the role list and its fields (title, unique slug, kind, circle, aliases, active, plus the display and compensation fields). `client/src/data/gameRoles.ts` is now a one-time seed applied by `scripts/seed-roles.ts`; the slug matches `roleHolders.roleSlug`. The Team page (`client/src/pages/Team.tsx`) reads `trpc.roles.list` and falls back to `gameRoles.ts`. The pipeline's role catalog and the flywheel read the table. Admin role CRUD is `roles.create`, `roles.update`, and `roles.setActive`, so role changes go live without a deploy. Character art stays as image files referenced by the `characterImage` and `sceneImage` path columns. The `regen-seasonal-roles` skill writes to the `roles` table.

New members come in through invite only. The `pending_members` table plus `roleHolders.invite` sends a magic-link email and creates a pending profile that is assignable to a role immediately, referenced by `pendingMemberId` on `roleHolders`. On email login the pending profile auto-links to the real user through `linkPendingMembersByEmail` in the OAuth verify path; OAuth login uses the `claimInvites` fallback mutation. No name-only placeholders. The full round-trip (invite, magic-link login, auto-link of the pending member to the new account, role holder ownership) is verified live.

The `/admin -> Role Holders` tab carries a coverage banner (filled of total, uncovered circles), the invite form, the invited-members list, add-role, member search, and an assignment audit log backed by the `role_assignment_log` table (who assigned or removed a holder, and when).

Everything on this surface is deterministic admin work (plain tRPC mutations, no tokens). Per `regen-deterministic-first`, keep it that way; the only LLM touch is alias matching, which happens in the pipeline.

## The Riverside webhook, secondary

`server/webhooks/riverside.ts` (POST `/api/webhooks/riverside`) is a secondary ingest path, kept for now. If Riverside or a Make/Zapier scenario posts a recording, it upserts into `recordings` and calls the same `finalizeRecording` and `sendRecordingEmail` module the pipeline uses, so a recording is never published twice regardless of which path ingested it. The webhook secret is optional; when `RIVERSIDE_WEBHOOK_SECRET` is unset, signature verification is skipped (dev only). The YouTube poll is the primary trigger. Keep the webhook if a non-YouTube source ever needs to push a recording, otherwise it can be retired.

## Webhook signature fix (Stage 0)

The GitHub webhook timeout was a double body-parse crash, not a secrets problem. The global `express.json({ verify })` in `server/_core/index.ts` captures the raw request string as `req.rawBody`. `github.ts` and `riverside.ts` had each mounted their own route-level `express.raw()` on top, which left `req.body` as a parsed object, so `createHmac().update(object)` threw and hung the request. Fixed: both handlers read `req.rawBody` and verify the HMAC over those exact bytes, and the route-level parser is dropped (matching the `resend`, `loomio`, and `hypha` handlers). Verified live: the GitHub webhook's recent deliveries report 200. Root cause is recorded in `.ai/docs/security/OWASP-TOP10.md`, `CHECKLIST.md`, and `OPS-PLAYBOOK.md`.

## Writing rules on LLM output

The synthesize and extract-tasks passes run under a `VOICE_RULES` system prompt (Rye's voice, no em-dashes, no contrast framing, no AI-tell vocabulary). Prompts alone do not hold, so a deterministic backstop `scrubVoice()` in `coordinationPipeline.ts` runs over every generated string (overview, chapter titles, decisions, action items, and each task's title, summary, and sociocratic-overview fields) and replaces the dash family with commas. The same scrub is applied to the forum video-summary output in `videoSummary.ts`. This guarantees the one mechanically checkable rule regardless of what the model returns; the prompt still carries the judgment-call rules.

## Verified live (2026-07-01)

All of these were confirmed on production this session:

1. GitHub webhook redelivers with a 200 (the double-parse fix holds).
2. A recording is understood and published: recording 9 was force-synthesized through the worker, gained an overview, ten chapters, four decisions, five action items, and a forum post (`forumPostId 637`), published once.
3. A call-task bounty walked proposed to accepted to claimed to artifact-submitted to a paid `completed` (the test payout was then reversed to keep production clean).
4. An invite email round-trip created a pending member, delivered the magic link, and auto-linked the account to its role on login.
5. The Team page reads the `roles` table (`trpc.roles.list`).
6. The transcription worker is deployed, healthy, and configured (`TRANSCRIPTION_WORKER_URL` + `TRANSCRIPTION_API_KEY` set), running faster-whisper locally.

## What still needs doing

Human and ongoing:

1. Invite the real role holders. Only Season Facilitator (Rieki Cordon) is assigned today, so every other approved task routes open-to-circle on the Opportunity board rather than to a person. Fine as a soft launch; per-holder routing needs the assignments.
2. YouTube versus yt-dlp is an ongoing arms race. Latest yt-dlp plus the alternate player clients clears the datacenter-IP block most of the time. If it starts failing, add a `cookies.txt` and set `YTDLP_COOKIES_FILE` on the worker, and refresh it every few weeks.
3. Decide keep or retire the Riverside secondary webhook. Kept for now, sharing the single finalize path.

## Deferred vision (optional, Phase 5)

Only build these if the community wants them. None are required for the core loop. The source is already a published YouTube video, so there is nothing to upload; these are enrichments on top of the spine.

- Edited cut: dead-air and filler removal, and an optional cleaned video.
- Social clips cut from high-signal transcript spans.
- Auto-generated thumbnails.
- Push chapters into the YouTube video description via the Data API.
- Weekly coordination digest: a plain-language report to Rye of what is moving and what is stuck, on top of the flywheel's stale-claim nudges.

## Deterministic-first

This workflow follows `regen-deterministic-first` (STEERING section 11). The poll, diff, guard rails, ingest, transcript fetch, finalize, role reconciliation, stale-claim sweep, and the `scrubVoice` writing backstop are deterministic and run as crons and server code at zero token cost. Only the synthesize and extract-tasks passes spend tokens, because reading a transcript for meaning is the one genuinely nondeterministic step. The Whisper fallback is deterministic wiring around one external service call.

## Key files

- `server/jobs/coordinationPipeline.ts`: the pipeline, `reprocessRecording`, and the `scrubVoice` writing backstop
- `server/jobs/coordinationFlywheel.ts`: the flywheel
- `server/lib/recording-finalize.ts`: the shared publish path (`finalizeRecording`, `sendRecordingEmail`)
- `server/lib/videoSummary.ts`: YouTube transcript fetch (`fetchYouTubeTranscript`, `fetchYouTubeTranscriptSegments`) and `transcribeFallback`
- `transcription-worker/`: the self-hosted Whisper worker (FastAPI + yt-dlp + faster-whisper), deployed as its own Railway service
- `server/_core/index.ts`: the `/api/cron/coordination-*` endpoints and the global `rawBody` capture
- `server/webhooks/github.ts`, `server/webhooks/riverside.ts`: webhook handlers (rawBody verify)
- `server/routes/bounties.ts`: `submitArtifact`, `adminQueue` review filter, `payRole`, `reverse`
- `server/routes/roles.ts`: `list`, `create`, `update`, `setActive`
- `server/routes/roleHolders.ts`: `invite`, `claimInvites`, `linkPendingMembersByEmail`, assignment log
- `server/_core/oauth.ts`: email-login auto-link of pending members
- `server/routes/recordings.ts`: `getPublic`, `reprocess`
- `client/src/pages/Schedule.tsx`: recording overview, chapters, decisions, action items, transcript
- `client/src/pages/Team.tsx`: roles from `trpc.roles.list`
- `client/src/components/admin/`: Tasks and Role Holders tabs
- `drizzle/schema.ts`: `recordings` (with `chaptersJson`, `transcriptJson`), `roles`, `roleHolders`, `pending_members`, `role_assignment_log`, `bounties`, `bountyRoles`, `bounty_artifacts`
- Migrations: `0150_recording_chapters_transcript.sql`, `0151_bounty_artifacts.sql`, `0152_roles_catalog_invite.sql`
- `scripts/seed-roles.ts`: one-shot roles seed from `gameRoles.ts`

## Env vars

Main app (`ReGenCivics.Earth`):

- `YOUTUBE_CHANNEL_ID` (defaults to the SEEDS channel in `server/_core/env.ts`)
- `CRON_SECRET` (the crons reference it)
- `TRANSCRIPTION_WORKER_URL`, `TRANSCRIPTION_API_KEY` (set; wire the app to the worker, `TRANSCRIPTION_API_KEY` equals the worker's `WORKER_API_KEY`)
- `RIVERSIDE_WEBHOOK_SECRET` (optional; verification skipped when unset)
- Optional tunables: `COORDINATION_TITLE_SKIP_REGEX`, `COORDINATION_MIN_DURATION_SECONDS`, `COORDINATION_DAILY_LLM_LIMIT`

Transcription worker (`transcription-worker` service):

- `WORKER_API_KEY` (the shared secret; equals the app's `TRANSCRIPTION_API_KEY`)
- `PORT` (8080; the public domain routes to it)
- Optional: `WHISPER_MODEL` (default `base`), `GROQ_API_KEY` or `OPENAI_API_KEY` (swap to a hosted backend), `YTDLP_PLAYER_CLIENTS`, `YTDLP_COOKIES_FILE`

## Railway crons (captivating-grace project)

- `cron-coordination-pipeline`: `*/10 * * * *`
- `cron-coordination-flywheel`: `0 9 * * *`

Both are `curlimages/curl:latest` services, `sh -c` wrapped, sending `Authorization: Bearer $CRON_SECRET` with the secret referenced from `ReGenCivics.Earth`. Full mechanics and the shell-expansion trap: `regen-railway-crons`.

## Related docs and skills

- `MOVEMENT_COORDINATION_ENGINE_SPEC_2026-06-23.md`: the full vision and data model
- `transcription-worker/README.md`: the worker service, backends, and deploy steps
- Skills: `regen-railway-crons`, `regen-deterministic-first`, `regen-seasonal-roles`
