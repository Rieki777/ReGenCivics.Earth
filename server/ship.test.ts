import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import {
  rangesOverlap, overlapsAny, isValidVoyageLength, nightsBetween,
  computeVoyagePrice, computeQuestStandings, countEntered, maidenVoyageUserId,
  freeVoyagesUnlocked, percentBooked, weightedDraw, sponsorshipProgress, applySponsorship,
  invalidItineraryLocationIds, sanitizeItinerary, programTagForBooking,
  addDaysYmd, enumerateVoyageWeeks, type SeasonalBand,
  type QuestCompletionRow, type DrawEntry,
} from "./lib/ship-logic";
import {
  SHIP_PROGRAM_TAG, SHIP_GIFT_PROGRAM_TAG, MAX_FREE_VOYAGES,
  SHIP_ENTRY_THRESHOLD_POINTS, CREW_SPONSOR_GOAL_CENTS, isValidCrewSize,
} from "./lib/ship-config";
import { detectEscalation, makeSafeMessage } from "./lib/ship-shipwright";

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

  it("enumerates a Monday-to-Monday grid where each week ends where the next begins", () => {
    const weeks = enumerate();
    expect(weeks).toHaveLength(6);
    expect(weeks[0].startDate).toBe("2026-07-25"); // boards this day, 3pm
    expect(weeks[0].returnDate).toBe("2026-07-31"); // returns the following Sunday, 11am (start + 6)
    expect(weeks[0].endDate).toBe("2026-08-01"); // exclusive end of the 7-day slot
    expect(weeks[1].startDate).toBe("2026-08-01"); // shared turnover boundary
    expect(weeks[0].isYear2).toBe(false);
    expect(weeks[0].price.total).toBe(299 * 7);
  });

  it("doubles the price and labels year-two weeks", () => {
    const weeks = enumerate({ year2Start: "2026-08-08", year2Multiplier: 2, horizonWeeks: 4 });
    const y1 = weeks.find((w) => w.startDate === "2026-08-01");
    const y2 = weeks.find((w) => w.startDate === "2026-08-08");
    expect(y1?.isYear2).toBe(false);
    expect(y2?.isYear2).toBe(true);
    expect(y2?.priceMultiplier).toBe(2);
    expect(y2?.windowLabel).toBe("Year two, full rate");
    expect(y2?.price.total).toBe(299 * 7 * 2);
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

describe("ship-logic: crew capacity (four aboard, five for a family)", () => {
  it("allows up to four aboard", () => {
    expect(isValidCrewSize(1, 0)).toBe(true);
    expect(isValidCrewSize(2, 2)).toBe(true);
    expect(isValidCrewSize(4, 0)).toBe(true);
  });
  it("allows five only when at least three are children", () => {
    expect(isValidCrewSize(2, 3)).toBe(true); // family of five
    expect(isValidCrewSize(1, 4)).toBe(true);
    expect(isValidCrewSize(3, 2)).toBe(false); // five, but only two children
    expect(isValidCrewSize(5, 0)).toBe(false);
  });
  it("rejects six or more, and requires an adult", () => {
    expect(isValidCrewSize(3, 3)).toBe(false);
    expect(isValidCrewSize(0, 3)).toBe(false);
  });
});

describe("ship-shipwright: safety-rail escalation detection", () => {
  it("escalates propane, brakes, steering, air, burning, fire, and CO", () => {
    expect(detectEscalation("I smell propane near the stove").escalate).toBe(true);
    expect(detectEscalation("there's a rotten egg smell").escalate).toBe(true);
    expect(detectEscalation("the brakes feel spongy and won't stop").escalate).toBe(true);
    expect(detectEscalation("the steering is pulling hard to one side").escalate).toBe(true);
    expect(detectEscalation("she dropped on one side, air suspension leak").escalate).toBe(true);
    expect(detectEscalation("there's a burning smell from the dash").escalate).toBe(true);
    expect(detectEscalation("smoke is coming from the engine, maybe fire").escalate).toBe(true);
    expect(detectEscalation("the carbon monoxide alarm is going off").escalate).toBe(true);
  });
  it("does not escalate ordinary questions", () => {
    expect(detectEscalation("how do I bring the slide-outs in?").escalate).toBe(false);
    expect(detectEscalation("where is the drinking water filter?").escalate).toBe(false);
    expect(detectEscalation("the Starlink dropped, what do I do?").escalate).toBe(false);
  });
  it("make-safe message always tells them to call the Keeper", () => {
    const msg = makeSafeMessage("a propane smell or leak");
    expect(msg).toContain("Keeper");
    expect(msg.toLowerCase()).toContain("propane");
  });
});

describe("ship-logic: quest standings (points threshold)", () => {
  function c(userId: number, actionId: number, verifiedAt: string | null, points: number): QuestCompletionRow {
    return { userId, actionId, status: "verified", verifiedAt, points };
  }

  it("enters a crew at 150 points, not at 149, tickets equal to points", () => {
    const rows: QuestCompletionRow[] = [
      // user 10: 150 exactly -> in the draw
      c(10, 1, "2026-08-01T09:00:00Z", 100), c(10, 2, "2026-08-01T09:30:00Z", 50),
      // user 20: 149 -> not in the draw
      c(20, 1, "2026-08-01T07:00:00Z", 100), c(20, 2, "2026-08-01T07:30:00Z", 49),
    ];
    const standings = computeQuestStandings(rows, 150);
    const u10 = standings.find((s) => s.userId === 10)!;
    const u20 = standings.find((s) => s.userId === 20)!;
    expect(u10.isEntered).toBe(true);
    expect(u10.tickets).toBe(150); // points are tickets
    expect(u20.isEntered).toBe(false);
    expect(u20.tickets).toBe(0); // not entered -> no tickets
    expect(countEntered(standings)).toBe(1);
  });

  it("uses the configured threshold and records the crossing time", () => {
    const rows: QuestCompletionRow[] = [
      c(10, 1, "2026-08-01T09:00:00Z", 100), // crosses here (150) at 09:30
      c(10, 2, "2026-08-01T09:30:00Z", 50),
      c(10, 3, "2026-08-01T10:00:00Z", 50), // 200 total
    ];
    const standings = computeQuestStandings(rows, SHIP_ENTRY_THRESHOLD_POINTS);
    expect(standings[0].verifiedPoints).toBe(200);
    expect(standings[0].enteredAt).toBe(Date.parse("2026-08-01T09:30:00Z"));
  });

  it("gives the maiden voyage to the first crew across the line", () => {
    const rows: QuestCompletionRow[] = [
      // user 10 crosses at 10:00
      c(10, 1, "2026-08-01T09:00:00Z", 100), c(10, 2, "2026-08-01T10:00:00Z", 100),
      // user 20 crosses earlier, at 08:00
      c(20, 1, "2026-08-01T07:00:00Z", 100), c(20, 2, "2026-08-01T08:00:00Z", 100),
    ];
    const standings = computeQuestStandings(rows, 150);
    expect(maidenVoyageUserId(standings)).toBe(20);
    expect(standings[0].userId).toBe(20); // entered first, sorts first
  });
});

describe("ship-logic: weighted draw (auditable)", () => {
  const entries: DrawEntry[] = [
    { userId: 1, tickets: 100, kind: "threshold" },
    { userId: 2, tickets: 300, kind: "threshold" },
    { userId: 3, nominationId: 9, tickets: 150, kind: "nomination" }, // a nominee
  ];

  it("is deterministic in the seed and logs a full audit", () => {
    const r1 = weightedDraw(entries, 12345);
    const r2 = weightedDraw(entries, 12345);
    expect(r1).not.toBeNull();
    expect(r1!.winner).toEqual(r2!.winner); // same seed -> same winner
    expect(r1!.audit.totalTickets).toBe(550);
    expect(r1!.audit.entries).toHaveLength(3);
    expect(r1!.audit.seed).toBe(12345);
    expect(r1!.audit.roll).toBeGreaterThanOrEqual(0);
    expect(r1!.audit.roll).toBeLessThan(550);
  });

  it("includes an approved nominee (no account yet) as a live entry", () => {
    // A seed that lands the roll in the nominee's slice ([400,550)).
    let seenNominee = false;
    for (let seed = 1; seed < 50 && !seenNominee; seed++) {
      const r = weightedDraw(entries, seed);
      if (r?.winner.nominationId === 9) seenNominee = true;
    }
    expect(seenNominee).toBe(true);
  });

  it("excludes prior winners and zero-ticket entries", () => {
    const r = weightedDraw(entries, 7, new Set([1, 2]));
    // Only the nominee remains eligible.
    expect(r!.winner.nominationId).toBe(9);
    expect(r!.audit.entries.filter((e) => !e.excluded)).toHaveLength(1);
  });

  it("returns null when no one is eligible", () => {
    expect(weightedDraw([{ userId: 1, tickets: 0, kind: "threshold" }], 1)).toBeNull();
    expect(weightedDraw(entries, 1, new Set([1, 2, 3]))).toBeNull();
  });
});

describe("ship-logic: crew sponsorship (accumulation + goal flip)", () => {
  it("tracks progress toward the voyage goal, clamped at 100%", () => {
    const p = sponsorshipProgress(105000, CREW_SPONSOR_GOAL_CENTS);
    expect(p.percent).toBe(50);
    expect(p.goalReached).toBe(false);
    expect(sponsorshipProgress(CREW_SPONSOR_GOAL_CENTS + 5000, CREW_SPONSOR_GOAL_CENTS).percent).toBe(100);
  });

  it("flips the goal exactly once, on the contribution that crosses it", () => {
    const first = applySponsorship(200000, 5000, CREW_SPONSOR_GOAL_CENTS); // 200000 -> 205000, not yet
    expect(first.goalReached).toBe(false);
    const crossing = applySponsorship(205000, 10000, CREW_SPONSOR_GOAL_CENTS); // -> 215000, crosses 210000
    expect(crossing.sponsoredCents).toBe(215000);
    expect(crossing.goalReached).toBe(true);
    expect(crossing.newlyReached).toBe(true);
    const after = applySponsorship(215000, 5000, CREW_SPONSOR_GOAL_CENTS); // already past
    expect(after.newlyReached).toBe(false);
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

  it("requestBooking rejects five adults (only a family of five may sail)", async () => {
    const caller = appRouter.createCaller(makeCtx(user()));
    await expect(
      caller.ship.requestBooking({ startDate: "2026-08-01", endDate: "2026-08-08", adults: 5, children: 0, guests: 5, dietCommitment: true, waterDoctrineCommitment: true }),
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

  it("crew.sponsor refuses when Stripe is not configured", async () => {
    const caller = appRouter.createCaller(makeCtx(null));
    await expect(caller.ship.crew.sponsor({ crewProfileId: 1, amountCents: 2500 })).rejects.toMatchObject({ code: "PRECONDITION_FAILED" });
  });

  it("crew.upsert and crew.mine require sign-in", async () => {
    const caller = appRouter.createCaller(makeCtx(null));
    await expect(caller.ship.crew.upsert({ displayName: "Test Crew" })).rejects.toBeTruthy();
    await expect(caller.ship.crew.mine()).rejects.toBeTruthy();
  });

  it("featureFlags reports the entry threshold and sponsor state", async () => {
    const caller = appRouter.createCaller(makeCtx(null));
    const flags = await caller.ship.featureFlags();
    expect(flags.entryThreshold).toBe(SHIP_ENTRY_THRESHOLD_POINTS);
    expect(flags.sponsorGoalCents).toBe(CREW_SPONSOR_GOAL_CENTS);
    expect(flags.sponsor).toBe(false); // no Stripe key in the test env
  });
});

describe("ship copy: the old complete-all-quest framing is gone", () => {
  const root = join(__dirname, "..");
  const files = [
    "client/src/pages/ship/ShipQuest.tsx",
    "client/src/pages/ship/ShipQuestRules.tsx",
    "client/src/pages/ship/Ship.tsx",
    "client/src/components/blog/ShipArticleBlocks.tsx",
    "client/src/data/blogPosts.ts",
  ];
  const banned = [/complete the quest to enter/i, /complete all 7/i, /everyone who completes the quest/i, /Seven actions to earn/i];

  it("has no leftover complete-the-quest entry strings in the ship surfaces", () => {
    for (const rel of files) {
      const text = readFileSync(join(root, rel), "utf8");
      for (const re of banned) {
        expect(re.test(text), `${rel} still contains ${re}`).toBe(false);
      }
    }
  });

  it("states the 150-point entry model on the quest page", () => {
    const quest = readFileSync(join(root, "client/src/pages/ship/ShipQuest.tsx"), "utf8");
    expect(/150 points/.test(quest) || /\{threshold\}/.test(quest)).toBe(true);
  });
});
