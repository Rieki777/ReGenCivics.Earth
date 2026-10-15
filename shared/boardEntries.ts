/**
 * Board rows in plain words, for a person's profile (Submissions, "Weekly
 * sessions") and for the admin export that shapes how we build Village OS
 * (Rye, 2026-10-13: every answer for every week is saved to the person's
 * profile, and captured so it can inform the Village OS build).
 *
 * This file reads both shared/sessionBoard.ts (stage names, prompt titles,
 * Week 2's lists) and shared/humanNeeds.ts (the human needs vocabulary).
 * Neither of those imports this one, so there is no cycle.
 */
import { CROWDPOOL_READINESS } from "./crowdpoolReadiness";
import { episodeByWeek } from "./season2Curriculum";
import {
  BOARD_OFFERS,
  GAME_BLOCKS,
  PROJECT_PHASES,
  boardStages,
  parseAskBlock,
  promptHomes,
  promptsForWeek,
  sessionBoardHref,
} from "./sessionBoard";
import {
  BREADTH_STOPS,
  MEET_WAYS,
  NEED_RUNGS,
  humanNeedById,
  needShort,
  type NeedsSummary,
  type VillageOsScope,
} from "./humanNeeds";
import { CARD_LABELS, cardKindOfKey, cardLine, parseCard } from "./boardCards";
import type { CardRef, CarryMatch } from "./boardCarry";
import type { VillageOsCard } from "./villageOsCard";

/** One line of what someone gave: what it was, and what they said. */
export type Entry = { label: string; value: string };

/** The fields of a board row the describers read. */
export type EntryItem = { kind: string; block: string | null; text: string };

/** Short labels for Week 3's answers, in the second person, for the profile and the export. */
const ANSWER_LABELS: Record<string, string> = {
  hope: "What you wanted to leave with",
  mate: "How well your main organisation meets your human needs",
  purpose: "Your project's first line",
  needs: "A human need your project is here to meet",
  top: "A seed you planted",
  other: "A human need you added",
  whole: "How much of your people's human needs your project means to meet",
  "pulse-a": "How it was landing",
  living: "Your chestnut",
  allies: "A being that could hold a role on your land",
  want: "Something your project will offer",
  "pulse-b": "How it was landing",
  "decide-now": "How your project decides today",
  "decide-aim": "How you want to decide",
  play: "A game, rite or festival in place of a meeting",
  circles: "A circle to start with",
  players: "Players to start your Game",
  "players-now": "Players playing now",
  calls: "The circle that calls you",
  economies: "The economy at your project's centre",
  rite: "A rite that brings someone deeper in",
  box: "A part of the box that's clear",
  move: "Your one move",
  week4: "What you want to set up in Village OS",
  landed: "Something that landed for you",
  useful: "How useful the session was",
  whynow: "What the clip stirred in you",
  "circles-own": "A circle of your own",
  shape: "The shape of your Game",
  "shape-line": "Your Game's structure in one line",
  moved: "Whether your move happened",
  "moved-line": "What moved, or what got in the way",
  "seat-help": "What would help most with your seats",
  together: "Something the whole project decides together",
  agreement: "Your first agreement",
  entry: "The first step someone takes to come in",
  week5: "What you want to work on in Week 5",
};

/** The per-need keys: n-love, g-love, b-love, m-love, c-love. */
const PER_NEED: Record<string, string> = {
  n: "where your people are today",
  g: "where you want them in three years",
  b: "who it's for",
  m: "who meets it",
  c: "a circle that meets it",
};

function optionLabel(week: number, key: string, value: string): string {
  const p = promptsForWeek(week).get(key);
  return p?.options?.find((o) => o.key === value)?.label ?? value;
}

/**
 * Any board row in plain words. Week 2's kinds (arrival and closing words,
 * pain points, opportunities, game canvas notes), questions for the wall, and
 * every Week 3 answer, with option keys turned back into their labels.
 */
export function describeItem(week: number, item: EntryItem): Entry {
  const text = item.text;
  switch (item.kind) {
    case "arrive": return { label: "Your arrival word", value: text };
    case "leave": return { label: "Your closing word", value: text };
    case "pain": return { label: "A pain point you named", value: text };
    case "opp": return { label: "A growth opportunity you named", value: text };
    case "game": {
      const block = GAME_BLOCKS.find((b) => b.key === item.block);
      return { label: block ? `On the game canvas: ${block.title}` : "On the game canvas", value: text };
    }
    case "ask": return { label: "A question you asked", value: text };
    case "answer": return describeAnswer(week, item.block ?? "", text);
    default: return { label: "A note", value: text };
  }
}

