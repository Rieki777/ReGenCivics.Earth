/**
 * Week 4, "Game & Organisation Co-Creation Part 2" (Rye, 2026-10-14): the
 * stage list, the cards (shared/boardCards.ts), carrying Week 3's answers
 * forward (shared/boardCarry.ts) and the Village OS card
 * (shared/villageOsCard.ts).
 */
import { describe, expect, it } from "vitest";
import {
  CARD_COPY,
  CARD_TEXT_MAX,
  CARD_LIMITS,
  DECIDES_BY,
  cardKindOfKey,
  cardLine,
  cardSlotKeys,
  cardText,
  cardsOf,
  cleanCard,
  freeSlot,
  normalizeCardText,
  parseCard,
  type SeatCard,
} from "./boardCards";
import {
  CARRY_COPY,
  firstChangeCopy,
  isCarried,
  matchCard,
  mergeCarried,
  mergeProjectWeeks,
  withCarried,
  type CarriedRow,
  type EarlierCard,
} from "./boardCarry";
import { describeItem } from "./boardEntries";
import { HUMAN_NEED_IDS, NEED_RUNGS, customNeedKey, projectView, type AnswerRow } from "./humanNeeds";
import {
  CHECKIN_COPY,
  PROMPT_COPY,
  PROMPT_KEY_RE,
  OPTION_KEY_RE,
  WEEK4_COPY,
  anonymousKeys,
  applyBoardAction,
  boardStages,
  boardWelcome,
  defaultBoardState,
  isPromptRef,
  normalizeBoardState,
  promptsForWeek,
  sessionMinutes,
  type BoardPrompt,
} from "./sessionBoard";
import { VILLAGE_OS_OFFER } from "./villageOsOffer";
import {
  VILLAGE_CARD_SCHEMA,
  cardGaps,
  cardLinesWithNeeds,
  cardsForProject,
  circlesPerNeed,
  gameLines,
  needsBeyondSeeds,
  ownCircleName,
  parseContribution,
  toVillageOsCard,
  villageOsCardText,
  type VillageOsCard,
} from "./villageOsCard";

const at = (min: number) => new Date(Date.UTC(2026, 9, 21, 17, min)).toISOString();
let nextId = 1;
const row = (block: string, text: string, projectId: number | null, min = 0, extra: Partial<AnswerRow> = {}): AnswerRow => ({
  id: nextId++, kind: "answer", block, text, projectId, createdAt: at(min), ...extra,
});
const carried = (week: number, block: string, text: string, projectId: number, min = 0): CarriedRow => ({ ...row(block, text, projectId, min), week });

const SEAT: SeatCard = {
  name: "Water keeper",
  circle: "water",
  need: "vitality",
  aim: "Living water for every household on the land",
  answersFor: "The spring, the catchment, the water tests",
  heldBy: "team",
  who: "Ana",
  contribution: "4 hours a week",
};

/* ------------------------------------------------------------ the stages */

