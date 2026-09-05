/**
 * The restricted-balance guard on claims.
 *
 * `players.requestClaim` takes a list of token TYPES and no amount, and claims
 * the whole private balance for each. Crowdpool $RCivics is issued at
 * contribution so a contributor sees where they stand immediately, while the
 * money behind it stays refundable until the campaigns they routed to close.
 * Without a restriction, one claim sweeps the refundable part to Base, across a
 * bridge that is one-way by design, and the refund is then owed against tokens
 * that have left the platform.
 *
 * These tests exercise the real arithmetic against a real database. Run against
 * a SCRATCH database, never `.env`, which is Railway production:
 *
 *   DATABASE_URL=mysql://root:pw@127.0.0.1:3307/rc_qa_crowdpool \
 *     npx vitest run server/crowdpool-restricted-claim.test.ts
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { sql } from 'drizzle-orm';
import * as dbHelpers from './db';
import {
  getRestrictedBalance,
  getClaimableBalance,
  RESTRICTED_CREDIT_SOURCES,
} from './db/tokens';

const skipIfNoDb = !process.env.DATABASE_URL;
const USER = 987101;

async function clearLedger() {
  const db = (await dbHelpers.getDb())!;
  await db.execute(sql`DELETE FROM user_token_ledger WHERE userId = ${USER}`);
}

beforeAll(async () => {
  if (skipIfNoDb) return;
  const db = (await dbHelpers.getDb())!;
  await db.execute(sql`
    INSERT IGNORE INTO users (id, openId, email, name, loginMethod, role)
    VALUES (${USER}, 'restricted-claim-probe', 'restricted@example.com', 'Restricted Probe', 'google', 'user')
  `);
  if (!(await dbHelpers.getPlayerProfileByUserId(USER))) {
    await dbHelpers.createPlayerProfile({ userId: USER, displayName: 'Restricted Probe' });
  }
});

describe('the restricted portion of a private balance', () => {
  it('names crowdpool contributions as restricted', () => {
    // If this ever stops being true, every test below passes vacuously.
    expect(RESTRICTED_CREDIT_SOURCES).toContain('crowdpool_contribution');
  });

  it.skipIf(skipIfNoDb)('is zero for a holder with no restricted credits', async () => {
    await clearLedger();
    await dbHelpers.creditPrivateTokens({
      userId: USER, tokenType: 'rcivics', amount: 500,
      source: 'manual', description: 'ordinary credit',
    });
    expect(await getRestrictedBalance(USER, 'rcivics')).toBe(0);
    expect(await getClaimableBalance(USER, 'rcivics', 500)).toBe(500);
  });

  it.skipIf(skipIfNoDb)('holds back a crowdpool credit and leaves the rest claimable', async () => {
    await clearLedger();
    await dbHelpers.creditPrivateTokens({
      userId: USER, tokenType: 'rcivics', amount: 500,
      source: 'manual', description: 'ordinary credit',
    });
    const privateBalance = await dbHelpers.creditPrivateTokens({
      userId: USER, tokenType: 'rcivics', amount: 100000,
      source: 'crowdpool_contribution', description: '100,000 CHF routed',
    });

    // Both are visible to the holder.
    expect(privateBalance).toBe(100500);
    // Only the ordinary credit may leave the platform.
    expect(await getRestrictedBalance(USER, 'rcivics')).toBe(100000);
    expect(await getClaimableBalance(USER, 'rcivics', 100500)).toBe(500);
  });

  it.skipIf(skipIfNoDb)('never lets a claim exceed the private balance', async () => {
    await clearLedger();
    await dbHelpers.creditPrivateTokens({
      userId: USER, tokenType: 'rcivics', amount: 1000,
      source: 'crowdpool_contribution', description: 'restricted',
    });
    // The whole balance is restricted, so nothing is claimable.
    expect(await getClaimableBalance(USER, 'rcivics', 1000)).toBe(0);
    // And a stale or wrong private figure can never manufacture headroom.
    expect(await getClaimableBalance(USER, 'rcivics', 0)).toBe(0);
    expect(await getClaimableBalance(USER, 'rcivics', -50)).toBe(0);
  });

  it.skipIf(skipIfNoDb)('lifts a restriction by a compensating row, not by editing history', async () => {
    await clearLedger();
    await dbHelpers.creditPrivateTokens({
      userId: USER, tokenType: 'rcivics', amount: 100000,
      source: 'crowdpool_contribution', description: 'issued at contribution',
    });
    expect(await getClaimableBalance(USER, 'rcivics', 100000)).toBe(0);

    // The campaigns closed. Move the same amount out of the restricted source
    // and into an unrestricted one. Two rows, both kept, reason visible.
    await dbHelpers.creditPrivateTokens({
      userId: USER, tokenType: 'rcivics', amount: -100000,
      source: 'crowdpool_contribution', description: 'restriction lifted on close',
    });
    const after = await dbHelpers.creditPrivateTokens({
      userId: USER, tokenType: 'rcivics', amount: 100000,
      source: 'crowdpool_close', description: 'campaigns closed, now claimable',
    });

    expect(after).toBe(100000);                                    // balance unchanged
    expect(await getRestrictedBalance(USER, 'rcivics')).toBe(0);   // nothing held back
    expect(await getClaimableBalance(USER, 'rcivics', 100000)).toBe(100000);

    // History is intact: three rows, none rewritten.
    const db = (await dbHelpers.getDb())!;
    const [rows]: any = await db.execute(
      sql`SELECT COUNT(*) n FROM user_token_ledger WHERE userId = ${USER} AND tokenType = 'rcivics'`);
    const n = Number(Array.isArray(rows) ? rows[0]?.n : rows?.n);
    expect(n).toBe(3);
  });

  it.skipIf(skipIfNoDb)('refunds by debiting the restricted source, leaving nothing claimable', async () => {
    await clearLedger();
    await dbHelpers.creditPrivateTokens({
      userId: USER, tokenType: 'rcivics', amount: 100000,
      source: 'crowdpool_contribution', description: 'issued at contribution',
    });
    const after = await dbHelpers.creditPrivateTokens({
      userId: USER, tokenType: 'rcivics', amount: -100000,
      source: 'crowdpool_contribution', description: 'refunded, no campaign closed',
    });
    expect(after).toBe(0);
    expect(await getRestrictedBalance(USER, 'rcivics')).toBe(0);
    expect(await getClaimableBalance(USER, 'rcivics', 0)).toBe(0);
  });

  it.skipIf(skipIfNoDb)('restricts per token type, not across them', async () => {
    await clearLedger();
    await dbHelpers.creditPrivateTokens({
      userId: USER, tokenType: 'rcivics', amount: 100000,
      source: 'crowdpool_contribution', description: 'restricted rcivics',
    });
    await dbHelpers.creditPrivateTokens({
      userId: USER, tokenType: 'regen', amount: 700,
      source: 'quest_completion', description: 'unrelated token',
    });
    expect(await getRestrictedBalance(USER, 'regen')).toBe(0);
    expect(await getClaimableBalance(USER, 'regen', 700)).toBe(700);
    expect(await getClaimableBalance(USER, 'rcivics', 100000)).toBe(0);
  });
});
