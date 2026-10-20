/**
 * Village profiles on the server (ADR-77): who may open and change one, how
 * a project's cards are found across the weeks, the stewards' own answers,
 * keeping exactly what was seen, and claiming (and giving back) an earlier
 * card.
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
  villageProfileClaims,
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
  unclaimCard,
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
    await expect(caller.villageProfile.unclaimCard({ applicationId: 1, cardId: 1 })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await expect(caller.villageProfile.adminList()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("refuses a key that isn't a decision's shape, or a confirm with no stamp, before anything else", async () => {
    const caller = appRouter.createCaller(makeCtx({ id: 987660001, role: "user" } as unknown as TrpcContext["user"], "198.51.100.72"));
    await expect(caller.villageProfile.answer({ applicationId: 1, key: "DROP TABLE", value: "x" })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(caller.villageProfile.confirm({ applicationId: 1, key: "a".repeat(60), seen: "x" })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect((caller.villageProfile.confirm as (i: unknown) => Promise<unknown>)({ applicationId: 1, key: "identity.name" })).rejects.toMatchObject({ code: "BAD_REQUEST" });
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
  let unowned = 0;
  let stewardWrote = 0;
  let guestWrote = 0;
  let checkedIn = 0;
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
  const read = (id = appId) => readVillageProfile(db, { season: SEASON, applicationId: id, appSeason: APP_SEASON });
  const stampOf = async (key: string) => (await read())!.profile.decisions.find((d) => d.key === key)!.stamp!;

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
    // Week 2: four cards with no application.
    unowned = await card(b2, { name: "Profile Spring  Farm", whereNow: "Six of us nearby." });
    await db.insert(sessionBoardItems).values({ boardId: b2, kind: "pain", text: "Water runs off the hill", projectId: unowned, authorKey: "k:someoneelse0001" });
    stewardWrote = await card(b2, { name: "Spring Farm Hamlet", authorKey: `u:${STEWARD}` });
    guestWrote = await card(b2, { name: "Profile Spring Farm", authorKey: "k:someoneelse0001" });
    checkedIn = await card(b2, { name: "A Different Farm" });
    await db.insert(sessionBoardVotes).values({ boardId: b2, target: voteTarget.checkin(checkedIn), voterKey: `u:${STEWARD}` });
    // Another project's card, which never belongs to this profile.
    othersCard = await card(b3, { name: "Another Place", applicationId: otherApp });
    await answer(b3, othersCard, "needs", "growth");
  });

  afterAll(async () => {
    if (!db) return;
    if (appIds.length) {
      await db.delete(villageProfileAnswers).where(inArray(villageProfileAnswers.applicationId, appIds));
      await db.delete(villageProfileClaims).where(inArray(villageProfileClaims.applicationId, appIds));
    }
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
    // Which steward saved an answer never leaves the server.
    expect(JSON.stringify(r)).not.toMatch(/updatedBy/);
  });

  it("projectCardIds follows the application and carries until nothing changes, and stops at another application", () => {
    const c = (id: number, applicationId: number | null, hidden = 0) => ({ id, boardId: 1, week: 3, name: "A", applicationId, hidden, authorKey: null, phase: null, whereNow: null, nextMove: null });
    const carry = (cardId: number, from: number[]) => ({ cardId, match: "carried" as const, from: from.map((f) => ({ week: 3, cardId: f, name: "A" })), suggested: [] });
    const ids = projectCardIds(
      {
        cards: [c(1, 7), c(2, null), c(3, 8), c(4, null, 1), c(5, null), c(6, null), c(7, null)],
        // A zigzag: 2 carries from 1, 5 from 2, 6 carries 5... listed so one pass can't close it.
        carries: [carry(7, [6]), carry(6, [5]), carry(5, [2]), carry(2, [1]), carry(3, [1]), carry(2, [4])],
      },
      7,
    );
    expect([...ids].sort()).toEqual([1, 2, 5, 6, 7]);
  });

  it("offers a card a steward wrote, or one nobody owns with the project's name, and nothing else", async () => {
    const r = await read();
    const offered = new Map(r!.claimable.map((c) => [c.cardId, c.why]));
    expect(offered.get(unowned)).toBe("name");
    expect(offered.get(stewardWrote)).toBe("yours");
    // A guest's card with the same name, a card the steward only checked in with, and another project's card wait for a facilitator.
    expect(offered.has(guestWrote)).toBe(false);
    expect(offered.has(checkedIn)).toBe(false);
    expect(offered.has(othersCard)).toBe(false);
  });

  it("a claim brings the card's answers in, is recorded, and can be given back", async () => {
    await claimCard(db, { season: SEASON, applicationId: appId, cardId: unowned, userId: STEWARD, appSeason: APP_SEASON });
    const [row] = await db.select({ applicationId: sessionBoardProjects.applicationId }).from(sessionBoardProjects).where(eq(sessionBoardProjects.id, unowned));
    expect(row.applicationId).toBe(appId);
    let r = await read();
    expect(r!.profile.start?.pains).toEqual(["Water runs off the hill"]);
    expect(r!.claimed.map((c) => c.cardId)).toEqual([unowned]);
    const [claim] = await db.select().from(villageProfileClaims).where(eq(villageProfileClaims.cardId, unowned));
    expect(claim).toMatchObject({ applicationId: appId, claimedBy: STEWARD });
    // Twice is refused; another project's card is refused.
    await expect(claimCard(db, { season: SEASON, applicationId: appId, cardId: unowned, userId: STEWARD, appSeason: APP_SEASON })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(claimCard(db, { season: SEASON, applicationId: appId, cardId: othersCard, userId: STEWARD, appSeason: APP_SEASON })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(claimCard(db, { season: SEASON, applicationId: appId, cardId: guestWrote, userId: STEWARD, appSeason: APP_SEASON })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    // Given back: the card is unlinked and its answers leave the profile.
    await unclaimCard(db, { applicationId: appId, cardId: unowned });
    const [after] = await db.select({ applicationId: sessionBoardProjects.applicationId }).from(sessionBoardProjects).where(eq(sessionBoardProjects.id, unowned));
    expect(after.applicationId).toBeNull();
    r = await read();
    expect(r!.profile.start).toBeNull();
    expect(r!.claimed).toEqual([]);
    await expect(unclaimCard(db, { applicationId: appId, cardId: w3card })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("keeps exactly what the steward saw, and refuses when the boards changed in between", async () => {
    const seen = await stampOf("seats.cards");
    // Someone adds a seat while the steward reads: the old stamp is refused.
    await answer(b4, w4card, "seat-2", cardText("seat", { name: "Water carrier", circle: "water", need: "play", aim: "Water for every gathering", answersFor: "The barrels", heldBy: "open", who: "", contribution: "" }));
    await expect(confirmDecision(db, { season: SEASON, applicationId: appId, key: "seats.cards", seen, userId: STEWARD, appSeason: APP_SEASON }))
      .rejects.toMatchObject({ code: "CONFLICT", message: "The boards changed while you were reading. Look again, then keep it." });
    await confirmDecision(db, { season: SEASON, applicationId: appId, key: "seats.cards", seen: await stampOf("seats.cards"), userId: STEWARD, appSeason: APP_SEASON });
    let r = await read();
    expect(r!.profile.decisions.find((d) => d.key === "seats.cards")).toMatchObject({ status: "yours", changed: false });
    // The boards move on after the keep: the page says so, and the file keeps what was kept.
    await answer(b4, w4card, "seat-3", cardText("seat", { name: "Seed saver", circle: "food", need: "love", aim: "Seeds for every bed", answersFor: "The seed library", heldBy: "team", who: "Ana", contribution: "" }));
    r = await read();
    expect(r!.profile.decisions.find((d) => d.key === "seats.cards")!.changed).toBe(true);
    expect(toVillageFile(r!.profile).card.seats.map((s) => s.name)).toEqual(["Fire keeper", "Water carrier"]);
    // A suggestion that fails its own check can't be kept as it stands.
    await expect(confirmDecision(db, { season: SEASON, applicationId: appId, key: "purpose.statement", seen: await stampOf("purpose.statement"), userId: STEWARD, appSeason: APP_SEASON }))
      .rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(confirmDecision(db, { season: SEASON, applicationId: appId, key: "legal.exitPolicy", seen: "x", userId: STEWARD, appSeason: APP_SEASON }))
      .rejects.toThrow("There's nothing here to keep yet.");
  });

  it("stores the stewards' own answers, refuses wrong ones in words, and takes them back", async () => {
    await answerDecision(db, { applicationId: appId, key: "identity.name", value: "  Spring Farm  ", userId: STEWARD, appSeason: APP_SEASON });
    await expect(answerDecision(db, { applicationId: appId, key: "economy.issuanceCap", value: "lots", userId: STEWARD, appSeason: APP_SEASON }))
      .rejects.toThrow("Give a whole number.");
    await expect(answerDecision(db, { applicationId: appId, key: "seats.cards", value: "x", userId: STEWARD, appSeason: APP_SEASON }))
      .rejects.toThrow("This part comes from the weekly boards.");
    await expect(answerDecision(db, { applicationId: appId, key: "identity.nope", value: "x", userId: STEWARD, appSeason: APP_SEASON }))
      .rejects.toMatchObject({ code: "NOT_FOUND" });
    let r = await read();
    expect(r!.profile.decisions.find((d) => d.key === "identity.name")).toMatchObject({ status: "yours", value: "Spring Farm" });
    const file = toVillageFile(r!.profile);
    expect(file.identity.name).toBe("Spring Farm");
    expect(file.identity.location).toBeNull();
    await clearDecision(db, { applicationId: appId, key: "identity.name", appSeason: APP_SEASON });
    r = await read();
    expect(r!.profile.decisions.find((d) => d.key === "identity.name")!.status).toBe("suggested");
  });

  it("only Season 2 projects that applied have a profile, and only they take answers", async () => {
    expect(await readVillageProfile(db, { season: SEASON, applicationId: appId, appSeason: 2 })).toBeNull();
    const draft = await app("Draft Farm", STEWARD);
    await db.update(applications).set({ status: "draft" }).where(eq(applications.id, draft));
    expect(await read(draft)).toBeNull();
    await expect(answerDecision(db, { applicationId: draft, key: "identity.name", value: "Draft", userId: STEWARD, appSeason: APP_SEASON }))
      .rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(clearDecision(db, { applicationId: draft, key: "identity.name", appSeason: APP_SEASON })).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("lists every project's profile for admins, reading the season once", async () => {
    const list = await listVillageProfiles(db, SEASON, APP_SEASON);
    const mine = list.find((p) => p.applicationId === appId);
    expect(mine).toMatchObject({ projectName: "Profile Spring Farm", status: "submitted" });
    expect(mine!.launch.total).toBe(6);
    expect(list.some((p) => p.applicationId === otherApp)).toBe(true);
  });

  it("the router refuses a stranger, and lets the steward in only to a Season 2 project", async () => {
    const stranger = appRouter.createCaller(makeCtx({ id: STRANGER, role: "user" } as unknown as TrpcContext["user"], "198.51.100.74"));
    await expect(stranger.villageProfile.get({ applicationId: appId })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(stranger.villageProfile.answer({ applicationId: appId, key: "identity.name", value: "Mine now" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(stranger.villageProfile.claimCard({ applicationId: appId, cardId: stewardWrote })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(stranger.villageProfile.unclaimCard({ applicationId: appId, cardId: stewardWrote })).rejects.toMatchObject({ code: "FORBIDDEN" });
    const steward = appRouter.createCaller(makeCtx({ id: STEWARD, role: "user" } as unknown as TrpcContext["user"], "198.51.100.75"));
    // The router reads Season 2; this test season's application isn't one, so its profile is "none" and nothing is written.
    await expect(steward.villageProfile.get({ applicationId: appId })).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(steward.villageProfile.answer({ applicationId: appId, key: "identity.tagline", value: "Healing land together" })).rejects.toMatchObject({ code: "NOT_FOUND" });
    const rows = await db.select().from(villageProfileAnswers).where(eq(villageProfileAnswers.decisionKey, "identity.tagline"));
    expect(rows.filter((r) => r.applicationId === appId)).toEqual([]);
  });
});
