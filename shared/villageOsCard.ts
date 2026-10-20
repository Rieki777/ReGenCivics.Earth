/**
 * A project's card for Village OS: what "Copy for Village OS" puts on the
 * clipboard (Season 2, Week 4 on).
 *
 * Rye, 2026-10-14: the whole Season ends in launching each project's Village
 * OS from what the episodes uncover. Week 3 named the human needs; Week 4 adds
 * the circles that meet each one, the seats in each circle, who decides what
 * and a first quest. This card carries all of it in Village OS's own words.
 *
 * THE `needs` LIST IS EXACTLY THE BODY Village OS's admin scope write takes
 * (`PUT /api/admin/needs/scope`, server/routes/needs.ts in the village-os
 * repo, `{ needs: [{ needKey, label?, depthTarget?, breadthTargetPct?,
 * sortOrder? }] }`). That route reads `needs` and nothing else, so the whole
 * card can be sent to it as it is. Everything after `needs` is for Village
 * OS's paste step to offer the founder one at a time:
 *   - `variables`: game variables by key; `needs.totality_target_pct` is
 *     written through `PUT /api/admin/variables/:key`.
 *   - `needLinks`: each circle that meets a human need, as a draft need link
 *     onto a seat in that circle (`POST /api/admin/needs/links` takes
 *     `{ needKey, subjectType, subjectRef, weight }`; the seat's id fills
 *     `subjectRef` once the seat exists, so the draft names the circle).
 *   - `seats`: each seat card, with its own need link.
 *   - `circles`, `decisions`, `quests`, `customNeeds` (human needs named last
 *     week and not yet added), `firstLine`, `players`, `shape`.
 *
 * Nothing in it is money, a token amount or a gate. Village OS treats a human
 * need and its links as a description that gates nothing, and so does this.
 */
import {
  CIRCLES,
  DECIDE_OPTIONS,
  GAME_SHAPES,
  NEED_RUNGS,
  OWN_CIRCLE,
  PLAYER_COUNTS,
  TOGETHER_DECISIONS,
  customNeedKey,
  needShort,
  projectCardLines,
  toVillageOsScope,
  type ProjectView,
} from "./humanNeeds";
import { cardLine, cardsOf, circleLabel, meetsCircles, needKeyLabel, ownNeedLabels, type CardEntry, type CardRow, type DecidesBy, type HeldBy } from "./boardCards";

export type VillageOsNeedEntry = {
  needKey: string;
  /** Only for a project's own human need (`custom:<slug>`): its name. */
  label?: string;
  depthTarget: string;
  breadthTargetPct: number;
  sortOrder: number;
};

/**
 * A circle that meets a human need, as a draft for a need link onto a seat in
 * that circle. No weight: Village OS keeps one link per human need and seat,
 * and the seat's own link (on `seats`) carries it.
 */
export type DraftNeedLink = {
  needKey: string;
  subjectType: "role";
  /** The circle the seat sits in: a key from the nine, "own" (one of its own, unnamed), or "own:<name>". */
  circle: string;
  circleLabel: string;
};

/**
 * A seat, named the way Village OS names a seat's commitments
 * (shared/roleSheetWords.ts in village-os: aim, domain, accountabilities,
 * why, term, nextHolder, decides). What the board doesn't ask is null and
 * takes Village OS's default: a term ends with the season.
 */
export type VillageOsSeat = {
  name: string;
  circle: string;
  circleLabel: string;
  /** How many people can hold it. The board asks one seat per card. */
  seats: number;
  aim: string;
  /** What it decides on. The board asks this per circle (`circles[].decidesOn`), so a seat has none of its own. */
  domain: string | null;
  /** What it answers for. */
  accountabilities: string;
  /** Why it matters: the human need it meets. */
  why: string;
  term: null;
  nextHolder: null;
  decides: null;
  heldBy: HeldBy;
  who: string;
  /** Hours a week when the words say so, and the words as written. */
  contribution: { hoursPerWeek?: number; text?: string };
  needLinks: { needKey: string; subjectType: "role"; weight: "primary" | "partial" }[];
};

/**
 * "4 hours a week", "4h/week", "about 6 hrs per week" give hours a week;
 * anything else ("two mornings a week") stays as words only.
 */
