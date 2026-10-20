/**
 * One land project's Village profile: everything it has said, on every page
 * and every weekly board, gathered into the decisions its Village OS 1.0
 * launches with (Rye, 2026-10-20; ADR-77).
 *
 * WHERE EACH ANSWER COMES FROM, and none of them is copied:
 *   - the application (name, place, vision, the map pin);
 *   - the hosting request, when the project made one (village name, tagline,
 *     what members and credits are called, the address it wants);
 *   - every weekly board, merged across weeks with Week 4's rule
 *     (shared/boardCarry.ts mergeProjectWeeks: for each question the latest
 *     week wins, the human needs move as one group) and turned into the
 *     project's card (shared/villageOsCard.ts);
 *   - the tools it uses (the application's tools picker);
 *   - what its stewards confirmed or typed on the profile page, stored by
 *     decision key (village_profile_answers).
 *
 * STEWARDS CONFIRM (Rye's call 2, 2026-10-20). Anyone can tap any project on
 * a board, so a board answer is a suggestion until one of the project's
 * stewards confirms it or types their own. Only confirmed and typed answers
 * go into the 1.0 file (shared/villageFile.ts). A confirmed board block keeps
 * the snapshot the steward saw; when the boards move on, the page says so.
 *
 * Pure: the server reads the sources (server/lib/villageProfile.ts) and the
 * page and the file read what this returns.
 */
import {
  BREADTH_STOPS,
  needShort,
  projectView,
  rungLabel,
  WHOLE_STOPS,
  type AnswerRow,
  type ProjectView,
} from "./humanNeeds";
import { mergeProjectWeeks } from "./boardCarry";
import { DECIDES_BY, HELD_BY, needKeyLabel } from "./boardCards";
import { cardsForProject, gameLines, toVillageOsCard, type VillageOsCard } from "./villageOsCard";
import {
  VILLAGE_DECISIONS,
  VILLAGE_OS_MODULES,
  type VillageDecision,
} from "./villageDecisions";

/** The application's fields the profile reads. */
export type ProfileApplication = {
  id: number;
  projectName: string;
  location: string | null;
  country: string | null;
  vision: string | null;
  latitude: number | null;
  intendedPeopleCount: number | null;
  status: string;
};

/** The hosting request's fields the profile reads, when there is one. */
export type ProfileRequest = {
  villageName: string | null;
  tagline: string | null;
  memberWord: string | null;
  currencyName: string | null;
  timeZone: string | null;
  preferredAddress: string | null;
};

/** One week's board, as far as this project is on it. */
export type ProfileWeek = {
  week: number;
  /** The project's cards on that week's board. */
  cards: { id: number; name: string }[];
  /** Answer rows on those cards (kind "answer"). */
  rows: AnswerRow[];
  /** Week 2's pain points and growth opportunities on those cards. */
  pains: string[];
  opps: string[];
  /** Week 2's card fields, when the card has them. */
  phase: string | null;
  whereNow: string | null;
  nextMove: string | null;
};

/** A steward's answer, as stored. `confirmed` keeps a suggestion as it was; `answered` is typed. */
export type StoredAnswer = { value: unknown; how: "confirmed" | "answered"; updatedAt: string; updatedBy: number | null };

export type ProfileSources = {
  application: ProfileApplication;
  request: ProfileRequest | null;
  tools: string[];
  weeks: ProfileWeek[];
  stored: Readonly<Record<string, StoredAnswer>>;
  site?: string;
};

export type DecisionStatus = "yours" | "suggested" | "default" | "open";

export type DecisionState = {
  key: string;
  status: DecisionStatus;
  /** What goes into the 1.0 file: the stewards' own answer, else null. */
  value: unknown;
  /** What the pages and boards suggest, else null. */
  suggestion: unknown;
  /** Where the suggestion comes from, in plain words. */
  from: string | null;
  stored: StoredAnswer | null;
  /** A confirmed board block whose boards have moved on since. */
  changed: boolean;
  /** The answer, or the suggestion, in plain lines. */
  lines: string[];
};

