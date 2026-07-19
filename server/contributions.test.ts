/**
 * Contribution System Tests
 * Tests for campaign contributions functionality
 */

import { describe, it, expect, vi } from 'vitest';
import { eq, sql } from 'drizzle-orm';
import { appRouter } from './routers';
import * as dbHelpers from './db';
import { campaignContributions, playerContributions } from '../drizzle/schema';
import { expireCrowdpoolClaims } from './routes/batchJobs';
import type { TrpcContext } from './_core/context';

const skipIfNoDb = !process.env.DATABASE_URL;

// Mock notifications and emails to prevent real emails/notifications being sent during tests
vi.mock('./_core/notification', () => ({
  notifyOwner: vi.fn().mockResolvedValue(true),
}));

vi.mock('./_core/email', () => ({
  sendEmail: vi.fn().mockResolvedValue({ id: 'test-email-id', trackingData: {} }),
  emailTemplates: {
    applicationReceived: vi.fn().mockReturnValue({ subject: 'Test', html: '<p>Test</p>' }),
    landProjectAccepted: vi.fn().mockReturnValue({ subject: 'Test', html: '<p>Test</p>' }),
    followUp: vi.fn().mockReturnValue({ subject: 'Test', html: '<p>Test</p>' }),
    requestMoreInfo: vi.fn().mockReturnValue({ subject: 'Test', html: '<p>Test</p>' }),
    investorWelcome: vi.fn().mockReturnValue({ subject: 'Test', html: '<p>Test</p>' }),
    newsletterWelcome: vi.fn().mockReturnValue({ subject: 'Test', html: '<p>Test</p>' }),
    contributionAccepted: vi.fn().mockReturnValue({ subject: 'Test', html: '<p>Test</p>' }),
    contributionRejected: vi.fn().mockReturnValue({ subject: 'Test', html: '<p>Test</p>' }),
    contributionFulfilled: vi.fn().mockReturnValue({ subject: 'Test', html: '<p>Test</p>' }),
  },
  testEmailConnection: vi.fn().mockResolvedValue(true),
}));

type AuthenticatedUser = NonNullable<TrpcContext['user']>;

// Each test that submits contributions passes its own fake IP so the
// in-memory rate limiter (7 submissions per 15 minutes per IP + action)
// never trips across tests in this file.
function createAuthContext(ip?: string): TrpcContext {
  const user = {
    id: 999999,
    openId: 'test-open-id-123',
    email: 'test@example.com',
    name: 'Test User',
    loginMethod: 'google',
    role: 'user',
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  } as unknown as AuthenticatedUser;

  return {
    user,
    authMethod: 'legacy',
    req: {
      protocol: 'https',
      headers: ip ? { 'x-forwarded-for': ip } : {},
    } as TrpcContext['req'],
    res: {
      clearCookie: () => {},
    } as unknown as TrpcContext['res'],
  };
}

/** Test user needs a player profile for the fulfilled payoff to create Living Tree rows. */
async function ensureTestPlayerProfile() {
  let profile = await dbHelpers.getPlayerProfileByUserId(999999);
  if (!profile) {
    await dbHelpers.createPlayerProfile({ userId: 999999, displayName: 'Test User' });
    profile = await dbHelpers.getPlayerProfileByUserId(999999);
  }
  return profile!;
}

/**
 * The fulfilled payoff calls recordScoreEvent, which reads the
 * 'scoring.weights.crowdpool_contribution' game variable and throws if it is
 * missing (campaigns.ts then swallows that as non-fatal, silently zeroing the
 * payoff). The CI integration DB is built from the schema baseline, which has
 * no game_variables seed rows and marks the old seed migration as already
 * applied, so that variable is absent there. Seed it idempotently. On the dev
 * DB, where migration 0097 already ran, this only re-affirms the row is active
 * and never overwrites its configured value.
 */