export function parseContribution(words: string): { hoursPerWeek?: number; text?: string } {
  const text = words.trim();
  if (!text) return {};
  const m = /(\d+(?:[.,]\d+)?)\s*(?:hours?|hrs?|h)\b\s*(?:a|per|each|every|\/)?\s*(?:week|wk|w)\b/i.exec(text);
  const hours = m ? Number(m[1].replace(",", ".")) : NaN;
  return Number.isFinite(hours) && hours > 0 && hours <= 168 ? { hoursPerWeek: hours, text } : { text };
}

/** The card's shape name, so Village OS's importer can refuse one it doesn't know. */
export const VILLAGE_CARD_SCHEMA = "regen-civics/village-card@1";

export type VillageOsCard = {
  schema: typeof VILLAGE_CARD_SCHEMA;
  needs: VillageOsNeedEntry[];
  variables: { "needs.totality_target_pct"?: number };
  needLinks: DraftNeedLink[];
  seats: VillageOsSeat[];
  /**
   * `decidesBy` is Village OS's `circles.decides_by` id (the keys of
   * DECIDES_BY in shared/boardCards.ts), set only when every card on the
   * circle that names a way agrees; `decidesByAnswers` lists each way the
   * cards name, so a founder sees the disagreement. `decidesByGloss` is the
   * line Village OS requires with "other".
   */
  circles: {
    circle: string;
    label: string;
    needs: string[];
    decidesOn: string[];
    decidesBy: DecidesBy | null;
    decidesByGloss: string | null;
    decidesByAnswers: { by: DecidesBy; gloss: string | null }[];
    startsWith: boolean;
  }[];
  decisions: { together: string[]; how: string | null; agreement: string | null };
  /** The first step someone takes to come in. */
  entry: string | null;
  quests: { quest: string; need: string | null }[];
  customNeeds: { needKey: string; label: string }[];
  firstLine: string | null;
  players: { toStart: string | null; now: string | null };
  shape: { shape: string | null; line: string | null };
  from: { site: string; project: string; applicationId: number | null; weeks: number[] };
};

export type ProjectCards = {
  seats: readonly CardEntry<"seat">[];
  own: readonly CardEntry<"own">[];
  decide: readonly CardEntry<"decide">[];
  quests: readonly CardEntry<"quest">[];
  /** The circles that meet each of the project's own human needs, one card per person per human need. */
  meets: readonly CardEntry<"meets">[];
};

/**
 * Which circles meet each human need, as people per circle: the ten's
 * per-need picks (view.circlesFor), plus a circles card for each of the
 * project's own human needs that is still on its card.
 */
export function circlesPerNeed(view: ProjectView, cards: ProjectCards): Record<string, Record<string, number>> {
  const out: Record<string, Record<string, number>> = {};
  for (const [need, tally] of Object.entries(view.circlesFor)) if (tally) out[need] = { ...tally };
  const own = ownNeedLabels(cards.own);
  for (const { card } of cards.meets) {
    if (!own.has(card.need)) continue;
    const tally = (out[card.need] ??= {});
    for (const k of meetsCircles(card)) tally[k] = (tally[k] ?? 0) + 1;
  }
  return out;
}

/**
 * The human needs a card picked beyond its seeds, and the ones it named on
 * Week 3's "A human need that isn't here" and hasn't added as its own:
 * projectCardLines reads seeds only, so Amora's ten picks and Toa's
 * "spiritual practice" would otherwise never show.
 */
export function needsBeyondSeeds(view: ProjectView, ownKeys: ReadonlySet<string> = new Set()): string[] {
  const out: string[] = [];
  const rest = view.needs.map((n) => n.id as string).filter((id) => !(view.seeds as string[]).includes(id));
  if (rest.length) out.push(`${view.seeds.length ? "Also here to meet" : "Here to meet"}: ${rest.map(needShort).join(", ")}.`);
  const named = [view.other.latest, ...view.other.others]
    .map((w) => (w ?? "").trim())
    .filter((w, i, all) => w && all.indexOf(w) === i && !ownKeys.has(customNeedKey(w)));
  if (named.length) out.push(`Named last week, not added yet: ${named.join(", ")}.`);
  return out;
}

