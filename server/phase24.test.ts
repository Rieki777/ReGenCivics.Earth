/**
 * Phase 24 Tests: Google Search Console, Markdown Toolbar, Auto-Language Detection
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('Google Search Console Verification', () => {
  it('should have google-site-verification meta tag in index.html', () => {
    const html = readFileSync(
      resolve(__dirname, '../client/index.html'),
      'utf-8'
    );
    expect(html).toContain('google-site-verification');
    expect(html).toContain('kaWMd47VXCljxUJ42l2GgRoBdnJIdK6F0w2sEhbCJW4');
  });

  it('should not be commented out', () => {
    const html = readFileSync(
      resolve(__dirname, '../client/index.html'),
      'utf-8'
    );
    // Find the line with google-site-verification
    const lines = html.split('\n');
    const verificationLine = lines.find(l => l.includes('google-site-verification'));
    expect(verificationLine).toBeDefined();
    // Should NOT be inside a comment
    expect(verificationLine).not.toContain('<!--');
  });
});

describe('Markdown Toolbar Component', () => {
  it('should export MarkdownToolbar and useMarkdownShortcuts', () => {
    const source = readFileSync(
      resolve(__dirname, '../client/src/components/MarkdownToolbar.tsx'),
      'utf-8'
    );
    expect(source).toContain('export function MarkdownToolbar');
    expect(source).toContain('export function useMarkdownShortcuts');
  });

  it('should include all formatting actions (bold, italic, headers, link, lists, quote, code, divider)', () => {
    const source = readFileSync(
      resolve(__dirname, '../client/src/components/MarkdownToolbar.tsx'),
      'utf-8'
    );
    expect(source).toContain("label: 'Bold'");
    expect(source).toContain("label: 'Italic'");
    expect(source).toContain("label: 'Heading 1'");
    expect(source).toContain("label: 'Heading 2'");
    expect(source).toContain("label: 'Link'");
    expect(source).toContain("label: 'Bullet List'");
    expect(source).toContain("label: 'Numbered List'");
    expect(source).toContain("label: 'Blockquote'");
    expect(source).toContain("label: 'Inline Code'");
    expect(source).toContain("label: 'Divider'");
  });

  it('should support keyboard shortcuts (Ctrl+B, Ctrl+I, Ctrl+K)', () => {
    const source = readFileSync(
      resolve(__dirname, '../client/src/components/MarkdownToolbar.tsx'),
      'utf-8'
    );
    expect(source).toContain("shortcut: 'Ctrl+B'");
    expect(source).toContain("shortcut: 'Ctrl+I'");
    expect(source).toContain("shortcut: 'Ctrl+K'");
  });

  it('should support compact mode for reply boxes', () => {
    const source = readFileSync(
      resolve(__dirname, '../client/src/components/MarkdownToolbar.tsx'),
      'utf-8'
    );
    expect(source).toContain('compact');
    expect(source).toContain('COMPACT_ACTIONS');
  });

  it('should be integrated in CommunityNewPost.tsx', () => {
    const source = readFileSync(
      resolve(__dirname, '../client/src/pages/CommunityNewPost.tsx'),
      'utf-8'
    );
    expect(source).toContain('MarkdownToolbar');
    expect(source).toContain('useMarkdownShortcuts');
    expect(source).toContain('contentRef');
    expect(source).toContain('handleMarkdownShortcuts');
  });

  it('should be integrated in CommunityPost.tsx reply area', () => {
    const source = readFileSync(
      resolve(__dirname, '../client/src/pages/CommunityPost.tsx'),
      'utf-8'
    );
    // CommunityPost uses RichEditor (Tiptap) instead of raw textarea + useMarkdownShortcuts
    expect(source).toContain('RichEditor');
    expect(source).toContain('MarkdownToolbar');
  });
});

describe('Language Selection (Fix 200: removed auto-detect, only restore explicit user choice)', () => {
  it('should restore only explicit user language choice from localStorage', () => {
    const source = readFileSync(
      resolve(__dirname, '../client/src/components/GoogleTranslate.tsx'),
      'utf-8'
    );
    // Auto-detect was removed in Fix 200. Only manual selection is restored.
    expect(source).toContain('LANG_STORAGE_KEY');
    expect(source).toContain('regen-civics-language');
  });

  it('should respect stored language preference after manual selection', () => {
    const source = readFileSync(
      resolve(__dirname, '../client/src/components/GoogleTranslate.tsx'),
      'utf-8'
    );
    // Should check for LANG_STORAGE_KEY (manual selection)
    expect(source).toContain('regen-civics-language');
    expect(source).toContain('LANG_STORAGE_KEY');
  });
});
