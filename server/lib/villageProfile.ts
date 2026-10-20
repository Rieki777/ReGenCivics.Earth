/**
 * Village profiles: the database side (shared/projectProfile.ts, migration
 * 0301, ADR-77). Reads every source a land project has given answers in and
 * hands them to the pure profile builder; stores its stewards' own word.
 *
 * WHICH BOARD CARDS ARE THE PROJECT'S. The application is the one key (Rye's
 * call 1, 2026-10-20). A project's cards are every unhidden card on a Season 2
 * board tied to its application, plus every card Week 4's carry read ties to
 * one of those (server/lib/sessionBoardCarry.ts readCarry: a card checked in
 * from an earlier week's tile, a facilitator's yes, the linked card's own
 * application, back through the weeks), in either direction, never past a
 * card tied to another application.
 *
 * CLAIMING AN EARLIER CARD. A card with no application can be claimed from the
 * profile page by the project's stewards when one of them wrote it, or when it
 * has the project's name and nobody owns it (an imported or facilitator-made
 * card). A card a guest wrote, or one that sits in another project's group of
 * cards, is never claimable: a facilitator links those from the board. This
 * is the same ownership rule check-in's auto-link keeps (mayAutoLink), so
 * anyone who makes an application can't take another project's cards. Every
 * claim is recorded (village_profile_claims) and can be given back.
 */
import { TRPCError } from "@trpc/server";
import { and, asc, eq, inArray, sql } from "drizzle-orm";
import {
  applications,
  regenToolProjectUsage,
  regenTools,
  sessionBoardItems,
  sessionBoardProjects,
  sessionBoards,
  villageOsRequests,
  villageProfileAnswers,
  villageProfileClaims,
} from "../../drizzle/schema";
import { CHECKIN_APPLICATION_STATUSES, anonymousKeys, foldProjectName } from "@shared/sessionBoard";
import type { CardCarry } from "@shared/boardCarry";
import type { AnswerRow } from "@shared/humanNeeds";
import {
  buildProfile,
  checkAnswer,
  PROFILE_REFUSALS,
  type ProfileApplication,
  type ProfileRequest,
  type ProfileSources,
  type ProfileWeek,
  type StoredAnswer,
  type VillageProfile,
} from "@shared/projectProfile";
import { villageDecision } from "@shared/villageDecisions";
import { readCarry } from "./sessionBoardCarry";
import { getApplicationStewardIds } from "./project-steward";
import { bumpVersion, type Db } from "./sessionBoard";

/** Season 2's applications carry season = 2 (shared/incubatorSeason.ts). */
export const PROFILE_APPLICATION_SEASON = 2;

/** Statuses whose project has a profile: the same ones check-in tiles show. */
export const PROFILE_STATUSES = CHECKIN_APPLICATION_STATUSES;
const isProfileStatus = (s: string) => (PROFILE_STATUSES as readonly string[]).includes(s);

type SeasonCard = {
  id: number;
  boardId: number;
  week: number;
  name: string;
  applicationId: number | null;
  hidden: number;
  authorKey: string | null;
  phase: string | null;
  whereNow: string | null;
  nextMove: string | null;
};

export type SeasonRead = { cards: SeasonCard[]; carries: CardCarry[] };

/**
 * Every Season 2 board's cards, and every card's carry chain. A carry read
 * that fails fails the whole read: a profile missing its carried cards would
 * tell the stewards their boards had moved on when they hadn't.
 */
