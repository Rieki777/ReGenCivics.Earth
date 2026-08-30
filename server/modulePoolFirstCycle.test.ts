/**
 * The founder's own prediction for the first settled cycle, as a test.
 *
 * He set the pool to 333 for a live test, with 500 as the target, and said what
 * should happen:
 *
 *   [Make the pool amount 500 but this pool should be governed on the ReGen
 *    Civics side and not the Game so it's a setting the ReGen Civics Game
 *    mechanics are covering as the "Custom Game Module Creators Pool" tokens we
 *    pay out. Then set it to 333 for us to start testing it. These tokens
 *    should be distributed (which right now would mean they're all being routed
 *    back to the ReGen Civics gratitude pool as extra to that pool since we're
 *    the only module creators.]
 *
 * So: with only platform-built modules listed, the WHOLE pool recycles into the
 * ReGen Civics gratitude pool, nothing is payable, and nobody is owed anything.
 * Any other outcome is a defect, and his number is the check.
 *
 * WHAT THIS RUNS, AND WHY IT IS NOT A UNIT TEST OF ONE FUNCTION. It drives the
 * whole settlement path a real cycle takes, from the JSON bytes a village
 * serves to the credit landing on the gratitude cycle's pool:
 *
 *   village JSON -> readVillageUsage -> mergeVillageUsage -> computeStatement
 *                -> recycleIntoGratitudePool
 *
 * Only the database is replaced, by a recording stub, so this runs in the plain
 * `pnpm test` with no DATABASE_URL. The two steps it cannot reach are the HTTP
 * fetch and the SQL execution themselves.
 */
import { describe, expect, it } from "vitest";
import { readVillageUsage, mergeVillageUsage, type CountedVillage } from "@shared/villageUsage";
import { computeStatement, statementBalances } from "@shared/modulePool";
import { recycleIntoGratitudePool } from "./lib/gratitude-cycles";

/**
 * The live test amount, and the target the founder named.
 *
 * Written down here so a change to either is a diff somebody reviews rather
 * than a number that quietly moved. `LIVE_TEST_POOL` is what the row holds
 * today; `TARGET_POOL` is where he said it is going.
 */
const LIVE_TEST_POOL = 333;
const TARGET_POOL = 500;

/** A village's usage report, exactly as it arrives over the wire. */
const villageJson = (modules: unknown[], over: Record<string, unknown> = {}) => ({
  instanceId: "i-amora",
  cycleId: "lunar-000329",
  sealed: true,
  sealedAt: "2026-08-29T00:00:00.000Z",
  activeMembers: 8,
  modules,
  ...over,
});

const ours = (moduleId: string, membersReached: number) => ({
  moduleId,
  membersReached,
  reach: membersReached / 8,
  builtBy: "ReGen Civics",
  builtByAccount: null,
  platformBuilt: true,
});

/** Settle a cycle from village JSON the way the job does, minus the network. */
function settle(pool: number, bodies: unknown[]) {
  const villages: CountedVillage[] = bodies.map((body, i) => {
    const out = readVillageUsage(body, 329);
    if (!out.ok) throw new Error(`village ${i} refused: ${out.reason}`);
    return { id: `v${i}`, state: "ok", report: out.report };
  });
  const usage = mergeVillageUsage(villages, new Map());
  return computeStatement({ pool, usage, identities: new Map() });
}

