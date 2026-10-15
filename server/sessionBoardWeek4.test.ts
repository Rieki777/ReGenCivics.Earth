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
import { and, eq, inArray } from "drizzle-orm";
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
import { clearCarryCache, earlierAnswerWeeks, earlierCardFor, earlierCardsFor, readCarry } from "./lib/sessionBoardCarry";
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

  beforeAll(async () => {
    db = (await getDb())!;
    b3 = (await ensureBoard(db, SEASON, 3)).id;
    b4 = (await ensureBoard(db, SEASON, 4)).id;
    boardIds.push(b3, b4);
  });

  afterAll(async () => {
    if (!db) return;
    await db.delete(sessionBoardVotes).where(inArray(sessionBoardVotes.boardId, boardIds));
    await db.delete(sessionBoardItems).where(inArray(sessionBoardItems.boardId, boardIds));
    await db.delete(sessionBoardProjects).where(inArray(sessionBoardProjects.boardId, boardIds));
    await db.delete(sessionBoards).where(inArray(sessionBoards.id, boardIds));
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
    await answer(b3, 3, player, { op: "pick", key: "players", projectId: w3, option: "6-12", on: true });
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

  it("only touches its own made-up season's rows", async () => {
    const rows = await db.select({ id: sessionBoards.id }).from(sessionBoards).where(and(eq(sessionBoards.season, SEASON)));
    expect(rows.map((r) => r.id).sort()).toEqual([...boardIds].sort());
  });
});
