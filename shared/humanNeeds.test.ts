/**
 * The ten human needs on the Week 3 board (shared/humanNeeds.ts): pinned to
 * Village OS's own list so Week 4 is a paste, and the pure views every stage,
 * the profile and the export read.
 */
import { describe, expect, it } from "vitest";
import {
  BREADTH_STOPS,
  HUMAN_NEEDS,
  HUMAN_NEED_IDS,
  MEET_WAYS,
  NEED_RUNGS,
  WHOLE_STOPS,
  customNeedKey,
  needShort,
  needsSummary,
  othersLine,
  perNeedKeys,
  projectCardLines,
  projectView,
  rungLabel,
  rungMeaning,
  shownAnswerRows,
  toVillageOsScope,
  type AnswerRow,
} from "./humanNeeds";
import { promptsForWeek } from "./sessionBoard";

/**
 * Village OS's `HUMAN_NEEDS` and `NEED_DEPTHS` (village-os shared/needs.ts on
 * origin/main 07df8d8, read 2026-10-13), copied literally. Its ids are "never
 * renamed": they are written into `village_needs.need_key`. If this test fails,
 * Village OS changed, or this file drifted. Fix the drift, never the pin.
 */
const VILLAGE_OS_HUMAN_NEEDS = [
  { id: "vitality", label: "Vitality & Survival Needs", hue: "#009E73" },
  { id: "significance", label: "Significance", hue: "#E69F00" },
  { id: "love", label: "Love", hue: "#CC79A7" },
  { id: "growth", label: "Growth", hue: "#56B4E9" },
  { id: "contribution", label: "Contribution", hue: "#0072B2" },
  { id: "routine", label: "Routine", hue: "#946B2D" },
  { id: "diversity", label: "Diversity", hue: "#8B7DD8" },
  { id: "autonomy", label: "Autonomy", hue: "#33BBC5" },
  { id: "play", label: "Play", hue: "#F0E442" },
  { id: "honesty", label: "Honesty", hue: "#D55E00" },
];
const VILLAGE_OS_NEED_DEPTHS = ["deprived", "unmet", "alive", "satisfied", "thriving"];
const VILLAGE_OS_DEPTH_LABELS = ["Deprived", "Unmet", "Alive", "Satisfied", "Thriving"];

let nextId = 1;
function row(block: string, text: string, projectId: number | null, at: number, extra: Partial<AnswerRow> = {}): AnswerRow {
  return { id: nextId++, kind: "answer", block, text, projectId, createdAt: new Date(1_800_000_000_000 + at * 1000), ...extra };
}

