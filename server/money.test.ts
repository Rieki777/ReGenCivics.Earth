/**
 * Money carries two decimals, and comes back as a NUMBER.
 *
 * The second half is the one that needs a test. `mysql2` returns DECIMAL as a
 * string by default, and nothing throws when it does: every `a + b` in the four
 * hundred-odd places that read a money field silently becomes string
 * concatenation, so 100.00 + 50.00 renders as "100.0050.00", which looks like a
 * plausible and enormous number rather than an error. The pool sets
 * `decimalNumbers: true` (server/db.ts) to prevent that, and a flag is exactly
 * the kind of thing a later refactor drops without noticing.
 *
 * Run against a SCRATCH database, never `.env`, which is Railway production.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { sql } from 'drizzle-orm';
import * as dbHelpers from './db';

const skipIfNoDb = !process.env.DATABASE_URL;

let campaignId: number;

beforeAll(async () => {
  if (skipIfNoDb) return;
  const db = (await dbHelpers.getDb())!;
  await db.execute(sql`
    INSERT IGNORE INTO users (id, openId, email, name, loginMethod, role)
    VALUES (987201, 'money-probe', 'money@example.com', 'Money Probe', 'google', 'user')
  `);
  const [res]: any = await db.execute(sql`
    INSERT INTO campaigns
      (userId, status, title, description, projectName, financialTarget, currency,
       totalValue, landValue, equipmentValue, rolesValue, resourcesValue,
       pledgedTotal, pledgedLand, pledgedEquipment, pledgedRoles, pledgedResources,
       pledgedFinancial, durationDays, isDemo)
    VALUES (987201, 'draft', 'Money precision fixture', 'd', 'p', 0, 'CHF',
            0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 90, 0)
  `);
  campaignId = Number(res?.insertId ?? res?.[0]?.insertId);
});

describe('money columns', () => {
  it.skipIf(skipIfNoDb)('are DECIMAL(18,2), not int', async () => {
    const db = (await dbHelpers.getDb())!;
    const [rows]: any = await db.execute(sql`
      SELECT COLUMN_NAME n, COLUMN_TYPE ty
      FROM information_schema.columns
      WHERE table_schema = DATABASE()
        AND TABLE_NAME = 'campaigns'
        AND COLUMN_NAME IN ('financialTarget', 'totalValue', 'pledgedTotal', 'pledgedFinancial')
    `);
    const list = (Array.isArray(rows[0]) ? rows[0] : rows) as Array<{ n: string; ty: string }>;
    expect(list.length).toBe(4);
    for (const col of list) {
      expect(`${col.n}:${col.ty}`).toBe(`${col.n}:decimal(18,2)`);
    }
  });

  it.skipIf(skipIfNoDb)('round-trip centimes without losing them', async () => {
    const db = (await dbHelpers.getDb())!;
    await db.execute(sql`
      UPDATE campaigns
      SET financialTarget = 100000.50, pledgedTotal = 1234.56
      WHERE id = ${campaignId}
    `);
    const row = await dbHelpers.getCampaignById(campaignId);
    expect(row!.financialTarget).toBe(100000.5);
    expect(row!.pledgedTotal).toBe(1234.56);
  });

  it.skipIf(skipIfNoDb)('come back as numbers through the drizzle mapper', async () => {
    const row = await dbHelpers.getCampaignById(campaignId);
    expect(typeof row!.financialTarget).toBe('number');
    expect(typeof row!.pledgedTotal).toBe('number');

    // The concatenation this guards against would give "100000.51234.56".
    const summed = row!.pledgedTotal + row!.financialTarget;
    expect(typeof summed).toBe('number');
    expect(summed).toBeCloseTo(101235.06, 2);
  });

  /**
   * THE ONE THAT ACTUALLY GUARDS THE POOL FLAG, and the first version of this
   * test did not.
   *
   * Drizzle's `decimal({ mode: "number" })` converts on its own, so every read
   * that goes through a mapped column is a number whether or not the pool sets
   * `decimalNumbers`. The first version of this test read through
   * `getCampaignById`, so removing the flag changed nothing and it passed
   * happily: a guard that reports the same thing when it did not run as when it
   * passed.
   *
   * Raw `db.execute(sql...)` bypasses the mapper. Measured against MariaDB:
   * without the flag a DECIMAL comes back as the string "100000.00", with it as
   * the number 100000. This repo does read money through raw execute, so the
   * flag is load-bearing and this is the test that holds it.
   */
  it.skipIf(skipIfNoDb)('come back as numbers through a RAW query too, which is what the pool flag does', async () => {
    const db = (await dbHelpers.getDb())!;
    const [rows]: any = await db.execute(sql`
      SELECT financialTarget AS f, pledgedTotal AS p FROM campaigns WHERE id = ${campaignId}
    `);
    const row = (Array.isArray(rows[0]) ? rows[0][0] : rows[0]) as { f: unknown; p: unknown };
    expect(typeof row.f).toBe('number');
    expect(typeof row.p).toBe('number');
    // If this ever regresses, the sum below is "100000.51234.56" rather than a number.
    expect((row.p as number) + (row.f as number)).toBeCloseTo(101235.06, 2);
  });

  it.skipIf(skipIfNoDb)('sum centimes across contributions without drift', async () => {
    const db = (await dbHelpers.getDb())!;
    // Three pledges that only add up correctly with two decimals held.
    for (const v of [0.01, 0.02, 0.03]) {
      await db.execute(sql`
        INSERT INTO campaign_contributions
          (campaignId, contributorName, contributorEmail, contributionType, title,
           estimatedValue, status, quantityPledged, isAnonymous)
        VALUES (${campaignId}, 'Centime', ${'c' + String(v).replace('.', '') + '@example.com'},
                'resource', 'centime pledge', ${v}, 'accepted', 1, 0)
      `);
    }
    await dbHelpers.updateCampaignPledgedTotals(campaignId);
    const row = await dbHelpers.getCampaignById(campaignId);
    // 0.01 + 0.02 + 0.03 = 0.06. As ints every one of these would have been 0.
    expect(row!.pledgedTotal).toBeCloseTo(0.06, 2);
  });
});
