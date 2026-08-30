import { describe, expect, it } from "vitest";
import {
  POOL_DUST_FLOOR,
  computeStatement,
  isAccruingState,
  isUsableBaseAddress,
  statementBalances,
  statementCsv,
  statementSnapshotInput,
  type PoolIdentity,
  type PoolUsage,
} from "@shared/modulePool";
import {
  REFERENCE_NEW_MOON_MS,
  SYNODIC_MONTH_DAYS,
  cycleBoundsByNumber,
  cycleBoundsFor,
  lastClosedCycle,
} from "@shared/lunar";
import { sentOnChain, settlementWord } from "./routes/modulePool";

const ADDR = "0x4E617cd113364193d215d107AdD6fa50418AA2E4";

const usage = (over: Partial<PoolUsage> & { moduleId: string }): PoolUsage => ({
  reach: 1,
  membersReached: 1,
  villages: 1,
  platformBuilt: false,
  builtBy: "Ada Lovelace",
  builtByAccount: "ada",
  attested: true,
  ...over,
});

const linked = (address: string | null = ADDR): PoolIdentity => ({ userId: 7, address });

const village = (id: string, modules: string[]) => ({
  id,
  instanceId: `i-${id}`,
  state: "ok",
  cycleId: "lunar-000329",
  sealed: true,
  activeMembers: 10,
  modules,
});

describe("lunar cycle numbers", () => {
  it("uses the Meeus reference and the mean synodic month, matching the village forks", () => {
    // shared/lunar.ts is the gratitude system's clock and the natural key for
    // gratitude_cycles.cycleNumber. The pool reuses it rather than starting a
    // third calendar, so a pool cycle number names the same lunation a village
    // means by it. game-amora's shared/lunar.ts is a verbatim port of this file
    // and these two constants are the whole of the agreement.
    expect(SYNODIC_MONTH_DAYS).toBe(29.53058867);
    expect(REFERENCE_NEW_MOON_MS).toBe(Date.UTC(2000, 0, 6, 18, 14, 0));
  });

  it("numbers the reference lunation zero and counts up", () => {
    expect(cycleBoundsFor(new Date(REFERENCE_NEW_MOON_MS)).cycleNumber).toBe(0);
    expect(cycleBoundsFor(new Date(REFERENCE_NEW_MOON_MS + 1000)).cycleNumber).toBe(0);
  });

  it("makes each cycle end exactly where the next begins", () => {
    const a = cycleBoundsByNumber(329);
    const b = cycleBoundsByNumber(330);
    expect(a.endsAt.getTime()).toBe(b.startsAt.getTime());
  });

  it("settles the cycle that closed, never the one running", () => {
    const now = new Date(REFERENCE_NEW_MOON_MS + 329.5 * SYNODIC_MONTH_DAYS * 86400_000);
    const closed = lastClosedCycle(now);
    expect(closed.cycleNumber).toBe(328);
    expect(closed.endsAt.getTime()).toBeLessThan(now.getTime());
  });

  it("pins how far the OTHER, unused lunar clock in this repo sits from this one", () => {
    /*
     * server/lib/lunar.ts is a second lunar implementation anchored on
     * 2025-01-29 12:36 UTC. It has no callers anywhere in the repository, and
     * its epoch is NOT a whole number of lunations from the Meeus reference, so
     * anything that imported it would compute cycle boundaries 6.79 hours away
     * from every village and from gratitude.
     *
     * This test does not depend on that file. It states the size of the trap,
     * so the number is written down somewhere before somebody reaches for the
     * more conveniently named module (ADR-50, decision D7).
     */
    const orphanEpoch = new Date("2025-01-29T12:36:00Z").getTime();
    const lunations = (orphanEpoch - REFERENCE_NEW_MOON_MS) / (SYNODIC_MONTH_DAYS * 86400_000);
    const offsetHours = (lunations - Math.round(lunations)) * SYNODIC_MONTH_DAYS * 24;
    expect(offsetHours).toBeCloseTo(6.787, 2);
  });
});