export async function readSeason(db: Db, season: string): Promise<SeasonRead> {
  const boards = await db
    .select({ id: sessionBoards.id, week: sessionBoards.week })
    .from(sessionBoards)
    .where(eq(sessionBoards.season, season));
  if (!boards.length) return { cards: [], carries: [] };
  const weekOf = new Map(boards.map((b) => [b.id, b.week]));
  const cards = (
    await db
      .select({
        id: sessionBoardProjects.id,
        boardId: sessionBoardProjects.boardId,
        name: sessionBoardProjects.name,
        applicationId: sessionBoardProjects.applicationId,
        hidden: sessionBoardProjects.hidden,
        authorKey: sessionBoardProjects.authorKey,
        phase: sessionBoardProjects.phase,
        whereNow: sessionBoardProjects.whereNow,
        nextMove: sessionBoardProjects.nextMove,
      })
      .from(sessionBoardProjects)
      .where(inArray(sessionBoardProjects.boardId, boards.map((b) => b.id)))
      .orderBy(asc(sessionBoardProjects.id))
  ).map((c) => ({ ...c, week: weekOf.get(c.boardId) ?? 0 }));
  const carries: CardCarry[] = [];
  for (const week of [...new Set(boards.map((b) => b.week))].sort((a, b) => a - b)) {
    carries.push(...(await readCarry(db, season, week)).cards);
  }
  return { cards, carries };
}

/** The ids of every card that is this application's project, by application and by carry, both ways. */
export function projectCardIds(read: Pick<SeasonRead, "cards" | "carries">, applicationId: number): Set<number> {
  const shown = new Map(read.cards.filter((c) => !c.hidden).map((c) => [c.id, c]));
  const ids = new Set<number>([...shown.values()].filter((c) => c.applicationId === applicationId).map((c) => c.id));
  // A card tied to another application never joins, however it is carried.
  const other = (id: number) => {
    const c = shown.get(id);
    return !c || (c.applicationId != null && c.applicationId !== applicationId);
  };
  // Until nothing changes: a chain zigzagging across weeks takes as many passes as it has links.
  for (let pass = 0; pass <= read.carries.length; pass++) {
    const before = ids.size;
    for (const cc of read.carries) {
      const from = cc.from.map((f) => f.cardId);
      if (ids.has(cc.cardId)) for (const f of from) if (!other(f)) ids.add(f);
      if (!other(cc.cardId) && from.some((f) => ids.has(f))) ids.add(cc.cardId);
    }
    if (ids.size === before) break;
  }
  return ids;
}

type AppRow = ProfileApplication & { season: number | null };

async function readApplication(db: Db, applicationId: number): Promise<AppRow | null> {
  const [a] = await db
    .select({
      id: applications.id,
      projectName: applications.projectName,
      location: applications.location,
      country: applications.country,
      vision: applications.vision,
      latitude: applications.latitude,
      intendedPeopleCount: applications.intendedPeopleCount,
      status: applications.status,
      season: applications.season,
    })
    .from(applications)
    .where(eq(applications.id, applicationId))
    .limit(1);
  return a ?? null;
}

const hasProfile = (app: AppRow | null, appSeason: number): app is AppRow =>
  !!app && app.season === appSeason && isProfileStatus(app.status);

async function readRequest(db: Db, applicationId: number): Promise<ProfileRequest | null> {
  const [r] = await db
    .select({
      villageName: villageOsRequests.villageName,
      tagline: villageOsRequests.tagline,
      memberWord: villageOsRequests.memberWord,
      timeZone: villageOsRequests.timeZone,
      preferredAddress: villageOsRequests.preferredAddress,
    })
    .from(villageOsRequests)
    .where(eq(villageOsRequests.applicationId, applicationId))
    .limit(1);
  return r ?? null;
}

async function readTools(db: Db, applicationId: number): Promise<string[]> {
  const rows = await db
    .select({ name: regenTools.name })
    .from(regenToolProjectUsage)
    .innerJoin(regenTools, eq(regenTools.id, regenToolProjectUsage.toolId))
    .where(eq(regenToolProjectUsage.applicationId, applicationId))
    .orderBy(asc(regenTools.name));
  return rows.map((r) => r.name);
}