/** projectCardLines with the human needs beyond its seeds, after the seed lines and before the whole-project line. */
export function cardLinesWithNeeds(view: ProjectView, ownKeys: ReadonlySet<string> = new Set()): string[] {
  const lines = projectCardLines(view);
  lines.splice(Math.min(lines.length, 2 + view.seeds.length), 0, ...needsBeyondSeeds(view, ownKeys));
  return lines;
}

const label = (list: readonly { key: string; label: string }[], key: string | null) =>
  key == null ? null : list.find((o) => o.key === key)?.label ?? null;

/** "Kitchen: feeding everyone" names the circle "Kitchen". */
export function ownCircleName(line: string): string {
  const name = line.split(/[:,(]/)[0]?.trim() ?? "";
  return (name || line.trim()).slice(0, 50);
}

/**
 * The card for one project, from its merged view (this week and the weeks
 * before, shared/boardCarry.ts) and its cards (shared/boardCards.ts).
 */
export function toVillageOsCard(input: {
  project: string;
  applicationId: number | null;
  weeks: number[];
  view: ProjectView;
  cards: ProjectCards;
  site?: string;
}): VillageOsCard {
  const { view, cards } = input;

  // The scope write's body: the ten, seeds first, then the project's own.
  const scope = toVillageOsScope(view);
  const needs: VillageOsNeedEntry[] = scope.needs.map((n) => ({ ...n }));
  const ownSeen = new Set<string>();
  for (const e of cards.own) {
    const key = customNeedKey(e.card.label);
    if (ownSeen.has(key)) continue;
    ownSeen.add(key);
    const pct = Number(e.card.breadth);
    needs.push({
      needKey: key,
      label: e.card.label,
      depthTarget: NEED_RUNGS.some((r) => r.key === e.card.goal) ? e.card.goal : "satisfied",
      breadthTargetPct: Number.isInteger(pct) && pct >= 1 && pct <= 100 ? pct : 100,
      sortOrder: needs.length + 1,
    });
  }
  const inScope = new Set(needs.map((n) => n.needKey));

  // Week 3's "A human need that isn't here", not yet added as one of its own.
  const customNeeds: VillageOsCard["customNeeds"] = [];
  for (const words of [view.other.latest, ...view.other.others]) {
    const name = (words ?? "").trim();
    if (!name) continue;
    const key = customNeedKey(name);
    if (inScope.has(key) || customNeeds.some((c) => c.needKey === key)) continue;
    customNeeds.push({ needKey: key, label: name.slice(0, 120) });
  }

  // Circles per human need (c-<need>, and a circles card for one of its own), as draft links onto a seat in that circle.
  const needLinks: DraftNeedLink[] = [];
  for (const [needKey, tally] of Object.entries(circlesPerNeed(view, cards))) {
    if (!inScope.has(needKey) || !tally) continue;
    const keys = Object.keys(tally).filter((k) => (tally[k] ?? 0) > 0);
    for (const k of keys) {
      needLinks.push({
        needKey,
        subjectType: "role",
        circle: k,
        circleLabel: k === OWN_CIRCLE.key ? OWN_CIRCLE.label : circleLabel(k),
      });
    }
  }

  // Seats, each with its own need link: the only seat for a human need meets it,
  // more than one share it. Village OS links a seat only to a human need the
  // village has taken on, so a seat on one that isn't in the list keeps no link.
  const seatsPerNeed = new Map<string, number>();
  for (const s of cards.seats) seatsPerNeed.set(s.card.need, (seatsPerNeed.get(s.card.need) ?? 0) + 1);
  const ownLabels = ownNeedLabels(cards.own);
  const seats: VillageOsSeat[] = cards.seats.map(({ card: s }) => ({
    name: s.name,
    circle: s.circle,
    circleLabel: circleLabel(s.circle),
    seats: 1,
    aim: s.aim,
    domain: null,
    accountabilities: s.answersFor,
    why: `Meets ${needKeyLabel(s.need, ownLabels)}`,
    term: null,
    nextHolder: null,
    decides: null,
    heldBy: s.heldBy,
    who: s.who,
    contribution: parseContribution(s.contribution),
    needLinks: inScope.has(s.need) ? [{ needKey: s.need, subjectType: "role", weight: (seatsPerNeed.get(s.need) ?? 0) > 1 ? "partial" : "primary" }] : [],
  }));

  // Every circle the card names: started with, meeting a human need, holding a seat, deciding something, or its own.
  const circles = new Map<string, VillageOsCard["circles"][number]>();
  const circle = (key: string) => {
    let c = circles.get(key);
    if (!c) {
      c = { circle: key, label: key === OWN_CIRCLE.key ? OWN_CIRCLE.label : circleLabel(key), needs: [], decidesOn: [], decidesBy: null, decidesByGloss: null, decidesByAnswers: [], startsWith: false };
      circles.set(key, c);
    }
    return c;
  };
  for (const c of CIRCLES) if ((view.circles[c.key] ?? 0) > 0) circle(c.key).startsWith = true;
  for (const line of view.circlesOwn) {
    const name = ownCircleName(line);
    if (name) circle(`own:${name}`);
  }
  for (const l of needLinks) if (l.circle !== OWN_CIRCLE.key && !circle(l.circle).needs.includes(l.needKey)) circle(l.circle).needs.push(l.needKey);
  for (const s of cards.seats) {
    const c = circle(s.card.circle);
    if (!c.needs.includes(s.card.need)) c.needs.push(s.card.need);
  }
  // Village OS keeps one way of deciding per circle: carry it only when the cards agree.
  for (const d of cards.decide) {
    const c = circle(d.card.circle);
    c.decidesOn.push(d.card.decidesOn);
    const by = d.card.how;
    if (!by) continue;
    const gloss = by === "other" ? d.card.gloss ?? null : null;
    if (!c.decidesByAnswers.some((a) => a.by === by && a.gloss === gloss)) c.decidesByAnswers.push({ by, gloss });
  }
  for (const c of circles.values()) {
    if (c.decidesByAnswers.length !== 1) continue;
    c.decidesBy = c.decidesByAnswers[0].by;
    c.decidesByGloss = c.decidesByAnswers[0].gloss;
  }

  const together = TOGETHER_DECISIONS.filter((t) => (view.together[t.key] ?? 0) > 0).map((t) => t.label);
  const purpose = view.purpose.latest?.trim().replace(/^all this is for\s*/i, "") ?? "";

  const whole = scope.totalityTargetPct;
  return {
    schema: VILLAGE_CARD_SCHEMA,
    needs,
    variables: whole != null ? { "needs.totality_target_pct": whole } : {},
    needLinks,
    seats,
    circles: [...circles.values()],
    decisions: {
      together,
      how: label(DECIDE_OPTIONS, view.decideAim.value),
      agreement: view.agreement.latest,
    },
    entry: view.entry.latest,
    // A quest on a human need the village hasn't taken on keeps its words, without the tag.
    quests: cards.quests.map(({ card }) => ({ quest: card.quest, need: inScope.has(card.need) ? card.need : null })),
    customNeeds,
    firstLine: purpose || null,
    players: { toStart: label(PLAYER_COUNTS, view.players.value), now: label(PLAYER_COUNTS, view.playersNow.value) },
    shape: { shape: label(GAME_SHAPES, view.shape.value), line: view.shapeLine.latest },
    from: { site: input.site ?? "regencivics.earth", project: input.project, applicationId: input.applicationId, weeks: [...input.weeks].sort((a, b) => a - b) },
  };
}

/** The card as the text the button copies: pretty enough to read before pasting. */
export function villageOsCardText(card: VillageOsCard): string {
  return JSON.stringify(card, null, 2);
}

/** One project's cards of every kind, from its (merged) rows. */
export function cardsForProject(rows: readonly CardRow[], cardId: number | null): ProjectCards {
  return {
    seats: cardsOf(rows, "seat", cardId),
    own: cardsOf(rows, "own", cardId),
    decide: cardsOf(rows, "decide", cardId),
    quests: cardsOf(rows, "quest", cardId),
    meets: cardsOf(rows, "meets", cardId),
  };
}

/**
 * A project's Game in plain lines, for "Your Game, built" and the export:
 * Week 3's card, then its own human needs, the circles per human need, its
 * seats, what its circles decide, and its quests. Empty parts are left out.
 */
export function gameLines(view: ProjectView, cards: ProjectCards): string[] {
  const own = ownNeedLabels(cards.own);
  const lines = cardLinesWithNeeds(view, new Set(own.keys()));
  if (cards.own.length) lines.push(`Its own human needs: ${cards.own.map((e) => cardLine("own", e.card)).join("; ")}.`);
  for (const [need, tally] of Object.entries(circlesPerNeed(view, cards))) {
    const keys = Object.keys(tally ?? {}).filter((k) => (tally?.[k] ?? 0) > 0);
    if (!keys.length) continue;
    const names = keys.map((k) => (k === OWN_CIRCLE.key ? OWN_CIRCLE.label.toLowerCase() : circleLabel(k)));
    lines.push(`${needKeyLabel(need, own)} is met by ${names.join(", ")}.`);
  }
  for (const e of cards.seats) lines.push(`Seat: ${cardLine("seat", e.card, own)}.`);
  for (const e of cards.decide) lines.push(`${cardLine("decide", e.card, own)}.`);
  const together = TOGETHER_DECISIONS.filter((t) => (view.together[t.key] ?? 0) > 0).map((t) => t.label.toLowerCase());
  if (together.length) lines.push(`Decided together: ${together.join(", ")}.`);
  if (view.agreement.latest) lines.push(`First agreement: ${view.agreement.latest}`);
  if (view.entry.latest) lines.push(`The first step in: ${view.entry.latest}`);
  for (const e of cards.quests) lines.push(`Quest: ${cardLine("quest", e.card, own)}.`);
  return lines;
}

/** A part of a project's card with no answer yet, and the stage step that asks it. */
export type CardGap = { key: string; label: string; step: "confirm" | "circles" | "seats" | "decide" | "quests" | "room" };

/**
 * What's still missing from a project's card, in the order Week 4 asks it,
 * so "Your Week 3 card" can point at the stage that fills each gap.
 */
export function cardGaps(view: ProjectView, cards: ProjectCards): CardGap[] {
  const gaps: CardGap[] = [];
  const needs = view.needs.map((n) => n.id as string);
  const own = ownNeedLabels(cards.own);
  if (!needs.length && !cards.own.length) gaps.push({ key: "needs", label: "The human needs your project is here to meet", step: "confirm" });
  // Seeds go on the ten only: a project whose human needs are all its own has none to plant.
  if (!view.seeds.length && !(needs.length === 0 && cards.own.length)) gaps.push({ key: "top", label: "Three seeds at your project's heart", step: "confirm" });
  const noGoal = view.seeds.filter((id) => !view.perNeed[id]?.goal.value);
  if (noGoal.length) gaps.push({ key: "goal", label: "How deep, and for how many, for each seed", step: "confirm" });
  if (!view.whole.value) gaps.push({ key: "whole", label: "What share of your people's human needs your project means to meet", step: "confirm" });
  const withCircles = Object.keys(circlesPerNeed(view, cards)).filter((k) => needs.includes(k) || own.has(k));
  if (!withCircles.length) gaps.push({ key: "circlesFor", label: "The circles that meet each human need", step: "circles" });
  if (!Object.values(view.circles).some((n) => n > 0) && !view.circlesOwn.length) gaps.push({ key: "circles", label: "The circles you start with", step: "circles" });
  if (!view.players.value) gaps.push({ key: "players", label: "How many players your Game takes to start", step: "circles" });
  if (!view.shape.value) gaps.push({ key: "shape", label: "The shape of your Game", step: "circles" });
  if (!cards.seats.length) gaps.push({ key: "seats", label: "The seats in each circle", step: "seats" });
  if (!cards.decide.length && !Object.values(view.together).some((n) => n > 0)) gaps.push({ key: "decide", label: "Who decides what", step: "decide" });
  // Village OS keeps one way of deciding per circle: cards that name two need settling.
  const ways = new Map<string, Set<string>>();
  for (const d of cards.decide) {
    if (!d.card.how) continue;
    const s = ways.get(d.card.circle) ?? new Set<string>();
    s.add(`${d.card.how}:${d.card.how === "other" ? d.card.gloss ?? "" : ""}`);
    ways.set(d.card.circle, s);
  }
  for (const [circleKey, s] of ways) {
    if (s.size > 1) gaps.push({ key: `decides-by:${circleKey}`, label: `How ${circleLabel(circleKey)} decides: your cards name more than one way`, step: "decide" });
  }
  if (!cards.quests.length) gaps.push({ key: "quest", label: "A first quest", step: "quests" });
  if (!view.purpose.latest) gaps.push({ key: "purpose", label: "Your project's first line: All this is for ___", step: "room" });
  return gaps;
}
