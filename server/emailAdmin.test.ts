/**
 * Email Admin Features Tests
 * Tests for sendTest and getPreview endpoints
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Resend
vi.mock('resend', () => ({
  Resend: vi.fn().mockImplementation(() => ({
    emails: {
      send: vi.fn().mockResolvedValue({
        data: { id: 'test-email-id-123' },
        error: null,
      }),
    },
  })),
}));

// Import email templates
import { emailTemplates } from './_core/email';

describe('Email Admin Features', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Email Templates for Preview', () => {
    it('should generate applicationReceived template with project and name', () => {
      const template = emailTemplates.applicationReceived('Test Project', 'Jane Smith');
      
      expect(template.subject).toContain('Test Project');
      expect(template.subject).toContain('Received');
      expect(template.html).toContain('Jane Smith');
      expect(template.html).toContain('Test Project');
    });

    it('should generate landProjectAccepted template', () => {
      const template = emailTemplates.landProjectAccepted('Green Valley Farm', 'John Doe');
      
      expect(template.subject).toContain('Green Valley Farm');
      expect(template.subject).toContain('Quality Check');
      expect(template.html).toContain('John Doe');
    });

    it('should generate investorWelcome template with investment range', () => {
      const template = emailTemplates.investorWelcome('Michael Investor', '$100k - $250k');
      
      expect(template.subject).toContain('Investor');
      expect(template.html).toContain('Michael Investor');
      expect(template.html).toContain('$100k - $250k');
    });

    it('should generate newsletterWelcome template', () => {
      const template = emailTemplates.newsletterWelcome('Newsletter Subscriber');
      
      expect(template.subject).toContain('Newsletter');
      expect(template.html).toContain('Newsletter Subscriber');
    });

    it('should generate followUp template', () => {
      const template = emailTemplates.followUp('Follow Up User');
      
      expect(template.subject).toContain('Following Up');
      expect(template.html).toContain('Follow Up User');
    });

    it('should generate requestMoreInfo template with questions', () => {
      const questions = '<p>Please provide more details.</p>';
      const template = emailTemplates.requestMoreInfo('Info User', questions);
      
      expect(template.subject).toContain('Additional Information');
      expect(template.html).toContain('Info User');
      expect(template.html).toContain(questions);
    });
  });

  describe('Template Structure', () => {
    it('all templates should have subject and html properties', () => {
      const templates = [
        emailTemplates.applicationReceived('Project', 'Name'),
        emailTemplates.landProjectAccepted('Project', 'Name'),
        emailTemplates.investorWelcome('Name', '$100k'),
        emailTemplates.newsletterWelcome('Name'),
        emailTemplates.followUp('Name'),
        emailTemplates.requestMoreInfo('Name', 'Questions'),
      ];

      templates.forEach((template) => {
        expect(template).toHaveProperty('subject');
        expect(template).toHaveProperty('html');
        expect(typeof template.subject).toBe('string');
        expect(typeof template.html).toBe('string');
        expect(template.subject.length).toBeGreaterThan(0);
        expect(template.html.length).toBeGreaterThan(0);
      });
    });

    it('all templates should contain proper HTML structure', () => {
      const templates = [
        emailTemplates.applicationReceived('Project', 'Name'),
        emailTemplates.landProjectAccepted('Project', 'Name'),
        emailTemplates.investorWelcome('Name', '$100k'),
        emailTemplates.newsletterWelcome('Name'),
        emailTemplates.followUp('Name'),
        emailTemplates.requestMoreInfo('Name', 'Questions'),
      ];

      templates.forEach((template) => {
        // Should contain some HTML tags
        expect(template.html).toMatch(/<[^>]+>/);
        // Should contain styling
        expect(template.html).toContain('style=');
      });
    });
  });
});