async function ensureCrowdpoolScoreVariable() {
  const database = await dbHelpers.getDb();
  if (!database) return;
  await database.execute(sql`
    INSERT INTO game_variables (category, subcategory, \`key\`, displayName, description, value, valueType, defaultValue, isActive)
    VALUES ('scoring', 'weights', 'scoring.weights.crowdpool_contribution', 'Crowd-pooling contribution', 'Points per crowd-pooling pledge', 20, 'integer', 20, 1)
    ON DUPLICATE KEY UPDATE isActive = 1
  `);
}

describe('Campaign Contribution System', () => {
  describe('Contribution Creation', () => {
    it.skipIf(skipIfNoDb)('should create a contribution for a campaign', async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);
      
      // First create a campaign with correct schema
      const campaign = await caller.campaigns.create({
        title: 'Test Campaign for Contributions',
        description: 'A test campaign to test contributions',
        projectName: 'Test Project',
        currency: 'USD',
        financialTarget: 10000,
        items: [
          {
            category: 'resource',
            resourceName: 'Seed Funding',
            resourceDescription: 'Initial funding needed',
            estimatedValue: 10000,
          },
        ],
      });
      
      expect(campaign.id).toBeDefined();
      
      // Activate the campaign first (campaigns start as draft)
      await caller.campaigns.updateStatus({
        id: campaign.id,
        status: 'active',
      });
      
      // Create a contribution using submitContribution
      const contribution = await caller.campaigns.submitContribution({
        campaignId: campaign.id,
        contributionType: 'financial',
        title: 'My Financial Contribution',
        description: 'Contributing to the seed funding',
        estimatedValue: 1000,
        contributorName: 'John Doe',
        contributorEmail: 'john@example.com',
        contributorPhone: '555-1234',
        contributorNotes: 'Happy to support this project!',
        financialAmount: 1000,
        financialCurrency: 'USD',
      });
      
      expect(contribution.id).toBeDefined();
      expect(contribution.success).toBe(true);
    });
    
    it.skipIf(skipIfNoDb)('should require valid email for contribution', async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);
      
      // Create a campaign first
      const campaign = await caller.campaigns.create({
        title: 'Email Validation Test Campaign',
        description: 'Testing email validation',
        projectName: 'Test Project',
        currency: 'USD',
        financialTarget: 50000,
        items: [
          {
            category: 'land',
            hectares: 10,
            region: 'Test Region',
            landDescription: 'Land contribution',
            estimatedValue: 50000,
          },
        ],
      });
      
      // Activate the campaign
      await caller.campaigns.updateStatus({
        id: campaign.id,
        status: 'active',
      });
      
      // Try to create contribution with invalid email
      await expect(
        caller.campaigns.submitContribution({
          campaignId: campaign.id,
          contributionType: 'land',
          title: 'Land Contribution',
          description: 'Contributing land',
          estimatedValue: 25000,
          contributorName: 'Jane Doe',
          contributorEmail: 'invalid-email',
        })
      ).rejects.toThrow();
    });
  });
  
  describe('Contribution Status Updates', () => {
    it.skipIf(skipIfNoDb)('should allow campaign owner to accept contribution', async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);
      
      // Create campaign
      const campaign = await caller.campaigns.create({
        title: 'Accept Test Campaign',
        description: 'Testing acceptance',
        projectName: 'Test Project',
        currency: 'USD',
        financialTarget: 5000,
        items: [
          {
            category: 'equipment',
            equipmentName: 'Tractor',
            equipmentQuantity: 1,
            estimatedValue: 5000,
          },
        ],
      });
      
      // Activate the campaign
      await caller.campaigns.updateStatus({
        id: campaign.id,
        status: 'active',
      });
      
      // Create contribution
      const contribution = await caller.campaigns.submitContribution({
        campaignId: campaign.id,
        contributionType: 'equipment',
        title: 'Tractor Contribution',
        description: 'Contributing a tractor',
        estimatedValue: 3000,
        contributorName: 'Bob Smith',
        contributorEmail: 'bob@example.com',
        equipmentName: 'Tractor',
        equipmentQuantity: 1,
        equipmentCondition: 'Good',
      });
      
      // Accept the contribution
      const updated = await caller.campaigns.updateContributionStatus({
        contributionId: contribution.id,
        status: 'accepted',
        ownerNotes: 'Thank you for your generous contribution!',
      });
      
      expect(updated.success).toBe(true);
    });
    
    it.skipIf(skipIfNoDb)('should allow campaign owner to reject contribution', async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);
      
      // Create campaign
      const campaign = await caller.campaigns.create({
        title: 'Reject Test Campaign',
        description: 'Testing rejection',
        projectName: 'Test Project',
        currency: 'USD',
        financialTarget: 2000,
        items: [
          {
            category: 'role',
            roleTitle: 'Volunteer Role',
            roleDescription: 'Volunteer needed',
            hoursPerWeek: 10,
            durationMonths: 3,
            estimatedValue: 2000,
          },
        ],
      });
      
      // Activate the campaign
      await caller.campaigns.updateStatus({
        id: campaign.id,
        status: 'active',
      });
      
      // Create contribution
      const contribution = await caller.campaigns.submitContribution({
        campaignId: campaign.id,
        contributionType: 'role',
        title: 'Volunteer Offer',
        description: 'Offering to volunteer',
        estimatedValue: 1000,
        contributorName: 'Alice Johnson',
        contributorEmail: 'alice@example.com',
        roleTitle: 'Volunteer',
        hoursPerWeek: 10,
        durationMonths: 3,
      });
      
      // Reject the contribution
      const updated = await caller.campaigns.updateContributionStatus({
        contributionId: contribution.id,
        status: 'rejected',
        ownerNotes: 'Unfortunately we already have enough volunteers for this role.',
      });
      
      expect(updated.success).toBe(true);
    });
  });
  
  describe('Contribution Queries', () => {
    it.skipIf(skipIfNoDb)('should get contributions for a campaign', async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);
      
      // Create campaign
      const campaign = await caller.campaigns.create({
        title: 'Query Test Campaign',
        description: 'Testing queries',
        projectName: 'Test Project',
        currency: 'USD',
        financialTarget: 20000,
        items: [
          {
            category: 'resource',
            resourceName: 'Funding',
            resourceDescription: 'Funding needed',
            estimatedValue: 20000,
          },
        ],
      });
      
      // Activate the campaign
      await caller.campaigns.updateStatus({
        id: campaign.id,
        status: 'active',
      });
      
      // Create multiple contributions
      await caller.campaigns.submitContribution({
        campaignId: campaign.id,
        contributionType: 'financial',
        title: 'Contribution 1',
        description: 'First contribution',
        estimatedValue: 1000,
        contributorName: 'Contributor 1',
        contributorEmail: 'c1@example.com',
        financialAmount: 1000,
      });
      
      await caller.campaigns.submitContribution({
        campaignId: campaign.id,
        contributionType: 'financial',
        title: 'Contribution 2',
        description: 'Second contribution',
        estimatedValue: 2000,
        contributorName: 'Contributor 2',
        contributorEmail: 'c2@example.com',
        financialAmount: 2000,
      });
      
      // Get all contributions
      const contributions = await caller.campaigns.getContributions({
        campaignId: campaign.id,
      });
      
      expect(contributions.length).toBeGreaterThanOrEqual(2);
    });
    
    it.skipIf(skipIfNoDb)('should filter contributions by status', async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);
      
      // Create campaign
      const campaign = await caller.campaigns.create({
        title: 'Filter Test Campaign',
        description: 'Testing filters',
        projectName: 'Test Project',
        currency: 'USD',
        financialTarget: 10000,
        items: [
          {
            category: 'resource',
            resourceName: 'Resources',
            resourceDescription: 'Resources needed',
            estimatedValue: 10000,
          },
        ],
      });
      
      // Activate the campaign
      await caller.campaigns.updateStatus({
        id: campaign.id,
        status: 'active',
      });
      
      // Create and accept one contribution
      const contribution1 = await caller.campaigns.submitContribution({
        campaignId: campaign.id,
        contributionType: 'resource',
        title: 'Accepted Contribution',
        description: 'This will be accepted',
        estimatedValue: 500,
        contributorName: 'Accepted User',
        contributorEmail: 'accepted@example.com',
        resourceName: 'Seeds',
        resourceQuantity: 100,
        resourceUnit: 'kg',
      });
      
      await caller.campaigns.updateContributionStatus({
        contributionId: contribution1.id,
        status: 'accepted',
      });
      
      // Create a pending contribution
      await caller.campaigns.submitContribution({
        campaignId: campaign.id,
        contributionType: 'resource',
        title: 'Pending Contribution',
        description: 'This stays pending',
        estimatedValue: 500,
        contributorName: 'Pending User',
        contributorEmail: 'pending@example.com',
        resourceName: 'Tools',
        resourceQuantity: 10,
        resourceUnit: 'pieces',
      });
      
      // Filter by accepted status
      const acceptedContributions = await caller.campaigns.getContributions({
        campaignId: campaign.id,
        status: 'accepted',
      });
      
      expect(acceptedContributions.every(c => c.status === 'accepted')).toBe(true);
    });
  });

  describe('Needs Registry Claims', () => {
    it.skipIf(skipIfNoDb)('claim acceptance reserves quantity and blocks over-claim', async () => {
      const ctx = createAuthContext('10.99.0.1');
      const caller = appRouter.createCaller(ctx);

      const campaign = await caller.campaigns.create({
        title: 'Claim Guard Test Campaign',
        description: 'Testing claims against needs',
        projectName: 'Test Project',
        currency: 'USD',
        financialTarget: 1000,
        items: [
          {
            category: 'resource',
            resourceName: 'Wheelbarrow',
            resourceQuantity: 1,
            resourceUnit: 'unit',
            estimatedValue: 200,
          },
        ],
      });
      await caller.campaigns.updateStatus({ id: campaign.id, status: 'active' });

      const items = await caller.campaigns.getItems({ campaignId: campaign.id });
      const need = items[0];
      expect(need).toBeDefined();
      expect(need.quantityWanted).toBe(1);
      expect(need.quantityClaimed).toBe(0);

      // Claim the single slot
      const claim = await caller.campaigns.submitContribution({
        campaignId: campaign.id,
        campaignItemId: need.id,
        contributionType: 'resource',
        title: 'One wheelbarrow',
        estimatedValue: 200,
        contributorName: 'Claim Tester',
        contributorEmail: 'claim-tester@example.com',
        quantityPledged: 1,
      });
      await caller.campaigns.updateContributionStatus({
        contributionId: claim.id,
        status: 'accepted',
      });

      // Acceptance reserved the slot and stamped the claim window
      const afterAccept = await caller.campaigns.getItems({ campaignId: campaign.id });
      expect(afterAccept[0].quantityClaimed).toBe(1);
      const claimRow = await dbHelpers.getContributionById(claim.id);
      expect(claimRow?.claimExpiresAt).toBeTruthy();

      // A second claim against the full need is rejected
      await expect(
        caller.campaigns.submitContribution({
          campaignId: campaign.id,
          campaignItemId: need.id,
          contributionType: 'resource',
          title: 'Another wheelbarrow',
          estimatedValue: 200,
          contributorName: 'Second Claimer',
          contributorEmail: 'second-claimer@example.com',
          quantityPledged: 1,
        })
      ).rejects.toThrow('This need is already fully claimed');
    });

    it.skipIf(skipIfNoDb)('expired sweep releases reserved quantity', async () => {
      const ctx = createAuthContext('10.99.0.2');
      const caller = appRouter.createCaller(ctx);
      const db = await dbHelpers.getDb();
      expect(db).toBeTruthy();

      const campaign = await caller.campaigns.create({
        title: 'Expiry Sweep Test Campaign',
        description: 'Testing the nightly claim expiry sweep',
        projectName: 'Test Project',
        currency: 'USD',
        financialTarget: 500,
        items: [
          {
            category: 'equipment',
            equipmentName: 'Chainsaw',
            equipmentQuantity: 1,
            estimatedValue: 500,
          },
        ],
      });
      await caller.campaigns.updateStatus({ id: campaign.id, status: 'active' });
      const items = await caller.campaigns.getItems({ campaignId: campaign.id });
      const need = items[0];

      const claim = await caller.campaigns.submitContribution({
        campaignId: campaign.id,
        campaignItemId: need.id,
        contributionType: 'equipment',
        title: 'Chainsaw loan',
        estimatedValue: 500,
        contributorName: 'Expiry Tester',
        contributorEmail: 'expiry-tester@example.com',
        quantityPledged: 1,
      });
      await caller.campaigns.updateContributionStatus({
        contributionId: claim.id,
        status: 'accepted',
      });

      const reserved = await caller.campaigns.getItems({ campaignId: campaign.id });
      expect(reserved[0].quantityClaimed).toBe(1);

      // Backdate the claim window, then run the sweep directly
      await db!.update(campaignContributions)
        .set({ claimExpiresAt: new Date(Date.now() - 60 * 1000) })
        .where(eq(campaignContributions.id, claim.id));

      const result = await expireCrowdpoolClaims(db);
      expect(result.expired).toBeGreaterThanOrEqual(1);

      const swept = await dbHelpers.getContributionById(claim.id);
      expect(swept?.status).toBe('expired');
      const released = await caller.campaigns.getItems({ campaignId: campaign.id });
      expect(released[0].quantityClaimed).toBe(0);
    });
  });

  describe('Fulfilled Payoff', () => {
    it.skipIf(skipIfNoDb)('fulfilled sets fulfilledAt and fires the payoff exactly once', async () => {
      const ctx = createAuthContext('10.99.0.3');
      const caller = appRouter.createCaller(ctx);
      const db = await dbHelpers.getDb();
      expect(db).toBeTruthy();
      await ensureTestPlayerProfile();
      await ensureCrowdpoolScoreVariable();

      const campaign = await caller.campaigns.create({
        title: 'Payoff Test Campaign',
        description: 'Testing the fulfilled payoff',
        projectName: 'Payoff Test Project',
        currency: 'USD',
        financialTarget: 300,
        items: [
          {
            category: 'equipment',
            equipmentName: 'Shovels',
            equipmentQuantity: 3,
            estimatedValue: 300,
          },
        ],
      });
      await caller.campaigns.updateStatus({ id: campaign.id, status: 'active' });

      const uniqueTitle = `Payoff shovels ${Date.now()}`;
      const contribution = await caller.campaigns.submitContribution({
        campaignId: campaign.id,
        contributionType: 'equipment',
        title: uniqueTitle,
        estimatedValue: 300,
        contributorName: 'Payoff Tester',
        contributorEmail: 'test@example.com',
        equipmentName: 'Shovels',
        equipmentQuantity: 3,
      });

      await caller.campaigns.updateContributionStatus({
        contributionId: contribution.id,
        status: 'accepted',
      });
      await caller.campaigns.updateContributionStatus({
        contributionId: contribution.id,
        status: 'fulfilled',
      });
      // Repeat call must be a no-op, not an error and not a second payoff
      await caller.campaigns.updateContributionStatus({
        contributionId: contribution.id,
        status: 'fulfilled',
      });

      const row = await dbHelpers.getContributionById(contribution.id);
      expect(row?.status).toBe('fulfilled');
      expect(row?.fulfilledAt).toBeTruthy();
      expect(row?.playerContributionId).toBeTruthy();

      // Exactly one Living Tree row for this contribution
      const treeRows = await db!.select().from(playerContributions)
        .where(eq(playerContributions.title, uniqueTitle));
      expect(treeRows.length).toBe(1);
      expect(treeRows[0].status).toBe('verified');
      expect(treeRows[0].id).toBe(row?.playerContributionId);

      // Exactly one score event for this contribution
      const [scoreRows] = await db!.execute(sql`
        SELECT COUNT(*) AS n FROM contribution_score_events
        WHERE referenceType = 'crowdpool' AND referenceId = ${contribution.id}
      `);
      expect(Number((scoreRows as any)?.[0]?.n ?? 0)).toBe(1);
    });
  });

  describe('Thanked Stage', () => {
    it.skipIf(skipIfNoDb)('thanked requires a note and stamps acknowledgedAt', async () => {
      const ctx = createAuthContext('10.99.0.4');
      const caller = appRouter.createCaller(ctx);

      const campaign = await caller.campaigns.create({
        title: 'Thanks Test Campaign',
        description: 'Testing the thanked stage',
        projectName: 'Test Project',
        currency: 'USD',
        financialTarget: 100,
        items: [
          {
            category: 'resource',
            resourceName: 'Seeds',
            resourceQuantity: 50,
            resourceUnit: 'packets',
            estimatedValue: 100,
          },
        ],
      });
      await caller.campaigns.updateStatus({ id: campaign.id, status: 'active' });

      const contribution = await caller.campaigns.submitContribution({
        campaignId: campaign.id,
        contributionType: 'resource',
        title: 'Seed packets',
        estimatedValue: 100,
        contributorName: 'Thanks Tester',
        contributorEmail: 'thanks-tester@example.com',
        resourceName: 'Seeds',
        resourceQuantity: 50,
        resourceUnit: 'packets',
      });
      await caller.campaigns.updateContributionStatus({
        contributionId: contribution.id,
        status: 'accepted',
      });

      // Thanking before fulfillment is rejected
      await expect(
        caller.campaigns.updateContributionStatus({
          contributionId: contribution.id,
          status: 'thanked',
          acknowledgedNote: 'Thank you!',
        })
      ).rejects.toThrow('Only fulfilled contributions can be thanked');

      await caller.campaigns.updateContributionStatus({
        contributionId: contribution.id,
        status: 'fulfilled',
      });

      // A note is required
      await expect(
        caller.campaigns.updateContributionStatus({
          contributionId: contribution.id,
          status: 'thanked',
        })
      ).rejects.toThrow('A thank-you note is required');

      const thanked = await caller.campaigns.updateContributionStatus({
        contributionId: contribution.id,
        status: 'thanked',
        acknowledgedNote: 'The seeds went straight into the spring beds. Thank you.',
      });
      expect(thanked.success).toBe(true);

      const row = await dbHelpers.getContributionById(contribution.id);
      expect(row?.status).toBe('thanked');
      expect(row?.acknowledgedAt).toBeTruthy();
      expect(row?.acknowledgedNote).toContain('spring beds');
    });
  });

  describe('claimMyContributions (anonymous linking)', () => {
    const CLAIMER_USER_ID = 999777;

    it.skipIf(skipIfNoDb)(
      'links an anonymous fulfilled contribution to the account and back-creates its Living Tree row, idempotently',
      async () => {
        await ensureCrowdpoolScoreVariable();

        // The claimer signs in later; here they are just an email on an
        // anonymous pledge. Unique per run so reruns on the shared dev DB do
        // not collide.
        const claimerEmail = `claimer-${Date.now()}@example.com`;

        // Steward (test user 999999) runs a live campaign with one need.
        const stewardCtx = createAuthContext('10.7.7.1');
        const steward = appRouter.createCaller(stewardCtx);
        const campaign = await steward.campaigns.create({
          title: 'Anon Linking Campaign',
          description: 'Testing claimMyContributions',
          projectName: 'Linking Project',
          currency: 'USD',
          financialTarget: 500,
          items: [
            {
              category: 'resource',
              resourceName: 'Seedlings',
              resourceDescription: 'Native seedlings needed',
              estimatedValue: 250,
            },
          ],
        });
        await steward.campaigns.updateStatus({ id: campaign.id, status: 'active' });
        const fresh = await steward.campaigns.getById({ id: campaign.id });
        expect(fresh).toBeTruthy();
        const need = fresh!.items[0];

        // Someone pledges anonymously (no account) under the claimer's email.
        const anonCtx = { ...createAuthContext('10.7.7.2'), user: null } as unknown as TrpcContext;
        const anon = appRouter.createCaller(anonCtx);
        const contribution = await anon.campaigns.submitContribution({
          campaignId: campaign.id,
          campaignItemId: need.id,
          contributionType: 'resource',
          title: 'Anon seedlings',
          estimatedValue: 250,
          contributorName: 'Anonymous Giver',
          contributorEmail: claimerEmail,
          resourceName: 'Seedlings',
          resourceQuantity: 20,
          resourceUnit: 'trays',
        });

        // Guarantee the anonymous precondition regardless of submit internals.
        const database = await dbHelpers.getDb();
        if (!database) return;
        await database
          .update(campaignContributions)
          .set({ userId: null })
          .where(eq(campaignContributions.id, contribution.id));

        // Steward accepts, then marks it delivered. Anonymous, so no Living
        // Tree row is created at fulfillment time.
        await steward.campaigns.updateContributionStatus({ contributionId: contribution.id, status: 'accepted' });
        await steward.campaigns.updateContributionStatus({ contributionId: contribution.id, status: 'fulfilled' });

        const beforeClaim = await dbHelpers.getContributionById(contribution.id);
        expect(beforeClaim?.status).toBe('fulfilled');
        expect(beforeClaim?.userId ?? null).toBeNull();
        expect(beforeClaim?.playerContributionId ?? null).toBeNull();

        // The claimer now makes an account with the same email and claims.
        let profile = await dbHelpers.getPlayerProfileByUserId(CLAIMER_USER_ID);
        if (!profile) {
          await dbHelpers.createPlayerProfile({ userId: CLAIMER_USER_ID, displayName: 'Claimer' });
          profile = await dbHelpers.getPlayerProfileByUserId(CLAIMER_USER_ID);
        }
        const claimerCtx = {
          ...createAuthContext('10.7.7.3'),
          user: { ...stewardCtx.user!, id: CLAIMER_USER_ID, email: claimerEmail },
        } as unknown as TrpcContext;
        const claimer = appRouter.createCaller(claimerCtx);

        const result = await claimer.campaigns.claimMyContributions();
        expect(result.linked).toBeGreaterThanOrEqual(1);
        expect(result.livingTreeAdded).toBeGreaterThanOrEqual(1);

        // The contribution now belongs to the claimer and points at a Living
        // Tree row.
        const afterClaim = await dbHelpers.getContributionById(contribution.id);
        expect(afterClaim?.userId).toBe(CLAIMER_USER_ID);
        expect(afterClaim?.playerContributionId ?? null).not.toBeNull();

        // A verified player_contributions row exists for the claimer.
        const treeRows = await database
          .select()
          .from(playerContributions)
          .where(eq(playerContributions.id, afterClaim!.playerContributionId!));
        expect(treeRows.length).toBe(1);
        expect(treeRows[0].status).toBe('verified');
        expect(treeRows[0].title).toBe('Anon seedlings');
        expect(treeRows[0].userId).toBe(CLAIMER_USER_ID);

        // Idempotent: a second claim links nothing new and adds no duplicate.
        const again = await claimer.campaigns.claimMyContributions();
        expect(again.linked).toBe(0);
        expect(again.livingTreeAdded).toBe(0);

        const dupCheck = await database
          .select()
          .from(playerContributions)
          .where(eq(playerContributions.userId, CLAIMER_USER_ID));
        const forThisTitle = dupCheck.filter((r) => r.title === 'Anon seedlings');
        expect(forThisTitle.length).toBe(1);
      },
    );
  });
});
