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
import { COOP } from '../shared/fund';
import { escapeHtml } from '../shared/htmlText';
// @ts-expect-error plain .mjs module, typed loosely on purpose
import { findRetired, findG5 } from '../scripts/check-fund-claims.mjs';

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

      expect(template.subject).toContain('ReGen Civics');
      expect(template.subject).not.toContain('Deck');
      expect(template.html).toContain('Michael Investor');
      // The stated range is never echoed back: that would be a pledge amount.
      expect(template.html).not.toContain('$250k - $1M');
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
 * phrases repo-wide; this covers the rendered output, which is the thing that
 * actually reaches a person.
 *
 * 2026-09-27 (Phase 0): the fund became the ReGen Network Cooperative, in
 * design (shared/fund.ts COOP). Every investor email now renders one short
 * cooperative note, the drip is stopped, and these tests run the gate's own
 * retired-claim and G5 checks over the rendered HTML, so a returning phrase
 * fails here as well as in the repo scan.
 */
describe('investor emails: the cooperative, and nothing that prices upside', () => {
  const rendered = () => [
    ['investorWelcome', emailTemplates.investorWelcome('Testname', '$250,000 - $1,000,000')],
    ['coopInterestNote', emailTemplates.coopInterestNote('Testname')],
    ['investorDripDay3', emailTemplates.investorDripDay3('Testname')],
    ['investorDripDay7', emailTemplates.investorDripDay7('Testname')],
    ['investorDripDay14', emailTemplates.investorDripDay14('Testname')],
    ['investorDripDay30', emailTemplates.investorDripDay30('Testname')],
  ] as const;

  it('carries no retired claim and no G5 phrase in any investor template', () => {
    for (const [name, tpl] of rendered()) {
      const text = `${tpl.subject}\n${tpl.html}`;
      expect(findRetired(`${name}.html`, text), name).toEqual([]);
      expect(findG5(`${name}.html`, text), name).toEqual([]);
    }
  });

  it('describes the cooperative in the COOP sentences, with the disclaimer', () => {
    const html = emailTemplates.investorWelcome('Testname', '').html;
    expect(html).toContain(escapeHtml(COOP.statement));
    expect(html).toContain(escapeHtml(COOP.interestPromise));
    expect(html).toContain(escapeHtml(COOP.notAnOffer));
    expect(html).toContain('/loi');
  });

  it('sends no deck, no amount and no terms', () => {
    const html = emailTemplates.investorWelcome('Testname', '$250,000 - $1,000,000').html;
    expect(html).not.toContain('$250,000');
    expect(html).not.toContain('cloudfront.net');
    expect(html.toLowerCase()).not.toContain('deck');
    expect(html.toLowerCase()).not.toContain('letter of intent');
  });

  it('escapes the name a stranger typed into the public form', () => {
    const html = emailTemplates.investorWelcome('<img src=x onerror=alert(1)>', '').html;
    expect(html).not.toContain('<img src=x');
    expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;');
  });

  it('keeps every retired drip key on the same cooperative note', () => {
    const note = emailTemplates.coopInterestNote('Testname');
    for (const [, tpl] of rendered()) {
      expect(tpl.subject).toBe(note.subject);
      expect(tpl.html).toBe(note.html);
    }
  });
});
