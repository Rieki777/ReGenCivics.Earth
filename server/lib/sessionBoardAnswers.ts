/**
 * Answers on a session board (Week 3 onward, API_CONTRACT sections 2, 3.4,
 * 3.5 and 3.8): one row per person per prompt key and project, written only
 * through `answerOnBoard`, the un-pick cascade for a human need, and moving a
 * guest browser's rows to the account that signs in on it.
 *
 * Every write that has to respect a prompt's `max` runs in one transaction
 * that locks the board row first, the same way `actOnBoard` does, so a double
 * tap or two devices can never pass the limit. The locking read comes first in
 * each transaction, so the reads after it see whatever the previous writer
 * committed.
 */
import { TRPCError } from "@trpc/server";
import { and, asc, desc, eq, inArray, isNull, like, or, sql, type SQL } from "drizzle-orm";
import {
  sessionBoardItems,
  sessionBoardProjects,
  sessionBoardVotes,
  sessionBoards,
} from "../../drizzle/schema";
import {
  BOARD_LIMITS,
  PROMPT_COPY,
  applyBoardAction,
  cleanBoardLine,
  normalizeBoardState,
  promptFull,
  promptMax,
  promptsForWeek,
  voteTarget,
  type BoardPrompt,
} from "@shared/sessionBoard";
import { NEEDS_KEYS, perNeedKeys } from "@shared/humanNeeds";
import { CARD_COPY, CARD_TEXT_MAX, cardKindOfKey, cardSlotKeys, cardText, parseCard } from "@shared/boardCards";
import type { Db } from "./sessionBoard";

/** The handle a drizzle transaction callback receives. */
export type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];

export const ANSWER_COPY = {
  unknown: "That question isn't on this board.",
  private: "That one stays on your screen.",
  ask: "Add a question with the question box.",
  takesWords: "That question takes words.",
  tapChoice: "Tap one of the choices.",
  notOnBoard: "That project is not on this board.",
  empty: "Write something first.",
  tooMany: "You've answered a lot on this board already. Ask the facilitator to add the rest.",
  full: "This board is full.",
  rewordPick: "A pick can't be reworded. Hide it instead.",
  rewordCard: "A card can't be reworded here. Its writer can change it, or hide it instead.",
} as const;

export type AnswerInput =
  | { op: "pick"; key: string; projectId: number | null; option: string; on: boolean; displayName?: string }
  | { op: "note"; key: string; projectId: number | null; text: string; displayName?: string; fresh?: boolean };

export type AnswerResult = { ok: true; id: number | null; removedIds: number[] };

function bad(message: string): never {
  throw new TRPCError({ code: "BAD_REQUEST", message });
}

function insertId(res: unknown): number {
  const r = Array.isArray(res) ? res[0] : res;
  return Number((r as { insertId?: number })?.insertId ?? 0);
}

function affectedRows(res: unknown): number {
  const r = Array.isArray(res) ? res[0] : res;
  return Number((r as { affectedRows?: number })?.affectedRows ?? 0);
}

/** `projectId <=> pid`, spelled so drizzle builds it. */
function sameProject(pid: number | null): SQL {
  return pid == null ? isNull(sessionBoardItems.projectId) : eq(sessionBoardItems.projectId, pid);
}

async function lockBoard(tx: Tx, boardId: number) {
  const [row] = await tx
    .select({ id: sessionBoards.id, week: sessionBoards.week })
    .from(sessionBoards)
    .where(eq(sessionBoards.id, boardId))
    .for("update");
  return row ?? null;
}

async function bump(tx: Tx, boardId: number) {
  await tx
    .update(sessionBoards)
    .set({ version: sql`${sessionBoards.version} + 1` })
    .where(eq(sessionBoards.id, boardId));
}

/**
 * The checks that need no lock: the prompt exists on this week's board and
 * takes this kind of answer, the project is an unhidden card here (or the
 * prompt is for the room), and a note has words. Returns what to store.
 */
