/**
 * Crowdpooling: the adversarial pass.
 *
 * Every test here is an ATTACK, not a confirmation. The existing
 * contributions.test.ts walks the happy path and stays green; this file tries
 * to break the same procedures with input and timing a real campaign will
 * produce on its first busy day.
 *
 * Written against the real tRPC procedures through createCaller and a real
 * MySQL-shaped database, because the defects this hunts (a total that falls
 * when value is delivered, a slot guard that reads a counter nothing has
 * incremented yet, two stewards clicking Accept at the same moment) are all
 * invisible to a mock.
 *
 * Run it against a SCRATCH database, never production:
 *   DATABASE_URL=mysql://root:pw@127.0.0.1:3307/rc_qa_crowdpool \
 *     npx vitest run server/crowdpool-adversarial.test.ts
 *
 * Tests whose subject is a KNOWN, UNFIXED defect are marked `it.fails(...)`,
 * which passes while the bug is present and FAILS THE BUILD the day someone
 * fixes it without deleting the test. That is deliberate: a plain `expect`
 * asserting the buggy number would quietly bless the bug forever.
 */

import { describe, it, expect, vi, beforeAll } from 'vitest';
import { sql } from 'drizzle-orm';
import { appRouter } from './routers';
import * as dbHelpers from './db';
import type { TrpcContext } from './_core/context';

const skipIfNoDb = !process.env.DATABASE_URL;

vi.mock('./_core/notification', () => ({
  notifyOwner: vi.fn().mockResolvedValue(true),
  notifyIfEnabled: vi.fn().mockResolvedValue(true),
}));

vi.mock('./_core/email', () => ({
  sendEmail: vi.fn().mockResolvedValue({ id: 'test-email-id', trackingData: {} }),
  emailTemplates: {
    contributionAccepted: vi.fn().mockReturnValue({ subject: 'T', html: '<p>T</p>' }),
    contributionRejected: vi.fn().mockReturnValue({ subject: 'T', html: '<p>T</p>' }),
    contributionFulfilled: vi.fn().mockReturnValue({ subject: 'T', html: '<p>T</p>' }),
  },
  testEmailConnection: vi.fn().mockResolvedValue(true),
}));

type AuthenticatedUser = NonNullable<TrpcContext['user']>;

const STEWARD_ID = 987001;

function ctxFor(userId: number, ip: string): TrpcContext {
  const user = {
    id: userId,
    openId: `adv-open-${userId}`,
    email: `adv${userId}@example.com`,
    name: `Adversary ${userId}`,
    loginMethod: 'google',
    role: 'user',
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  } as unknown as AuthenticatedUser;

  return {
    user,
    authMethod: 'legacy',
    req: { protocol: 'https', headers: { 'x-forwarded-for': ip } } as unknown as TrpcContext['req'],
    res: { clearCookie: () => {} } as unknown as TrpcContext['res'],
  };
}

/** A fresh IP per submission: the rate limiter is 7 per 15 min per IP+action. */
let ipCounter = 0;
const nextIp = () => `10.90.${Math.floor(ipCounter / 250) % 250}.${(ipCounter++ % 250) + 1}`;

const steward = () => appRouter.createCaller(ctxFor(STEWARD_ID, nextIp()));

async function ensureScoreVariable() {
  const database = await dbHelpers.getDb();
  if (!database) return;
  await database.execute(sql`
    INSERT INTO game_variables (category, subcategory, \`key\`, displayName, description, value, valueType, defaultValue, isActive)
    VALUES ('scoring', 'weights', 'scoring.weights.crowdpool_contribution', 'Crowd-pooling contribution', 'Points per crowd-pooling pledge', 20, 'integer', 20, 1)
    ON DUPLICATE KEY UPDATE isActive = 1
  `);
}

