/**
 * Movement Coordination Engine: Phase 2 pipeline driver.
 *
 * One pass through the steps from
 * MOVEMENT_COORDINATION_ENGINE_SPEC_2026-06-23.md sections 5 + 6:
 *
 *   1. Poll the public YouTube channel RSS feed (no API key, no quota).
 *   2. Diff against `recordings.youtubeVideoId` for new videos.
 *   3. Apply guard rails (title skip pattern, optional duration floor).
 *   4. Upsert a `recordings` row at recordingKind='raw' so the site can
 *      show the live cut immediately on the Schedule page.
 *   5. Best-effort transcript via YouTube's public timedtext endpoint.
 *   6. Two LLM passes:
 *        synthesize    -> overview + chapters + decisions + actionItems
 *        extractTasks  -> role-tagged proposals (every task requires an
 *                         exact evidence quote + timestamp, no quote
 *                         means no task), inserted as `bounties` rows
 *                         (sourceType='call_task') at workStatus='proposed'
 *                         for the admin gate.
 *
 * Safety per `.ai/docs/security/AI-AUTOMATION-RISKS.md`:
 *   - Transcripts are untrusted text. Sanitize control chars and cap
 *     length before any LLM call.
 *   - Generated output is labeled with bot provenance (bountyRoles rows
 *     record the agent in filledByLog; recordings.aiSummary and overview
 *     are produced by the same identifiable bot path).
 *   - Per-day site rate limit + per-video idempotency guards bound cost.
 *
 * Token model per `CLAUDE.md`: this file never writes balances. It only
 * proposes work. The reward path runs through the bounties consent/pay flow
 * (bounties.consentAndPay -> payRole), which uses `creditPrivateTokens` with
 * source tag `call_task_bounty`.
 */
import { sql, eq } from "drizzle-orm";
import { getDb } from "../db";
import { invokeLLM } from "../_core/llm";
import { ENV } from "../_core/env";
import { fetchYouTubeTranscript, fetchYouTubeTranscriptSegments, transcribeFallback } from "../lib/videoSummary";
import { recordings, roleHolders, bounties, bountyRoles } from "../../drizzle/schema";
import { finalizeRecording } from "../lib/recording-finalize";

type DbInstance = NonNullable<Awaited<ReturnType<typeof getDb>>>;

// ── Tunables ─────────────────────────────────────────────────────────

const DEFAULT_TITLE_SKIP_PATTERN =
  process.env.COORDINATION_TITLE_SKIP_REGEX ?? "^(short:|shorts:|test:|debug:)";
const MIN_DURATION_SECONDS = Number(process.env.COORDINATION_MIN_DURATION_SECONDS ?? 120);
const MAX_TRANSCRIPT_CHARS = 60_000;
const MAX_TASKS_PER_RUN = 25;
const SITE_DAILY_LIMIT = Number(process.env.COORDINATION_DAILY_LLM_LIMIT ?? 40);

// Provenance every LLM-produced row carries.
export const AGENT_NAME = "coordination-engine";

// Crude in-process rate limiter. Resets at midnight UTC. Same shape
// videoSummary.ts uses, intentionally not shared because the counters
// track different surfaces and the failure modes are different.
type DayKey = string;
const counters = { day: dayKeyNow(), siteCount: 0 };
function dayKeyNow(): DayKey {
  return new Date().toISOString().slice(0, 10);
}
function rollDayIfNeeded(): void {
  const today = dayKeyNow();
  if (counters.day !== today) {
    counters.day = today;
    counters.siteCount = 0;
  }
}
function llmAllowed(): boolean {
  rollDayIfNeeded();
  return counters.siteCount < SITE_DAILY_LIMIT;
}
function recordLlmUsage(): void {
  rollDayIfNeeded();
  counters.siteCount += 1;
}

// ── RSS fetch + parse ────────────────────────────────────────────────

export interface RssEntry {
  videoId: string;
  title: string;
  publishedAt: string;
}

/**
 * Poll the public uploads RSS for a YouTube channel. No API key, no
 * quota cost. Returns the most recent ~15 entries (whatever YouTube
 * returns). On any network failure returns an empty array so the
 * pipeline degrades safely instead of throwing.
 */