export async function checkAnswer(
  db: Db,
  boardId: number,
  week: number,
  input: AnswerInput,
): Promise<{ prompt: BoardPrompt; projectId: number | null; text: string; displayName: string | null }> {
  const prompt = promptsForWeek(week).get(input.key);
  if (!prompt) throw new TRPCError({ code: "NOT_FOUND", message: ANSWER_COPY.unknown });
  if (prompt.mode === "private") bad(ANSWER_COPY.private);
  if (prompt.mode === "ask") bad(ANSWER_COPY.ask);
  if (input.op === "pick" && prompt.mode !== "pick") bad(ANSWER_COPY.takesWords);
  if (input.op === "note" && prompt.mode !== "note") bad(ANSWER_COPY.tapChoice);
  if (input.op === "pick" && !(prompt.options ?? []).some((o) => o.key === input.option)) bad(ANSWER_COPY.tapChoice);

  let projectId: number | null = null;
  if (prompt.scope !== "room" && !prompt.anonymous && input.projectId != null) {
    const [card] = await db
      .select({ id: sessionBoardProjects.id, hidden: sessionBoardProjects.hidden })
      .from(sessionBoardProjects)
      .where(and(eq(sessionBoardProjects.id, input.projectId), eq(sessionBoardProjects.boardId, boardId)))
      .limit(1);
    if (!card || card.hidden) throw new TRPCError({ code: "NOT_FOUND", message: ANSWER_COPY.notOnBoard });
    projectId = card.id;
  }

  let text = "";
  if (input.op === "note" && prompt.card) {
    // A card (Week 4 on): every field cleaned and checked, stored in short keys.
    const card = parseCard(prompt.card, input.text);
    if (!card) bad(CARD_COPY.bad[prompt.card]);
    text = cardText(prompt.card, card);
    if (text.length > CARD_TEXT_MAX) bad(CARD_COPY.tooLong);
  } else if (input.op === "note") {
    text = cleanBoardLine(input.text, prompt.maxText ?? BOARD_LIMITS.note) ?? "";
    if (!text) bad(ANSWER_COPY.empty);
  } else {
    text = input.option;
  }
  const displayName = prompt.anonymous ? null : cleanBoardLine(input.displayName, BOARD_LIMITS.displayName);
  return { prompt, projectId, text, displayName };
}

/** The answer ceilings: per person (not for facilitators) and per board. */
async function checkAnswerCaps(tx: Tx, boardId: number, keys: string[], facilitator: boolean) {
  if (!facilitator) {
    const [mine] = await tx
      .select({ n: sql<number>`COUNT(*)` })
      .from(sessionBoardItems)
      .where(and(
        eq(sessionBoardItems.boardId, boardId),
        eq(sessionBoardItems.kind, "answer"),
        inArray(sessionBoardItems.authorKey, keys),
      ));
    if (Number(mine?.n ?? 0) >= BOARD_LIMITS.answersPerAuthor) bad(ANSWER_COPY.tooMany);
  }
  // Hidden answers don't count toward the board's ceiling, so hiding spam frees room.
  const [all] = await tx
    .select({ n: sql<number>`COUNT(*)` })
    .from(sessionBoardItems)
    .where(and(eq(sessionBoardItems.boardId, boardId), eq(sessionBoardItems.kind, "answer"), eq(sessionBoardItems.hidden, 0)));
  if (Number(all?.n ?? 0) >= BOARD_LIMITS.answersPerBoard) bad(ANSWER_COPY.full);
}

/**
 * Un-picking a human need takes its seed and its per-need answers with it,
 * for the same person and project. Returns the ids it removed.
 */
export async function cascadeNeedRemoval(
  tx: Tx,
  boardId: number,
  projectId: number | null,
  keys: string[],
  needId: string,
): Promise<number[]> {
  if (keys.length === 0) return [];
  const rows = await tx
    .select({ id: sessionBoardItems.id })
    .from(sessionBoardItems)
    .where(and(
      eq(sessionBoardItems.boardId, boardId),
      eq(sessionBoardItems.kind, "answer"),
      sameProject(projectId),
      inArray(sessionBoardItems.authorKey, keys),
      or(
        and(eq(sessionBoardItems.block, NEEDS_KEYS.seed), eq(sessionBoardItems.text, needId)),
        inArray(sessionBoardItems.block, perNeedKeys(needId)),
      ),
    ));
  const ids = rows.map((r) => r.id);
  if (ids.length) await tx.delete(sessionBoardItems).where(inArray(sessionBoardItems.id, ids));
  return ids;
}

