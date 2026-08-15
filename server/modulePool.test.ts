import { describe, expect, it } from "vitest";
import {
  POOL_DUST_FLOOR,
  computeStatement,
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

const ADDR = "0x4E617cd113364193d215d107AdD6fa50418AA2E4";

const usage = (over: Partial<PoolUsage> & { moduleId: string }): PoolUsage => ({
  villages: 1,
  builtBy: "Ada Lovelace",
  builtByAccount: "ada",
  ...over,
});

const linked = (address: string | null = ADDR): PoolIdentity => ({ userId: 7, address });

describe("lunar cycle numbers", () => {
  it("uses the Meeus reference and the mean synodic month, matching the village forks", () => {
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

  it("stays 6.79 hours away from the hub's other lunar epoch, which is why this file exists", () => {
    /*
     * Pinned deliberately. server/lib/lunar.ts anchors on 2025-01-29 12:36 UTC
     * and this file on Meeus; they are not a whole number of lunations apart,
     * so their boundaries differ. If somebody reconciles the two clocks
     * (ADR-50 D7) this test fails and points at the reason.
     */
    const other = new Date("2025-01-29T12:36:00Z").getTime();
    const lunations = (other - REFERENCE_NEW_MOON_MS) / (SYNODIC_MONTH_DAYS * 86400_000);
    const offsetHours = ((lunations - Math.round(lunations)) * SYNODIC_MONTH_DAYS * 24);
    expect(offsetHours).toBeCloseTo(6.787, 2);
  });
});

describe("the share arithmetic", () => {
  it("splits the pool in proportion to villages running each module", () => {
    const s = computeStatement({
      pool: 5000,
      usage: [usage({ moduleId: "a", villages: 3 }), usage({ moduleId: "b", villages: 1 })],
      identities: new Map([["a", linked()], ["b", linked()]]),
    });
    expect(s.lines.map((l) => [l.moduleId, l.amount])).toEqual([["a", 3750], ["b", 1250]]);
    expect(s.totals.paid).toBe(5000);
  });

  it("floors, and never mints the remainder", () => {
    const s = computeStatement({
      pool: 100,
      usage: [usage({ moduleId: "a", villages: 1 }), usage({ moduleId: "b", villages: 1 }), usage({ moduleId: "c", villages: 1 })],
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
        usage: [usage({ moduleId: "a", villages: 2 }), usage({ moduleId: "b", villages: 5 }), usage({ moduleId: "c", villages: 1 })],
        identities: new Map([["a", linked()], ["b", linked()], ["c", linked()]]),
      });
      expect(s.totals.paid + s.totals.accrued).toBeLessThanOrEqual(pool);
    }
  });

  it("balances by addition, always", () => {
    const s = computeStatement({
      pool: 5000,
      carryIn: 137,
      usage: [
        usage({ moduleId: "a", villages: 3 }),
        usage({ moduleId: "b", villages: 2, builtByAccount: null }),
        usage({ moduleId: "c", villages: 1 }),
      ],
      identities: new Map([["a", linked()], ["c", linked(null)]]),
    });
    expect(statementBalances(s.totals)).toBe(true);
    expect(s.totals.pool + s.totals.carryIn).toBe(5137);
  });

  it("ignores a module no village is running", () => {
    const s = computeStatement({
      pool: 5000,
      usage: [usage({ moduleId: "a", villages: 1 }), usage({ moduleId: "b", villages: 0 })],
      identities: new Map([["a", linked()], ["b", linked()]]),
    });
    expect(s.lines.map((l) => l.moduleId)).toEqual(["a"]);
    expect(s.totals.paid).toBe(5000);
  });

  it("pays nothing and keeps nothing when no module is eligible", () => {
    const s = computeStatement({ pool: 5000, usage: [], identities: new Map() });
    expect(s.lines).toEqual([]);
    expect(s.totals.paid).toBe(0);
    expect(s.totals.accrued).toBe(0);
    expect(s.totals.unallocated).toBe(5000);
    expect(statementBalances(s.totals)).toBe(true);
  });

  it("sorts the same way whatever order the roster answered in", () => {
    const forward = computeStatement({
      pool: 900,
      usage: [usage({ moduleId: "a", villages: 1 }), usage({ moduleId: "b", villages: 1 }), usage({ moduleId: "c", villages: 4 })],
      identities: new Map([["a", linked()], ["b", linked()], ["c", linked()]]),
    });
    const reversed = computeStatement({
      pool: 900,
      usage: [usage({ moduleId: "c", villages: 4 }), usage({ moduleId: "b", villages: 1 }), usage({ moduleId: "a", villages: 1 })],
      identities: new Map([["c", linked()], ["b", linked()], ["a", linked()]]),
    });
    expect(forward.lines.map((l) => l.moduleId)).toEqual(["c", "a", "b"]);
    expect(JSON.stringify(forward)).toBe(JSON.stringify(reversed));
  });
});

describe("who gets paid, and who is told why not", () => {
  it("pays a builder with an account and a linked address", () => {
    const s = computeStatement({
      pool: 100,
      usage: [usage({ moduleId: "a" })],
      identities: new Map([["a", linked()]]),
    });
    expect(s.lines[0].state).toBe("payable");
    expect(s.lines[0].address).toBe(ADDR);
    expect(s.totals.paid).toBe(100);
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
      usage: [usage({ moduleId: "a", villages: 1, builtByAccount: null }), usage({ moduleId: "b", villages: 1 })],
      identities: new Map([["b", linked()]]),
      dustFloor: POOL_DUST_FLOOR,
    });
    // Each raw share is 0.5, which floors to 0 and is below the floor of 1.
    expect(s.lines.every((l) => l.state === "below-floor")).toBe(true);
    expect(s.totals.accrued).toBe(0);
    expect(s.totals.unallocated).toBe(1);
  });

  it("does not accrue dust, because dust belongs to nobody", () => {
    const s = computeStatement({
      pool: 3,
      usage: [usage({ moduleId: "a", villages: 1 }), usage({ moduleId: "b", villages: 1 })],
      identities: new Map([["a", linked(null)], ["b", linked(null)]]),
      dustFloor: 2,
    });
    expect(s.lines.every((l) => l.state === "below-floor")).toBe(true);
    expect(s.totals.accrued).toBe(0);
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
    villages: [
      { id: "b-town", instanceId: "i2", state: "ok", modules: ["map", "events"] },
      { id: "amora", instanceId: "i1", state: "ok", modules: ["events", "map"] },
    ],
    usage: [usage({ moduleId: "map" }), usage({ moduleId: "events" })],
  };

  it("does not depend on the order anything arrived in", () => {
    const shuffled = {
      ...inputs,
      villages: [
        { id: "amora", instanceId: "i1", state: "ok", modules: ["map", "events"] },
        { id: "b-town", instanceId: "i2", state: "ok", modules: ["events", "map"] },
      ],
      usage: [usage({ moduleId: "events" }), usage({ moduleId: "map" })],
    };
    expect(statementSnapshotInput(inputs)).toBe(statementSnapshotInput(shuffled));
  });

  it("changes when a village's answer changes", () => {
    const changed = {
      ...inputs,
      villages: [...inputs.villages.slice(0, 1), { id: "amora", instanceId: "i1", state: "carried", modules: ["map"] }],
    };
    expect(statementSnapshotInput(changed)).not.toBe(statementSnapshotInput(inputs));
  });

  it("changes when the pool changes", () => {
    expect(statementSnapshotInput({ ...inputs, pool: 5001 })).not.toBe(statementSnapshotInput(inputs));
  });
});

describe("the export a treasury tool consumes", () => {
  it("carries only the lines somebody is meant to send", () => {
    const s = computeStatement({
      pool: 1000,
      usage: [usage({ moduleId: "a", villages: 1 }), usage({ moduleId: "b", villages: 1, builtByAccount: null })],
      identities: new Map([["a", linked()]]),
    });
    const csv = statementCsv(s, 329);
    expect(csv).toContain(`329,a,Ada Lovelace,ada,${ADDR},1,500`);
    expect(csv).not.toContain(",b,");
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