describe("the first settled cycle, against the founder's stated expectation", () => {
  const body = villageJson([ours("quests", 6), ours("gratitude", 4), ours("forum", 2)]);

  it("routes the WHOLE 333 back to the ReGen Civics gratitude pool", () => {
    const s = settle(LIVE_TEST_POOL, [body]);
    expect(s.totals.recycled).toBe(332);
    expect(s.totals.pool).toBe(LIVE_TEST_POOL);
    expect(s.totals.recycled + s.totals.unallocated).toBe(LIVE_TEST_POOL);
  });

  it("owes nobody anything, and has nothing payable", () => {
    const s = settle(LIVE_TEST_POOL, [body]);
    expect(s.totals.paid).toBe(0);
    expect(s.totals.accrued).toBe(0);
    expect(s.lines.filter((l) => l.state === "payable")).toHaveLength(0);
    expect(s.lines.every((l) => l.state === "recycled")).toBe(true);
  });

  it("loses only flooring dust, and balances by addition", () => {
    /*
     * 333 across reach 0.75 + 0.5 + 0.25 = 1.5 gives 166.5, 111 and 55.5, which
     * floor to 166, 111 and 55 and sum to 332. The missing 1 is dust: it
     * belongs to nobody and is never minted, so "all of it recycles" is true to
     * within the one token the arithmetic refuses to invent. This test states
     * that number rather than rounding past it, because a reader comparing the
     * page against his 333 will see 332 and needs the reason to exist somewhere.
     */
    const s = settle(LIVE_TEST_POOL, [body]);
    expect(statementBalances(s.totals)).toBe(true);
    expect(s.totals.unallocated).toBe(1);
    expect(s.totals.unallocated).toBeLessThan(s.lines.length);
  });

  it("holds at the 500 he is heading for, not just at the test number", () => {
    const s = settle(TARGET_POOL, [body]);
    expect(s.totals.paid).toBe(0);
    expect(s.totals.accrued).toBe(0);
    expect(s.totals.recycled + s.totals.unallocated).toBe(TARGET_POOL);
  });

  it("holds across every amount between the test number and the target", () => {
    for (let pool = LIVE_TEST_POOL; pool <= TARGET_POOL; pool++) {
      const s = settle(pool, [body]);
      expect(s.totals.paid).toBe(0);
      expect(s.totals.accrued).toBe(0);
      expect(s.totals.recycled + s.totals.unallocated).toBe(pool);
    }
  });

  it("holds when a second village joins and the reach doubles", () => {
    const s = settle(LIVE_TEST_POOL, [body, villageJson([ours("quests", 8), ours("forum", 1)])]);
    expect(s.totals.paid).toBe(0);
    expect(s.totals.accrued).toBe(0);
    expect(s.totals.recycled + s.totals.unallocated).toBe(LIVE_TEST_POOL);
  });

  /**
   * The falsification. Without this the tests above would still pass if
   * `recycled` were hard-wired to the pool, or if `payable` had stopped working
   * altogether, so they would be green for a reason that is not the one claimed.
   */
  it("STOPS being all-recycled the moment one outside builder is attested", () => {
    const mixed = villageJson([
      ours("quests", 6),
      {
        moduleId: "seed-swap",
        membersReached: 2,
        reach: 0.25,
        builtBy: "Ada Lovelace",
        builtByAccount: "ada",
        platformBuilt: false,
      },
    ]);
    const read = readVillageUsage(mixed, 329);
    if (!read.ok) throw new Error(read.reason);
    const usage = mergeVillageUsage([{ id: "v0", state: "ok", report: read.report }], new Map()).map((u) =>
      u.moduleId === "seed-swap" ? { ...u, attested: true } : u,
    );
    const s = computeStatement({
      pool: LIVE_TEST_POOL,
      usage,
      identities: new Map([["seed-swap", { userId: 7, address: "0x4E617cd113364193d215d107AdD6fa50418AA2E4" }]]),
    });
    expect(s.totals.paid).toBeGreaterThan(0);
    expect(s.totals.recycled).toBeLessThan(LIVE_TEST_POOL);
    expect(s.totals.recycled + s.totals.paid + s.totals.unallocated).toBe(LIVE_TEST_POOL);
  });
});