/**
 * Save one answer (API_CONTRACT 3.5). The router has already checked the
 * caller's keys and that the board takes writes.
 */
export async function answerOnBoard(
  db: Db,
  opts: { boardId: number; week: number; keys: string[]; facilitator: boolean; input: AnswerInput },
): Promise<AnswerResult> {
  const { boardId, week, keys, facilitator, input } = opts;
  const checked = await checkAnswer(db, boardId, week, input);
  const { projectId, text, displayName } = checked;
  let prompt = checked.prompt;
  const max = promptMax(prompt);

  return db.transaction(async (tx) => {
    await lockBoard(tx, boardId);
    // A new card (Week 4 on) takes this person's first free slot of its kind,
    // chosen here under the lock: a page that hadn't loaded this person's rows
    // yet, or a second device, never writes over a card already saved.
    if (input.op === "note" && input.fresh && prompt.card) {
      const slots = cardSlotKeys(prompt.card);
      const used = new Set((await tx
        .select({ block: sessionBoardItems.block })
        .from(sessionBoardItems)
        .where(and(
          eq(sessionBoardItems.boardId, boardId),
          eq(sessionBoardItems.kind, "answer"),
          inArray(sessionBoardItems.block, slots),
          sameProject(projectId),
          inArray(sessionBoardItems.authorKey, keys),
        ))).map((r) => r.block));
      const free = slots.find((k) => !used.has(k));
      if (!free) bad(CARD_COPY[prompt.card].full);
      prompt = promptsForWeek(week).get(free) ?? prompt;
    }
    const mine = await tx
      .select({ id: sessionBoardItems.id, text: sessionBoardItems.text })
      .from(sessionBoardItems)
      .where(and(
        eq(sessionBoardItems.boardId, boardId),
        eq(sessionBoardItems.kind, "answer"),
        eq(sessionBoardItems.block, prompt.key),
        sameProject(projectId),
        inArray(sessionBoardItems.authorKey, keys),
      ))
      .orderBy(desc(sessionBoardItems.createdAt), desc(sessionBoardItems.id));

    const insert = async (): Promise<number> => {
      await checkAnswerCaps(tx, boardId, keys, facilitator);
      const res = await tx.insert(sessionBoardItems).values({
        boardId,
        kind: "answer",
        text,
        projectId,
        block: prompt.key,
        authorKey: keys[0],
        displayName,
      });
      return insertId(res);
    };

    const replace = async (rowId: number): Promise<number[]> => {
      await tx
        .update(sessionBoardItems)
        .set({ text, displayName, createdAt: sql`CURRENT_TIMESTAMP` })
        .where(eq(sessionBoardItems.id, rowId));
      // One row is the rule here. Anything past it is a leftover; clear it.
      const extra = mine.filter((r) => r.id !== rowId).map((r) => r.id);
      if (extra.length) await tx.delete(sessionBoardItems).where(inArray(sessionBoardItems.id, extra));
      return extra;
    };

    if (input.op === "pick" && !input.on) {
      const gone = mine.filter((r) => r.text === text).map((r) => r.id);
      if (gone.length) await tx.delete(sessionBoardItems).where(inArray(sessionBoardItems.id, gone));
      const cascaded = prompt.key === NEEDS_KEYS.pick ? await cascadeNeedRemoval(tx, boardId, projectId, keys, text) : [];
      const removedIds = [...gone, ...cascaded].sort((a, b) => a - b);
      if (removedIds.length) await bump(tx, boardId);
      return { ok: true as const, id: null, removedIds };
    }

    if (input.op === "pick") {
      const same = mine.find((r) => r.text === text);
      if (same) return { ok: true as const, id: same.id, removedIds: [] };
      if (prompt.key === NEEDS_KEYS.seed) {
        const [picked] = await tx
          .select({ id: sessionBoardItems.id })
          .from(sessionBoardItems)
          .where(and(
            eq(sessionBoardItems.boardId, boardId),
            eq(sessionBoardItems.kind, "answer"),
            eq(sessionBoardItems.block, NEEDS_KEYS.pick),
            eq(sessionBoardItems.text, text),
            sameProject(projectId),
            inArray(sessionBoardItems.authorKey, keys),
          ))
          .limit(1);
        if (!picked) bad(PROMPT_COPY.pickFirst);
      }
    }

    if (max === 1 && mine.length > 0) {
      const removedIds = await replace(mine[0].id);
      await bump(tx, boardId);
      return { ok: true as const, id: mine[0].id, removedIds };
    }
    if (mine.length >= max) bad(promptFull(prompt));
    const id = await insert();
    await bump(tx, boardId);
    return { ok: true as const, id, removedIds: [] };
  });
}

