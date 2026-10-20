/**
 * Week 3's board on the server (API_CONTRACT sections 3 and 8): answers to a
 * stage's prompts, the un-pick cascade, check-in tiles and checking in,
 * moving a guest's rows to the account that signs in, a person's Submissions,
 * and the admin export.
 *
 * The router's gates are checked before the database. The database half runs
 * on a made-up Season ("Board Test 2031") and made-up application season
 * (9031), passed to the lib functions directly, so it never touches a real
 * board or a real application, and it removes every row it makes.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { and, eq, inArray } from "drizzle-orm";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import { addItemInput, answerInput, checkInInput } from "./routes/sessionBoard";
import { getDb } from "./db";
import {
  applications,
  sessionBoardItems,
  sessionBoardProjects,
  sessionBoardVotes,
  sessionBoards,
} from "../drizzle/schema";
import { countByAuthor, countRows, anonOnBoard, ensureBoard, readBoardRows, type Db } from "./lib/sessionBoard";
import {
  answerOnBoard,
  anonymousCounts,
  answerRowsOverRules,
  claimGuestRows,
  countGuestRows,
  isAnonymousAnswer,
  mergeCardsOnBoard,
  isPickAnswer,
  removeItemOnBoard,
  type AnswerInput,
} from "./lib/sessionBoardAnswers";
import { checkInOnBoard, checkInOptions, clearCheckInCache } from "./lib/sessionBoardCheckIn";
import { buildBoardExport, submissionsFor } from "./lib/sessionBoardExport";
import { anonymousKeys, voteTarget } from "@shared/sessionBoard";

function makeCtx(user: TrpcContext["user"] | null, ip = "127.0.0.1"): TrpcContext {
  return {
    user,
    req: {
      protocol: "https",
      method: "POST",
      headers: {
        origin: "https://regencivics.earth",
        host: "regencivics.earth",
        "cf-connecting-ip": ip,
      },
      cookies: {},
      socket: { remoteAddress: ip },
      ip,
    } as unknown as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  } as TrpcContext;
}

const PLAYER = { id: 987650001, role: "user" } as unknown as TrpcContext["user"];
const KEY = "w3testkey00000001";

describe("week 3 board: what the router accepts", () => {
  it("addItem takes notes and questions, never an answer row", () => {
    const ok = { week: 3, voterKey: KEY, kind: "ask" as const, text: "How do circles start?", block: "s3" };
    expect(addItemInput.safeParse(ok).success).toBe(true);
    expect(addItemInput.safeParse({ ...ok, kind: "answer" }).success).toBe(false);
    expect(addItemInput.safeParse({ ...ok, block: "s100" }).success).toBe(false);
    expect(addItemInput.safeParse({ ...ok, block: "treasury" }).success).toBe(false);
    expect(addItemInput.safeParse({ ...ok, kind: "game", block: "quests" }).success).toBe(true);
  });

  it("a question comes from a prompt or needs stage, never Week 2's board", async () => {
    const caller = appRouter.createCaller(makeCtx(null, "198.51.100.61"));
    for (const block of ["s0", "s1", "s2", "s16", "s17"]) {
      await expect(caller.sessionBoard.addItem({ week: 3, voterKey: KEY, kind: "ask", text: "Why?", block }))
        .rejects.toThrow("Ask from a stage on this board.");
    }
    for (let i = 0; i < 12; i++) {
      await expect(caller.sessionBoard.addItem({ week: 2, voterKey: KEY, kind: "ask", text: "Why?", block: `s${i}` }))
        .rejects.toThrow("Ask from a stage on this board.");
    }
    await expect(caller.sessionBoard.addItem({ week: 3, voterKey: KEY, kind: "ask", text: "Why?" }))
      .rejects.toThrow("Ask from a stage on this board.");
    await expect(caller.sessionBoard.addItem({ week: 2, voterKey: KEY, kind: "game", text: "A quest", block: "s3" }))
      .rejects.toThrow("Pick a block on the canvas.");
  });

  it("answers carry a prompt key, an option key or words, and a project or none", () => {
    const pick = { op: "pick" as const, week: 3, voterKey: KEY, key: "needs", projectId: null, option: "love", on: true };
    expect(answerInput.safeParse(pick).success).toBe(true);
    expect(answerInput.safeParse({ ...pick, key: "Needs!" }).success).toBe(false);
    expect(answerInput.safeParse({ ...pick, key: "x".repeat(17) }).success).toBe(false);
    expect(answerInput.safeParse({ ...pick, option: "<b>" }).success).toBe(false);
    expect(answerInput.safeParse({ ...pick, projectId: 0 }).success).toBe(false);
    const note = { op: "note" as const, week: 3, key: "purpose", projectId: 4, text: "growing food" };
    expect(answerInput.safeParse(note).success).toBe(true);
    expect(answerInput.safeParse({ ...note, text: "" }).success).toBe(false);
    // 2500, since Week 4's card answers are JSON whose quotes escape; the server cleans every answer to its own cap.
    expect(answerInput.safeParse({ ...note, text: "x".repeat(2501) }).success).toBe(false);
  });

  it("a tile ref is one of the three shapes", () => {
    for (const ref of ["p12", "a57", "w2p8"]) expect(checkInInput.safeParse({ week: 3, ref }).success).toBe(true);
    for (const ref of ["x1", "p", "w2", "a57; drop", "p12 "]) expect(checkInInput.safeParse({ week: 3, ref }).success).toBe(false);
  });

  it("the export is for admins, Submissions and the guest claim for signed-in people", async () => {
    const guest = appRouter.createCaller(makeCtx(null));
    const player = appRouter.createCaller(makeCtx(PLAYER));
    await expect(guest.sessionBoard.adminExport()).rejects.toThrow();
    await expect(player.sessionBoard.adminExport()).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(guest.sessionBoard.mySubmissions()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await expect(guest.sessionBoard.claimGuest({ voterKey: KEY })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await expect(player.sessionBoard.claimGuest({ voterKey: "not a key" })).rejects.toThrow();
    await expect(guest.sessionBoard.guestRows({ voterKey: KEY })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    // The facilitator check reads role holders from the database; CI's unit job
    // has none, so there the call can only be refused, not refused as FORBIDDEN.
    if (process.env.DATABASE_URL) {
      await expect(player.sessionBoard.mergeProject({ week: 3, projectId: 1, intoId: 2 })).rejects.toMatchObject({ code: "FORBIDDEN" });
    } else {
      await expect(player.sessionBoard.mergeProject({ week: 3, projectId: 1, intoId: 2 })).rejects.toThrow();
    }
  });

  it("Week 2's board takes no check-ins: it has no Tap your project stage", async () => {
    const guest = appRouter.createCaller(makeCtx(null, "198.51.100.62"));
    await expect(guest.sessionBoard.checkInOptions({ week: 2 })).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(guest.sessionBoard.checkIn({ week: 2, voterKey: KEY, ref: "a57" })).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("a pick can't be reworded; words can", () => {
    expect(isPickAnswer(3, { kind: "answer", block: "needs" })).toBe(true);
    expect(isPickAnswer(3, { kind: "answer", block: "purpose" })).toBe(false);
    expect(isPickAnswer(3, { kind: "opp", block: null })).toBe(false);
  });

  it("joining two identities keeps the newest rows inside each prompt's rules", () => {
    const at = (s: number) => new Date(1_700_000_000_000 + s * 1000);
    const rows = [
      { id: 1, block: "n-love", projectId: 5, text: "unmet", createdAt: at(1) },
      { id: 2, block: "n-love", projectId: 5, text: "alive", createdAt: at(2) },
      { id: 3, block: "needs", projectId: 5, text: "love", createdAt: at(1) },
      { id: 4, block: "needs", projectId: 5, text: "love", createdAt: at(3) },
      { id: 5, block: "needs", projectId: 5, text: "play", createdAt: at(1) },
      { id: 6, block: "want", projectId: 5, text: "a", createdAt: at(1) },
      { id: 7, block: "want", projectId: 5, text: "b", createdAt: at(2) },
      { id: 8, block: "want", projectId: 5, text: "c", createdAt: at(3) },
      { id: 9, block: "want", projectId: 5, text: "d", createdAt: at(4) },
      { id: 10, block: "n-love", projectId: null, text: "thriving", createdAt: at(1) },
      { id: 11, block: "retired-key", projectId: 5, text: "x", createdAt: at(1) },
      { id: 12, block: "retired-key", projectId: 5, text: "x", createdAt: at(2) },
    ];
    expect(answerRowsOverRules(3, rows)).toEqual([1, 3, 6]);
  });
});

const skipIfNoDb = !process.env.DATABASE_URL;
const SEASON = "Board Test 2031";
const APP_SEASON = 9031;
const TEST_USER = 987650001;
const OTHER_USER = 987650002;
const APP_OWNER = 987650999;

describe.skipIf(skipIfNoDb)("week 3 board: the database layer", () => {
  let db: Db;
  const boardIds: number[] = [];
  const appIds: number[] = [];
  let b2 = 0;
  let b3 = 0;
  let b4 = 0;

  const insertId = (res: unknown) => Number((res as [{ insertId: number }])[0]?.insertId ?? (res as { insertId: number }).insertId);
  const card = async (boardId: number, values: Partial<typeof sessionBoardProjects.$inferInsert> & { name: string }) =>
    insertId(await db.insert(sessionBoardProjects).values({ boardId, ...values }));
  const app = async (name: string, status: "draft" | "submitted" | "under_review" | "approved" | "active", location = "Test Valley") => {
    const id = insertId(await db.insert(applications).values({
      userId: APP_OWNER,
      status,
      season: APP_SEASON,
      projectName: name,
      projectType: "early_stage",
      location,
      vision: "A village that grows food.",
      landStatus: "owned",
      teamSize: 3,
      teamDescription: "Three founders",
      regenerativePractices: "Swales",
      governanceApproach: "Consent",
      communityEngagement: "Work days",
      timeCommitment: "Weekly",
      fundingNeeds: "Tools",
    }));
    appIds.push(id);
    return id;
  };
  const answer = (keys: string[], input: AnswerInput, opts: { boardId?: number; facilitator?: boolean } = {}) =>
    answerOnBoard(db, { boardId: opts.boardId ?? b3, week: 3, keys, facilitator: opts.facilitator ?? false, input });
  const rowsOf = async (boardId: number, authorKey: string) =>
    db.select().from(sessionBoardItems).where(and(eq(sessionBoardItems.boardId, boardId), eq(sessionBoardItems.authorKey, authorKey)));

  beforeAll(async () => {
    db = (await getDb())!;
    b2 = (await ensureBoard(db, SEASON, 2)).id;
    b3 = (await ensureBoard(db, SEASON, 3)).id;
    b4 = (await ensureBoard(db, SEASON, 4)).id;
    boardIds.push(b2, b3, b4);
  });

  afterAll(async () => {
    if (!db) return;
    if (boardIds.length) {
      await db.delete(sessionBoardVotes).where(inArray(sessionBoardVotes.boardId, boardIds));
      await db.delete(sessionBoardItems).where(inArray(sessionBoardItems.boardId, boardIds));
      await db.delete(sessionBoardProjects).where(inArray(sessionBoardProjects.boardId, boardIds));
      await db.delete(sessionBoards).where(inArray(sessionBoards.id, boardIds));
    }
    if (appIds.length) await db.delete(applications).where(inArray(applications.id, appIds));
  });

  it("refuses each wrong answer with its own sentence", async () => {
    const keys = ["k:w3refusals000001"];
    const hidden = await card(b3, { name: "Refusal Hidden Farm", hidden: 1 });
    await expect(answer(keys, { op: "pick", key: "nope", projectId: null, option: "a", on: true }))
      .rejects.toMatchObject({ code: "NOT_FOUND", message: "That question isn't on this board." });
    await expect(answer(keys, { op: "note", key: "feel", projectId: null, text: "tired" }))
      .rejects.toThrow("That one stays on your screen.");
    await expect(answer(keys, { op: "note", key: "ask", projectId: null, text: "Why?" }))
      .rejects.toThrow("Add a question with the question box.");
    await expect(answer(keys, { op: "pick", key: "purpose", projectId: null, option: "love", on: true }))
      .rejects.toThrow("That question takes words.");
    await expect(answer(keys, { op: "note", key: "needs", projectId: null, text: "love" }))
      .rejects.toThrow("Tap one of the choices.");
    await expect(answer(keys, { op: "pick", key: "needs", projectId: null, option: "money", on: true }))
      .rejects.toThrow("Tap one of the choices.");
    await expect(answer(keys, { op: "pick", key: "needs", projectId: hidden, option: "love", on: true }))
      .rejects.toMatchObject({ code: "NOT_FOUND", message: "That project is not on this board." });
    await expect(answer(keys, { op: "pick", key: "needs", projectId: 2_000_000_000, option: "love", on: true }))
      .rejects.toThrow("That project is not on this board.");
    await expect(answer(keys, { op: "note", key: "purpose", projectId: null, text: "  \u200b  " }))
      .rejects.toThrow("Write something first.");
    expect(await rowsOf(b3, keys[0])).toHaveLength(0);
  });

  it("a prompt with room for one replaces the answer in place: same row, new words, new time", async () => {
    const keys = ["k:w3replace0000001"];
    const p = await card(b3, { name: "Replace Garden" });
    const first = await answer(keys, { op: "pick", key: "n-love", projectId: p, option: "unmet", on: true });
    expect(first.id).toBeGreaterThan(0);
    await db.update(sessionBoardItems).set({ createdAt: new Date("2020-01-01T00:00:00Z") }).where(eq(sessionBoardItems.id, first.id!));
    const again = await answer(keys, { op: "pick", key: "n-love", projectId: p, option: "unmet", on: true });
    expect(again).toEqual({ ok: true, id: first.id, removedIds: [] });
    const second = await answer(keys, { op: "pick", key: "n-love", projectId: p, option: "alive", on: true });
    expect(second.id).toBe(first.id);
    const rows = await rowsOf(b3, keys[0]);
    expect(rows).toHaveLength(1);
    expect(rows[0].text).toBe("alive");
    expect(new Date(rows[0].createdAt).getTime()).toBeGreaterThan(new Date("2020-01-02T00:00:00Z").getTime());

    const note = await answer(keys, { op: "note", key: "purpose", projectId: p, text: "  growing   food together " });
    const note2 = await answer(keys, { op: "note", key: "purpose", projectId: p, text: "healing the valley" });
    expect(note2.id).toBe(note.id);
    const purpose = (await rowsOf(b3, keys[0])).filter((r) => r.block === "purpose");
    expect(purpose.map((r) => r.text)).toEqual(["healing the valley"]);
  });

  it("a prompt with room for three refuses a fourth, and a seed needs its pick first", async () => {
    const keys = ["k:w3maxthree000001"];
    const p = await card(b3, { name: "Max Three Commons" });
    for (const t of ["food", "shade", "songs"]) await answer(keys, { op: "note", key: "want", projectId: p, text: t });
    await expect(answer(keys, { op: "note", key: "want", projectId: p, text: "more" }))
      .rejects.toThrow("That's all of yours for this one. Take one back to change it.");

    await expect(answer(keys, { op: "pick", key: "top", projectId: p, option: "love", on: true }))
      .rejects.toThrow("Pick this human need first, then plant a seed on it.");
    for (const n of ["love", "play", "growth", "vitality"]) await answer(keys, { op: "pick", key: "needs", projectId: p, option: n, on: true });
    for (const n of ["love", "play", "growth"]) await answer(keys, { op: "pick", key: "top", projectId: p, option: n, on: true });
    await expect(answer(keys, { op: "pick", key: "top", projectId: p, option: "vitality", on: true }))
      .rejects.toThrow("Three seeds each. Take one back to move it.");
    // Same option again is a no-op, not a refusal.
    await expect(answer(keys, { op: "pick", key: "top", projectId: p, option: "love", on: true })).resolves.toMatchObject({ ok: true });
    // Facilitators answer as themselves: the max holds for them too.
    await expect(answer(keys, { op: "pick", key: "top", projectId: p, option: "vitality", on: true }, { facilitator: true }))
      .rejects.toThrow("Three seeds each.");
  });

  it("room prompts drop the project; anonymous ones keep no name, and the room sees counts only", async () => {
    const keys = ["k:w3roomanon000001"];
    const p = await card(b3, { name: "Room Scope Farm" });
    const landed = await answer(keys, { op: "note", key: "landed", projectId: p, text: "the ladder", displayName: "Ada" });
    const mate = await answer(keys, { op: "pick", key: "mate", projectId: p, option: "some", on: true, displayName: "Ada" });
    const rows = await rowsOf(b3, keys[0]);
    const byId = new Map(rows.map((r) => [r.id, r]));
    expect(byId.get(landed.id!)).toMatchObject({ projectId: null, displayName: "Ada", block: "landed" });
    expect(byId.get(mate.id!)).toMatchObject({ projectId: null, displayName: null, block: "mate", text: "some" });

    // Two more people, so the counts mean something.
    await answer(["k:w3roomanon000002"], { op: "pick", key: "mate", projectId: null, option: "some", on: true });
    await answer(["k:w3roomanon000003"], { op: "pick", key: "mate", projectId: null, option: "fully", on: true });

    const anon = anonymousKeys(3);
    for (const includeHidden of [false, true]) {
      const all = await readBoardRows(db, b3, { includeHidden });
      const shown = all.items.filter((i) => !isAnonymousAnswer(anon, i));
      expect(shown.some((i) => i.block === "mate")).toBe(false);
      expect(shown.some((i) => i.id === landed.id)).toBe(true);
      const counts = anonymousCounts(3, all.items);
      expect(counts.mate).toEqual({ hardly: 0, little: 0, some: 2, mostly: 0, fully: 1 });
      expect(Object.keys(counts).sort()).toEqual(["mate", "pulse-a", "pulse-b", "useful"]);
      expect(counts.useful).toEqual({ notyet: 0, little: 0, useful: 0, very: 0, exactly: 0 });
    }
    expect(await anonOnBoard(db, b3, keys, anon)).toEqual([{ key: "mate", option: "some" }]);
    // Changing an anonymous pick replaces it.
    await answer(keys, { op: "pick", key: "mate", projectId: null, option: "mostly", on: true });
    expect(await anonOnBoard(db, b3, keys, anon)).toEqual([{ key: "mate", option: "mostly" }]);
  });

  it("un-picking a human need takes its seed and per-need answers with it, through answer and through removeItem", async () => {
    const keys = ["u:" + TEST_USER, "k:w3cascade0000001"];
    const other = ["k:w3cascadeother01"];
    const p = await card(b3, { name: "Cascade Gardens" });
    const plant = async (who: string[]) => {
      const pick = await answer(who, { op: "pick", key: "needs", projectId: p, option: "love", on: true });
      const seed = await answer(who, { op: "pick", key: "top", projectId: p, option: "love", on: true });
      const per = [];
      for (const [key, option] of [["n-love", "unmet"], ["g-love", "thriving"], ["b-love", "50"], ["m-love", "circle"]]) {
        per.push((await answer(who, { op: "pick", key, projectId: p, option, on: true })).id!);
      }
      await answer(who, { op: "pick", key: "needs", projectId: p, option: "play", on: true });
      const playN = await answer(who, { op: "pick", key: "n-play", projectId: p, option: "alive", on: true });
      return { pick: pick.id!, seed: seed.id!, per, playN: playN.id! };
    };
    const mine = await plant(keys);
    const theirs = await plant(other);

    const off = await answer(keys, { op: "pick", key: "needs", projectId: p, option: "love", on: false });
    expect(off.id).toBeNull();
    expect(off.removedIds).toEqual([mine.pick, mine.seed, ...mine.per].sort((a, b) => a - b));
    const left = (await rowsOf(b3, keys[0])).map((r) => r.block).sort();
    expect(left).toEqual(["n-play", "needs"]);
    // The other person's love is untouched.
    expect((await rowsOf(b3, other[0])).filter((r) => r.block?.endsWith("love") || r.text === "love")).toHaveLength(6);
    // Nothing to take back is not an error.
    await expect(answer(keys, { op: "pick", key: "needs", projectId: p, option: "love", on: false }))
      .resolves.toEqual({ ok: true, id: null, removedIds: [] });

    const [theirPick] = await db.select().from(sessionBoardItems).where(eq(sessionBoardItems.id, theirs.pick));
    const removed = await removeItemOnBoard(db, { boardId: b3, item: theirPick, cascadeKeys: other });
    expect(removed).toEqual([theirs.pick, theirs.seed, ...theirs.per].sort((a, b) => a - b));
    expect((await rowsOf(b3, other[0])).map((r) => r.block).sort()).toEqual(["n-play", "needs"]);
  });

  it("answers have their own ceilings: they never count toward the notes cap or the notes count", async () => {
    const keys = ["k:w3ceilings000001"];
    const before = await countRows(db, "items", b3);
    await answer(keys, { op: "note", key: "hope", projectId: null, text: "clarity" });
    await answer(keys, { op: "pick", key: "allies", projectId: null, option: "bees", on: true });
    await db.insert(sessionBoardItems).values({ boardId: b3, kind: "ask", text: "When is Week 4?", block: "s13", authorKey: keys[0] });
    expect(await countByAuthor(db, "items", b3, keys)).toBe(1);
    expect(await countRows(db, "items", b3)).toBe(before + 1);
  });

  it("check-in tiles: this board's cards, then earlier weeks', then applications, deduped and in name order", async () => {
    clearCheckInCache();
    const approvedHere = await app("Ojai Test Ranch", "approved", "Ojai, CA");
    const hiddenApp = await app("Hidden Test Hollow", "submitted");
    const submitted = await app("River Test Commons", "submitted", "Somewhere secret");
    const tbd = await app("Mesa Test Garden", "approved", "TBD");
    const active = await app("Oak Test Hollow", "active", "Big Sur");
    const sameAsEarlier = await app("Toa Test Hermitage", "approved", "Hawaii");
    const twinA = await app("Twin Test Names", "under_review");
    const twinB = await app("twin  test names!", "submitted");
    const draft = await app("Draft Test Farm", "draft");

    const here = await card(b3, { name: "Ojai Test Ranch (board)", applicationId: approvedHere });
    await card(b3, { name: "Hidden Test Hollow", hidden: 1 });
    const earlier = await card(b2, { name: "Toa Test Hermitage", place: "Big Island", authorKey: "k:w3earlierwriter1", displayName: "Kai" });
    await card(b2, { name: "Hidden Week Two Test", hidden: 1 });
    await db.insert(sessionBoardVotes).values([
      { boardId: b3, target: voteTarget.checkin(here), voterKey: "k:w3tilecount00001" },
      { boardId: b3, target: voteTarget.checkin(here), voterKey: "k:w3tilecount00002" },
    ]);

    const { tiles } = await checkInOptions(db, { season: SEASON, week: 3, appSeason: APP_SEASON });
    const mineTiles = tiles.filter((t) => /test/i.test(t.name));
    const byRef = new Map(mineTiles.map((t) => [t.ref, t]));
    expect(byRef.get(`p${here}`)).toMatchObject({ from: "board", cardId: here, here: 2, fromWeek: null });
    expect(byRef.get(`w2p${earlier}`)).toMatchObject({ from: "earlier", fromWeek: 2, cardId: null, place: "Big Island", here: 0 });
    expect(byRef.get(`a${submitted}`)).toMatchObject({ from: "application", place: null, cardId: null });
    expect(byRef.get(`a${tbd}`)).toMatchObject({ place: null });
    expect(byRef.get(`a${active}`)).toMatchObject({ place: "Big Sur" });
    // Deduped: an application with a card here, one that matches a hidden card,
    // one an earlier week's card already names, the second of two same names,
    // a draft, and an earlier week's hidden card.
    for (const id of [approvedHere, hiddenApp, sameAsEarlier, draft]) expect(byRef.has(`a${id}`)).toBe(false);
    expect([byRef.has(`a${twinA}`), byRef.has(`a${twinB}`)].filter(Boolean)).toHaveLength(1);
    expect(mineTiles.some((t) => t.name === "Hidden Week Two Test" || t.name === "Hidden Test Hollow")).toBe(false);
    // Names only: nothing else from an application.
    for (const t of mineTiles) expect(Object.keys(t).sort()).toEqual(["cardId", "from", "fromWeek", "here", "name", "place", "ref"]);
    const names = tiles.map((t) => t.name.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim());
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)));
  });

  it("checks in with every kind of tile: finds, links or makes the card, once, and marks the person here", async () => {
    clearCheckInCache();
    const keys = ["k:w3checkin0000001"];
    const appTile = await app("Check Test Meadow", "submitted", "Private Lane");
    const linkTile = await app("Linked Test Grove", "active", "Mendocino");
    const twinTile = await app("Race Test Orchard", "under_review");
    const earlierMatch = await app("Carried Test Farm", "approved");
    const hiddenApp = await app("Gone Test Valley", "approved");
    const draft = await app("Draft Check Test", "draft");
    const named = await card(b3, { name: "linked test grove" });
    const hidden = await card(b3, { name: "Gone Test Valley", hidden: 1 });
    const earlier = await card(b2, { name: "Carried Test Farm", url: "https://carried.example", authorKey: "u:" + OTHER_USER, displayName: "Rae" });
    // An application whose name a guest typed onto a card: the guest's card is
    // never tied to it, so they can't rename it and hide the real tile.
    const guestNamedApp = await app("Squat Test Ranch", "approved");
    const guestNamed = await card(b3, { name: "Squat Test Ranch", authorKey: "k:w3squatter000001" });
    const ownerEarlierApp = await app("Owner Test Farm", "approved");
    const ownerEarlier = await card(b2, { name: "Owner Test Farm", authorKey: "u:" + APP_OWNER });
    const check = (ref: string, who = keys) => checkInOnBoard(db, { season: SEASON, boardId: b3, week: 3, keys: who, ref, appSeason: APP_SEASON });

    const made = await check(`a${appTile}`);
    expect(made).toMatchObject({ ok: true, name: "Check Test Meadow", created: true });
    const [madeCard] = await db.select().from(sessionBoardProjects).where(eq(sessionBoardProjects.id, made.cardId));
    expect(madeCard).toMatchObject({ boardId: b3, applicationId: appTile, authorKey: null, displayName: null, place: null });
    expect(await check(`a${appTile}`)).toMatchObject({ cardId: made.cardId, created: false });
    expect(await check(`p${made.cardId}`, ["k:w3checkin0000002"])).toMatchObject({ cardId: made.cardId, created: false });
    const marks = await db.select().from(sessionBoardVotes)
      .where(and(eq(sessionBoardVotes.boardId, b3), eq(sessionBoardVotes.target, voteTarget.checkin(made.cardId))));
    expect(marks.map((m) => m.voterKey).sort()).toEqual(["k:w3checkin0000001", "k:w3checkin0000002"]);

    const linked = await check(`a${linkTile}`);
    expect(linked).toMatchObject({ cardId: named, created: false });
    const [linkedCard] = await db.select().from(sessionBoardProjects).where(eq(sessionBoardProjects.id, named));
    expect(linkedCard.applicationId).toBe(linkTile);

    const carried = await check(`w2p${earlier}`);
    expect(carried.created).toBe(true);
    const [carriedCard] = await db.select().from(sessionBoardProjects).where(eq(sessionBoardProjects.id, carried.cardId));
    // Its writer isn't the applicant, so the same name links nothing.
    expect(carriedCard).toMatchObject({
      boardId: b3, name: "Carried Test Farm", url: "https://carried.example",
      authorKey: "u:" + OTHER_USER, displayName: "Rae", applicationId: null,
    });
    expect(earlierMatch).toBeGreaterThan(0);
    const ownerCarried = await check(`w2p${ownerEarlier}`);
    const [ownerCard] = await db.select().from(sessionBoardProjects).where(eq(sessionBoardProjects.id, ownerCarried.cardId));
    expect(ownerCard.applicationId).toBe(ownerEarlierApp);
    expect(await check(`a${guestNamedApp}`)).toMatchObject({ cardId: guestNamed, created: false });
    const [squat] = await db.select().from(sessionBoardProjects).where(eq(sessionBoardProjects.id, guestNamed));
    expect(squat.applicationId).toBeNull();
    expect(await check(`w2p${earlier}`)).toMatchObject({ cardId: carried.cardId, created: false });

    // Two taps at once on one new tile make one card.
    const [one, two] = await Promise.all([check(`a${twinTile}`), check(`a${twinTile}`, ["k:w3checkin0000003"])]);
    expect(one.cardId).toBe(two.cardId);
    expect([one.created, two.created].sort()).toEqual([false, true]);
    const twins = await db.select().from(sessionBoardProjects)
      .where(and(eq(sessionBoardProjects.boardId, b3), eq(sessionBoardProjects.applicationId, twinTile)));
    expect(twins).toHaveLength(1);

    await expect(check(`p${hidden}`)).rejects.toMatchObject({ code: "NOT_FOUND", message: "That project is not on this board." });
    await expect(check(`p${earlier}`)).rejects.toThrow("That project is not on this board.");
    await expect(check(`a${hiddenApp}`)).rejects.toThrow("That project isn't open for check-in.");
    await expect(check(`a${draft}`)).rejects.toThrow("That project isn't open for check-in.");
    await expect(check("a2000000000")).rejects.toThrow("That project isn't open for check-in.");
    await expect(check(`w3p${made.cardId}`)).rejects.toThrow("That project isn't open for check-in.");
    await expect(check(`w1p${earlier}`)).rejects.toThrow("That project isn't open for check-in.");

    // A tile left over from before the facilitator hid its card is refused too.
    await db.update(sessionBoardProjects).set({ hidden: 1 }).where(eq(sessionBoardProjects.id, carried.cardId));
    await expect(check(`w2p${earlier}`)).rejects.toThrow("That project isn't open for check-in.");
    clearCheckInCache();
    const { tiles } = await checkInOptions(db, { season: SEASON, week: 3, appSeason: APP_SEASON });
    expect(tiles.some((t) => t.ref === `w2p${earlier}` || t.ref === `p${carried.cardId}` || t.ref === `a${earlierMatch}`)).toBe(false);
  });

  it("a guest's rows move to the account that signs in: cards, notes, votes; clashes merge; twice is a no-op", async () => {
    const guestKey = "w3claimguest00001";
    const from = `k:${guestKey}`;
    const to = `u:${TEST_USER}`;
    const p = await card(b3, { name: "Claim Test Commons" });
    const guestCard = await card(b3, { name: "Guest Test Card", authorKey: from });
    const w2card = await card(b2, { name: "Guest Week Two Card", authorKey: from, phase: "sprout" });

    // The account answered n-love first; the guest browser later.
    const acct = await answer([to], { op: "pick", key: "n-love", projectId: p, option: "alive", on: true });
    await db.update(sessionBoardItems).set({ createdAt: new Date("2026-10-14T17:00:00Z") }).where(eq(sessionBoardItems.id, acct.id!));
    const guest = await answer([from], { op: "pick", key: "n-love", projectId: p, option: "unmet", on: true });
    await db.update(sessionBoardItems).set({ createdAt: new Date("2026-10-14T17:05:00Z") }).where(eq(sessionBoardItems.id, guest.id!));
    // Both picked the same human need.
    const acctNeed = await answer([to], { op: "pick", key: "needs", projectId: p, option: "love", on: true });
    await answer([from], { op: "pick", key: "needs", projectId: p, option: "love", on: true });
    const note = await answer([from], { op: "note", key: "hope", projectId: null, text: "a clear first step" });
    await db.insert(sessionBoardItems).values({ boardId: b2, kind: "arrive", text: "Curious", authorKey: from });
    await db.insert(sessionBoardVotes).values([
      { boardId: b3, target: voteTarget.checkin(p), voterKey: from },
      { boardId: b3, target: voteTarget.checkin(p), voterKey: to },
      { boardId: b2, target: voteTarget.week(5), voterKey: from },
    ]);

    const first = await claimGuestRows(db, guestKey, TEST_USER);
    expect(first).toMatchObject({ ok: true, boards: 2 });
    // Moved: 1 vote, 2 cards, the arrival word, the note, the newer n-love and
    // the newer love pick. Merged: the clashing vote, and the account's older
    // n-love and love pick.
    expect(first.moved).toBe(7);
    expect(first.merged).toBe(3);

    expect(await rowsOf(b3, from)).toHaveLength(0);
    expect(await rowsOf(b2, from)).toHaveLength(0);
    const answers = (await rowsOf(b3, to)).filter((r) => r.projectId === p);
    expect(answers.filter((r) => r.block === "n-love").map((r) => [r.id, r.text])).toEqual([[guest.id, "unmet"]]);
    expect(answers.filter((r) => r.block === "needs")).toHaveLength(1);
    expect(answers.some((r) => r.id === acct.id)).toBe(false);
    expect(acctNeed.id).toBeGreaterThan(0);
    expect((await rowsOf(b3, to)).some((r) => r.id === note.id)).toBe(true);
    const cards = await db.select().from(sessionBoardProjects).where(inArray(sessionBoardProjects.id, [guestCard, w2card]));
    expect(cards.map((c) => c.authorKey)).toEqual([to, to]);
    const votes = await db.select().from(sessionBoardVotes).where(inArray(sessionBoardVotes.boardId, [b2, b3]));
    expect(votes.filter((v) => v.voterKey === from)).toHaveLength(0);
    expect(votes.filter((v) => v.voterKey === to).map((v) => v.target).sort()).toEqual([voteTarget.checkin(p), voteTarget.week(5)].sort());

    expect(await claimGuestRows(db, guestKey, TEST_USER)).toEqual({ ok: true, moved: 0, merged: 0, boards: 0 });
  });

  it("asks before a claim with a count only, and a claim keeps three opportunity votes per person", async () => {
    const guestKey = "w3claimcap0000001";
    const from = `k:${guestKey}`;
    const to = `u:${TEST_USER + 7}`;
    const opps: number[] = [];
    for (let i = 0; i < 4; i++) {
      opps.push(insertId(await db.insert(sessionBoardItems).values({ boardId: b2, kind: "opp", text: `Cap test opportunity ${i}`, authorKey: "k:someoneelse00002" })));
    }
    // Three as a guest on a phone, then two more signed in on a laptop.
    await db.insert(sessionBoardVotes).values([
      { boardId: b2, target: voteTarget.item(opps[0]), voterKey: from },
      { boardId: b2, target: voteTarget.item(opps[1]), voterKey: from },
      { boardId: b2, target: voteTarget.item(opps[2]), voterKey: from },
    ]);
    await db.insert(sessionBoardVotes).values([
      { boardId: b2, target: voteTarget.item(opps[2]), voterKey: to },
      { boardId: b2, target: voteTarget.item(opps[3]), voterKey: to },
    ]);
    expect(await countGuestRows(db, guestKey)).toBe(3);
    // Counting moved nothing.
    expect((await db.select().from(sessionBoardVotes).where(eq(sessionBoardVotes.voterKey, from)))).toHaveLength(3);

    const r = await claimGuestRows(db, guestKey, TEST_USER + 7);
    const mine = await db.select().from(sessionBoardVotes)
      .where(and(eq(sessionBoardVotes.boardId, b2), eq(sessionBoardVotes.voterKey, to)));
    expect(mine.filter((v) => v.target.startsWith("item:"))).toHaveLength(3);
    expect(r.moved + r.merged).toBe(3);
    expect(await countGuestRows(db, guestKey)).toBe(0);
  });

  it("merging a stray card moves its answers and check-ins to the card kept, then hides it", async () => {
    const keep = await card(b3, { name: "Merge Test Hermitage" });
    const stray = await card(b3, { name: "Merge Test Hermitage Sanctuary", applicationId: null });
    const a = "k:w3mergeperson001";
    const b = "k:w3mergeperson002";
    // a answered on both cards; b only on the stray.
    await answer([a], { op: "pick", key: "n-love", projectId: keep, option: "alive", on: true });
    const newer = await answer([a], { op: "pick", key: "n-love", projectId: stray, option: "unmet", on: true });
    await db.update(sessionBoardItems).set({ createdAt: new Date("2030-01-01T00:00:00Z") }).where(eq(sessionBoardItems.id, newer.id!));
    const bNeed = await answer([b], { op: "pick", key: "needs", projectId: stray, option: "play", on: true });
    await db.insert(sessionBoardVotes).values([
      { boardId: b3, target: voteTarget.checkin(keep), voterKey: a },
      { boardId: b3, target: voteTarget.checkin(stray), voterKey: a },
      { boardId: b3, target: voteTarget.checkin(stray), voterKey: b },
    ]);

    await expect(mergeCardsOnBoard(db, { boardId: b3, week: 3, fromId: stray, intoId: stray })).rejects.toThrow("Pick a different card to merge into.");
    const r = await mergeCardsOnBoard(db, { boardId: b3, week: 3, fromId: stray, intoId: keep });
    expect(r.ok).toBe(true);

    const onKeep = await db.select().from(sessionBoardItems).where(and(eq(sessionBoardItems.boardId, b3), eq(sessionBoardItems.projectId, keep)));
    // a keeps one n-love, the newer; b's need came across.
    expect(onKeep.filter((i) => i.authorKey === a && i.block === "n-love").map((i) => i.text)).toEqual(["unmet"]);
    expect(onKeep.some((i) => i.id === bNeed.id)).toBe(true);
    const left = await db.select().from(sessionBoardItems).where(eq(sessionBoardItems.projectId, stray));
    expect(left).toHaveLength(0);
    const checkins = await db.select().from(sessionBoardVotes).where(and(eq(sessionBoardVotes.boardId, b3), inArray(sessionBoardVotes.voterKey, [a, b])));
    expect(checkins.map((v) => `${v.voterKey}|${v.target}`).sort()).toEqual([`${a}|${voteTarget.checkin(keep)}`, `${b}|${voteTarget.checkin(keep)}`].sort());
    const [strayRow] = await db.select().from(sessionBoardProjects).where(eq(sessionBoardProjects.id, stray));
    expect(strayRow.hidden).toBe(1);
  });

  it("Submissions list one person's own answers week by week, newest week first", async () => {
    const me = `u:${OTHER_USER + 100}`;
    const userId = OTHER_USER + 100;
    // Week 2: an arrival word, a card with something written, a vote on an opportunity, a hand, and a hidden note.
    const opp = insertId(await db.insert(sessionBoardItems).values({ boardId: b2, kind: "opp", text: "Shared tool library", authorKey: "k:someoneelse00001" }));
    const w2card = await card(b2, { name: "Profile Test Grove", authorKey: me, phase: "sprout", nextMove: "Call the water board" });
    await db.insert(sessionBoardItems).values([
      { boardId: b2, kind: "arrive", text: "Curious", authorKey: me },
      { boardId: b2, kind: "pain", text: "Taken down", authorKey: me, hidden: 1 },
      { boardId: b2, kind: "pain", text: "Not mine", authorKey: "k:someoneelse00001" },
    ]);
    await db.insert(sessionBoardVotes).values([
      { boardId: b2, target: voteTarget.item(opp), voterKey: me },
      { boardId: b2, target: voteTarget.week(6), voterKey: me },
    ]);
    // Week 3: a check-in, a human need, an anonymous pulse.
    const w3card = await card(b3, { name: "Profile Test Grove" });
    await db.insert(sessionBoardVotes).values({ boardId: b3, target: voteTarget.checkin(w3card), voterKey: me });
    await answer([me], { op: "pick", key: "needs", projectId: w3card, option: "love", on: true });
    await answer([me], { op: "pick", key: "pulse-a", projectId: null, option: "clear", on: true });
    // Week 4: only a card a check-in carried forward, with nothing written on it.
    await card(b4, { name: "Profile Test Grove", authorKey: me });

    const { weeks } = await submissionsFor(db, SEASON, userId);
    expect(weeks.map((w) => w.week)).toEqual([3, 2]);
    const [w3, w2] = weeks;
    expect(w3.href).toBe("/season2/week/3");
    expect(w3.projects).toEqual([{ cardId: w3card, name: "Profile Test Grove", how: "checked in" }]);
    expect(w3.entries.map((e) => [e.label, e.value, e.project, e.anonymous])).toEqual([
      ["A human need your project is here to meet", expect.any(String), "Profile Test Grove", false],
      ["How it was landing", expect.any(String), null, true],
    ]);
    expect(w3.entries[0].stage).toBe("What your project is for");

    expect(w2.projects).toEqual([{ cardId: w2card, name: "Profile Test Grove", how: "added" }]);
    const labels = w2.entries.map((e) => e.label);
    expect(labels).toContain("Your arrival word");
    expect(labels).toContain("You voted for");
    expect(labels).toContain("You raised a hand for");
    expect(labels).toContain("Where your project is");
    expect(labels).toContain("Your one move");
    expect(w2.entries.find((e) => e.label === "You voted for")?.value).toBe("Shared tool library");
    expect(w2.entries.some((e) => e.value === "Taken down" || e.value === "Not mine")).toBe(false);
    expect(w2.entries.every((e) => /^(i\d+|v\d+|c\d+:\w+)$/.test(e.id))).toBe(true);
    expect(JSON.stringify(weeks)).not.toMatch(/[ku]:/);

    expect(await submissionsFor(db, SEASON, 2_000_000_001)).toEqual({ weeks: [] });
  });

  it("the export carries every week's rows, anonymous answers with no author, and never a guest key", async () => {
    const data = await buildBoardExport(db, SEASON, [2, 3, 9]);
    expect(data.why).toBe("We read these answers to shape how we build Village OS.");
    expect(data.weeks.map((w) => [w.week, w.status])).toEqual([[2, "open"], [3, "open"], [9, "none"]]);
    const json = JSON.stringify(data);
    expect(json).not.toMatch(/"k:|k:w3/);
    const w3 = data.weeks[1];
    expect(w3.rows.some((r) => r.key === "mate" || r.key === "pulse-a")).toBe(false);
    expect(w3.anonymous.length).toBeGreaterThan(0);
    for (const a of w3.anonymous) expect(Object.keys(a).sort()).toEqual(["createdAt", "key", "label", "value"]);
    expect(w3.summary).not.toBeNull();
    expect(w3.projects.some((p) => p.hidden)).toBe(true);
    const linked = w3.projects.find((p) => p.applicationStatus === "active");
    expect(linked?.adminPath).toBe(`/admin?tab=applications&open=${linked?.applicationId}`);
    expect(linked?.projectPath).toMatch(/^\/project\//);
    const submitted = w3.projects.find((p) => p.applicationStatus === "submitted");
    expect(submitted?.projectPath).toBeNull();
    expect(submitted?.adminPath).toMatch(/^\/admin\?tab=applications&open=\d+$/);
    expect(w3.projects.some((p) => p.checkins > 0)).toBe(true);
    expect(w3.votes.some((v) => v.target.startsWith("checkin:"))).toBe(false);
    for (const r of w3.rows) {
      if (r.author === "guest") expect(r.userId).toBeNull();
      if (r.author === "signed-in") expect(r.userId).toBeGreaterThan(0);
    }
    expect(w3.projectViews.length).toBeGreaterThan(0);
    expect(data.weeks[0].summary).toBeNull();
  });
});
