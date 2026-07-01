# Cowork prompt: refresh COORDINATION_ENGINE_WORKFLOW.md to as-built reality

Paste this into the Claude Cowork session that owns `COORDINATION_ENGINE_WORKFLOW.md`.

---

Update `COORDINATION_ENGINE_WORKFLOW.md` (the canonical current-state doc) to match what actually shipped on 2026-07-01. Verify each claim against the real repo before writing (the code is the source of truth, not the old prompt docs). Correct the drift; do not just append.

## What shipped (all committed + pushed to `origin/main`; migrations applied to prod)

**Stage 0 — webhook fix + security reconciliation** (`4b34f45`, `7815848`)
- The GitHub webhook timeout was a DOUBLE BODY-PARSE crash, not a secrets problem. The global `express.json({ verify })` in `server/_core/index.ts` stores the raw string as `req.rawBody`; `github.ts` + `riverside.ts` had also mounted their own route-level `express.raw()` (a no-op), so `req.body` was a parsed object and `createHmac().update(object)` threw. Fixed: read `req.rawBody`, drop the route-level parser (matches `resend`/`loomio`/`hypha`). Riverside is secret-optional.
- Security docs (`OWASP-TOP10`, `CHECKLIST`, `OPS-PLAYBOOK`) corrected to this root cause.

**Stage 1 — recording-to-community loop** (`11f82be`, migration `0150`)
- `recordings.chaptersJson` + `transcriptJson` columns. Pipeline persists synthesize-pass chapters (`{ tSeconds, title }`) and a timestamped transcript (`fetchYouTubeTranscriptSegments`).
- NEW shared module `server/lib/recording-finalize.ts` (`finalizeRecording(id)` + `sendRecordingEmail`): event-match, forum thread, subscriber email, Telegram/WhatsApp notify, with `emailSent` + `forumPostId` double-post guards. BOTH the Riverside webhook and the YouTube-poll pipeline call it, so a recording is published exactly once.
- Schedule page: each recording expands to overview, deep-linked chapters (`&t={s}s`), decisions, action items, collapsible transcript. `recordings.getPublic` serves it.

**Stage 2 — task lifecycle** (`ed6f8a2`, migration `0151`)
- IMPORTANT: `callTasks` does not exist. The whole lifecycle runs on `bounties` + `bountyRoles` (`sourceType='call_task'`). Fix any doc reference to `callTasks`.
- NEW `bounty_artifacts` table + `bounties.submitArtifact`: a call-task doer submits proof-of-work (link/text) → `workStatus='in_review'` → notifies the accepting maintainer. `adminQueue` gained a `review` filter; the "Awaiting Review" admin tab shows artifacts + an Approve+pay button (`complete` → `payRole` → `creditPrivateTokens` source `call_task_bounty`). Both gates intact (maintainer accept + consent-before-payout).

**Stage 3 — roles in the DB + holders admin + invite** (`ba662fb`, migration `0152`, `scripts/seed-roles.ts`)
- NEW `roles` table is the source of truth (seeded from `gameRoles.ts`; slug matches `roleHolders.roleSlug`). Team page reads `trpc.roles.list` (falls back to `gameRoles.ts`). Flywheel reconciles `roleHolders` against the `roles` table (disk parser retired to a fallback).
- Admin role CRUD (`roles.create/update/setActive`).
- Invite-only members: `pending_members` table + `roleHolders.invite` (magic-link email) + `pendingMemberId` on `roleHolders`; on email login the pending profile auto-links to the real user (`linkPendingMembersByEmail` in oauth verify). Admin tab: coverage banner, invite form, invited-members list, add-role, assignment audit (`role_assignment_log`).
- `regen-seasonal-roles` skill updated to write to the `roles` table.

**Stage 4 — transcript fallback** (`536cf51`)
- `transcribeFallback(videoId)` in `videoSummary.ts`: when a video has no captions, POST to a configured worker (`TRANSCRIPTION_WORKER_URL` + `TRANSCRIPTION_API_KEY`) that returns `{ text, segments }`. Deterministic wiring; degrades to skip when unconfigured.

## Rewrite the "Remaining work" sections

Sections A–F of the old doc are now largely DONE. Rework them into a "shipped" summary + a short "still needs" list containing only:
- Live verification (Rye): GitHub webhook redeliver → 200; a poll-ingested recording emails/forums once; a bounty walks to a paid `completed`; invite email round-trip links an account; Team page reads the roles table.
- Human-only + optional: invite real members; provide `TRANSCRIPTION_WORKER_URL` + `TRANSCRIPTION_API_KEY` and deploy the worker if Whisper fallback is wanted; decide keep/retire the Riverside secondary webhook (kept for now).
- Phase 5 deferred items stay deferred (edited cut, social clips, thumbnails, YouTube description push, weekly digest).

## Style
Follow the writing rules (zero em-dashes, no contrast framing, no AI-tell words). Keep it the narrow accurate picture of the pipeline as built; link to `MOVEMENT_COORDINATION_ENGINE_SPEC_2026-06-23.md` for the full vision.
