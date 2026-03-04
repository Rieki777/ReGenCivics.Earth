/**
 * Email Service Tests
 * Tests for email sending, tracking, and template functionality
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

// Import after mocking
import { sendEmail, emailTemplates, testEmailConnection } from './_core/email';

describe('Email Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('sendEmail', () => {
    it('should send email successfully', async () => {
      const result = await sendEmail({
        to: 'test@example.com',
        subject: 'Test Subject',
        html: '<p>Test content</p>',
      });

      expect(result.id).toBe('test-email-id-123');
    });

    it('should include tracking data in response', async () => {
      const result = await sendEmail({
        to: 'test@example.com',
        subject: 'Test Subject',
        html: '<p>Test content</p>',
        recipientName: 'Test User',
        template: 'test-template',
      });

      expect(result.trackingData).toBeDefined();
      expect(result.trackingData.recipientEmail).toBe('test@example.com');
      expect(result.trackingData.recipientName).toBe('Test User');
      expect(result.trackingData.template).toBe('test-template');
    });

    it('should handle array of recipients', async () => {
      const result = await sendEmail({
        to: ['test1@example.com', 'test2@example.com'],
        subject: 'Test Subject',
        html: '<p>Test content</p>',
      });

      expect(result.id).toBe('test-email-id-123');
      expect(result.trackingData.recipientEmail).toBe('test1@example.com');
    });
  });

  describe('emailTemplates', () => {
    it('should generate landProjectAccepted template', () => {
      const template = emailTemplates.landProjectAccepted('Test Project', 'John Doe');
      
      expect(template.subject).toContain('Test Project');
      expect(template.subject).toContain('Quality Check');
      expect(template.html).toContain('John Doe');
      expect(template.html).toContain('Test Project');
    });

    it('should generate followUp template', () => {
      const template = emailTemplates.followUp('Jane Smith');
      
      expect(template.subject).toContain('Following Up');
      expect(template.html).toContain('Jane Smith');
    });

    it('should generate requestMoreInfo template', () => {
      const questions = '<p>Please provide more details about your project.</p>';
      const template = emailTemplates.requestMoreInfo('Bob Wilson', questions);
      
      expect(template.subject).toContain('Additional Information');
      expect(template.html).toContain('Bob Wilson');
      expect(template.html).toContain(questions);
    });

    it('should generate applicationReceived template', () => {
      const template = emailTemplates.applicationReceived('Green Valley Farm', 'Alice Green');
      
      expect(template.subject).toContain('Green Valley Farm');
      expect(template.subject).toContain('Received');
      expect(template.html).toContain('Alice Green');
      expect(template.html).toContain('Green Valley Farm');
    });

    it('should generate investorWelcome template', () => {
      const template = emailTemplates.investorWelcome('Michael Investor', '$250k - $1M');
      
      expect(template.subject).toContain('Investor Deck');
      expect(template.html).toContain('Michael Investor');
      expect(template.html).toContain('$250k - $1M');
    });

    it('should generate newsletterWelcome template', () => {
      const template = emailTemplates.newsletterWelcome('Newsletter Subscriber');
      
      expect(template.subject).toContain('Newsletter');
      expect(template.html).toContain('Newsletter Subscriber');
    });

    it('should handle empty name in newsletterWelcome', () => {
      const template = emailTemplates.newsletterWelcome('');
      
      expect(template.html).toContain('Friend');
    });
  });

  describe('email tracking', () => {
    it('should include emailLogId in tracking data when provided', async () => {
      const result = await sendEmail({
        to: 'test@example.com',
        subject: 'Test',
        html: '<p>Content</p>',
        emailLogId: 123,
      });

      expect(result.id).toBe('test-email-id-123');
      expect(result.trackingData.emailLogId).toBe(123);
    });
  });

  // Skip live API test by default - enable when testing with real API key
  it.skip('should connect to Resend with valid API key', async () => {
    console.log('Testing Resend connection...');
    console.log('API Key exists:', !!process.env.RESEND_API_KEY);
    const isConnected = await testEmailConnection();
    console.log('Connection result:', isConnected);
    expect(isConnected).toBe(true);
  }, 10000);
});