describe("the ten human needs", () => {
  it("are Village OS's ids, labels and colours, in its order", () => {
    expect(HUMAN_NEEDS.map((n) => ({ id: n.id, label: n.label, hue: n.hue }))).toEqual(VILLAGE_OS_HUMAN_NEEDS);
    expect(HUMAN_NEED_IDS).toEqual(VILLAGE_OS_HUMAN_NEEDS.map((n) => n.id));
  });

  it("climb Village OS's five rungs, lowest first", () => {
    expect(NEED_RUNGS.map((r) => r.key)).toEqual(VILLAGE_OS_NEED_DEPTHS);
    expect(NEED_RUNGS.map((r) => r.label)).toEqual(VILLAGE_OS_DEPTH_LABELS);
  });

  it("every card has a plain line and the deck's words, and the board's cards use them", () => {
    for (const n of HUMAN_NEEDS) {
      expect(n.plain.length, n.id).toBeGreaterThan(10);
      expect(n.deck.length, n.id).toBeGreaterThan(5);
      expect(n.hue, n.id).toMatch(/^#[0-9A-F]{6}$/);
    }
    const picks = promptsForWeek(3).get("needs")!;
    expect(picks.options!.map((o) => o.key)).toEqual(HUMAN_NEED_IDS);
    expect(picks.options!.map((o) => o.label)).toEqual(HUMAN_NEEDS.map((n) => n.label));
  });

  it("every per-need key fits the items table's block column", () => {
    for (const id of HUMAN_NEED_IDS) for (const k of perNeedKeys(id)) expect(k.length, k).toBeLessThanOrEqual(16);
  });

  it("say what each rung means for a project", () => {
    expect(rungMeaning("deprived", "love")).toBe("Love goes unmet here, and your project isn't taking that on.");
    expect(rungMeaning("unmet", "love")).toBe("Your project sees love is short and hasn't built for it yet.");
    expect(rungMeaning("alive", "vitality")).toBe("Vitality is alive here, and nobody can count on it yet.");
    expect(rungMeaning("satisfied", "vitality")).toBe("Your people can count on your project for vitality.");
    expect(rungMeaning("thriving", "play")).toBe("People come here for play. It's one of the reasons your project exists.");
    expect(rungLabel("satisfied")).toBe("Satisfied");
    expect(needShort("vitality")).toBe("Vitality");
  });

  it("breadth and the whole are whole percents, the way village_needs keeps them", () => {
    expect(BREADTH_STOPS.map((b) => Number(b.key))).toEqual([10, 25, 50, 75, 100]);
    expect(WHOLE_STOPS.map((b) => Number(b.key))).toEqual([10, 25, 50, 75, 100]);
    expect(MEET_WAYS.map((w) => w.key)).toEqual(["play", "household", "circle", "market", "holder"]);
  });

  it("a village's own human need takes Village OS's custom key", () => {
    expect(customNeedKey("Sacred Rest!")).toBe("custom:sacred-rest");
    expect(customNeedKey("   ")).toBe("custom:unnamed");
  });
});

describe("one project's card (projectView)", () => {
  it("plants the three seeds with the most seeds, a tie going to the most recent", () => {
    const items = [
      row("top", "love", 1, 1), row("top", "love", 1, 2), // love: 2
      row("top", "play", 1, 3), // play: 1, older
      row("top", "growth", 1, 9), // growth: 1, newest
      row("top", "honesty", 1, 5), // honesty: 1
      row("top", "vitality", 2, 99), row("top", "vitality", 2, 99), row("top", "vitality", 2, 99), // another project
    ];
    const v = projectView(items, 1);
    expect(v.seeds).toEqual(["love", "growth", "honesty"]);
    expect(v.seedCounts).toMatchObject({ love: 2, play: 1, growth: 1, honesty: 1 });
  });

  it("counts picks by people, a seed counting as a pick, and leaves hidden rows and other projects out", () => {
    const items = [
      row("needs", "love", 1, 1), row("needs", "love", 1, 2), row("needs", "love", 1, 3),
      row("needs", "play", 1, 4), row("needs", "play", 1, 5),
      row("needs", "vitality", 1, 6),
      row("top", "growth", 1, 7),
      row("needs", "honesty", 1, 8, { hidden: true }),
      row("needs", "autonomy", 2, 9),
      row("needs", "bogus", 1, 10),
    ];
    const v = projectView(items, 1);
    expect(v.needs).toEqual([
      { id: "love", people: 3 },
      { id: "play", people: 2 },
      { id: "vitality", people: 1 },
      { id: "growth", people: 1 },
    ]);
    expect(v.answered).toBe(true);
    expect(projectView(items, 99).answered).toBe(false);
  });

  it("shows the latest single answer, with a line when the project's people differ", () => {
    const items = [
      row("g-love", "unmet", 1, 1),
      row("g-love", "unmet", 1, 2),
      row("g-love", "alive", 1, 3),
      row("g-love", "thriving", 1, 10), // the latest
    ];
    const goal = projectView(items, 1).perNeed.love!.goal;
    expect(goal.value).toBe("thriving");
    expect(goal.people).toBe(4);
    expect(goal.others).toEqual([{ value: "unmet", people: 2 }, { value: "alive", people: 1 }]);
    expect(othersLine(goal.others, rungLabel)).toBe("2 of you say Unmet. 1 of you says Alive.");
    expect(othersLine([], rungLabel)).toBe("");
  });

  it("a row painted before its save (negative id, same second) counts as the newest", () => {
    const items = [row("whole", "25", 1, 5), { ...row("whole", "100", 1, 5), id: -1_800_000_000_000 }];
    expect(projectView(items, 1).whole.value).toBe("100");
  });

  it("keeps the latest words as the headline and the rest under it", () => {
    const items = [row("purpose", "a home for twelve families", 1, 1), row("purpose", "twelve families living well", 1, 5)];
    const v = projectView(items, 1);
    expect(v.purpose).toEqual({ latest: "twelve families living well", others: ["a home for twelve families"] });
    expect(v.living).toEqual({ latest: null, others: [] });
  });

  it("reads the room's own answers when the project is null", () => {
    const items = [row("needs", "love", null, 1), row("needs", "play", 3, 1)];
    expect(projectView(items, null).needs).toEqual([{ id: "love", people: 1 }]);
  });
});

describe("the card read aloud, and the Village OS export", () => {
  const items = [
    row("purpose", "twelve families living well on land we heal together", 7, 1),
    row("needs", "vitality", 7, 1), row("needs", "love", 7, 1), row("needs", "play", 7, 1), row("needs", "growth", 7, 1),
    row("top", "vitality", 7, 2), row("top", "vitality", 7, 2), row("top", "love", 7, 3), row("top", "play", 7, 2),
    row("n-vitality", "alive", 7, 4), row("g-vitality", "thriving", 7, 4), row("b-vitality", "100", 7, 4), row("m-vitality", "circle", 7, 4),
    row("n-love", "unmet", 7, 4), row("g-love", "satisfied", 7, 4), row("b-love", "100", 7, 4), row("m-love", "play", 7, 4),
    row("g-play", "thriving", 7, 4), row("b-play", "75", 7, 4),
    row("whole", "50", 7, 5),
    row("circles", "food", 7, 6), row("circles", "festivals", 7, 6),
    row("players", "6-12", 7, 6), row("players-now", "under-6", 7, 6),
  ];

  it("reads like the spec's Toa Hermitage card", () => {
    expect(projectCardLines(projectView(items, 7))).toEqual([
      "All this is for twelve families living well on land we heal together.",
      "Seeds: Vitality, Love, Play.",
      "Vitality: Alive today, Thriving in three years, for everyone, met by a circle of people in roles.",
      "Love: Unmet today, Satisfied in three years, for everyone, met by festivals, rites and play.",
      "Play: today not chosen yet, Thriving in three years, for most of us, who meets it not chosen yet.",
      "Means to meet about half of its people's human needs.",
      "Circles first: Food & Fertility, Festivals & Rites. Players to start: 6 to 12. Playing now: Under 6.",
    ]);
  });

  it("an empty card says not chosen yet", () => {
    expect(projectCardLines(projectView([], 1))).toEqual([
      "All this is for: not chosen yet.",
      "Seeds: not chosen yet.",
      "How much of its people's human needs it means to meet: not chosen yet.",
      "Circles first: not chosen yet. Players to start: not chosen yet. Playing now: not chosen yet.",
    ]);
  });

  it("toVillageOsScope returns the body Village OS's scope write takes: seeds first, defaults for the rest", () => {
    expect(toVillageOsScope(projectView(items, 7))).toEqual({
      needs: [
        { needKey: "vitality", depthTarget: "thriving", breadthTargetPct: 100, sortOrder: 1 },
        { needKey: "love", depthTarget: "satisfied", breadthTargetPct: 100, sortOrder: 2 },
        { needKey: "play", depthTarget: "thriving", breadthTargetPct: 75, sortOrder: 3 },
        { needKey: "growth", depthTarget: "satisfied", breadthTargetPct: 100, sortOrder: 4 },
      ],
      totalityTargetPct: 50,
    });
    expect(toVillageOsScope(projectView([], 1))).toEqual({ needs: [] });
  });

  it("the room's summary counts projects, picks, seeds and the way each seed is met", () => {
    const more = [...items, row("needs", "love", 8, 9), row("top", "love", 8, 9), row("m-love", "circle", 8, 9), row("mate", "some", null, 9)];
    const s = needsSummary(more);
    expect(s.projects).toBe(2);
    const love = s.needs.find((n) => n.id === "love")!;
    expect(love).toMatchObject({ projects: 2, picks: 2, seeds: 2, seedProjects: 2 });
    expect(love.goal.satisfied).toBe(1);
    expect(love.meet).toEqual({ play: 1, household: 0, circle: 1, market: 0, holder: 0 });
    expect(s.meet).toEqual({ play: 1, household: 0, circle: 2, market: 0, holder: 0 });
    expect(s.whole["50"]).toBe(1);
    expect(s.circles.food).toBe(1);
    expect(s.players["6-12"]).toBe(1);
    expect(s.decideNow.founder).toBe(0);
    expect(Object.keys(s.needs[0].today)).toEqual(["deprived", "unmet", "alive", "satisfied", "thriving"]);
  });

  it("reads the views from shown rows only: no hidden row, nothing on a hidden card", () => {
    // A facilitator's get returns hidden cards and their rows; the room views must count what everyone sees.
    const all = [row("needs", "love", 1, 1), row("needs", "play", 2, 2), row("needs", "growth", 1, 3, { hidden: true }), row("needs", "routine", null, 4)];
    const shown = shownAnswerRows(all, [2]);
    expect(shown.map((r) => r.text)).toEqual(["love", "routine"]);
    expect(needsSummary(shown).projects).toBe(1);
    expect(shownAnswerRows(all, new Set<number>()).length).toBe(3);
  });
});