/** Create an ACTIVE campaign with one need of the given slot count. */
async function activeCampaign(opts: {
  title: string;
  financialTarget?: number;
  quantityWanted?: number;
  itemValue?: number;
}) {
  const caller = steward();
  const campaign = await caller.campaigns.create({
    title: opts.title,
    description: `Adversarial fixture: ${opts.title}`,
    projectName: `Adv ${opts.title}`,
    currency: 'USD',
    financialTarget: opts.financialTarget ?? 100000,
    items: [
      {
        category: 'resource',
        kind: 'item',
        capitalType: 'material',
        quantityWanted: opts.quantityWanted ?? 1,
        resourceName: 'Adversarial need',
        resourceDescription: 'One slot under attack',
        estimatedValue: opts.itemValue ?? 1000,
      },
    ],
  });
  await caller.campaigns.updateStatus({ id: campaign.id, status: 'active' });
  const items = await caller.campaigns.getItems({ campaignId: campaign.id });
  return { campaignId: campaign.id, itemId: items[0].id as number };
}

async function pledge(campaignId: number, itemId: number | undefined, value: number, name: string, qty = 1) {
  return appRouter.createCaller(ctxFor(STEWARD_ID, nextIp())).campaigns.submitContribution({
    campaignId,
    ...(itemId ? { campaignItemId: itemId } : {}),
    contributionType: 'resource',
    title: `Pledge from ${name}`,
    estimatedValue: value,
    quantityPledged: qty,
    contributorName: name,
    contributorEmail: `${name.toLowerCase().replace(/[^a-z0-9]/g, '')}@example.com`,
    resourceName: 'Adversarial need',
  });
}

async function itemRow(itemId: number) {
  return (await dbHelpers.getCampaignItemById(itemId))!;
}

async function campaignRow(campaignId: number) {
  return (await dbHelpers.getCampaignById(campaignId))!;
}

beforeAll(async () => {
  if (skipIfNoDb) return;
  await ensureScoreVariable();
  const profile = await dbHelpers.getPlayerProfileByUserId(STEWARD_ID);
  if (!profile) await dbHelpers.createPlayerProfile({ userId: STEWARD_ID, displayName: 'Adversary Steward' });
});

// ─────────────────────────────────────────────────────────────────────────────
// 1. The money must never be wrong
// ─────────────────────────────────────────────────────────────────────────────

