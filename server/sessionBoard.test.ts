/**
 * Session boards (ADR-68): the router's gates before the database, and the
 * database layer against a real database.
 *
 * The database half runs on a made-up Season ("Board Test 2030"), passed to
 * the lib functions directly, so it never touches a real Season 2 board even
 * when DATABASE_URL points somewhere that matters. It removes every row it
 * makes.
 */
import { afterAll, describe, expect, it } from "vitest";
import { and, eq, inArray } from "drizzle-orm";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import { addItemInput, callerKeys, updateProjectInput } from "./routes/sessionBoard";
import { getContactTags, getDb, getGeneralInquiryById } from "./db";
import {
  contactTags,
  generalInquiries,
  sessionBoardItems,
  sessionBoardProjects,
  sessionBoardVotes,
  sessionBoards,
} from "../drizzle/schema";
import {
  actOnBoard,
  canFacilitate,
  ensureBoard,
  findBoard,
  itemVotesUsed,
  mineOnBoard,
  offerPeople,
  readBoardRows,
} from "./lib/sessionBoard";
import { defaultBoardState, normalizeBoardState, voteTarget } from "@shared/sessionBoard";
import { signUpOnBoard } from "./lib/boardSignup";

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

const PLAYER = { id: 2, role: "user" } as unknown as TrpcContext["user"];
const KEY = "sabcdef0123456789";

describe("session board: what the router accepts", () => {
  it("only weeks 2 to 13", async () => {
    const caller = appRouter.createCaller(makeCtx(null));
    await expect(caller.sessionBoard.version({ week: 1 })).rejects.toThrow();
    await expect(caller.sessionBoard.version({ week: 14 })).rejects.toThrow();
    await expect(caller.sessionBoard.get({ week: 0 })).rejects.toThrow();
  });

  it("notes have a known kind, a game note a known block, and a bounded length", () => {
    const ok = { week: 2, voterKey: KEY, kind: "opp" as const, text: "Shared work parties" };
    expect(addItemInput.safeParse(ok).success).toBe(true);
    expect(addItemInput.safeParse({ ...ok, kind: "html" }).success).toBe(false);
    expect(addItemInput.safeParse({ ...ok, kind: "game", block: "treasury" }).success).toBe(false);
    expect(addItemInput.safeParse({ ...ok, text: "" }).success).toBe(false);
    expect(addItemInput.safeParse({ ...ok, text: "x".repeat(1001) }).success).toBe(false);
    expect(addItemInput.safeParse({ ...ok, voterKey: "bad key" }).success).toBe(false);
  });

  it("a project's stage is one of the five", () => {
    const ok = { week: 2, projectId: 1, phase: "sprout" as const };
    expect(updateProjectInput.safeParse(ok).success).toBe(true);
    expect(updateProjectInput.safeParse({ ...ok, phase: "harvest" }).success).toBe(false);
    expect(updateProjectInput.safeParse({ ...ok, phase: null }).success).toBe(true);
  });

  it("facilitator procedures turn away anyone not signed in, before touching the database", async () => {
    const caller = appRouter.createCaller(makeCtx(null));
    await expect(caller.sessionBoard.act({ week: 2, action: { type: "go", stage: 1 } })).rejects.toThrow(/sign|login|auth/i);
    await expect(caller.sessionBoard.curateItem({ week: 2, itemId: 1, hidden: true })).rejects.toThrow();
    await expect(caller.sessionBoard.setStatus({ week: 2, status: "closed" })).rejects.toThrow();
    await expect(caller.sessionBoard.importRegister({ week: 2 })).rejects.toThrow();
  });

  it("a guest's writes need the key their browser keeps", async () => {
    const caller = appRouter.createCaller(makeCtx(null));
    await expect(caller.sessionBoard.addItem({ week: 2, kind: "arrive", text: "here" })).rejects.toThrow();
  });

  it("a hand to coach or build is one of the known offers, on a board that has that stage", async () => {
    const caller = appRouter.createCaller(makeCtx(null));
    // @ts-expect-error not an offer
    await expect(caller.sessionBoard.offer({ week: 2, voterKey: KEY, offer: "invest", on: true })).rejects.toThrow();
    await expect(caller.sessionBoard.offer({ week: 2, offer: "coach", on: true })).rejects.toThrow(/Reload the page/);
    // Week 3 has no "A Game we build together" stage, so it is refused before the database.
    await expect(caller.sessionBoard.offer({ week: 3, voterKey: KEY, offer: "coach", on: true })).rejects.toThrow(/no hands to raise/);
  });

  it("a sign-up needs a real email, a known offer, and a week that has the stage", async () => {
    const caller = appRouter.createCaller(makeCtx(null, "198.51.100.21"));
    await expect(caller.sessionBoard.signUp({
      week: 2, voterKey: KEY, offer: "coach", fullName: "Ada", email: "not-an-email",
    })).rejects.toThrow();
    await expect(caller.sessionBoard.signUp({
      week: 2,
      voterKey: KEY,
      // @ts-expect-error not an offer
      offer: "invest",
      fullName: "Ada",
      email: "ada@example.com",
    })).rejects.toThrow();
    await expect(caller.sessionBoard.signUp({
      week: 2, voterKey: KEY, offer: "coach", fullName: "Ada", email: "ada@example.com", note: "x".repeat(201),
    })).rejects.toThrow();
    await expect(caller.sessionBoard.signUp({
      week: 3, voterKey: KEY, offer: "coach", fullName: "Ada", email: "ada@example.com",
    })).rejects.toThrow(/no hands to raise/);
  });

  it("a caller writes as their account and owns what their browser key wrote", () => {
    expect(callerKeys(PLAYER, KEY)).toEqual(["u:2", `k:${KEY}`]);
    expect(callerKeys(null, KEY)).toEqual([`k:${KEY}`]);
    expect(callerKeys(null, undefined)).toEqual([]);
    expect(callerKeys(null, "no spaces allowed")).toEqual([]);
  });
});

