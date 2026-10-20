/**
 * One land project's Village profile: everything it has said, on every page
 * and every weekly board, gathered into the decisions its Village OS 1.0
 * launches with (Rye, 2026-10-20; ADR-77).
 *
 * WHERE EACH ANSWER COMES FROM, and none of them is copied:
 *   - the application (name, place, vision, the map pin);
 *   - the hosting request, when the project made one (village name, tagline,
 *     what members are called, the address it wants);
 *   - every weekly board, merged across weeks with Week 4's rule
 *     (shared/boardCarry.ts mergeProjectWeeks: for each question the latest
 *     week wins, the human needs move as one group) and turned into the
 *     project's card (shared/villageOsCard.ts);
 *   - the tools it uses (the application's tools picker);
 *   - what its stewards kept or wrote on the profile page, stored by
 *     decision key (village_profile_answers).
 *
 * STEWARDS CONFIRM (Rye's call 2, 2026-10-20). Anyone can tap any project on
 * a board, so a board answer is a suggestion until one of the project's
 * stewards keeps it or writes their own. Only those go into the 1.0 file
 * (shared/villageFile.ts). Keeping stores the suggestion exactly as the
 * steward saw it: the page sends the suggestion's stamp, and the server
 * refuses when the boards changed in between. When the boards move on after
 * that, the page says so and shows the new version beside the kept one.
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
import { DECIDES_BY, needKeyLabel } from "./boardCards";
import { stripHiddenText } from "./hiddenText";
import { cardsForProject, gameLines, toVillageOsCard, type VillageOsCard } from "./villageOsCard";
import {
  CAP_KEEP_DEFAULT,
  MODULE_NEEDS,
  PURPOSE_MIN_WORDS,
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
  /** Week 2's pain points and growth opportunities on those cards, oldest first. */
  pains: string[];
  opps: string[];
  /** Week 2's card fields, when the card has them. */
  phase: string | null;
  whereNow: string | null;
  nextMove: string | null;
};

/** A steward's answer, as stored. `confirmed` keeps a suggestion as it was; `answered` is written. */
export type StoredAnswer = { value: unknown; how: "confirmed" | "answered"; updatedAt: string };

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
  /** The suggestion's stamp, which "Keep this" sends back so it keeps what was seen. */
  stamp: string | null;
  /** The suggestion passes this decision's checks, so it can be kept as it stands. */
  keepable: boolean;
  /** Where the suggestion comes from, in plain words. */
  from: string | null;
  stored: StoredAnswer | null;
  /** A kept suggestion whose source has moved on since (or gone). */
  changed: boolean;
  /** The answer, or the suggestion, or the default, in plain lines. */
  lines: string[];
  /** The current suggestion in plain lines, for showing beside a kept answer that changed. */
  suggestionLines: string[];
};

export type VillageProfile = {
  applicationId: number;
  name: string;
  /** Weeks whose boards hold answers for this project. */
  weeks: number[];
  /** The project's card from every week's answers, before anyone keeps anything. */
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

/** "Week 3", "Weeks 3 and 4", "Weeks 2, 3 and 4". */
export function weeksWord(weeks: readonly number[]): string {
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

/** A short, stable stamp of a value (FNV-1a over its JSON), so "Keep this" keeps what was seen. */
export function stampOf(value: unknown): string {
  const s = JSON.stringify(value ?? null);
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return `${s.length.toString(36)}-${h.toString(36)}`;
}

/** Cut a line at the last whole word that fits. */
function fitWords(text: string, max: number): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max + 1);
  const at = cut.lastIndexOf(" ");
  return (at > max * 0.6 ? cut.slice(0, at) : text.slice(0, max)).replace(/[\s,;:]+$/, "");
}

const sentence = (s: string) => {
  const t = s.trim();
  return /[.!?]$/.test(t) ? t : `${t}.`;
};
const capital = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
const lowerFirst = (s: string) => (s ? s.charAt(0).toLowerCase() + s.slice(1) : s);

