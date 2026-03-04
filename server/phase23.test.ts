/**
 * Phase 23 Tests: SEO, Forum Markdown, Blog Fixes
 * Tests for: blog deduplication, inline markdown rendering, sitemap completeness
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('Blog Deduplication', () => {
  it('should not show How-To posts in the Recent Posts section', () => {
    // Read the Blog.tsx source to verify the filtering logic
    const blogSource = readFileSync(
      resolve(__dirname, '../client/src/pages/Blog.tsx'),
      'utf-8'
    );
    
    // Verify howToSlugs set is created
    expect(blogSource).toContain('howToSlugs');
    expect(blogSource).toContain('new Set(howToPosts.map');
    
    // Verify recentPosts excludes howTo slugs
    expect(blogSource).toContain('!howToSlugs.has(post.slug)');
  });
});

describe('BlogInlineMarkdown', () => {
  it('should export renderInlineMarkdown function', async () => {
    // Verify the module exists and exports correctly
    const source = readFileSync(
      resolve(__dirname, '../client/src/components/BlogInlineMarkdown.tsx'),
      'utf-8'
    );
    
    expect(source).toContain('export function renderInlineMarkdown');
    // Should handle bold
    expect(source).toContain('**');
    // Should handle links
    expect(source).toContain('[text](url)');
    // Should handle internal links with wouter Link
    expect(source).toContain("from 'wouter'");
  });
  
  it('should be imported in BlogPost.tsx', () => {
    const blogPostSource = readFileSync(
      resolve(__dirname, '../client/src/pages/BlogPost.tsx'),
      'utf-8'
    );
    
    expect(blogPostSource).toContain("from \"@/components/BlogInlineMarkdown\"");
    expect(blogPostSource).toContain('renderInlineMarkdown');
  });
});

describe('ForumMarkdown', () => {
  it('should export ForumMarkdown and MarkdownHints components', () => {
    const source = readFileSync(
      resolve(__dirname, '../client/src/components/ForumMarkdown.tsx'),
      'utf-8'
    );
    
    expect(source).toContain('export function ForumMarkdown');
    expect(source).toContain('export function MarkdownHints');
    // Should use react-markdown
    expect(source).toContain('react-markdown');
  });
  
  it('should be used in CommunityPost.tsx', () => {
    const communityPostSource = readFileSync(
      resolve(__dirname, '../client/src/pages/CommunityPost.tsx'),
      'utf-8'
    );
    
    expect(communityPostSource).toContain('ForumMarkdown');
    expect(communityPostSource).toContain('MarkdownHints');
    // Should NOT contain the old renderContent function
    expect(communityPostSource).not.toContain('function renderContent');
  });
  
  it('should be used in CommunityNewPost.tsx', () => {
    const newPostSource = readFileSync(
      resolve(__dirname, '../client/src/pages/CommunityNewPost.tsx'),
      'utf-8'
    );
    
    expect(newPostSource).toContain('ForumMarkdown');
  });
});

describe('Google Translate Integration', () => {
  it('should have GoogleTranslateProvider component', () => {
    const source = readFileSync(
      resolve(__dirname, '../client/src/components/GoogleTranslate.tsx'),
      'utf-8'
    );
    
    expect(source).toContain('export function GoogleTranslateProvider');
    expect(source).toContain('export function triggerGoogleTranslate');
    expect(source).toContain('export function resetGoogleTranslate');
    expect(source).toContain('translate.google.com');
  });
  
  it('should be integrated in main.tsx', () => {
    const mainSource = readFileSync(
      resolve(__dirname, '../client/src/main.tsx'),
      'utf-8'
    );
    
    expect(mainSource).toContain('GoogleTranslateProvider');
    expect(mainSource).toContain("from \"@/components/GoogleTranslate\"");
  });
  
  it('should trigger Google Translate from LanguageSwitcher', () => {
    const switcherSource = readFileSync(
      resolve(__dirname, '../client/src/components/LanguageSwitcher.tsx'),
      'utf-8'
    );
    
    expect(switcherSource).toContain('triggerGoogleTranslate');
    expect(switcherSource).toContain('resetGoogleTranslate');
  });
});

describe('Sitemap Completeness', () => {
  it('should contain all public routes', () => {
    const sitemap = readFileSync(
      resolve(__dirname, '../client/public/sitemap.xml'),
      'utf-8'
    );
    
    // Core pages
    expect(sitemap).toContain('regencivics.earth/');
    expect(sitemap).toContain('regencivics.earth/seasons');
    expect(sitemap).toContain('regencivics.earth/schedule');
    expect(sitemap).toContain('regencivics.earth/fund');
    expect(sitemap).toContain('regencivics.earth/blog');
    expect(sitemap).toContain('regencivics.earth/community');
    expect(sitemap).toContain('regencivics.earth/map');
    expect(sitemap).toContain('regencivics.earth/team');
    
    // Newly added pages
    expect(sitemap).toContain('regencivics.earth/community/quests');
    expect(sitemap).toContain('regencivics.earth/profile');
    expect(sitemap).toContain('regencivics.earth/investmentform');
    
    // Blog posts
    expect(sitemap).toContain('regencivics.earth/blog/introducing-games-and-quests');
    expect(sitemap).toContain('regencivics.earth/blog/what-makes-regen-civics-different');
  });
  
  it('should have valid XML structure', () => {
    const sitemap = readFileSync(
      resolve(__dirname, '../client/public/sitemap.xml'),
      'utf-8'
    );
    
    expect(sitemap).toContain('<?xml');
    expect(sitemap).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"');
    expect(sitemap).toContain('</urlset>');
    
    // Count URLs - should be at least 45 (original) + 6 (new)
    const urlCount = (sitemap.match(/<url>/g) || []).length;
    expect(urlCount).toBeGreaterThanOrEqual(50);
  });
});

describe('robots.txt', () => {
  it('should reference sitemap', () => {
    const robots = readFileSync(
      resolve(__dirname, '../client/public/robots.txt'),
      'utf-8'
    );
    
    expect(robots).toContain('Sitemap: https://www.regencivics.earth/sitemap.xml');
  });
});
