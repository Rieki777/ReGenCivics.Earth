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
import { and, asc, desc, eq, inArray, isNotNull, lte, or, sql } from "drizzle-orm";
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

  return {
    due,
    raw: n("raw"),
    ready: n("ready"),
    inFlight: n("in_flight"),
    claimed: n("done_claimed"),
  };
}
