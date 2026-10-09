/**
 * The household offer limit (C6; build spec 2026-10-01, section 8.2).
 *
 * Offers used to share the one-shot form limit, 7 per 15 minutes per
 * connection, so the eighth person at a market stall or in a household was
 * refused. checkOfferLimit counts a signed-in person on their account (20),
 * and a signed-out one on the connection (40 together) and on the connection
 * plus a hash of their email's inbox (7 each). The person's own key is
 * checked first, so their refused retries never use up the connection's 40.
 *
 * No Redis (the in-memory path) and no database: the limit runs before
 * submitContribution reads anything.
 */
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TRPCError } from "@trpc/server";
import type { TrpcContext } from "./_core/context";
import { OFFER_LIMITS, __resetKeyedLimitsForTests, checkOfferLimit, offerInboxForLimit } from "./rate-limit";
import { canonicalInboxForLimit } from "./_core/oauth";
import { OFFER_LIMIT } from "../shared/crowdpoolCopy";

function ctx(ip: string, userId?: number): TrpcContext {
  return {
    user: userId == null ? null : ({ id: userId } as unknown as NonNullable<TrpcContext["user"]>),
    authMethod: null,
    req: { ip, headers: {} } as unknown as TrpcContext["req"],
    res: {} as unknown as TrpcContext["res"],
  } as unknown as TrpcContext;
}

/** The refusal, or null when the offer passed. */
async function attempt(c: TrpcContext, email: string): Promise<TRPCError | null> {
  try {
    await checkOfferLimit(c, email);
    return null;
  } catch (err) {
    if (err instanceof TRPCError) return err;
    throw err;
  }
}

beforeEach(() => __resetKeyedLimitsForTests());
afterEach(() => vi.useRealTimers());
afterAll(() => __resetKeyedLimitsForTests());