describe("the share arithmetic splits by REACH, not by installation", () => {
  it("pays a module opened by more members more, at equal village counts", () => {
    /*
     * THE WHOLE POINT OF ADR-51, as one assertion. Both modules are running in
     * exactly one village. Under the old split, which counted villages, they
     * would each take half. Under reach, the one three quarters of the members
     * opened takes three times the one a quarter of them opened.
     */
    const s = computeStatement({
      pool: 4000,
      usage: [usage({ moduleId: "loved", reach: 0.75 }), usage({ moduleId: "shelfware", reach: 0.25 })],
      identities: new Map([["loved", linked()], ["shelfware", linked()]]),
    });
    expect(s.lines.map((l) => [l.moduleId, l.amount])).toEqual([["loved", 3000], ["shelfware", 1000]]);
  });

  it("earns a module nothing when it is switched on everywhere and opened by nobody", () => {
    // Reach 0 with a village count of 12. Installation earns nothing.
    const s = computeStatement({
      pool: 1000,
      usage: [usage({ moduleId: "opened", reach: 0.5 }), usage({ moduleId: "installed", reach: 0, villages: 12 })],
      identities: new Map([["opened", linked()], ["installed", linked()]]),
    });
    expect(s.lines.map((l) => l.moduleId)).toEqual(["opened"]);
    expect(s.totals.paid).toBe(1000);
  });

  it("splits the pool in proportion to summed reach", () => {
    const s = computeStatement({
      pool: 5000,
      usage: [usage({ moduleId: "a", reach: 3 }), usage({ moduleId: "b", reach: 1 })],
      identities: new Map([["a", linked()], ["b", linked()]]),
    });
    expect(s.lines.map((l) => [l.moduleId, l.amount])).toEqual([["a", 3750], ["b", 1250]]);
    expect(s.totals.paid).toBe(5000);
  });

  it("floors, and never mints the remainder", () => {
    const s = computeStatement({
      pool: 100,
      usage: [usage({ moduleId: "a" }), usage({ moduleId: "b" }), usage({ moduleId: "c" })],
      identities: new Map([["a", linked()], ["b", linked()], ["c", linked()]]),
    });
    // 33.33 each floors to 33; the leftover 1 belongs to nobody and evaporates.
    expect(s.lines.every((l) => l.amount === 33)).toBe(true);
    expect(s.totals.paid).toBe(99);
    expect(s.totals.unallocated).toBe(1);
  });

  it("never pays out more than the pool plus the carry", () => {
    for (const pool of [1, 7, 99, 5000, 10001]) {
      const s = computeStatement({
        pool,
        usage: [usage({ moduleId: "a", reach: 2 }), usage({ moduleId: "b", reach: 5 }), usage({ moduleId: "c", reach: 1 })],
        identities: new Map([["a", linked()], ["b", linked()], ["c", linked()]]),
      });
      expect(s.totals.paid + s.totals.accrued + s.totals.recycled).toBeLessThanOrEqual(pool);
    }
  });

  it("balances by addition, always, across every state at once", () => {
    const s = computeStatement({
      pool: 5000,
      carryIn: 137,
      usage: [
        usage({ moduleId: "paid", reach: 3 }),
        usage({ moduleId: "ours", reach: 2, platformBuilt: true, builtBy: "ReGen Civics", builtByAccount: null }),
        usage({ moduleId: "nameless", reach: 2, builtByAccount: null }),
        usage({ moduleId: "unreviewed", reach: 1, attested: false }),
        usage({ moduleId: "no-wallet", reach: 1 }),
      ],
      identities: new Map([["paid", linked()], ["no-wallet", linked(null)]]),
    });
    expect(statementBalances(s.totals)).toBe(true);
    expect(s.totals.pool + s.totals.carryIn).toBe(5137);
    expect(s.totals.paid + s.totals.accrued + s.totals.recycled + s.totals.unallocated).toBe(5137);
  });

  it("pays nothing and keeps nothing when nobody opened anything", () => {
    const s = computeStatement({ pool: 5000, usage: [], identities: new Map() });
    expect(s.lines).toEqual([]);
    expect(s.totals.paid).toBe(0);
    expect(s.totals.accrued).toBe(0);
    expect(s.totals.recycled).toBe(0);
    expect(s.totals.unallocated).toBe(5000);
    expect(statementBalances(s.totals)).toBe(true);
  });

  it("sorts the same way whatever order the roster answered in", () => {
    const forward = computeStatement({
      pool: 900,
      usage: [usage({ moduleId: "a" }), usage({ moduleId: "b" }), usage({ moduleId: "c", reach: 4 })],
      identities: new Map([["a", linked()], ["b", linked()], ["c", linked()]]),
    });
    const reversed = computeStatement({
      pool: 900,
      usage: [usage({ moduleId: "c", reach: 4 }), usage({ moduleId: "b" }), usage({ moduleId: "a" })],
      identities: new Map([["c", linked()], ["b", linked()], ["a", linked()]]),
    });
    expect(forward.lines.map((l) => l.moduleId)).toEqual(["c", "a", "b"]);
    expect(JSON.stringify(forward)).toBe(JSON.stringify(reversed));
  });
});

