/**
 * The Village profile (ADR-77): one land project's Village OS 1.0, gathered
 * from its application, its hosting request, every weekly board and its
 * stewards' own answers. These cases use the shapes the real Week 3 and
 * Week 4 boards hold (a synthetic copy; the real rows never leave the
 * database): a project with full answers, one with gaps, and one with none.
 */
import { describe, expect, it } from "vitest";
import { cardText } from "./boardCards";
import type { AnswerRow } from "./humanNeeds";
import {
  buildProfile,
  checkAnswer,
  mergedRows,
  PROFILE_REFUSALS,
  type ProfileSources,
  type ProfileWeek,
} from "./projectProfile";
import { VILLAGE_DECISIONS, villageDecision, DECISION_KEY_RE, VILLAGE_MODULES, decisionsOf } from "./villageDecisions";
import { toVillageFile, villageFileName, VILLAGE_FILE_SCHEMA } from "./villageFile";
import { VILLAGE_CARD_SCHEMA } from "./villageOsCard";

let id = 0;
const row = (block: string, text: string, projectId: number, at = "2026-10-14T17:30:00Z"): AnswerRow => ({
  id: ++id, kind: "answer", block, text, projectId, createdAt: at,
});

const week = (n: number, cardId: number, rows: AnswerRow[], extra: Partial<ProfileWeek> = {}): ProfileWeek => ({
  week: n, cards: [{ id: cardId, name: "Templeofroots.com" }], rows, pains: [], opps: [], phase: null, whereNow: null, nextMove: null, ...extra,
});

/** Templeofroots.com's Week 3 shape: four human needs, three seeds, goals and breadth, whole 50%, circles, a rite. */
const week3 = week(3, 33, [
  row("needs", "vitality", 33), row("needs", "play", 33), row("needs", "love", 33), row("needs", "growth", 33),
  row("top", "vitality", 33), row("top", "play", 33), row("top", "growth", 33),
  row("n-vitality", "alive", 33), row("g-vitality", "thriving", 33), row("b-vitality", "75", 33),
  row("n-play", "unmet", 33), row("g-play", "thriving", 33), row("b-play", "75", 33),
  row("n-growth", "alive", 33), row("g-growth", "thriving", 33), row("b-growth", "75", 33),
  row("whole", "50", 33),
  row("purpose", "future generations", 33),
  row("circles", "water", 33), row("circles", "festivals", 33),
  row("rite", "Ifa initiation", 33),
  row("players", "13-30", 33), row("players-now", "under-6", 33),
  // A retired Week 3 prompt still in the data.
  row("calls", "organize obviously because I am the founder", 33),
]);

/** Week 4 adds a seat, a circle's way of deciding, a quest and the first step in. */
const week4 = week(4, 71, [
  row("seat-1", cardText("seat", { name: "Water keeper", circle: "water", need: "vitality", aim: "Living water for every household", answersFor: "The spring and the catchment", heldBy: "open", who: "", contribution: "4 hours a week" }), 71, "2026-10-21T18:00:00Z"),
  row("dec-1", cardText("decide", { circle: "water", decidesOn: "How the spring is shared", how: "consent" }), 71, "2026-10-21T18:10:00Z"),
  row("quest-1", cardText("quest", { quest: "Plant twelve chestnuts along the north fence", need: "vitality" }), 71, "2026-10-21T18:20:00Z"),
  row("entry", "Come to a work day, then a welcome circle", 71, "2026-10-21T18:25:00Z"),
  // Week 4 changes the whole-project figure: the later week wins.
  row("whole", "75", 71, "2026-10-21T18:30:00Z"),
]);

const base = (over: Partial<ProfileSources> = {}): ProfileSources => ({
  application: { id: 1231550, projectName: "Templeofroots.com", location: "New Mexico", country: "United States", vision: "A sanctuary", latitude: 35.1, intendedPeopleCount: 30, status: "submitted" },
  request: null,
  tools: ["Hypha"],
  weeks: [week3, week4],
  stored: {},
  ...over,
});

