import { describe, expect, it } from "vitest";
import { CROWDPOOL_READINESS, READINESS_INTRO, weeksLabel } from "./crowdpoolReadiness";
import { SEASON2_CURRICULUM } from "./season2Curriculum";

// The Governance Canvas planned for Village-OS: twelve blocks, four
// foundations, and the Decision Matrix tool inside block 7.
const CANVAS = [
  "Purpose", "Team", "Roles", "Meetings", "Stakeholders", "Coordination",
  "Power", "Conflict", "Learning", "Resourcing", "Legal", "Impact",
  "Legal Framework", "Internal Rules", "Culture", "Personal Leadership",
  "Decision Matrix",
];

describe("ready to crowdpool", () => {
  it("stays concise: eight items, each with one key", () => {
    expect(CROWDPOOL_READINESS).toHaveLength(8);
    expect(new Set(CROWDPOOL_READINESS.map((i) => i.key)).size).toBe(8);
  });

  it("carries the three Rye named: a legal structure, a way to send and receive value, a clear game", () => {
    const keys = CROWDPOOL_READINESS.map((i) => i.key);
    for (const k of ["legal", "value", "game"]) expect(keys).toContain(k);
    const value = CROWDPOOL_READINESS.find((i) => i.key === "value")!;
    expect(value.need).toMatch(/equity or other forms of value/i);
    expect(value.need).toMatch(/what they get/);
  });

  it("covers everything /season2 says a project graduates with", () => {
    // Season2.tsx FAQ: governance, legal structure, economic model, financial
    // plan, and a crowdpooling campaign ready to run.
    const titles = CROWDPOOL_READINESS.map((i) => i.title.toLowerCase()).join(" | ");
    for (const need of ["governance", "legal structure", "econom", "financial plan", "campaign ready to run"]) {
      expect(titles).toContain(need);
    }
  });

  it("points every item at real Season 2 weeks and real canvas blocks", () => {
    const weeks = new Set(SEASON2_CURRICULUM.map((e) => e.week));
    for (const item of CROWDPOOL_READINESS) {
      expect(item.need.length).toBeGreaterThan(20);
      expect(item.show.length).toBeGreaterThan(5);
      expect(item.weeks.length).toBeGreaterThan(0);
      for (const w of item.weeks) expect(weeks.has(w)).toBe(true);
      expect(item.canvas.length).toBeGreaterThan(0);
      for (const c of item.canvas) expect(CANVAS).toContain(c);
    }
  });

  it("never turns into a score", () => {
    const text = [READINESS_INTRO, ...CROWDPOOL_READINESS.flatMap((i) => [i.title, i.need, i.show])].join(" ");
    expect(text).not.toMatch(/\bscore of\b|%|points?\b|rating/i);
  });

  it("keeps the copy inside the writing rules", () => {
    const banned = ["\u2014", "journey", "vibrant", "unlock", "empower", "leverage", "foster", "seamless", "crucial", "robust", "comprehensive"];
    const text = [READINESS_INTRO, ...CROWDPOOL_READINESS.flatMap((i) => [i.title, i.need, i.show])].join(" ").toLowerCase();
    for (const word of banned) expect(text).not.toContain(word);
  });

  it("names the weeks in plain words", () => {
    expect(weeksLabel([13])).toBe("Week 13");
    expect(weeksLabel([10, 11])).toBe("Weeks 10 and 11");
    expect(weeksLabel([3, 4, 5])).toBe("Weeks 3 to 5");
    expect(weeksLabel([5, 8, 9, 12])).toBe("Weeks 5, 8, 9 and 12");
    expect(weeksLabel([11, 4, 6])).toBe("Weeks 4, 6 and 11");
  });
});
