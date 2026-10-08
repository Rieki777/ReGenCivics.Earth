/**
 * Movement Coordination Engine: Phase 2 pipeline driver.
 *
 * One pass through the steps from
 * docs/planning/MOVEMENT_COORDINATION_ENGINE_SPEC_2026-06-23.md sections 5 + 6:
 *
 *   1. Poll the public YouTube channel RSS feed (no API key, no quota).
 *   2. Diff against `recordings.youtubeVideoId` for new videos.
 *   3. Apply guard rails (title skip pattern, optional duration floor).
 *   4. Upsert a `recordings` row at recordingKind='raw' so the site can
 *      show the live cut immediately on the Schedule page.
 *   5. Transcript from the channel owner's YouTube captions, then public timedtext.
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
import { and, eq, isNull, lt, lte, or, sql } from "drizzle-orm";
import { getDb } from "../db";
import { invokeLLM } from "../_core/llm";
import { ENV } from "../_core/env";
import { logger } from "../_core/logger";
import { loadYouTubeTranscript } from "../lib/youtubeCaptions";
import { recordings, roleHolders, bounties, bountyRoles } from "../../drizzle/schema";
import { finalizeRecording } from "../lib/recording-finalize";
import { mapRecordingOntoCourse } from "../lib/sessionCourseStore";
import { handleEditedCutPoll, loadEditedCutCache } from "../lib/editedCutIngest";
import { linkRecordingToMatchingEvent } from "../lib/recordingEventLink";
import { fetchYouTubeOembedTitle, fetchYouTubeOwnerSnippet, fetchYouTubeWatchMeta } from "../lib/youtubeWatchMeta";
import { replacementVideoTitle, usableVideoTitle } from "../../shared/youtubeWatchMeta";
import { createSingleFlight } from "../lib/singleFlight";
import { EMPTY_OWNER_CAPTION_LIST_ERROR, FALSE_NOT_ENDED_ERROR, MAX_PROCESS_ATTEMPTS, captionRetryDespiteWatch, compareRetryQueue, effectiveRetryAttempts, nextProcessRetry, recordingNeedsAutoRetry } from "../../shared/recordingRetry";
import type { YoutubeWatchMeta } from "../../shared/youtubeWatchMeta";
import { isMissingSchema } from "../lib/schemaTolerance";
import {
  computeBountyAmount,
  SCOPE_TIERS,
  IMPACT_LEVELS,
  type ScopeTier,
  type ImpactLevel,
} from "../db/bountyValuation";

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
  const meta = await fetchYouTubeWatchMeta(videoId);
  if (meta.status !== "ok") return null;
  return meta.durationSeconds;
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
  "Use commas, periods, or shorter sentences in place of any dash. Never output the — or – character.",
].join("\n");

/**
 * Deterministic backstop for the writing rules on LLM output. VOICE_RULES
 * asks the model to avoid em-dashes, but models slip. This guarantees the
 * punctuation rule: dash family -> comma, then tidy the spacing it creates.
 */
export function scrubVoice(text: string): string {
  if (typeof text !== "string") return text;
  return text
    .replace(/\s*[‒–—―]\s*/g, ", ")
    .replace(/\s+,/g, ",")
    .replace(/,\s*,/g, ",")
    .replace(/\s{2,}/g, " ")
    .replace(/^\s*,\s*/, "")
    .replace(/\s*,\s*$/, "")
    .trim();
}

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
  // Same Worldview + voice_rules stack as Outbound / FAB (fail-soft).
  let systemPrompt = VOICE_RULES;
  try {
    const { loadAdminVoiceContextBlock } = await import("../lib/adminVoiceContext");
    const voice = await loadAdminVoiceContextBlock().catch(() => "");
    if (voice.trim()) systemPrompt = `${VOICE_RULES}\n\n${voice}`;
  } catch {
    // Fail-soft: hard VOICE_RULES alone still synthesize.
  }
  const out = await invokeLLM({
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    maxTokens: 3000,
  });
  const raw = out.choices[0]?.message.content ?? "";
  const parsed = tryParseJson<SynthesizeOutput>(raw);
  if (!parsed) return null;
  return {
    overview: scrubVoice(typeof parsed.overview === "string" ? parsed.overview : ""),
    chapters: (Array.isArray(parsed.chapters) ? parsed.chapters : []).map((c) => ({
      ...c,
      title: scrubVoice(c.title),
    })),
    decisions: (Array.isArray(parsed.decisions) ? parsed.decisions : []).map(scrubVoice),
    actionItems: (Array.isArray(parsed.actionItems) ? parsed.actionItems : []).map((a) => ({
      owner: scrubVoice(a.owner),
      item: scrubVoice(a.item),
    })),
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
  // The LLM classifies the work; the deterministic valuation engine prices it.
  scopeTier: ScopeTier;
  impactLevel: ImpactLevel;
  urgency: string | null;
  evidenceQuote: string;
  evidenceTimestampSeconds: number;
}

