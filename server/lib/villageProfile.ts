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
 * application, back through the weeks), in either direction.
 *
 * A card with no application can be claimed by the project's stewards from
 * the profile page when it has the project's name, or the steward wrote it or
 * checked in with it, and no other project's card carries it. A claim sets
 * the card's application, the same link a facilitator's select makes.
 */
import { TRPCError } from "@trpc/server";
import { and, asc, eq, inArray, sql } from "drizzle-orm";
import {
  applications,
  regenToolProjectUsage,
  regenTools,
  sessionBoardItems,
  sessionBoardProjects,
  sessionBoardVotes,
  sessionBoards,
  villageOsRequests,
  villageProfileAnswers,
} from "../../drizzle/schema";
import { CHECKIN_APPLICATION_STATUSES, foldProjectName, voteTarget } from "@shared/sessionBoard";
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

type SeasonRead = { cards: SeasonCard[]; carries: CardCarry[]; boardOfWeek: Map<number, number> };

/** Every Season 2 board's cards, and every card's carry chain. */
async function readSeason(db: Db, season: string): Promise<SeasonRead> {
  const boards = await db
    .select({ id: sessionBoards.id, week: sessionBoards.week })
    .from(sessionBoards)
    .where(eq(sessionBoards.season, season));
  if (!boards.length) return { cards: [], carries: [], boardOfWeek: new Map() };
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
    try {
      carries.push(...(await readCarry(db, season, week)).cards);
    } catch (err) {
      // A week whose carry can't be read still gives its application-tied cards.
      console.error("[villageProfile] carry read failed for week", week, err instanceof Error ? err.message : err);
    }
  }
  return { cards, carries, boardOfWeek: new Map(boards.map((b) => [b.week, b.id])) };
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
  for (let pass = 0; pass < 4; pass++) {
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

async function readApplication(db: Db, applicationId: number): Promise<(ProfileApplication & { season: number | null; userId: number }) | null> {
  const [a] = await db
    .select({
      id: applications.id,
      userId: applications.userId,
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

async function readRequest(db: Db, applicationId: number): Promise<ProfileRequest | null> {
  const [r] = await db
    .select({
      villageName: villageOsRequests.villageName,
      tagline: villageOsRequests.tagline,
      memberWord: villageOsRequests.memberWord,
      currencyName: villageOsRequests.currencyName,
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

async function readStored(db: Db, applicationId: number): Promise<Record<string, StoredAnswer>> {
  const rows = await db
    .select()
    .from(villageProfileAnswers)
    .where(eq(villageProfileAnswers.applicationId, applicationId));
  const out: Record<string, StoredAnswer> = {};
  for (const r of rows) {
    if (!villageDecision(r.decisionKey)) continue;
    const value = parseStored(r.value);
    if (value == null) continue;
    out[r.decisionKey] = { value, how: r.how, updatedAt: new Date(r.updatedAt).toISOString(), updatedBy: r.updatedBy ?? null };
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
      hidden: sessionBoardItems.hidden,
    })
    .from(sessionBoardItems)
    .where(and(inArray(sessionBoardItems.projectId, mine.map((c) => c.id)), eq(sessionBoardItems.hidden, 0)))
    .orderBy(asc(sessionBoardItems.id));
  const weekOfCard = new Map(mine.map((c) => [c.id, c.week]));
  const out: ProfileWeek[] = [];
  for (const week of [...new Set(mine.map((c) => c.week))].sort((a, b) => a - b)) {
    const cards = mine.filter((c) => c.week === week);
    const here = items.filter((i) => i.projectId != null && weekOfCard.get(i.projectId) === week);
    const rows: AnswerRow[] = here
      .filter((i) => i.kind === "answer" && i.block)
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

/**
 * Cards with no application that look like this project's: the same name as
 * the application or the hosting request's village name, or written or
 * checked in with by this steward. Never a card another project's card
 * carries, and never a hidden one.
 */
async function readClaimable(
  db: Db,
  read: SeasonRead,
  applicationId: number,
  ids: ReadonlySet<number>,
  names: readonly string[],
  userId: number | null,
): Promise<ClaimableCard[]> {
  const folded = new Set(names.map((n) => foldProjectName(n)).filter(Boolean));
  const shown = new Map(read.cards.filter((c) => !c.hidden).map((c) => [c.id, c]));
  const carriedByOther = new Set<number>();
  for (const cc of read.carries) {
    const carrier = shown.get(cc.cardId);
    if (carrier && carrier.applicationId != null && carrier.applicationId !== applicationId) for (const f of cc.from) carriedByOther.add(f.cardId);
  }
  const candidates = [...shown.values()].filter((c) => c.applicationId == null && !ids.has(c.id) && !carriedByOther.has(c.id));
  if (!candidates.length) return [];
  let checkedIn = new Set<number>();
  if (userId != null) {
    const votes = await db
      .select({ target: sessionBoardVotes.target })
      .from(sessionBoardVotes)
      .where(and(eq(sessionBoardVotes.voterKey, `u:${userId}`), inArray(sessionBoardVotes.target, candidates.map((c) => voteTarget.checkin(c.id)))));
    checkedIn = new Set(votes.map((v) => Number(v.target.slice("checkin:".length))));
  }
  const counts = await db
    .select({ projectId: sessionBoardItems.projectId, n: sql<number>`COUNT(*)` })
    .from(sessionBoardItems)
    .where(and(inArray(sessionBoardItems.projectId, candidates.map((c) => c.id)), eq(sessionBoardItems.hidden, 0)))
    .groupBy(sessionBoardItems.projectId);
  const answers = new Map(counts.map((r) => [r.projectId ?? 0, Number(r.n)]));
  const out: ClaimableCard[] = [];
  for (const c of candidates) {
    const byName = folded.has(foldProjectName(c.name));
    const yours = userId != null && (c.authorKey === `u:${userId}` || checkedIn.has(c.id));
    if (!byName && !yours) continue;
    out.push({ cardId: c.id, week: c.week, name: c.name, answers: answers.get(c.id) ?? 0, why: yours ? "yours" : "name" });
  }
  return out.sort((a, b) => a.week - b.week || a.cardId - b.cardId);
}

export type ProfileRead = { profile: VillageProfile; claimable: ClaimableCard[]; applicationStatus: string };

/** Everything the profile page shows for one application. Null when it isn't a Season 2 project. */
export async function readVillageProfile(
  db: Db,
  opts: { season: string; applicationId: number; userId: number | null; site?: string; appSeason?: number },
): Promise<ProfileRead | null> {
  const app = await readApplication(db, opts.applicationId);
  if (!app || app.season !== (opts.appSeason ?? PROFILE_APPLICATION_SEASON) || !isProfileStatus(app.status)) return null;
  const [request, tools, stored, read] = await Promise.all([
    readRequest(db, app.id),
    readTools(db, app.id),
    readStored(db, app.id),
    readSeason(db, opts.season),
  ]);
  const ids = projectCardIds(read, app.id);
  const weeks = await readWeeks(db, read, ids);
  const sources: ProfileSources = { application: app, request, tools, weeks, stored, site: opts.site };
  const names = [app.projectName, request?.villageName ?? ""].filter(Boolean);
  const claimable = await readClaimable(db, read, app.id, ids, names, opts.userId);
  return { profile: buildProfile(sources), claimable, applicationStatus: app.status };
}

/* ------------------------------------------------------------- writes */

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
export async function answerDecision(db: Db, opts: { applicationId: number; key: string; value: unknown; userId: number }): Promise<void> {
  const d = decisionOrRefuse(opts.key);
  const checked = checkAnswer(d, opts.value);
  if (!checked.ok) throw new TRPCError({ code: "BAD_REQUEST", message: checked.message });
  await upsertAnswer(db, opts.applicationId, d.key, checked.value, "answered", opts.userId);
}

/**
 * Keep a decision's current suggestion as the project's own. The server
 * reads the suggestion itself, so a page can never confirm words it made up.
 */
export async function confirmDecision(db: Db, opts: { season: string; applicationId: number; key: string; userId: number; appSeason?: number }): Promise<void> {
  const d = decisionOrRefuse(opts.key);
  const read = await readVillageProfile(db, { season: opts.season, applicationId: opts.applicationId, userId: opts.userId, appSeason: opts.appSeason });
  if (!read) throw new TRPCError({ code: "NOT_FOUND", message: PROFILE_REFUSALS.unknown });
  const state = read.profile.decisions.find((x) => x.key === d.key);
  if (!state || state.suggestion == null) throw new TRPCError({ code: "BAD_REQUEST", message: PROFILE_REFUSALS.nothingToConfirm });
  await upsertAnswer(db, opts.applicationId, d.key, state.suggestion, "confirmed", opts.userId);
}

/** Take a steward's answer back; the decision goes back to its suggestion or default. */
export async function clearDecision(db: Db, opts: { applicationId: number; key: string }): Promise<void> {
  decisionOrRefuse(opts.key);
  await db
    .delete(villageProfileAnswers)
    .where(and(eq(villageProfileAnswers.applicationId, opts.applicationId), eq(villageProfileAnswers.decisionKey, opts.key)));
}

export const CLAIM_REFUSALS = {
  notClaimable: "That card isn't one this project can claim. A facilitator can link it from the board.",
} as const;

/** Tie an earlier card with no application to this project, when the profile offers it. */
export async function claimCard(db: Db, opts: { season: string; applicationId: number; cardId: number; userId: number; appSeason?: number }): Promise<{ week: number }> {
  const read = await readVillageProfile(db, { season: opts.season, applicationId: opts.applicationId, userId: opts.userId, appSeason: opts.appSeason });
  const card = read?.claimable.find((c) => c.cardId === opts.cardId);
  if (!read || !card) throw new TRPCError({ code: "BAD_REQUEST", message: CLAIM_REFUSALS.notClaimable });
  const res = await db
    .update(sessionBoardProjects)
    .set({ applicationId: opts.applicationId })
    .where(and(eq(sessionBoardProjects.id, opts.cardId), sql`${sessionBoardProjects.applicationId} IS NULL`));
  const changed = Number((res as unknown as [{ affectedRows?: number }])[0]?.affectedRows ?? 0);
  if (!changed) throw new TRPCError({ code: "BAD_REQUEST", message: CLAIM_REFUSALS.notClaimable });
  const [row] = await db.select({ boardId: sessionBoardProjects.boardId }).from(sessionBoardProjects).where(eq(sessionBoardProjects.id, opts.cardId)).limit(1);
  if (row) await bumpVersion(db, row.boardId);
  return { week: card.week };
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

/** Every Season 2 project's profile at a glance, for Admin. */
export async function listVillageProfiles(db: Db, season: string, appSeason = PROFILE_APPLICATION_SEASON): Promise<ProfileSummary[]> {
  const apps = await db
    .select({ id: applications.id })
    .from(applications)
    .where(and(eq(applications.season, appSeason), inArray(applications.status, [...PROFILE_STATUSES])))
    .orderBy(asc(applications.projectName));
  const out: ProfileSummary[] = [];
  for (const a of apps) {
    const read = await readVillageProfile(db, { season, applicationId: a.id, userId: null, appSeason });
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
