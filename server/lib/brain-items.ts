/**
 * Item operations for the second-brain command center.
 *
 * These live in a library rather than in the tRPC router because every writer
 * of work items goes through ONE path (response doc 17.1): the web, the
 * Telegram bot, the importer and the feedback receiver all call these, and the
 * vault copy is regenerated from the result. Two write paths for one kind of
 * item is how the two brains drift apart within a week.
 *
 * The gate rule these enforce: `ready` is set by the owner or not at all.
 * `setItemState` refuses to write it, `promoteItem` is the only door, and it
 * checks `promotionBlockers` before it opens.
 *
 * Item bodies are UNTRUSTED TEXT. They are transcripts, captions, forwarded
 * messages and fork payloads. Nothing here re-prompts on a body, executes it,
 * or lets it choose its own state.
 */
import { TRPCError } from "@trpc/server";
import { and, asc, desc, eq, gte, inArray, isNotNull, lte, or, sql } from "drizzle-orm";
import { getDb } from "../db";
import { brainAudit, brainItems, type BrainItem } from "../../drizzle/schema";
import {
  canTransition,
  GATED_FIELDS,
  promotionBlockers,
  readyHash,
  type BrainKind,
  type BrainState,
} from "./brain-gate";

export type Via = "web" | "telegram" | "api" | "import" | "webhook";

/** Re-exported so callers of these operations need not reach into the schema. */
export type { BrainItem };

export const BRAIN_KINDS = [
  "unsorted",
  "create",
  "build",
  "todo",
  "ask",
  "decide",
  "material",
] as const satisfies readonly BrainKind[];

export const BRAIN_STATES = [
  "raw",
  "shaped",
  "ready",
  "in_flight",
  "done_claimed",
  "done",
  "parked",
] as const satisfies readonly BrainState[];

async function requireDb() {
  const drizzle = await getDb();
  if (!drizzle) {
    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
  }
  return drizzle;
}

type Db = Awaited<ReturnType<typeof requireDb>>;

/** First line of the body, trimmed to something that fits a list row. */
export function titleFrom(body: string): string {
  const first = (body.trim().split("\n")[0] ?? "").trim();
  if (!first) return "untitled";
  return first.length > 120 ? `${first.slice(0, 117)}...` : first;
}

async function audit(
  db: Db,
  ownerId: number,
  itemId: number,
  action: string,
  detail: unknown,
  via: Via,
): Promise<void> {
  await db.insert(brainAudit).values({
    ownerId,
    itemId,
    action,
    detail: detail as never,
    via,
  });
}

async function loadOwned(db: Db, ownerId: number, id: number): Promise<BrainItem> {
  const [row] = await db
    .select()
    .from(brainItems)
    .where(and(eq(brainItems.id, id), eq(brainItems.ownerId, ownerId)))
    .limit(1);
  if (!row) throw new TRPCError({ code: "NOT_FOUND", message: `No item #${id}` });
  return row;
}

async function loadBySource(db: Db, ownerId: number, source: string): Promise<BrainItem> {
  const [row] = await db
    .select()
    .from(brainItems)
    .where(and(eq(brainItems.ownerId, ownerId), eq(brainItems.source, source)))
    .limit(1);
  if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "Item vanished after write" });
  return row;
}

export async function getItem(ownerId: number, id: number): Promise<BrainItem> {
  return loadOwned(await requireDb(), ownerId, id);
}

export interface ListFilter {
  kind?: BrainKind;
  kinds?: BrainKind[];
  state?: BrainState;
  states?: BrainState[];
  repo?: string;
  q?: string;
  limit?: number;
}