const SCOPE_TIER_SET = new Set<string>(SCOPE_TIERS);
const IMPACT_LEVEL_SET = new Set<string>(IMPACT_LEVELS);

function coerceScopeTier(v: unknown): ScopeTier {
  return typeof v === "string" && SCOPE_TIER_SET.has(v) ? (v as ScopeTier) : "small";
}
function coerceImpactLevel(v: unknown): ImpactLevel {
  return typeof v === "string" && IMPACT_LEVEL_SET.has(v) ? (v as ImpactLevel) : "normal";
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
    `    "scopeTier": "trivial" | "small" | "medium" | "large" (size of the work in outcomes, never hours: trivial = a quick favor, small = one clear deliverable, medium = a real piece of work, large = a substantial build),`,
    `    "impactLevel": "low" | "normal" | "high" (high = directly serves a land project, unblocks a season, or heals a real relationship or system in the movement; normal = moves the movement forward, most work is here; low = internal polish or nice-to-have),`,
    `    "urgency": string | null (a short note if the call framed this as time-sensitive or hard to fill, else null),`,
    `    "evidenceQuote": string (exact quote from the transcript that produced this task),`,
    `    "evidenceTimestampSeconds": number (approx seconds from the start)`,
    `  }`,
    `Classify the work. Do not propose a reward amount; the system computes that from your classification.`,
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
    .slice(0, MAX_TASKS_PER_RUN)
    .map((t) => ({
      ...t,
      title: scrubVoice(t.title),
      summary: scrubVoice(t.summary),
      scopeTier: coerceScopeTier((t as { scopeTier?: unknown }).scopeTier),
      impactLevel: coerceImpactLevel((t as { impactLevel?: unknown }).impactLevel),
      urgency: typeof (t as { urgency?: unknown }).urgency === "string" ? scrubVoice((t as { urgency: string }).urgency) : null,
      sociocraticOverview: {
        ...t.sociocraticOverview,
        purpose: scrubVoice(t.sociocraticOverview?.purpose),
        whyThisRole: t.sociocraticOverview?.whyThisRole !== undefined
          ? scrubVoice(t.sociocraticOverview.whyThisRole)
          : t.sociocraticOverview?.whyThisRole,
        steps: Array.isArray(t.sociocraticOverview?.steps)
          ? t.sociocraticOverview.steps.map(scrubVoice)
          : t.sociocraticOverview?.steps,
        definitionOfDone: t.sociocraticOverview?.definitionOfDone !== undefined
          ? scrubVoice(t.sociocraticOverview.definitionOfDone)
          : t.sociocraticOverview?.definitionOfDone,
        consentCircle: t.sociocraticOverview?.consentCircle !== undefined
          ? scrubVoice(t.sociocraticOverview.consentCircle)
          : t.sociocraticOverview?.consentCircle,
      },
    }));
}

/**
 * Persist one proposed call_task bounty: price it through the deterministic
 * valuation engine (from the LLM's classification), store the full breakdown
 * and the sociocratic overview, and create the doer role at the computed
 * amount. Shared by the poll loop and reprocessRecording so both price bounties
 * identically. Returns true on success.
 */