describe("the platform earns on the same footing and its share recycles (R64)", () => {
  it("keeps a platform module IN the denominator, so nobody else absorbs its share", () => {
    /*
     * The defect this whole change exists to fix, as one number.
     *
     * `ours` has half the reach. If it were dropped before the split, `theirs`
     * would take the whole 1000 and a third-party builder would have been paid
     * for the platform's usage as well as their own, which is exactly what the
     * village platform's own pool header warned about.
     */
    const s = computeStatement({
      pool: 1000,
      usage: [
        usage({ moduleId: "theirs", reach: 1 }),
        usage({ moduleId: "ours", reach: 1, platformBuilt: true, builtBy: "ReGen Civics", builtByAccount: null }),
      ],
      identities: new Map([["theirs", linked()]]),
    });
    expect(s.lines.find((l) => l.moduleId === "theirs")?.amount).toBe(500);
    expect(s.totals.paid).toBe(500);
    expect(s.totals.recycled).toBe(500);
    expect(s.totals.accrued).toBe(0);
  });

  it("recycles rather than accrues, so the platform is never told to link a wallet", () => {
    const s = computeStatement({
      pool: 100,
      usage: [usage({ moduleId: "ours", platformBuilt: true, builtByAccount: null })],
      identities: new Map(),
    });
    expect(s.lines[0].state).toBe("recycled");
    expect(s.lines[0].address).toBeNull();
    expect(s.totals.recycled).toBe(100);
    expect(s.totals.accrued).toBe(0);
  });

  it("recycles even when the platform DOES hold a linked account", () => {
    // Provenance decides, never the presence of somewhere to send it. A
    // platform module that happened to name an account must not become payable.
    const s = computeStatement({
      pool: 100,
      usage: [usage({ moduleId: "ours", platformBuilt: true, builtByAccount: "regencivics" })],
      identities: new Map([["ours", linked()]]),
    });
    expect(s.lines[0].state).toBe("recycled");
    expect(s.totals.paid).toBe(0);
  });

  it("lets another organisation out-earn the platform, which is a success condition", () => {
    // R64: "One day a new organisation could spin up and have created more
    // modules in the Games than groups are using than us and get more of the
    // revenue." Nothing in the arithmetic gives the platform a floor.
    const s = computeStatement({
      pool: 1000,
      usage: [
        usage({ moduleId: "theirs-1", reach: 4 }),
        usage({ moduleId: "theirs-2", reach: 4 }),
        usage({ moduleId: "ours", reach: 2, platformBuilt: true, builtByAccount: null }),
      ],
      identities: new Map([["theirs-1", linked()], ["theirs-2", linked()]]),
    });
    expect(s.totals.paid).toBe(800);
    expect(s.totals.recycled).toBe(200);
    expect(s.totals.paid).toBeGreaterThan(s.totals.recycled);
  });
});