/**
 * Take back one row (API_CONTRACT 3.4): the row, the votes on it, and for a
 * human need its seed and per-need answers. `cascadeKeys` is whose rows the
 * cascade may touch: the caller's keys when they wrote it, else its author.
 */
export async function removeItemOnBoard(
  db: Db,
  opts: { boardId: number; item: { id: number; kind: string; block: string | null; text: string; projectId: number | null }; cascadeKeys: string[] },
): Promise<number[]> {
  const { boardId, item, cascadeKeys } = opts;
  return db.transaction(async (tx) => {
    await lockBoard(tx, boardId);
    await tx.delete(sessionBoardItems).where(eq(sessionBoardItems.id, item.id));
    await tx.delete(sessionBoardVotes).where(and(
      eq(sessionBoardVotes.boardId, boardId),
      eq(sessionBoardVotes.target, voteTarget.item(item.id)),
    ));
    const cascaded = item.kind === "answer" && item.block === NEEDS_KEYS.pick
      ? await cascadeNeedRemoval(tx, boardId, item.projectId ?? null, cascadeKeys, item.text)
      : [];
    await bump(tx, boardId);
    return [item.id, ...cascaded].sort((a, b) => a - b);
  });
}

/* ------------------------------------------------------------ guest claim */

export type ClaimResult = { ok: true; moved: number; merged: number; boards: number };

type AnswerRowLite = { id: number; block: string | null; projectId: number | null; text: string; createdAt: Date | string | null };

function stamp(v: Date | string | null): number {
  const t = v == null ? 0 : new Date(v).getTime();
  return Number.isFinite(t) ? t : 0;
}

/**
 * Which of one person's answer rows on a board break the prompt rules after
 * two identities were joined: on a pick, a second row for the same option;
 * then anything past the prompt's `max`. The newest rows stay. Keys the week
 * no longer asks are left alone.
 */
export function answerRowsOverRules(week: number, rows: readonly AnswerRowLite[]): number[] {
  const prompts = promptsForWeek(week);
  const groups = new Map<string, AnswerRowLite[]>();
  for (const r of rows) {
    if (!r.block || !prompts.has(r.block)) continue;
    const k = `${r.projectId ?? "room"}|${r.block}`;
    const list = groups.get(k);
    if (list) list.push(r); else groups.set(k, [r]);
  }
  const drop: number[] = [];
  for (const list of groups.values()) {
    const p = prompts.get(list[0].block as string)!;
    const sorted = [...list].sort((a, b) => stamp(b.createdAt) - stamp(a.createdAt) || b.id - a.id);
    const kept: AnswerRowLite[] = [];
    const seen = new Set<string>();
    for (const r of sorted) {
      if (p.mode === "pick") {
        if (seen.has(r.text)) {
          drop.push(r.id);
          continue;
        }
        seen.add(r.text);
      }
      kept.push(r);
    }
    for (const r of kept.slice(promptMax(p))) drop.push(r.id);
  }
  return drop.sort((a, b) => a - b);
}

/**
 * One person's card rows (Week 4 on, shared/boardCards.ts) after two
 * identities or two project cards were joined: a card is a person's whole
 * answer, so two cards in one slot never cost one of them. The older one
 * moves to the next free slot of its kind on that project; only when every
 * slot is taken does the rule above drop the oldest. Returns the moves.
 */
