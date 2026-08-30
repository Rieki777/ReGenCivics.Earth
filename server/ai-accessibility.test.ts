/**
 * Test for AI accessibility file content
 * Tests for: llms.txt, llms-full.txt, and enhanced sitemap content
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('AI Accessibility Files Content', () => {
  it('should have comprehensive llms.txt', () => {
    const content = readFileSync(
      resolve(__dirname, '../client/public/llms.txt'),
      'utf-8'
    );

    // Should contain key sections
    expect(content).toContain('Four Primary Participation Paths');
    expect(content).toContain('Core Philosophical Concepts');
    expect(content).toContain('Token System and Economics');
    expect(content).toContain('Blog Posts List');

    // Should contain key ReGen Civics concepts
    expect(content).toContain('Infinite Game');
    expect(content).toContain('ReGenerative Renaissance');
    expect(content).toContain('HEIST Framework');
    expect(content).toContain('$ReGen');
    expect(content).toContain('RGVoice');

    // Should contain contact information
    expect(content).toContain('Website: https://regencivics.earth');
    expect(content).toContain('YouTube: https://www.youtube.com/@SEEDSRegenerativeEconomies');
  });

  it('should have comprehensive llms-full.txt', () => {
    const content = readFileSync(
      resolve(__dirname, '../client/public/llms-full.txt'),
      'utf-8'
    );

    // Should contain detailed technical information
    expect(content).toContain('Technical Infrastructure');
    expect(content).toContain('Technology Stack');
    expect(content).toContain('Security Model');

    // Should contain expanded FAQ
    expect(content).toContain('Frequently Asked Questions');

    // Should contain community statistics
    expect(content).toContain('Community Statistics');

    // Should contain key ReGen Civics concepts
    expect(content).toContain('Infinite Game');
    expect(content).toContain('ReGenerative Renaissance');
    expect(content).toContain('Nine Forms of Capital');
    expect(content).toContain('Crowd Pooling');

    // Should have proper update information.
    //
    // Asserts the SHAPE, not a frozen date. This used to pin the literal
    // string "Last updated: July 2026", so the test failed the moment anyone
    // edited the file and told them to change the date back rather than
    // forward. A stale-date guard that breaks on every update is a guard
    // people learn to edit around.
    expect(content).toMatch(/^# Last updated: (January|February|March|April|May|June|July|August|September|October|November|December) \d{4}$/m);
  });

  it('should have enhanced robots.txt', () => {
    const content = readFileSync(
      resolve(__dirname, '../client/public/robots.txt'),
      'utf-8'
    );

    // Should explicitly welcome AI crawlers
    expect(content).toContain('Explicitly welcome AI crawlers');
    expect(content).toContain('User-agent: GPTBot');
    expect(content).toContain('User-agent: Claude-Web');
    expect(content).toContain('User-agent: PerplexityBot');

    // Should allow AI accessibility files
    expect(content).toContain('Allow: /llms.txt');
    expect(content).toContain('Allow: /llms-full.txt');
  });
});