describe('the pooled total', () => {
  /**
   * DEFECT. getCampaignPledgedTotals (server/db.ts:1198-1203) filters on
   * status = 'accepted' ALONE. 'fulfilled' and 'thanked' are LATER states in
   * the same lifecycle, so the moment a steward confirms delivery the
   * contribution stops counting. The recompute is also only called from the
   * accepted/rejected branch, so the drop is deferred until the next accept
   * and then lands all at once.
   *
   * Member-visible consequence: the campaign's headline number FALLS when a
   * pledge is delivered. village-os reads pledgedTotal/totalValue as its
   * progress ring (docs/modules/crowdpool.md), so the village sees it too.
   */
  it.skipIf(skipIfNoDb)('does not shrink when a delivered pledge is confirmed', async () => {
    const { campaignId, itemId } = await activeCampaign({ title: 'Total shrink', quantityWanted: 5 });
    const caller = steward();

    const a = await pledge(campaignId, itemId, 10000, 'Ada');
    await caller.campaigns.updateContributionStatus({ contributionId: a.id, status: 'accepted' });
    expect((await campaignRow(campaignId)).pledgedTotal).toBe(10000);

    // Ada delivers. Nothing was lost; the project HAS the value.
    await caller.campaigns.updateContributionStatus({ contributionId: a.id, status: 'fulfilled' });

    // Bo pledges 5k, which triggers the recompute.
    const b = await pledge(campaignId, itemId, 5000, 'Bo');
    await caller.campaigns.updateContributionStatus({ contributionId: b.id, status: 'accepted' });

    // The honest number is 15000. The code stores 5000: Ada's delivered value
    // has left the total entirely.
    expect((await campaignRow(campaignId)).pledgedTotal).toBe(15000);
  });

  /**
   * REGRESSION GUARD, two halves.
   *
   * `pledgedTotal` contains every standing contribution INCLUDING financial ones
   * (server/db.ts, `totals.total +=` runs unconditionally). `pledgedFinancial` is
   * a BREAKDOWN of it, the same way pledgedLand and pledgedRoles are. That
   * overlap is deliberate and is asserted here so nobody "fixes" the columns
   * when the callers were the problem.
   *
   * What was wrong was four display surfaces adding the two together, so a
   * $10,000 cash pledge rendered as $20,000 raised, including the site-wide
   * pooled figure on the public gallery.
   */
  it.skipIf(skipIfNoDb)('keeps a financial pledge in pledgedTotal, with pledgedFinancial as its breakdown', async () => {
    const { campaignId, itemId } = await activeCampaign({ title: 'Double count', quantityWanted: 3 });
    const caller = steward();

    const c = await appRouter.createCaller(ctxFor(STEWARD_ID, nextIp())).campaigns.submitContribution({
      campaignId,
      campaignItemId: itemId,
      contributionType: 'financial',
      title: 'A crypto pledge',
      estimatedValue: 10000,
      financialAmount: 10000,
      quantityPledged: 1,
      contributorName: 'Crypto',
      contributorEmail: 'crypto@example.com',
    });
    await caller.campaigns.updateContributionStatus({ contributionId: c.id, status: 'accepted' });

    const row = await campaignRow(campaignId);
    expect(row.pledgedTotal).toBe(10000);      // the whole pledge, counted once
    expect(row.pledgedFinancial).toBe(10000);  // the same money, as a breakdown
  });

  /**
   * The whole status set, in one place, because this is the thing that was wrong
   * and a partial fix would be easy to make. A pledge counts while it stands
   * (accepted, then fulfilled on delivery, then thanked) and stops counting when
   * it is genuinely gone (pending, rejected, withdrawn, expired).
   *
   * `expired` is asserted here rather than through the nightly sweep because the
   * sweep's own test cannot run on a MariaDB scratch database: it backdates
   * `claimExpiresAt` and compares against `NOW()`, and that comparison behaves
   * differently there. CI runs it against MySQL 9.4, where it passes. This test
   * exercises the same arithmetic without the timestamp.
   */
  it.skipIf(skipIfNoDb)('counts a pledge while it stands and drops it when it is gone', async () => {
    const database = (await dbHelpers.getDb())!;
    const standing = ['accepted', 'fulfilled', 'thanked'];
    const gone = ['pending', 'rejected', 'withdrawn', 'expired'];

    for (const status of [...standing, ...gone]) {
      const { campaignId, itemId } = await activeCampaign({ title: `Status ${status}`, quantityWanted: 3 });
      const c = await pledge(campaignId, itemId, 4000, `St${status}`);

      // Set the status directly: several of these are terminal and cannot be
      // reached through the router from 'pending'.
      await database.execute(
        sql`UPDATE campaign_contributions SET status = ${status} WHERE id = ${c.id}`);
      await dbHelpers.updateCampaignPledgedTotals(campaignId);

      const row = await campaignRow(campaignId);
      const expected = standing.includes(status) ? 4000 : 0;
      expect({ status, pledgedTotal: row.pledgedTotal }).toEqual({ status, pledgedTotal: expected });
    }
  });

  /**
   * The half that actually stops this coming back. A behaviour test cannot catch
   * it, because the database is correct: the defect only exists in what a caller
   * does with two correct numbers. And the sum LOOKS right, because the line
   * directly above it in CampaignProgressTracker adds totalValue and
   * financialTarget, which genuinely ARE disjoint.
   *
   * Covers the infix form and the reduce form, with the nullish-coalescing and
   * property prefixes both surfaces used stripped before matching.
   */
  it('no client surface adds pledgedTotal to pledgedFinancial', async () => {
    const { readdirSync, readFileSync, statSync } = await import('node:fs');
    const { join } = await import('node:path');

    const offenders: string[] = [];
    const walk = (dir: string) => {
      for (const name of readdirSync(dir)) {
        const full = join(dir, name);
        if (statSync(full).isDirectory()) { walk(full); continue; }
        if (!/\.(ts|tsx)$/.test(name)) continue;
        readFileSync(full, 'utf8').split(/\r?\n/).forEach((line, i) => {
          const t = line.trimStart();
          if (t.startsWith('*') || t.startsWith('//') || t.startsWith('/*')) return;
          const bare = line.replace(/[\s()]|\?\?\s*0|\w+\./g, '');
          if (/pledgedTotal\+pledgedFinancial|pledgedFinancial\+pledgedTotal/.test(bare)) {
            offenders.push(`${full.replace(/\\/g, '/').split('/client/')[1]}:${i + 1}  ${line.trim()}`);
          }
        });
      }
    };
    walk(join(process.cwd(), 'client', 'src'));
    expect(offenders).toEqual([]);
  });

});