async function persistProposedBounty(
  db: DbInstance,
  draft: ProposedTaskDraft,
  recordingId: number,
  matched: { userId: number | null } | null | undefined,
): Promise<void> {
  const breakdown = await computeBountyAmount({
    scopeTier: draft.scopeTier,
    impactLevel: draft.impactLevel,
    priority: false, // hard-to-fill boost is a maintainer/flywheel decision, never proposal-time
    roleSlug: draft.roleSlug,
  });
  const [bResult] = await db.insert(bounties).values({
    sourceType: "call_task",
    title: draft.title.slice(0, 255),
    body: draft.summary,
    tokenType: breakdown.token,
    tier: draft.scopeTier,
    workStatus: "proposed",
    recordingId,
    roleSlug: draft.roleSlug ?? null,
    evidenceQuote: draft.evidenceQuote,
    evidenceTs: Math.max(0, Math.floor(draft.evidenceTimestampSeconds || 0)),
    valuationBreakdown: breakdown as unknown as Record<string, unknown>,
    sociocraticOverviewJson: draft.sociocraticOverview as unknown as Record<string, unknown>,
  });
  const bountyId = (bResult as unknown as { insertId: number }).insertId;
  const assigneeUserId = matched?.userId ?? null;
  await db.insert(bountyRoles).values({
    bountyId,
    role: "doer",
    userId: assigneeUserId,
    amount: breakdown.amount,
    payStatus: assigneeUserId ? "filled" : "unfilled",
    filledByLog: assigneeUserId
      ? [{ userId: assigneeUserId, action: "pipeline_assigned", agent: AGENT_NAME, at: new Date().toISOString() }]
      : null,
  });
}

// ── Orchestrator ─────────────────────────────────────────────────────

export interface PipelineReport {
  pollFetched: number;
  alreadySeen: number;
  skippedByTitle: number;
  skippedByDuration: number;
  editedAttached: number;
  skippedLive: number;
  ingested: number;
  retried: number;
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
    editedAttached: 0,
    skippedLive: 0,
    ingested: 0,
    retried: 0,
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

  const holders = await loadHolders(db);
  const holderByRole = new Map(holders.map((h) => [h.roleSlug, h] as const));

  let cutCache: Awaited<ReturnType<typeof loadEditedCutCache>> | null = null;
  try {
    cutCache = await loadEditedCutCache(db);
  } catch (e) {
    report.errors.push(`edited-cut lookup: ${(e as Error).message}`);
  }