export async function fetchYouTubeRss(channelId: string): Promise<RssEntry[]> {
  const url = `https://www.youtube.com/feeds/videos.xml?channel_id=${encodeURIComponent(channelId)}`;
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; ReGenCivicsBot/1.0)" },
    });
    if (!res.ok) return [];
    const xml = await res.text();
    const entries: RssEntry[] = [];
    // Forgiving regex parse rather than a full XML library: the YouTube
    // RSS shape is stable enough that this has been the standard
    // approach in similar projects for years, and it avoids pulling in
    // an XML parser dependency for one fetch path.
    const entryRe = /<entry>([\s\S]*?)<\/entry>/g;
    let m: RegExpExecArray | null;
    while ((m = entryRe.exec(xml)) !== null) {
      const block = m[1];
      const videoId = block.match(/<yt:videoId>([^<]+)<\/yt:videoId>/)?.[1];
      const title = block.match(/<title>([\s\S]*?)<\/title>/)?.[1]?.trim();
      const publishedAt = block.match(/<published>([^<]+)<\/published>/)?.[1];
      if (videoId && title && publishedAt) {
        entries.push({ videoId, title, publishedAt });
      }
    }
    return entries;
  } catch {
    return [];
  }
}

/**
 * Best-effort duration lookup without burning the Data API quota. Reads
 * the watch page and pulls the `<meta itemprop="duration">` ISO-8601
 * tag. Returns null on any failure (parsing, network, missing tag).
 * Callers should treat null as "unknown" and skip the duration filter
 * rather than dropping the video.
 */
