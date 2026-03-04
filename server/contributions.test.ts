/**
 * Contribution System Tests
 * Tests for campaign contributions functionality
 */

import { describe, it, expect, vi } from 'vitest';
import { appRouter } from './routers';
import type { TrpcContext } from './_core/context';

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

function createAuthContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 999999,
    openId: 'test-open-id-123',
    email: 'test@example.com',
    name: 'Test User',
    loginMethod: 'google',
    role: 'user',
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: {
      protocol: 'https',
      headers: {},
    } as TrpcContext['req'],
    res: {
      clearCookie: () => {},
    } as TrpcContext['res'],
  };
}

describe('Campaign Contribution System', () => {
  describe('Contribution Creation', () => {
    it('should create a contribution for a campaign', async () => {
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
    
    it('should require valid email for contribution', async () => {
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
    it('should allow campaign owner to accept contribution', async () => {
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
    
    it('should allow campaign owner to reject contribution', async () => {
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
    it('should get contributions for a campaign', async () => {
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
    
    it('should filter contributions by status', async () => {
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
});
