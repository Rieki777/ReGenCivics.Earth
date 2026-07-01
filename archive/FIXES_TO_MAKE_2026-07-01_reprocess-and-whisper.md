# Fixes to Make — 2026-07-01 — Reprocess + Whisper worker

Two connected pieces so the coordination engine can understand caption-less videos and so an already-ingested recording can be force-synthesized on demand.

Context found during Cowork verification on 2026-07-01:

- All 15 recordings in production (ids 3–17) have `overview`, `chaptersJson`, `forumPostId` all null. They were backfilled 2026-06-24 and ingested as raw rows, but never understood.
- Root cause: YouTube's public timedtext endpoint now returns empty for these videos (tested `h2K_f-E4hJM`, all langs, plus the track list: all empty). So `fetchYouTubeTranscript` returns null, so synthesize never runs.
- The Whisper fallback exists in code (`transcribeFallback`) but is not configured, so it no-ops.
- The pipeline hard-skips any already-ingested video (`if (existing) { report.alreadySeen += 1; continue; }`), so "Run pipeline now" will not reprocess recording 9. And the RSS feed only carries the latest ~15 uploads, so deleting the row would not re-ingest an old video either.

So: caption-less understanding needs the Whisper worker, and forcing an existing recording needs a small reprocess path.

---

## Fix 1 — Deploy the transcription worker (High)

**Status:** SCRIPTS READY (worker built, Rye deploys)

**Symptom:** Caption-less videos ingest but produce no overview, chapters, or tasks.

**Fix:** A self-contained worker is built at `transcription-worker/` (FastAPI + yt-dlp + faster-whisper, with optional Groq/OpenAI backends). It matches the exact `transcribeFallback` contract. Deploy it and wire two env vars. Full steps in `transcription-worker/README.md`.

**Files:** `transcription-worker/main.py`, `Dockerfile`, `requirements.txt`, `README.md`, `.env.example`

---

## Fix 2 — Add a reprocess path for an existing recording (High)

**Status:** CODED (needs integration against `origin/main` + deploy)

**Symptom:** No way to synthesize an already-ingested recording; the pipeline skips it.

**Fix:** Add an exported `reprocessRecording(recordingId)` to `server/jobs/coordinationPipeline.ts` that runs the same transcript → synthesize → extract-tasks → finalize path the main loop runs, but against one existing recording. Then expose it as an admin mutation.

### 2a. `server/jobs/coordinationPipeline.ts` — add near the bottom, exported

This reuses the module's existing helpers (`runSynthesizePass`, `runExtractTasksPass`, `finalizeRecording`, the transcript fetchers, `AGENT_NAME`) and the same holder-loading query the main loop uses. Mirror the exact field names already in the file; the block below is the shape, align it to the loop body around the existing `finalizeRecording(rec.id)` call.

```ts
/**
 * Force one already-ingested recording through the understand + publish path.
 * Same steps as the main loop, for a single existing row. Used by the admin
 * recordings.reprocess mutation. Idempotent: finalize guards on emailSent +
 * forumPostId, and re-running overwrites the synthesize columns in place.
 */
export async function reprocessRecording(recordingId: number): Promise<{
  ok: boolean;
  transcript: boolean;
  synthesized: boolean;
  tasksProposed: number;
  reason?: string;
}> {
  const db = await getDb();
  if (!db) return { ok: false, transcript: false, synthesized: false, tasksProposed: 0, reason: "no_db" };

  const [rec] = await db
    .select({ id: recordings.id, title: recordings.title, youtubeVideoId: recordings.youtubeVideoId })
    .from(recordings)
    .where(eq(recordings.id, recordingId))
    .limit(1);
  if (!rec || !rec.youtubeVideoId) {
    return { ok: false, transcript: false, synthesized: false, tasksProposed: 0, reason: "not_found_or_no_video" };
  }

  // Load holders exactly as the main loop does (roles table joined with roleHolders).
  const holders = await loadHolders(db); // <- reuse the same holder-loading the loop uses
  const holderByRole = new Map(holders.map((h) => [h.roleSlug, h] as const));

  // Transcript: captions first, then the Whisper worker.
  let transcript = await fetchYouTubeTranscript(rec.youtubeVideoId);
  let transcriptSegments = transcript ? await fetchYouTubeTranscriptSegments(rec.youtubeVideoId) : null;
  if (!transcript) {
    const fb = await transcribeFallback(rec.youtubeVideoId);
    if (fb) { transcript = fb.text; transcriptSegments = fb.segments; }
  }
  if (!transcript) {
    return { ok: false, transcript: false, synthesized: false, tasksProposed: 0, reason: "no_transcript" };
  }
  await db.update(recordings)
    .set({ transcript, transcriptJson: transcriptSegments ?? null })
    .where(eq(recordings.id, rec.id));

  // Synthesize.
  let synthesized = false;
  const synth = await runSynthesizePass({ title: rec.title, transcript });
  if (synth) {
    await db.update(recordings).set({
      overview: synth.overview || null,
      decisionsJson: synth.decisions,
      actionItemsJson: synth.actionItems,
      chaptersJson: synth.chapters.map((c) => ({ tSeconds: Math.max(0, Math.floor(c.timestampSeconds || 0)), title: c.title })),
      aiSummary: synth.overview || null,
    }).where(eq(recordings.id, rec.id));
    synthesized = true;
  }

  // Extract tasks -> proposed call_task bounties (same as the loop).
  let tasksProposed = 0;
  const drafts = await runExtractTasksPass({ title: rec.title, transcript, holders });
  for (const draft of drafts) {
    const matched = draft.roleSlug ? holderByRole.get(draft.roleSlug) : null;
    try {
      const [bResult] = await db.insert(bounties).values({
        sourceType: "call_task",
        title: draft.title.slice(0, 255),
        body: draft.summary,
        tokenType: "regen",
        workStatus: "proposed",
        recordingId: rec.id,
        roleSlug: draft.roleSlug ?? null,
        evidenceQuote: draft.evidenceQuote,
        evidenceTs: Math.max(0, Math.floor(draft.evidenceTimestampSeconds || 0)),
      });
      const bountyId = (bResult as unknown as { insertId: number }).insertId;
      const assigneeUserId = matched?.userId ?? null;
      await db.insert(bountyRoles).values({
        bountyId,
        role: "doer",
        userId: assigneeUserId,
        amount: Math.max(0, Math.min(1_000_000, Math.floor(draft.bountyAmount))),
        payStatus: assigneeUserId ? "filled" : "unfilled",
        filledByLog: assigneeUserId
          ? [{ userId: assigneeUserId, action: "pipeline_assigned", agent: AGENT_NAME, at: new Date().toISOString() }]
          : null,
      });
      tasksProposed += 1;
    } catch { /* skip on insert error, same as loop */ }
  }

  // Publish once (shared with the webhook).
  try { await finalizeRecording(rec.id); } catch { /* finalize guards handle re-runs */ }

  return { ok: true, transcript: true, synthesized, tasksProposed };
}
```