  for (const entry of entries) {
    if (processed >= maxNew) break;

    const [existing] = await db
      .select({ id: recordings.id })
      .from(recordings)
      .where(eq(recordings.youtubeVideoId, entry.videoId))
      .limit(1);
    if (existing) { report.alreadySeen += 1; continue; }

    if (skipRe && skipRe.test(entry.title)) { report.skippedByTitle += 1; continue; }

    // Edited cut of a session we already have: attach it and mail subscribers.
    // This does not insert a second recording and does not wait on a transcript.
    if (cutCache) {
      try {
        const cut = await handleEditedCutPoll(db, entry, cutCache);
        if (cut.action !== "none") {
          if (cut.emailError) report.errors.push(cut.emailError);
          if (cut.action === "attached") {
            report.editedAttached += 1;
            processed += 1;
          } else {
            report.alreadySeen += 1;
          }
          continue;
        }
      } catch (e) {
        report.errors.push(`edited cut ${entry.videoId}: ${(e as Error).message}`);
      }
    }

    const meta = await fetchYouTubeWatchMeta(entry.videoId);
    if (meta.status === "unknown") {
      report.errors.push(`${entry.videoId}: watch page had no player data`);
      continue;
    }
    if (!meta.ended) {
      report.skippedLive += 1;
      continue;
    }
    if ((meta.durationSeconds ?? 0) < MIN_DURATION_SECONDS) {
      report.skippedByDuration += 1;
      continue;
    }

    const youtubeUrl = `https://www.youtube.com/watch?v=${entry.videoId}`;
    const title = (meta.title || entry.title).slice(0, 255);
    const inserted = {
      riversideId: `yt:${entry.videoId}`,
      riversideUrl: null,
      title,
      sessionDate: meta.startTimestamp,
      durationSeconds: meta.durationSeconds,
      youtubeUrl,
      youtubeVideoId: entry.videoId,
      recordingKind: "raw" as const,
      thumbnailUrl: `https://i.ytimg.com/vi/${entry.videoId}/hqdefault.jpg`,
    };
    try {
      try {
        await db.insert(recordings).values({ ...inserted, descriptionChaptersJson: meta.chapters });
      } catch (e) {
        if (!isMissingSchema(e)) throw e;
        await db.insert(recordings).values(inserted);
      }
      report.ingested += 1;
    } catch (e) {
      report.errors.push(`upsert ${entry.videoId}: ${(e as Error).message}`);
      continue;
    }

    let rec: { id: number; title: string; processAttempts: number } | undefined;
    try {
      const [row] = await db
        .select({ id: recordings.id, title: recordings.title, processAttempts: recordings.processAttempts })
        .from(recordings)
        .where(eq(recordings.youtubeVideoId, entry.videoId))
        .limit(1);
      rec = row;
    } catch (e) {
      if (!isMissingSchema(e)) throw e;
      const [row] = await db
        .select({ id: recordings.id, title: recordings.title })
        .from(recordings)
        .where(eq(recordings.youtubeVideoId, entry.videoId))
        .limit(1);
      rec = row ? { ...row, processAttempts: 0 } : undefined;
    }
    if (!rec) continue;

    try {
      await linkRecordingToMatchingEvent(rec.id);
    } catch (e) {
      report.errors.push(`link ${entry.videoId}: ${(e as Error).message}`);
    }

    const understood = await understandRecording(db, rec, holders, holderByRole);
    if (understood.transcript) report.transcribed += 1;
    if (understood.synthesized) report.synthesized += 1;
    report.tasksProposed += understood.tasksProposed;
    if (understood.error) report.errors.push(`${entry.videoId}: ${understood.error}`);

    try {
      await mapRecordingOntoCourse(rec.id);
    } catch (e) {
      report.errors.push(`course map ${entry.videoId}: ${(e as Error).message}`);
    }
    processed += 1;
  }

  try {
    await repairPlaceholderTitles(db);
  } catch (e) {
    if (!isMissingSchema(e)) throw e;
    report.errors.push("recording title repair is not available yet");
  }

  try {
    await sweepRecordingRetries(db, report, holders, holderByRole);
  } catch (e) {
    if (!isMissingSchema(e)) throw e;
    report.errors.push("recording retry columns are not migrated yet");
  }

  rollDayIfNeeded();
  report.llmCallsToday = counters.siteCount;
  return report;
}

const pipelineLog = logger("coordination-pipeline");
const MAX_RETRIES_PER_RUN = 2;

type HolderRow = Awaited<ReturnType<typeof loadHolders>>[number];

async function markProcessFailure(
  db: DbInstance,
  recordingId: number,
  attempts: number,
  error: string,
): Promise<void> {
  const processAttempts = attempts + 1;
  try {
    await db
      .update(recordings)
      .set({
        processAttempts,
        lastError: error.slice(0, 500),
        nextRetryAt: nextProcessRetry(processAttempts, new Date()),
      })
      .where(eq(recordings.id, recordingId));
  } catch (e) {
    if (!isMissingSchema(e)) throw e;
  }
}

async function loadTranscript(videoId: string) {
  return loadYouTubeTranscript(videoId);
}

async function refreshEndedMeta(
  db: DbInstance,
  recordingId: number,
  meta: Extract<YoutubeWatchMeta, { status: "ok" }>,
): Promise<void> {
  const patch: {
    title?: string;
    durationSeconds?: number | null;
    sessionDate?: Date;
    descriptionChaptersJson?: YoutubeWatchMeta extends never ? never : unknown;
  } = {};
  if (meta.title) patch.title = meta.title.slice(0, 255);
  if (meta.durationSeconds) patch.durationSeconds = meta.durationSeconds;
  if (meta.startTimestamp) patch.sessionDate = meta.startTimestamp;
  if (meta.description != null) patch.descriptionChaptersJson = meta.chapters;
  if (Object.keys(patch).length === 0) return;
  try {
    await db.update(recordings).set(patch).where(eq(recordings.id, recordingId));
  } catch (e) {
    if (!isMissingSchema(e)) throw e;
    const { descriptionChaptersJson: _chapters, ...rest } = patch;
    if (Object.keys(rest).length > 0) {
      await db.update(recordings).set(rest).where(eq(recordings.id, recordingId));
    }
  }
}