export type VillageProfile = {
  applicationId: number;
  name: string;
  /** Weeks whose boards hold answers for this project. */
  weeks: number[];
  /** The project's card from every week's answers, before anyone confirms anything. */
  card: VillageOsCard;
  /** The card in plain lines. */
  game: string[];
  decisions: DecisionState[];
  launch: { total: number; ready: number; open: string[] };
  /** Where the project started, from Week 2. */
  start: { phase: string | null; whereNow: string | null; nextMove: string | null; pains: string[]; opps: string[] } | null;
};

/* ------------------------------------------------------------ sources */

const PROFILE_CARD_ID = -1;

const clean = (v: string | null | undefined): string | null => {
  const t = (v ?? "").trim();
  return t ? t : null;
};

function weeksWord(weeks: readonly number[]): string {
  const w = [...new Set(weeks)].sort((a, b) => a - b);
  if (!w.length) return "the weekly boards";
  if (w.length === 1) return `Week ${w[0]}`;
  return `Weeks ${w.slice(0, -1).join(", ")} and ${w[w.length - 1]}`;
}

/** The project's answers from every week, merged so the latest week wins each question. */
export function mergedRows(weeks: readonly ProfileWeek[]): AnswerRow[] {
  const withRows = weeks.filter((w) => w.rows.length);
  return mergeProjectWeeks(withRows.map((w) => ({ week: w.week, rows: w.rows })), PROFILE_CARD_ID) as AnswerRow[];
}

/* -------------------------------------------------------- suggestions */

/** The modules a project's answers point to; the stewards decide. */
export function suggestedModules(view: ProjectView, card: VillageOsCard): string[] {
  const out = new Set<string>(["map", "governance", "feed"]);
  const festive =
    card.circles.some((c) => c.circle === "festivals") ||
    !!view.rite.latest ||
    !!view.play.latest ||
    Object.values(view.perNeed).some((p) => p?.meet.value === "play");
  if (festive) out.add("events");
  if (card.seats.length) out.add("sessions");
  return VILLAGE_OS_MODULES.map((m) => m.key).filter((k) => out.has(k));
}

/**
 * A first draft of the governing purpose, in Village OS's five parts, from
 * the project's own answers. A part with nothing behind it stays a blank to
 * fill. Week 5 hands it to the project to make its own.
 */
export function purposeDraft(src: ProfileSources, view: ProjectView, card: VillageOsCard): string | null {
  const name = clean(src.request?.villageName) ?? clean(src.application.projectName) ?? "Our village";
  const place = clean(src.application.location);
  const people = src.application.intendedPeopleCount && src.application.intendedPeopleCount > 0
    ? `the ${src.application.intendedPeopleCount} people it means to hold, and its land`
    : "its people and its land";
  const pain = src.weeks.flatMap((w) => w.pains).at(-1) ?? null;
  const seeds = view.seeds
    .map((id) => {
      const p = view.perNeed[id];
      if (!p?.today.value || !p.goal.value) return null;
      return `${needShort(id)} is ${rungLabel(p.today.value).toLowerCase()} today, and we want it ${rungLabel(p.goal.value).toLowerCase()} in three years`;
    })
    .filter((s): s is string => !!s);
  const circles = card.circles.map((c) => c.label).filter((l, i, all) => l && all.indexOf(l) === i);
  const seats = card.seats.map((s) => s.name).filter(Boolean);
  const first = clean(card.firstLine);

  let filled = 0;
  const part = (label: string, text: string | null) => {
    if (text) filled += 1;
    return `${label}: ${text ?? "___"}`;
  };
  const lines = [
    part("Who it serves", `${name} serves ${people}${place ? `, in ${place}` : ""}.`),
    part("What they're up against", pain ? `${pain.replace(/[.!?]?$/, ".")}` : null),
    part("From where to where", seeds.length ? `${seeds.join("; ")}.` : null),
    part("By what means", circles.length ? `${circles.join(", ")}${seats.length ? `, with seats like ${seats.slice(0, 4).join(", ")}` : ""}.` : null),
    part("What becomes true", first ? `All this is for ${first.replace(/[.!?]?$/, ".")}` : null),
  ];
  // The first part always fills, so a draft needs one more from the project's own answers.
  return filled >= 2 ? lines.join("\n\n") : null;
}

type Suggestion = { value: unknown; from: string } | null;

