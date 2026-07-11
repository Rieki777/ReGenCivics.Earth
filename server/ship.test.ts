import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import {
  rangesOverlap, overlapsAny, isValidVoyageLength, nightsBetween,
  computeVoyagePrice, computeQuestStandings, countCompleted,
  freeVoyagesUnlocked, percentBooked,
  invalidItineraryLocationIds, sanitizeItinerary, programTagForBooking,
  addDaysYmd, enumerateVoyageWeeks, type SeasonalBand,
  type QuestCompletionRow,
} from "./lib/ship-logic";
import { SHIP_PROGRAM_TAG, SHIP_GIFT_PROGRAM_TAG, MAX_FREE_VOYAGES } from "./lib/ship-config";

/**
 * ReGen Ship tests. The vitest env has no DATABASE_URL and no LLM key, so we
 * cover: the deterministic ship logic (overlap, voyage length, pricing, quest
 * finish-order and top-3, itinerary location-id validation, program tagging)
 * plus the tRPC input guards that reject before any DB call.
 */
function makeCtx(user: TrpcContext["user"] | null): TrpcContext {
  return {
    user,
    req: { protocol: "https", headers: {}, cookies: {}, socket: { remoteAddress: "127.0.0.1" } } as unknown as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  } as TrpcContext;
}
function user(id = 7): NonNullable<TrpcContext["user"]> {
  return {
    id, openId: `open-${id}`, email: `u${id}@example.com`, name: `User ${id}`,
    loginMethod: "google", role: "user", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date(),
  } as NonNullable<TrpcContext["user"]>;
}

describe("ship-logic: date ranges + voyage length", () => {
  it("detects overlapping ranges and treats a shared turnover day as free", () => {
    expect(rangesOverlap("2026-08-01", "2026-08-08", "2026-08-05", "2026-08-12")).toBe(true);
    // Booking B starts the day booking A ends (turnover day): not an overlap.
    expect(rangesOverlap("2026-08-01", "2026-08-08", "2026-08-08", "2026-08-15")).toBe(false);
  });

  it("overlapsAny checks against a list", () => {
    const existing = [{ startDate: "2026-08-08", endDate: "2026-08-15" }];
    expect(overlapsAny("2026-08-10", "2026-08-17", existing)).toBe(true);
    expect(overlapsAny("2026-08-15", "2026-08-22", existing)).toBe(false);
  });

  it("accepts 7-night multiples only", () => {
    expect(nightsBetween("2026-08-01", "2026-08-08")).toBe(7);
    expect(isValidVoyageLength("2026-08-01", "2026-08-08")).toBe(true); // 7
    expect(isValidVoyageLength("2026-08-01", "2026-08-15")).toBe(true); // 14
    expect(isValidVoyageLength("2026-08-01", "2026-08-05")).toBe(false); // 4
    expect(isValidVoyageLength("2026-08-01", "2026-08-11")).toBe(false); // 10
    expect(isValidVoyageLength("2026-08-08", "2026-08-01")).toBe(false); // negative
  });
});