describe("the decision list", () => {
  it("keys are unique, fit the store and name a real module", () => {
    const keys = VILLAGE_DECISIONS.map((d) => d.key);
    expect(new Set(keys).size).toBe(keys.length);
    const modules = new Set(VILLAGE_MODULES.map((m) => m.key));
    for (const d of VILLAGE_DECISIONS) {
      expect(d.key).toMatch(DECISION_KEY_RE);
      expect(d.key.length).toBeLessThanOrEqual(48);
      expect(modules.has(d.module)).toBe(true);
      expect(d.weeks.every((w) => w >= 1 && w <= 13)).toBe(true);
      if (d.kind === "choice" || d.kind === "multi") expect(d.options?.length).toBeGreaterThan(0);
    }
    for (const m of VILLAGE_MODULES) expect(decisionsOf(m.key).length).toBeGreaterThan(0);
  });

  it("holds every decision Village OS's launch waits on that has no default", () => {
    // Village OS main 1be7043: brand basics, the purpose statement, founders,
    // modules decided, the issuance cap, the pool token and the exit policy.
    for (const key of ["identity.name", "identity.tagline", "identity.location", "purpose.statement", "decide.founders", "modules.on", "economy.issuanceCap", "economy.poolToken", "legal.exitPolicy"]) {
      expect(villageDecision(key)?.blocksLaunch, key).toBe(true);
    }
  });

  it("never offers a module that moves money", () => {
    const on = villageDecision("modules.on")!.options!.map((o) => o.key);
    for (const k of ["exchange", "redemption", "commerce"]) expect(on).not.toContain(k);
  });

  it("copy follows the writing rules", () => {
    const words = VILLAGE_DECISIONS.flatMap((d) => [d.title, d.hint ?? "", d.default ?? "", ...(d.options ?? []).map((o) => o.label)]).join("\n");
    expect(words).not.toMatch(/[–—]/);
    expect(words).not.toMatch(/\b(delve|journey|unlock|empower|seamless|tapestry|foster|leverage)\b/i);
  });
});

describe("merging the weeks", () => {
  it("a later week wins each question, and the rest comes forward", () => {
    const rows = mergedRows([week3, week4]);
    const whole = rows.filter((r) => r.block === "whole").map((r) => r.text);
    expect(whole).toEqual(["75"]);
    expect(rows.some((r) => r.block === "rite" && r.text === "Ifa initiation")).toBe(true);
    expect(rows.some((r) => r.block === "seat-1")).toBe(true);
  });
});