function suggestionFor(d: VillageDecision, src: ProfileSources, view: ProjectView, card: VillageOsCard, weeks: number[]): Suggestion {
  const app = src.application;
  const req = src.request;
  const boards = `From ${weeksWord(weeks)}`;
  const fromReq = (v: string | null | undefined): Suggestion => (clean(v) ? { value: clean(v), from: "From your hosting request" } : null);
  switch (d.key) {
    case "identity.name":
      return fromReq(req?.villageName) ?? (clean(app.projectName) ? { value: clean(app.projectName), from: "From your application" } : null);
    case "identity.tagline":
      return fromReq(req?.tagline) ?? (card.firstLine ? { value: `All this is for ${card.firstLine}`.slice(0, d.max ?? 160), from: "From your first line, Week 3" } : null);
    case "identity.location": {
      const where = [clean(app.location), clean(app.country)].filter(Boolean).join(", ");
      return where ? { value: where, from: "From your application" } : null;
    }
    case "identity.memberWord":
      return fromReq(req?.memberWord);
    case "identity.timezone":
      return fromReq(req?.timeZone);
    case "identity.hemisphere":
      return app.latitude != null && Number.isFinite(app.latitude)
        ? { value: app.latitude < 0 ? "south" : "north", from: "From your application's map pin" }
        : null;
    case "purpose.statement": {
      const draft = purposeDraft(src, view, card);
      return draft ? { value: draft, from: "A first draft from your own answers" } : null;
    }
    case "needs.scope":
      return card.needs.length ? { value: { needs: card.needs, variables: card.variables, customNeeds: card.customNeeds }, from: boards } : null;
    case "circles.list":
      return card.circles.length ? { value: { circles: card.circles, needLinks: card.needLinks }, from: boards } : null;
    case "seats.cards":
      return card.seats.length ? { value: { seats: card.seats }, from: boards } : null;
    case "decide.together": {
      const d2 = card.decisions;
      return d2.together.length || d2.how || d2.agreement ? { value: { decisions: d2 }, from: boards } : null;
    }
    case "membership.entry":
      return card.entry ? { value: card.entry, from: boards } : null;
    case "membership.rite":
      return clean(view.rite.latest) ? { value: clean(view.rite.latest), from: boards } : null;
    case "quests.first":
      return card.quests.length ? { value: { quests: card.quests }, from: boards } : null;
    case "quests.tokenName":
      return fromReq(req?.currencyName);
    case "modules.on":
      return { value: suggestedModules(view, card), from: "From your answers so far" };
    case "network.tools":
      return src.tools.length ? { value: { tools: [...src.tools] }, from: "From your application's tools" } : null;
    case "launch.address":
      return fromReq(req?.preferredAddress);
    default:
      return null;
  }
}

/* -------------------------------------------------------------- lines */

const optionLabel = (list: readonly { key: string; label: string }[] | undefined, key: unknown) =>
  list?.find((o) => o.key === key)?.label ?? String(key);

type BlockNeeds = { needs: VillageOsCard["needs"]; variables: VillageOsCard["variables"]; customNeeds: VillageOsCard["customNeeds"] };
type BlockCircles = { circles: VillageOsCard["circles"]; needLinks: VillageOsCard["needLinks"] };

/** A decision's value in plain lines, for the page. */
export function decisionLines(d: VillageDecision, value: unknown): string[] {
  if (value == null) return [];
  switch (d.kind) {
    case "text":
    case "longtext":
      return String(value).split(/\n{2,}/).map((s) => s.trim()).filter(Boolean);
    case "number":
      return [String(value)];
    case "cap":
      return [value === "none" ? "No cap" : `${Number(value).toLocaleString("en-US")} tokens a cycle`];
    case "choice":
      return [optionLabel(d.options, value)];
    case "multi":
      return Array.isArray(value) && value.length ? [value.map((k) => optionLabel(d.options, k)).join(", ")] : ["None"];
    case "block":
      return blockLines(d.key, value);
  }
}