describe("who gets paid, and who is told why not", () => {
  it("pays a builder with an attestation, an account and a linked address", () => {
    const s = computeStatement({
      pool: 100,
      usage: [usage({ moduleId: "a" })],
      identities: new Map([["a", linked()]]),
    });
    expect(s.lines[0].state).toBe("payable");
    expect(s.lines[0].address).toBe(ADDR);
    expect(s.totals.paid).toBe(100);
  });

  it("holds a share whose only source is a village manifest", () => {
    /*
     * A village runs its own code and can print any handle it likes. Paying on
     * that alone would let any deployment redirect a payment to a stranger by
     * editing one JSON field. The module still EARNS: the share is held, and
     * the reason is its own word so nobody reads it as a missing wallet.
     */
    const s = computeStatement({
      pool: 100,
      usage: [usage({ moduleId: "a", attested: false, builtByAccount: "stranger" })],
      identities: new Map([["a", linked()]]),
    });
    expect(s.lines[0].state).toBe("unattested");
    expect(s.lines[0].address).toBeNull();
    expect(s.totals.accrued).toBe(100);
    expect(s.totals.paid).toBe(0);
  });

  it("accrues where the registry names no account", () => {
    const s = computeStatement({
      pool: 100,
      usage: [usage({ moduleId: "a", builtByAccount: null })],
      identities: new Map(),
    });
    expect(s.lines[0].state).toBe("no-account");
    expect(s.totals.accrued).toBe(100);
    expect(s.totals.paid).toBe(0);
  });

  it("accrues where the handle resolves to nobody", () => {
    const s = computeStatement({
      pool: 100,
      usage: [usage({ moduleId: "a" })],
      identities: new Map([["a", { userId: null, address: null }]]),
    });
    expect(s.lines[0].state).toBe("no-account");
  });

  it("tells a builder with an account but no address a DIFFERENT thing", () => {
    const s = computeStatement({
      pool: 100,
      usage: [usage({ moduleId: "a" })],
      identities: new Map([["a", linked(null)]]),
    });
    expect(s.lines[0].state).toBe("no-address");
    expect(s.totals.accrued).toBe(100);
  });

  it("refuses an address the profile never validated rather than handing it to a human", () => {
    for (const bad of ["0xzz", "0x", "not-an-address", "0x4E617cd113364193d215d107AdD6fa50418AA2E"]) {
      const s = computeStatement({
        pool: 100,
        usage: [usage({ moduleId: "a" })],
        identities: new Map([["a", linked(bad)]]),
      });
      expect(s.lines[0].state).toBe("unusable-address");
      expect(s.lines[0].address).toBeNull();
    }
  });

  it("names a share below the floor as below the floor, not as a missing account", () => {
    const s = computeStatement({
      pool: 1,
      usage: [usage({ moduleId: "a", builtByAccount: null }), usage({ moduleId: "b" })],
      identities: new Map([["b", linked()]]),
      dustFloor: POOL_DUST_FLOOR,
    });
    // Each raw share is 0.5, which floors to 0 and is below the floor of 1.
    expect(s.lines.every((l) => l.state === "below-floor")).toBe(true);
    expect(s.totals.accrued).toBe(0);
    expect(s.totals.unallocated).toBe(1);
  });

  it("calls a platform share below the floor too small, and not recycled", () => {
    // Order matters: the floor is checked before provenance, so a sub-floor
    // platform share is never counted as money that reached the community.
    const s = computeStatement({
      pool: 1,
      usage: [
        usage({ moduleId: "a", platformBuilt: true, builtByAccount: null }),
        usage({ moduleId: "b", platformBuilt: true, builtByAccount: null }),
      ],
      identities: new Map(),
      dustFloor: POOL_DUST_FLOOR,
    });
    expect(s.lines.every((l) => l.state === "below-floor")).toBe(true);
    expect(s.totals.recycled).toBe(0);
  });

  it("does not accrue dust, because dust belongs to nobody", () => {
    const s = computeStatement({
      pool: 3,
      usage: [usage({ moduleId: "a" }), usage({ moduleId: "b" })],
      identities: new Map([["a", linked(null)], ["b", linked(null)]]),
      dustFloor: 2,
    });
    expect(s.lines.every((l) => l.state === "below-floor")).toBe(true);
    expect(s.totals.accrued).toBe(0);
  });

  it("agrees with the job about which states carry into the next cycle", () => {
    /*
     * `carryInFor` selects on a hand-written list of state strings in SQL, and
     * `isAccruingState` decides which lines get an `accruedSinceCycle`. The two
     * drifting apart would carry an amount forward that nothing recorded as
     * waiting, or record one that never carried. Pinned here because the SQL
     * cannot be typechecked.
     */
    expect(isAccruingState("unattested")).toBe(true);
    expect(isAccruingState("no-account")).toBe(true);
    expect(isAccruingState("no-address")).toBe(true);
    expect(isAccruingState("unusable-address")).toBe(true);
    expect(isAccruingState("payable")).toBe(false);
    expect(isAccruingState("below-floor")).toBe(false);
    // The platform's share leaves for the gratitude pool the moment the
    // statement is computed. Carrying it as well would spend it twice.
    expect(isAccruingState("recycled")).toBe(false);
  });
});

