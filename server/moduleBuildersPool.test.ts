import { describe, expect, it } from "vitest";
import { MODULE_BUILDERS, moduleBuilderProblems, moduleBuildersById, type ModuleBuilder } from "@shared/moduleBuilders";
import { NETWORK_GAMES, type NetworkGame } from "@shared/networkRegistry";
import {
  formatVillageCycleId,
  mergeVillageUsage,
  parseVillageCycleId,
  provenanceCoverage,
  readVillageUsage,
  type CountedVillage,
  type VillageUsageReport,
} from "@shared/villageUsage";
import { countUsage, poolRoster, type VillageAnswer } from "./jobs/moduleBuildersPool";

const builder = (over: Partial<ModuleBuilder> & { moduleId: string }): ModuleBuilder => ({
  kind: "third-party",
  builtBy: "Ada Lovelace",
  account: "ada",
  reviewedOn: "2026-08-15",
  ...over,
});

/** One village's report, as it would arrive over the wire. */
const wire = (over: Record<string, unknown> = {}) => ({
  instanceId: "i-amora",
  cycleId: "lunar-000329",
  sealed: true,
  sealedAt: "2026-08-29T00:00:00.000Z",
  activeMembers: 4,
  modules: [],
  ...over,
});

const mod = (over: Record<string, unknown> & { moduleId: string }) => ({
  membersReached: 3,
  reach: 0.75,
  builtBy: "Ada Lovelace",
  builtByAccount: "ada",
  platformBuilt: false,
  ...over,
});

/** Parse a wire body or throw, so a test never asserts against a refusal by accident. */
function parsed(body: unknown, cycle = 329): VillageUsageReport {
  const out = readVillageUsage(body, cycle);
  if (!out.ok) throw new Error(`expected a readable report, got: ${out.reason}`);
  return out.report;
}

const counted = (id: string, report: VillageUsageReport | null, state: CountedVillage["state"] = "ok"): CountedVillage =>
  ({ id, state, report });