function parseStored(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/** The stewards' answers. Which steward saved each stays on the server. */
async function readStored(db: Db, applicationId: number): Promise<Record<string, StoredAnswer>> {
  const rows = await db
    .select({ decisionKey: villageProfileAnswers.decisionKey, value: villageProfileAnswers.value, how: villageProfileAnswers.how, updatedAt: villageProfileAnswers.updatedAt })
    .from(villageProfileAnswers)
    .where(eq(villageProfileAnswers.applicationId, applicationId));
  const out: Record<string, StoredAnswer> = {};
  for (const r of rows) {
    if (!villageDecision(r.decisionKey)) continue;
    const value = parseStored(r.value);
    if (value == null) continue;
    out[r.decisionKey] = { value, how: r.how, updatedAt: new Date(r.updatedAt).toISOString() };
  }
  return out;
}

/** One week's slice of a project: its cards there, their answers, and Week 2's notes. */
async function readWeeks(db: Db, read: SeasonRead, ids: ReadonlySet<number>): Promise<ProfileWeek[]> {
  const mine = read.cards.filter((c) => ids.has(c.id));
  if (!mine.length) return [];
  const items = await db
    .select({
      id: sessionBoardItems.id,
      kind: sessionBoardItems.kind,
      block: sessionBoardItems.block,
      text: sessionBoardItems.text,
      projectId: sessionBoardItems.projectId,
      createdAt: sessionBoardItems.createdAt,
    })
    .from(sessionBoardItems)
    .where(and(inArray(sessionBoardItems.projectId, mine.map((c) => c.id)), eq(sessionBoardItems.hidden, 0)))
    .orderBy(asc(sessionBoardItems.id));
  const weekOfCard = new Map(mine.map((c) => [c.id, c.week]));
  const out: ProfileWeek[] = [];
  for (const week of [...new Set(mine.map((c) => c.week))].sort((a, b) => a - b)) {
    const cards = mine.filter((c) => c.week === week);
    const anon = anonymousKeys(week);
    const here = items.filter((i) => i.projectId != null && weekOfCard.get(i.projectId) === week);
    const rows: AnswerRow[] = here
      // Anonymous answers are stored with no project today; this keeps them out if that ever changes.
      .filter((i) => i.kind === "answer" && i.block && !anon.has(i.block))
      .map((i) => ({ id: i.id, kind: i.kind, block: i.block, text: i.text, projectId: i.projectId, createdAt: i.createdAt, hidden: false }));
    const first = <K extends "phase" | "whereNow" | "nextMove">(k: K) => cards.map((c) => c[k]).find((v) => v && v.trim()) ?? null;
    out.push({
      week,
      cards: cards.map((c) => ({ id: c.id, name: c.name })),
      rows,
      pains: here.filter((i) => i.kind === "pain").map((i) => i.text),
      opps: here.filter((i) => i.kind === "opp").map((i) => i.text),
      phase: first("phase"),
      whereNow: first("whereNow"),
      nextMove: first("nextMove"),
    });
  }
  return out;
}

/** An earlier card the project's stewards may claim from the profile page. */
export type ClaimableCard = { cardId: number; week: number; name: string; answers: number; why: "name" | "yours" };
/** A card this project claimed from its profile page, which its stewards can give back. */
export type ClaimedCard = { cardId: number; week: number; name: string };

/** Every card in some other application's group: never claimable for this one. */
function othersGroups(read: SeasonRead, applicationId: number): Set<number> {
  const out = new Set<number>();
  const others = new Set(read.cards.filter((c) => !c.hidden && c.applicationId != null && c.applicationId !== applicationId).map((c) => c.applicationId as number));
  for (const other of others) for (const id of projectCardIds(read, other)) out.add(id);
  return out;
}

/** The cards with no application this project's stewards may claim (see the file's comment). */
export function claimableCards(
  read: SeasonRead,
  applicationId: number,
  ids: ReadonlySet<number>,
  names: readonly string[],
  stewardIds: readonly number[],
  answers: ReadonlyMap<number, number>,
): ClaimableCard[] {
  const folded = new Set(names.map((n) => foldProjectName(n)).filter(Boolean));
  const stewardKeys = new Set(stewardIds.map((id) => `u:${id}`));
  const taken = othersGroups(read, applicationId);
  const out: ClaimableCard[] = [];
  for (const c of read.cards) {
    if (c.hidden || c.applicationId != null || ids.has(c.id) || taken.has(c.id)) continue;
    const yours = !!c.authorKey && stewardKeys.has(c.authorKey);
    const byName = c.authorKey == null && folded.has(foldProjectName(c.name));
    if (!yours && !byName) continue;
    out.push({ cardId: c.id, week: c.week, name: c.name, answers: answers.get(c.id) ?? 0, why: yours ? "yours" : "name" });
  }
  return out.sort((a, b) => a.week - b.week || a.cardId - b.cardId);
}

async function answerCounts(db: Db, cardIds: readonly number[]): Promise<Map<number, number>> {
  if (!cardIds.length) return new Map();
  const counts = await db
    .select({ projectId: sessionBoardItems.projectId, n: sql<number>`COUNT(*)` })
    .from(sessionBoardItems)
    .where(and(inArray(sessionBoardItems.projectId, [...cardIds]), eq(sessionBoardItems.hidden, 0)))
    .groupBy(sessionBoardItems.projectId);
  return new Map(counts.map((r) => [r.projectId ?? 0, Number(r.n)]));
}

async function readClaimed(db: Db, read: SeasonRead, applicationId: number): Promise<ClaimedCard[]> {
  const rows = await db
    .select({ cardId: villageProfileClaims.cardId })
    .from(villageProfileClaims)
    .where(eq(villageProfileClaims.applicationId, applicationId));
  const byId = new Map(read.cards.map((c) => [c.id, c]));
  return rows
    .map((r) => byId.get(r.cardId))
    .filter((c): c is SeasonCard => !!c && c.applicationId === applicationId)
    .map((c) => ({ cardId: c.id, week: c.week, name: c.name }))
    .sort((a, b) => a.week - b.week || a.cardId - b.cardId);
}

export type ProfileRead = { profile: VillageProfile; claimable: ClaimableCard[]; claimed: ClaimedCard[]; applicationStatus: string };

/**
 * Everything the profile page shows for one application, or null when it
 * isn't a Season 2 project that has applied. `withClaims` off skips the claim
 * reads (Admin's list has no steward to offer them to). A season already read
 * can be passed in, so a list reads it once.
 */
export async function readVillageProfile(
  db: Db,
  opts: { season: string; applicationId: number; site?: string; appSeason?: number; withClaims?: boolean; seasonRead?: SeasonRead },
): Promise<ProfileRead | null> {
  const app = await readApplication(db, opts.applicationId);
  if (!hasProfile(app, opts.appSeason ?? PROFILE_APPLICATION_SEASON)) return null;
  const [request, tools, stored, read] = await Promise.all([
    readRequest(db, app.id),
    readTools(db, app.id),
    readStored(db, app.id),
    opts.seasonRead ? Promise.resolve(opts.seasonRead) : readSeason(db, opts.season),
  ]);
  const ids = projectCardIds(read, app.id);
  const weeks = await readWeeks(db, read, ids);
  const { season: _season, ...application } = app;
  const sources: ProfileSources = { application, request, tools, weeks, stored, site: opts.site };
  let claimable: ClaimableCard[] = [];
  let claimed: ClaimedCard[] = [];
  if (opts.withClaims !== false) {
    const stewardIds = await getApplicationStewardIds(app.id);
    const names = [app.projectName, request?.villageName ?? ""].filter(Boolean);
    const candidates = claimableCards(read, app.id, ids, names, stewardIds, new Map());
    const counts = await answerCounts(db, candidates.map((c) => c.cardId));
    claimable = candidates.map((c) => ({ ...c, answers: counts.get(c.cardId) ?? 0 }));
    claimed = await readClaimed(db, read, app.id);
  }
  return { profile: buildProfile(sources), claimable, claimed, applicationStatus: app.status };
}

/* ------------------------------------------------------------- writes */

export const WRITE_REFUSALS = {
  noProfile: "That project has no Village profile. Season 2 projects that have applied have one.",
  notClaimable: "That card isn't one this project can claim. A facilitator can link it from the board.",
  notClaimed: "That card wasn't claimed from this profile.",
} as const;

/** Writes go only to a Season 2 project that has applied, the same ones that have a profile. */
async function assertHasProfile(db: Db, applicationId: number, appSeason = PROFILE_APPLICATION_SEASON) {
  if (!hasProfile(await readApplication(db, applicationId), appSeason)) {
    throw new TRPCError({ code: "NOT_FOUND", message: WRITE_REFUSALS.noProfile });
  }
}

async function upsertAnswer(db: Db, applicationId: number, key: string, value: unknown, how: "confirmed" | "answered", userId: number) {
  const json = JSON.stringify(value);
  await db
    .insert(villageProfileAnswers)
    .values({ applicationId, decisionKey: key, value: json, how, updatedBy: userId })
    .onDuplicateKeyUpdate({ set: { value: json, how, updatedBy: userId } });
}

function decisionOrRefuse(key: string) {
  const d = villageDecision(key);
  if (!d) throw new TRPCError({ code: "NOT_FOUND", message: PROFILE_REFUSALS.unknown });
  return d;
}

/** A steward's own answer for a decision that isn't a board block. */
export async function answerDecision(db: Db, opts: { applicationId: number; key: string; value: unknown; userId: number; appSeason?: number }): Promise<void> {
  const d = decisionOrRefuse(opts.key);
  await assertHasProfile(db, opts.applicationId, opts.appSeason);
  const checked = checkAnswer(d, opts.value);
  if (!checked.ok) throw new TRPCError({ code: "BAD_REQUEST", message: checked.message });
  await upsertAnswer(db, opts.applicationId, d.key, checked.value, "answered", opts.userId);
}

/**
 * Keep a decision's current suggestion as the project's own. The server reads
 * the suggestion itself, so a page can never keep words it made up, and it
 * keeps only the version the steward saw: `seen` is the stamp the page showed,
 * and a different stamp now means the boards changed in between.
 */
export async function confirmDecision(
  db: Db,
  opts: { season: string; applicationId: number; key: string; seen: string; userId: number; appSeason?: number },
): Promise<void> {
  const d = decisionOrRefuse(opts.key);
  const read = await readVillageProfile(db, { season: opts.season, applicationId: opts.applicationId, appSeason: opts.appSeason, withClaims: false });
  if (!read) throw new TRPCError({ code: "NOT_FOUND", message: WRITE_REFUSALS.noProfile });
  const state = read.profile.decisions.find((x) => x.key === d.key);
  if (!state || state.suggestion == null) throw new TRPCError({ code: "BAD_REQUEST", message: PROFILE_REFUSALS.nothingToConfirm });
  if (state.stamp !== opts.seen) throw new TRPCError({ code: "CONFLICT", message: PROFILE_REFUSALS.moved });
  let value: unknown = state.suggestion;
  if (d.kind !== "block") {
    const checked = checkAnswer(d, state.suggestion);
    if (!checked.ok) throw new TRPCError({ code: "BAD_REQUEST", message: checked.message });
    value = checked.value;
  }
  await upsertAnswer(db, opts.applicationId, d.key, value, "confirmed", opts.userId);
}

/** Take a steward's answer back; the decision goes back to its suggestion or default. */
export async function clearDecision(db: Db, opts: { applicationId: number; key: string; appSeason?: number }): Promise<void> {
  decisionOrRefuse(opts.key);
  await assertHasProfile(db, opts.applicationId, opts.appSeason);
  await db
    .delete(villageProfileAnswers)
    .where(and(eq(villageProfileAnswers.applicationId, opts.applicationId), eq(villageProfileAnswers.decisionKey, opts.key)));
}

/** Tie an earlier card with no application to this project, when the profile offers it, and record the claim. */
export async function claimCard(db: Db, opts: { season: string; applicationId: number; cardId: number; userId: number; appSeason?: number }): Promise<{ week: number }> {
  const read = await readVillageProfile(db, { season: opts.season, applicationId: opts.applicationId, appSeason: opts.appSeason });
  const card = read?.claimable.find((c) => c.cardId === opts.cardId);
  if (!read || !card) throw new TRPCError({ code: "BAD_REQUEST", message: WRITE_REFUSALS.notClaimable });
  const res = await db
    .update(sessionBoardProjects)
    .set({ applicationId: opts.applicationId })
    .where(and(eq(sessionBoardProjects.id, opts.cardId), sql`${sessionBoardProjects.applicationId} IS NULL`));
  const changed = Number((res as unknown as [{ affectedRows?: number }])[0]?.affectedRows ?? 0);
  if (!changed) throw new TRPCError({ code: "BAD_REQUEST", message: WRITE_REFUSALS.notClaimable });
  await db
    .insert(villageProfileClaims)
    .values({ applicationId: opts.applicationId, cardId: opts.cardId, claimedBy: opts.userId })
    .onDuplicateKeyUpdate({ set: { applicationId: opts.applicationId, claimedBy: opts.userId } });
  const [row] = await db.select({ boardId: sessionBoardProjects.boardId }).from(sessionBoardProjects).where(eq(sessionBoardProjects.id, opts.cardId)).limit(1);
  if (row) await bumpVersion(db, row.boardId);
  return { week: card.week };
}

/** Give back a card this project claimed from its profile: its application goes back to none. */
export async function unclaimCard(db: Db, opts: { applicationId: number; cardId: number }): Promise<void> {
  const [claim] = await db
    .select({ id: villageProfileClaims.id })
    .from(villageProfileClaims)
    .where(and(eq(villageProfileClaims.applicationId, opts.applicationId), eq(villageProfileClaims.cardId, opts.cardId)))
    .limit(1);
  if (!claim) throw new TRPCError({ code: "BAD_REQUEST", message: WRITE_REFUSALS.notClaimed });
  await db
    .update(sessionBoardProjects)
    .set({ applicationId: null })
    .where(and(eq(sessionBoardProjects.id, opts.cardId), eq(sessionBoardProjects.applicationId, opts.applicationId)));
  await db.delete(villageProfileClaims).where(eq(villageProfileClaims.id, claim.id));
  const [row] = await db.select({ boardId: sessionBoardProjects.boardId }).from(sessionBoardProjects).where(eq(sessionBoardProjects.id, opts.cardId)).limit(1);
  if (row) await bumpVersion(db, row.boardId);
}

/* ------------------------------------------------------------ for admins */

export type ProfileSummary = {
  applicationId: number;
  projectName: string;
  status: string;
  weeks: number[];
  launch: { total: number; ready: number };
  yours: number;
  suggested: number;
};

/** Every Season 2 project's profile at a glance, for Admin. The season's boards are read once. */
export async function listVillageProfiles(db: Db, season: string, appSeason = PROFILE_APPLICATION_SEASON): Promise<ProfileSummary[]> {
  const apps = await db
    .select({ id: applications.id })
    .from(applications)
    .where(and(eq(applications.season, appSeason), inArray(applications.status, [...PROFILE_STATUSES])))
    .orderBy(asc(applications.projectName));
  if (!apps.length) return [];
  const seasonRead = await readSeason(db, season);
  const out: ProfileSummary[] = [];
  for (const a of apps) {
    const read = await readVillageProfile(db, { season, applicationId: a.id, appSeason, withClaims: false, seasonRead });
    if (!read) continue;
    const p = read.profile;
    out.push({
      applicationId: p.applicationId,
      projectName: p.card.from.project,
      status: read.applicationStatus,
      weeks: p.weeks,
      launch: { total: p.launch.total, ready: p.launch.ready },
      yours: p.decisions.filter((d) => d.status === "yours").length,
      suggested: p.decisions.filter((d) => d.status === "suggested").length,
    });
  }
  return out;
}
