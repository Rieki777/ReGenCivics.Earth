/**
 * Reading the boards back (Rye, 2026-10-13): a person's own answers for every
 * week, shown on their profile under Submissions ("Weekly sessions",
 * API_CONTRACT 3.9), and the admin export of every week's board that shapes
 * how we build Village OS (3.10).
 *
 * Neither ever returns an author key. The profile reads only the signed-in
 * person's own rows (`u:<id>`); guest rows reach it through claimGuest. The
 * export names an author only as "signed-in" or "guest", with a user id for
 * signed-in authors; a guest key never leaves the server.
 */
import { and, asc, eq, inArray } from "drizzle-orm";
import {
  applications,
  sessionBoardItems,
  sessionBoardProjects,
  sessionBoardVotes,
  sessionBoards,
} from "../../drizzle/schema";
import {
  FIRST_BOARD_WEEK,
  LAST_BOARD_WEEK,
  anonymousKeys,
  boardStages,
  hasSessionBoard,
  promptsForWeek,
} from "@shared/sessionBoard";
import {
  EXPORT_WHY,
  adminApplicationPath,
  describeCard,
  describeItem,
  describeVote,
  entryStage,
  weekHeading,
  type BoardExport,
  type BoardExportProject,
  type BoardExportRow,
  type BoardExportWeek,
  type Entry,
} from "@shared/boardEntries";
import {
  needsSummary,
  projectCardLines,
  projectView,
  shownAnswerRows,
  toVillageOsScope,
  type AnswerRow,
} from "@shared/humanNeeds";
import { projectPathForApplication } from "@shared/projectKey";
import { voteCounts, type Db } from "./sessionBoard";

/* -------------------------------------------------------------- profile */

export type SubmissionEntry = {
  /** "i<itemId>", "v<voteId>", "c<cardId>:<field>". */
  id: string;
  stage: string | null;
  label: string;
  value: string;
  /** The card's name; null when it was for the room. */
  project: string | null;
  anonymous: boolean;
  at: string;
};

export type SubmissionWeek = {
  week: number;
  title: string;
  href: string;
  lastAt: string;
  projects: { cardId: number; name: string; how: "added" | "checked in" }[];
  entries: SubmissionEntry[];
};

export type MySubmissions = { weeks: SubmissionWeek[] };

function iso(v: Date | string | number | null | undefined): string {
  const t = v == null ? NaN : new Date(v).getTime();
  return Number.isFinite(t) ? new Date(t).toISOString() : new Date(0).toISOString();
}

function stamp(v: Date | string | number | null | undefined): number {
  const t = v == null ? NaN : new Date(v).getTime();
  return Number.isFinite(t) ? t : 0;
}

function kindStage(week: number, ...kinds: string[]): number | null {
  const stages = boardStages(week);
  for (const kind of kinds) {
    const i = stages.findIndex((s) => s.kind === kind);
    if (i >= 0) return i;
  }
  return null;
}

/** The stage a vote was given on: opportunities at the harvest, hands ahead, offers together. */
function voteStage(week: number, target: string): number | null {
  if (target.startsWith("item:")) return kindStage(week, "harvest", "circle");
  if (target.startsWith("week:")) return kindStage(week, "ahead");
  if (target.startsWith("offer:")) return kindStage(week, "together");
  return null;
}

const CARD_FIELDS: Record<string, string> = {
  "Where your project is": "phase",
  "Where you are now": "whereNow",
  "Ready to crowdpool, in place": "ready",
  "Your one move": "nextMove",
};

function cardEntries(card: { phase: string | null; whereNow: string | null; ready: string | null; nextMove: string | null }): (Entry & { field: string })[] {
  return describeCard(card).map((e, i) => ({ ...e, field: CARD_FIELDS[e.label] ?? String(i) }));
}

/**
 * Everything one signed-in person gave on the Season's boards, week by week,
 * newest week first (API_CONTRACT 3.9).
 */