export async function listItems(ownerId: number, filter: ListFilter = {}): Promise<BrainItem[]> {
  const db = await requireDb();
  const conds = [eq(brainItems.ownerId, ownerId)];
  if (filter.kind) conds.push(eq(brainItems.kind, filter.kind));
  if (filter.kinds?.length) conds.push(inArray(brainItems.kind, filter.kinds));
  if (filter.state) conds.push(eq(brainItems.state, filter.state));
  if (filter.states?.length) conds.push(inArray(brainItems.state, filter.states));
  if (filter.repo) conds.push(eq(brainItems.repo, filter.repo));
  if (filter.q) {
    // LIKE, not FULLTEXT: the phone's search is Task 9.1. Escape the wildcards
    // so a literal % in a note does not match the whole table.
    const needle = `%${filter.q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
    conds.push(
      or(
        sql`${brainItems.title} LIKE ${needle}`,
        sql`${brainItems.ask} LIKE ${needle}`,
        sql`${brainItems.body} LIKE ${needle}`,
      )!,
    );
  }
  return db
    .select()
    .from(brainItems)
    .where(and(...conds))
    .orderBy(desc(brainItems.updatedAt))
    .limit(Math.min(Math.max(filter.limit ?? 200, 1), 500));
}

export interface CreateInput {
  body: string;
  source: string;
  kind?: BrainKind;
  attachments?: string[];
  proposed?: Record<string, unknown>;
  followsId?: number | null;
  capturedAt?: Date;
  trust?: "owner" | "external";
  title?: string;
}

/**
 * Idempotent on (ownerId, source): the importer re-runs, Telegram redelivers,
 * and the bridge replays, so a second write of the same source must update
 * rather than duplicate. Never sets `state`: everything starts `raw`.
 */
export async function createItem(
  ownerId: number,
  input: CreateInput,
  via: Via = "web",
): Promise<BrainItem> {
  const db = await requireDb();
  const title = input.title?.trim() || titleFrom(input.body);
  await db
    .insert(brainItems)
    .values({
      ownerId,
      kind: input.kind ?? "unsorted",
      title,
      body: input.body,
      source: input.source,
      attachments: input.attachments ?? [],
      proposed: input.proposed ?? null,
      followsId: input.followsId ?? null,
      capturedAt: input.capturedAt ?? new Date(),
      trust: input.trust ?? "owner",
    })
    .onDuplicateKeyUpdate({ set: { updatedAt: new Date() } });
  const row = await loadBySource(db, ownerId, input.source);
  await audit(db, ownerId, row.id, "create", { source: input.source, via }, via);
  return row;
}

export interface UpdateInput {
  id: number;
  kind?: BrainKind;
  title?: string;
  ask?: string | null;
  doneWhen?: string | null;
  blockedOn?: string | null;
  due?: string | null;
  effort?: "S" | "M" | "L" | null;
  priority?: "now" | "soon" | "someday";
  repo?: string | null;
  surface?: string | null;
  followsId?: number | null;
  evidence?: string | null;
}

/**
 * Editing a gated field (ask / done_when / repo / surface) on a `ready` item
 * demotes it to `shaped` and tears up the receipt, so a session that embedded
 * the old hash can tell the ground moved (response doc §12).
 */
export async function updateItem(
  ownerId: number,
  input: UpdateInput,
  via: Via = "web",
): Promise<BrainItem> {
  const db = await requireDb();
  const before = await loadOwned(db, ownerId, input.id);
  const { id, due, ...rest } = input;

  const set: Record<string, unknown> = { ...rest };
  if (due !== undefined) set.due = due ? new Date(due) : null;

  const touchedGated = GATED_FIELDS.some(
    (k) => rest[k] !== undefined && rest[k] !== (before as unknown as Record<string, unknown>)[k],
  );
  if (before.state === "ready" && touchedGated) {
    Object.assign(set, { state: "shaped", readyBy: null, readyAt: null, readyHash: null });
  }
  // A raw item that gains a kind, an ask or a done_when has been shaped.
  if (before.state === "raw" && (rest.ask || rest.doneWhen || rest.kind)) {
    set.state = "shaped";
  }

  if (Object.keys(set).length > 0) {
    await db
      .update(brainItems)
      .set(set as never)
      .where(and(eq(brainItems.id, id), eq(brainItems.ownerId, ownerId)));
  }
  await audit(db, ownerId, id, "update", { fields: Object.keys(rest), demoted: touchedGated && before.state === "ready" }, via);
  return loadOwned(db, ownerId, id);
}

/**
 * Every state change EXCEPT ready. Promotion has its own door with its own
 * checks; letting this write `ready` would be a second, uncheckedone.
 */
export async function setItemState(
  ownerId: number,
  id: number,
  state: BrainState,
  via: Via = "web",
  evidence?: string,
): Promise<BrainItem> {
  const db = await requireDb();
  const item = await loadOwned(db, ownerId, id);
  if (state === "ready") {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Use promote for ready" });
  }
  if (!canTransition(item.state as BrainState, state)) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: `Cannot move ${item.state} to ${state}`,
    });
  }
  await db
    .update(brainItems)
    .set({
      state,
      evidence: evidence ?? item.evidence,
      closedBy: state === "done" ? `owner:${ownerId}` : item.closedBy,
    })
    .where(and(eq(brainItems.id, item.id), eq(brainItems.ownerId, ownerId)));
  await audit(db, ownerId, item.id, `state:${state}`, { from: item.state }, via);
  return loadOwned(db, ownerId, item.id);
}

/**
 * The gate. The caller must already have proved it is the owner (every caller
 * is behind ownerProcedure or the bot's owner-id check); this adds the content
 * checks and writes the receipt.
 */
export async function promoteItem(
  ownerId: number,
  id: number,
  via: Via = "web",
): Promise<BrainItem> {
  const db = await requireDb();
  const item = await loadOwned(db, ownerId, id);
  const blockers = promotionBlockers(item);
  if (blockers.length) {
    throw new TRPCError({ code: "PRECONDITION_FAILED", message: blockers.join("; ") });
  }
  if (!canTransition(item.state as BrainState, "ready")) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: `Cannot promote from ${item.state}`,
    });
  }
  const hash = readyHash(item);
  await db
    .update(brainItems)
    .set({ state: "ready", readyBy: ownerId, readyAt: new Date(), readyHash: hash })
    .where(and(eq(brainItems.id, item.id), eq(brainItems.ownerId, ownerId)));
  await audit(db, ownerId, item.id, "promote", { hash }, via);
  return loadOwned(db, ownerId, item.id);
}

/**
 * Two things in one capture: keep the first, create the second as raw with
 * `follows` pointing back. Attachments are copied because the screenshot
 * usually belongs to both halves.
 */
export async function splitItem(
  ownerId: number,
  id: number,
  secondBody: string,
  via: Via = "web",
): Promise<[BrainItem, BrainItem]> {
  const db = await requireDb();
  const first = await loadOwned(db, ownerId, id);
  const source = `${first.source}#split-${Date.now()}`;
  await db.insert(brainItems).values({
    ownerId,
    kind: "unsorted",
    title: titleFrom(secondBody),
    body: secondBody,
    source,
    followsId: first.id,
    attachments: (first.attachments as string[] | null) ?? [],
    trust: first.trust,
    capturedAt: first.capturedAt ?? new Date(),
  });
  const second = await loadBySource(db, ownerId, source);
  await audit(db, ownerId, first.id, "split", { secondId: second.id }, via);
  return [first, second];
}

export interface TodaySummary {
  due: BrainItem[];
  raw: number;
  ready: number;
  inFlight: number;
  claimed: number;
  /**
   * Open items per half of the brain (ADDENDUM-1 item 1). Reported separately
   * everywhere they are shown: the personal lane is Rye's ops queue and it is
   * never mixed into a ReGen number.
   */
  openByRealm: { regen: number; personal: number };
}

/**
 * What the Today view and the bot's /today both answer from. "Due" is anything
 * overdue or due today, plus `priority: now`, because almost nothing has a due
 * date yet and a Today that is empty on day one teaches Rye to stop opening it
 * (17.9).
 */
export async function summarizeToday(ownerId: number): Promise<TodaySummary> {
  const db = await requireDb();
  const open: BrainState[] = ["raw", "shaped", "ready", "in_flight", "done_claimed"];
  const today = new Date();
  today.setHours(23, 59, 59, 999);

  const due = await db
    .select()
    .from(brainItems)
    .where(
      and(
        eq(brainItems.ownerId, ownerId),
        inArray(brainItems.state, open),
        or(
          and(isNotNull(brainItems.due), lte(brainItems.due, today)),
          eq(brainItems.priority, "now"),
        )!,
      ),
    )
    .orderBy(asc(brainItems.due), desc(brainItems.updatedAt))
    .limit(50);

  const counts = await db
    .select({ state: brainItems.state, n: sql<number>`COUNT(*)` })
    .from(brainItems)
    .where(eq(brainItems.ownerId, ownerId))
    .groupBy(brainItems.state);
  const n = (s: BrainState) => Number(counts.find((c) => c.state === s)?.n ?? 0);

  const realms = await db
    .select({ realm: brainItems.realm, n: sql<number>`COUNT(*)` })
    .from(brainItems)
    .where(and(eq(brainItems.ownerId, ownerId), inArray(brainItems.state, open)))
    .groupBy(brainItems.realm);
  const r = (v: "regen" | "personal") => Number(realms.find((x) => x.realm === v)?.n ?? 0);

  return {
    due,
    raw: n("raw"),
    ready: n("ready"),
    inFlight: n("in_flight"),
    claimed: n("done_claimed"),
    openByRealm: { regen: r("regen"), personal: r("personal") },
  };
}

// ── The "probably done" triage queue (ADDENDUM-1 item 2) ─────────────────────
//
// Nine of the ten items Rye archived in the calibration sample were "this work
// was already done". For the old imported rows that is the dominant open
// question, and he answers it in seconds when he is shown the screenshot and
// three buttons. This is the queue that asks.
//
// The flag itself is set at import time; the rule and its measured error rate
// live in `scripts/import-brain-items.ts` (`maybeDone`). Everything here reads
// the flag, never recomputes it.

/** How long "not sure" parks an item before it comes back around. */
export const TRIAGE_SNOOZE_DAYS = 7;

/** Stamped on `closed_by` so a triage close is distinguishable from every other. */
export const TRIAGE_CLOSED_BY = "rye-triage";

export type TriageAnswer = "done" | "open" | "unsure";

/**
 * Snoozes are stored as an ISO 8601 UTC string, and the comparison below is a
 * string comparison. That is only correct because ISO 8601 UTC sorts
 * lexicographically the same way it sorts chronologically; a locale format
 * would silently compare wrong. Written here so nobody "tidies" the format.
 */
function isoNow(): string {
  return new Date().toISOString();
}

const maybeDoneTrue = sql`JSON_EXTRACT(${brainItems.proposed}, '$.maybe_done') = CAST('true' AS JSON)`;

/**
 * Absent, JSON null, or in the past all mean "ask me about this now". Both null
 * cases are spelled out: a missing path gives SQL NULL, a literal `null` in the
 * JSON gives the string "null", which would otherwise sort after any date and
 * park the item forever.
 */
function notSnoozed(now: string) {
  const p = sql`JSON_EXTRACT(${brainItems.proposed}, '$.maybe_done_snoozed_until')`;
  return sql`(${p} IS NULL OR JSON_TYPE(${p}) = 'NULL' OR JSON_UNQUOTE(${p}) <= ${now})`;
}

/**
 * What the triage queue serves: raw items flagged `maybe_done`, oldest capture
 * first, snoozed ones held back. Oldest first because age is the whole reason
 * the item is here, and the June rows are the ones most likely already shipped.
 */
export async function triageQueue(ownerId: number, limit = 5): Promise<BrainItem[]> {
  const db = await requireDb();
  return db
    .select()
    .from(brainItems)
    .where(
      and(
        eq(brainItems.ownerId, ownerId),
        eq(brainItems.state, "raw"),
        maybeDoneTrue,
        notSnoozed(isoNow()),
      ),
    )
    .orderBy(asc(brainItems.capturedAt), asc(brainItems.id))
    .limit(Math.min(Math.max(limit, 1), 20));
}

/** How many questions the queue still has, snoozed ones excluded. */
export async function triagePending(ownerId: number): Promise<number> {
  const db = await requireDb();
  const [row] = await db
    .select({ n: sql<number>`COUNT(*)` })
    .from(brainItems)
    .where(
      and(
        eq(brainItems.ownerId, ownerId),
        eq(brainItems.state, "raw"),
        maybeDoneTrue,
        notSnoozed(isoNow()),
      ),
    );
  return Number(row?.n ?? 0);
}

/**
 * Every triage key shares the `maybe_done` prefix, and the importer's
 * `mergeTriageState` preserves exactly that prefix on a re-run. Keep the names
 * in step or a re-import will resurrect a question Rye already answered.
 */
function withAnswer(
  proposed: Record<string, unknown> | null,
  answer: TriageAnswer,
  extra: Record<string, unknown> = {},
): Record<string, unknown> {
  const next: Record<string, unknown> = { ...(proposed ?? {}) };
  delete next.maybe_done;
  delete next.maybe_done_snoozed_until;
  next.maybe_done_answer = answer;
  next.maybe_done_answered_at = isoNow();
  return { ...next, ...extra };
}

/**
 * Close a raw item as already-finished.
 *
 * NOT through `setItemState`: the state machine has no `raw` -> `done` edge, on
 * purpose, and a test in server/brain-gate.test.ts says so out loud. A live
 * item earns `done` by going through the gate. This is the same exception the
 * importer takes for the 529 archived rows, for the same reason: the owner is
 * saying the work was finished before it was ever filed, which is a fact about
 * the past, not a move through the pipeline. So it writes the one column pair
 * directly, refuses every state but `raw`, cannot express `ready`, and files
 * the `state:done` audit row itself, because `brain.status` counts the week's
 * closes from exactly that string.
 */
async function closeFromRaw(
  db: Db,
  ownerId: number,
  item: BrainItem,
  proposed: Record<string, unknown>,
  via: Via,
): Promise<void> {
  if (item.state !== "raw") {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: `triage closes raw items; #${item.id} is ${item.state}`,
    });
  }
  await db
    .update(brainItems)
    .set({ state: "done", closedBy: TRIAGE_CLOSED_BY, proposed: proposed as never })
    .where(and(eq(brainItems.id, item.id), eq(brainItems.ownerId, ownerId)));
  await audit(db, ownerId, item.id, "state:done", { from: item.state, via: "triage" }, via);
}

