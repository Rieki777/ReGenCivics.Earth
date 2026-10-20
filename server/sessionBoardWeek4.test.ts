/**
 * Week 4's board on the server (Rye, 2026-10-14): the cards (a seat, a human
 * need of the project's own, what a circle decides, a quest) stored as answer
 * rows; each card on Week 4 carrying its Week 3 answers (by application, by
 * the tile it was checked in from, by the person who played for it, or by a
 * facilitator's yes); and the export's Village OS card.
 *
 * The database half runs on a made-up Season ("Board Test 2032") and
 * application season (9032), through the lib functions, and removes every
 * row it makes.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { and, eq, inArray, sql } from "drizzle-orm";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import { getDb } from "./db";
import {
  applications,
  sessionBoardItems,
  sessionBoardProjects,
  sessionBoardVotes,
  sessionBoards,
} from "../drizzle/schema";
import { actOnBoard, ensureBoard, type Db } from "./lib/sessionBoard";
import { answerOnBoard, claimGuestRows, isCardAnswer, mergeCardsOnBoard, reslotCards, type AnswerInput } from "./lib/sessionBoardAnswers";
import { checkInOnBoard, clearCheckInCache } from "./lib/sessionBoardCheckIn";
import {
  CONFIRM_REFUSALS,
  assertCarryConfirmable,
  clearCarryCache,
  earlierAnswerWeeks,
  earlierCardFor,
  earlierCardsFor,
  readCarry,
} from "./lib/sessionBoardCarry";
import { buildBoardExport } from "./lib/sessionBoardExport";
import { CARD_COPY, CARD_TEXT_MAX, cardText, parseCard, type SeatCard } from "@shared/boardCards";
import { normalizeBoardState } from "@shared/sessionBoard";

function makeCtx(user: TrpcContext["user"] | null, ip = "127.0.0.1"): TrpcContext {
  return {
    user,
    req: {
      protocol: "https",
      method: "POST",
      headers: { origin: "https://regencivics.earth", host: "regencivics.earth", "cf-connecting-ip": ip },
      cookies: {},
      socket: { remoteAddress: ip },
      ip,
    } as unknown as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  } as TrpcContext;
}

const SEAT: SeatCard = {
  name: "Water keeper",
  circle: "water",
  need: "vitality",
  aim: "Living water for every household on the land",
  answersFor: "The spring, the catchment, the water tests",
  heldBy: "team",
  who: "Ana",
  contribution: "4 hours a week",
};

describe("week 4 board: what the router and lists accept", () => {
  it("Week 4 reads Week 3; Week 3 reads nothing, since Week 2 asked no prompts", () => {
    expect(earlierAnswerWeeks(4)).toEqual([3]);
    expect(earlierAnswerWeeks(5)).toEqual([4, 3]);
    expect(earlierAnswerWeeks(3)).toEqual([]);
  });

  it("a card can't be reworded by a facilitator's free-text edit; a pick can't either", () => {
    expect(isCardAnswer(4, { kind: "answer", block: "seat-3" })).toBe(true);
    expect(isCardAnswer(4, { kind: "answer", block: "agreement" })).toBe(false);
    expect(isCardAnswer(3, { kind: "answer", block: "seat-3" })).toBe(false);
  });

  it("two of one person's cards in one slot both stay: the older moves to a free slot", () => {
    const at = (s: number) => new Date(1_800_000_000_000 + s * 1000);
    const moves = reslotCards([
      { id: 1, block: "seat-1", projectId: 5, text: "{}", createdAt: at(1) },
      { id: 2, block: "seat-1", projectId: 5, text: "{}", createdAt: at(2) },
      { id: 3, block: "seat-2", projectId: 5, text: "{}", createdAt: at(1) },
      { id: 4, block: "seat-1", projectId: 6, text: "{}", createdAt: at(1) },
      { id: 5, block: "quest-1", projectId: 5, text: "{}", createdAt: at(1) },
      { id: 6, block: "quest-1", projectId: 5, text: "{}", createdAt: at(3) },
      { id: 7, block: "needs", projectId: 5, text: "love", createdAt: at(1) },
    ]);
    expect(moves).toEqual([{ id: 1, block: "seat-3" }, { id: 5, block: "quest-2" }]);
  });

  it("only a facilitator says two cards are one project", async () => {
    const guest = appRouter.createCaller(makeCtx(null));
    await expect(guest.sessionBoard.confirmCarry({ week: 4, cardId: 1, fromCardId: 2 })).rejects.toThrow();
    const player = appRouter.createCaller(makeCtx({ id: 987660001, role: "user" } as unknown as TrpcContext["user"]));
    if (process.env.DATABASE_URL) {
      await expect(player.sessionBoard.confirmCarry({ week: 4, cardId: 1, fromCardId: 2 })).rejects.toMatchObject({ code: "FORBIDDEN" });
    } else {
      await expect(player.sessionBoard.confirmCarry({ week: 4, cardId: 1, fromCardId: 2 })).rejects.toThrow();
    }
  });
});

const skipIfNoDb = !process.env.DATABASE_URL;
const SEASON = "Board Test 2032";
const APP_SEASON = 9032;
const APP_OWNER = 987660999;

describe.skipIf(skipIfNoDb)("week 4 board: the database layer", () => {
  let db: Db;
  const boardIds: number[] = [];
  const appIds: number[] = [];
  let b3 = 0;
  let b4 = 0;

  const insertId = (res: unknown) => Number((res as [{ insertId: number }])[0]?.insertId ?? (res as { insertId: number }).insertId);
  const card = async (boardId: number, values: Partial<typeof sessionBoardProjects.$inferInsert> & { name: string }) =>
    insertId(await db.insert(sessionBoardProjects).values({ boardId, ...values }));
  const app = async (name: string) => {
    const id = insertId(await db.insert(applications).values({
      userId: APP_OWNER, status: "submitted", season: APP_SEASON, projectName: name, projectType: "early_stage",
      location: "Test Valley", vision: "A village.", landStatus: "owned", teamSize: 3, teamDescription: "Three",
      regenerativePractices: "Swales", governanceApproach: "Consent", communityEngagement: "Work days",
      timeCommitment: "Weekly", fundingNeeds: "Tools",
    }));
    appIds.push(id);
    return id;
  };
  const answer = (boardId: number, week: number, keys: string[], input: AnswerInput) =>
    answerOnBoard(db, { boardId, week, keys, facilitator: false, input });
  const checkIn = (keys: string[], ref: string) =>
    checkInOnBoard(db, { season: SEASON, boardId: b4, week: 4, keys, ref, appSeason: APP_SEASON });
  const carryOf = async (cardId: number) => {
    clearCarryCache();
    const data = await readCarry(db, SEASON, 4);
    return { data, card: data.cards.find((c) => c.cardId === cardId) };
  };
  const linkOf = async (cardId: number) => {
    const [board] = await db.select().from(sessionBoards).where(eq(sessionBoards.id, b4));
    return normalizeBoardState(board.state, 4).carry[String(cardId)];
  };
  const checkInWeek3 = (keys: string[], cardId: number) =>
    checkInOnBoard(db, { season: SEASON, boardId: b3, week: 3, keys, ref: `p${cardId}`, appSeason: APP_SEASON });
  /** Week 3's live session: what someone did on Week 3 up to its end counts as playing for a card there. */
  const week3Session = async (startedAt: number | null, endedAt: number | null) => {
    const [board] = await db.select().from(sessionBoards).where(eq(sessionBoards.id, b3));
    const state = { ...normalizeBoardState(board.state, 3), sessionStartedAt: startedAt, endedAt };
    await db.update(sessionBoards).set({ state: JSON.stringify(state) }).where(eq(sessionBoards.id, b3));
  };
  /** Boards on another made-up season, for a Week 4 with no board yet. */
  const otherBoardIds: number[] = [];

  beforeAll(async () => {
    db = (await getDb())!;
    b3 = (await ensureBoard(db, SEASON, 3)).id;
    b4 = (await ensureBoard(db, SEASON, 4)).id;
    boardIds.push(b3, b4);
  });

  afterAll(async () => {
    if (!db) return;
    const all = [...boardIds, ...otherBoardIds];
    await db.delete(sessionBoardVotes).where(inArray(sessionBoardVotes.boardId, all));
    await db.delete(sessionBoardItems).where(inArray(sessionBoardItems.boardId, all));
    await db.delete(sessionBoardProjects).where(inArray(sessionBoardProjects.boardId, all));
    await db.delete(sessionBoards).where(inArray(sessionBoards.id, all));
    if (appIds.length) await db.delete(applications).where(inArray(applications.id, appIds));
  });

  it("a seat is stored as one answer row, cleaned, and changed in place in its slot", async () => {
    const keys = ["k:w4seats00000001"];
    const p = await card(b4, { name: "Seat Test Farm" });
    const long = { ...SEAT, aim: "a".repeat(400), answersFor: "b".repeat(400) };
    const first = await answer(b4, 4, keys, { op: "note", key: "seat-1", projectId: p, text: cardText("seat", long) });
    const [row] = await db.select().from(sessionBoardItems).where(eq(sessionBoardItems.id, first.id!));
    // Wider than the old 400-character column (migration 0300), and every field capped.
    expect(row.text.length).toBeGreaterThan(400);
    expect(row.text.length).toBeLessThanOrEqual(CARD_TEXT_MAX);
    expect(parseCard("seat", row.text)?.aim).toHaveLength(160);
    const again = await answer(b4, 4, keys, { op: "note", key: "seat-1", projectId: p, text: cardText("seat", SEAT) });
    expect(again.id).toBe(first.id);
    const [changed] = await db.select().from(sessionBoardItems).where(eq(sessionBoardItems.id, first.id!));
    expect(parseCard("seat", changed.text)).toEqual(SEAT);
    await expect(answer(b4, 4, keys, { op: "note", key: "seat-2", projectId: p, text: JSON.stringify({ n: "No circle" }) }))
      .rejects.toThrow(CARD_COPY.bad.seat);
    await expect(answer(b4, 4, keys, { op: "note", key: "seat-2", projectId: p, text: "not a card" }))
      .rejects.toThrow(CARD_COPY.bad.seat);
    await expect(answer(b4, 4, keys, { op: "note", key: "seat-13", projectId: p, text: cardText("seat", SEAT) }))
      .rejects.toThrow("That question isn't on this board.");
    // Week 3's board has no card slots.
    await expect(answer(b3, 3, keys, { op: "note", key: "seat-1", projectId: null, text: cardText("seat", SEAT) }))
      .rejects.toThrow("That question isn't on this board.");
  });

  it("a new card takes the first free slot on the server, never one already saved from another device", async () => {
    const keys = ["k:w4fresh00000001"];
    const p = await card(b4, { name: "Fresh Slot Farm" });
    const first = await answer(b4, 4, keys, { op: "note", key: "seat-1", projectId: p, text: cardText("seat", SEAT), fresh: true });
    // A page that never saw the first card sends its new one to seat-1 too.
    const second = await answer(b4, 4, keys, { op: "note", key: "seat-1", projectId: p, text: cardText("seat", { ...SEAT, name: "Seed saver" }), fresh: true });
    expect(second.id).not.toBe(first.id);
    const rows = await db.select().from(sessionBoardItems).where(and(eq(sessionBoardItems.boardId, b4), eq(sessionBoardItems.projectId, p)));
    expect(rows.map((r) => r.block).sort()).toEqual(["seat-1", "seat-2"]);
    expect(rows.map((r) => parseCard("seat", r.text)?.name).sort()).toEqual(["Seed saver", "Water keeper"]);
    for (let i = 0; i < 10; i++) await answer(b4, 4, keys, { op: "note", key: "seat-1", projectId: p, text: cardText("seat", SEAT), fresh: true });
    await expect(answer(b4, 4, keys, { op: "note", key: "seat-1", projectId: p, text: cardText("seat", SEAT), fresh: true }))
      .rejects.toThrow(CARD_COPY.seat.full);
    const quotes = { ...SEAT, aim: "\"".repeat(160), answersFor: "\"".repeat(160), who: "\"".repeat(60), contribution: "\"".repeat(100), name: "\"".repeat(60) };
    await expect(answer(b4, 4, ["k:w4fresh00000002"], { op: "note", key: "seat-1", projectId: p, text: cardText("seat", quotes), fresh: true }))
      .rejects.toThrow(CARD_COPY.tooLong);
  });

  it("a Week 3 check-in leaves Week 3's board state as it was", async () => {
    const w3 = await card(b3, { name: "Week Three Only" });
    const [before] = await db.select().from(sessionBoards).where(eq(sessionBoards.id, b3));
    await checkInOnBoard(db, { season: SEASON, boardId: b3, week: 3, keys: ["k:w4threeonly00001"], ref: `p${w3}`, appSeason: APP_SEASON });
    const [after] = await db.select().from(sessionBoards).where(eq(sessionBoards.id, b3));
    expect(after.state).toBe(before.state);
  });

  it("checking in from a Week 3 tile carries that card's answers, never its anonymous ones", async () => {
    const w3 = await card(b3, { name: "Carry Tile Grove", authorKey: "k:w4author0000001" });
    const writer = ["k:w4writer0000001"];
    await answer(b3, 3, writer, { op: "pick", key: "needs", projectId: w3, option: "love", on: true });
    await answer(b3, 3, writer, { op: "pick", key: "whole", projectId: w3, option: "50", on: true });
    await answer(b3, 3, writer, { op: "pick", key: "pulse-a", projectId: null, option: "clear", on: true });
    await db.insert(sessionBoardItems).values({ boardId: b3, kind: "ask", block: "s3", text: "How do seats start?", projectId: w3, authorKey: writer[0] });
    await db.insert(sessionBoardItems).values({ boardId: b3, kind: "ask", block: "s3", text: "Answered already", projectId: w3, authorKey: writer[0], chosen: 1 });
    clearCheckInCache();
    const r = await checkIn(["k:w4newbie0000001"], `w3p${w3}`);
    expect(r.created).toBe(true);
    const [board] = await db.select().from(sessionBoards).where(eq(sessionBoards.id, b4));
    expect(normalizeBoardState(board.state, 4).carry[String(r.cardId)]).toEqual({ from: w3, by: "tile" });
    const { data, card: c } = await carryOf(r.cardId);
    expect(c).toMatchObject({ match: "carried", from: [{ week: 3, cardId: w3, name: "Carry Tile Grove" }] });
    const mine = data.rows.filter((x) => x.projectId === w3);
    expect(mine.map((x) => x.block).sort()).toEqual(["needs", "whole"]);
    expect(data.rows.some((x) => x.block === "pulse-a")).toBe(false);
    expect(data.asks.map((a) => a.text)).toContain("How do seats start?");
    expect(data.asks.map((a) => a.text)).not.toContain("Answered already");
    expect(data.asks.find((a) => a.text === "How do seats start?")?.project).toBe("Carry Tile Grove");
  });

  it("Week 3's open questions show before Week 4 has a board, and while it has no shown card", async () => {
    const season = `${SEASON} asks`;
    const w3Board = (await ensureBoard(db, season, 3)).id;
    otherBoardIds.push(w3Board);
    await db.insert(sessionBoardItems).values({ boardId: w3Board, kind: "ask", block: "s3", text: "Who holds the keys?", authorKey: "k:w4asker00000001" });
    await db.insert(sessionBoardItems).values({ boardId: w3Board, kind: "ask", block: "s3", text: "Settled already", authorKey: "k:w4asker00000001", chosen: 1 });
    const asks = async () => {
      clearCarryCache();
      return (await readCarry(db, season, 4)).asks.map((a) => a.text);
    };
    // No Week 4 board at all yet (a rehearsal, or someone reading ahead).
    expect(await asks()).toEqual(["Who holds the keys?"]);
    // A board, before the first check-in.
    const w4Board = (await ensureBoard(db, season, 4)).id;
    otherBoardIds.push(w4Board);
    expect(await asks()).toEqual(["Who holds the keys?"]);
    // Only a hidden card on it.
    await card(w4Board, { name: "Hidden Stray", hidden: 1 });
    expect(await asks()).toEqual(["Who holds the keys?"]);
  });

  it("a card with the same application carries without any link", async () => {
    const appId = await app("Carry App Village");
    const w3 = await card(b3, { name: "Carry App Village", applicationId: appId });
    await answer(b3, 3, ["k:w4appwriter00001"], { op: "pick", key: "needs", projectId: w3, option: "play", on: true });
    clearCheckInCache();
    const r = await checkIn(["k:w4appguest000001"], `a${appId}`);
    const { card: c } = await carryOf(r.cardId);
    expect(c).toMatchObject({ match: "application", from: [{ cardId: w3 }] });
    const [board] = await db.select().from(sessionBoards).where(eq(sessionBoards.id, b4));
    expect(normalizeBoardState(board.state, 4).carry[String(r.cardId)]).toBeUndefined();
  });

  it("the person who played for a same-name Week 3 card carries it; a stranger's same name only waits for the facilitator", async () => {
    const w3 = await card(b3, { name: "Lantern Field" });
    const player = ["k:w4lantern0000001"];
    // The player's answer lands inside Week 3's live session.
    await week3Session(Date.now() - 60_000, null);
    await answer(b3, 3, player, { op: "pick", key: "players", projectId: w3, option: "6-12", on: true });
    await week3Session(Date.now() - 60_000, Date.now() + 1000);
    // A card here with the same name, made by someone else (no application, no tile).
    const here = await card(b4, { name: "lantern  field", authorKey: "k:w4someone0000001" });
    // A stranger checks in first: nothing is recorded, it's only a suggestion.
    await checkIn(["k:w4stranger000001"], `p${here}`);
    let got = await carryOf(here);
    expect(got.card).toMatchObject({ match: "suggested", from: [], suggested: [{ cardId: w3, week: 3 }] });
    // The person who answered for Lantern Field last week checks in: their own key ties them.
    await checkIn(player, `p${here}`);
    got = await carryOf(here);
    expect(got.card).toMatchObject({ match: "yours", from: [{ cardId: w3 }] });
    expect(await earlierCardsFor(db, SEASON, 4, player)).toEqual([{ week: 3, cardId: w3, name: "Lantern Field" }]);
  });

  it("play in the two hours after End session still counts: the room kept answering after Week 3's close", async () => {
    const w3 = await card(b3, { name: "Stayed Late Grove" });
    const player = ["k:w4stayedlate00001"];
    // Week 3 ended 40 minutes ago, and this person answered for the card just now.
    await week3Session(Date.now() - 3 * 3_600_000, Date.now() - 40 * 60_000);
    await answer(b3, 3, player, { op: "pick", key: "needs", projectId: w3, option: "growth", on: true });
    const here = await card(b4, { name: "Stayed Late Grove", authorKey: "k:w4someone0000002" });
    await checkIn(player, `p${here}`);
    expect(await linkOf(here)).toMatchObject({ from: w3, by: "person" });
  });

  it("a check-in on a Week 3 card after its session ended proves nothing: the same name waits for the facilitator", async () => {
    const w3 = await card(b3, { name: "Late Lantern Farm" });
    await answer(b3, 3, ["k:w4lateteam000001"], { op: "pick", key: "needs", projectId: w3, option: "love", on: true });
    // Week 3's session ended three hours ago, past the two hours the room may stay; its board stays open to anyone after.
    await week3Session(Date.now() - 5 * 3_600_000, Date.now() - 3 * 3_600_000);
    const stranger = ["k:w4latestrange001"];
    await checkInWeek3(stranger, w3);
    await answer(b3, 3, stranger, { op: "pick", key: "players", projectId: w3, option: "6-12", on: true });
    const here = await card(b4, { name: "Late Lantern Farm", authorKey: stranger[0] });
    await checkIn(stranger, `p${here}`);
    expect(await linkOf(here)).toBeUndefined();
    expect((await carryOf(here)).card).toMatchObject({ match: "suggested", from: [], suggested: [{ cardId: w3 }] });
  });

  it("a Week 3 board whose session never started proves nobody played for its cards", async () => {
    const w3 = await card(b3, { name: "Unstarted Meadow" });
    await week3Session(null, null);
    const player = ["k:w4unstarted00001"];
    await checkInWeek3(player, w3);
    await answer(b3, 3, player, { op: "pick", key: "needs", projectId: w3, option: "play", on: true });
    const here = await card(b4, { name: "Unstarted Meadow" });
    await checkIn(player, `p${here}`);
    expect(await linkOf(here)).toBeUndefined();
    expect((await carryOf(here)).card?.match).toBe("suggested");
  });

  it("a facilitator confirms a name match, or says it's a different project", async () => {
    const w3 = await card(b3, { name: "Confirm Meadow" });
    await answer(b3, 3, ["k:w4confirm0000001"], { op: "pick", key: "needs", projectId: w3, option: "routine", on: true });
    const here = await card(b4, { name: "Confirm Meadow" });
    expect((await carryOf(here)).card?.match).toBe("suggested");
    expect(await earlierCardFor(db, SEASON, 4, w3)).toMatchObject({ id: w3, week: 3 });
    expect(await earlierCardFor(db, SEASON, 4, here)).toBeNull();
    await actOnBoard(db, b4, 4, { type: "carry", cardId: here, from: w3, by: "facilitator" }, Date.now());
    expect((await carryOf(here)).card).toMatchObject({ match: "confirmed", from: [{ cardId: w3 }] });
    await actOnBoard(db, b4, 4, { type: "carry", cardId: here, from: 0, by: "facilitator" }, Date.now());
    expect((await carryOf(here)).card).toMatchObject({ match: "declined", from: [], suggested: [] });
    await actOnBoard(db, b4, 4, { type: "carry", cardId: here, from: null, by: "facilitator" }, Date.now());
    expect((await carryOf(here)).card?.match).toBe("suggested");
  });

  it("two Week 3 cards with one name: each suggestion counts its answers, and the facilitator's pick carries that card's rows", async () => {
    // The stray has the lower id: it is the one a single "Yes" used to link.
    const stray = await card(b3, { name: "Twin Brook" });
    await answer(b3, 3, ["k:w4twinstray00001"], { op: "pick", key: "needs", projectId: stray, option: "love", on: true });
    const real = await card(b3, { name: "Twin Brook" });
    const team = ["k:w4twinreal000001"];
    await answer(b3, 3, team, { op: "pick", key: "needs", projectId: real, option: "vitality", on: true });
    await answer(b3, 3, team, { op: "pick", key: "needs", projectId: real, option: "play", on: true });
    await answer(b3, 3, team, { op: "pick", key: "whole", projectId: real, option: "50", on: true });
    const here = await card(b4, { name: "Twin Brook" });
    let got = await carryOf(here);
    expect(got.card).toMatchObject({ match: "suggested", from: [] });
    expect(got.card?.suggested).toEqual([
      { week: 3, cardId: stray, name: "Twin Brook", answers: 1 },
      { week: 3, cardId: real, name: "Twin Brook", answers: 3 },
    ]);
    // What confirmCarry runs, then the link it records.
    await assertCarryConfirmable(db, { season: SEASON, week: 4, boardId: b4, card: { id: here, applicationId: null }, fromCardId: real });
    await actOnBoard(db, b4, 4, { type: "carry", cardId: here, from: real, by: "facilitator" }, Date.now());
    got = await carryOf(here);
    expect(got.card).toMatchObject({ match: "confirmed", from: [{ cardId: real }] });
    const twinRows = got.data.rows.filter((r) => r.projectId === real || r.projectId === stray);
    expect(twinRows.map((r) => r.projectId)).toEqual([real, real, real]);
    expect(twinRows.map((r) => r.text).sort()).toEqual(["50", "play", "vitality"]);
  });

  it("a card tied to another application is never suggested, and the facilitator can't link it", async () => {
    const seven = await app("Casa Verde Seven");
    const eleven = await app("Casa Verde Eleven");
    const w3 = await card(b3, { name: "Casa Verde", applicationId: seven });
    const here = await card(b4, { name: "Casa Verde", applicationId: eleven });
    expect((await carryOf(here)).card).toMatchObject({ match: "none", from: [], suggested: [] });
    await expect(assertCarryConfirmable(db, { season: SEASON, week: 4, boardId: b4, card: { id: here, applicationId: eleven }, fromCardId: w3 }))
      .rejects.toThrow(CONFIRM_REFUSALS.otherApplication);
    await expect(assertCarryConfirmable(db, { season: SEASON, week: 4, boardId: b4, card: { id: here, applicationId: eleven }, fromCardId: here }))
      .rejects.toThrow(CONFIRM_REFUSALS.notEarlier);
    // A link recorded before the application was set carries nothing.
    await actOnBoard(db, b4, 4, { type: "carry", cardId: here, from: w3, by: "facilitator" }, Date.now());
    expect((await carryOf(here)).card).toMatchObject({ match: "none", from: [] });
    await actOnBoard(db, b4, 4, { type: "carry", cardId: here, from: null, by: "facilitator" }, Date.now());
  });

  it("a hidden Week 3 card carries nothing and is never suggested", async () => {
    const w3 = await card(b3, { name: "Hidden Orchard", hidden: 1 });
    await answer(b3, 3, ["k:w4hidden00000001"], { op: "pick", key: "needs", projectId: null, option: "love", on: true });
    const here = await card(b4, { name: "Hidden Orchard" });
    await actOnBoard(db, b4, 4, { type: "carry", cardId: here, from: w3, by: "facilitator" }, Date.now());
    expect((await carryOf(here)).card).toMatchObject({ match: "none", from: [], suggested: [] });
  });

  it("the export's Week 4 card is the sum of both weeks, with the whole Village OS card", async () => {
    const w3 = await card(b3, { name: "Export Spring" });
    await answer(b3, 3, ["k:w4export0000001"], { op: "pick", key: "needs", projectId: w3, option: "vitality", on: true });
    await answer(b3, 3, ["k:w4export0000001"], { op: "pick", key: "whole", projectId: w3, option: "25", on: true });
    clearCheckInCache();
    const r = await checkIn(["k:w4export0000002"], `w3p${w3}`);
    await answer(b4, 4, ["k:w4export0000002"], { op: "pick", key: "whole", projectId: r.cardId, option: "75", on: true });
    await answer(b4, 4, ["k:w4export0000002"], { op: "note", key: "seat-1", projectId: r.cardId, text: cardText("seat", SEAT) });
    clearCarryCache();
    const out = await buildBoardExport(db, SEASON, [4]);
    const view = out.weeks[0].projectViews.find((v) => v.cardId === r.cardId)!;
    expect(view.match).toBe("carried");
    expect(view.villageOsCard?.needs.map((n) => n.needKey)).toEqual(["vitality"]);
    expect(view.villageOsCard?.variables).toEqual({ "needs.totality_target_pct": 75 });
    expect(view.villageOsCard?.seats.map((s) => s.name)).toEqual(["Water keeper"]);
    expect(view.lines.some((l) => l.startsWith("Seat: Water keeper"))).toBe(true);
    // A seat row reads as words in the export, never as raw JSON.
    const seatRow = out.weeks[0].rows.find((x) => x.key === "seat-1" && x.projectId === r.cardId)!;
    expect(seatRow.label).toBe("A seat you wrote");
    expect(seatRow.value.startsWith("Water keeper (Living Water)")).toBe(true);
    expect(JSON.stringify(out)).not.toMatch(/"k:w4/);
  });

  it("merging a stray card keeps both cards' seats and moves its link to last week", async () => {
    const w3 = await card(b3, { name: "Merge Ridge" });
    await answer(b3, 3, ["k:w4merge00000001"], { op: "pick", key: "needs", projectId: w3, option: "growth", on: true });
    clearCheckInCache();
    const stray = await checkIn(["k:w4merge00000002"], `w3p${w3}`);
    const keep = await card(b4, { name: "Merge Ridge Village" });
    const me = ["k:w4merge00000002"];
    await answer(b4, 4, me, { op: "note", key: "seat-1", projectId: stray.cardId, text: cardText("seat", SEAT) });
    await answer(b4, 4, me, { op: "note", key: "seat-1", projectId: keep, text: cardText("seat", { ...SEAT, name: "Seed saver" }) });
    await mergeCardsOnBoard(db, { boardId: b4, week: 4, fromId: stray.cardId, intoId: keep });
    const seats = await db.select().from(sessionBoardItems).where(and(eq(sessionBoardItems.boardId, b4), eq(sessionBoardItems.projectId, keep)));
    expect(seats.map((r) => parseCard("seat", r.text)?.name).sort()).toEqual(["Seed saver", "Water keeper"]);
    expect(new Set(seats.map((r) => r.block)).size).toBe(2);
    expect((await carryOf(keep)).card).toMatchObject({ match: "carried", from: [{ cardId: w3 }] });
  });

  it("merging moves a stray's real link onto a kept card that said 'not this one'", async () => {
    const w3 = await card(b3, { name: "Merge Fen" });
    await answer(b3, 3, ["k:w4mergefen00001"], { op: "pick", key: "needs", projectId: w3, option: "love", on: true });
    clearCheckInCache();
    const stray = await checkIn(["k:w4mergefen00002"], `w3p${w3}`);
    expect(await linkOf(stray.cardId)).toEqual({ from: w3, by: "tile" });
    const keep = await card(b4, { name: "Fen Village" });
    await actOnBoard(db, b4, 4, { type: "carry", cardId: keep, from: 0, by: "facilitator" }, Date.now());
    await mergeCardsOnBoard(db, { boardId: b4, week: 4, fromId: stray.cardId, intoId: keep });
    expect((await carryOf(keep)).card).toMatchObject({ match: "carried", from: [{ cardId: w3 }] });
    expect(await linkOf(stray.cardId)).toBeUndefined();
  });

  it("merging leaves a stray's 'not this one' behind: the kept card's own suggestion stays", async () => {
    const w3 = await card(b3, { name: "Fen Hollow" });
    const keep = await card(b4, { name: "Fen Hollow" });
    const stray = await card(b4, { name: "Fen" });
    await actOnBoard(db, b4, 4, { type: "carry", cardId: stray, from: 0, by: "facilitator" }, Date.now());
    await mergeCardsOnBoard(db, { boardId: b4, week: 4, fromId: stray, intoId: keep });
    expect(await linkOf(keep)).toBeUndefined();
    expect((await carryOf(keep)).card).toMatchObject({ match: "suggested", suggested: [{ cardId: w3 }] });
  });

  it("a person's link moves in a merge as the facilitator's, so the kept card's other name keeps it", async () => {
    const w3 = await card(b3, { name: "Merge Thicket" });
    const stray = await card(b4, { name: "Merge Thicket" });
    await actOnBoard(db, b4, 4, { type: "carry", cardId: stray, from: w3, by: "person" }, Date.now());
    expect((await carryOf(stray)).card?.match).toBe("yours");
    const keep = await card(b4, { name: "Thicket Commons" });
    await mergeCardsOnBoard(db, { boardId: b4, week: 4, fromId: stray, intoId: keep });
    expect(await linkOf(keep)).toEqual({ from: w3, by: "facilitator" });
    expect((await carryOf(keep)).card).toMatchObject({ match: "confirmed", from: [{ cardId: w3 }] });
  });

  it("a guest's seat survives signing in when the account already wrote one in the same slot", async () => {
    const p = await card(b4, { name: "Claim Hollow" });
    const guestKey = "w4claimguest00001";
    const userId = 987660111;
    await answer(b4, 4, [`u:${userId}`], { op: "note", key: "seat-1", projectId: p, text: cardText("seat", SEAT) });
    await answer(b4, 4, [`k:${guestKey}`], { op: "note", key: "seat-1", projectId: p, text: cardText("seat", { ...SEAT, name: "Night watch" }) });
    await claimGuestRows(db, guestKey, userId);
    const rows = await db.select().from(sessionBoardItems).where(and(eq(sessionBoardItems.boardId, b4), eq(sessionBoardItems.projectId, p)));
    expect(rows.map((r) => parseCard("seat", r.text)?.name).sort()).toEqual(["Night watch", "Water keeper"]);
    expect(rows.every((r) => r.authorKey === `u:${userId}`)).toBe(true);
  });

  it("a stranger's tap on an old tile never links a card they didn't make", async () => {
    const real = await card(b3, { name: "Tile Pond" });
    const junk = await card(b3, { name: "Tile Pond", authorKey: "k:w4junk000000001" });
    const here = await card(b4, { name: "Tile Pond" });
    clearCheckInCache();
    // The tile points at the junk Week 3 card, but the card here already existed.
    await checkIn(["k:w4junk000000001"], `w3p${junk}`);
    const got = await carryOf(here);
    expect(got.card?.match).toBe("suggested");
    expect(got.card?.suggested.map((s) => s.cardId).sort()).toEqual([real, junk].sort());
  });

  it("a tap from a duplicate Week 3 card's ref records no link when it makes the Week 4 card", async () => {
    const real = await card(b3, { name: "Dup Spring" });
    await answer(b3, 3, ["k:w4dupreal0000001"], { op: "pick", key: "needs", projectId: real, option: "love", on: true });
    const junk = await card(b3, { name: "Dup Spring", authorKey: "k:w4dupjunk0000001" });
    await answer(b3, 3, ["k:w4dupjunk0000001"], { op: "pick", key: "needs", projectId: junk, option: "growth", on: true });
    clearCheckInCache();
    const r = await checkIn(["k:w4dupjunk0000001"], `w3p${junk}`);
    expect(r.created).toBe(true);
    expect(await linkOf(r.cardId)).toBeUndefined();
    const got = await carryOf(r.cardId);
    expect(got.card).toMatchObject({ match: "suggested", from: [] });
    expect(got.card?.suggested.map((s) => s.cardId).sort()).toEqual([real, junk].sort());
  });

  it("a Week 3 card another card here carries is taken: a second card neither links it nor is offered it", async () => {
    const appId = await app("Taken Amora Village");
    const w3 = await card(b3, { name: "Taken Amora", applicationId: appId });
    const player = ["k:w4takenplayer001"];
    await week3Session(Date.now() - 60_000, null);
    await checkInWeek3(player, w3);
    await answer(b3, 3, player, { op: "pick", key: "needs", projectId: w3, option: "love", on: true });
    clearCheckInCache();
    // The project's card here, made from its application tile, carries Week 3 by application.
    const first = await checkIn(["k:w4takenfirst001"], `a${appId}`);
    expect((await carryOf(first.cardId)).card).toMatchObject({ match: "application", from: [{ cardId: w3 }] });
    // A guest adds the Week 3 name by hand; the player checks in with it.
    const second = await card(b4, { name: "Taken Amora" });
    await checkIn(player, `p${second}`);
    expect(await linkOf(second)).toBeUndefined();
    const got = await carryOf(second);
    expect(got.card).toMatchObject({
      match: "none",
      from: [],
      suggested: [],
      carriedBy: { cardId: first.cardId, name: "Taken Amora Village", earlier: { week: 3, cardId: w3, name: "Taken Amora" } },
    });
    await expect(assertCarryConfirmable(db, { season: SEASON, week: 4, boardId: b4, card: { id: second, applicationId: null }, fromCardId: w3 }))
      .rejects.toThrow("Taken Amora Village already carries Taken Amora from Week 3. Merge this card into it.");
    // The first card itself can still be confirmed onto it.
    await expect(assertCarryConfirmable(db, { season: SEASON, week: 4, boardId: b4, card: { id: first.cardId, applicationId: appId }, fromCardId: w3 }))
      .resolves.toMatchObject({ id: w3 });
  });

  it("'Same today?' offers the card a person moved to last, by the time of each move", async () => {
    const a = await card(b3, { name: "Order Grove A" });
    const b = await card(b3, { name: "Order Grove B" });
    const player = ["k:w4ordergrove0001"];
    await checkInWeek3(player, a);
    await answer(b3, 3, player, { op: "pick", key: "needs", projectId: a, option: "love", on: true });
    await checkInWeek3(player, b);
    // A test makes both moves in one second, and a TIMESTAMP keeps whole seconds: move B's check-in a minute on.
    await db.update(sessionBoardVotes)
      .set({ createdAt: sql`CURRENT_TIMESTAMP + INTERVAL 1 MINUTE` })
      .where(and(eq(sessionBoardVotes.boardId, b3), eq(sessionBoardVotes.target, `checkin:${b}`), inArray(sessionBoardVotes.voterKey, player)));
    expect((await earlierCardsFor(db, SEASON, 4, player)).map((c) => c.cardId)).toEqual([b, a]);
  });

  it("only touches its own made-up season's rows", async () => {
    const rows = await db.select({ id: sessionBoards.id }).from(sessionBoards).where(and(eq(sessionBoards.season, SEASON)));
    expect(rows.map((r) => r.id).sort()).toEqual([...boardIds].sort());
  });
});