export function reslotCards(rows: readonly AnswerRowLite[]): { id: number; block: string }[] {
  const groups = new Map<string, AnswerRowLite[]>();
  for (const r of rows) {
    const kind = cardKindOfKey(r.block);
    if (!kind) continue;
    const k = `${r.projectId ?? "room"}|${kind}`;
    const list = groups.get(k);
    if (list) list.push(r); else groups.set(k, [r]);
  }
  const moves: { id: number; block: string }[] = [];
  for (const list of groups.values()) {
    const kind = cardKindOfKey(list[0].block)!;
    const used = new Set(list.map((r) => r.block as string));
    const free = cardSlotKeys(kind).filter((k) => !used.has(k));
    const bySlot = new Map<string, AnswerRowLite[]>();
    for (const r of list) {
      const l = bySlot.get(r.block as string);
      if (l) l.push(r); else bySlot.set(r.block as string, [r]);
    }
    for (const same of bySlot.values()) {
      if (same.length < 2) continue;
      // The newest keeps its slot; the others take free ones while there are any.
      const older = [...same].sort((a, b) => stamp(b.createdAt) - stamp(a.createdAt) || b.id - a.id).slice(1);
      for (const r of older) {
        const slot = free.shift();
        if (!slot) break;
        moves.push({ id: r.id, block: slot });
      }
    }
  }
  return moves;
}

/** Apply `reslotCards` to stored rows and to the list in hand, so the rules after it see the new slots. */
async function reslotStored(tx: Tx, rows: AnswerRowLite[]): Promise<void> {
  for (const m of reslotCards(rows)) {
    await tx.update(sessionBoardItems).set({ block: m.block }).where(eq(sessionBoardItems.id, m.id));
    const r = rows.find((x) => x.id === m.id);
    if (r) r.block = m.block;
  }
}

/**
 * Move every row a guest browser key owns, on every board, to the account
 * that signed in on that browser (API_CONTRACT 3.8). A vote the account
 * already has is merged (the guest's copy goes); answers are brought back
 * within each prompt's rules, newest kept. Safe to run twice: the second run
 * finds nothing under the key.
 */
