/**
 * "Shorten to fit" (funding engine Phase 3): counting against a limit, the
 * instructions the model gets, the check that it added no number, and the
 * admin gate. The database-backed runs are in
 * server/funding-kit.integration.test.ts.
 */
import { describe, expect, it } from "vitest";
import { addedNumbers, fits, measure, shortenMessages } from "./funding/shorten";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

describe("measure and fits", () => {
  it("counts characters when the portal limits characters, words when it limits words", () => {
    expect(measure("abc de", { chars: 10, words: null })).toEqual({ used: 6, max: 10, unit: "characters" });
    expect(measure("one two three", { chars: null, words: 2 })).toEqual({ used: 3, max: 2, unit: "words" });
    expect(fits("one two", { chars: null, words: 2 })).toBe(true);
    expect(fits("x".repeat(11), { chars: 10, words: null })).toBe(false);
  });
});

describe("shortenMessages", () => {
  it("tells the model the limit, aims under it, and forbids new facts and dashes", () => {
    const { system, user } = shortenMessages("What do you do?", "x".repeat(300), { chars: 280, words: null });
    expect(user).toContain("Limit: 280 characters. Aim for about 266 characters.");
    expect(system).toContain("Never add a claim, a number, a name or a promise");
    expect(system).toContain("Never use an em-dash or an en-dash");
    expect(system).toContain("Never describe returns, yield, profit, investing or an offer");
  });

  it("says how far over the last try landed", () => {
    const { user } = shortenMessages("Q", "x".repeat(300), { chars: 280, words: null }, { text: "y".repeat(290), used: 290 });
    expect(user).toContain("Your last version was 290 characters, still over 280. Cut 24 more characters.");
  });
});

describe("addedNumbers", () => {
  it("finds a number the proposal states that the draft did not", () => {
    expect(addedNumbers("We have 43 projects.", "We have 43 projects and $50K.")).toEqual(["$50K"]);
  });

  it("accepts the same number written another way", () => {
    expect(addedNumbers("Paid $10,000 so far.", "Paid $10K.")).toEqual([]);
  });
});

describe("fundingKit.shorten", () => {
  it("is admin-only", async () => {
    const makeCtx = (user: TrpcContext["user"] | null) =>
      ({
        user,
        req: {
          protocol: "https",
          method: "POST",
          headers: { origin: "https://regencivics.earth", host: "regencivics.earth" },
          cookies: {},
          socket: { remoteAddress: "127.0.0.1" },
        },
        res: {},
      }) as unknown as TrpcContext;
    for (const user of [null, { id: 9, role: "user" } as unknown as TrpcContext["user"]]) {
      await expect(appRouter.createCaller(makeCtx(user)).fundingKit.shorten({ questionId: 1 })).rejects.toMatchObject({
        code: expect.stringMatching(/^(UNAUTHORIZED|FORBIDDEN)$/),
      });
    }
  });
});