async function understandRecording(
  db: DbInstance,
  rec: { id: number; title: string; processAttempts: number },
  holders: HolderRow[],
  holderByRole: Map<string, HolderRow>,
): Promise<{ transcript: boolean; synthesized: boolean; tasksProposed: number; error?: string }> {
  let row: { youtubeVideoId: string | null; processAttempts: number; title: string } | undefined;
  try {
    const [loaded] = await db
      .select({
        youtubeVideoId: recordings.youtubeVideoId,
        processAttempts: recordings.processAttempts,
        title: recordings.title,
      })
      .from(recordings)
      .where(eq(recordings.id, rec.id))
      .limit(1);
    row = loaded;
  } catch (e) {
    if (!isMissingSchema(e)) throw e;
    const [loaded] = await db
      .select({
        youtubeVideoId: recordings.youtubeVideoId,
        title: recordings.title,
      })
      .from(recordings)
      .where(eq(recordings.id, rec.id))
      .limit(1);
    row = loaded ? { ...loaded, processAttempts: 0 } : undefined;
  }
  const videoId = row?.youtubeVideoId;
  if (!videoId) return { transcript: false, synthesized: false, tasksProposed: 0, error: "no youtube id" };

  const loaded = await loadTranscript(videoId);
  if (!loaded.ok) {
    await markProcessFailure(db, rec.id, row?.processAttempts ?? rec.processAttempts, loaded.error);
    pipelineLog.error(`transcript failed for recording ${rec.id}: ${loaded.error}`);
    return { transcript: false, synthesized: false, tasksProposed: 0, error: loaded.error };
  }

  try {
    await db
      .update(recordings)
      .set({
        transcript: loaded.text,
        transcriptJson: loaded.segments,
        transcriptSource: loaded.source,
        lastError: null,
        nextRetryAt: null,
      })
      .where(eq(recordings.id, rec.id));
  } catch (e) {
    if (!isMissingSchema(e)) throw e;
    await db
      .update(recordings)
      .set({
        transcript: loaded.text,
        transcriptJson: loaded.segments ?? null,
      })
      .where(eq(recordings.id, rec.id));
  }
  pipelineLog.info(`transcript saved for recording ${rec.id} from ${loaded.source}`);

  let synthesized = false;
  const synth = await runSynthesizePass({ title: row?.title || rec.title, transcript: loaded.text });
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

  let tasksProposed = 0;
  const drafts = await runExtractTasksPass({ title: row?.title || rec.title, transcript: loaded.text, holders });
  for (const draft of drafts) {
    const matched = draft.roleSlug ? holderByRole.get(draft.roleSlug) : null;
    try {
      await persistProposedBounty(db, draft, rec.id, matched);
      tasksProposed += 1;
    } catch (e) {
      pipelineLog.error(`insert task for recording ${rec.id}`, e);
    }
  }

  try {
    const { extractCallInsights } = await import("../lib/call-insights");
    await extractCallInsights(rec.id);
  } catch (e) {
    pipelineLog.error(`call insights for recording ${rec.id}`, e);
  }

  try {
    await finalizeRecording(rec.id);
  } catch (e) {
    pipelineLog.error(`finalize recording ${rec.id}`, e);
  }
  try { await mapRecordingOntoCourse(rec.id); } catch { /* course map errors are non-fatal */ }

  return { transcript: true, synthesized, tasksProposed };
}

