import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import { weightedDraw, type DrawEntry } from "./lib/ship-logic";
import {
  publicEntryTickets, cappedThresholdTickets, normalizeBonus,
  REFERRAL_CREDIT_CAP, GIVEAWAY_BONUS,
} from "@shared/shipGiveaway";

/**
 * Free Voyage Giveaway tests. The vitest env has no DATABASE_URL, so we cover the
 * deterministic pieces: the public-entry weight math (base + capped bonuses), the
 * threshold cap parameter, the third entry kind in the weighted draw, exclusion by
 * email, and the router input guards + the rules gate (all reject before any DB
 * call). Idempotency and the verify/credit flow are DB-backed and are checked live
 * on production in the deploy step.
 */
function makeCtx(user: TrpcContext["user"] | null): TrpcContext {
  return {
    user,
    req: { protocol: "https", headers: {}, cookies: {}, socket: { remoteAddress: "127.0.0.1" } } as unknown as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  } as TrpcContext;
}

const HEX_TOKEN = "a".repeat(64); // valid shape: 64 lowercase hex chars

describe("giveaway: public entry weight (1 + capped bonuses)", () => {
  it("is one base entry with no bonuses", () => {
    expect(publicEntryTickets(undefined)).toBe(1);
    expect(publicEntryTickets(null)).toBe(1);
    expect(publicEntryTickets({})).toBe(1);
  });

  it("sums the base and every bonus", () => {
    expect(publicEntryTickets({ referrals: 10, nomination: 3, quest: 2, ig: 1, yt: 1 })).toBe(18);
  });

  it("caps the referral credit at REFERRAL_CREDIT_CAP", () => {
    expect(REFERRAL_CREDIT_CAP).toBe(40);
    // Eight confirmed referrals earns 40; more never adds beyond the cap.
    expect(publicEntryTickets({ referrals: 8 * GIVEAWAY_BONUS.perReferral })).toBe(1 + 40);
    expect(publicEntryTickets({ referrals: 1000 })).toBe(1 + 40);
  });

  it("ignores negative or garbage bonus values", () => {
    expect(publicEntryTickets({ referrals: -5, nomination: -3, quest: Number.NaN })).toBe(1);
    expect(normalizeBonus({ referrals: "9", ig: 1 })).toEqual({ referrals: 9, nomination: 0, quest: 0, ig: 1, yt: 0 });
  });
});

describe("giveaway: threshold ticket cap parameter", () => {
  it("leaves the weight untouched when the cap is null (pre-public draws)", () => {
    expect(cappedThresholdTickets(300, null)).toBe(300);
    expect(cappedThresholdTickets(300, undefined)).toBe(300);
  });

  it("clamps effort-earned weight down to the cap", () => {
    expect(cappedThresholdTickets(300, 5)).toBe(5);
    expect(cappedThresholdTickets(150, 5)).toBe(5);
  });

  it("leaves weight already under the cap alone", () => {
    expect(cappedThresholdTickets(3, 5)).toBe(3);
  });
});

describe("giveaway: the third draw kind (public) + the cap in weightedDraw", () => {
  // Threshold + nomination weights are clamped by the cap; a public entry's
  // rule-defined weight (1 + capped bonuses) is passed through as-is.
  const build = (cap: number | null): DrawEntry[] => [
    { userId: 1, tickets: cappedThresholdTickets(300, cap), kind: "threshold", label: "user:1" },
    { userId: 2, nominationId: 9, tickets: cappedThresholdTickets(150, cap), kind: "nomination", label: "nomination:9" },
    { userId: null, entryId: 101, email: "a@x.com", tickets: publicEntryTickets({ referrals: 40 }), kind: "public", label: "entry:101" },
    { userId: null, entryId: 102, email: "b@x.com", tickets: publicEntryTickets({}), kind: "public", label: "entry:102" },
  ];

  it("counts a public entry's weight into the pool", () => {
    const uncapped = weightedDraw(build(null), 1)!;
    // 300 + 150 + (1+40) + 1
    expect(uncapped.audit.totalTickets).toBe(492);
    expect(uncapped.audit.entries).toHaveLength(4);
  });

  it("the cap parameter lowers effort-earned weight but never the public entries", () => {
    const capped = weightedDraw(build(5), 1)!;
    // 5 + 5 + (1+40) + 1: the public entries keep their rule-defined weight.
    expect(capped.audit.totalTickets).toBe(52);
  });

  it("lets a public entry win, and stays deterministic in the seed", () => {
    let publicWon = false;
    for (let seed = 1; seed < 60 && !publicWon; seed++) {
      const r = weightedDraw(build(5), seed);
      if (r?.winner.kind === "public") publicWon = true;
    }
    expect(publicWon).toBe(true);
    const a = weightedDraw(build(5), 4242)!;
    const b = weightedDraw(build(5), 4242)!;
    expect(a.winner).toEqual(b.winner);
  });

  it("excludes a prior winner by email (case-insensitive), even with no account", () => {
    // "A@X.com " matches the stored "a@x.com" after trim + lowercase.
    for (let seed = 1; seed < 60; seed++) {
      const r = weightedDraw(build(5), seed, new Set(), ["A@X.com "]);
      expect(r?.winner.entryId).not.toBe(101);
    }
    const audit = weightedDraw(build(5), 1, new Set(), ["a@x.com"])!.audit;
    const excluded = audit.entries.find((e) => e.entryId === 101);
    expect(excluded?.excluded).toBe(true);
  });
});

describe("giveaway router guards (reject before any DB call)", () => {
  it("enter rejects a malformed email", async () => {
    const caller = appRouter.createCaller(makeCtx(null));
    await expect(caller.shipGiveaway.enter({ email: "not-an-email" })).rejects.toBeTruthy();
  });

  it("enter is gated shut until the rules are approved (rejects before DB)", async () => {
    // GIVEAWAY_RULES_APPROVED is unset in the test env, so a well-formed entry
    // still refuses with PRECONDITION_FAILED before touching the database.
    const caller = appRouter.createCaller(makeCtx(null));
    await expect(caller.shipGiveaway.enter({ email: "real@example.com" })).rejects.toMatchObject({
      code: "PRECONDITION_FAILED",
    });
  });

  it("verify rejects a token of the wrong shape", async () => {
    const caller = appRouter.createCaller(makeCtx(null));
    await expect(caller.shipGiveaway.verify({ token: "short" })).rejects.toBeTruthy();
    await expect(caller.shipGiveaway.verify({ token: "z".repeat(64) })).rejects.toBeTruthy(); // non-hex
  });

  it("tag rejects an unknown funnel tag", async () => {
    const caller = appRouter.createCaller(makeCtx(null));
    await expect(
      caller.shipGiveaway.tag({ token: HEX_TOKEN, funnelTag: "nope" as unknown as "land" }),
    ).rejects.toBeTruthy();
  });

  it("bonus rejects an unknown kind", async () => {
    const caller = appRouter.createCaller(makeCtx(null));
    await expect(
      caller.shipGiveaway.bonus({ token: HEX_TOKEN, kind: "bogus" as unknown as "quest" }),
    ).rejects.toBeTruthy();
  });
});
