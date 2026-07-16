# Claude Code Build Prompt — The Harvest, Phase 1 (Capture + Bridge)

Source of truth: `CREATION_STATION_PLAN.md` v2. This is Phase 1 only: voice and text capture from inside regencivics.earth, storage, and the bridge endpoints that let the local brain pull captures in. The Harvest page, generation worker, and learning loop are later phases. v2 incorporates a security and architecture review, read the notes on each item.

Read first: `CLAUDE.md`, `STEERING.md` sections 1-6, `.ai/docs/security/BUILD-PLAYBOOK.md`, `.ai/docs/security/AI-AUTOMATION-RISKS.md`. Mirror existing patterns in `server/_core/llm.ts`, `server/routes/admin.ts` (`adminAI.chat`), `server/_core/trpc.ts` (procedures and `rateLimited`), `server/_core/security.ts` (`timingSafeEqualStr`, `recordWebhookFailure`), the R2 upload flow in `server/routes/global.ts` (`files.upload`), and the floating `AdminAIAssistant` component.

## Goal

Rye captures an idea by voice or text from the admin, it is transcribed and stored, and the local second brain can pull new captures over HTTPS. Replaces Telegram Saved Messages as the capture inbox.

## Build items

### 1. Migration — `quick_notes` table
`drizzle/NNNN_quick_notes.sql`. Columns: `id` BIGINT PK auto-increment (the sync cursor), `capture_id` CHAR(36) UNIQUE (UUID minted at insert), `owner_id` FK users.id, `body` TEXT, `source` ENUM('text','voice'), `audio_key` VARCHAR null, `themes` JSON null, `status` ENUM('inbox','processed') default 'inbox', `created_at`, `processed_at` null. Index `(owner_id, status, id)`. Add the Drizzle type to `schema.ts`. Do not run it, that is Rye's step.

### 2. Owner gate — new `ownerProcedure`
Do NOT reuse `adminProcedure`; it passes for any admin or superadmin, and this is Rye's private data. Add `ownerProcedure` in `server/_core/trpc.ts` that requires `ctx.user` and `ctx.user.id === ENV.ownerUserId`. Every procedure below uses it, and always derives `owner_id` from `ctx.user.id`, never from input.

### 3. Transcription helper — `server/lib/transcribe.ts`
`transcribe(buffer, mimetype): Promise<string>` calling the hosted STT API, key from `ENV.transcriptionApiKey`, clear error if unset. Guard rails per AI-AUTOMATION-RISKS Risk 3: reject audio over a size and duration cap, allowlist mimetypes, `AbortController` timeout, retry once, and a per-day transcription count budget. Treat the transcript as untrusted text.

### 4. tRPC router — `server/routes/quick-notes.ts`, mounted in `server/routers.ts`
All `ownerProcedure`. Procedures:
- `create({ body })` — `body: z.string().min(1).max(8000)`. Insert with a fresh `capture_id`, status 'inbox'. `rateLimited`.
- `createFromVoice({ audioKey })` — audio already uploaded via `files.upload` to a PRIVATE R2 path. Fetch, `transcribe`, save transcript as body, source 'voice', store `audio_key`. Return the note.
- `list` and `markProcessed` are the bridge's job, exposed on the token route below, not here.
Optional cheap theme auto-tag with `invokeLLM`: wrap the note body in delimiters, instruct the model it is data not instructions, validate the output against the fixed theme list. Skip if it adds latency.

### 5. Bridge endpoints — token auth, id-cursor
`server/webhooks/harvest-bridge.ts`, token-checked, no cookie acceptance:
- `GET /api/harvest/captures?since_id=<n>` — returns `WHERE owner_id = ownerUserId AND id > :since_id ORDER BY id ASC LIMIT 200`, fields `id, capture_id, body, source, created_at`. Never returns `audio_key` or signed audio URLs.
- `POST /api/harvest/mark-processed` — body `{ capture_ids }`, idempotent (setting an already-processed row is a no-op).
Gate both with a bearer compared via `timingSafeEqualStr` against `ENV.harvestBridgeToken` (accept `ENV.harvestBridgeTokenNext` too, for rotation). On mismatch: `recordWebhookFailure(ip, 'harvest-bridge')`, return 401, fail closed in production. `rateLimited` on both the failure and success paths. Log path, ip, and note-count only, never the token or bodies.