/* -------------------------------------------------------- suggestions */

/** The modules a project's answers point to; the stewards decide. */
export function suggestedModules(view: ProjectView, card: VillageOsCard): string[] {
  // The feed runs on the forum (MODULE_NEEDS), so the two come together.
  const out = new Set<string>(["map", "governance", "forum", "feed"]);
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
 * fill ("___"), and a draft with blanks can't be kept as it stands. Week 5
 * hands it to the project to make its own.
 */
export function purposeDraft(src: ProfileSources, view: ProjectView, card: VillageOsCard): string | null {
  const name = clean(src.request?.villageName) ?? clean(src.application.projectName) ?? "Our village";
  const place = clean(src.application.location);
  const n = src.application.intendedPeopleCount;
  const people = n && n > 0 ? `the ${n} ${n === 1 ? "person" : "people"} it means to hold, and its land` : "its people and its land";
  // The latest pain point the project named, from the latest week that has one.
  const pain = [...src.weeks].sort((a, b) => b.week - a.week).map((w) => w.pains.at(-1)).find((p) => clean(p)) ?? null;
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
    part("What they're up against", pain ? sentence(capital(pain.trim())) : null),
    part("From where to where", seeds.length ? `${capital(seeds.join("; "))}.` : null),
    part("By what means", circles.length ? `${circles.join(", ")}${seats.length ? `, with seats like ${seats.slice(0, 4).join(", ")}` : ""}.` : null),
    part("What becomes true", first ? sentence(`All this is for ${first}`) : null),
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
      return fromReq(req?.tagline) ?? (card.firstLine ? { value: fitWords(sentence(`All this is for ${card.firstLine}`), d.max ?? 160), from: "From your first line, on the weekly boards" } : null);
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
    case "needs.scope": {
      if (!card.needs.length) return null;
      // Human needs the project picked but set no goal for: Village OS's defaults stand in, and the page says so.
      const unset = card.needs.filter((n) => !n.needKey.startsWith("custom:") && !view.perNeed[n.needKey as keyof ProjectView["perNeed"]]?.goal.value).map((n) => n.needKey);
      return { value: { needs: card.needs, variables: card.variables, customNeeds: card.customNeeds, unset }, from: boards };
    }
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

type BlockNeeds = { needs: VillageOsCard["needs"]; variables: VillageOsCard["variables"]; customNeeds: VillageOsCard["customNeeds"]; unset?: string[] };
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
      return [value === CAP_KEEP_DEFAULT ? "Keep Village OS's 10,000 for now" : `${Number(value).toLocaleString("en-US")} tokens a lunar cycle`];
    case "choice":
      return [optionLabel(d.options, value)];
    case "multi":
      return Array.isArray(value) && value.length ? [value.map((k) => optionLabel(d.options, k)).join(", ")] : ["None"];
    case "block":
      return blockLines(d.key, value);
  }
}