describe("the shipped attestation list", () => {
  it("carries no shape problems", () => {
    expect(moduleBuilderProblems(MODULE_BUILDERS)).toEqual([]);
  });

  it("is empty, and that no longer means the pool pays nothing to anybody", () => {
    /*
     * It used to be the list of modules that could EARN, so an empty file meant
     * every village's usage was discarded before the split. It is now the list
     * of builders the hub will PAY, so an empty file means the hub attests
     * nothing and every module still earns its share. A fork inherits a working
     * pool with nothing in this file.
     */
    expect(MODULE_BUILDERS).toEqual([]);
    const report = parsed(wire({ modules: [mod({ moduleId: "quests", platformBuilt: true })] }));
    const usage = mergeVillageUsage([counted("amora", report)], moduleBuildersById(MODULE_BUILDERS));
    expect(usage).toHaveLength(1);
    expect(usage[0].reach).toBeGreaterThan(0);
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

  it("refuses a platform entry that also names somebody to pay", () => {
    // A platform module's share recycles. An account on one is either a
    // mislabelled third-party module or an attempt to be paid twice.
    const problems = moduleBuilderProblems([builder({ moduleId: "a", kind: "platform", account: "ada" })]);
    expect(problems[0]).toContain("recycles into the gratitude pool");
  });

  it("accepts a platform entry with no account", () => {
    expect(moduleBuilderProblems([builder({ moduleId: "a", kind: "platform", builtBy: "ReGen Civics", account: null })])).toEqual([]);
  });

  it("refuses an entry that will not say which side it is on", () => {
    const problems = moduleBuilderProblems([{ ...builder({ moduleId: "a" }), kind: undefined as any }]);
    expect(problems.some((p) => p.includes("builder kind"))).toBe(true);
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

describe("the cycle id both sides agree on", () => {
  it("round-trips, zero padded so a string sort is a chronological sort", () => {
    expect(formatVillageCycleId(329)).toBe("lunar-000329");
    expect(parseVillageCycleId("lunar-000329")).toBe(329);
    expect(formatVillageCycleId(1000000)).toBe("lunar-1000000");
  });

  it("refuses every other spelling, including the one that split a ledger in two", () => {
    // game-amora's own economy.ts once wrote `moon-329` for the same lunation
    // its gratitude system called `lunar-000329`, into the same column, and a
    // settlement read only half of it.
    for (const bad of ["moon-329", "2026-08", "lunar-", "lunar-abc", "", "lunar-000329 "]) {
      expect(parseVillageCycleId(bad)).toBeNull();
    }
  });
});

describe("reading what a village reports", () => {
  it("reads a clean report", () => {
    const report = parsed(wire({ modules: [mod({ moduleId: "map" })] }));
    expect(report.cycleNumber).toBe(329);
    expect(report.activeMembers).toBe(4);
    expect(report.modules[0]).toMatchObject({ moduleId: "map", membersReached: 3, reach: 0.75, provenance: "third-party" });
  });

  it("refuses a report for a cycle other than the one being settled", () => {
    const out = readVillageUsage(wire({ cycleId: "lunar-000328" }), 329);
    expect(out.ok).toBe(false);
    expect(out.ok === false && out.reason).toContain("settles cycle 329");
  });

  it("refuses an unsealed cycle, because its numbers are still moving", () => {
    const out = readVillageUsage(wire({ sealed: false, modules: [mod({ moduleId: "map" })] }), 329);
    expect(out.ok).toBe(false);
    expect(out.ok === false && out.reason).toContain("has not sealed");
  });

  it("treats a missing sealed flag as not sealed, never as sealed", () => {
    const body = wire();
    delete (body as any).sealed;
    expect(readVillageUsage(body, 329).ok).toBe(false);
  });

  it("re-imposes the one-village-one-vote cap rather than trusting it", () => {
    /*
     * The cap is the whole anti-inflation argument, and until the hub applied it
     * itself it was a property of how the village normally computes a fraction
     * rather than a rule the hub held. A village reporting 12 contributes 1.
     */
    const report = parsed(wire({ modules: [mod({ moduleId: "map", reach: 12 })] }));
    expect(report.modules[0].reach).toBe(1);
  });

  it("refuses a cycle id it cannot place, rather than echoing it back", () => {
    const out = readVillageUsage(wire({ cycleId: "whatever" }), 329);
    expect(out.ok).toBe(false);
    expect(out.ok === false && out.reason).toContain("not a lunar-NNNNNN id");
  });

  it("drops a module line it cannot read without dropping the report", () => {
    const report = parsed(wire({
      modules: [mod({ moduleId: "good" }), { moduleId: "bad", membersReached: "x", reach: null }, { reach: 1 }],
    }));
    expect(report.modules.map((m) => m.moduleId)).toEqual(["good"]);
  });

  it("counts a module once however many times a village lists it", () => {
    const report = parsed(wire({ modules: [mod({ moduleId: "map" }), mod({ moduleId: "map", reach: 1 })] }));
    expect(report.modules).toHaveLength(1);
    expect(report.modules[0].reach).toBe(0.75);
  });

  it("says a module stated no provenance instead of guessing one", () => {
    const bare = { moduleId: "mystery", membersReached: 2, reach: 0.5 };
    const report = parsed(wire({ modules: [bare] }));
    expect(report.modules[0].provenance).toBe("unstated");
    expect(report.modules[0].builtBy).toBeNull();
    expect(provenanceCoverage(report)).toEqual({ stated: 0, unstated: 1 });
  });
});

describe("merging villages into one cycle's usage", () => {
  it("sums reach across villages, so a module two villages love beats one one village loves", () => {
    const a = parsed(wire({ modules: [mod({ moduleId: "map", reach: 0.8 })] }));
    const b = parsed(wire({ instanceId: "i-b", modules: [mod({ moduleId: "map", reach: 0.6 })] }));
    const usage = mergeVillageUsage([counted("a", a), counted("b", b)], new Map());
    expect(usage[0].reach).toBeCloseTo(1.4, 6);
    expect(usage[0].villages).toBe(2);
    expect(usage[0].membersReached).toBe(6);
  });

  it("counts a carried village, because being down is not being switched off", () => {
    const a = parsed(wire({ modules: [mod({ moduleId: "map", reach: 0.5 })] }));
    const b = parsed(wire({ modules: [mod({ moduleId: "map", reach: 0.5 })] }));
    const usage = mergeVillageUsage([counted("a", a), counted("b", b, "carried")], new Map());
    expect(usage[0].reach).toBeCloseTo(1, 6);
  });

  it("counts an absent village as nothing, and never as a zero it reported", () => {
    const a = parsed(wire({ modules: [mod({ moduleId: "map", reach: 0.5 })] }));
    const usage = mergeVillageUsage([counted("a", a), counted("b", null, "absent")], new Map());
    expect(usage[0].reach).toBeCloseTo(0.5, 6);
    expect(usage[0].villages).toBe(1);
  });

  it("keeps a module the hub has never heard of IN the split", () => {
    // The old countUsage dropped it before the denominator, handing its share
    // to whoever remained. That is the failure R64 names.
    const a = parsed(wire({ modules: [mod({ moduleId: "never-seen-before" })] }));
    const usage = mergeVillageUsage([counted("a", a)], new Map());
    expect(usage.map((u) => u.moduleId)).toEqual(["never-seen-before"]);
    expect(usage[0].attested).toBe(false);
  });

  it("believes a village that says the platform built it, because that costs the claimant", () => {
    const a = parsed(wire({ modules: [mod({ moduleId: "quests", platformBuilt: true, builtByAccount: null })] }));
    const usage = mergeVillageUsage([counted("a", a)], new Map());
    expect(usage[0].platformBuilt).toBe(true);
  });

  it("takes a named outside builder as a NAME and never as a payment instruction", () => {
    const a = parsed(wire({ modules: [mod({ moduleId: "seed-swap", builtByAccount: "attacker" })] }));
    const usage = mergeVillageUsage([counted("a", a)], new Map());
    expect(usage[0].builtByAccount).toBe("attacker");
    expect(usage[0].attested).toBe(false);
  });

  it("lets a hub attestation override what a village claims, in both directions", () => {
    const a = parsed(wire({
      modules: [
        mod({ moduleId: "claimed-ours", platformBuilt: true }),
        mod({ moduleId: "claimed-theirs", builtByAccount: "attacker" }),
      ],
    }));
    const attestations = moduleBuildersById([
      builder({ moduleId: "claimed-ours", kind: "third-party", account: "grace", builtBy: "Grace Hopper" }),
      builder({ moduleId: "claimed-theirs", kind: "platform", account: null, builtBy: "ReGen Civics" }),
    ]);
    const usage = mergeVillageUsage([counted("a", a)], attestations);
    const ours = usage.find((u) => u.moduleId === "claimed-ours")!;
    const theirs = usage.find((u) => u.moduleId === "claimed-theirs")!;
    expect(ours).toMatchObject({ platformBuilt: false, builtByAccount: "grace", attested: true });
    expect(theirs).toMatchObject({ platformBuilt: true, builtByAccount: null, attested: true });
  });

  it("recycles when ONE village calls a module the platform's own, whatever the others say", () => {
    // Disagreement is not settled by majority. The only thing that claim can do
    // is take a payment away, so it is never outvoted into a payment.
    const a = parsed(wire({ modules: [mod({ moduleId: "map", platformBuilt: true })] }));
    const b = parsed(wire({ modules: [mod({ moduleId: "map", builtByAccount: "someone" })] }));
    const c = parsed(wire({ modules: [mod({ moduleId: "map", builtByAccount: "someone" })] }));
    const usage = mergeVillageUsage([counted("a", a), counted("b", b), counted("c", c)], new Map());
    expect(usage[0].platformBuilt).toBe(true);
  });

  it("drops a handle the hub could never look up rather than carrying it to a query", () => {
    const a = parsed(wire({ modules: [mod({ moduleId: "map", builtByAccount: "Not A Handle" })] }));
    const usage = mergeVillageUsage([counted("a", a)], new Map());
    expect(usage[0].builtByAccount).toBeNull();
  });

  it("orders by module id, so the same answers hash the same way", () => {
    const a = parsed(wire({ modules: [mod({ moduleId: "zebra" }), mod({ moduleId: "apple" })] }));
    expect(mergeVillageUsage([counted("a", a)], new Map()).map((u) => u.moduleId)).toEqual(["apple", "zebra"]);
  });
});

describe("countUsage, as the job calls it", () => {
  const answer = (id: string, report: VillageUsageReport | null, state: VillageAnswer["state"] = "ok"): VillageAnswer => ({
    id,
    instanceId: report?.instanceId ?? null,
    state,
    cycleId: report?.cycleId ?? null,
    sealed: report?.sealed ?? false,
    activeMembers: report?.activeMembers ?? 0,
    modules: report?.modules.map((m) => m.moduleId) ?? [],
    refusedBecause: null,
    provenance: report ? provenanceCoverage(report) : { stated: 0, unstated: 0 },
    report,
  });

  it("answers nothing when every village is absent", () => {
    expect(countUsage([answer("a", null, "absent")])).toEqual([]);
  });

  it("carries a village's whole report through to the split", () => {
    const report = parsed(wire({ modules: [mod({ moduleId: "map", reach: 0.5, membersReached: 2 })] }));
    const usage = countUsage([answer("a", report)]);
    expect(usage).toEqual([
      {
        moduleId: "map",
        reach: 0.5,
        membersReached: 2,
        villages: 1,
        platformBuilt: false,
        builtBy: "Ada Lovelace",
        builtByAccount: "ada",
        attested: false,
      },
    ]);
  });
});