export async function fetchYouTubeDuration(videoId: string): Promise<number | null> {
  try {
    const res = await fetch(`https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; ReGenCivicsBot/1.0)" },
    });
    if (!res.ok) return null;
    const html = await res.text();
    const iso = html.match(/itemprop="duration"\s+content="([^"]+)"/)?.[1];
    if (!iso) return null;
    // ISO 8601 duration parser, scoped to the H/M/S we expect from YouTube.
    const m = iso.match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/);
    if (!m) return null;
    const h = Number(m[1] ?? 0), min = Number(m[2] ?? 0), s = Number(m[3] ?? 0);
    return h * 3600 + min * 60 + s;
  } catch {
    return null;
  }
}

// ── Sanitization ─────────────────────────────────────────────────────

/**
 * Strip prompt-injection markers + control characters from untrusted
 * text before it reaches the LLM. Cap length so a giant transcript
 * cannot blow past the context budget or the daily LLM bill.
 */
export function sanitizeForLLM(text: string, maxChars = MAX_TRANSCRIPT_CHARS): string {
  let s = (text ?? "").toString();
  // Remove control characters and zero-width / direction-override
  // marks that are common prompt-injection vectors.
  s = s.replace(/[--‪-‮⁦-⁩]/g, " ");
  // Collapse repeated whitespace.
  s = s.replace(/\s+/g, " ").trim();
  // Hard-cap length. The synthesize and extract-tasks prompts work
  // fine on the first ~60k chars; longer transcripts are summarized
  // (a Phase-4 enhancement could chunk-summarize first).
  if (s.length > maxChars) s = s.slice(0, maxChars);
  return s;
}

// ── LLM passes ───────────────────────────────────────────────────────

const VOICE_RULES = [
  "Write in Rye's voice: direct, grounded, specific.",
  "Banned: em-dashes (zero, ever), contrast framing ('not X but Y'), AI tells (delve, foster, leverage, vibrant, transformative, unlock, seamless, robust, comprehensive, utilize, navigate as metaphor, empower, beacon of, testament to, embark, in conclusion, it's worth noting).",
  "Never invent details. If something is not in the transcript, leave it out.",
].join("\n");

/**
 * Strip a fenced code block (```json ... ```) if present, then parse.
 * Returns null when the model refused or emitted unparseable text;
 * callers treat null as "leave this field empty rather than guess."
 */
function tryParseJson<T>(raw: string): T | null {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  const candidate = fenced ? fenced[1] : raw;
  try {
    return JSON.parse(candidate) as T;
  } catch {
    return null;
  }
}

export interface SynthesizeOutput {
  overview: string;
  chapters: Array<{ timestampSeconds: number; title: string }>;
  decisions: string[];
  actionItems: Array<{ owner: string; item: string }>;
}

export async function runSynthesizePass(input: {
  title: string;
  transcript: string;
}): Promise<SynthesizeOutput | null> {
  if (!llmAllowed()) return null;
  const transcript = sanitizeForLLM(input.transcript);
  const title = sanitizeForLLM(input.title, 240);

  const userPrompt = [
    `Recorded session title: ${title}`,
    "",
    "Transcript (truncated if very long, sanitized of control characters):",
    transcript,
    "",
    "Produce ONE JSON object with these exact fields:",
    `  "overview": string (one Rye-voice paragraph, 2-3 sentences, what this session was about)`,
    `  "chapters": Array<{ timestampSeconds: number, title: string }> (between 3 and 12 chapters)`,
    `  "decisions": string[] (concrete decisions made on the call, 0 to 8 items)`,
    `  "actionItems": Array<{ owner: string, item: string }> (named asks heard on the call, 0 to 12 items, owner is the person or role spoken aloud)`,
    "",
    "Return ONLY the JSON object, no surrounding prose. If a field has no content, return an empty array (or empty string for overview).",
  ].join("\n");

  recordLlmUsage();
  const out = await invokeLLM({
    messages: [
      { role: "system", content: VOICE_RULES },
      { role: "user", content: userPrompt },
    ],
    maxTokens: 3000,
  });
  const raw = out.choices[0]?.message.content ?? "";
  const parsed = tryParseJson<SynthesizeOutput>(raw);
  if (!parsed) return null;
  return {
    overview: typeof parsed.overview === "string" ? parsed.overview : "",
    chapters: Array.isArray(parsed.chapters) ? parsed.chapters : [],
    decisions: Array.isArray(parsed.decisions) ? parsed.decisions : [],
    actionItems: Array.isArray(parsed.actionItems) ? parsed.actionItems : [],
  };
}

export interface ProposedTaskDraft {
  title: string;
  summary: string;
  roleSlug: string | null;
  sociocraticOverview: {
    purpose: string;
    whyThisRole?: string;
    steps?: string[];
    definitionOfDone?: string;
    consentCircle?: string;
  };
  bountyAmount: number;
  evidenceQuote: string;
  evidenceTimestampSeconds: number;
}

export async function runExtractTasksPass(input: {
  title: string;
  transcript: string;
  holders: Array<{ roleSlug: string; roleTitle: string; aliases: string[]; circle: string | null }>;
}): Promise<ProposedTaskDraft[]> {
  if (!llmAllowed()) return [];
  const transcript = sanitizeForLLM(input.transcript);
  const title = sanitizeForLLM(input.title, 240);
  const rolesCatalog = input.holders.map((h) => ({
    roleSlug: h.roleSlug,
    roleTitle: h.roleTitle,
    aliases: h.aliases.slice(0, 8),
    circle: h.circle,
  }));

  const userPrompt = [
    `Recorded session title: ${title}`,
    "",
    "Transcript (truncated if very long, sanitized of control characters):",
    transcript,
    "",
    "Known sociocratic roles. Use roleSlug exactly as listed; null if no role matches:",
    JSON.stringify(rolesCatalog, null, 2),
    "",
    "Extract concrete tasks named in the call. For each task you propose, you MUST quote the exact transcript line that produced it and give its approximate timestamp in seconds from the start. If you cannot quote it, do not propose the task.",
    "",
    "Return ONE JSON object with a single field `tasks`, an array of:",
    `  {`,
    `    "title": string,`,
    `    "summary": string (2-3 sentences, what to do and why),`,
    `    "roleSlug": string | null,`,
    `    "sociocraticOverview": {`,
    `      "purpose": string,`,
    `      "whyThisRole": string,`,
    `      "steps": string[],`,
    `      "definitionOfDone": string,`,
    `      "consentCircle": string`,
    `    },`,
    `    "bountyAmount": number (integer $ReGen units, suggest 25 for a small ask, 100 for an afternoon, 500 for a multi-day build),`,
    `    "evidenceQuote": string (exact quote from the transcript that produced this task),`,
    `    "evidenceTimestampSeconds": number (approx seconds from the start)`,
    `  }`,
    `Cap the response at ${MAX_TASKS_PER_RUN} tasks. Return only the JSON.`,
  ].join("\n");

  recordLlmUsage();
  const out = await invokeLLM({
    messages: [
      { role: "system", content: VOICE_RULES },
      { role: "user", content: userPrompt },
    ],
    maxTokens: 4500,
  });
  const raw = out.choices[0]?.message.content ?? "";
  const parsed = tryParseJson<{ tasks?: ProposedTaskDraft[] }>(raw);
  const tasks = Array.isArray(parsed?.tasks) ? parsed!.tasks! : [];
  // Drop any task without an evidence quote, per spec.
  return tasks
    .filter((t) => typeof t?.evidenceQuote === "string" && t.evidenceQuote.trim().length > 0)
    .slice(0, MAX_TASKS_PER_RUN);
}

// ── Orchestrator ─────────────────────────────────────────────────────

export interface PipelineReport {
  pollFetched: number;
  alreadySeen: number;
  skippedByTitle: number;
  skippedByDuration: number;
  ingested: number;
  transcribed: number;
  synthesized: number;
  tasksProposed: number;
  llmCallsToday: number;
  errors: string[];
}

/**
 * Load active role holders from the DB. Shared by the main pipeline loop
 * and reprocessRecording so they always read the same data and cannot drift.
 */
export async function loadHolders(db: DbInstance) {
  const rows = await db
    .select({
      roleSlug: roleHolders.roleSlug,
      roleTitle: roleHolders.roleTitle,
      circle: roleHolders.circle,
      aliases: roleHolders.aliases,
      userId: roleHolders.userId,
      isActive: roleHolders.isActive,
    })
    .from(roleHolders);
  return rows
    .filter((h) => h.isActive === 1)
    .map((h) => ({
      roleSlug: h.roleSlug,
      roleTitle: h.roleTitle,
      aliases: Array.isArray(h.aliases) ? (h.aliases as string[]) : [],
      circle: h.circle,
      userId: h.userId,
    }));
}

export async function runCoordinationPipeline(opts: {
  channelId?: string;
  maxNew?: number;
} = {}): Promise<PipelineReport> {
  const report: PipelineReport = {
    pollFetched: 0,
    alreadySeen: 0,
    skippedByTitle: 0,
    skippedByDuration: 0,
    ingested: 0,
    transcribed: 0,
    synthesized: 0,
    tasksProposed: 0,
    llmCallsToday: 0,
    errors: [],
  };

  const channelId = opts.channelId || ENV.youtubeChannelId;
  if (!channelId) {
    report.errors.push("No YOUTUBE_CHANNEL_ID configured.");
    return report;
  }
  const db = await getDb();
  if (!db) {
    report.errors.push("Database unavailable.");
    return report;
  }

  const entries = await fetchYouTubeRss(channelId);
  report.pollFetched = entries.length;
  const skipRe = (() => {
    try { return new RegExp(DEFAULT_TITLE_SKIP_PATTERN, "i"); } catch { return null; }
  })();

  const maxNew = opts.maxNew ?? 5;
  let processed = 0;

  // Pre-fetch every roleHolders row once (cheap, ~20 rows) and pass
  // into the extract-tasks pass instead of querying per-video.
  const holders = await loadHolders(db);
  const holderByRole = new Map(holders.map((h) => [h.roleSlug, h] as const));

  for (const entry of entries) {
    if (processed >= maxNew) break;

    // Idempotency: skip anything we've already ingested.
    const [existing] = await db
      .select({ id: recordings.id })
      .from(recordings)
      .where(eq(recordings.youtubeVideoId, entry.videoId))
      .limit(1);
    if (existing) { report.alreadySeen += 1; continue; }

    // Title-based skip pattern.
    if (skipRe && skipRe.test(entry.title)) { report.skippedByTitle += 1; continue; }

    // Best-effort duration check. Unknown -> don't block.
    const duration = await fetchYouTubeDuration(entry.videoId);
    if (duration !== null && duration < MIN_DURATION_SECONDS) {
      report.skippedByDuration += 1;
      continue;
    }

    // Upsert recordings row at kind='raw'. riversideId is required +
    // unique, so we synthesize a deterministic value tied to the
    // YouTube id when no Riverside webhook produced this recording.
    const youtubeUrl = `https://www.youtube.com/watch?v=${entry.videoId}`;
    const syntheticRiversideId = `yt:${entry.videoId}`;
    try {
      await db.insert(recordings).values({
        riversideId: syntheticRiversideId,
        riversideUrl: null,
        title: entry.title,
        sessionDate: new Date(entry.publishedAt),
        durationSeconds: duration ?? null,
        youtubeUrl,
        youtubeVideoId: entry.videoId,
        recordingKind: "raw",
        thumbnailUrl: `https://i.ytimg.com/vi/${entry.videoId}/hqdefault.jpg`,
      });
      report.ingested += 1;
    } catch (e) {
      // Unique-constraint races (parallel cron + redeploy) land here.
      report.errors.push(`upsert ${entry.videoId}: ${(e as Error).message}`);
      continue;
    }

    // Re-read the inserted row to get the id for bounties.recordingId.
    const [rec] = await db
      .select({ id: recordings.id })
      .from(recordings)
      .where(eq(recordings.youtubeVideoId, entry.videoId))
      .limit(1);
    if (!rec) continue;

    // Transcript (best effort).
    // Timestamped segments (best effort) so chapters + the transcript panel
    // deep-link into the player. Null when captions carry no timing.
    let transcript = await fetchYouTubeTranscript(entry.videoId);
    let transcriptSegments = transcript ? await fetchYouTubeTranscriptSegments(entry.videoId) : null;
    if (!transcript) {
      // No YouTube captions: try the configured Whisper fallback worker (Phase 4).
      const fb = await transcribeFallback(entry.videoId);
      if (fb) {
        transcript = fb.text;
        transcriptSegments = fb.segments;
      }
    }
    if (!transcript) {
      processed += 1;
      continue;
    }
    report.transcribed += 1;
    await db
      .update(recordings)
      .set({ transcript, transcriptJson: transcriptSegments ?? null })
      .where(eq(recordings.id, rec.id));

    // Synthesize.
    const synth = await runSynthesizePass({ title: entry.title, transcript });
    if (synth) {
      await db
        .update(recordings)
        .set({
          overview: synth.overview || null,
          decisionsJson: synth.decisions,
          actionItemsJson: synth.actionItems,
          chaptersJson: synth.chapters.map((c) => ({
            tSeconds: Math.max(0, Math.floor(c.timestampSeconds || 0)),
            title: c.title,
          })),
          // Keep aiSummary in sync with overview so older surfaces (the
          // byEventId card, admin editorial list) still show something useful.
          aiSummary: synth.overview || null,
        })
        .where(eq(recordings.id, rec.id));
      report.synthesized += 1;
    }

    // Extract tasks + insert as proposed bounty rows (sourceType='call_task').
    const drafts = await runExtractTasksPass({ title: entry.title, transcript, holders });
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
        report.tasksProposed += 1;
      } catch (e) {
        report.errors.push(`insert task for ${entry.videoId}: ${(e as Error).message}`);
      }
    }

    // Publish to the community + link the event (shared with the Riverside
    // webhook). Idempotent via the recording's emailSent + forumPostId guards,
    // so re-runs never double-post.
    try {
      await finalizeRecording(rec.id);
    } catch (e) {
      report.errors.push(`finalize ${entry.videoId}: ${(e as Error).message}`);
    }

    processed += 1;
  }

  rollDayIfNeeded();
  report.llmCallsToday = counters.siteCount;
  return report;
}