export async function claimGuestRows(db: Db, voterKey: string, userId: number): Promise<ClaimResult> {
  const from = `k:${voterKey}`;
  const to = `u:${userId}`;
  const [v, p, i] = await Promise.all([
    db.selectDistinct({ boardId: sessionBoardVotes.boardId }).from(sessionBoardVotes).where(eq(sessionBoardVotes.voterKey, from)),
    db.selectDistinct({ boardId: sessionBoardProjects.boardId }).from(sessionBoardProjects).where(eq(sessionBoardProjects.authorKey, from)),
    db.selectDistinct({ boardId: sessionBoardItems.boardId }).from(sessionBoardItems).where(eq(sessionBoardItems.authorKey, from)),
  ]);
  const boardIds = Array.from(new Set([...v, ...p, ...i].map((r) => r.boardId))).sort((a, b) => a - b);
  let moved = 0;
  let merged = 0;
  let boards = 0;

  for (const boardId of boardIds) {
    const result = await db.transaction(async (tx) => {
      const board = await lockBoard(tx, boardId);
      if (!board) return null;

      // Votes, hands, offers and check-ins: one per person per target.
      const fromVotes = await tx
        .select({ id: sessionBoardVotes.id, target: sessionBoardVotes.target })
        .from(sessionBoardVotes)
        .where(and(eq(sessionBoardVotes.boardId, boardId), eq(sessionBoardVotes.voterKey, from)));
      // A locking read: a vote, hand or offer the account adds in another tab
      // waits for this claim instead of racing it into the unique key.
      const toTargets = new Set((await tx
        .select({ target: sessionBoardVotes.target })
        .from(sessionBoardVotes)
        .where(and(eq(sessionBoardVotes.boardId, boardId), eq(sessionBoardVotes.voterKey, to)))
        .for("update")).map((r) => r.target));
      const dupVotes = fromVotes.filter((r) => toTargets.has(r.target)).map((r) => r.id);
      const moveVotes = fromVotes.filter((r) => !toTargets.has(r.target)).map((r) => r.id);
      if (dupVotes.length) await tx.delete(sessionBoardVotes).where(inArray(sessionBoardVotes.id, dupVotes));
      if (moveVotes.length) await tx.update(sessionBoardVotes).set({ voterKey: to }).where(inArray(sessionBoardVotes.id, moveVotes));
      // Opportunity votes keep their per-person ceiling once two identities
      // are joined: the newest stay, the rest go and count as merged.
      let overCap: number[] = [];
      if (moveVotes.some((id) => fromVotes.find((r) => r.id === id)?.target.startsWith("item:"))) {
        const itemVotes = await tx
          .select({ id: sessionBoardVotes.id })
          .from(sessionBoardVotes)
          .where(and(
            eq(sessionBoardVotes.boardId, boardId),
            eq(sessionBoardVotes.voterKey, to),
            like(sessionBoardVotes.target, "item:%"),
          ))
          .orderBy(desc(sessionBoardVotes.id));
        overCap = itemVotes.slice(BOARD_LIMITS.votesPerPerson).map((r) => r.id);
        if (overCap.length) await tx.delete(sessionBoardVotes).where(inArray(sessionBoardVotes.id, overCap));
      }
      const capped = new Set(overCap);

      // Cards.
      const cardRes = await tx
        .update(sessionBoardProjects)
        .set({ authorKey: to })
        .where(and(eq(sessionBoardProjects.boardId, boardId), eq(sessionBoardProjects.authorKey, from)));

      // Notes, questions and answers.
      const fromItems = (await tx
        .select({ id: sessionBoardItems.id })
        .from(sessionBoardItems)
        .where(and(eq(sessionBoardItems.boardId, boardId), eq(sessionBoardItems.authorKey, from)))).map((r) => r.id);
      if (fromItems.length) await tx.update(sessionBoardItems).set({ authorKey: to }).where(inArray(sessionBoardItems.id, fromItems));
      const answers = await tx
        .select({
          id: sessionBoardItems.id,
          block: sessionBoardItems.block,
          projectId: sessionBoardItems.projectId,
          text: sessionBoardItems.text,
          createdAt: sessionBoardItems.createdAt,
        })
        .from(sessionBoardItems)
        .where(and(
          eq(sessionBoardItems.boardId, boardId),
          eq(sessionBoardItems.kind, "answer"),
          eq(sessionBoardItems.authorKey, to),
        ))
        .orderBy(asc(sessionBoardItems.id));
      await reslotStored(tx, answers);
      const drop = answerRowsOverRules(board.week, answers);
      if (drop.length) await tx.delete(sessionBoardItems).where(inArray(sessionBoardItems.id, drop));

      await bump(tx, boardId);
      const dropped = new Set(drop);
      return {
        moved: moveVotes.filter((id) => !capped.has(id)).length + affectedRows(cardRes) + fromItems.filter((id) => !dropped.has(id)).length,
        merged: dupVotes.length + overCap.length + drop.length,
      };
    });
    if (!result) continue;
    boards += 1;
    moved += result.moved;
    merged += result.merged;
  }
  return { ok: true as const, moved, merged, boards };
}

/* ---------------------------------------------------------- merge cards */

export const MERGE_COPY = {
  same: "Pick a different card to merge into.",
  missing: "That project is not on this board.",
  hiddenTarget: "Show that card first, then merge into it.",
} as const;

/**
 * Facilitator: one project with two cards. Every answer, note and question on
 * `fromId` moves to `intoId`, and so does every check-in, then the stray is
 * hidden. Nothing anyone wrote is lost, so the room's views, the profile and
 * the Village OS export keep it all. A person who now has two answers where a
 * prompt takes one keeps their newest, as the guest claim does. An
 * application link on the stray carries over when the kept card has none.
 */