function describeAnswer(week: number, key: string, text: string): Entry {
  // A card (Week 4 on): a seat, a human need of your own, what a circle decides, a quest.
  const kind = cardKindOfKey(key);
  if (kind) {
    const card = parseCard(kind, text);
    return { label: CARD_LABELS[kind], value: card ? cardLine(kind, card) : text };
  }
  const per = /^([ngbmc])-([a-z]+)$/.exec(key);
  if (per && humanNeedById(per[2])) {
    const need = needShort(per[2]);
    const label = `${need}: ${PER_NEED[per[1]]}`;
    if (per[1] === "n" || per[1] === "g") return { label, value: NEED_RUNGS.find((r) => r.key === text)?.label ?? text };
    if (per[1] === "b") return { label, value: BREADTH_STOPS.find((b) => b.key === text)?.label ?? text };
    if (per[1] === "c") return { label, value: optionLabel(week, key, text) };
    return { label, value: MEET_WAYS.find((w) => w.key === text)?.label ?? text };
  }
  if (key === "needs" || key === "top") {
    const need = humanNeedById(text);
    return { label: ANSWER_LABELS[key], value: need ? (key === "top" ? needShort(text) : need.label) : text };
  }
  const prompt = promptsForWeek(week).get(key);
  const label = ANSWER_LABELS[key] ?? prompt?.title ?? "An answer";
  const value = prompt?.mode === "pick" ? optionLabel(week, key, text) : text;
  return { label, value };
}

/**
 * A vote row in plain words: an opportunity voted for, a hand raised for a
 * coming week, a hand to coach or build. A check-in is not an entry (the
 * profile lists it with the projects), so it comes back null.
 */
export function describeVote(target: string, ctx: { itemText?: (id: number) => string | null } = {}): Entry | null {
  let m = /^item:(\d+)$/.exec(target);
  if (m) return { label: "You voted for", value: ctx.itemText?.(Number(m[1])) ?? "An opportunity on the board" };
  m = /^week:(\d+)$/.exec(target);
  if (m) {
    const ep = episodeByWeek(Number(m[1]));
    return { label: "You raised a hand for", value: ep ? `Week ${ep.week}: ${ep.title}` : `Week ${m[1]}` };
  }
  m = /^offer:(\w+)$/.exec(target);
  if (m) {
    const offer = BOARD_OFFERS.find((o) => o.key === m![1]);
    return { label: "You raised a hand to", value: offer?.label ?? m[1] };
  }
  return null;
}

/** What someone wrote on a project card they added (Week 2's circle): its stage, where it is, readiness, one move. */
export function describeCard(card: { phase?: string | null; whereNow?: string | null; ready?: readonly string[] | string | null; nextMove?: string | null }): Entry[] {
  const out: Entry[] = [];
  const phase = PROJECT_PHASES.find((p) => p.key === card.phase);
  if (phase) out.push({ label: "Where your project is", value: phase.title });
  if (card.whereNow) out.push({ label: "Where you are now", value: card.whereNow });
  const ready = (typeof card.ready === "string" ? card.ready.split(",") : card.ready ?? [])
    .map((k) => CROWDPOOL_READINESS.find((r) => r.key === k.trim())?.title)
    .filter((t): t is string => !!t);
  if (ready.length) out.push({ label: "Ready to crowdpool, in place", value: ready.join(", ") });
  if (card.nextMove) out.push({ label: "Your one move", value: card.nextMove });
  return out;
}

/**
 * The stage a row belongs to, for ordering a week's entries by the run of
 * show and naming the stage: an answer by where its prompt is defined, a
 * question by its block, Week 2's kinds by the stage of their kind.
 */
export function entryStage(week: number, item: EntryItem): number | null {
  const stages = boardStages(week);
  const kindStage = (kind: string) => {
    const i = stages.findIndex((s) => s.kind === kind);
    return i >= 0 ? i : null;
  };
  switch (item.kind) {
    case "answer": return promptHomes(week).get(item.block ?? "") ?? null;
    case "ask": {
      const i = parseAskBlock(item.block);
      return i != null && i < stages.length ? i : null;
    }
    case "arrive": return kindStage("breath");
    case "leave": return kindStage("close");
    case "pain":
    case "opp": return kindStage("circle") ?? kindStage("harvest");
    case "game": return kindStage("game");
    default: return null;
  }
}

/** "Week 3: Game & Organisation Co-Creation Part 1", and the board's address. */
export function weekHeading(week: number): { title: string; href: string } {
  const ep = episodeByWeek(week);
  return { title: ep ? `Week ${week}: ${ep.title}` : `Week ${week}`, href: sessionBoardHref(week) };
}

/* --------------------------------------------------------- the profile */

/** The profile's "Weekly sessions" section under Submissions. */
export const SUBMISSIONS_COPY = {
  title: "Weekly sessions",
  lede: "Every answer you give on a weekly session board, week by week. We read everyone's answers to shape how we build Village OS.",
  empty: "Nothing here yet. Answers you give on a weekly session board show up here, week by week.",
  emptyLink: "Open the Week {week} board",
  open: "Open the board",
  added: "You added",
  checkedIn: "You checked in with",
  forRoom: "For the room",
  anonymous: "Counted on the board with no name.",
  claimed: "Your answers from this browser are now on your profile.",
  /** Asked before anything moves, so a shared tablet never hands one guest's answers to the next person who signs in. */
  claimAsk: "We found {n} answers given as a guest in this browser. Add them to your profile? Say yes only if they're yours.",
  claimAskOne: "We found 1 answer given as a guest in this browser. Add it to your profile? Say yes only if it's yours.",
  claimYes: "Add them",
  claimNo: "Not mine",
} as const;

