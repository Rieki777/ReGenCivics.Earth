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
  stampOf,
  PROFILE_REFUSALS,
  type ProfileSources,
  type ProfileWeek,
  type StoredAnswer,
} from "./projectProfile";
import {
  CAP_KEEP_DEFAULT,
  DECISION_KEY_RE,
  VILLAGE_DECISIONS,
  VILLAGE_MODULES,
  VILLAGE_OS_MONEY_MODULES,
  decisionsOf,
  villageDecision,
} from "./villageDecisions";
import { toVillageFile, villageFileName, VILLAGE_FILE_SCHEMA } from "./villageFile";
import { VILLAGE_CARD_SCHEMA } from "./villageOsCard";

let id = 0;
const row = (block: string, text: string, projectId: number, at = "2026-10-14T17:30:00Z"): AnswerRow => ({
  id: ++id, kind: "answer", block, text, projectId, createdAt: at,
});

const week = (n: number, cardId: number, rows: AnswerRow[], extra: Partial<ProfileWeek> = {}): ProfileWeek => ({
  week: n, cards: [{ id: cardId, name: "Templeofroots.com" }], rows, pains: [], opps: [], phase: null, whereNow: null, nextMove: null, ...extra,
});

const kept = (value: unknown, how: StoredAnswer["how"] = "answered"): StoredAnswer => ({ value, how, updatedAt: "2026-10-21T19:00:00Z" });

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
  row("dec-1", cardText("decide", { circle: "water", decidesOn: "How the spring is shared", how: "lead_decides" }), 71, "2026-10-21T18:10:00Z"),
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

const words = (n: number) => Array.from({ length: n }, (_, i) => `word${i}`).join(" ");

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

  it("marks exactly the decisions Village OS's launch waits on (village-os main 5890dd2)", () => {
    // brand-basics (the name), gps-written, founder-appointed and the roll, modules-decided, issuance-cap, exit-policy-terms.
    const blocking = VILLAGE_DECISIONS.filter((d) => d.blocksLaunch).map((d) => d.key).sort();
    expect(blocking).toEqual(["decide.founders", "economy.issuanceCap", "identity.name", "legal.exitPolicy", "modules.on", "purpose.statement"].sort());
  });

  it("never offers a module that moves or raises money", () => {
    const on = villageDecision("modules.on")!.options!.map((o) => o.key);
    for (const k of VILLAGE_OS_MONEY_MODULES) expect(on).not.toContain(k);
    expect(VILLAGE_OS_MONEY_MODULES).toEqual(expect.arrayContaining(["exchange", "redemption", "commerce", "stays", "crowdpool"]));
  });

  it("copy follows the writing rules", () => {
    const all = VILLAGE_DECISIONS.flatMap((d) => [d.title, d.hint ?? "", d.default ?? "", ...(d.options ?? []).map((o) => o.label)]).join("\n");
    const refusals = Object.values(PROFILE_REFUSALS).join("\n");
    for (const text of [all, refusals]) {
      expect(text).not.toMatch(/[–—]/);
      expect(text).not.toMatch(/\b(delve|journey|unlock|empower|seamless|tapestry|foster|leverage)\b/i);
    }
  });
});

describe("merging the weeks", () => {
  it("a later week wins each question, and the rest comes forward", () => {
    const rows = mergedRows([week3, week4]);
    expect(rows.filter((r) => r.block === "whole").map((r) => r.text)).toEqual(["75"]);
    expect(rows.some((r) => r.block === "rite" && r.text === "Ifa initiation")).toBe(true);
    expect(rows.some((r) => r.block === "seat-1")).toBe(true);
  });
});