describe("a Base address", () => {
  it("accepts the shape and refuses everything else", () => {
    expect(isUsableBaseAddress(ADDR)).toBe(true);
    expect(isUsableBaseAddress(`  ${ADDR}  `)).toBe(true);
    expect(isUsableBaseAddress("0xzz")).toBe(false);
    expect(isUsableBaseAddress(null)).toBe(false);
    expect(isUsableBaseAddress(undefined)).toBe(false);
    expect(isUsableBaseAddress("")).toBe(false);
  });
});

describe("the snapshot that makes a statement reproducible", () => {
  const inputs = {
    cycleNumber: 329,
    pool: 5000,
    carryIn: 0,
    dustFloor: 1,
    villages: [village("b-town", ["map", "events"]), village("amora", ["events", "map"])],
    usage: [usage({ moduleId: "map" }), usage({ moduleId: "events" })],
  };

  it("does not depend on the order anything arrived in", () => {
    const shuffled = {
      ...inputs,
      villages: [village("amora", ["map", "events"]), village("b-town", ["events", "map"])],
      usage: [usage({ moduleId: "events" }), usage({ moduleId: "map" })],
    };
    expect(statementSnapshotInput(inputs)).toBe(statementSnapshotInput(shuffled));
  });

  it("changes when a village's answer changes", () => {
    const changed = {
      ...inputs,
      villages: [inputs.villages[0], { ...village("amora", ["map"]), state: "carried" }],
    };
    expect(statementSnapshotInput(changed)).not.toBe(statementSnapshotInput(inputs));
  });

  it("changes when the pool changes", () => {
    expect(statementSnapshotInput({ ...inputs, pool: 5001 })).not.toBe(statementSnapshotInput(inputs));
  });

  it("changes when reach changes, even though the module list does not", () => {
    // The old digest was taken over village counts and would not have moved.
    const changed = { ...inputs, usage: [usage({ moduleId: "map", reach: 0.9 }), usage({ moduleId: "events" })] };
    expect(statementSnapshotInput(changed)).not.toBe(statementSnapshotInput(inputs));
  });

  it("changes when a module changes hands", () => {
    const changed = {
      ...inputs,
      usage: [usage({ moduleId: "map", platformBuilt: true }), usage({ moduleId: "events" })],
    };
    expect(statementSnapshotInput(changed)).not.toBe(statementSnapshotInput(inputs));
  });

  it("declares its own version, so a digest from the old inputs is not comparable", () => {
    expect(JSON.parse(statementSnapshotInput(inputs)).v).toBe(2);
  });

  it("does not move when a float reprints, because reach is fixed to six places", () => {
    const a = statementSnapshotInput({ ...inputs, usage: [usage({ moduleId: "map", reach: 0.1 + 0.2 })] });
    const b = statementSnapshotInput({ ...inputs, usage: [usage({ moduleId: "map", reach: 0.3 })] });
    expect(a).toBe(b);
  });
});

