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

/**
 * The investor emails are the highest-stakes surface the fund has: they are
 * automated, they arrive days after someone has stopped reading the site, and
 * nobody re-reads them before they send.
 *
 * Until 2026-08-30 no test asserted anything about their content. All four
 * email test files passed while investorDripDay3 carried a full term sheet
 * (12 to 18% net IRR, 8% pref, 20% carry, 1.5% fee, $250,000 minimum) as
 * present fact about a fund that is not a legal entity. The tests were green
 * the whole time, because they only ever checked that sending worked.
 *
 * These pin the content instead. scripts/check-fund-claims.mjs covers the same
 * strings repo-wide; this covers the rendered output, which is the thing that
 * actually reaches a person.
 */
describe('investor emails: formation-stage honesty', () => {
  // Each line carries fund-claims-allow because this list IS the retired
  // claims: scripts/check-fund-claims.mjs bans them repo-wide, and a test that
  // asserts their absence has to name them to do it.
  const RETIRED = [
    'Alliance Fund', // fund-claims-allow: the string under test
    '506(c)', // fund-claims-allow: the string under test
    'Reg D', // fund-claims-allow: the string under test
    'Regulation D', // fund-claims-allow: the string under test
    'fund is open', // fund-claims-allow: the string under test
    'first in line when the fund opens', // fund-claims-allow: the string under test
    'Offered pursuant', // fund-claims-allow: the string under test
  ];

  const rendered = () => [
    ['investorWelcome', emailTemplates.investorWelcome('Testname', '$250,000 - $1,000,000')],
    ['investorDripDay3', emailTemplates.investorDripDay3('Testname')],
    ['investorDripDay7', emailTemplates.investorDripDay7('Testname')],
    ['investorDripDay14', emailTemplates.investorDripDay14('Testname')],
    ['investorDripDay30', emailTemplates.investorDripDay30('Testname')],
  ] as const;

  it('carries no retired claim in any investor template', () => {
    for (const [name, tpl] of rendered()) {
      for (const claim of RETIRED) {
        expect(`${name}: ${tpl.subject} ${tpl.html}`).not.toContain(claim);
      }
    }
  });

  it('never restates the term sheet in an email', () => {
    // The numbers live on the page, labelled proposed. An email that carries
    // its own copy is how two surfaces start disagreeing.
    const day3 = emailTemplates.investorDripDay3('Testname').html;
    expect(day3).not.toContain('Minimum commitment:');
    expect(day3).not.toContain('Carried interest:');
    expect(day3).not.toContain('Management fee:');
    expect(day3).not.toContain('Preferred return:');
  });

  it('says the fund is in formation where it introduces the fund', () => {
    for (const name of ['investorWelcome', 'investorDripDay3'] as const) {
      const tpl = name === 'investorWelcome'
        ? emailTemplates.investorWelcome('Testname', '')
        : emailTemplates.investorDripDay3('Testname');
      expect(tpl.html).toContain('is in formation');
      expect(tpl.html).toContain('not yet a legal entity');
      expect(tpl.html).toContain('2027');
    }
  });

  it('keeps the honest Day 14 answer about when capital is accepted', () => {
    const day14 = emailTemplates.investorDripDay14('Testname').html;
    expect(day14).toContain('will not accept capital');
    expect(day14).toContain('$20M');
    expect(day14).toContain('non-binding');
  });

  it('describes the deck as a pre-formation draft', () => {
    const welcome = emailTemplates.investorWelcome('Testname', '').html;
    expect(welcome).toContain('July 2026 draft, pre-formation');
  });
});