/**
 * The three answers. One audit row each, and the `done` row is `state:done` so
 * the week's closed-count in `brain.status` sees it.
 *
 *   done   -> state done, closed_by rye-triage
 *   open   -> flag cleared, state untouched; the item goes back to the normal
 *             queue as an ordinary raw item
 *   unsure -> flag kept, parked for a week
 *
 * Answering is idempotent in the direction that matters: an item already `done`
 * is returned unchanged rather than closed twice, so a double-tap on Telegram
 * cannot write a second `state:done` and inflate the metric.
 */
export async function answerTriage(
  ownerId: number,
  id: number,
  answer: TriageAnswer,
  via: Via = "web",
): Promise<BrainItem> {
  const db = await requireDb();
  const item = await loadOwned(db, ownerId, id);
  const proposed = (item.proposed as Record<string, unknown> | null) ?? null;

  if (answer === "done") {
    if (item.state === "done") return item;
    await closeFromRaw(db, ownerId, item, withAnswer(proposed, "done"), via);
    return loadOwned(db, ownerId, id);
  }

  const next =
    answer === "unsure"
      ? withAnswer(proposed, "unsure", {
          maybe_done: true,
          maybe_done_snoozed_until: new Date(
            Date.now() + TRIAGE_SNOOZE_DAYS * 24 * 60 * 60 * 1000,
          ).toISOString(),
        })
      : withAnswer(proposed, "open");

  await db
    .update(brainItems)
    .set({ proposed: next as never })
    .where(and(eq(brainItems.id, id), eq(brainItems.ownerId, ownerId)));
  await audit(db, ownerId, id, `triage:${answer}`, { state: item.state }, via);
  return loadOwned(db, ownerId, id);
}

