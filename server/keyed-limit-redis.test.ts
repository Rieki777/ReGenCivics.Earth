/**
 * The per-email sign-in limit with Redis connected (security review
 * 2026-09-28, the lockout finding).
 *
 * checkKeyedLimit counts sign-in links per inbox, 3 per 15 minutes. The
 * Redis path used redisRateLimit, which records every request before it
 * counts, refused ones included. Anyone can ask for someone else's address,
 * so one request every 4 minutes kept that address over the limit forever:
 * each refusal pushed the window forward, no new link was ever issued, and
 * the owner's own attempts all got "try again in 15 minutes".
 *
 * redisKeyedLimit (server/cache.ts) takes a refused request back out, so it
 * never extends the window. This runs it against a small in-memory stand-in
 * for the sorted-set commands it uses, on a simulated clock. No Redis, no
 * database.
 */
import { describe, expect, it } from "vitest";
import { redisKeyedLimit, type KeyedLimitMulti, type KeyedLimitRedis } from "./cache";

const MIN = 60_000;
const WINDOW = 15 * MIN;
const MAX = 3;

/** ZADD / ZREMRANGEBYSCORE / ZCARD / ZRANGE WITHSCORES / ZREM / EXPIRE over a Map, MULTI run in order. */
function fakeRedis() {
  const sets = new Map<string, Array<{ score: number; value: string }>>();
  const setOf = (key: string) => {
    let s = sets.get(key);
    if (!s) {
      s = [];
      sets.set(key, s);
    }
    return s;
  };
  const client: KeyedLimitRedis = {
    multi() {
      const ops: Array<() => unknown> = [];
      const m: KeyedLimitMulti = {
        zRemRangeByScore(key, min, max) {
          ops.push(() => {
            const s = setOf(key);
            const keep = s.filter((e) => e.score < min || e.score > max);
            const removed = s.length - keep.length;
            sets.set(key, keep);
            return removed;
          });
          return m;
        },
        zAdd(key, member) {
          ops.push(() => {
            const s = setOf(key);
            const existing = s.find((e) => e.value === member.value);
            if (existing) {
              existing.score = member.score;
              return 0;
            }
            s.push({ ...member });
            s.sort((a, b) => a.score - b.score);
            return 1;
          });
          return m;
        },
        zCard(key) {
          ops.push(() => setOf(key).length);
          return m;
        },
        zRangeWithScores(key, start, stop) {
          ops.push(() => setOf(key).slice(start, stop + 1).map((e) => ({ ...e })));
          return m;
        },
        expire() {
          ops.push(() => 1);
          return m;
        },
        async exec() {
          return ops.map((op) => op());
        },
      };
      return m;
    },
    async zRem(key, member) {
      const s = setOf(key);
      const keep = s.filter((e) => e.value !== member);
      sets.set(key, keep);
      return s.length - keep.length;
    },
  };
  return { client, size: (key: string) => setOf(key).length };
}

describe("redisKeyedLimit", () => {
  it("never counts a refused request, so asking over and over can't keep an address locked", async () => {
    const { client, size } = fakeRedis();
    const key = "authmail:victim";
    const t0 = Date.parse("2026-09-28T10:00:00Z");
    const ask = (at: number) => redisKeyedLimit(key, MAX, WINDOW, client, at);

    for (let i = 0; i < 3; i++) expect((await ask(t0 + i * 1000)).allowed).toBe(true);
    // Refused every minute for 14 minutes: none of these counts.
    for (let m = 1; m <= 14; m++) {
      const r = await ask(t0 + m * MIN);
      expect(r.allowed, `minute ${m}`).toBe(false);
      expect(size(key)).toBe(3);
    }
    // The advice is honest: one more passes when the oldest counted request leaves.
    const late = await ask(t0 + 10 * MIN);
    expect(late.allowed).toBe(false);
    expect(late.resetAt - (t0 + 10 * MIN)).toBe(5 * MIN);
    // 15 minutes after the first allowed request, one more passes.
    expect((await ask(t0 + WINDOW + 1)).allowed).toBe(true);
  });

  it("under the review's attack schedule, new links keep being issued and the owner gets through", async () => {
    const { client } = fakeRedis();
    const key = "authmail:victim2";
    const t0 = Date.parse("2026-09-28T10:00:00Z");
    const issued: number[] = [];
    const ask = async (at: number) => {
      const r = await redisKeyedLimit(key, MAX, WINDOW, client, at);
      if (r.allowed) issued.push(at);
      return r;
    };
    // The stranger: 3 quick requests, then one every 4 minutes for 2 hours.
    const events: Array<{ at: number; who: "stranger" | "owner" }> = [];
    for (let i = 0; i < 3; i++) events.push({ at: t0 + i * 1000, who: "stranger" });
    for (let m = 4; m <= 120; m += 4) events.push({ at: t0 + m * MIN, who: "stranger" });
    // The owner tries at the times the review measured.
    for (const m of [20, 45, 90, 121]) events.push({ at: t0 + m * MIN + 30_000, who: "owner" });
    events.sort((a, b) => a.at - b.at);
    const ownerResults: boolean[] = [];
    for (const e of events) {
      const r = await ask(e.at);
      if (e.who === "owner") ownerResults.push(r.allowed);
    }
    // Before the fix: 0 links after minute 2, and every owner attempt refused.
    expect(issued.filter((at) => at > t0 + 2 * MIN).length).toBeGreaterThan(10);
    expect(ownerResults.some(Boolean)).toBe(true);
    // A fresh link always sits in the inbox: no gap between links reaches the 15-minute expiry plus a request's spacing.
    for (let i = 1; i < issued.length; i++) expect(issued[i] - issued[i - 1]).toBeLessThanOrEqual(WINDOW + 4 * MIN);
  });

  it("counts two requests in the same millisecond as two", async () => {
    const { client, size } = fakeRedis();
    const at = Date.parse("2026-09-28T10:00:00Z");
    await Promise.all([1, 2, 3].map(() => redisKeyedLimit("authmail:same-ms", MAX, WINDOW, client, at)));
    expect(size("authmail:same-ms")).toBe(3);
    expect((await redisKeyedLimit("authmail:same-ms", MAX, WINDOW, client, at)).allowed).toBe(false);
  });

  it("fails open with no client or a Redis error", async () => {
    expect((await redisKeyedLimit("k", 1, WINDOW, null)).allowed).toBe(true);
    const broken: KeyedLimitRedis = {
      multi() {
        throw new Error("connection lost");
      },
      async zRem() {
        return 0;
      },
    };
    expect((await redisKeyedLimit("k", 1, WINDOW, broken)).allowed).toBe(true);
  });
});
