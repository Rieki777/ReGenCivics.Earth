/**
 * Gratitude-on-bounty guard test.
 *
 * Verifies the bounty top-up path of game.sendGratitude:
 *  - it debits the sender's season gratitude budget,
 *  - it credits the paid worker's private tokens with source 'gratitude_bounty'
 *    and sourceRef 'bounty:{id}',
 *  - it refuses when the sender's budget is insufficient.
 *
 * DB-gated (skips without DATABASE_URL); seeds sentinel rows in the 990000+
 * id range and cleans them up. Runs in `pnpm test:integration`, not the
 * default `pnpm test`.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { sql } from "drizzle-orm";
import { getDb } from "./db";
import { getCurrentSeason } from "./game";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

const skipIfNoDb = !process.env.DATABASE_URL;

const SENDER_ID = 990001;
const DOER_ID = 990002;
const ALT_ID = 990003;
let bountyId: number | null = null;
let seasonId: number | null = null;

function ctxFor(userId: number): TrpcContext {
  return {
    user: {
      id: userId,
      openId: `grat-test-${userId}`,
      email: `grat-test-${userId}@regencivics.test`,
      name: "Gratitude Test User",
      loginMethod: "google",
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => {} } as TrpcContext["res"],
  };
}

describe.skipIf(skipIfNoDb)("gratitude on a bounty", () => {
  beforeAll(async () => {
    const db = await getDb();
    if (!db) return;
    const season = await getCurrentSeason();
    if (!season) return; // no active season -> tests below no-op via the guard
    seasonId = season.id;

    for (const [id, name] of [[SENDER_ID, "Sender"], [DOER_ID, "Doer"], [ALT_ID, "Alt"]] as const) {
      await db.execute(sql`INSERT INTO users (id, openId, name, email, role) VALUES (${id}, ${`grat-test-${id}`}, ${name}, ${`grat-test-${id}@regencivics.test`}, 'user')`);
    }
    // Profiles so creditPrivateTokens has a private-balance row to update.
    for (const id of [DOER_ID, ALT_ID]) {
      await db.execute(sql`INSERT INTO player_profiles (userId, displayName) VALUES (${id}, 'Gratitude Test')`);
    }
    // Sender's season budget: 5 leaves.
    await db.execute(sql`INSERT INTO gratitude_budgets (userId, seasonId, totalBudget, spent) VALUES (${SENDER_ID}, ${seasonId}, 5, 0)`);
    // A completed bounty with a paid doer.
    const bRes: any = await db.execute(sql`INSERT INTO bounties (sourceType, title, body, tokenType, tier, workStatus) VALUES ('call_task', 'Grat test bounty', 'body', 'regen', 'medium', 'completed')`);
    bountyId = bRes?.[0]?.insertId ?? bRes?.insertId ?? null;
    if (bountyId) {
      await db.execute(sql`INSERT INTO bounty_roles (bountyId, role, userId, amount, payStatus, paidAt) VALUES (${bountyId}, 'doer', ${DOER_ID}, 250, 'paid', NOW())`);
    }
  });

  afterAll(async () => {
    const db = await getDb();
    if (!db) return;
    if (bountyId) {
      await db.execute(sql`DELETE FROM bounty_roles WHERE bountyId = ${bountyId}`);
      await db.execute(sql`DELETE FROM bounties WHERE id = ${bountyId}`);
    }
    await db.execute(sql`DELETE FROM user_token_ledger WHERE userId IN (${DOER_ID}, ${ALT_ID})`);
    await db.execute(sql`DELETE FROM gratitude_transactions WHERE senderId = ${SENDER_ID}`);
    if (seasonId) await db.execute(sql`DELETE FROM gratitude_budgets WHERE userId = ${SENDER_ID} AND seasonId = ${seasonId}`);
    await db.execute(sql`DELETE FROM player_profiles WHERE userId IN (${DOER_ID}, ${ALT_ID})`);
    await db.execute(sql`DELETE FROM users WHERE id IN (${SENDER_ID}, ${DOER_ID}, ${ALT_ID})`);
  });

  it("debits the sender's budget and credits the worker with the bounty source", { timeout: 60_000 }, async () => {
    const db = await getDb();
    if (!db || !bountyId || !seasonId) return;
    const caller = appRouter.createCaller(ctxFor(SENDER_ID));

    const res = await caller.game.sendGratitude({ bountyId, amount: 3, message: "Thank you for shipping this" });
    expect(res.ok).toBe(true);
    expect(res.receiverId).toBe(DOER_ID);

    const budget = await db.execute(sql`SELECT spent FROM gratitude_budgets WHERE userId = ${SENDER_ID} AND seasonId = ${seasonId}`).then((r: any) => r[0]?.[0]);
    expect(Number(budget.spent)).toBe(3);

    const ledger = await db.execute(sql`SELECT source, sourceRef, amount FROM user_token_ledger WHERE userId = ${DOER_ID} AND source = 'gratitude_bounty'`).then((r: any) => r[0] ?? []);
    expect(ledger.length).toBe(1);
    expect(ledger[0].source).toBe("gratitude_bounty");
    expect(ledger[0].sourceRef).toBe(`bounty:${bountyId}`);
  });

  it("refuses when the sender's budget is insufficient", { timeout: 60_000 }, async () => {
    const db = await getDb();
    if (!db || !seasonId) return;
    // Exhaust the budget.
    await db.execute(sql`UPDATE gratitude_budgets SET spent = totalBudget WHERE userId = ${SENDER_ID} AND seasonId = ${seasonId}`);
    const caller = appRouter.createCaller(ctxFor(SENDER_ID));
    // Send to the alt receiver so the daily-limit guard doesn't mask the budget guard.
    await expect(
      caller.game.sendGratitude({ receiverId: ALT_ID, amount: 1, message: "over budget" }),
    ).rejects.toThrow(/budget/i);
  });
});