describe("ship-logic: voyage week grid", () => {
  const bands: SeasonalBand[] = [
    { startDate: "2026-07-25", endDate: "2026-08-22", bioregion: "Rogue" },
    { startDate: "2026-08-22", endDate: "2026-08-29", bioregion: "On passage", migration: true },
    { startDate: "2026-08-29", endDate: "2026-12-31", bioregion: "Gorge" },
  ];
  function enumerate(over: Partial<Parameters<typeof enumerateVoyageWeeks>[0]> = {}) {
    return enumerateVoyageWeeks({
      seasonStart: "2026-07-25",
      horizonWeeks: 6,
      today: "2026-07-01",
      booked: [],
      requested: [],
      blackouts: [],
      pricingWindows: [],
      bands,
      ...over,
    });
  }

  it("addDaysYmd advances calendar days across month boundaries", () => {
    expect(addDaysYmd("2026-07-25", 7)).toBe("2026-08-01");
    expect(addDaysYmd("2026-08-29", 7)).toBe("2026-09-05");
  });

  it("enumerates a Saturday-to-Saturday grid where each week ends where the next begins", () => {
    const weeks = enumerate();
    expect(weeks).toHaveLength(6);
    expect(weeks[0].startDate).toBe("2026-07-25");
    expect(weeks[0].endDate).toBe("2026-08-01");
    expect(weeks[1].startDate).toBe("2026-08-01"); // shared turnover Saturday
    expect(weeks[0].price.total).toBe(299 * 7);
  });

  it("drops fully-past weeks relative to today", () => {
    const weeks = enumerate({ today: "2026-08-05", horizonWeeks: 3 });
    // The 07-25 and 08-01 weeks have ended; first offered week starts 08-08.
    expect(weeks[0].startDate).toBe("2026-08-08");
  });

  it("marks migration bands as on-passage and not selectable", () => {
    const weeks = enumerate();
    const passage = weeks.find((w) => w.startDate === "2026-08-22");
    expect(passage?.state).toBe("migration");
    expect(passage?.migration).toBe(true);
    expect(passage?.selectable).toBe(false);
    expect(passage?.bioregion).toBe("On passage");
  });

  it("resolves booked, requested, and turnover states", () => {
    const weeks = enumerate({
      booked: [{ startDate: "2026-08-01", endDate: "2026-08-08" }],
      requested: [{ startDate: "2026-08-08", endDate: "2026-08-15" }],
      blackouts: [{ startDate: "2026-08-15", endDate: "2026-08-22", reason: "turnover deep clean" }],
    });
    expect(weeks.find((w) => w.startDate === "2026-08-01")?.state).toBe("booked");
    expect(weeks.find((w) => w.startDate === "2026-08-01")?.selectable).toBe(false);
    const requested = weeks.find((w) => w.startDate === "2026-08-08");
    expect(requested?.state).toBe("requested");
    expect(requested?.selectable).toBe(true); // still bookable by others
    expect(weeks.find((w) => w.startDate === "2026-08-15")?.state).toBe("turnover");
  });

  it("applies a seasonal pricing multiplier to the week price", () => {
    const weeks = enumerate({
      pricingWindows: [{ startDate: "2026-07-25", endDate: "2026-08-01", multiplier: "1.25", label: "Peak" }],
    });
    expect(weeks[0].windowLabel).toBe("Peak");
    expect(weeks[0].priceMultiplier).toBe(1.25);
    expect(weeks[0].price.total).toBe(Math.round(149 * 7 * 1.25) + Math.round(150 * 7 * 1.25));
  });
});

describe("ship-logic: pricing", () => {
  it("splits a 7-night voyage into rental + offering at the trial rate", () => {
    const p = computeVoyagePrice(7);
    expect(p.rentalTotal).toBe(149 * 7);
    expect(p.offeringTotal).toBe(150 * 7);
    expect(p.total).toBe(299 * 7);
    expect(p.anchorTotal).toBe(600 * 7);
  });
  it("applies a seasonal multiplier", () => {
    const p = computeVoyagePrice(7, 1.25);
    expect(p.total).toBe(Math.round(149 * 7 * 1.25) + Math.round(150 * 7 * 1.25));
  });
});

describe("ship-logic: quest standings (finish order + top-3)", () => {
  const required = [1, 2, 3];
  function c(userId: number, actionId: number, verifiedAt: string | null, points: number): QuestCompletionRow {
    return { userId, actionId, status: "verified", verifiedAt, points, isRequired: required.includes(actionId) };
  }

  it("marks a crew a finisher only when every required action is verified, and counts the draw pool", () => {
    const rows: QuestCompletionRow[] = [
      // user 10 finishes all 3 required
      c(10, 1, "2026-08-01T09:00:00Z", 25), c(10, 2, "2026-08-01T09:30:00Z", 25), c(10, 3, "2026-08-01T10:00:00Z", 100),
      // user 20 finishes all 3 required earlier
      c(20, 1, "2026-08-01T07:00:00Z", 25), c(20, 2, "2026-08-01T07:30:00Z", 25), c(20, 3, "2026-08-01T08:00:00Z", 100),
      // user 30 only did 2 required, not in the draw
      c(30, 1, "2026-08-01T06:00:00Z", 25), c(30, 2, "2026-08-01T06:30:00Z", 25),
    ];
    const standings = computeQuestStandings(rows, required);
    expect(countCompleted(standings)).toBe(2); // 10 and 20 are in the draw
    expect(standings[0].isFinisher).toBe(true);
    expect(standings.find((s) => s.userId === 30)!.isFinisher).toBe(false);
  });
});