describe("checkOfferLimit", () => {
  it("is 20 per account, 40 per connection and 7 per connection and email, over 15 minutes", () => {
    expect(OFFER_LIMITS).toEqual({ windowMs: 15 * 60 * 1000, perAccount: 20, perConnection: 40, perConnectionAndEmail: 7 });
  });

  it("one person on one connection: seven offers pass and the eighth waits, with the connection copy", async () => {
    const c = ctx("203.0.113.10");
    for (let i = 0; i < 7; i++) expect(await attempt(c, "sam@b1-lane.invalid")).toBeNull();
    const refused = await attempt(c, "sam@b1-lane.invalid");
    expect(refused?.code).toBe("TOO_MANY_REQUESTS");
    expect(refused?.message).toBe(OFFER_LIMIT.connection(15));
    // Case and spaces make no new person.
    expect((await attempt(c, "  SAM@b1-lane.invalid "))?.code).toBe("TOO_MANY_REQUESTS");
  });

  it("a household: eight people with eight emails on one connection all pass", async () => {
    const c = ctx("203.0.113.11");
    for (let i = 0; i < 8; i++) expect(await attempt(c, `person${i}@b1-lane.invalid`)).toBeNull();
    // Each of them still has room of their own.
    expect(await attempt(c, "person0@b1-lane.invalid")).toBeNull();
  });

  it("the 41st offer on one connection waits, whoever sends it", async () => {
    const c = ctx("203.0.113.12");
    for (let i = 0; i < 40; i++) expect(await attempt(c, `stall${i % 10}@b1-lane.invalid`)).toBeNull();
    const refused = await attempt(c, "newcomer@b1-lane.invalid");
    expect(refused?.code).toBe("TOO_MANY_REQUESTS");
    expect(refused?.message).toBe(OFFER_LIMIT.connection(15));
    // Another connection is counted on its own.
    expect(await attempt(ctx("203.0.113.13"), "newcomer@b1-lane.invalid")).toBeNull();
  });

  it("one person's refused retries never use up the connection's room for everyone else", async () => {
    const c = ctx("203.0.113.17");
    for (let i = 0; i < 7; i++) expect(await attempt(c, "sam@b1-lane.invalid")).toBeNull();
    // Sam keeps tapping Send: every retry waits, and none of them counts.
    for (let i = 0; i < 33; i++) expect((await attempt(c, "sam@b1-lane.invalid"))?.code).toBe("TOO_MANY_REQUESTS");
    // The 33 other offers the connection has room for all pass.
    for (let i = 0; i < 33; i++) expect(await attempt(c, `neighbour${i}@b1-lane.invalid`)).toBeNull();
    // And then the connection's 40 are used: the next new person waits.
    expect((await attempt(c, "late.neighbour@b1-lane.invalid"))?.message).toBe(OFFER_LIMIT.connection(15));
  });

  it("a +tag or Gmail dots make no new person", async () => {
    const c = ctx("203.0.113.18");
    for (let i = 0; i < 7; i++) expect(await attempt(c, "sam@b1-lane.invalid")).toBeNull();
    expect((await attempt(c, "sam+1@b1-lane.invalid"))?.code).toBe("TOO_MANY_REQUESTS");
    expect((await attempt(c, "Sam+offers@B1-lane.invalid"))?.code).toBe("TOO_MANY_REQUESTS");
    for (let i = 0; i < 7; i++) expect(await attempt(c, "ada.lovelace@gmail.com")).toBeNull();
    expect((await attempt(c, "adalovelace+x@googlemail.com"))?.code).toBe("TOO_MANY_REQUESTS");
    // A different person on the same connection still has room.
    expect(await attempt(c, "samuel@b1-lane.invalid")).toBeNull();
  });

  it("folds an address the way the sign-in link limit does", () => {
    for (const email of [
      " Name+News@Example.Test ",
      "n.a.me+x@gmail.com",
      "n.ame@googlemail.com",
      "n.ame@example.test",
      "+only@example.test",
      "no-at-sign",
      "trailing@",
    ]) {
      expect(offerInboxForLimit(email)).toBe(canonicalInboxForLimit(email));
    }
    expect(offerInboxForLimit("N.A.M.E+1@googlemail.com")).toBe("name@gmail.com");
  });

  it("a signed-in account passes 20 and waits at 21 with the account copy, whatever its connection", async () => {
    for (let i = 0; i < 20; i++) {
      expect(await attempt(ctx(`198.51.100.${i + 1}`, 4242), "ada@b1-lane.invalid")).toBeNull();
    }
    const refused = await attempt(ctx("198.51.100.200", 4242), "other@b1-lane.invalid");
    expect(refused?.code).toBe("TOO_MANY_REQUESTS");
    expect(refused?.message).toBe(OFFER_LIMIT.account(15));
    // Another account on the same connection is not held up.
    expect(await attempt(ctx("198.51.100.200", 4243), "other@b1-lane.invalid")).toBeNull();
  });

  it("an account's offers do not use up the connection's signed-out room", async () => {
    const shared = "203.0.113.14";
    for (let i = 0; i < 20; i++) expect(await attempt(ctx(shared, 5151), "ada@b1-lane.invalid")).toBeNull();
    for (let i = 0; i < 7; i++) expect(await attempt(ctx(shared), "ada@b1-lane.invalid")).toBeNull();
  });

  it("says at least 1 minute, even with seconds left", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2030-01-01T10:00:00.000Z"));
    const c = ctx("203.0.113.15");
    for (let i = 0; i < 7; i++) expect(await attempt(c, "late@b1-lane.invalid")).toBeNull();
    vi.setSystemTime(new Date(Date.parse("2030-01-01T10:00:00.000Z") + OFFER_LIMITS.windowMs - 5_000));
    const refused = await attempt(c, "late@b1-lane.invalid");
    expect(refused?.message).toBe(OFFER_LIMIT.connection(1));
    expect(refused?.message).toContain("Try again in 1 minute.");
    // And once the window has passed, the offer goes through.
    vi.setSystemTime(new Date(Date.parse("2030-01-01T10:00:00.000Z") + OFFER_LIMITS.windowMs + 1));
    expect(await attempt(c, "late@b1-lane.invalid")).toBeNull();
  });

  it("never names the address in its refusal", async () => {
    const c = ctx("203.0.113.16");
    for (let i = 0; i < 7; i++) await attempt(c, "private.person@b1-lane.invalid");
    const refused = await attempt(c, "private.person@b1-lane.invalid");
    expect(refused?.message).not.toContain("private.person");
  });
});