Note: the main loop builds `holders` inline from a roles + roleHolders query. Factor that query into a small `loadHolders(db)` helper and call it from both the loop and `reprocessRecording`, so they cannot drift. Do not duplicate the query.

### 2b. `server/routes/recordings.ts` — add an admin mutation

```ts
reprocess: adminProcedure
  .input(z.object({ id: z.number().int().positive() }))
  .mutation(async ({ input }) => {
    const { reprocessRecording } = await import("../jobs/coordinationPipeline");
    return reprocessRecording(input.id);
  }),
```

Keep the two LLM-cost guards the pipeline already applies (daily cap + sanitize). They live inside `runSynthesizePass` / `runExtractTasksPass`, so calling those functions inherits them; no new guard needed.

**Files:** `server/jobs/coordinationPipeline.ts`, `server/routes/recordings.ts`

---

## Fix 3 — Force-synthesize recording 9 and verify (High)

**Status:** BLOCKED (needs Fix 1 live + Fix 2 deployed)

**Symptom:** Recording 9 (`A Brief History of SEEDS`, videoId `h2K_f-E4hJM`) has no overview.

**Fix:** With the worker live and reprocess deployed, trigger it. From an admin browser session on regencivics.earth:

```js
await fetch('/api/trpc/recordings.reprocess?batch=1', {
  method: 'POST', credentials: 'include',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ 0: { json: { id: 9 } } })
}).then(r => r.json());
```

Then confirm on the Schedule page that recording 9 expands with an overview, chapters, decisions, and a transcript, that the community email/forum fired once, and that its extract-tasks proposals appear in `/admin -> Call Tasks -> Proposals`.

---

## Handoff Breakdown — Who Does What

### YOU (Rye) — things only you can do

| # | Task | Why only you | Command / Where |
|---|------|-------------|-----------------|
| 1 | Deploy `transcription-worker/` as a Railway service | Railway dashboard + deploy | Follow `transcription-worker/README.md` |
| 1 | Set `WORKER_API_KEY` on the worker; `TRANSCRIPTION_WORKER_URL` + `TRANSCRIPTION_API_KEY` on `ReGenCivics.Earth` | Railway env vars | Railway dashboard, `TRANSCRIPTION_API_KEY` == worker `WORKER_API_KEY` |
| 2 | Push + deploy the reprocess code once integrated | git push + Railway deploy | `git push`, Railway auto-deploys |
| 3 | Trigger `recordings.reprocess({id:9})` and verify on Schedule | Browser action on prod | Console snippet in Fix 3, or ask Cowork to drive it |

### CLAUDE CODE — already done or can be done without you

| # | Task | Status |
|---|------|--------|
| 1 | Build the transcription worker (matches `transcribeFallback` contract) | DONE |
| 2 | Write `reprocessRecording` + `recordings.reprocess` mutation | CODED |

### WAITING ON YOU before the rest can proceed

- Fix 3 is blocked until Fix 1 (worker live + env vars) and Fix 2 (reprocess deployed) are both done. Once they are, Cowork can drive the trigger and verification in the browser, and walk one of the generated call-task proposals to a paid completed the same way the 2026-07-01 lifecycle test was done.
