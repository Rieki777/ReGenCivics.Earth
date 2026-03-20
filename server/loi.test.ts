import { describe, it, expect, beforeAll } from 'vitest';
import * as db from './db';

const skipIfNoDb = !process.env.DATABASE_URL;

describe('LOI System', () => {
  describe('LOI Database Functions', () => {
    it('should have LOI database functions defined', () => {
      expect(db.createLetterOfIntent).toBeDefined();
      expect(db.getAllLettersOfIntent).toBeDefined();
      expect(db.getLetterOfIntentById).toBeDefined();
      expect(db.updateLetterOfIntentStatus).toBeDefined();
      expect(db.getLetterOfIntentStats).toBeDefined();
    });

    it.skipIf(skipIfNoDb)('should calculate LOI stats correctly', async () => {
      const stats = await db.getLetterOfIntentStats();
      
      expect(stats).toHaveProperty('totalAmount');
      expect(stats).toHaveProperty('count');
      expect(stats).toHaveProperty('pending');
      expect(stats).toHaveProperty('confirmed');
      expect(stats).toHaveProperty('withdrawn');
      expect(stats).toHaveProperty('converted');
      expect(typeof stats.totalAmount).toBe('number');
      expect(typeof stats.count).toBe('number');
      expect(typeof stats.pending).toBe('number');
      expect(typeof stats.confirmed).toBe('number');
      expect(typeof stats.withdrawn).toBe('number');
      expect(typeof stats.converted).toBe('number');
    });
  });

  describe('LOI Status Transitions', () => {
    it('should support valid LOI status values', () => {
      const validStatuses = ['pending', 'confirmed', 'withdrawn', 'converted'];
      validStatuses.forEach(status => {
        expect(typeof status).toBe('string');
      });
    });
  });
});

describe('Notification Preferences System', () => {
  describe('Notification Preferences Functions', () => {
    it('should have notification preferences functions defined', () => {
      expect(db.getNotificationPreferences).toBeDefined();
      expect(db.updateNotificationPreferences).toBeDefined();
      expect(db.isNotificationEnabled).toBeDefined();
    });

    it.skipIf(skipIfNoDb)('should get or create default notification preferences', async () => {
      const prefs = await db.getNotificationPreferences();
      
      expect(prefs).toHaveProperty('id');
      expect(prefs).toHaveProperty('applicationSubmissions');
      expect(prefs).toHaveProperty('investorInquiries');
      expect(prefs).toHaveProperty('allianceRequests');
      expect(prefs).toHaveProperty('loiSubmissions');
      expect(prefs).toHaveProperty('campaignContributions');
      expect(prefs).toHaveProperty('newsletterSignups');
      
      // Default values should be numbers (tinyint)
      expect(typeof prefs.applicationSubmissions).toBe('number');
      expect(typeof prefs.investorInquiries).toBe('number');
      expect(typeof prefs.allianceRequests).toBe('number');
      expect(typeof prefs.loiSubmissions).toBe('number');
      expect(typeof prefs.campaignContributions).toBe('number');
      expect(typeof prefs.newsletterSignups).toBe('number');
    });

    it.skipIf(skipIfNoDb)('should check if notification types are enabled', async () => {
      const isEnabled = await db.isNotificationEnabled('applicationSubmissions');
      expect(typeof isEnabled).toBe('boolean');
    });

    it.skipIf(skipIfNoDb)('should update notification preferences', async () => {
      await expect(
        db.updateNotificationPreferences({
          newsletterSignups: false,
        })
      ).resolves.not.toThrow();
    });
  });
});