export async function mergeCardsOnBoard(
  db: Db,
  opts: { boardId: number; week: number; fromId: number; intoId: number },
): Promise<{ ok: true; moved: number; merged: number }> {
  const { boardId, week, fromId, intoId } = opts;
  if (fromId === intoId) bad(MERGE_COPY.same);
  return db.transaction(async (tx) => {
    await lockBoard(tx, boardId);
    const cards = await tx
      .select({ id: sessionBoardProjects.id, hidden: sessionBoardProjects.hidden, applicationId: sessionBoardProjects.applicationId })
      .from(sessionBoardProjects)
      .where(and(eq(sessionBoardProjects.boardId, boardId), inArray(sessionBoardProjects.id, [fromId, intoId])));
    const from = cards.find((c) => c.id === fromId);
    const into = cards.find((c) => c.id === intoId);
    if (!from || !into) throw new TRPCError({ code: "NOT_FOUND", message: MERGE_COPY.missing });
    if (into.hidden) bad(MERGE_COPY.hiddenTarget);

    // Whose answers move, so their rows can be brought back within each prompt's rules.
    const authors = (await tx
      .selectDistinct({ authorKey: sessionBoardItems.authorKey })
      .from(sessionBoardItems)
      .where(and(eq(sessionBoardItems.boardId, boardId), eq(sessionBoardItems.projectId, fromId), eq(sessionBoardItems.kind, "answer"))))
      .map((r) => r.authorKey)
      .filter((k): k is string => !!k);
    const itemRes = await tx
      .update(sessionBoardItems)
      .set({ projectId: intoId })
      .where(and(eq(sessionBoardItems.boardId, boardId), eq(sessionBoardItems.projectId, fromId)));

    // Check-ins: one per person per card.
    const fromTarget = voteTarget.checkin(fromId);
    const intoTarget = voteTarget.checkin(intoId);
    const fromVotes = await tx
      .select({ id: sessionBoardVotes.id, voterKey: sessionBoardVotes.voterKey })
      .from(sessionBoardVotes)
      .where(and(eq(sessionBoardVotes.boardId, boardId), eq(sessionBoardVotes.target, fromTarget)));
    const already = new Set((await tx
      .select({ voterKey: sessionBoardVotes.voterKey })
      .from(sessionBoardVotes)
      .where(and(eq(sessionBoardVotes.boardId, boardId), eq(sessionBoardVotes.target, intoTarget)))
      .for("update")).map((r) => r.voterKey));
    const dupVotes = fromVotes.filter((v) => already.has(v.voterKey)).map((v) => v.id);
    const moveVotes = fromVotes.filter((v) => !already.has(v.voterKey)).map((v) => v.id);
    if (dupVotes.length) await tx.delete(sessionBoardVotes).where(inArray(sessionBoardVotes.id, dupVotes));
    if (moveVotes.length) await tx.update(sessionBoardVotes).set({ target: intoTarget }).where(inArray(sessionBoardVotes.id, moveVotes));

    let drop: number[] = [];
    if (authors.length) {
      const rows = await tx
        .select({
          id: sessionBoardItems.id,
          authorKey: sessionBoardItems.authorKey,
          block: sessionBoardItems.block,
          projectId: sessionBoardItems.projectId,
          text: sessionBoardItems.text,
          createdAt: sessionBoardItems.createdAt,
        })
        .from(sessionBoardItems)
        .where(and(
          eq(sessionBoardItems.boardId, boardId),
          eq(sessionBoardItems.kind, "answer"),
          eq(sessionBoardItems.projectId, intoId),
          inArray(sessionBoardItems.authorKey, authors),
        ))
        .orderBy(asc(sessionBoardItems.id));
      const byAuthor = new Map<string, AnswerRowLite[]>();
      for (const r of rows) {
        const list = byAuthor.get(r.authorKey as string);
        if (list) list.push(r); else byAuthor.set(r.authorKey as string, [r]);
      }
      for (const list of byAuthor.values()) {
        await reslotStored(tx, list);
        drop.push(...answerRowsOverRules(week, list));
      }
      drop = drop.sort((a, b) => a - b);
      if (drop.length) await tx.delete(sessionBoardItems).where(inArray(sessionBoardItems.id, drop));
    }

    const keep: Partial<typeof sessionBoardProjects.$inferInsert> = {};
    if (into.applicationId == null && from.applicationId != null) keep.applicationId = from.applicationId;
    if (Object.keys(keep).length) await tx.update(sessionBoardProjects).set(keep).where(eq(sessionBoardProjects.id, intoId));
    // The stray keeps its name and link while hidden, so its tile never comes back.
    await tx.update(sessionBoardProjects).set({ hidden: 1 }).where(eq(sessionBoardProjects.id, fromId));
    // Week 4 on: the stray's link to an earlier week's card moves with its answers.
    const [stateRow] = await tx.select({ state: sessionBoards.state }).from(sessionBoards).where(eq(sessionBoards.id, boardId)).for("update");
    const state = normalizeBoardState(stateRow?.state ?? null, week);
    const link = state.carry[String(fromId)];
    if (link) {
      let next = applyBoardAction(state, { type: "carry", cardId: fromId, from: null, by: link.by }, Date.now());
      const kept = next.carry[String(intoId)];
      // Only a real link moves, and on the kept card it replaces nothing but a
      // "not this one" (from 0). The stray's own "not this one" was about the
      // stray's name, so it stays behind. A person's link moves as the
      // facilitator's: merging is the facilitator's call, and the kept card
      // may have another name (a person's link holds only while names match).
      if (link.from > 0 && (!kept || kept.from === 0)) {
        const by = link.by === "person" ? "facilitator" : link.by;
        next = applyBoardAction(next, { type: "carry", cardId: intoId, from: link.from, by }, Date.now());
      }
      await tx.update(sessionBoards).set({ state: JSON.stringify(next) }).where(eq(sessionBoards.id, boardId));
    }

    await bump(tx, boardId);
    return {
      ok: true as const,
      moved: Math.max(0, affectedRows(itemRes) - drop.length) + moveVotes.length,
      merged: dupVotes.length + drop.length,
    };
  });
}