describe("the pool is a ReGen Civics setting, and no village number reaches it", () => {
  /*
   * The founder ruled the pool "should be governed on the ReGen Civics side and
   * not the Game". The reader is where that has to be true, because it is the
   * only thing in the hub that reads bytes a village wrote. A village that
   * decided its own pool, or its own share, would be governing this from the
   * Game side whatever any document said.
   */
  it("ignores any pool, share or amount a village puts in its report", () => {
    const greedy = villageJson(
      [{ ...ours("quests", 6), share: 999999, amount: 999999, payout: 999999 }],
      { pool: 999999, totals: { pool: 999999, payable: 999999 }, poolPerCycle: 999999 },
    );
    const s = settle(LIVE_TEST_POOL, [greedy]);
    expect(s.totals.pool).toBe(LIVE_TEST_POOL);
    expect(s.totals.recycled + s.totals.unallocated).toBe(LIVE_TEST_POOL);
    expect(JSON.stringify(s)).not.toContain("999999");
  });

  it("takes only counts from a village, so the report carries no money field at all", () => {
    const out = readVillageUsage(villageJson([ours("quests", 6)]), 329);
    if (!out.ok) throw new Error(out.reason);
    expect(Object.keys(out.report).sort()).toEqual([
      "activeMembers", "cycleId", "cycleNumber", "instanceId", "modules", "sealed", "sealedAt",
    ]);
    expect(Object.keys(out.report.modules[0]).sort()).toEqual([
      "builtBy", "builtByAccount", "membersReached", "moduleId", "provenance", "reach",
    ]);
  });
});

describe("the recycled amount reaching the gratitude pool", () => {
  /**
   * A recording stub for the two writes `recycleIntoGratitudePool` makes.
   *
   * `getOrCreateCurrentCycle` finds an open cycle through drizzle's chained
   * select, so the chain returns one and the function takes its early return.
   * Everything after that is raw SQL, which lands in `queries`.
   */
  function stubDb(opts: { alreadyRecycled?: boolean } = {}) {
    const queries: string[] = [];
    const chain: any = {
      from: () => chain,
      where: () => chain,
      limit: async () => [{ id: 9, cycleNumber: 330, poolPerCycle: 10000 }],
    };
    return {
      queries,
      db: {
        select: () => chain,
        execute: async (q: any) => {
          const text = Array.isArray(q?.queryChunks)
            ? q.queryChunks.map((c: any) => (Array.isArray(c?.value) ? c.value.join("") : "")).join(" ")
            : String(q);
          queries.push(text);
          // The INSERT IGNORE claims the recycle. 0 affected rows means the row
          // was already there, so the pool was already credited.
          if (/INSERT IGNORE INTO modulePoolRecycles/.test(text)) {
            return [{ affectedRows: opts.alreadyRecycled ? 0 : 1 }];
          }
          return [{ affectedRows: 1 }];
        },
      },
    };
  }

  it("adds the recycled amount to the open gratitude cycle's pool, once", async () => {
    const { db, queries } = stubDb();
    const out = await recycleIntoGratitudePool(db, { cycleNumber: 329, amount: 332 });
    expect(out).toEqual({ outcome: "recycled", amount: 332, gratitudeCycleNumber: 330 });
    expect(queries.some((q) => /INSERT IGNORE INTO modulePoolRecycles/.test(q))).toBe(true);
    expect(queries.some((q) => /UPDATE gratitude_cycles SET poolPerCycle = poolPerCycle \+/.test(q))).toBe(true);
  });

  it("refuses to credit the community twice when a settlement is retried", async () => {
    /*
     * The statement is written BEFORE the recycle runs, so every retry path
     * reaches this line with the statement already in place. The unique pool
     * cycle number is the only thing between that and the same $ReGen being
     * handed out twice.
     */
    const { db, queries } = stubDb({ alreadyRecycled: true });
    const out = await recycleIntoGratitudePool(db, { cycleNumber: 329, amount: 332 });
    expect(out.outcome).toBe("already-recycled");
    expect(queries.some((q) => /UPDATE gratitude_cycles/.test(q))).toBe(false);
  });

  it("says there was nothing to recycle rather than writing a zero row", async () => {
    const { db, queries } = stubDb();
    const out = await recycleIntoGratitudePool(db, { cycleNumber: 329, amount: 0 });
    expect(out.outcome).toBe("nothing-to-recycle");
    expect(queries).toHaveLength(0);
  });
});