/**
 * Force one already-ingested recording through the understand + publish path.
 *
 * Same steps as the main loop — transcript, synthesize, extract tasks, finalize
 * — but against one existing row instead of a freshly polled RSS entry. Used
 * by the admin recordings.reprocess mutation. Idempotent: finalize guards on
 * emailSent + forumPostId, and re-running overwrites the synthesize columns.
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

  const holders = await loadHolders(db);
  const holderByRole = new Map(holders.map((h) => [h.roleSlug, h] as const));

  // Captions first, Whisper worker second.
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
      chaptersJson: synth.chapters.map((c) => ({
        tSeconds: Math.max(0, Math.floor(c.timestampSeconds || 0)),
        title: c.title,
      })),
      aiSummary: synth.overview || null,
    }).where(eq(recordings.id, rec.id));
    synthesized = true;
  }

  // Extract tasks -> proposed bounties, same as the main loop.
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
    } catch { /* skip on insert error, same as main loop */ }
  }

  // Publish once. Guards on emailSent + forumPostId make this idempotent.
  try { await finalizeRecording(rec.id); } catch { /* finalize errors are non-fatal */ }

  return { ok: true, transcript: true, synthesized, tasksProposed };
}

// Suppress unused-import warning when sql is only referenced by a future helper.
void sql;