function blockLines(key: string, value: unknown): string[] {
  const v = value as Record<string, unknown>;
  switch (key) {
    case "needs.scope": {
      const b = v as BlockNeeds;
      const lines = b.needs.map((n) => {
        const label = n.label ?? needKeyLabel(n.needKey);
        const breadth = BREADTH_STOPS.find((s) => Number(s.key) === n.breadthTargetPct)?.phrase ?? `for ${n.breadthTargetPct}%`;
        return `${label}: ${rungLabel(n.depthTarget)}, ${breadth}.`;
      });
      const whole = b.variables["needs.totality_target_pct"];
      const stop = WHOLE_STOPS.find((s) => Number(s.key) === whole);
      if (whole != null) lines.push(`Means to meet ${stop?.phrase ?? `${whole}%`} of its people's human needs.`);
      if (b.customNeeds.length) lines.push(`Named, not added yet: ${b.customNeeds.map((c) => c.label).join(", ")}.`);
      return lines;
    }
    case "circles.list": {
      const b = v as BlockCircles;
      return b.circles.map((c) => {
        const meets = c.needs.length ? ` Meets ${c.needs.map((n) => needKeyLabel(n)).join(", ")}.` : "";
        const by = c.decidesBy
          ? ` Decides ${c.decidesBy === "other" && c.decidesByGloss ? c.decidesByGloss : (DECIDES_BY.find((x) => x.key === c.decidesBy)?.label ?? c.decidesBy).toLowerCase()}.`
          : c.decidesByAnswers.length > 1 ? " How it decides: still to settle." : "";
        const on = c.decidesOn.length ? ` Decides on ${c.decidesOn.join("; ")}.` : "";
        return `${c.label}${c.startsWith ? " (you start with it)" : ""}.${meets}${on}${by}`;
      });
    }
    case "seats.cards": {
      const seats = (v as { seats: VillageOsCard["seats"] }).seats;
      return seats.map((s) => {
        const held = s.heldBy === "open" ? "Open, an invitation" : `${HELD_BY.find((h) => h.key === s.heldBy)?.short ?? "Held by"} ${s.who}`.trim();
        const time = s.contribution.text ? ` ${s.contribution.text}.` : "";
        return `${s.name}, ${s.circleLabel}: ${s.aim}. ${s.why}. ${held}.${time}`.replace(/\.\./g, ".");
      });
    }
    case "decide.together": {
      const d = (v as { decisions: VillageOsCard["decisions"] }).decisions;
      const lines: string[] = [];
      if (d.together.length) lines.push(`Decided together: ${d.together.join(", ").toLowerCase()}.`);
      if (d.how) lines.push(`How: ${d.how}.`);
      if (d.agreement) lines.push(`First agreement: ${d.agreement}`);
      return lines;
    }
    case "quests.first": {
      const qs = (v as { quests: VillageOsCard["quests"] }).quests;
      return qs.map((q) => (q.need ? `${q.quest} (grows ${needKeyLabel(q.need)})` : q.quest));
    }
    case "network.tools":
      return [((v as { tools: string[] }).tools ?? []).join(", ")];
    default:
      return [];
  }
}

/* ------------------------------------------------------------- the profile */

const same = (a: unknown, b: unknown) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