/**
 * How many rows a guest browser key owns across every board, for the "Add
 * them to your profile?" question before a claim. Moves nothing.
 */
export async function countGuestRows(db: Db, voterKey: string): Promise<number> {
  const from = `k:${voterKey}`;
  const count = (n: unknown) => Number(n ?? 0);
  const [[v], [p], [i]] = await Promise.all([
    db.select({ n: sql<number>`COUNT(*)` }).from(sessionBoardVotes).where(eq(sessionBoardVotes.voterKey, from)),
    db.select({ n: sql<number>`COUNT(*)` }).from(sessionBoardProjects).where(eq(sessionBoardProjects.authorKey, from)),
    db.select({ n: sql<number>`COUNT(*)` }).from(sessionBoardItems).where(eq(sessionBoardItems.authorKey, from)),
  ]);
  return count(v?.n) + count(p?.n) + count(i?.n);
}

/** For `curateItem`: a pick is an option key, so its words can't be edited. */
export function isPickAnswer(week: number, item: { kind: string; block: string | null }): boolean {
  if (item.kind !== "answer" || !item.block) return false;
  return promptsForWeek(week).get(item.block)?.mode === "pick";
}

/** For `curateItem`: a card is JSON its form writes, so a facilitator's free-text edit would break it. */
export function isCardAnswer(week: number, item: { kind: string; block: string | null }): boolean {
  if (item.kind !== "answer" || !item.block) return false;
  return !!promptsForWeek(week).get(item.block)?.card;
}

/** Rows of a board that are anonymous answers (left out of `get`). */
export function isAnonymousAnswer(anon: Set<string>, item: { kind: string; block: string | null }): boolean {
  return item.kind === "answer" && !!item.block && anon.has(item.block);
}

/**
 * The room's counts for each anonymous prompt, by option, over the rows not
 * hidden. Every option is there from zero, so the shape never changes.
 */
export function anonymousCounts(
  week: number,
  items: readonly { kind: string; block: string | null; text: string; hidden: number | boolean | null }[],
): Record<string, Record<string, number>> {
  const out: Record<string, Record<string, number>> = {};
  for (const p of promptsForWeek(week).values()) {
    if (!p.anonymous) continue;
    out[p.key] = Object.fromEntries((p.options ?? []).map((o) => [o.key, 0]));
  }
  for (const i of items) {
    if (i.kind !== "answer" || !i.block || i.hidden) continue;
    const slot = out[i.block];
    if (slot && Object.prototype.hasOwnProperty.call(slot, i.text)) slot[i.text] += 1;
  }
  return out;
}

/** `checkin:<cardId>` counts from a board's vote counts. */
export function checkinCounts(counts: Map<string, number>): Record<number, number> {
  const out: Record<number, number> = {};
  for (const [target, n] of counts) {
    const m = /^checkin:(\d+)$/.exec(target);
    if (m) out[Number(m[1])] = n;
  }
  return out;
}