const skipIfNoDb = !process.env.DATABASE_URL;
const SEASON = "Board Test 2030";

describe.skipIf(skipIfNoDb)("session board: the database layer", () => {
  const boardIds: number[] = [];
  const inquiryIds: number[] = [];

  afterAll(async () => {
    const db = await getDb();
    if (!db) return;
    if (inquiryIds.length > 0) {
      await db.delete(contactTags).where(and(eq(contactTags.contactType, "inquiry"), inArray(contactTags.contactId, inquiryIds)));
      await db.delete(generalInquiries).where(inArray(generalInquiries.id, inquiryIds));
    }
    if (boardIds.length === 0) return;
    await db.delete(sessionBoardVotes).where(inArray(sessionBoardVotes.boardId, boardIds));
    await db.delete(sessionBoardItems).where(inArray(sessionBoardItems.boardId, boardIds));
    await db.delete(sessionBoardProjects).where(inArray(sessionBoardProjects.boardId, boardIds));
    await db.delete(sessionBoards).where(inArray(sessionBoards.id, boardIds));
  });

  it("makes one board per week, however many first writers arrive at once", async () => {
    const db = (await getDb())!;
    const [a, b] = await Promise.all([ensureBoard(db, SEASON, 2), ensureBoard(db, SEASON, 2)]);
    boardIds.push(a.id);
    expect(a.id).toBe(b.id);
    expect(a.status).toBe("open");
    expect((await findBoard(db, SEASON, 3))).toBeNull();
  });

  it("a facilitator's action is stored and moves the version", async () => {
    const db = (await getDb())!;
    const board = await ensureBoard(db, SEASON, 2);
    const state = await actOnBoard(db, board.id, 2, { type: "go", stage: 3 }, 1_900_000_000_000);
    expect(state.stage).toBe(3);
    const after = (await findBoard(db, SEASON, 2))!;
    expect(after.version).toBe(board.version + 1);
    expect(normalizeBoardState(after.state, 2).stage).toBe(3);
  });

  it("counts a person's votes across their account and their browser key, and hides what is hidden", async () => {
    const db = (await getDb())!;
    const board = await ensureBoard(db, SEASON, 2);
    const [p1] = await db.insert(sessionBoardProjects).values({ boardId: board.id, name: "Test Garden", authorKey: `k:${KEY}` });
    const [p2] = await db.insert(sessionBoardProjects).values({ boardId: board.id, name: "Hidden Farm", hidden: 1 });
    const proj1 = Number((p1 as { insertId: number }).insertId);
    const proj2 = Number((p2 as { insertId: number }).insertId);
    const [i1] = await db.insert(sessionBoardItems).values({ boardId: board.id, kind: "opp", text: "Shared tools", projectId: proj1, authorKey: `k:${KEY}` });
    await db.insert(sessionBoardItems).values({ boardId: board.id, kind: "opp", text: "On a hidden project", projectId: proj2 });
    await db.insert(sessionBoardItems).values({ boardId: board.id, kind: "pain", text: "Taken down", hidden: 1 });
    const item1 = Number((i1 as { insertId: number }).insertId);
    await db.insert(sessionBoardVotes).values([
      { boardId: board.id, target: `item:${item1}`, voterKey: `k:${KEY}` },
      { boardId: board.id, target: "item:999999", voterKey: "u:2" },
      { boardId: board.id, target: "week:5", voterKey: "u:2" },
    ]);

    expect(await itemVotesUsed(db, board.id, ["u:2", `k:${KEY}`])).toBe(2);
    expect(await itemVotesUsed(db, board.id, [`k:${KEY}`])).toBe(1);

    const mine = await mineOnBoard(db, board.id, ["u:2", `k:${KEY}`]);
    expect(mine.projectIds).toEqual([proj1]);
    expect(mine.itemIds).toEqual([item1]);
    expect(mine.targets.sort()).toEqual([`item:${item1}`, "item:999999", "week:5"].sort());

    const publicRows = await readBoardRows(db, board.id, { includeHidden: false });
    expect(publicRows.projects.map((p) => p.name)).toEqual(["Test Garden"]);
    expect(publicRows.items.map((i) => i.text)).toEqual(["Shared tools"]);
    expect(publicRows.counts.get(`item:${item1}`)).toBe(1);

    const facilitatorRows = await readBoardRows(db, board.id, { includeHidden: true });
    expect(facilitatorRows.projects).toHaveLength(2);
    expect(facilitatorRows.items).toHaveLength(3);

    // A second vote on the same thing by the same key is refused by the unique key.
    await expect(
      db.insert(sessionBoardVotes).values({ boardId: board.id, target: `item:${item1}`, voterKey: `k:${KEY}` }),
    ).rejects.toThrow();
    const votes = await db
      .select({ id: sessionBoardVotes.id })
      .from(sessionBoardVotes)
      .where(and(eq(sessionBoardVotes.boardId, board.id), eq(sessionBoardVotes.target, `item:${item1}`)));
    expect(votes).toHaveLength(1);
  });

  it("tells the facilitator who offered to coach or build: account names, and guests as a count", async () => {
    const db = (await getDb())!;
    const board = await ensureBoard(db, SEASON, 4);
    boardIds.push(board.id);
    await db.insert(sessionBoardVotes).values([
      { boardId: board.id, target: "offer:coach", voterKey: "u:987654321" },
      { boardId: board.id, target: "offer:coach", voterKey: `k:${KEY}` },
      { boardId: board.id, target: "offer:build", voterKey: `k:${KEY}` },
      { boardId: board.id, target: "week:6", voterKey: "u:987654321" },
    ]);
    const people = await offerPeople(db, board.id);
    // No such account: a stable stand-in name, never a crash or a blank.
    expect(people.coach).toEqual({ names: ["Player 987654321"], guests: 1 });
    expect(people.build).toEqual({ names: [], guests: 1 });
    expect(Object.keys(people).sort()).toEqual(["build", "coach"]);
    const counts = (await readBoardRows(db, board.id, { includeHidden: false })).counts;
    expect(counts.get("offer:coach")).toBe(2);
    expect((await mineOnBoard(db, board.id, [`k:${KEY}`])).targets.sort()).toEqual(["offer:build", "offer:coach"]);
  });

  it("only admins and the facilitating role holders facilitate", async () => {
    const db = (await getDb())!;
    expect(await canFacilitate(db, null)).toBe(false);
    expect(await canFacilitate(db, { id: 1, role: "admin" })).toBe(true);
    expect(await canFacilitate(db, { id: 987654321, role: "user" })).toBe(false);
  });

  it("a sign-up on an open board stores the inquiry and raises the hand", async () => {
    const db = (await getDb())!;
    const board = await ensureBoard(db, SEASON, 2);
    if (!boardIds.includes(board.id)) boardIds.push(board.id);
    const prev = { status: board.status, state: board.state };
    const key = "boardhandopen0001";
    await db.update(sessionBoards).set({ status: "open", state: null }).where(eq(sessionBoards.id, board.id));
    try {
      const result = await signUpOnBoard(makeCtx(null, "198.51.100.31"), {
        week: 2,
        voterKey: key,
        offer: "build",
        fullName: "  Module  Maker  ",
        email: "module.maker@board-signup.test",
        note: "  I like  ledgers  ",
      }, { season: SEASON, now: 1_700_000_000_000 });
      inquiryIds.push(Number(result.id));
      expect(result.success).toBe(true);
      expect(result.handed).toBe(true);
      const row = await getGeneralInquiryById(Number(result.id));
      expect(row).toMatchObject({
        pathType: "something_else",
        email: "module.maker@board-signup.test",
        fullName: "Module Maker",
        status: "new",
        roleInterest: "builder",
        roleArchetypes: JSON.stringify(["Builder"]),
        referralSource: "season2-week-board:week-2",
        additionalNotes: "I like ledgers",
        userId: null,
      });
      const tags = (await getContactTags("inquiry", Number(result.id))).map((t) => t.tag).sort();
      expect(tags).toEqual(["builder", "season2-week-board", "week-2"]);
      const votes = await db
        .select({ target: sessionBoardVotes.target })
        .from(sessionBoardVotes)
        .where(and(eq(sessionBoardVotes.boardId, board.id), eq(sessionBoardVotes.voterKey, `k:${key}`)));
      expect(votes.map((v) => v.target)).toEqual([voteTarget.offer("build")]);
    } finally {
      await db.delete(sessionBoardVotes).where(and(eq(sessionBoardVotes.boardId, board.id), eq(sessionBoardVotes.voterKey, `k:${key}`)));
      await db.update(sessionBoards).set({ status: prev.status, state: prev.state }).where(eq(sessionBoards.id, board.id));
    }
  });

  it("a sign-up on a closed board stores the inquiry and does not vote", async () => {
    const db = (await getDb())!;
    const board = await ensureBoard(db, SEASON, 2);
    if (!boardIds.includes(board.id)) boardIds.push(board.id);
    const prev = { status: board.status, state: board.state };
    const key = "boardhandclosed01";
    await db.update(sessionBoards).set({ status: "closed", state: null }).where(eq(sessionBoards.id, board.id));
    try {
      const result = await signUpOnBoard(makeCtx(null, "198.51.100.32"), {
        week: 2,
        voterKey: key,
        offer: "coach",
        fullName: "Coach Ada",
        email: "coach.ada@board-signup.test",
      }, { season: SEASON });
      inquiryIds.push(Number(result.id));
      expect(result.handed).toBe(false);
      const row = await getGeneralInquiryById(Number(result.id));
      expect(row?.pathType).toBe("something_else");
      expect(row?.roleInterest).toBe("coach");
      expect(row?.referralSource).toBe("season2-week-board:week-2");
      const votes = await db
        .select({ id: sessionBoardVotes.id })
        .from(sessionBoardVotes)
        .where(and(eq(sessionBoardVotes.boardId, board.id), eq(sessionBoardVotes.voterKey, `k:${key}`)));
      expect(votes).toHaveLength(0);
    } finally {
      await db.update(sessionBoards).set({ status: prev.status, state: prev.state }).where(eq(sessionBoards.id, board.id));
    }
  });

  it("a sign-up after the session has ended stores the inquiry and does not vote", async () => {
    const db = (await getDb())!;
    const board = await ensureBoard(db, SEASON, 2);
    if (!boardIds.includes(board.id)) boardIds.push(board.id);
    const prev = { status: board.status, state: board.state };
    const key = "boardhandended001";
    const ended = { ...defaultBoardState(2), sessionStartedAt: 1_700_000_000_000, endedAt: 1_700_000_100_000 };
    await db.update(sessionBoards).set({ status: "open", state: JSON.stringify(ended) }).where(eq(sessionBoards.id, board.id));
    try {
      const result = await signUpOnBoard(makeCtx(null, "198.51.100.33"), {
        week: 2,
        voterKey: key,
        offer: "coach",
        fullName: "Late Pat",
        email: "late.pat@board-signup.test",
      }, { season: SEASON, now: 1_700_000_200_000 });
      inquiryIds.push(Number(result.id));
      expect(result.handed).toBe(false);
      const votes = await db
        .select({ id: sessionBoardVotes.id })
        .from(sessionBoardVotes)
        .where(and(eq(sessionBoardVotes.boardId, board.id), eq(sessionBoardVotes.voterKey, `k:${key}`)));
      expect(votes).toHaveLength(0);
    } finally {
      await db.update(sessionBoards).set({ status: prev.status, state: prev.state }).where(eq(sessionBoards.id, board.id));
    }
  });
});
