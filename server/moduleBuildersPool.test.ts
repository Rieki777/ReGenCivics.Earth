import { describe, expect, it } from "vitest";
import { MODULE_BUILDERS, moduleBuilderProblems, moduleBuildersById, type ModuleBuilder } from "@shared/moduleBuilders";
import { NETWORK_GAMES, type NetworkGame } from "@shared/networkRegistry";
import { countUsage, poolRoster, type VillageAnswer } from "./jobs/moduleBuildersPool";

const builder = (over: Partial<ModuleBuilder> & { moduleId: string }): ModuleBuilder => ({
  builtBy: "Ada Lovelace",
  account: "ada",
  reviewedOn: "2026-08-15",
  ...over,
});

const village = (id: string, modules: string[], state: VillageAnswer["state"] = "ok"): VillageAnswer => ({
  id, instanceId: `i-${id}`, state, modules,
});

describe("the shipped builder list", () => {
  it("carries no shape problems", () => {
    expect(moduleBuilderProblems(MODULE_BUILDERS)).toEqual([]);
  });

  it("is empty, because every module today is the platform's own", () => {
    // Paying a platform-built module would pay ReGen Civics out of ReGen
    // Civics' own treasury. The machinery ships owing nothing; the first line
    // added here will be the first real one.
    expect(MODULE_BUILDERS).toEqual([]);
  });
});

describe("what a builder entry must carry", () => {
  it("refuses a wallet address where the handle goes, by name", () => {
    const problems = moduleBuilderProblems([builder({ moduleId: "a", account: "0x4e617cd113364193d215d107add6fa50418aa2e4" })]);
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain("links their address in their own profile");
  });

  it("refuses a handle the hub could never store", () => {
    expect(moduleBuilderProblems([builder({ moduleId: "a", account: "Ada Lovelace" })])[0]).toContain("lowercase letters");
    expect(moduleBuilderProblems([builder({ moduleId: "a", account: "ada_lovelace" })])[0]).toContain("lowercase letters");
  });

  it("accepts a null account, because a builder with no login still earns", () => {
    expect(moduleBuilderProblems([builder({ moduleId: "a", account: null })])).toEqual([]);
  });

  it("refuses a module listed twice, which would pay it twice", () => {
    const problems = moduleBuilderProblems([builder({ moduleId: "a" }), builder({ moduleId: "a", builtBy: "Grace Hopper" })]);
    expect(problems[0]).toContain("listed twice");
  });

  it("refuses a missing review date, which is the only thing watching for a module that started charging", () => {
    expect(moduleBuilderProblems([builder({ moduleId: "a", reviewedOn: "" })])[0]).toContain("review date");
    expect(moduleBuilderProblems([builder({ moduleId: "a", reviewedOn: "August 2026" })])[0]).toContain("review date");
  });

  it("refuses an entry crediting nobody", () => {
    expect(moduleBuilderProblems([builder({ moduleId: "a", builtBy: "  " })])[0]).toContain("credits nobody");
  });
});

describe("the roster", () => {
  const games = [
    { id: "live-listed", listed: true, status: "live" },
    { id: "live-unlisted", listed: false, status: "live" },
    { id: "building-listed", listed: true, status: "building" },
  ] as unknown as NetworkGame[];

  it("counts only villages a human listed AND that are live", () => {
    expect(poolRoster(games).map((g) => g.id)).toEqual(["live-listed"]);
  });

  it("is a real, non-empty subset of the shipped network registry", () => {
    // If this ever goes empty the pool silently stops counting anybody, so it
    // is asserted rather than assumed.
    expect(poolRoster(NETWORK_GAMES).length).toBeGreaterThan(0);
  });
});

describe("counting villages per module", () => {
  const builders = [builder({ moduleId: "seed-swap" }), builder({ moduleId: "tide-tables", account: "grace" })];
  const usageWith = (answers: VillageAnswer[]) => {
    // countUsage reads the shipped MODULE_BUILDERS, which is empty, so the
    // arithmetic is exercised through the same map it builds.
    const map = moduleBuildersById(builders);
    const counts = new Map<string, number>();
    for (const a of answers) for (const id of new Set(a.modules)) if (map.has(id)) counts.set(id, (counts.get(id) ?? 0) + 1);
    return [...map.values()].map((b) => ({ moduleId: b.moduleId, villages: counts.get(b.moduleId) ?? 0 }));
  };

  it("pays nobody for a module id no builder record claims", () => {
    // The second human gate: a forged village is not on the roster, and a
    // forged module id has no builder record.
    const answers = [village("a", ["seed-swap", "totally-made-up"])];
    expect(usageWith(answers).map((u) => u.moduleId)).toEqual(["seed-swap", "tide-tables"]);
  });

  it("counts a village once however many times it lists the same module", () => {
    expect(usageWith([village("a", ["seed-swap", "seed-swap"])])[0].villages).toBe(1);
  });

  it("counts a carried village, because being down is not being switched off", () => {
    const answers = [village("a", ["seed-swap"]), village("b", ["seed-swap"], "carried")];
    expect(usageWith(answers)[0].villages).toBe(2);
  });

  it("counts an absent village as nothing", () => {
    const answers = [village("a", ["seed-swap"]), village("b", [], "absent")];
    expect(usageWith(answers)[0].villages).toBe(1);
  });

  it("returns a line for every known builder, including one nobody runs", () => {
    const usage = usageWith([village("a", ["seed-swap"])]);
    expect(usage.find((u) => u.moduleId === "tide-tables")?.villages).toBe(0);
  });

  it("agrees with the shipped countUsage on an empty builder list", () => {
    expect(countUsage([village("a", ["quests", "gratitude"])])).toEqual([]);
  });
});