/** A stored numeric title is the like-button count. oEmbed has the real name. */
async function repairPlaceholderTitle(
  db: DbInstance,
  recordingId: number,
  storedTitle: string,
  videoId: string,
  watchTitle: string | null,
): Promise<void> {
  if (usableVideoTitle(storedTitle)) return;
  const owner = await fetchYouTubeOwnerSnippet(videoId);
  const candidate = watchTitle || owner?.title || await fetchYouTubeOembedTitle(videoId);
  const next = replacementVideoTitle(storedTitle, candidate);
  const chapters = owner?.chapters ?? [];
  if (!next && chapters.length === 0) return;
  const patch: { title?: string; descriptionChaptersJson?: typeof chapters } = {};
  if (next) patch.title = next;
  if (chapters.length > 0) patch.descriptionChaptersJson = chapters;
  try {
    await db
      .update(recordings)
      .set(patch)
      .where(and(eq(recordings.id, recordingId), eq(recordings.title, storedTitle)));
  } catch (e) {
    if (!isMissingSchema(e)) throw e;
    if (!next) return;
    await db
      .update(recordings)
      .set({ title: next })
      .where(and(eq(recordings.id, recordingId), eq(recordings.title, storedTitle)));
  }
  pipelineLog.info(`repaired title for recording ${recordingId}`, { chapters: chapters.length });
}

async function repairPlaceholderTitles(db: DbInstance): Promise<void> {
  const rows = await db
    .select({
      id: recordings.id,
      title: recordings.title,
      youtubeVideoId: recordings.youtubeVideoId,
    })
    .from(recordings)
    .where(sql`${recordings.youtubeVideoId} IS NOT NULL AND ${recordings.title} REGEXP '^[0-9]+$'`)
    .limit(5);
  for (const row of rows) {
    if (!row.youtubeVideoId) continue;
    await repairPlaceholderTitle(db, row.id, row.title ?? "", row.youtubeVideoId, null);
  }
}

async function sweepRecordingRetries(
  db: DbInstance,
  report: PipelineReport,
  holders: HolderRow[],
  holderByRole: Map<string, HolderRow>,
): Promise<void> {
  const now = new Date();
  const due = await db
    .select({
      id: recordings.id,
      title: recordings.title,
      youtubeVideoId: recordings.youtubeVideoId,
      transcript: recordings.transcript,
      overview: recordings.overview,
      aiSummary: recordings.aiSummary,
      processAttempts: recordings.processAttempts,
      nextRetryAt: recordings.nextRetryAt,
      lastError: recordings.lastError,
    })
    .from(recordings)
    .where(and(
      sql`${recordings.youtubeVideoId} IS NOT NULL`,
      or(isNull(recordings.transcript), eq(recordings.transcript, "")),
      or(isNull(recordings.overview), eq(recordings.overview, "")),
      or(isNull(recordings.aiSummary), eq(recordings.aiSummary, "")),
      lt(recordings.processAttempts, MAX_PROCESS_ATTEMPTS),
      or(
        isNull(recordings.nextRetryAt),
        lte(recordings.nextRetryAt, now),
        eq(recordings.lastError, FALSE_NOT_ENDED_ERROR),
        eq(recordings.lastError, EMPTY_OWNER_CAPTION_LIST_ERROR),
      ),
    ));

  const queued = due
    .filter((row) => recordingNeedsAutoRetry(row, now) && !!row.youtubeVideoId)
    .sort((a, b) => compareRetryQueue(
      { id: a.id, processAttempts: effectiveRetryAttempts(a) },
      { id: b.id, processAttempts: effectiveRetryAttempts(b) },
    ))
    .slice(0, MAX_RETRIES_PER_RUN);

  for (const row of queued) {
    if (!row.youtubeVideoId) continue;
    report.retried += 1;
    pipelineLog.info(`retry recording ${row.id} ${row.youtubeVideoId} attempt ${row.processAttempts ?? 0}`);
    const meta = await fetchYouTubeWatchMeta(row.youtubeVideoId);
    if (captionRetryDespiteWatch(meta) === "wait") {
      if (meta.status === "ok" && meta.title) {
        await db.update(recordings).set({ title: meta.title.slice(0, 255) }).where(eq(recordings.id, row.id));
      }
      const state = meta.status === "ok" ? meta.liveBroadcastContent : "unknown";
      const error = `stream has not ended (${state})`;
      await markProcessFailure(db, row.id, row.processAttempts, error);
      report.errors.push(`${row.id} ${row.youtubeVideoId}: ${error}`);
      continue;
    }
    if (meta.status === "unknown") {
      pipelineLog.info(`retry recording ${row.id}: watch page had no player data; trying owner captions`);
    } else {
      await refreshEndedMeta(db, row.id, meta);
    }
    if (row.youtubeVideoId) {
      await repairPlaceholderTitle(
        db,
        row.id,
        row.title ?? "",
        row.youtubeVideoId,
        meta.status === "ok" ? meta.title : null,
      );
    }
    try {
      await linkRecordingToMatchingEvent(row.id);
    } catch (e) {
      report.errors.push(`link ${row.youtubeVideoId}: ${(e as Error).message}`);
    }
    const understood = await understandRecording(db, row, holders, holderByRole);
    if (understood.transcript) report.transcribed += 1;
    if (understood.synthesized) report.synthesized += 1;
    report.tasksProposed += understood.tasksProposed;
    if (understood.error) report.errors.push(`${row.youtubeVideoId}: ${understood.error}`);
  }
}