export async function submissionsFor(db: Db, season: string, userId: number): Promise<MySubmissions> {
  const me = `u:${userId}`;
  const boards = (await db
    .select({ id: sessionBoards.id, week: sessionBoards.week })
    .from(sessionBoards)
    .where(eq(sessionBoards.season, season)))
    .filter((b) => hasSessionBoard(b.week));
  if (boards.length === 0) return { weeks: [] };
  const boardIds = boards.map((b) => b.id);

  const [items, votes, cards] = await Promise.all([
    db.select().from(sessionBoardItems)
      .where(and(inArray(sessionBoardItems.boardId, boardIds), eq(sessionBoardItems.authorKey, me), eq(sessionBoardItems.hidden, 0)))
      .orderBy(asc(sessionBoardItems.id)),
    db.select().from(sessionBoardVotes)
      .where(and(inArray(sessionBoardVotes.boardId, boardIds), eq(sessionBoardVotes.voterKey, me)))
      .orderBy(asc(sessionBoardVotes.id)),
    db.select().from(sessionBoardProjects)
      .where(and(inArray(sessionBoardProjects.boardId, boardIds), eq(sessionBoardProjects.authorKey, me)))
      .orderBy(asc(sessionBoardProjects.id)),
  ]);

  // Cards the person's rows point at (answers for a project, check-ins), and
  // the opportunities they voted for, read once.
  const cardIds = new Set<number>();
  const oppIds = new Set<number>();
  for (const i of items) if (i.projectId != null) cardIds.add(i.projectId);
  for (const v of votes) {
    let m = /^checkin:(\d+)$/.exec(v.target);
    if (m) cardIds.add(Number(m[1]));
    m = /^item:(\d+)$/.exec(v.target);
    if (m) oppIds.add(Number(m[1]));
  }
  for (const c of cards) cardIds.delete(c.id);
  const [otherCards, opps] = await Promise.all([
    cardIds.size
      ? db.select({ id: sessionBoardProjects.id, boardId: sessionBoardProjects.boardId, name: sessionBoardProjects.name, hidden: sessionBoardProjects.hidden })
        .from(sessionBoardProjects).where(inArray(sessionBoardProjects.id, [...cardIds]))
      : Promise.resolve([] as { id: number; boardId: number; name: string; hidden: number }[]),
    oppIds.size
      ? db.select({ id: sessionBoardItems.id, boardId: sessionBoardItems.boardId, text: sessionBoardItems.text })
        .from(sessionBoardItems).where(inArray(sessionBoardItems.id, [...oppIds]))
      : Promise.resolve([] as { id: number; boardId: number; text: string }[]),
  ]);
  const cardById = new Map<number, { id: number; boardId: number; name: string; hidden: number }>();
  for (const c of cards) cardById.set(c.id, { id: c.id, boardId: c.boardId, name: c.name, hidden: c.hidden });
  for (const c of otherCards) cardById.set(c.id, c);
  const oppById = new Map(opps.map((o) => [o.id, o]));

  const weeks: SubmissionWeek[] = [];
  for (const board of boards) {
    const week = board.week;
    const stages = boardStages(week);
    const anon = anonymousKeys(week);
    const myItems = items.filter((i) => i.boardId === board.id);
    const myVotes = votes.filter((v) => v.boardId === board.id);
    const myCards = cards.filter((c) => c.boardId === board.id);
    const written = myCards.map((c) => ({ card: c, fields: cardEntries(c) }));
    // A card that only carries a name and a place (a check-in carried it
    // forward for its writer) never makes a week appear by itself.
    if (myItems.length === 0 && myVotes.length === 0 && !written.some((w) => w.fields.length > 0)) continue;

    const cardName = (id: number | null) => {
      if (id == null) return null;
      const c = cardById.get(id);
      return c && c.boardId === board.id ? c.name : null;
    };

    const projects: SubmissionWeek["projects"] = [];
    const listed = new Set<number>();
    for (const c of myCards) {
      if (c.hidden || listed.has(c.id)) continue;
      listed.add(c.id);
      projects.push({ cardId: c.id, name: c.name, how: "added" });
    }
    for (const v of myVotes) {
      const m = /^checkin:(\d+)$/.exec(v.target);
      if (!m) continue;
      const c = cardById.get(Number(m[1]));
      if (!c || c.boardId !== board.id || c.hidden || listed.has(c.id)) continue;
      listed.add(c.id);
      projects.push({ cardId: c.id, name: c.name, how: "checked in" });
    }

    const rows: (SubmissionEntry & { order: number | null; t: number })[] = [];
    for (const i of myItems) {
      const order = entryStage(week, i);
      const e = describeItem(week, i);
      rows.push({
        id: `i${i.id}`,
        stage: order != null ? stages[order]?.name ?? null : null,
        label: e.label,
        value: e.value,
        project: cardName(i.projectId),
        anonymous: i.kind === "answer" && !!i.block && anon.has(i.block),
        at: iso(i.createdAt),
        order,
        t: stamp(i.createdAt),
      });
    }
    for (const v of myVotes) {
      const e = describeVote(v.target, {
        itemText: (id) => {
          const o = oppById.get(id);
          return o && o.boardId === board.id ? o.text : null;
        },
      });
      if (!e) continue;
      const order = voteStage(week, v.target);
      rows.push({
        id: `v${v.id}`,
        stage: order != null ? stages[order]?.name ?? null : null,
        label: e.label,
        value: e.value,
        project: null,
        anonymous: false,
        at: iso(v.createdAt),
        order,
        t: stamp(v.createdAt),
      });
    }
    const circle = kindStage(week, "circle");
    for (const { card, fields } of written) {
      for (const f of fields) {
        rows.push({
          id: `c${card.id}:${f.field}`,
          stage: circle != null ? stages[circle]?.name ?? null : null,
          label: f.label,
          value: f.value,
          project: card.name,
          anonymous: false,
          at: iso(card.updatedAt ?? card.createdAt),
          order: circle,
          t: stamp(card.updatedAt ?? card.createdAt),
        });
      }
    }
    if (rows.length === 0 && projects.length === 0) continue;

    rows.sort((a, b) => {
      const ao = a.order ?? Number.MAX_SAFE_INTEGER;
      const bo = b.order ?? Number.MAX_SAFE_INTEGER;
      return ao - bo || a.t - b.t || a.id.localeCompare(b.id);
    });
    const times = [
      ...rows.map((r) => r.t),
      ...myVotes.map((v) => stamp(v.createdAt)),
      ...myCards.map((c) => stamp(c.updatedAt ?? c.createdAt)),
    ];
    const heading = weekHeading(week);
    weeks.push({
      week,
      title: heading.title,
      href: heading.href,
      lastAt: iso(Math.max(0, ...times)),
      projects,
      entries: rows.map(({ order: _order, t: _t, ...e }) => e),
    });
  }
  weeks.sort((a, b) => b.week - a.week);
  return { weeks };
}