describe("week 4's run of show", () => {
  const stages = boardStages(4);

  it("runs 15 stages, 120 minutes, opening on last week's questions, the seats stage the longest, Village OS last", () => {
    expect(stages.map((s) => s.name)).toEqual([
      "Welcome", "Tap your project", "Drop in", "Last week's questions", "Your Week 3 card", "Your human needs", "Circles for each human need",
      "Seats in each circle", "Who decides what", "Your first quest", "Your Game, built", "Your questions, and Week 5",
      "Tell us", "Close", VILLAGE_OS_OFFER.board.title,
    ]);
    expect(stages.map((s) => s.min)).toEqual([3, 4, 5, 12, 7, 11, 11, 30, 10, 7, 7, 6, 4, 2, 1]);
    expect(sessionMinutes(defaultBoardState(4).plan, stages)).toBe(120);
    expect(stages.filter((s) => s.kind === "needs").map((s) => s.step)).toEqual(["asks", "carry", "confirm", "circles", "seats", "decide", "quests", "room"]);
    expect(Math.max(...stages.map((s) => s.min))).toBe(30);
    // The closing questions stage also lists whatever Week 3 still has open.
    expect(stages.find((s) => s.name === "Your questions, and Week 5")?.earlierAsks).toBe(true);
    // The role questions are answered on the new stage, not on Your Week 3 card.
    expect(stages[3].cues?.join(" ")).toMatch(/role questions/);
    expect(stages[4].cues?.join(" ")).not.toMatch(/role questions/);
  });

  it("the welcome says Part 2 of 2, the practical half, and what each project leaves with", () => {
    const w = boardWelcome(4);
    expect(w.title).toBe("Game & Organisation Co-Creation Part 2");
    expect(w.lede).toMatch(/^This is Part 2 of 2, the practical half\./);
    expect(w.leaveWith).toEqual([
      "Your human needs, checked and ready for Village OS",
      "The circles that meet each human need",
      "The seats in each circle, and who holds them",
      "Who decides what, and one first agreement",
      "A first quest that grows a seed",
    ]);
  });

  it("keys are defined once, short and lowercase; the cards are slot prompts of one row each", () => {
    const seen = new Set<string>();
    for (const s of stages) {
      for (const p of s.prompts ?? []) {
        expect(isPromptRef(p), "Week 4 defines every prompt it asks").toBe(false);
        const d = p as BoardPrompt;
        expect(seen.has(d.key), `key ${d.key} defined twice`).toBe(false);
        expect(d.key).toMatch(PROMPT_KEY_RE);
        seen.add(d.key);
        if (d.card) {
          expect(cardKindOfKey(d.key), d.key).toBe(d.card);
          expect(d.mode).toBe("note");
          expect(d.max).toBe(1);
          expect(d.maxText).toBe(CARD_TEXT_MAX);
        }
        for (const o of d.options ?? []) expect(o.key, `${d.key}: ${o.key}`).toMatch(OPTION_KEY_RE);
      }
    }
    for (const kind of ["seat", "own", "decide", "quest"] as const) {
      for (const k of cardSlotKeys(kind)) expect(seen.has(k), k).toBe(true);
    }
    expect(promptsForWeek(4).size).toBe(seen.size);
    expect([...anonymousKeys(4)].sort()).toEqual(["pulse-a", "pulse-b", "useful"]);
    // The keys Week 3 asked and Week 4 asks again are the same keys, so a change today replaces last week's.
    for (const k of ["needs", "top", "whole", "g-love", "b-love", "c-love", "circles-own", "circles", "players", "shape", "decide-aim", "purpose", "move"]) {
      expect(promptsForWeek(4).has(k), k).toBe(true);
      expect(promptsForWeek(3).has(k), k).toBe(true);
    }
  });

  it("the copy follows the writing rules and says human needs", () => {
    const copy = week4Copy();
    expect(copy.length).toBeGreaterThan(120);
    for (const line of copy) {
      expect(line, line).not.toContain(String.fromCodePoint(0x2014));
      expect(line, line).not.toContain(String.fromCodePoint(0x2013));
      expect(line, line).not.toMatch(/\b(delve|journey|unlock|unleash|empower|seamless|tapestry|foster|leverage|nurture|robust|vibrant|crucial|embark|utilize|comprehensive|straightforward|genuinely|honestly)\b/i);
      expect(line, line).not.toMatch(/\bnot (just |only )?[\w' ]+, but\b|\bisn't about\b/i);
      const bare = line.match(/(?<!human |Survival )\bneeds\b/gi) ?? [];
      expect(bare, line).toEqual([]);
      expect(line, line).not.toMatch(/\$\d|\binvest|\bprofit|\bdividend|\byield\b|\breturns?\b|\bequity\b|\bownership\b|\bPMA\b|\bLLC\b/i);
    }
  });
});

function week4Copy(): string[] {
  const out: string[] = [];
  const walk = (v: unknown) => {
    if (typeof v === "string") out.push(v);
    else if (Array.isArray(v)) v.forEach(walk);
    else if (v && typeof v === "object") Object.values(v).forEach(walk);
  };
  for (const s of boardStages(4)) {
    out.push(s.name, s.short, s.line, ...s.cues);
    if (s.lede) out.push(s.lede);
    for (const n of s.notes ?? []) out.push(n);
    for (const p of s.prompts ?? []) {
      const d = p as BoardPrompt;
      out.push(d.title);
      for (const t of [d.hint, d.placeholder, d.full]) if (t) out.push(t);
      for (const o of d.options ?? []) for (const t of [o.label, o.small, o.tip]) if (t) out.push(t);
    }
  }
  const w = boardWelcome(4);
  out.push(w.title, w.lede, ...w.leaveWith);
  walk(WEEK4_COPY);
  walk(CARD_COPY);
  walk(CARRY_COPY);
  walk(CHECKIN_COPY);
  walk(PROMPT_COPY);
  return out;
}

/* ------------------------------------------------------------- the cards */

describe("cards", () => {
  it("a seat round-trips through its stored text, in short keys", () => {
    const text = cardText("seat", SEAT);
    expect(JSON.parse(text)).toMatchObject({ n: "Water keeper", c: "water", d: "vitality", h: "team", w: "Ana" });
    expect(parseCard("seat", text)).toEqual(SEAT);
    expect(normalizeCardText("seat", text)).toBe(text);
  });

  it("cleans every field and refuses a card without its name, circle or human need", () => {
    expect(cleanCard("seat", { ...SEAT, name: "  Water​   keeper " })?.name).toBe("Water keeper");
    expect(cleanCard("seat", { ...SEAT, name: " " })).toBeNull();
    expect(cleanCard("seat", { ...SEAT, circle: "money" })).toBeNull();
    expect(cleanCard("seat", { ...SEAT, need: "wealth" })).toBeNull();
    expect(cleanCard("seat", { ...SEAT, circle: "own:Kitchen" })?.circle).toBe("own:Kitchen");
    expect(cleanCard("seat", { ...SEAT, need: customNeedKey("Spiritual practice") })?.need).toBe("custom:spiritual-practice");
    // Open seats keep no holder; an unknown "held by" reads as open.
    expect(cleanCard("seat", { ...SEAT, heldBy: "open" })?.who).toBe("");
    expect(cleanCard("seat", { ...SEAT, heldBy: "boss" })?.heldBy).toBe("open");
    expect(normalizeCardText("seat", "not json")).toBeNull();
    expect(normalizeCardText("seat", JSON.stringify({ n: "x" }))).toBeNull();
  });

  it("the longest card still fits the column", () => {
    const long = (n: number) => "x".repeat(n + 50);
    const card = cleanCard("seat", { name: long(CARD_LIMITS.name), circle: `own:${long(CARD_LIMITS.circleName)}`, need: `custom:${"a".repeat(50)}`, aim: long(CARD_LIMITS.aim), answersFor: long(CARD_LIMITS.answersFor), heldBy: "being", who: long(CARD_LIMITS.who), contribution: long(CARD_LIMITS.contribution) })!;
    expect(cardText("seat", card).length).toBeLessThanOrEqual(CARD_TEXT_MAX);
    const quotes = cleanCard("seat", { ...SEAT, aim: "\"".repeat(400), answersFor: "\\".repeat(400) })!;
    expect(normalizeCardText("seat", cardText("seat", quotes))!.length).toBeLessThanOrEqual(CARD_TEXT_MAX);
  });

  it("an own human need takes a name and a goal, and can't be one of the ten by any spelling", () => {
    expect(cleanCard("own", { label: "Spiritual practice", goal: "thriving", breadth: "75" })).toEqual({ label: "Spiritual practice", goal: "thriving", breadth: "75" });
    expect(cleanCard("own", { label: "Spiritual practice" })).toBeNull();
    expect(cleanCard("own", { label: "Love", goal: "thriving" })).toBeNull();
    // Village OS refuses "custom:love" and its scope save is all or nothing, so these never reach it.
    for (const label of ["Love.", "PLAY!", "  vitality  ", "Vitality & Survival Needs"]) expect(cleanCard("own", { label, goal: "alive" }), label).toBeNull();
    // A name with no letter a to z would key as "custom:unnamed": refused, with words that say why.
    expect(cleanCard("own", { label: "\u5fc3", goal: "alive" })).toBeNull();
    expect(cleanCard("seat", { ...SEAT, need: "custom:love" })).toBeNull();
    expect(cleanCard("seat", { ...SEAT, need: "custom:-start" })).toBeNull();
    expect(cleanCard("seat", { ...SEAT, need: "custom:unnamed" })).toBeNull();
    expect(cleanCard("own", { label: "Wisdom", goal: "alive", breadth: "33" })?.breadth).toBe("100");
  });

  it("no key Week 2 or Week 3 asks reads as a card, so joining or merging there never re-slots anything", () => {
    for (const w of [2, 3]) for (const k of promptsForWeek(w).keys()) expect(cardKindOfKey(k), `week ${w}: ${k}`).toBeNull();
  });

  it("a card of nothing but quotes is too long, and says so rather than calling it incomplete", () => {
    const q = (n: number) => "\"".repeat(n);
    const card = cleanCard("seat", { name: q(CARD_LIMITS.name), circle: "water", need: "vitality", aim: q(CARD_LIMITS.aim), answersFor: q(CARD_LIMITS.answersFor), heldBy: "team", who: q(CARD_LIMITS.who), contribution: q(CARD_LIMITS.contribution) })!;
    expect(card).not.toBeNull();
    expect(cardText("seat", card).length).toBeGreaterThan(CARD_TEXT_MAX);
    expect(normalizeCardText("seat", cardText("seat", card))).toBeNull();
    expect(CARD_COPY.tooLong).toMatch(/too long/);
  });

  it("slots: keys per kind, the kind of a key, and the next free one", () => {
    expect(cardSlotKeys("seat")).toHaveLength(12);
    expect(cardSlotKeys("quest")).toEqual(["quest-1", "quest-2", "quest-3"]);
    expect(cardKindOfKey("seat-12")).toBe("seat");
    expect(cardKindOfKey("seat-13")).toBeNull();
    expect(cardKindOfKey("dec-3")).toBe("decide");
    expect(cardKindOfKey("needs")).toBeNull();
    expect(cardKindOfKey("seat-help")).toBeNull();
    expect(freeSlot("quest", ["quest-1", "quest-3"])).toBe("quest-2");
    expect(freeSlot("quest", ["quest-1", "quest-2", "quest-3"])).toBeNull();
  });

  it("reads every person's cards on a project, and the profile says what each one is", () => {
    const rows = [
      row("seat-1", cardText("seat", SEAT), 7, 1),
      row("seat-1", cardText("seat", { ...SEAT, name: "Initiation guide", circle: "festivals", need: "play", heldBy: "open", who: "" }), 7, 2),
      row("seat-2", "broken", 7, 3),
      row("seat-1", cardText("seat", SEAT), 8, 4),
    ];
    const seats = cardsOf(rows, "seat", 7);
    expect(seats.map((s) => s.card.name)).toEqual(["Water keeper", "Initiation guide"]);
    const e = describeItem(4, rows[0]);
    expect(e.label).toBe("A seat you wrote");
    // Someone's words mid-sentence start lower case.
    expect(e.value).toBe("Water keeper (Living Water), meets Vitality; works toward living water for every household on the land; answers for the spring, the catchment, the water tests; held by Ana; asks 4 hours a week");
    expect(cardLine("decide", { circle: "own:Kitchen", decidesOn: "what we cook" })).toBe("Kitchen decides on what we cook");
    // The circles stage reads the same on Week 3's profile entries and Week 4's.
    expect(describeItem(3, { kind: "answer", block: "c-love", text: "festivals" })).toEqual({ label: "Love: a circle that meets it", value: "Festivals & Rites" });
    expect(describeItem(3, { kind: "answer", block: "shape", text: "hub" }).label).toBe("The shape of your Game");
  });
});

/* ------------------------------------------------------------ the carry */

describe("carrying Week 3 forward", () => {
  const earlier: EarlierCard[] = [
    { id: 33, week: 3, name: "Templeofroots.com", applicationId: null },
    { id: 34, week: 3, name: "Amora", applicationId: 57 },
    { id: 35, week: 3, name: "Toa Hermitage", applicationId: null },
    { id: 36, week: 3, name: "Toa Hermitage", applicationId: null, hidden: true },
  ];

  it("matches by application, then a recorded link, then suggests a same-name card", () => {
    expect(matchCard({ id: 1, name: "Amora Village", applicationId: 57 }, earlier, undefined)).toMatchObject({ match: "application", from: [{ cardId: 34, week: 3 }] });
    expect(matchCard({ id: 2, name: "Templeofroots.com", applicationId: null }, earlier, { from: 33, by: "tile" })).toMatchObject({ match: "carried", from: [{ cardId: 33 }] });
    expect(matchCard({ id: 2, name: "templeofroots.com", applicationId: null }, earlier, { from: 33, by: "person" }).match).toBe("yours");
    expect(matchCard({ id: 2, name: "Temple", applicationId: null }, earlier, { from: 33, by: "facilitator" }).match).toBe("confirmed");
    // A name alone carries nothing: it waits for a facilitator, and a hidden card is never suggested.
    expect(matchCard({ id: 3, name: "toa  hermitage", applicationId: null }, earlier, undefined)).toEqual({ match: "suggested", from: [], suggested: [{ week: 3, cardId: 35, name: "Toa Hermitage" }] });
    expect(matchCard({ id: 3, name: "Toa Hermitage", applicationId: null }, earlier, { from: 0, by: "facilitator" }).match).toBe("declined");
    expect(matchCard({ id: 4, name: "Sand Angel", applicationId: null }, earlier, undefined).match).toBe("none");
    // A link to a hidden card carries nothing.
    expect(matchCard({ id: 5, name: "X", applicationId: null }, earlier, { from: 36, by: "facilitator" }).match).toBe("none");
  });

  it("the human needs move as one group: a need taken off today drops its carried seed and answers", () => {
    const today = [row("needs", "vitality", 9, 10), row("needs", "growth", 9, 10)];
    const last = [
      carried(3, "needs", "vitality", 33), carried(3, "needs", "play", 33), carried(3, "needs", "growth", 33),
      carried(3, "top", "play", 33), carried(3, "top", "vitality", 33),
      carried(3, "g-play", "thriving", 33), carried(3, "c-play", "festivals", 33), carried(3, "g-vitality", "alive", 33),
    ];
    const view = projectView(mergeCarried(today, last, 9, new Set([33])), 9);
    expect(view.needs.map((n) => n.id).sort()).toEqual(["growth", "vitality"]);
    expect(view.seeds).toEqual(["vitality"]);
    expect(view.perNeed.play).toBeUndefined();
    expect(view.circlesFor.play).toBeUndefined();
    expect(view.perNeed.vitality?.goal.value).toBe("alive");
  });

  it("a card linked by a person or a facilitator still carries when an application matches too", () => {
    const m = matchCard({ id: 1, name: "Amora", applicationId: 57 }, [...earlier, { id: 38, week: 3, name: "Amora stray", applicationId: null }], { from: 38, by: "facilitator" });
    expect(m.match).toBe("application");
    expect(m.from.map((f) => f.cardId).sort()).toEqual([34, 38]);
  });

  it("for each key, today's rows replace last week's; the rest come forward", () => {
    const today = [row("needs", "love", 9, 10), row("g-love", "satisfied", 9, 10)];
    const last = [
      carried(3, "needs", "vitality", 33), carried(3, "needs", "play", 33),
      carried(3, "g-love", "thriving", 33), carried(3, "whole", "50", 33), carried(3, "players", "13-30", 33),
      carried(3, "whole", "25", 34),
    ];
    const merged = mergeCarried(today, last, 9, new Set([33]));
    const view = projectView(merged, 9);
    expect(view.needs.map((n) => n.id)).toEqual(["love"]);
    expect(view.perNeed.love?.goal.value).toBe("satisfied");
    expect(view.whole.value).toBe("50");
    expect(view.players.value).toBe("13-30");
    expect(merged.filter(isCarried).every((r) => r.projectId === 9)).toBe(true);
  });

  it("a later earlier week wins a key over an older one", () => {
    const merged = mergeCarried([], [carried(3, "whole", "25", 33, 1), carried(4, "whole", "75", 40, 2)], 9, new Set([33, 40]));
    expect(projectView(merged, 9).whole.value).toBe("75");
  });

  it("the room view keeps every non-answer row and each card's own merge", () => {
    const rows = [row("needs", "love", 9), { ...row("s3", "a question", 9), kind: "ask" }, row("needs", "play", 10)];
    const out = withCarried(rows, {
      fromWeeks: [3],
      cards: [{ cardId: 9, match: "carried", from: [{ week: 3, cardId: 33, name: "T" }], suggested: [] }, { cardId: 10, match: "none", from: [], suggested: [] }],
      rows: [carried(3, "whole", "50", 33)],
      asks: [],
    });
    expect(out.filter((r) => r.kind === "ask")).toHaveLength(1);
    expect(projectView(out, 9).whole.value).toBe("50");
    expect(projectView(out, 10).needs.map((n) => n.id)).toEqual(["play"]);
  });

  it("the first change to a list the project only has from last week copies it, with the change made", () => {
    const merged = mergeCarried([], [carried(3, "needs", "vitality", 33), carried(3, "needs", "play", 33), carried(3, "needs", "love", 33)], 9, new Set([33]));
    expect(firstChangeCopy(merged, "needs", 9, { option: "play", on: false })).toEqual(["vitality", "love"]);
    expect(firstChangeCopy(merged, "needs", 9, { option: "growth", on: true })).toEqual(["vitality", "play", "love"]);
    const changed = mergeCarried([row("needs", "growth", 9)], [carried(3, "needs", "vitality", 33)], 9, new Set([33]));
    expect(firstChangeCopy(changed, "needs", 9, { option: "vitality", on: false })).toEqual([]);
  });
});

/* ----------------------------------------------- the board's state carries links */

describe("carry links in the board's state", () => {
  it("a facilitator's link is kept, read back and taken back", () => {
    const s = applyBoardAction(defaultBoardState(4), { type: "carry", cardId: 12, from: 33, by: "facilitator" }, 0);
    expect(s.carry["12"]).toEqual({ from: 33, by: "facilitator" });
    expect(normalizeBoardState(JSON.stringify(s), 4).carry).toEqual({ "12": { from: 33, by: "facilitator" } });
    const cleared = applyBoardAction(s, { type: "carry", cardId: 12, from: null, by: "facilitator" }, 0);
    expect(cleared.carry).toEqual({});
    expect(defaultBoardState(4).carry).toEqual({});
  });

  it("a stored map with junk drops the junk", () => {
    const s = normalizeBoardState(JSON.stringify({ carry: { "12": { from: 33, by: "tile" }, x: { from: 1, by: "tile" }, "13": { from: -1, by: "tile" }, "14": { from: 2, by: "boss" }, "15": "no" } }), 4);
    expect(s.carry).toEqual({ "12": { from: 33, by: "tile" } });
  });
});

/* --------------------------------------------- the generic merge of a project's weeks */

describe("merging a project's weeks without a board", () => {
  it("takes each week's rows under any card ids and gives one set, the latest week winning each key", () => {
    const merged = mergeProjectWeeks([
      { week: 3, rows: [row("needs", "love", 33), row("needs", "play", 33), row("whole", "25", 33), row("top", "play", 33)] },
      { week: 4, rows: [row("needs", "love", 501), row("whole", "50", 501)] },
    ], 900);
    const view = projectView(merged, 900);
    expect(view.needs.map((n) => n.id)).toEqual(["love"]);
    expect(view.seeds).toEqual([]);
    expect(view.whole.value).toBe("50");
    expect(mergeProjectWeeks([], 900)).toEqual([]);
  });
});

/* ------------------------------------------------------ the Village OS card */

describe("the card for Village OS", () => {
  const today = [
    row("needs", "vitality", 9), row("needs", "play", 9), row("needs", "growth", 9),
    // The newer seed leads a tie, so Vitality is planted last.
    row("top", "play", 9), row("top", "vitality", 9, 5),
    row("g-vitality", "thriving", 9), row("b-vitality", "75", 9),
    row("whole", "50", 9),
    row("c-vitality", "water", 9), row("c-vitality", "food", 9), row("c-play", "festivals", 9),
    row("circles", "water", 9), row("circles-own", "Kitchen: feeding everyone", 9),
    row("own-1", cardText("own", { label: "Spiritual practice", goal: "thriving", breadth: "100" }), 9),
    row("seat-1", cardText("seat", SEAT), 9),
    row("seat-2", cardText("seat", { ...SEAT, name: "Initiation guide", circle: "festivals", need: "play", heldBy: "open", who: "" }), 9),
    row("dec-1", cardText("decide", { circle: "water", decidesOn: "when we irrigate", how: "consent" }), 9),
    row("entry", "Come to a work day, then a welcome circle", 9),
    row("quest-1", cardText("quest", { quest: "Clear the spring", need: "vitality" }), 9),
    row("together", "join", 9), row("decide-aim", "consent", 9), row("agreement", "Circles decide what's theirs", 9),
    row("purpose", "All this is for future generations", 9),
    row("other", "wisdom", 9),
  ];
  const view = projectView(today, 9);
  const cards = cardsForProject(today, 9);
  const card = toVillageOsCard({ project: "Templeofroots.com", applicationId: null, weeks: [4, 3], view, cards });

  it("its needs list is exactly the body of Village OS's scope write", () => {
    for (const n of card.needs) {
      for (const k of Object.keys(n)) expect(["needKey", "label", "depthTarget", "breadthTargetPct", "sortOrder"], k).toContain(k);
    }
    expect(card.needs.map((n) => n.needKey)).toEqual(["vitality", "play", "growth", "custom:spiritual-practice"]);
    expect(card.needs[0]).toEqual({ needKey: "vitality", depthTarget: "thriving", breadthTargetPct: 75, sortOrder: 1 });
    expect(card.needs[1]).toEqual({ needKey: "play", depthTarget: "satisfied", breadthTargetPct: 100, sortOrder: 2 });
    expect(card.needs[3]).toEqual({ needKey: "custom:spiritual-practice", label: "Spiritual practice", depthTarget: "thriving", breadthTargetPct: 100, sortOrder: 4 });
    expect(card.needs.map((n) => n.sortOrder)).toEqual([1, 2, 3, 4]);
  });

  it("carries the whole-project figure as the game variable, and the circles as draft need links onto a seat", () => {
    expect(card.variables).toEqual({ "needs.totality_target_pct": 50 });
    // No weight on a circle's draft: the seat's own link carries it, so one seat never gets two.
    expect(card.needLinks).toEqual([
      { needKey: "vitality", subjectType: "role", circle: "water", circleLabel: "Living Water" },
      { needKey: "vitality", subjectType: "role", circle: "food", circleLabel: "Food & Fertility" },
      { needKey: "play", subjectType: "role", circle: "festivals", circleLabel: "Festivals & Rites" },
    ]);
    expect(card.seats[0]).toMatchObject({ name: "Water keeper", circle: "water", heldBy: "team", who: "Ana", needLinks: [{ needKey: "vitality", subjectType: "role", weight: "primary" }] });
    expect(card.circles.find((c) => c.circle === "water")).toMatchObject({ startsWith: true, needs: ["vitality"], decidesOn: ["when we irrigate"], decidesBy: "consent", decidesByAnswers: [{ by: "consent", gloss: null }] });
    expect(card.entry).toBe("Come to a work day, then a welcome circle");
    expect(card.circles.some((c) => c.circle === "own:Kitchen")).toBe(true);
    expect(card.decisions).toEqual({ together: ["Who joins"], how: "Everyone, by consent or consensus", agreement: "Circles decide what's theirs" });
    expect(card.quests).toEqual([{ quest: "Clear the spring", need: "vitality" }]);
    // A seat or quest on a human need the village hasn't taken on keeps its words and no link Village OS would refuse.
    const off = toVillageOsCard({
      project: "X", applicationId: null, weeks: [4], view,
      cards: { ...cards, seats: [...cards.seats, { rowId: -1, key: "seat-9", createdAt: at(1), card: { ...SEAT, need: "honesty" } }], quests: [{ rowId: -2, key: "quest-3", createdAt: at(1), card: { quest: "Tell the truth", need: "honesty" } }] },
    });
    expect(off.seats.at(-1)?.needLinks).toEqual([]);
    expect(off.quests).toEqual([{ quest: "Tell the truth", need: null }]);
    expect(card.customNeeds).toEqual([{ needKey: "custom:wisdom", label: "wisdom" }]);
    expect(card.firstLine).toBe("future generations");
    expect(card.from).toEqual({ site: "regencivics.earth", project: "Templeofroots.com", applicationId: null, weeks: [3, 4] });
  });

  it("names its shape, and names each seat the way Village OS names a seat's commitments", () => {
    expect(card.schema).toBe(VILLAGE_CARD_SCHEMA);
    expect(Object.keys(card)[0]).toBe("schema");
    expect(card.seats[0]).toEqual({
      name: "Water keeper", circle: "water", circleLabel: "Living Water", seats: 1,
      aim: SEAT.aim, domain: null, accountabilities: SEAT.answersFor, why: "Meets Vitality",
      term: null, nextHolder: null, decides: null, heldBy: "team", who: "Ana",
      contribution: { hoursPerWeek: 4, text: "4 hours a week" },
      needLinks: [{ needKey: "vitality", subjectType: "role", weight: "primary" }],
    });
    expect(card.seats[1]).toMatchObject({ why: "Meets Play", needLinks: [{ needKey: "play", weight: "primary" }] });
  });

  it("reads hours a week from the words when they say so, and keeps the words", () => {
    expect(parseContribution("4 hours a week")).toEqual({ hoursPerWeek: 4, text: "4 hours a week" });
    expect(parseContribution("4h/week")).toEqual({ hoursPerWeek: 4, text: "4h/week" });
    expect(parseContribution("about 2.5 hrs per week")).toEqual({ hoursPerWeek: 2.5, text: "about 2.5 hrs per week" });
    expect(parseContribution("two mornings a week")).toEqual({ text: "two mornings a week" });
    expect(parseContribution("4 hours")).toEqual({ text: "4 hours" });
    expect(parseContribution("  ")).toEqual({});
  });

  it("names no money, amount or gate, and reads as plain JSON", () => {
    const text = villageOsCardText(card);
    expect(JSON.parse(text)).toEqual(card);
    expect(text).not.toMatch(/\$\d|\binvest|\bprofit|\bdividend|\btoken amount|\bprice\b/i);
  });

  it("the card read aloud names the seats, the circles per human need and the quest", () => {
    const lines = gameLines(view, cards);
    expect(lines[0]).toBe("All this is for future generations.");
    expect(lines).toContain("Vitality is met by Living Water, Food & Fertility.");
    expect(lines.some((l) => l.startsWith("Seat: Water keeper (Living Water)"))).toBe(true);
    expect(lines).toContain("Living Water decides on when we irrigate (by consent).");
    expect(lines).toContain("Quest: Clear the spring (grows Vitality).");
  });

  it("names the gaps a project still has, and none for a whole card", () => {
    expect(cardGaps(view, cards).map((g) => g.key)).toEqual(["goal", "players", "shape"]);
    const empty = projectView([], 9);
    const gaps = cardGaps(empty, cardsForProject([], 9));
    expect(gaps[0]).toEqual({ key: "needs", label: "The human needs your project is here to meet", step: "confirm" });
    expect(gaps.map((g) => g.step)).toContain("seats");
  });

  it("an own circle is named by what comes before its colon", () => {
    expect(ownCircleName("Kitchen: feeding everyone")).toBe("Kitchen");
    expect(ownCircleName("Water Guild")).toBe("Water Guild");
  });

  it("covers all ten human needs by id", () => {
    expect(HUMAN_NEED_IDS).toHaveLength(10);
  });
});

/* ------------------------------------- the real Week 3 shapes, every project a valid card */

/**
 * The shapes production's Week 3 board holds (2026-10-14), written small:
 * a project with no application, one carried from Week 2, one that picked all
 * ten and planted no seed, one that wrote three lines; depth for only some
 * seeds; circles picked before the per-need circles existed (no c- rows);
 * and the retired "calls" answer. Every project must make a card Village OS
 * takes as it is.
 */
describe("the real Week 3 shapes", () => {
  const SAMARA = 32, TEMPLE = 33, AMORA = 34, TOA = 35;
  const W3: AnswerRow[] = [
    row("needs", "contribution", SAMARA), row("needs", "autonomy", SAMARA), row("needs", "growth", SAMARA),
    row("top", "contribution", SAMARA), row("top", "autonomy", SAMARA), row("top", "growth", SAMARA),
    row("n-contribution", "unmet", SAMARA), row("g-contribution", "thriving", SAMARA), row("b-contribution", "75", SAMARA),
    row("g-growth", "thriving", SAMARA), row("whole", "50", SAMARA), row("other", "Hope", SAMARA),
    row("circles", "purpose", SAMARA), row("circles", "organize", SAMARA), row("calls", "Organize & Co-Create", SAMARA),
    row("decide-aim", "roles", SAMARA), row("purpose", "modeling how self-love in collective resonance generates harmonic organizations", SAMARA),
    row("needs", "vitality", TEMPLE), row("needs", "play", TEMPLE), row("needs", "love", TEMPLE), row("needs", "growth", TEMPLE),
    row("top", "vitality", TEMPLE), row("top", "play", TEMPLE), row("top", "growth", TEMPLE),
    row("g-vitality", "thriving", TEMPLE), row("b-vitality", "75", TEMPLE), row("g-love", "thriving", TEMPLE),
    row("whole", "50", TEMPLE), row("other", "wisdom", TEMPLE), row("circles", "water", TEMPLE), row("circles", "festivals", TEMPLE),
    row("m-vitality", "circle", TEMPLE), row("purpose", "All this is for future generations", TEMPLE),
    ...HUMAN_NEED_IDS.map((id) => row("needs", id, AMORA)), row("whole", "25", AMORA), row("players", "31-150", AMORA),
    row("hope", "good systems for new earth organizations", TOA), row("whynow", "meeting all the needs within walking distance", TOA), row("other", "spiritual practice", TOA),
  ];
  const RUNGS = new Set<string>(NEED_RUNGS.map((r) => r.key));
  const valid = (card: VillageOsCard) => {
    for (const n of card.needs) {
      const custom = /^custom:[a-z0-9][a-z0-9-]*$/.test(n.needKey) && !HUMAN_NEED_IDS.includes(n.needKey.slice(7) as never);
      expect(HUMAN_NEED_IDS.includes(n.needKey as never) || custom, n.needKey).toBe(true);
      expect(RUNGS.has(n.depthTarget), n.depthTarget).toBe(true);
      expect(Number.isInteger(n.breadthTargetPct) && n.breadthTargetPct >= 0 && n.breadthTargetPct <= 100).toBe(true);
      expect(Number.isInteger(n.sortOrder)).toBe(true);
      if (n.label != null) expect(n.label.length).toBeLessThanOrEqual(120);
    }
    const keys = new Set(card.needs.map((n) => n.needKey));
    for (const l of card.needLinks) expect(keys.has(l.needKey), l.needKey).toBe(true);
    for (const s of card.seats) for (const l of s.needLinks) expect(keys.has(l.needKey)).toBe(true);
    // Village OS's decidesByProblem: one of its ids, and "other" only with its line.
    for (const c of card.circles) {
      if (c.decidesBy == null) continue;
      expect(DECIDES_BY.some((d) => d.key === c.decidesBy), c.decidesBy).toBe(true);
      if (c.decidesBy === "other") expect(c.decidesByGloss).toBeTruthy();
    }
    expect(JSON.parse(villageOsCardText(card))).toEqual(card);
  };

  it("every project makes a card Village OS takes as it is", () => {
    for (const [cardId, name, applicationId] of [[SAMARA, "Samara's Sanctuary Studios", null], [TEMPLE, "Templeofroots.com", 1231550], [AMORA, "Amora", null], [TOA, "Toa Hermitage", 1231543]] as const) {
      const rows = mergeProjectWeeks([{ week: 3, rows: W3.filter((r) => r.projectId === cardId) }], 900 + cardId);
      const view = projectView(rows, 900 + cardId);
      const card = toVillageOsCard({ project: name, applicationId, weeks: [3, 4], view, cards: cardsForProject(rows, 900 + cardId) });
      valid(card);
      expect(card.from.applicationId).toBe(applicationId);
      // No c- rows yet: nothing claims which circle meets which need, and the circles picked still show.
      expect(card.needLinks).toEqual([]);
      if (cardId === SAMARA) {
        expect(card.needs.map((n) => n.needKey)).toEqual(["growth", "autonomy", "contribution"]);
        expect(card.circles.filter((c) => c.startsWith).map((c) => c.circle)).toEqual(["purpose", "organize"]);
        expect(card.customNeeds).toEqual([{ needKey: "custom:hope", label: "Hope" }]);
      }
      if (cardId === AMORA) {
        expect(card.needs).toHaveLength(10);
        expect(card.needs.every((n) => n.depthTarget === "satisfied" && n.breadthTargetPct === 100)).toBe(true);
        expect(card.variables).toEqual({ "needs.totality_target_pct": 25 });
      }
      if (cardId === TOA) {
        expect(card.needs).toEqual([]);
        expect(card.customNeeds).toEqual([{ needKey: "custom:spiritual-practice", label: "spiritual practice" }]);
      }
    }
  });
});

/* ---------------------------------------- the review of 2026-10-15, pinned */

describe("why a card found only by its name waits before anyone answers", () => {
  it("today's answers on a suggested card replace Week 3's once the facilitator links it, so the stages hold until then", () => {
    // Toa's Week 3 card: love, vitality and play, a love seed and a depth answer for love.
    const last = [
      carried(3, "needs", "love", 35), carried(3, "needs", "vitality", 35), carried(3, "needs", "play", 35),
      carried(3, "top", "love", 35), carried(3, "g-love", "thriving", 35),
    ];
    // A teammate answered on the suggested card before the yes: vitality and play.
    const today = [row("needs", "vitality", 9, 10), row("needs", "play", 9, 10)];
    const view = projectView(mergeCarried(today, last, 9, new Set([35])), 9);
    expect(view.needs.map((n) => n.id).sort()).toEqual(["play", "vitality"]);
    expect(view.seeds).toEqual([]);
    expect(view.perNeed.love).toBeUndefined();
  });
});

describe("circles stay with the human needs that are on the card", () => {
  it("a human need taken off keeps no circles, even when today's c- row outlives it", () => {
    const last = [carried(3, "needs", "love", 35), carried(3, "needs", "vitality", 35)];
    const today = [row("c-love", "food", 9, 10), row("needs", "vitality", 9, 10), row("c-vitality", "water", 9, 10)];
    const merged = mergeCarried(today, last, 9, new Set([35]));
    const view = projectView(merged, 9);
    const cards = cardsForProject(merged, 9);
    expect(view.circlesFor.love).toBeUndefined();
    expect(view.circlesFor.vitality).toEqual({ water: 1 });
    expect(gameLines(view, cards).some((l) => l.startsWith("Love is met by"))).toBe(false);
    // Vitality's circle counts; take that away too and the gap shows.
    const bare = projectView([row("c-love", "food", 9), row("needs", "vitality", 9)], 9);
    expect(cardGaps(bare, cardsForProject([], 9)).map((g) => g.key)).toContain("circlesFor");
  });
});

describe("a human need of the project's own gets its circles", () => {
  const OWN = cardText("own", { label: "Spiritual practice", goal: "thriving", breadth: "75" });

  it("a circles card takes only a project's own human need and at least one known circle, deduped", () => {
    expect(cleanCard("meets", { need: "custom:spiritual-practice", circles: "festivals,own,festivals,nonsense" })).toEqual({ need: "custom:spiritual-practice", circles: "festivals,own" });
    expect(cleanCard("meets", { need: "love", circles: "festivals" })).toBeNull();
    expect(cleanCard("meets", { need: "custom:spiritual-practice", circles: "nonsense" })).toBeNull();
    expect(cleanCard("meets", { need: "custom:love", circles: "festivals" })).toBeNull();
    expect(cardKindOfKey("cown-5")).toBe("meets");
    expect(cardKindOfKey("cown-6")).toBeNull();
    const own = (p: BoardPrompt | unknown): p is BoardPrompt => !isPromptRef(p as never);
    expect(boardStages(4).find((s) => s.step === "circles")?.prompts?.filter(own).filter((p) => p.card === "meets").map((p) => p.key)).toEqual(cardSlotKeys("meets"));
    // Week 3 is unchanged: no circles cards there.
    expect(boardStages(3).some((s) => s.prompts?.filter(own).some((p) => p.card))).toBe(false);
  });

  it("Toa's shape: only its own human need, a circles card for it, and the card links it and has no circles gap", () => {
    const rows = [
      row("own-1", OWN, 9),
      row("cown-1", cardText("meets", { need: "custom:spiritual-practice", circles: "festivals,own" }), 9),
      row("cown-1", cardText("meets", { need: "custom:spiritual-practice", circles: "festivals" }), 9, 1, { id: 99_001 }),
    ];
    const view = projectView(rows, 9);
    const cards = cardsForProject(rows, 9);
    const card = toVillageOsCard({ project: "Toa Hermitage", applicationId: 1231543, weeks: [3, 4], view, cards });
    expect(card.needLinks.map((l) => [l.needKey, l.circle])).toEqual([["custom:spiritual-practice", "festivals"], ["custom:spiritual-practice", "own"]]);
    expect(circlesPerNeed(view, cards)["custom:spiritual-practice"]).toEqual({ festivals: 2, own: 1 });
    const gaps = cardGaps(view, cards).map((g) => g.key);
    expect(gaps).not.toContain("circlesFor");
    // Seeds go on the ten only: a project whose human needs are all its own has none to plant.
    expect(gaps).not.toContain("top");
    expect(gameLines(view, cards)).toContain("Spiritual practice is met by Festivals & Rites, one of our own circles.");
  });

  it("a circles card for an own human need that was taken back links nothing", () => {
    const rows = [row("cown-1", cardText("meets", { need: "custom:spiritual-practice", circles: "festivals" }), 9)];
    const view = projectView(rows, 9);
    const cards = cardsForProject(rows, 9);
    expect(toVillageOsCard({ project: "X", applicationId: null, weeks: [4], view, cards }).needLinks).toEqual([]);
    expect(circlesPerNeed(view, cards)).toEqual({});
  });
});

describe("the read-back shows every human need a card named", () => {
  it("Templeofroots.com: love picked and not seeded, and wisdom named last week", () => {
    const rows = [
      row("needs", "vitality", 9), row("needs", "love", 9), row("top", "vitality", 9),
      row("other", "wisdom", 9),
    ];
    const view = projectView(rows, 9);
    const lines = gameLines(view, cardsForProject(rows, 9));
    expect(lines).toContain("Also here to meet: Love.");
    expect(lines).toContain("Named last week, not added yet: wisdom.");
    // After the seed lines, before the whole-project line.
    expect(lines.indexOf("Also here to meet: Love.")).toBe(3);
  });

  it("Amora: all ten picked, no seeds; an own human need added is no longer listed as named", () => {
    const rows = [...HUMAN_NEED_IDS.map((id) => row("needs", id, 9)), row("other", "Hope", 9), row("own-1", cardText("own", { label: "Hope", goal: "thriving", breadth: "100" }), 9)];
    const view = projectView(rows, 9);
    const beyond = needsBeyondSeeds(view, new Set(["custom:hope"]));
    expect(beyond[0].startsWith("Here to meet: ")).toBe(true);
    expect(beyond).toHaveLength(1);
    expect(cardLinesWithNeeds(view, new Set(["custom:hope"]))[2]).toBe(beyond[0]);
  });
});

describe("how a circle decides, in Village OS's own ids", () => {
  // village-os shared/power.ts DECIDES_BY (origin/main 1be7043, 2026-10-14). Village OS refuses any other id.
  const VILLAGE_OS_DECIDES_BY = ["consent", "consensus", "majority", "lead_decides", "elders_decide", "founder_decides", "do_ocracy", "delegated", "hypha", "other"];

  it("every key is one of Village OS's ids, and covers all of them", () => {
    expect(DECIDES_BY.map((d) => d.key)).toEqual(VILLAGE_OS_DECIDES_BY);
  });

  const card = (rows: AnswerRow[]) => toVillageOsCard({ project: "X", applicationId: null, weeks: [4], view: projectView(rows, 9), cards: cardsForProject(rows, 9) });
  const dec = (slot: number, d: { circle: string; decidesOn: string; how?: string; gloss?: string }) => row(`dec-${slot}`, cardText("decide", d as never), 9, slot);

  it("a pick goes across as its id", () => {
    const c = card([dec(1, { circle: "food", decidesOn: "what we plant", how: "do_ocracy" })]);
    expect(c.circles.find((x) => x.circle === "food")).toMatchObject({ decidesBy: "do_ocracy", decidesByGloss: null, decidesByAnswers: [{ by: "do_ocracy", gloss: null }] });
  });

  it("another way takes its line: without one the card isn't whole, with one the line goes across", () => {
    expect(cleanCard("decide", { circle: "food", decidesOn: "what we plant", how: "other" })).toBeNull();
    expect(cleanCard("decide", { circle: "food", decidesOn: "what we plant", how: "other", gloss: "the two families who farm it" })).toEqual({ circle: "food", decidesOn: "what we plant", how: "other", gloss: "the two families who farm it" });
    expect(cleanCard("decide", { circle: "food", decidesOn: "what we plant", how: "other", gloss: "x".repeat(400) })?.gloss).toHaveLength(CARD_LIMITS.gloss);
    const c = card([dec(1, { circle: "food", decidesOn: "what we plant", how: "other", gloss: "the two families who farm it" })]);
    expect(c.circles.find((x) => x.circle === "food")).toMatchObject({ decidesBy: "other", decidesByGloss: "the two families who farm it" });
    expect(cardLine("decide", { circle: "food", decidesOn: "what we plant", how: "other", gloss: "The two families who farm it" })).toBe("Food & Fertility decides on what we plant (the two families who farm it)");
  });

  it("cards that disagree on one circle carry no way, list each one, and show as a gap", () => {
    const rows = [dec(1, { circle: "water", decidesOn: "when we irrigate", how: "consent" }), dec(2, { circle: "water", decidesOn: "who takes water", how: "lead_decides" })];
    const c = card(rows);
    expect(c.circles.find((x) => x.circle === "water")).toMatchObject({ decidesBy: null, decidesByAnswers: [{ by: "consent", gloss: null }, { by: "lead_decides", gloss: null }] });
    expect(cardGaps(projectView(rows, 9), cardsForProject(rows, 9)).map((g) => g.key)).toContain("decides-by:water");
    const agree = [dec(1, { circle: "water", decidesOn: "when we irrigate", how: "consent" }), dec(2, { circle: "water", decidesOn: "who takes water", how: "consent" }), dec(3, { circle: "water", decidesOn: "the tank", })];
    expect(card(agree).circles.find((x) => x.circle === "water")?.decidesBy).toBe("consent");
    expect(cardGaps(projectView(agree, 9), cardsForProject(agree, 9)).map((g) => g.key)).not.toContain("decides-by:water");
  });
});