### 6. R2 audio privacy
Voice audio uploads go to a private key prefix, NOT the public `assets.regencivics.earth` prefix, and are never served by the `/api/img` proxy. If audio ever needs playback, add an owner-gated short-lived signed URL. Add an R2 lifecycle rule to delete audio after transcription.

### 7. FAB "Add note" UI — friction is the enemy
Extend the bottom-right admin panel with an **Add note** composer:
- Textarea plus Save calling `quickNotes.create`. Save optimistically and queue offline (service worker or local queue), sync when back online. The note must appear instantly even with no network.
- Mic button using MediaRecorder. On stop, store the recording locally right away so the capture is never lost, upload via `files.upload`, then call `createFromVoice`. Show a spinner during transcription, then show the transcript so Rye can confirm, tweak, split a long note, or re-record before it is final.
- Make it installable as a PWA so it opens like an app. Treat any capture failure as a P0.

### 8. Env vars (Rye sets in Railway)
`TRANSCRIPTION_API_KEY`, `HARVEST_BRIDGE_TOKEN`, `HARVEST_BRIDGE_TOKEN_NEXT` (optional), `OWNER_USER_ID`. Add all to `.env.example` with comments. Read in `server/_core/env.ts`. The router must fail soft with a typed error if `quick_notes` is missing, so a deploy before the migration does not crash.

## Ship gate (before any VERIFIED claim)
```
python3 scripts/audit-truncation.py
pnpm typecheck
pnpm test        # add tests: ownerProcedure rejects non-owner; create+markProcessed; since_id cursor
```
Per new className, grep it in client/src. Evidence column required for each row.

## Handoff Breakdown — Who Does What

### YOU (Rye) — things only you can do

| # | Task | Why only you | Command / Where |
|---|------|-------------|-----------------|
| 1 | Pick the transcription provider and get an API key | Account and billing | Deepgram or OpenAI dashboard |
| 2 | Set `TRANSCRIPTION_API_KEY`, `HARVEST_BRIDGE_TOKEN`, `OWNER_USER_ID` in Railway | Dashboard login | Railway → ReGenCivics.Earth → Variables. Token via `openssl rand -hex 32` |
| 3 | Find your user id for `OWNER_USER_ID` | DB value only you can read | `--status` style query on Windows |
| 4 | Apply the migration on Railway DB, verify, THEN push | VM cannot reach Railway MySQL; order matters | `npx tsx scripts/run-migration.ts --all` then `--status` on Windows, then git push |
| 5 | Git push to main and confirm the deploy | Claude Code cannot push or deploy | `/ship`, push, then `pnpm railway:deploys` |

### CLAUDE CODE — can be done without Rye

| # | Task | Status |
|---|------|--------|
| 1 | `quick_notes` migration + schema type (with `capture_id`, id cursor) | CODED |
| 2 | `ownerProcedure` | CODED |
| 3 | `transcribe.ts` with caps and timeout | CODED |
| 4 | `quickNotes` router, owner-gated, bounded input | CODED |
| 5 | Bridge endpoints, token auth, id-cursor, fail-closed, rate-limited | CODED |
| 6 | Private R2 audio path + lifecycle | CODED |
| 7 | FAB Add note composer, offline-first, voice with instant save | CODED |
| 8 | `.env.example`, env reads, fail-soft router, tests | CODED |

### CLAUDE (Cowork) — after deploy is live

| # | Task | Status |
|---|------|--------|
| 1 | `_pipeline/ingest_inbox.py`, append-only intake (never `sort_v2.py` in the loop) | READY TO BUILD |
| 2 | Bridge script: pull `since_id`, write vault notes, flush, THEN mark-processed | READY TO BUILD once endpoints deployed and token set |
| 3 | Hourly scheduled bridge run + a status heartbeat | READY TO BUILD |

### WAITING ON YOU before Cowork can proceed
Cowork items 2 and 3 are blocked until your column items 2, 4, and 5 are done and the deploy is confirmed. They need the live endpoints and the token value.