describe("buildProfile", () => {
  it("suggests from every source and confirms nothing on its own", () => {
    const p = buildProfile(base());
    expect(p.weeks).toEqual([3, 4]);
    const by = new Map(p.decisions.map((d) => [d.key, d]));
    expect(by.get("identity.name")).toMatchObject({ status: "suggested", suggestion: "Templeofroots.com", from: "From your application" });
    expect(by.get("identity.location")?.suggestion).toBe("New Mexico, United States");
    expect(by.get("identity.hemisphere")?.suggestion).toBe("north");
    expect(by.get("identity.tagline")?.suggestion).toBe("All this is for future generations");
    expect(by.get("membership.rite")?.suggestion).toBe("Ifa initiation");
    expect(by.get("membership.entry")?.suggestion).toBe("Come to a work day, then a welcome circle");
    expect(by.get("network.tools")?.suggestion).toEqual({ tools: ["Hypha"] });
    // Nothing is the project's own until a steward says so.
    expect(p.decisions.every((d) => d.status !== "yours")).toBe(true);
  });

  it("carries the board card's needs, circles, seats, decisions and quests as blocks", () => {
    const p = buildProfile(base());
    const by = new Map(p.decisions.map((d) => [d.key, d]));
    const needs = by.get("needs.scope")!.suggestion as { needs: { needKey: string }[]; variables: Record<string, number> };
    expect(needs.needs.map((n) => n.needKey).slice(0, 3).sort()).toEqual(["growth", "play", "vitality"]);
    expect(needs.variables["needs.totality_target_pct"]).toBe(75);
    const seats = by.get("seats.cards")!.suggestion as { seats: { name: string; contribution: { hoursPerWeek?: number }; needLinks: { weight: string }[] }[] };
    expect(seats.seats[0]).toMatchObject({ name: "Water keeper", contribution: { hoursPerWeek: 4 } });
    expect(seats.seats[0].needLinks[0].weight).toBe("primary");
    const circles = by.get("circles.list")!.suggestion as { circles: { circle: string; decidesBy: string | null }[] };
    expect(circles.circles.find((c) => c.circle === "water")?.decidesBy).toBe("consent");
    expect(by.get("quests.first")!.lines[0]).toMatch(/chestnuts/);
    expect(by.get("seats.cards")!.lines[0]).toMatch(/^Water keeper, Living Water: Living water for every household\. Meets Vitality/);
  });

  it("drafts the purpose statement in Village OS's five parts", () => {
    const p = buildProfile(base({ weeks: [{ ...week3, week: 3 }, week4, week(2, 12, [], { pains: ["Too few hands for the land"] })] }));
    const draft = p.decisions.find((d) => d.key === "purpose.statement")!.suggestion as string;
    expect(draft).toMatch(/^Who it serves: Templeofroots\.com serves the 30 people it means to hold, and its land, in New Mexico\./);
    expect(draft).toMatch(/What they're up against: Too few hands for the land\./);
    expect(draft).toMatch(/Vitality is alive today, and we want it thriving in three years/);
    expect(draft).toMatch(/By what means: .*Living Water/);
    expect(draft).toMatch(/What becomes true: All this is for future generations\./);
  });

  it("a project with no board answers gets no draft and open blocks", () => {
    const p = buildProfile(base({ weeks: [], tools: [] }));
    const by = new Map(p.decisions.map((d) => [d.key, d]));
    expect(by.get("purpose.statement")?.status).toBe("open");
    expect(by.get("seats.cards")?.status).toBe("open");
    expect(by.get("decide.voting")?.status).toBe("default");
    expect(p.weeks).toEqual([]);
  });

  it("a steward's answer is the project's own, and a confirmed block says when the boards move on", () => {
    const first = buildProfile(base());
    const seatsNow = first.decisions.find((d) => d.key === "seats.cards")!.suggestion;
    const p = buildProfile(base({
      stored: {
        "identity.name": { value: "Temple of Roots", how: "answered", updatedAt: "2026-10-21T19:00:00Z", updatedBy: 7 },
        "seats.cards": { value: { seats: [] }, how: "confirmed", updatedAt: "2026-10-21T19:00:00Z", updatedBy: 7 },
        "needs.scope": { value: first.decisions.find((d) => d.key === "needs.scope")!.suggestion, how: "confirmed", updatedAt: "2026-10-21T19:00:00Z", updatedBy: 7 },
      },
    }));
    const by = new Map(p.decisions.map((d) => [d.key, d]));
    expect(by.get("identity.name")).toMatchObject({ status: "yours", value: "Temple of Roots" });
    expect(by.get("seats.cards")).toMatchObject({ status: "yours", changed: true });
    expect(by.get("seats.cards")!.suggestion).toEqual(seatsNow);
    expect(by.get("needs.scope")!.changed).toBe(false);
  });

  it("counts launch decisions: the stewards' own and Village OS defaults are ready", () => {
    const p = buildProfile(base());
    // Only the pool token has a default among the launch decisions.
    expect(p.launch.ready).toBe(1);
    expect(p.launch.total).toBe(VILLAGE_DECISIONS.filter((d) => d.blocksLaunch).length);
    expect(p.launch.open).toContain("purpose.statement");
  });

  it("suggests modules from the answers, never a money module", () => {
    const p = buildProfile(base());
    const suggested = p.decisions.find((d) => d.key === "modules.on")!.suggestion as string[];
    expect(suggested).toEqual(expect.arrayContaining(["map", "governance", "events"]));
  });
});

describe("checkAnswer", () => {
  const d = (k: string) => villageDecision(k)!;
  it("cleans words and refuses empty or too long", () => {
    expect(checkAnswer(d("identity.name"), "  Temple   of Roots ")).toEqual({ ok: true, value: "Temple of Roots" });
    expect(checkAnswer(d("identity.name"), "   ")).toEqual({ ok: false, message: PROFILE_REFUSALS.empty });
    expect(checkAnswer(d("identity.name"), "x".repeat(121))).toEqual({ ok: false, message: PROFILE_REFUSALS.tooLong });
  });
  it("takes a number or no cap, inside Village OS's range", () => {
    expect(checkAnswer(d("economy.issuanceCap"), "none")).toEqual({ ok: true, value: "none" });
    expect(checkAnswer(d("economy.issuanceCap"), "5000")).toEqual({ ok: true, value: 5000 });
    expect(checkAnswer(d("economy.issuanceCap"), 20_000_000)).toEqual({ ok: false, message: PROFILE_REFUSALS.range });
    expect(checkAnswer(d("economy.issuanceCap"), "lots")).toEqual({ ok: false, message: PROFILE_REFUSALS.number });
  });
  it("takes only listed choices, and keeps a multi-pick in the list's order", () => {
    expect(checkAnswer(d("identity.hemisphere"), "south")).toEqual({ ok: true, value: "south" });
    expect(checkAnswer(d("identity.hemisphere"), "east")).toEqual({ ok: false, message: PROFILE_REFUSALS.option });
    expect(checkAnswer(d("modules.on"), ["events", "map"])).toEqual({ ok: true, value: ["map", "events"] });
    expect(checkAnswer(d("modules.on"), ["exchange"])).toEqual({ ok: false, message: PROFILE_REFUSALS.option });
  });
  it("never takes typed words for a board block", () => {
    expect(checkAnswer(d("seats.cards"), "anything")).toEqual({ ok: false, message: PROFILE_REFUSALS.block });
  });
});

describe("the 1.0 file", () => {
  it("carries only the stewards' own answers, and the card from confirmed parts", () => {
    const first = buildProfile(base());
    const needs = first.decisions.find((d) => d.key === "needs.scope")!.suggestion;
    const p = buildProfile(base({
      stored: {
        "identity.name": { value: "Temple of Roots", how: "answered", updatedAt: "x", updatedBy: 7 },
        "needs.scope": { value: needs, how: "confirmed", updatedAt: "x", updatedBy: 7 },
        "economy.issuanceCap": { value: "none", how: "answered", updatedAt: "x", updatedBy: 7 },
        "modules.on": { value: ["map", "events"], how: "answered", updatedAt: "x", updatedBy: 7 },
      },
    }));
    const file = toVillageFile(p, { now: new Date("2026-10-21T20:00:00Z") });
    expect(file.schema).toBe(VILLAGE_FILE_SCHEMA);
    expect(file.card.schema).toBe(VILLAGE_CARD_SCHEMA);
    expect(file.identity.name).toBe("Temple of Roots");
    // Suggested, not kept: stays out.
    expect(file.identity.location).toBeNull();
    expect(file.card.seats).toEqual([]);
    expect(file.card.needs.length).toBeGreaterThan(0);
    expect(file.economy.issuanceCap).toBe("none");
    expect(file.modules.on).toEqual(["map", "events"]);
    expect(file.status["identity.location"]).toEqual({ status: "suggested", from: "From your application" });
    expect(file.status["identity.name"]).toEqual({ status: "yours", from: "Your stewards" });
    expect(file.from).toMatchObject({ applicationId: 1231550, project: "Templeofroots.com", weeks: [3, 4] });
  });

  it("pins the top-level shape Village OS's importer reads", () => {
    const file = toVillageFile(buildProfile(base()), { now: new Date(0) });
    expect(Object.keys(file)).toEqual([
      "schema", "generatedAt", "from", "card", "identity", "purpose", "membership", "seats", "decide",
      "quests", "seasons", "modules", "economy", "legal", "network", "launch", "status",
    ]);
    expect(Object.keys(file.status).sort()).toEqual(VILLAGE_DECISIONS.map((d) => d.key).sort());
  });

  it("names the download after the project", () => {
    expect(villageFileName("Templeofroots.com")).toBe("templeofroots-com-village-os-1.0.json");
    expect(villageFileName("   ")).toBe("village-village-os-1.0.json");
  });
});