describe("buildProfile", () => {
  it("suggests from every source and keeps nothing on its own", () => {
    const p = buildProfile(base());
    expect(p.weeks).toEqual([3, 4]);
    const by = new Map(p.decisions.map((d) => [d.key, d]));
    expect(by.get("identity.name")).toMatchObject({ status: "suggested", suggestion: "Templeofroots.com", from: "From your application", keepable: true });
    expect(by.get("identity.location")?.suggestion).toBe("New Mexico, United States");
    expect(by.get("identity.hemisphere")?.suggestion).toBe("north");
    expect(by.get("identity.tagline")?.suggestion).toBe("All this is for future generations.");
    expect(by.get("membership.rite")?.suggestion).toBe("Ifa initiation");
    expect(by.get("membership.entry")?.suggestion).toBe("Come to a work day, then a welcome circle");
    expect(by.get("network.tools")?.suggestion).toEqual({ tools: ["Hypha"] });
    expect(by.get("quests.tokenName")?.status).toBe("open");
    expect(p.decisions.every((d) => d.status !== "yours")).toBe(true);
    // Every suggestion carries the stamp "Keep this" sends back.
    for (const d of p.decisions) expect(d.stamp).toBe(d.suggestion == null ? null : stampOf(d.suggestion));
  });

  it("carries the board card's needs, circles, seats, decisions and quests as blocks, in plain lines", () => {
    const p = buildProfile(base());
    const by = new Map(p.decisions.map((d) => [d.key, d]));
    const needs = by.get("needs.scope")!.suggestion as { needs: { needKey: string }[]; variables: Record<string, number>; unset: string[] };
    expect(needs.needs.map((n) => n.needKey).slice(0, 3).sort()).toEqual(["growth", "play", "vitality"]);
    expect(needs.variables["needs.totality_target_pct"]).toBe(75);
    // Love was picked with no goal: Village OS's default stands in, and the line says so.
    expect(needs.unset).toEqual(["love"]);
    expect(by.get("needs.scope")!.lines.find((l) => l.startsWith("Love"))).toBe("Love: no goal set yet, so Village OS starts it at Satisfied, for everyone.");
    const seats = by.get("seats.cards")!.suggestion as { seats: { name: string; contribution: { hoursPerWeek?: number }; needLinks: { weight: string }[] }[] };
    expect(seats.seats[0]).toMatchObject({ name: "Water keeper", contribution: { hoursPerWeek: 4 } });
    expect(seats.seats[0].needLinks[0].weight).toBe("primary");
    expect(by.get("seats.cards")!.lines[0]).toBe("Water keeper, in Living Water: Living water for every household. Answers for the spring and the catchment. Meets Vitality. Open, an invitation. 4 hours a week.");
    expect(by.get("circles.list")!.lines.find((l) => l.startsWith("Living Water"))).toMatch(/How it decides: A lead decides\.$/);
    expect(by.get("quests.first")!.lines[0]).toBe("Plant twelve chestnuts along the north fence, which grows Vitality.");
  });

  it("drafts the purpose in Village OS's five parts, and a draft with blanks can't be kept as it stands", () => {
    const p = buildProfile(base({ weeks: [week3, week4, week(2, 12, [], { pains: ["too few hands for the land"] })] }));
    const d = p.decisions.find((x) => x.key === "purpose.statement")!;
    const draft = d.suggestion as string;
    expect(draft).toMatch(/^Who it serves: Templeofroots\.com serves the 30 people it means to hold, and its land, in New Mexico\./);
    expect(draft).toMatch(/What they're up against: Too few hands for the land\./);
    expect(draft).toMatch(/From where to where: Growth is alive today, and we want it thriving in three years/);
    expect(draft).toMatch(/By what means: .*Living Water/);
    expect(draft).toMatch(/What becomes true: All this is for future generations\./);
    // Every part filled and long enough: it can be kept. With a blank part it's a starting point only.
    expect(d.keepable).toBe(checkAnswer(villageDecision("purpose.statement")!, draft).ok);
    const blank = buildProfile(base()).decisions.find((x) => x.key === "purpose.statement")!;
    expect(blank.suggestion).toMatch(/What they're up against: ___/);
    expect(blank.keepable).toBe(false);
    const one = buildProfile(base({ application: { ...base().application, intendedPeopleCount: 1 } }));
    expect(one.decisions.find((x) => x.key === "purpose.statement")!.suggestion).toMatch(/the 1 person it means to hold/);
  });

  it("a project with no board answers has open blocks and no draft", () => {
    const p = buildProfile(base({ weeks: [], tools: [] }));
    const by = new Map(p.decisions.map((d) => [d.key, d]));
    expect(by.get("purpose.statement")?.status).toBe("open");
    expect(by.get("seats.cards")?.status).toBe("open");
    expect(by.get("decide.voting")?.status).toBe("default");
    expect(p.weeks).toEqual([]);
  });

  it("a kept suggestion says when its source moves on or goes, and a written answer never does", () => {
    const first = buildProfile(base());
    const needsNow = first.decisions.find((d) => d.key === "needs.scope")!.suggestion;
    const p = buildProfile(base({
      stored: {
        "identity.name": kept("Temple of Roots"),
        "seats.cards": kept({ seats: [] }, "confirmed"),
        "needs.scope": kept(needsNow, "confirmed"),
        "membership.rite": kept("A different rite", "confirmed"),
      },
    }));
    const by = new Map(p.decisions.map((d) => [d.key, d]));
    expect(by.get("identity.name")).toMatchObject({ status: "yours", value: "Temple of Roots", changed: false });
    expect(by.get("seats.cards")).toMatchObject({ status: "yours", changed: true });
    expect(by.get("seats.cards")!.suggestionLines[0]).toMatch(/^Water keeper/);
    expect(by.get("needs.scope")!.changed).toBe(false);
    expect(by.get("membership.rite")!.changed).toBe(true);
    // The source gone: still flagged, so the steward knows.
    const gone = buildProfile(base({ weeks: [], stored: { "seats.cards": kept({ seats: [] }, "confirmed") } }));
    expect(gone.decisions.find((d) => d.key === "seats.cards")).toMatchObject({ changed: true, suggestion: null });
  });

  it("counts launch decisions: the stewards' own that pass their checks, and Village OS defaults", () => {
    expect(buildProfile(base()).launch).toMatchObject({ total: 6, ready: 0 });
    const p = buildProfile(base({
      stored: {
        "identity.name": kept("Temple of Roots"),
        "purpose.statement": kept(words(90)),
        "economy.issuanceCap": kept(CAP_KEEP_DEFAULT),
        "legal.exitPolicy": kept("Members keep what they brought."),
      },
    }));
    expect(p.launch.ready).toBe(4);
    expect(p.launch.open.sort()).toEqual(["decide.founders", "modules.on"].sort());
  });

  it("suggests modules from the answers, with what each runs on, and never a money module", () => {
    const suggested = buildProfile(base()).decisions.find((d) => d.key === "modules.on")!.suggestion as string[];
    expect(suggested).toEqual(expect.arrayContaining(["map", "governance", "forum", "feed", "events", "sessions"]));
    for (const k of VILLAGE_OS_MONEY_MODULES) expect(suggested).not.toContain(k);
    expect(checkAnswer(villageDecision("modules.on")!, suggested).ok).toBe(true);
  });
});

describe("checkAnswer", () => {
  const d = (k: string) => villageDecision(k)!;
  it("cleans words, strips hidden characters, and refuses empty or too long", () => {
    const zw = String.fromCharCode(0x200b);
    const rtl = String.fromCharCode(0x202e);
    expect(checkAnswer(d("identity.name"), `  Temple ${zw} of${rtl} Roots `)).toEqual({ ok: true, value: "Temple of Roots" });
    expect(checkAnswer(d("identity.name"), "   ")).toEqual({ ok: false, message: PROFILE_REFUSALS.empty });
    expect(checkAnswer(d("identity.name"), "x".repeat(121))).toEqual({ ok: false, message: PROFILE_REFUSALS.tooLong });
  });
  it("holds the purpose to Village OS's 80 words and no blanks", () => {
    expect(checkAnswer(d("purpose.statement"), "for the river")).toEqual({ ok: false, message: PROFILE_REFUSALS.purposeShort });
    expect(checkAnswer(d("purpose.statement"), `${words(90)} ___`)).toEqual({ ok: false, message: PROFILE_REFUSALS.blanks });
    expect(checkAnswer(d("purpose.statement"), words(80)).ok).toBe(true);
  });
  it("checks the address, the currency and the timezone", () => {
    expect(checkAnswer(d("launch.address"), "Green-Gulch")).toEqual({ ok: true, value: "green-gulch" });
    expect(checkAnswer(d("launch.address"), "-gulch")).toEqual({ ok: false, message: PROFILE_REFUSALS.address });
    expect(checkAnswer(d("launch.address"), "green gulch")).toEqual({ ok: false, message: PROFILE_REFUSALS.address });
    expect(checkAnswer(d("identity.currency"), "usd")).toEqual({ ok: true, value: "USD" });
    expect(checkAnswer(d("identity.currency"), "US")).toEqual({ ok: false, message: PROFILE_REFUSALS.currency });
    expect(checkAnswer(d("identity.timezone"), "America/Costa_Rica")).toEqual({ ok: true, value: "America/Costa_Rica" });
    expect(checkAnswer(d("identity.timezone"), "Mars/Olympus")).toEqual({ ok: false, message: PROFILE_REFUSALS.timezone });
  });
  it("takes a number in Village OS's range, or keeping its 10,000", () => {
    expect(checkAnswer(d("economy.issuanceCap"), CAP_KEEP_DEFAULT)).toEqual({ ok: true, value: CAP_KEEP_DEFAULT });
    expect(checkAnswer(d("economy.issuanceCap"), "5000")).toEqual({ ok: true, value: 5000 });
    // Zero would stop the village making any new tokens.
    expect(checkAnswer(d("economy.issuanceCap"), 0)).toEqual({ ok: false, message: PROFILE_REFUSALS.range });
    expect(checkAnswer(d("economy.issuanceCap"), 20_000_000)).toEqual({ ok: false, message: PROFILE_REFUSALS.range });
    expect(checkAnswer(d("economy.issuanceCap"), "lots")).toEqual({ ok: false, message: PROFILE_REFUSALS.number });
  });
  it("takes only listed choices, keeps a multi-pick in the list's order, and asks for what a module runs on", () => {
    expect(checkAnswer(d("identity.hemisphere"), "south")).toEqual({ ok: true, value: "south" });
    expect(checkAnswer(d("identity.hemisphere"), "east")).toEqual({ ok: false, message: PROFILE_REFUSALS.option });
    expect(checkAnswer(d("modules.on"), ["events", "map"])).toEqual({ ok: true, value: ["map", "events"] });
    expect(checkAnswer(d("modules.on"), ["exchange"])).toEqual({ ok: false, message: PROFILE_REFUSALS.option });
    expect(checkAnswer(d("modules.on"), ["stays"])).toEqual({ ok: false, message: PROFILE_REFUSALS.option });
    expect(checkAnswer(d("modules.on"), ["feed"])).toEqual({ ok: false, message: "Tick \"Forum\" too. \"The everyday feed\" runs on it." });
  });
  it("never takes written words for a board block", () => {
    expect(checkAnswer(d("seats.cards"), "anything")).toEqual({ ok: false, message: PROFILE_REFUSALS.block });
  });
});

describe("the 1.0 file", () => {
  it("carries only the stewards' own answers, and keeps links inside the human needs they kept", () => {
    const first = buildProfile(base());
    const get = (k: string) => first.decisions.find((d) => d.key === k)!.suggestion;
    // Seats kept, human needs not: the seat travels without a link Village OS would refuse.
    const p = buildProfile(base({
      stored: {
        "identity.name": kept("Temple of Roots"),
        "seats.cards": kept(get("seats.cards"), "confirmed"),
        "economy.issuanceCap": kept(CAP_KEEP_DEFAULT),
        "modules.on": kept(["map", "events"]),
        "seats.nextHolder": kept("rotates"),
      },
    }));
    const file = toVillageFile(p, { now: new Date("2026-10-21T20:00:00Z") });
    expect(file.schema).toBe(VILLAGE_FILE_SCHEMA);
    expect(file.card.schema).toBe(VILLAGE_CARD_SCHEMA);
    expect(file.identity.name).toBe("Temple of Roots");
    expect(file.identity.location).toBeNull();
    expect(file.card.needs).toEqual([]);
    expect(file.card.seats.map((s) => s.name)).toEqual(["Water keeper"]);
    expect(file.card.seats[0].needLinks).toEqual([]);
    // Board text nobody kept stays out.
    expect(file.card.firstLine).toBeNull();
    expect(file.card.players).toEqual({ toStart: null, now: null });
    expect(file.economy.issuanceCap).toBe(CAP_KEEP_DEFAULT);
    expect(file.modules.on).toEqual(["map", "events"]);
    expect(file.notes["seats.nextHolder"]).toEqual({ title: "How the next holder of most roles is chosen", text: "It rotates" });
    expect(file.status["identity.location"]).toEqual({ status: "suggested", from: "From your application" });
    expect(file.status["identity.name"]).toEqual({ status: "yours", from: "Your stewards" });
    expect(file.from).toMatchObject({ applicationId: 1231550, project: "Templeofroots.com", weeks: [3, 4] });

    // With the human needs kept too, the seat's link comes back.
    const both = toVillageFile(buildProfile(base({ stored: { "seats.cards": kept(get("seats.cards"), "confirmed"), "needs.scope": kept(get("needs.scope"), "confirmed") } })));
    expect(both.card.seats[0].needLinks).toEqual([{ needKey: "vitality", subjectType: "role", weight: "primary" }]);
  });

  it("pins the top-level shape Village OS's importer reads", () => {
    const file = toVillageFile(buildProfile(base()), { now: new Date(0) });
    expect(Object.keys(file)).toEqual([
      "schema", "generatedAt", "from", "card", "identity", "modules", "economy", "purpose", "membership", "quests", "legal", "notes", "status",
    ]);
    expect(Object.keys(file.status).sort()).toEqual(VILLAGE_DECISIONS.map((d) => d.key).sort());
  });

  it("names the download after the project", () => {
    expect(villageFileName("Templeofroots.com")).toBe("templeofroots-com-village-os-1.0.json");
    expect(villageFileName("   ")).toBe("village-village-os-1.0.json");
  });
});
