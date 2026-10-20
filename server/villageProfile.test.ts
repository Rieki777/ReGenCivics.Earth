/**
 * Village profiles on the server (ADR-77): who may open and change one, how
 * a project's cards are found across the weeks, the stewards' own answers,
 * and claiming an earlier card.
 *
 * The router's gates are checked first. The database half runs on a made-up
 * board season ("Profile Test 2031") and application season (9032), passed to
 * the lib functions directly, so it never reads a real board or application,
 * and it removes every row it makes.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq, inArray } from "drizzle-orm";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import { getDb } from "./db";
import {
  applications,
  sessionBoardItems,
  sessionBoardProjects,
  sessionBoardVotes,
  sessionBoards,
  villageProfileAnswers,
} from "../drizzle/schema";
import { ensureBoard, type Db } from "./lib/sessionBoard";
import {
  answerDecision,
  claimCard,
  clearDecision,
  confirmDecision,
  listVillageProfiles,
  projectCardIds,
  readVillageProfile,
} from "./lib/villageProfile";
import { cardText } from "@shared/boardCards";
import { voteTarget } from "@shared/sessionBoard";
import { toVillageFile } from "@shared/villageFile";

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

describe("village profiles: what the router lets through", () => {
  it("a guest can't open or change any profile", async () => {
    const caller = appRouter.createCaller(makeCtx(null, "198.51.100.71"));
    await expect(caller.villageProfile.mine()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await expect(caller.villageProfile.get({ applicationId: 1 })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await expect(caller.villageProfile.answer({ applicationId: 1, key: "identity.name", value: "x" })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await expect(caller.villageProfile.adminList()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("refuses a key that isn't a decision's shape before anything else", async () => {
    const caller = appRouter.createCaller(makeCtx({ id: 987660001, role: "user" } as unknown as TrpcContext["user"], "198.51.100.72"));
    await expect(caller.villageProfile.answer({ applicationId: 1, key: "DROP TABLE", value: "x" })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(caller.villageProfile.confirm({ applicationId: 1, key: "a".repeat(60) })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("a signed-in member is not an admin", async () => {
    const caller = appRouter.createCaller(makeCtx({ id: 987660001, role: "user" } as unknown as TrpcContext["user"], "198.51.100.73"));
    await expect(caller.villageProfile.adminList()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});

const skipIfNoDb = !process.env.DATABASE_URL;
const SEASON = "Profile Test 2031";
const APP_SEASON = 9032;
const STEWARD = 987660101;
const STRANGER = 987660102;

describe.skipIf(skipIfNoDb)("village profiles: the database layer", () => {
  let db: Db;
  const boardIds: number[] = [];
  const appIds: number[] = [];
  let b2 = 0;
  let b3 = 0;
  let b4 = 0;
  let appId = 0;
  let otherApp = 0;
  let w3card = 0;
  let w4card = 0;
  let stray = 0;
  let mineByCheckin = 0;
  let othersCard = 0;

  const insertId = (res: unknown) => Number((res as [{ insertId: number }])[0]?.insertId ?? (res as { insertId: number }).insertId);
  const card = async (boardId: number, values: Partial<typeof sessionBoardProjects.$inferInsert> & { name: string }) =>
    insertId(await db.insert(sessionBoardProjects).values({ boardId, ...values }));
  const answer = (boardId: number, projectId: number, block: string, text: string, authorKey = "k:profiletest00001") =>
    db.insert(sessionBoardItems).values({ boardId, kind: "answer", block, text, projectId, authorKey });
  const app = async (name: string, userId: number) => {
    const id = insertId(await db.insert(applications).values({
      userId,
      status: "submitted",
      season: APP_SEASON,
      projectName: name,
      projectType: "early_stage",
      location: "Test Valley",
      country: "Testland",
      vision: "A village that grows food.",
      landStatus: "owned",
      teamSize: 3,
      teamDescription: "Three founders",
      regenerativePractices: "Swales",
      governanceApproach: "Consent",
      communityEngagement: "Work days",
      timeCommitment: "Weekly",
      fundingNeeds: "Tools",
      latitude: -9.5,
    }));
    appIds.push(id);
    return id;
  };
  const read = (userId: number | null = STEWARD, id = appId) =>
    readVillageProfile(db, { season: SEASON, applicationId: id, userId, appSeason: APP_SEASON });

  beforeAll(async () => {
    db = (await getDb())!;
    b2 = (await ensureBoard(db, SEASON, 2)).id;
    b3 = (await ensureBoard(db, SEASON, 3)).id;
    b4 = (await ensureBoard(db, SEASON, 4)).id;
    boardIds.push(b2, b3, b4);
    appId = await app("Profile Spring Farm", STEWARD);
    otherApp = await app("Another Place", STRANGER);

    // Week 3: the project's card, tied to its application, with human needs.
    w3card = await card(b3, { name: "Profile Spring Farm", applicationId: appId });
    for (const [block, text] of [["needs", "love"], ["needs", "play"], ["top", "love"], ["g-love", "thriving"], ["b-love", "100"], ["whole", "25"], ["purpose", "twelve families on healed land"], ["rite", "A welcome fire"]]) {
      await answer(b3, w3card, block, text);
    }
    // Week 4: a card tied to the same application, with a seat and a later whole figure.
    w4card = await card(b4, { name: "Profile Spring Farm", applicationId: appId });
    await answer(b4, w4card, "seat-1", cardText("seat", { name: "Fire keeper", circle: "festivals", need: "love", aim: "Every gathering has a fire", answersFor: "The fire circle", heldBy: "team", who: "Ana", contribution: "3 hours a week" }));
    await answer(b4, w4card, "whole", "50");
    // Week 2: a stray card with the project's name and no application, with a pain point.
    stray = await card(b2, { name: "Profile Spring  Farm", authorKey: "k:someoneelse0001" });
    await db.insert(sessionBoardItems).values({ boardId: b2, kind: "pain", text: "Water runs off the hill", projectId: stray, authorKey: "k:someoneelse0001" });
    // Week 2: a card the steward checked in with, under a different name.
    mineByCheckin = await card(b2, { name: "Spring Farm Hamlet" });
    await db.insert(sessionBoardVotes).values({ boardId: b2, target: voteTarget.checkin(mineByCheckin), voterKey: `u:${STEWARD}` });
    // Another project's card, which never belongs to this profile.
    othersCard = await card(b3, { name: "Another Place", applicationId: otherApp });
    await answer(b3, othersCard, "needs", "growth");
  });

  afterAll(async () => {
    if (!db) return;
    if (appIds.length) await db.delete(villageProfileAnswers).where(inArray(villageProfileAnswers.applicationId, appIds));
    if (boardIds.length) {
      await db.delete(sessionBoardVotes).where(inArray(sessionBoardVotes.boardId, boardIds));
      await db.delete(sessionBoardItems).where(inArray(sessionBoardItems.boardId, boardIds));
      await db.delete(sessionBoardProjects).where(inArray(sessionBoardProjects.boardId, boardIds));
      await db.delete(sessionBoards).where(inArray(sessionBoards.id, boardIds));
    }
    if (appIds.length) await db.delete(applications).where(inArray(applications.id, appIds));
  });

  it("finds the project's cards on every week, and never another project's", async () => {
    const r = await read();
    expect(r).not.toBeNull();
    expect(r!.profile.weeks).toEqual([3, 4]);
    const by = new Map(r!.profile.decisions.map((d) => [d.key, d]));
    const needs = by.get("needs.scope")!.suggestion as { needs: { needKey: string }[]; variables: Record<string, number> };
    expect(needs.needs.map((n) => n.needKey)).toEqual(["love", "play"]);
    // The later week's whole-project figure wins.
    expect(needs.variables["needs.totality_target_pct"]).toBe(50);
    expect((by.get("seats.cards")!.suggestion as { seats: { name: string }[] }).seats.map((s) => s.name)).toEqual(["Fire keeper"]);
    expect(by.get("identity.hemisphere")?.suggestion).toBe("south");
    expect(JSON.stringify(r!.profile)).not.toMatch(/growth/);
  });

  it("projectCardIds follows the application and carries, and stops at another application", () => {
    const ids = projectCardIds(
      {
        cards: [
          { id: 1, boardId: 1, week: 3, name: "A", applicationId: 7, hidden: 0, authorKey: null, phase: null, whereNow: null, nextMove: null },
          { id: 2, boardId: 2, week: 4, name: "A", applicationId: null, hidden: 0, authorKey: null, phase: null, whereNow: null, nextMove: null },
          { id: 3, boardId: 2, week: 4, name: "B", applicationId: 8, hidden: 0, authorKey: null, phase: null, whereNow: null, nextMove: null },
          { id: 4, boardId: 1, week: 3, name: "C", applicationId: null, hidden: 1, authorKey: null, phase: null, whereNow: null, nextMove: null },
        ],
        carries: [
          { cardId: 2, match: "carried", from: [{ week: 3, cardId: 1, name: "A" }], suggested: [] },
          { cardId: 3, match: "confirmed", from: [{ week: 3, cardId: 1, name: "A" }], suggested: [] },
          { cardId: 2, match: "carried", from: [{ week: 3, cardId: 4, name: "C" }], suggested: [] },
        ],
      },
      7,
    );
    expect([...ids].sort()).toEqual([1, 2]);
  });

  it("offers earlier cards by name or by the steward's own check-in, and claiming one brings its answers in", async () => {
    const before = await read();
    const offered = before!.claimable.map((c) => [c.cardId, c.why]);
    expect(offered).toEqual(expect.arrayContaining([[stray, "name"], [mineByCheckin, "yours"]]));
    expect(before!.claimable.some((c) => c.cardId === othersCard)).toBe(false);
    // A stranger sees the name match, never the steward's own check-in.
    const theirs = await read(STRANGER);
    expect(theirs!.claimable.map((c) => c.cardId)).toEqual([stray]);

    await claimCard(db, { season: SEASON, applicationId: appId, cardId: stray, userId: STEWARD, appSeason: APP_SEASON });
    const [row] = await db.select({ applicationId: sessionBoardProjects.applicationId }).from(sessionBoardProjects).where(eq(sessionBoardProjects.id, stray));
    expect(row.applicationId).toBe(appId);
    const after = await read();
    expect(after!.profile.start?.pains).toEqual(["Water runs off the hill"]);
    await expect(claimCard(db, { season: SEASON, applicationId: appId, cardId: stray, userId: STEWARD, appSeason: APP_SEASON }))
      .rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(claimCard(db, { season: SEASON, applicationId: appId, cardId: othersCard, userId: STEWARD, appSeason: APP_SEASON }))
      .rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("stores the stewards' own answers, refuses wrong ones, and keeps a confirmed snapshot", async () => {
    await answerDecision(db, { applicationId: appId, key: "identity.name", value: "  Spring Farm  ", userId: STEWARD });
    await expect(answerDecision(db, { applicationId: appId, key: "economy.issuanceCap", value: "lots", userId: STEWARD }))
      .rejects.toThrow("Give a whole number.");
    await expect(answerDecision(db, { applicationId: appId, key: "seats.cards", value: "x", userId: STEWARD }))
      .rejects.toThrow("This part comes from the weekly boards.");
    await expect(answerDecision(db, { applicationId: appId, key: "identity.nope", value: "x", userId: STEWARD }))
      .rejects.toMatchObject({ code: "NOT_FOUND" });
    await confirmDecision(db, { season: SEASON, applicationId: appId, key: "seats.cards", userId: STEWARD, appSeason: APP_SEASON });
    await expect(confirmDecision(db, { season: SEASON, applicationId: appId, key: "legal.exitPolicy", userId: STEWARD, appSeason: APP_SEASON }))
      .rejects.toThrow("There's nothing here to confirm yet.");

    let r = await read();
    let by = new Map(r!.profile.decisions.map((d) => [d.key, d]));
    expect(by.get("identity.name")).toMatchObject({ status: "yours", value: "Spring Farm" });
    expect(by.get("seats.cards")).toMatchObject({ status: "yours", changed: false });

    // The boards move on after the confirm: the page says so, and the file keeps what was confirmed.
    await answer(b4, w4card, "seat-2", cardText("seat", { name: "Water carrier", circle: "water", need: "play", aim: "Water for every gathering", answersFor: "The barrels", heldBy: "open", who: "", contribution: "" }));
    r = await read();
    by = new Map(r!.profile.decisions.map((d) => [d.key, d]));
    expect(by.get("seats.cards")!.changed).toBe(true);
    const file = toVillageFile(r!.profile);
    expect(file.card.seats.map((s) => s.name)).toEqual(["Fire keeper"]);
    expect(file.identity.name).toBe("Spring Farm");
    expect(file.identity.location).toBeNull();

    await clearDecision(db, { applicationId: appId, key: "identity.name" });
    r = await read();
    expect(r!.profile.decisions.find((d) => d.key === "identity.name")!.status).toBe("suggested");
  });

  it("only Season 2 projects that applied have a profile", async () => {
    expect(await readVillageProfile(db, { season: SEASON, applicationId: appId, userId: STEWARD, appSeason: 2 })).toBeNull();
    const draft = await app("Draft Farm", STEWARD);
    await db.update(applications).set({ status: "draft" }).where(eq(applications.id, draft));
    expect(await read(STEWARD, draft)).toBeNull();
  });

  it("lists every project's profile for admins", async () => {
    const list = await listVillageProfiles(db, SEASON, APP_SEASON);
    const mine = list.find((p) => p.applicationId === appId);
    expect(mine).toMatchObject({ projectName: "Profile Spring Farm", status: "submitted" });
    expect(mine!.launch.total).toBeGreaterThan(0);
    expect(list.some((p) => p.applicationId === otherApp)).toBe(true);
  });

  it("the router refuses a stranger and lets the steward in", async () => {
    // These go through the real gates, which read the application by id.
    const stranger = appRouter.createCaller(makeCtx({ id: STRANGER, role: "user" } as unknown as TrpcContext["user"], "198.51.100.74"));
    await expect(stranger.villageProfile.get({ applicationId: appId })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(stranger.villageProfile.answer({ applicationId: appId, key: "identity.name", value: "Mine now" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(stranger.villageProfile.claimCard({ applicationId: appId, cardId: mineByCheckin })).rejects.toMatchObject({ code: "FORBIDDEN" });
    const steward = appRouter.createCaller(makeCtx({ id: STEWARD, role: "user" } as unknown as TrpcContext["user"], "198.51.100.75"));
    // The router reads Season 2 applications; this test season's application isn't one, so the steward gets "no profile".
    await expect(steward.villageProfile.get({ applicationId: appId })).rejects.toMatchObject({ code: "NOT_FOUND" });
    await steward.villageProfile.answer({ applicationId: appId, key: "identity.tagline", value: "Healing land together" });
    const [row] = await db.select().from(villageProfileAnswers).where(eq(villageProfileAnswers.decisionKey, "identity.tagline"));
    expect(row).toMatchObject({ applicationId: appId, how: "answered", updatedBy: STEWARD });
  });
});