function blockLines(key: string, value: unknown): string[] {
  switch (key) {
    case "needs.scope": {
      const b = value as BlockNeeds;
      const unset = new Set(b.unset ?? []);
      const lines = b.needs.map((n) => {
        const label = n.label ?? needKeyLabel(n.needKey);
        if (unset.has(n.needKey)) return `${label}: no goal set yet, so Village OS starts it at Satisfied, for everyone.`;
        const breadth = BREADTH_STOPS.find((s) => Number(s.key) === n.breadthTargetPct)?.phrase ?? `for ${n.breadthTargetPct}%`;
        return `${label}: ${rungLabel(n.depthTarget)}, ${breadth}.`;
      });
      const whole = b.variables["needs.totality_target_pct"];
      const stop = WHOLE_STOPS.find((s) => Number(s.key) === whole);
      if (whole != null) lines.push(`Means to meet ${stop?.phrase ?? `${whole}%`} of its people's human needs.`);
      if (b.customNeeds.length) lines.push(`Your own human needs, still to add: ${b.customNeeds.map((c) => c.label).join(", ")}.`);
      return lines;
    }
    case "circles.list": {
      const b = value as BlockCircles;
      return b.circles.map((c) => {
        const parts = [`${c.label}${c.startsWith ? ", one you start with" : ""}.`];
        if (c.needs.length) parts.push(`Meets ${c.needs.map((n) => needKeyLabel(n)).join(", ")}.`);
        if (c.decidesOn.length) parts.push(sentence(`Decides on ${c.decidesOn.map(lowerFirst).join("; ")}`));
        if (c.decidesBy) {
          const how = c.decidesBy === "other" && c.decidesByGloss ? c.decidesByGloss : DECIDES_BY.find((x) => x.key === c.decidesBy)?.label ?? c.decidesBy;
          parts.push(`How it decides: ${sentence(how)}`);
        } else if (c.decidesByAnswers.length > 1) {
          parts.push("How it decides: still to settle, your people named more than one way.");
        }
        return parts.join(" ");
      });
    }
    case "seats.cards": {
      const seats = (value as { seats: VillageOsCard["seats"] }).seats;
      return seats.map((s) => {
        const held =
          s.heldBy === "open" ? "Open, an invitation."
          : s.heldBy === "being" ? `Held by a being${s.who ? `: ${s.who}` : ""}, with someone speaking for it.`
          : s.who ? `Held by ${s.who}.` : "Held by someone on the team.";
        const parts = [`${s.name}, in ${s.circleLabel}: ${sentence(s.aim)}`];
        if (s.accountabilities) parts.push(`Answers for ${sentence(lowerFirst(s.accountabilities))}`);
        parts.push(sentence(s.why), held);
        if (s.contribution.text) parts.push(sentence(capital(s.contribution.text)));
        return parts.join(" ");
      });
    }
    case "decide.together": {
      const d = (value as { decisions: VillageOsCard["decisions"] }).decisions;
      const lines: string[] = [];
      if (d.together.length) lines.push(`Decided together: ${d.together.join("; ")}.`);
      if (d.how) lines.push(`How: ${sentence(d.how)}`);
      if (d.agreement) lines.push(`First agreement: ${sentence(d.agreement)}`);
      return lines;
    }
    case "quests.first": {
      const qs = (value as { quests: VillageOsCard["quests"] }).quests;
      return qs.map((q) => (q.need ? `${q.quest}, which grows ${needKeyLabel(q.need)}.` : sentence(q.quest)));
    }
    case "network.tools":
      return [((value as { tools: string[] }).tools ?? []).join(", ")];
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
    const shared = {
      key: d.key,
      suggestion,
      stamp: suggestion != null ? stampOf(suggestion) : null,
      keepable: suggestion != null && (d.kind === "block" || checkAnswer(d, suggestion).ok),
      from: s?.from ?? null,
      suggestionLines: suggestion != null ? decisionLines(d, suggestion) : [],
    };
    if (stored) {
      return {
        ...shared,
        status: "yours" as const,
        value: stored.value,
        stored,
        // A kept suggestion whose source has moved on, or gone. A written answer never "changes".
        changed: stored.how === "confirmed" && !same(stored.value, suggestion),
        lines: decisionLines(d, stored.value),
      };
    }
    const status: DecisionStatus = suggestion != null ? "suggested" : d.default != null ? "default" : "open";
    return {
      ...shared,
      status,
      value: null,
      stored: null,
      changed: false,
      lines: suggestion != null ? shared.suggestionLines : d.default != null ? [d.default] : [],
    };
  });

  const blocking = VILLAGE_DECISIONS.filter((d) => d.blocksLaunch);
  const stateOf = new Map(decisions.map((x) => [x.key, x]));
  const ready = blocking.filter((d) => {
    const st = stateOf.get(d.key);
    if (!st) return false;
    if (st.status === "default") return true;
    // An answer saved before a check tightened still has to pass it to count.
    return st.status === "yours" && (d.kind === "block" || checkAnswer(d, st.value).ok);
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
  block: "This part comes from the weekly boards. Change it on the board, then keep it here.",
  empty: "Write something first, or take it back.",
  tooLong: "That's longer than this one keeps. Make it shorter.",
  number: "Give a whole number.",
  range: "That number is outside what Village OS takes.",
  option: "Pick one of the choices.",
  nothingToConfirm: "There's nothing here to keep yet.",
  moved: "The boards changed while you were reading. Look again, then keep it.",
  blanks: "Fill in each ___ first, then save it as your own.",
  purposeShort: `Village OS asks for at least ${PURPOSE_MIN_WORDS} words. Add a little more to each part.`,
  address: "Use small letters, digits and hyphens, with no hyphen at either end.",
  currency: "Use the three-letter code, like USD, EUR or CRC.",
  timezone: "Use a timezone name like America/Costa_Rica or Europe/Lisbon.",
  moduleNeeds: "Tick \"{needs}\" too. \"{module}\" runs on it.",
} as const;

const label = (key: string) => VILLAGE_OS_MODULES.find((m) => m.key === key)?.label.replace(/ \(.*\)$/, "") ?? key;

function isTimezone(tz: string): boolean {
  if (!/^[A-Za-z][A-Za-z0-9_+-]*(?:\/[A-Za-z0-9_+-]+)*$/.test(tz)) return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/** Words or a choice, checked and cleaned for its decision. Blocks are kept from the boards, never written. */
export function checkAnswer(d: VillageDecision, raw: unknown): CheckedAnswer {
  switch (d.kind) {
    case "block":
      return { ok: false, message: PROFILE_REFUSALS.block };
    case "text":
    case "longtext": {
      if (typeof raw !== "string") return { ok: false, message: PROFILE_REFUSALS.empty };
      const bare = stripHiddenText(raw);
      const text = d.kind === "text"
        ? bare.replace(/\s+/g, " ").trim()
        : bare.replace(/\r\n?/g, "\n").replace(/[^\S\n]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
      if (!text) return { ok: false, message: PROFILE_REFUSALS.empty };
      if (text.length > (d.max ?? 300)) return { ok: false, message: PROFILE_REFUSALS.tooLong };
      switch (d.format) {
        case "address": {
          const a = text.toLowerCase();
          return /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(a) ? { ok: true, value: a } : { ok: false, message: PROFILE_REFUSALS.address };
        }
        case "currency": {
          const c = text.toUpperCase();
          return /^[A-Z]{3}$/.test(c) ? { ok: true, value: c } : { ok: false, message: PROFILE_REFUSALS.currency };
        }
        case "timezone":
          return isTimezone(text) ? { ok: true, value: text } : { ok: false, message: PROFILE_REFUSALS.timezone };
        case "purpose":
          if (text.includes("___")) return { ok: false, message: PROFILE_REFUSALS.blanks };
          if (text.split(/\s+/).filter(Boolean).length < PURPOSE_MIN_WORDS) return { ok: false, message: PROFILE_REFUSALS.purposeShort };
          return { ok: true, value: text };
        default:
          return { ok: true, value: text };
      }
    }
    case "number":
    case "cap": {
      if (d.kind === "cap" && raw === CAP_KEEP_DEFAULT) return { ok: true, value: CAP_KEEP_DEFAULT };
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
      const picked = d.options!.map((o) => o.key).filter((k) => (raw as string[]).includes(k));
      if (d.key === "modules.on") {
        for (const k of picked) {
          const need = MODULE_NEEDS[k];
          if (need && !picked.includes(need)) {
            return { ok: false, message: PROFILE_REFUSALS.moduleNeeds.replace("{module}", label(k)).replace("{needs}", label(need)) };
          }
        }
      }
      return { ok: true, value: picked };
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