// ── The week's metric ────────────────────────────────────────────────────────

/**
 * A missing table is a deployment state, not a bug: migration 0230 may not be
 * applied yet on a given environment, and a heartbeat that crashes the page is
 * worse than one that reports zero.
 */
export function isMissingTableError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return /ER_NO_SUCH_TABLE|doesn't exist|no such table/i.test(msg);
}

/**
 * Monday 00:00 local, so "this week" lines up with the Monday morning message
 * rather than drifting on a rolling window (addendum 2, item 8).
 */
export function startOfWeek(now = new Date()): Date {
  const d = new Date(now);
  const dow = (d.getDay() + 6) % 7; // Monday = 0
  d.setDate(d.getDate() - dow);
  d.setHours(0, 0, 0, 0);
  return d;
}

export interface WeekMetrics {
  weekStart: Date;
  closedThisWeek: number;
  promotedThisWeek: number;
}

/**
 * The month-one metric. Counted from `brain_audit`, not from current state: the
 * audit records the EVENT, so reopening an item later cannot rewrite the week
 * in which it was closed. `state:done` is the exact action string every closer
 * writes, triage included; change it in one place and this silently reads zero.
 *
 * Scoped to the owner, which the first version of this query in the router was
 * not. Single-owner today, wrong the day it is not.
 */
export async function weekMetrics(ownerId: number, now = new Date()): Promise<WeekMetrics> {
  const weekStart = startOfWeek(now);
  const empty = { weekStart, closedThisWeek: 0, promotedThisWeek: 0 };
  const db = await requireDb();
  try {
    const rows = await db
      .select({ action: brainAudit.action, n: sql<number>`COUNT(*)` })
      .from(brainAudit)
      .where(
        and(
          eq(brainAudit.ownerId, ownerId),
          gte(brainAudit.createdAt, weekStart),
          inArray(brainAudit.action, ["state:done", "promote"]),
        ),
      )
      .groupBy(brainAudit.action);
    return {
      weekStart,
      closedThisWeek: Number(rows.find((r) => r.action === "state:done")?.n ?? 0),
      promotedThisWeek: Number(rows.find((r) => r.action === "promote")?.n ?? 0),
    };
  } catch (err) {
    if (!isMissingTableError(err)) throw err;
    return empty;
  }
}