/** One project's profile, from all its sources. */
export function buildProfile(src: ProfileSources): VillageProfile {
  const weeks = [...new Set(src.weeks.filter((w) => w.rows.length).map((w) => w.week))].sort((a, b) => a - b);
  const rows = mergedRows(src.weeks);
  const view = projectView(rows, PROFILE_CARD_ID);
  const cards = cardsForProject(rows, PROFILE_CARD_ID);
  const name = clean(src.request?.villageName) ?? src.application.projectName;
  const card = toVillageOsCard({ project: src.application.projectName, applicationId: src.application.id, weeks, view, cards, site: src.site });

  const decisions: DecisionState[] = VILLAGE_DECISIONS.map((d) => {
    const s = suggestionFor(d, src, view, card, weeks);
    const stored = src.stored[d.key] ?? null;
    const suggestion = s?.value ?? null;
    if (stored) {
      return {
        key: d.key,
        status: "yours",
        value: stored.value,
        suggestion,
        from: s?.from ?? null,
        stored,
        changed: d.kind === "block" && stored.how === "confirmed" && suggestion != null && !same(stored.value, suggestion),
        lines: decisionLines(d, stored.value),
      };
    }
    const status: DecisionStatus = suggestion != null ? "suggested" : d.default != null ? "default" : "open";
    return {
      key: d.key,
      status,
      value: null,
      suggestion,
      from: s?.from ?? null,
      stored: null,
      changed: false,
      lines: suggestion != null ? decisionLines(d, suggestion) : d.default != null ? [d.default] : [],
    };
  });

  const blocking = VILLAGE_DECISIONS.filter((d) => d.blocksLaunch);
  const stateOf = new Map(decisions.map((x) => [x.key, x]));
  const ready = blocking.filter((d) => {
    const st = stateOf.get(d.key)?.status;
    return st === "yours" || st === "default";
  });

  const w2 = src.weeks.find((w) => w.week === 2);
  const start = w2 && (w2.phase || w2.whereNow || w2.nextMove || w2.pains.length || w2.opps.length)
    ? { phase: w2.phase, whereNow: w2.whereNow, nextMove: w2.nextMove, pains: w2.pains, opps: w2.opps }
    : null;

  return {
    applicationId: src.application.id,
    name,
    weeks,
    card,
    game: gameLines(view, cards),
    decisions,
    launch: { total: blocking.length, ready: ready.length, open: blocking.filter((d) => !ready.includes(d)).map((d) => d.key) },
    start,
  };
}

/* ------------------------------------------------- checking a steward's answer */

export type CheckedAnswer = { ok: true; value: unknown } | { ok: false; message: string };

export const PROFILE_REFUSALS = {
  unknown: "That isn't one of your village's decisions.",
  block: "This part comes from the weekly boards. Change it on the board, then confirm it here.",
  empty: "Write something first, or take it back.",
  tooLong: "That's longer than this one keeps. Make it shorter.",
  number: "Give a whole number.",
  range: "That number is outside what Village OS takes.",
  option: "Pick one of the choices.",
  nothingToConfirm: "There's nothing here to confirm yet.",
} as const;

/** A typed answer, checked and cleaned for its decision. Blocks are confirmed, never typed. */
export function checkAnswer(d: VillageDecision, raw: unknown): CheckedAnswer {
  switch (d.kind) {
    case "block":
      return { ok: false, message: PROFILE_REFUSALS.block };
    case "text":
    case "longtext": {
      if (typeof raw !== "string") return { ok: false, message: PROFILE_REFUSALS.empty };
      const text = d.kind === "text" ? raw.replace(/\s+/g, " ").trim() : raw.replace(/\r\n?/g, "\n").replace(/[^\S\n]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
      if (!text) return { ok: false, message: PROFILE_REFUSALS.empty };
      if (text.length > (d.max ?? 300)) return { ok: false, message: PROFILE_REFUSALS.tooLong };
      return { ok: true, value: text };
    }
    case "number":
    case "cap": {
      if (d.kind === "cap" && raw === "none") return { ok: true, value: "none" };
      const n = typeof raw === "number" ? raw : typeof raw === "string" && /^\d+$/.test(raw.trim()) ? Number(raw.trim()) : NaN;
      if (!Number.isInteger(n)) return { ok: false, message: PROFILE_REFUSALS.number };
      const [lo, hi] = d.range ?? [0, Number.MAX_SAFE_INTEGER];
      if (n < lo || n > hi) return { ok: false, message: PROFILE_REFUSALS.range };
      return { ok: true, value: n };
    }
    case "choice":
      return typeof raw === "string" && d.options?.some((o) => o.key === raw) ? { ok: true, value: raw } : { ok: false, message: PROFILE_REFUSALS.option };
    case "multi": {
      if (!Array.isArray(raw) || raw.some((k) => typeof k !== "string" || !d.options?.some((o) => o.key === k))) {
        return { ok: false, message: PROFILE_REFUSALS.option };
      }
      return { ok: true, value: d.options!.map((o) => o.key).filter((k) => (raw as string[]).includes(k)) };
    }
  }
}

/** The words a status chip says. */
export const STATUS_COPY: Record<DecisionStatus, string> = {
  yours: "Yours",
  suggested: "Suggested",
  default: "Village OS default",
  open: "Open",
};