/* ---------------------------------------------------------- the export */

/** The one line the export screen shows (Rye, 2026-10-13). */
export const EXPORT_WHY = "We read these answers to shape how we build Village OS.";

/** The admin export panel's words. */
export const EXPORT_COPY = {
  title: "Weekly session answers",
  why: EXPORT_WHY,
  json: "Download all answers (JSON)",
  csv: "Download all answers (CSV)",
  working: "Gathering every week's answers...",
  failed: "The export didn't load. Try again in a minute.",
} as const;

/** Where an admin reviews an application (the admin page's applications tab). */
export function adminApplicationPath(applicationId: number): string {
  return `/admin?tab=applications&open=${applicationId}`;
}

export type BoardExportProject = {
  cardId: number;
  name: string;
  place: string | null;
  applicationId: number | null;
  applicationName: string | null;
  /** The linked application's status (submitted, under_review, approved, ...), or null. */
  applicationStatus: string | null;
  /** /project/{id}-{slug} when the application's page is public, else null. */
  projectPath: string | null;
  /** adminApplicationPath(applicationId) for any linked application, so an admin can open it whatever its status. */
  adminPath: string | null;
  hidden: boolean;
  /** Who added the card, never their key. */
  addedBy: "signed-in" | "guest" | null;
  /** People who checked in with it. */
  checkins: number;
};

export type BoardExportRow = {
  id: number;
  kind: string;
  /** The prompt key (answers), the canvas block (game), or s<stage> (questions). */
  key: string | null;
  stage: string | null;
  label: string;
  value: string;
  projectId: number | null;
  projectName: string | null;
  applicationId: number | null;
  displayName: string | null;
  author: "signed-in" | "guest" | null;
  /** Only for signed-in authors. A guest's key never leaves the server. */
  userId: number | null;
  /** The facilitator's "Answered" (questions) or "Chosen" (opportunities). */
  chosen: boolean;
  hidden: boolean;
  createdAt: string;
};

/**
 * An anonymous answer: no name, no project, no author, and only the day it
 * came in (YYYY-MM-DD), sorted by key and answer, so nobody can match it to a
 * named row by its time.
 */
export type BoardExportAnon = { key: string; label: string; value: string; createdAt: string };

export type BoardExportWeek = {
  week: number;
  title: string;
  href: string;
  /** "none" when the week's board has never been written to. */
  status: "open" | "closed" | "none";
  projects: BoardExportProject[];
  rows: BoardExportRow[];
  anonymous: BoardExportAnon[];
  /** Votes, hands and offers, counted. */
  votes: { target: string; label: string; value: string; count: number }[];
  /** The week's human needs answers in one place, for weeks that ask them. */
  summary: NeedsSummary | null;
  /**
   * Each project's card, for weeks that ask the human needs questions. From
   * Week 4 on, a card includes what it carried from earlier weeks
   * (`carriedFrom`, `match`), and `villageOsCard` is the whole "Copy for
   * Village OS" card.
   */
  projectViews: {
    cardId: number | null;
    name: string;
    lines: string[];
    villageOs: VillageOsScope;
    villageOsCard?: VillageOsCard;
    match?: CarryMatch;
    carriedFrom?: CardRef[];
  }[];
};

export type BoardExport = { generatedAt: string; why: string; weeks: BoardExportWeek[] };

const CSV_COLUMNS = [
  "week", "project", "application_id", "kind", "key", "stage", "question", "answer",
  "author", "user_id", "display_name", "chosen", "hidden", "created_at",
] as const;

/**
 * One cell, safe for a spreadsheet: quoted when it holds a comma, a quote or
 * a line break, and a leading = + - @ (or a tab or return) gets a ' in front
 * so no spreadsheet runs a typed answer as a formula.
 */
export function csvCell(v: unknown): string {
  let s = v == null ? "" : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** The whole export as one CSV: every row, every anonymous answer, every vote count. */
export function boardExportCsv(data: BoardExport): string {
  const lines: string[] = [CSV_COLUMNS.join(",")];
  const push = (cells: unknown[]) => lines.push(cells.map(csvCell).join(","));
  for (const w of data.weeks) {
    for (const r of w.rows) {
      push([w.week, r.projectName ?? "", r.applicationId ?? "", r.kind, r.key ?? "", r.stage ?? "", r.label, r.value,
        r.author ?? "", r.userId ?? "", r.displayName ?? "", r.chosen ? "yes" : "", r.hidden ? "yes" : "", r.createdAt]);
    }
    for (const a of w.anonymous) {
      push([w.week, "", "", "answer", a.key, "", a.label, a.value, "anonymous", "", "", "", "", a.createdAt]);
    }
    for (const v of w.votes) {
      push([w.week, "", "", "votes", v.target, "", v.label, `${v.value} (${v.count})`, "", "", "", "", "", ""]);
    }
  }
  return lines.join("\r\n") + "\r\n";
}
