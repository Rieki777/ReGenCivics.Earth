/**
 * Gratitude-on-bounty guard test (lunar model).
 *
 * Replaces the seasonal version retired on 2026-07-28 with the code it
 * covered (game.sendGratitude, gratitude_budgets, a flat 5 $ReGen minted per
 * send). Under the lunar model an acknowledgment is free and moves no tokens;
 * what it earns the recipient is settled once per cycle from a capped pool.
 *
 * Verifies the bounty path of gratitude.send:
 *  - it records an acknowledgment tagged to the bounty,
 *  - it credits the worker NOTHING at send time,
 *  - it refuses a second acknowledgment of the same person in the same cycle,
 *  - the bounty tally counts the acknowledgment.
 *
 * DB-gated (skips without DATABASE_URL); seeds sentinel rows in the 990000+
 * id range and cleans them up. Runs in `pnpm test:integration`, not the
 * default `pnpm test`.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { sql } from "drizzle-orm";
import { getDb } from "./db";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

const skipIfNoDb = !process.env.DATABASE_URL;

const SENDER_ID = 990001;
const DOER_ID = 990002;
const DOER_HANDLE = "grat-test-doer";
let bountyId: number | null = null;

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
    } as unknown as NonNullable<TrpcContext["user"]>,
    authMethod: "legacy",
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => {} } as unknown as TrpcContext["res"],
  };
}

describe.skipIf(skipIfNoDb)("gratitude on a bounty", () => {
  beforeAll(async () => {
    const db = await getDb();
    if (!db) return;

    for (const [id, name, handle] of [
      [SENDER_ID, "Sender", "grat-test-sender"],
      [DOER_ID, "Doer", DOER_HANDLE],
    ] as const) {
      await db.execute(sql`INSERT INTO users (id, openId, name, email, role, handle) VALUES (${id}, ${`grat-test-${id}`}, ${name}, ${`grat-test-${id}@regencivics.test`}, 'user', ${handle})`);
    }
    await db.execute(sql`INSERT INTO player_profiles (userId, displayName) VALUES (${DOER_ID}, 'Gratitude Test')`);

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
    await db.execute(sql`DELETE FROM gratitudeLog WHERE senderId = ${SENDER_ID}`);
    await db.execute(sql`DELETE FROM gratitude_cycle_budgets WHERE userId = ${SENDER_ID}`);
    await db.execute(sql`DELETE FROM user_token_ledger WHERE userId = ${DOER_ID}`);
    await db.execute(sql`DELETE FROM player_profiles WHERE userId = ${DOER_ID}`);
    await db.execute(sql`DELETE FROM users WHERE id IN (${SENDER_ID}, ${DOER_ID})`);
  });

  it("records the acknowledgment against the bounty and mints nothing", { timeout: 60_000 }, async () => {
    const db = await getDb();
    if (!db || !bountyId) return;
    const caller = appRouter.createCaller(ctxFor(SENDER_ID));

    const res = await caller.gratitude.send({
      recipientHandle: DOER_HANDLE,
      message: "Thank you for shipping this",
      sourceType: "bounty",
      sourceId: bountyId,
    });
    expect(res.ok).toBe(true);
    expect(res.peopleThisCycle).toBe(1);

    const logged = await db.execute(sql`
      SELECT sourceType, sourceId, weight FROM gratitudeLog
      WHERE senderId = ${SENDER_ID} AND recipientId = ${DOER_ID}
    `).then((r: any) => r[0]?.[0]);
    expect(logged?.sourceType).toBe("bounty");
    expect(Number(logged?.sourceId)).toBe(bountyId);
    // Weight is stamped at cycle close, not at send.
    expect(logged?.weight).toBeNull();

    // The whole point of the cutover: a send moves no tokens.
    const credited = await db.execute(sql`
      SELECT COALESCE(SUM(amount), 0) AS total FROM user_token_ledger WHERE userId = ${DOER_ID}
    `).then((r: any) => Number(r[0]?.[0]?.total ?? 0));
    expect(credited).toBe(0);
  });

  it("refuses a second acknowledgment of the same person in the same cycle", { timeout: 60_000 }, async () => {
    if (!bountyId) return;
    const caller = appRouter.createCaller(ctxFor(SENDER_ID));
    await expect(
      caller.gratitude.send({
        recipientHandle: DOER_HANDLE,
        message: "Thanking again in the same cycle",
        sourceType: "bounty",
        sourceId: bountyId,
      }),
    ).rejects.toThrow();
  });

  it("counts the acknowledgment in the bounty tally", { timeout: 60_000 }, async () => {
    if (!bountyId) return;
    const caller = appRouter.createCaller(ctxFor(SENDER_ID));
    const rows = await caller.bounties.recentCompleted({ limit: 20 });
    const row = (rows as any[]).find((r) => r.bounty?.id === bountyId);
    expect(row?.gratitude.count).toBe(1);
  });
});