describe("ship-logic: free-voyage giveaway (booking-volume driven)", () => {
  it("gives the maiden voyage at 0% and one more per 20% booked, capped at six", () => {
    expect(freeVoyagesUnlocked(0)).toBe(1);   // the maiden voyage
    expect(freeVoyagesUnlocked(19)).toBe(1);
    expect(freeVoyagesUnlocked(20)).toBe(2);
    expect(freeVoyagesUnlocked(40)).toBe(3);
    expect(freeVoyagesUnlocked(60)).toBe(4);
    expect(freeVoyagesUnlocked(80)).toBe(5);
    expect(freeVoyagesUnlocked(100)).toBe(MAX_FREE_VOYAGES); // 6 at 100%
    expect(freeVoyagesUnlocked(140)).toBe(MAX_FREE_VOYAGES);  // never exceeds the cap
  });

  it("computes percent booked against the year target", () => {
    expect(percentBooked(0, 30)).toBe(0);
    expect(percentBooked(6, 30)).toBe(20);
    expect(percentBooked(30, 30)).toBe(100);
    expect(percentBooked(45, 30)).toBe(100); // clamped
    expect(percentBooked(5, 0)).toBe(0);     // guards divide-by-zero
  });
});

describe("ship-logic: concierge itinerary validation", () => {
  const allowed = [1, 2, 3];
  const itinerary = {
    summary: "A gentle loop.",
    days: [
      { day: 1, title: "Springs", locationIds: [1, 2] },
      { day: 2, title: "Invented", locationIds: [99, 3] },
    ],
  };
  it("flags invented location ids", () => {
    expect(invalidItineraryLocationIds(itinerary, allowed)).toEqual([99]);
  });
  it("drops invented ids when sanitizing", () => {
    const clean = sanitizeItinerary(itinerary, allowed);
    expect(clean.days[1].locationIds).toEqual([3]);
  });
});

describe("ship-logic: donation program tag", () => {
  it("tags gifted vs regular voyages", () => {
    expect(programTagForBooking({ isGifted: false })).toBe(SHIP_PROGRAM_TAG);
    expect(programTagForBooking({ isGifted: true })).toBe(SHIP_GIFT_PROGRAM_TAG);
  });
});

describe("ship router guards (reject before any DB call)", () => {
  it("quote returns a two-line price breakdown", async () => {
    const caller = appRouter.createCaller(makeCtx(null));
    const p = await caller.ship.quote({ startDate: "2026-08-01", endDate: "2026-08-08" });
    expect(p.total).toBe(299 * 7);
  });

  it("featureFlags reports concierge off when no LLM key is set", async () => {
    const caller = appRouter.createCaller(makeCtx(null));
    const flags = await caller.ship.featureFlags();
    expect(flags.concierge).toBe(false);
  });

  it("requestBooking rejects more than 4 guests", async () => {
    const caller = appRouter.createCaller(makeCtx(user()));
    await expect(
      caller.ship.requestBooking({ startDate: "2026-08-01", endDate: "2026-08-08", guests: 5, dietCommitment: true, waterDoctrineCommitment: true }),
    ).rejects.toBeTruthy();
  });

  it("requestBooking rejects a non-7-night voyage", async () => {
    const caller = appRouter.createCaller(makeCtx(user()));
    await expect(
      caller.ship.requestBooking({ startDate: "2026-08-01", endDate: "2026-08-05", guests: 2, dietCommitment: true, waterDoctrineCommitment: true }),
    ).rejects.toBeTruthy();
  });

  it("requestBooking requires both commitments", async () => {
    const caller = appRouter.createCaller(makeCtx(user()));
    await expect(
      caller.ship.requestBooking({ startDate: "2026-08-01", endDate: "2026-08-08", guests: 2, dietCommitment: false as unknown as true, waterDoctrineCommitment: true }),
    ).rejects.toBeTruthy();
  });

  it("concierge.generate refuses when the LLM is not configured", async () => {
    const caller = appRouter.createCaller(makeCtx(null));
    await expect(caller.ship.concierge.generate({ sessionId: 1 })).rejects.toMatchObject({ code: "PRECONDITION_FAILED" });
  });
});