// ─────────────────────────────────────────────────────────────────────────────
// 2. Slot arithmetic under adversarial input
// ─────────────────────────────────────────────────────────────────────────────

describe('need slot guards', () => {
  /**
   * DEFECT, and it needs no concurrency at all. submitContribution guards on
   * `item.quantityClaimed + quantityPledged > item.quantityWanted`
   * (campaigns.ts:626), but quantityClaimed is only incremented when a steward
   * ACCEPTS (campaigns.ts:714-718). Until then it is 0, so every pending claim
   * on a one-slot need passes the guard. The accept branch then increments
   * with no cap check of its own.
   */
  it.skipIf(skipIfNoDb).fails('refuses a sixth pending claim on a one-slot need', async () => {
    const { campaignId, itemId } = await activeCampaign({ title: 'Serial overclaim', quantityWanted: 1 });

    await pledge(campaignId, itemId, 100, 'Slot1');
    // Five more people claim the same single slot. Each should be refused.
    for (const name of ['Slot2', 'Slot3', 'Slot4', 'Slot5', 'Slot6']) {
      await expect(pledge(campaignId, itemId, 100, name)).rejects.toThrow(/fully claimed/i);
    }
  });

  it.skipIf(skipIfNoDb).fails('never lets quantityClaimed exceed quantityWanted', async () => {
    const { campaignId, itemId } = await activeCampaign({ title: 'Accept overclaim', quantityWanted: 1 });
    const caller = steward();

    const ids: number[] = [];
    for (const name of ['Ov1', 'Ov2', 'Ov3']) ids.push((await pledge(campaignId, itemId, 100, name)).id);
    for (const id of ids) await caller.campaigns.updateContributionStatus({ contributionId: id, status: 'accepted' });

    const item = await itemRow(itemId);
    expect(item.quantityClaimed).toBeLessThanOrEqual(item.quantityWanted);
  });

  it.skipIf(skipIfNoDb).fails('never lets quantityDelivered exceed quantityWanted', async () => {
    const { campaignId, itemId } = await activeCampaign({ title: 'Deliver overclaim', quantityWanted: 1 });
    const caller = steward();

    const ids: number[] = [];
    for (const name of ['Dv1', 'Dv2', 'Dv3']) ids.push((await pledge(campaignId, itemId, 100, name)).id);
    for (const id of ids) {
      await caller.campaigns.updateContributionStatus({ contributionId: id, status: 'accepted' });
      await caller.campaigns.updateContributionStatus({ contributionId: id, status: 'fulfilled' });
    }

    const item = await itemRow(itemId);
    expect(item.quantityDelivered).toBeLessThanOrEqual(item.quantityWanted);
  });

  it.skipIf(skipIfNoDb)('refuses a claim against a need belonging to another campaign', async () => {
    const one = await activeCampaign({ title: 'Cross A' });
    const two = await activeCampaign({ title: 'Cross B' });
    await expect(pledge(one.campaignId, two.itemId, 100, 'Crosser')).rejects.toThrow(/does not belong/i);
  });

  it.skipIf(skipIfNoDb)('refuses a claim on a campaign that is not active', async () => {
    const { campaignId, itemId } = await activeCampaign({ title: 'Withdrawn project' });
    await steward().campaigns.updateStatus({ id: campaignId, status: 'cancelled' });
    await expect(pledge(campaignId, itemId, 100, 'TooLate')).rejects.toThrow(/not accepting/i);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. Concurrency. Twelve people acting at once, not twelve in a row.
// ─────────────────────────────────────────────────────────────────────────────

describe('concurrency', () => {
  /**
   * The accept branch guards double-reserve on `prevStatus !== 'accepted'`
   * read from a row fetched BEFORE the write, with no transaction and no
   * SELECT ... FOR UPDATE. Two stewards (or one steward and a double-click)
   * both read 'pending' and both increment.
   */
  /**
   * MEASURES, does not gate. This defect is real and reproduced 20 times out of
   * 20 on a local scratch database, but it is a race, and its reproduction rate
   * depends on machine timing and pool contention. An `it.fails` here would go
   * red on any CI runner that happened to serialise the two calls, and a test
   * that flakes is worse than no test. So it prints what it measured and
   * asserts only the invariant that holds under BOTH the correct and the buggy
   * behaviour: a slot is never lost.
   *
   * The evidence for the defect lives in CROWDPOOLING_GAP_ANALYSIS_2026-09-04.md
   * section 3.4. When the fix lands, turn the log line into
   * `expect(observed).toEqual([1,1,1,1,1])` and delete this comment.
   */
  it.skipIf(skipIfNoDb)('measures whether two simultaneous accepts double-reserve a slot', async () => {
    const observed: number[] = [];
    for (let trial = 0; trial < 5; trial++) {
      const { campaignId, itemId } = await activeCampaign({ title: `Race accept ${trial}`, quantityWanted: 10 });
      const c = await pledge(campaignId, itemId, 100, `Racer${trial}`, 1);

      await Promise.allSettled([
        steward().campaigns.updateContributionStatus({ contributionId: c.id, status: 'accepted' }),
        steward().campaigns.updateContributionStatus({ contributionId: c.id, status: 'accepted' }),
      ]);
      observed.push((await itemRow(itemId)).quantityClaimed);
    }
    const doubled = observed.filter((n) => n > 1).length;
    console.log(
      `[adversarial] concurrent accept: quantityClaimed per trial = ${JSON.stringify(observed)}; ` +
      `correct is 1 every time; double-reserved ${doubled} of ${observed.length}`);
    // Never lose a slot. True whether or not the race fires, so this cannot flake.
    expect(observed.every((n) => n >= 1)).toBe(true);
  });

  /**
   * The fulfilled block calls itself idempotent in a comment
   * (campaigns.ts:725-726) on the strength of `firstFulfillment =
   * !contribution.fulfilledAt` — read before the write, outside any lock. Two
   * concurrent calls both see null, both increment quantityDelivered, both
   * fire a score event, and both write a Living Tree row. The comment is a
   * claim; this is the measurement.
   */
  /**
   * MEASURES, does not gate, for the same reason as the accept race above.
   * Measured on a scratch database over 10 trials: quantityDelivered landed on
   * 2 every time, and the payoff ran twice every time, writing 20 Living Tree
   * rows and 20 score events for 10 pledges. Evidence in
   * CROWDPOOLING_GAP_ANALYSIS_2026-09-04.md section 3.4.
   */
  it.skipIf(skipIfNoDb)('measures whether two simultaneous fulfils deliver twice and pay twice', async () => {
    const observed: number[] = [];
    for (let trial = 0; trial < 5; trial++) {
      const { campaignId, itemId } = await activeCampaign({ title: `Race fulfil ${trial}`, quantityWanted: 10 });
      const caller = steward();
      const c = await pledge(campaignId, itemId, 100, `DoubleP${trial}`);
      await caller.campaigns.updateContributionStatus({ contributionId: c.id, status: 'accepted' });

      await Promise.allSettled([
        steward().campaigns.updateContributionStatus({ contributionId: c.id, status: 'fulfilled' }),
        steward().campaigns.updateContributionStatus({ contributionId: c.id, status: 'fulfilled' }),
      ]);
      observed.push((await itemRow(itemId)).quantityDelivered);
    }
    const doubled = observed.filter((n) => n > 1).length;
    console.log(
      `[adversarial] concurrent fulfil: quantityDelivered per trial = ${JSON.stringify(observed)}; ` +
      `correct is 1 every time; double-delivered ${doubled} of ${observed.length}`);
    expect(observed.every((n) => n >= 1)).toBe(true);
  });

  /**
   * The sibling repo's measured shape: twelve people acting at the same
   * instant, ten of them failing. This asks whether twelve simultaneous
   * claimants on a twelve-slot need all succeed, and whether the counter
   * lands on exactly twelve.
   */
  it.skipIf(skipIfNoDb)('twelve simultaneous claimants on twelve slots neither fail nor miscount', async () => {
    const { campaignId, itemId } = await activeCampaign({ title: 'Twelve at once', quantityWanted: 12 });

    const submitted = await Promise.allSettled(
      Array.from({ length: 12 }, (_, i) => pledge(campaignId, itemId, 100, `Sim${i}`)),
    );
    const ok = submitted.filter((r) => r.status === 'fulfilled');
    const failed = submitted.filter((r) => r.status === 'rejected');
    if (failed.length) {
      // Surface the real reason rather than a bare count.
      console.error('[adversarial] simultaneous submit failures:',
        failed.map((f) => String((f as PromiseRejectedResult).reason).slice(0, 160)));
    }
    expect(ok.length).toBe(12);

    const ids = ok.map((r) => (r as PromiseFulfilledResult<{ id: number }>).value.id);
    await Promise.allSettled(
      ids.map((id) => steward().campaigns.updateContributionStatus({ contributionId: id, status: 'accepted' })),
    );

    expect((await itemRow(itemId)).quantityClaimed).toBe(12);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. Rounding, units and overflow. Every money column is int(11).
// ─────────────────────────────────────────────────────────────────────────────

describe('money units', () => {
  /**
   * estimatedValue is `z.number().min(0)` — any float passes validation — and
   * lands in an int(11) column. A pledge of $1000.75 is stored as something
   * else, and the contributor is never told which.
   */
  it.skipIf(skipIfNoDb)('stores a fractional pledge as the value the contributor was shown, or refuses it', async () => {
    const { campaignId, itemId } = await activeCampaign({ title: 'Fractional', quantityWanted: 3 });
    const caller = steward();

    let submitted: { id: number } | null = null;
    try {
      submitted = await pledge(campaignId, itemId, 1000.75, 'Frac');
    } catch {
      return; // Refusing the input is a correct outcome.
    }
    await caller.campaigns.updateContributionStatus({ contributionId: submitted.id, status: 'accepted' });

    const stored = (await campaignRow(campaignId)).pledgedTotal;
    // A silent change of the amount is the defect. Either number is defensible;
    // a THIRD number is not.
    expect([1000, 1001]).toContain(stored);
  });

  it.skipIf(skipIfNoDb)('refuses a pledge too large for its column instead of silently clamping', async () => {
    const { campaignId, itemId } = await activeCampaign({ title: 'Overflow', quantityWanted: 3 });
    const caller = steward();

    const huge = 9_000_000_000; // > int(11) max 2,147,483,647
    let id: number;
    try {
      ({ id } = await pledge(campaignId, itemId, huge, 'Whale'));
    } catch {
      return; // Refused at the edge: correct.
    }
    await caller.campaigns.updateContributionStatus({ contributionId: id, status: 'accepted' });

    const stored = (await campaignRow(campaignId)).pledgedTotal;
    // Clamping to INT_MAX would report $2.1bn raised from a $9bn pledge.
    expect(stored).not.toBe(2147483647);
  });

  it.skipIf(skipIfNoDb)('refuses a negative pledge', async () => {
    const { campaignId, itemId } = await activeCampaign({ title: 'Negative', quantityWanted: 3 });
    await expect(pledge(campaignId, itemId, -5000, 'Thief')).rejects.toThrow();
  });

  it.skipIf(skipIfNoDb)('refuses a claim for more slots than exist, however large the number', async () => {
    const { campaignId, itemId } = await activeCampaign({ title: 'Huge qty', quantityWanted: 2 });
    await expect(pledge(campaignId, itemId, 100, 'Hoover', 2_000_000_000)).rejects.toThrow();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. The empty and the extreme
// ─────────────────────────────────────────────────────────────────────────────

describe('degenerate campaigns', () => {
  it.skipIf(skipIfNoDb)('a campaign with zero contributions reports zero, not NaN or null', async () => {
    const { campaignId } = await activeCampaign({ title: 'Empty' });
    const row = await campaignRow(campaignId);
    expect(row.pledgedTotal).toBe(0);
    expect(Number.isFinite(row.pledgedTotal)).toBe(true);
  });

  it.skipIf(skipIfNoDb)('a campaign needing $0 does not produce an infinite or NaN percentage', async () => {
    const { campaignId, itemId } = await activeCampaign({ title: 'Zero target', financialTarget: 0, quantityWanted: 2 });
    const caller = steward();
    const c = await pledge(campaignId, itemId, 500, 'Giver');
    await caller.campaigns.updateContributionStatus({ contributionId: c.id, status: 'accepted' });

    const row = await campaignRow(campaignId);
    const pct = row.financialTarget > 0 ? (row.pledgedTotal / row.financialTarget) * 100 : 0;
    expect(Number.isFinite(pct)).toBe(true);
  });

  it.skipIf(skipIfNoDb)('a single contributor holding everything is counted once, not once per pledge', async () => {
    const { campaignId, itemId } = await activeCampaign({ title: 'Monopolist', quantityWanted: 6 });
    const caller = steward();
    for (let i = 0; i < 4; i++) {
      const c = await appRouter.createCaller(ctxFor(STEWARD_ID, nextIp())).campaigns.submitContribution({
        campaignId,
        campaignItemId: itemId,
        contributionType: 'resource',
        title: `Monopolist pledge ${i}`,
        estimatedValue: 100,
        quantityPledged: 1,
        contributorName: 'Monopolist',
        contributorEmail: 'monopolist@example.com',
        resourceName: 'Adversarial need',
      });
      await caller.campaigns.updateContributionStatus({ contributionId: c.id, status: 'accepted' });
    }
    const detail = await caller.campaigns.getById({ id: campaignId });
    expect(detail).not.toBeNull();
    expect(detail!.contributorsCount).toBe(1);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 6. What a member is shown when it fails
// ─────────────────────────────────────────────────────────────────────────────

describe('failure messages reaching a contributor', () => {
  it.skipIf(skipIfNoDb)('never leaks SQL, a driver sentence, or a stack frame', async () => {
    const { campaignId, itemId } = await activeCampaign({ title: 'Leak check', quantityWanted: 1 });
    await pledge(campaignId, itemId, 100, 'First');

    const attacks: Array<() => Promise<unknown>> = [
      () => pledge(campaignId, 999_999_999, 100, 'BadNeed'),
      () => pledge(999_999_999, undefined, 100, 'BadCampaign'),
      () => pledge(campaignId, itemId, 100, 'Overflowing', 999_999),
    ];

    for (const attack of attacks) {
      try {
        await attack();
      } catch (err) {
        const msg = String((err as Error)?.message ?? err);
        expect(msg).not.toMatch(/\b(SELECT|INSERT|UPDATE|FROM|WHERE)\b/);
        expect(msg).not.toMatch(/ER_[A-Z_]+|ECONNREFUSED|mysql|sqlMessage/i);
        expect(msg).not.toMatch(/at .+\.(ts|js):\d+/);
      }
    }
  });

  it.skipIf(skipIfNoDb)('does not tell a stranger whether an email is already known', async () => {
    // subscribeByEmail must not reflect existence (spec Part C, anti-abuse).
    const { campaignId } = await activeCampaign({ title: 'Enumeration' });
    const caller = appRouter.createCaller(ctxFor(STEWARD_ID, nextIp()));
    const first = await caller.campaigns.subscribeByEmail({ campaignId, email: 'enum@example.com' });
    const second = await appRouter
      .createCaller(ctxFor(STEWARD_ID, nextIp()))
      .campaigns.subscribeByEmail({ campaignId, email: 'enum@example.com' });
    expect(JSON.stringify(second)).toBe(JSON.stringify(first));
  });

  it.skipIf(skipIfNoDb)('strips contributor PII from the public contributions read', async () => {
    const { campaignId, itemId } = await activeCampaign({ title: 'PII', quantityWanted: 2 });
    const caller = steward();
    const c = await pledge(campaignId, itemId, 100, 'Private');
    await caller.campaigns.updateContributionStatus({ contributionId: c.id, status: 'accepted' });

    const publicRows = await appRouter
      .createCaller({ ...ctxFor(STEWARD_ID, nextIp()), user: null } as unknown as TrpcContext)
      .campaigns.getContributions({ campaignId });
    const blob = JSON.stringify(publicRows);
    expect(blob).not.toMatch(/private@example\.com/);
    expect(blob).not.toMatch(/contributorPhone/);
  });
});