describe("the export a treasury tool consumes", () => {
  it("carries only the lines somebody is meant to send", () => {
    const s = computeStatement({
      pool: 1000,
      usage: [
        usage({ moduleId: "a", reach: 1, membersReached: 4 }),
        usage({ moduleId: "b", reach: 1, builtByAccount: null }),
      ],
      identities: new Map([["a", linked()]]),
    });
    const csv = statementCsv(s, 329);
    expect(csv).toContain(`329,a,Ada Lovelace,ada,${ADDR},1.000000,4,500`);
    expect(csv).not.toContain(",b,");
  });

  it("leaves the platform's own share out of a file that is a list of transfers", () => {
    const s = computeStatement({
      pool: 1000,
      usage: [usage({ moduleId: "a" }), usage({ moduleId: "ours", platformBuilt: true, builtByAccount: null })],
      identities: new Map([["a", linked()]]),
    });
    expect(statementCsv(s, 1)).not.toContain("ours");
  });

  it("quotes a builder name that holds a comma", () => {
    const s = computeStatement({
      pool: 100,
      usage: [usage({ moduleId: "a", builtBy: "Lovelace, Ada" })],
      identities: new Map([["a", linked()]]),
    });
    expect(statementCsv(s, 1)).toContain('"Lovelace, Ada"');
  });
});

/**
 * What the public page is entitled to call SENT.
 *
 * `settlementWord` decides it one row at a time and `sentOnChain` sums the
 * same rule, so the total under the word "Sent to builders" and the per-row
 * status beside each module have to come from one rule. When they drifted the
 * page said a payable total had been sent to builders, which is the sentence
 * the row-level word was already careful not to say.
 */
describe("sent means confirmed on chain, at the row and at the total", () => {
  const share = (over: Record<string, unknown>) => ({
    state: "payable", amount: 10, paidAt: null, ...over,
  });

  it("counts only a payable line the chain confirmed", () => {
    expect(sentOnChain([
      share({ amount: 10, paidAt: new Date() }),
      share({ amount: 5 }),
      share({ amount: 100, state: "recycled" }),
      share({ amount: 7, state: "no-address" }),
    ])).toEqual({ sent: 10, ready: 5 });
  });

  it("counts nothing sent before the treasury space executes", () => {
    expect(sentOnChain([share({ amount: 10 }), share({ amount: 5 })])).toEqual({ sent: 0, ready: 15 });
  });

  it("splits the payable total and never invents one", () => {
    // The page prints `sent` and `ready` straight, so their sum has to be the
    // payable total on its own. It used to subtract a share sum from a
    // statement column and clamp the result at zero, which would have hidden
    // any drift between the two.
    const rows = [
      share({ amount: 10, paidAt: new Date() }),
      share({ amount: 5 }),
      share({ amount: 100, state: "recycled" }),
    ];
    const { sent, ready } = sentOnChain(rows);
    const payable = rows.filter((r) => r.state === "payable").reduce((n, r) => n + Number(r.amount), 0);
    expect(sent + ready).toBe(payable);
  });

  it("agrees with the word the same row shows", () => {
    // Every row sentOnChain counts is a row settlementWord calls "sent", and
    // every row it skips is a row that word does not. Checked both ways, so a
    // future edit to one rule cannot pass by narrowing the other.
    const rows = [
      share({ amount: 10, paidAt: new Date() }),
      share({ amount: 5 }),
      share({ amount: 100, state: "recycled" }),
      share({ amount: 1, state: "below-floor" }),
      share({ amount: 7, state: "no-account" }),
    ];
    const wordSaysSent = rows.filter((r) => settlementWord(String(r.state), !!r.paidAt) === "sent");
    expect(wordSaysSent.length).toBe(1);
    expect(sentOnChain(rows).sent).toBe(wordSaysSent.reduce((n, r) => n + Number(r.amount), 0));
    expect(sentOnChain(rows.filter((r) => !wordSaysSent.includes(r))).sent).toBe(0);
  });
});
