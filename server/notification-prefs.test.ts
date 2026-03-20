import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as db from './db';

const skipIfNoDb = !process.env.DATABASE_URL;

describe('Notification Preferences System', () => {
  describe('Database Functions', () => {
    it('should have all notification preferences functions defined', () => {
      expect(db.getNotificationPreferences).toBeDefined();
      expect(db.updateNotificationPreferences).toBeDefined();
      expect(db.isNotificationEnabled).toBeDefined();
      expect(db.getNotificationEmails).toBeDefined();
    });

    it.skipIf(skipIfNoDb)('should get or create default notification preferences', async () => {
      const prefs = await db.getNotificationPreferences();
      
      expect(prefs).toHaveProperty('id');
      // Toggle fields (tinyint)
      expect(prefs).toHaveProperty('applicationSubmissions');
      expect(prefs).toHaveProperty('investorInquiries');
      expect(prefs).toHaveProperty('allianceRequests');
      expect(prefs).toHaveProperty('workWithRegens');
      expect(prefs).toHaveProperty('roleRequests');
      expect(prefs).toHaveProperty('loiSubmissions');
      expect(prefs).toHaveProperty('campaignContributions');
      expect(prefs).toHaveProperty('newsletterSignups');
      
      // Email routing fields
      expect(prefs).toHaveProperty('applicationEmails');
      expect(prefs).toHaveProperty('investorEmails');
      expect(prefs).toHaveProperty('allianceEmails');
      expect(prefs).toHaveProperty('workWithRegensEmails');
      expect(prefs).toHaveProperty('roleRequestEmails');
      expect(prefs).toHaveProperty('loiEmails');
      expect(prefs).toHaveProperty('campaignEmails');
      expect(prefs).toHaveProperty('newsletterEmails');
      
      // Toggle fields should be numbers (tinyint)
      expect(typeof prefs.applicationSubmissions).toBe('number');
      expect(typeof prefs.investorInquiries).toBe('number');
      expect(typeof prefs.allianceRequests).toBe('number');
      expect(typeof prefs.workWithRegens).toBe('number');
      expect(typeof prefs.roleRequests).toBe('number');
      expect(typeof prefs.loiSubmissions).toBe('number');
      expect(typeof prefs.campaignContributions).toBe('number');
      expect(typeof prefs.newsletterSignups).toBe('number');
    });

    it.skipIf(skipIfNoDb)('should check if notification types are enabled', async () => {
      const isEnabled = await db.isNotificationEnabled('applicationSubmissions');
      expect(typeof isEnabled).toBe('boolean');
    });

    it.skipIf(skipIfNoDb)('should check alliance requests notification type', async () => {
      const isEnabled = await db.isNotificationEnabled('allianceRequests');
      expect(typeof isEnabled).toBe('boolean');
    });

    it.skipIf(skipIfNoDb)('should check role requests notification type', async () => {
      const isEnabled = await db.isNotificationEnabled('roleRequests');
      expect(typeof isEnabled).toBe('boolean');
    });

    it.skipIf(skipIfNoDb)('should check work with regens notification type', async () => {
      const isEnabled = await db.isNotificationEnabled('workWithRegens');
      expect(typeof isEnabled).toBe('boolean');
    });

    it.skipIf(skipIfNoDb)('should update notification preferences', async () => {
      await expect(
        db.updateNotificationPreferences({
          newsletterSignups: 0,
        })
      ).resolves.not.toThrow();
    });

    it.skipIf(skipIfNoDb)('should update email routing preferences', async () => {
      await expect(
        db.updateNotificationPreferences({
          applicationEmails: 'test@example.com, admin@example.com',
        })
      ).resolves.not.toThrow();
      
      // Verify it was saved
      const prefs = await db.getNotificationPreferences();
      expect(prefs.applicationEmails).toBe('test@example.com, admin@example.com');
      
      // Clean up
      await db.updateNotificationPreferences({
        applicationEmails: null,
      });
    });

    it.skipIf(skipIfNoDb)('should get notification emails for a type', async () => {
      // First set some emails
      await db.updateNotificationPreferences({
        investorEmails: 'investor1@example.com, investor2@example.com',
      });
      
      const emails = await db.getNotificationEmails('investor');
      expect(emails).toEqual(['investor1@example.com', 'investor2@example.com']);
      
      // Clean up
      await db.updateNotificationPreferences({
        investorEmails: null,
      });
    });

    it.skipIf(skipIfNoDb)('should return null for empty email routing', async () => {
      const emails = await db.getNotificationEmails('newsletter');
      // Should be null if no custom emails are set
      expect(emails).toBeNull();
    });
  });

  describe('Notify With Preferences Helper', () => {
    it('should have notifyIfEnabled and getNotificationTypeForPath exported', async () => {
      const { notifyIfEnabled, getNotificationTypeForPath } = await import('./notify-with-prefs');
      expect(notifyIfEnabled).toBeDefined();
      expect(getNotificationTypeForPath).toBeDefined();
    });

    it('should map path types to correct notification types', async () => {
      const { getNotificationTypeForPath } = await import('./notify-with-prefs');
      
      expect(getNotificationTypeForPath('alliance')).toBe('allianceRequests');
      expect(getNotificationTypeForPath('create_with_regens')).toBe('workWithRegens');
      expect(getNotificationTypeForPath('role')).toBe('roleRequests');
      expect(getNotificationTypeForPath('land_partner')).toBe('applicationSubmissions');
      expect(getNotificationTypeForPath('finance')).toBe('investorInquiries');
    });
  });

  describe('Rate Limiting', () => {
    it('should have rate limit functions defined', async () => {
      const { checkRateLimit, getRateLimitStats } = await import('./rate-limit');
      expect(checkRateLimit).toBeDefined();
      expect(getRateLimitStats).toBeDefined();
    });

    it('should return rate limit stats', async () => {
      const { getRateLimitStats } = await import('./rate-limit');
      const stats = getRateLimitStats();
      expect(stats).toHaveProperty('totalTrackedIPs');
      expect(stats).toHaveProperty('entries');
      expect(typeof stats.totalTrackedIPs).toBe('number');
      expect(Array.isArray(stats.entries)).toBe(true);
    });
  });
});