/* --------------------------------------------------------------- export */

function authorOf(key: string | null | undefined): { author: "signed-in" | "guest" | null; userId: number | null } {
  if (!key) return { author: null, userId: null };
  const m = /^u:(\d+)$/.exec(key);
  if (m) return { author: "signed-in", userId: Number(m[1]) };
  if (key.startsWith("k:")) return { author: "guest", userId: null };
  return { author: null, userId: null };
}

function emptyWeek(week: number, status: BoardExportWeek["status"]): BoardExportWeek {
  const heading = weekHeading(week);
  return { week, title: heading.title, href: heading.href, status, projects: [], rows: [], anonymous: [], votes: [], summary: null, projectViews: [] };
}

/** One week's board, everything on it, for the admin export. */
async function exportWeek(db: Db, board: { id: number; week: number; status: string }): Promise<BoardExportWeek> {
  const week = board.week;
  const stages = boardStages(week);
  const anon = anonymousKeys(week);
  const [cards, items, counts] = await Promise.all([
    db.select().from(sessionBoardProjects).where(eq(sessionBoardProjects.boardId, board.id)).orderBy(asc(sessionBoardProjects.id)),
    db.select().from(sessionBoardItems).where(eq(sessionBoardItems.boardId, board.id)).orderBy(asc(sessionBoardItems.id)),
    voteCounts(db, board.id),
  ]);
  const appIds = Array.from(new Set(cards.map((c) => c.applicationId).filter((id): id is number => id != null)));
  const apps = appIds.length
    ? await db.select({ id: applications.id, projectName: applications.projectName, status: applications.status }).from(applications).where(inArray(applications.id, appIds))
    : [];
  const appById = new Map(apps.map((a) => [a.id, a]));
  const cardById = new Map(cards.map((c) => [c.id, c]));

  const projects: BoardExportProject[] = cards.map((c) => {
    const app = c.applicationId != null ? appById.get(c.applicationId) ?? null : null;
    const isPublic = !!app && (app.status === "approved" || app.status === "active");
    return {
      cardId: c.id,
      name: c.name,
      place: c.place,
      applicationId: c.applicationId,
      applicationName: app?.projectName ?? null,
      applicationStatus: app?.status ?? null,
      projectPath: app && isPublic ? projectPathForApplication(app.id, app.projectName) : null,
      adminPath: app ? adminApplicationPath(app.id) : null,
      hidden: !!c.hidden,
      addedBy: authorOf(c.authorKey).author,
      checkins: counts.get(`checkin:${c.id}`) ?? 0,
    };
  });

  const rows: BoardExportRow[] = [];
  const anonymous: BoardExportWeek["anonymous"] = [];
  for (const i of items) {
    const e = describeItem(week, i);
    if (i.kind === "answer" && i.block && anon.has(i.block)) {
      // The day only, never the second: beside the named rows' times, an exact
      // stamp would say whose "anonymous" answer this was.
      anonymous.push({ key: i.block, label: e.label, value: e.value, createdAt: iso(i.createdAt).slice(0, 10) });
      continue;
    }
    const order = entryStage(week, i);
    const card = i.projectId != null ? cardById.get(i.projectId) : undefined;
    const who = authorOf(i.authorKey);
    rows.push({
      id: i.id,
      kind: i.kind,
      key: i.block,
      stage: order != null ? stages[order]?.name ?? null : null,
      label: e.label,
      value: e.value,
      projectId: i.projectId,
      projectName: card?.name ?? null,
      applicationId: card?.applicationId ?? null,
      displayName: i.displayName,
      author: who.author,
      userId: who.userId,
      chosen: !!i.chosen,
      hidden: !!i.hidden,
      createdAt: iso(i.createdAt),
    });
  }

  const textById = new Map(items.map((i) => [i.id, i.text]));
  const votes: BoardExportWeek["votes"] = [];
  for (const [target, count] of [...counts.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    if (target.startsWith("checkin:")) continue;
    const e = describeVote(target, { itemText: (id) => textById.get(id) ?? null });
    if (!e) continue;
    votes.push({ target, label: e.label, value: e.value, count });
  }

  let summary: BoardExportWeek["summary"] = null;
  const projectViews: BoardExportWeek["projectViews"] = [];
  if (promptsForWeek(week).has("needs")) {
    const hiddenCards = cards.filter((c) => c.hidden).map((c) => c.id);
    const answerRows: AnswerRow[] = items
      .filter((i) => i.kind === "answer")
      .map((i) => ({ id: i.id, kind: i.kind, block: i.block, text: i.text, projectId: i.projectId, createdAt: i.createdAt, hidden: !!i.hidden }));
    const shown = shownAnswerRows(answerRows, hiddenCards);
    summary = needsSummary(shown);
    const named = shown.filter((r) => !(r.block && anon.has(r.block)));
    for (const c of cards) {
      if (c.hidden || !named.some((r) => r.projectId === c.id)) continue;
      const view = projectView(named, c.id);
      projectViews.push({ cardId: c.id, name: c.name, lines: projectCardLines(view), villageOs: toVillageOsScope(view) });
    }
    if (named.some((r) => r.projectId == null)) {
      const view = projectView(named, null);
      projectViews.push({ cardId: null, name: "From the room", lines: projectCardLines(view), villageOs: toVillageOsScope(view) });
    }
  }

  // Sorted by question and answer, never by when they came in, for the same reason.
  anonymous.sort((a, b) => a.key.localeCompare(b.key) || a.value.localeCompare(b.value) || a.createdAt.localeCompare(b.createdAt));

  return {
    ...emptyWeek(week, board.status === "closed" ? "closed" : "open"),
    projects,
    rows,
    anonymous,
    votes,
    summary,
    projectViews,
  };
}

/**
 * Every week's board for the admins (API_CONTRACT 3.10): the weeks asked for,
 * or every week that has a board. A week asked for with no board comes back
 * with status "none".
 */
export async function buildBoardExport(db: Db, season: string, weeks?: readonly number[]): Promise<BoardExport> {
  const boards = await db
    .select({ id: sessionBoards.id, week: sessionBoards.week, status: sessionBoards.status })
    .from(sessionBoards)
    .where(eq(sessionBoards.season, season));
  const byWeek = new Map(boards.filter((b) => hasSessionBoard(b.week)).map((b) => [b.week, b]));
  const list = weeks && weeks.length
    ? Array.from(new Set(weeks)).filter((w) => w >= FIRST_BOARD_WEEK && w <= LAST_BOARD_WEEK).sort((a, b) => a - b)
    : [...byWeek.keys()].sort((a, b) => a - b);
  const out: BoardExportWeek[] = [];
  for (const week of list) {
    const board = byWeek.get(week);
    out.push(board ? await exportWeek(db, board) : emptyWeek(week, "none"));
  }
  return { generatedAt: new Date().toISOString(), why: EXPORT_WHY, weeks: out };
}