/**
 * Force one already-ingested recording through metadata refresh, transcript,
 * synthesize, tasks, and finalize. Does not clear emailSent, so a letter that
 * already went out is not sent again.
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
    .select({
      id: recordings.id,
      title: recordings.title,
      youtubeVideoId: recordings.youtubeVideoId,
      processAttempts: recordings.processAttempts,
    })
    .from(recordings)
    .where(eq(recordings.id, recordingId))
    .limit(1);
  if (!rec || !rec.youtubeVideoId) {
    return { ok: false, transcript: false, synthesized: false, tasksProposed: 0, reason: "not_found_or_no_video" };
  }

  const meta = await fetchYouTubeWatchMeta(rec.youtubeVideoId);
  if (captionRetryDespiteWatch(meta) === "wait") {
    if (meta.status === "ok" && meta.title) {
      await db.update(recordings).set({ title: meta.title.slice(0, 255) }).where(eq(recordings.id, rec.id));
    }
    const state = meta.status === "ok" ? meta.liveBroadcastContent : "unknown";
    const error = `stream has not ended (${state})`;
    await markProcessFailure(db, rec.id, rec.processAttempts, error);
    return { ok: false, transcript: false, synthesized: false, tasksProposed: 0, reason: error };
  }
  if (meta.status === "ok") {
    await refreshEndedMeta(db, rec.id, meta);
    try { await linkRecordingToMatchingEvent(rec.id); } catch { /* link errors are non-fatal */ }
  }
  await repairPlaceholderTitle(
    db,
    rec.id,
    rec.title ?? "",
    rec.youtubeVideoId,
    meta.status === "ok" ? meta.title : null,
  );

  const holders = await loadHolders(db);
  const holderByRole = new Map(holders.map((h) => [h.roleSlug, h] as const));
  const understood = await understandRecording(db, rec, holders, holderByRole);
  if (!understood.transcript) {
    return {
      ok: false,
      transcript: false,
      synthesized: false,
      tasksProposed: 0,
      reason: understood.error || "no_transcript",
    };
  }
  return {
    ok: true,
    transcript: true,
    synthesized: understood.synthesized,
    tasksProposed: understood.tasksProposed,
  };
}

const kickCoordinationPipeline = createSingleFlight(async () => {
  try {
    const report = await runCoordinationPipeline({});
    pipelineLog.info("background pipeline finished", {
      ingested: report.ingested,
      retried: report.retried,
      transcribed: report.transcribed,
      errors: report.errors.slice(0, 8),
    });
  } catch (err) {
    pipelineLog.error("background pipeline failed", err);
  }
});

/** Ack the cron HTTP call, then keep working on this process. Overlapping crons do not stack. */
export function startCoordinationPipelineBackground(): { started: boolean } {
  return kickCoordinationPipeline();
}
