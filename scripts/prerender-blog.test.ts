/**
 * Guard for the prerendered blog head.
 *
 * On 2026-08-03 every one of the 18 prerendered posts was serving two <title>,
 * two descriptions, two og:title/og:url, two twitter:title/description and two
 * rel=canonical tags. In each pair the first was the shell's generic homepage
 * value, because buildPostHtml appended its head block before </head> instead
 * of rewriting the tags the shell already had. A crawler taking the first of
 * each pair (which is what happens for <title>, and what Google does with
 * conflicting canonicals by ignoring them entirely) read every blog post as a
 * duplicate of the homepage.
 *
 * The bug was invisible to every other check: the page rendered fine, the
 * prose was all there, typecheck and the build passed. Only counting the tags
 * catches it, so that is what this does.
 */
import { describe, it, expect } from "vitest";
// @ts-expect-error - plain .mjs script, no type declarations
import { buildPostHtml } from "./prerender-blog.mjs";

/** A shell with the same head tags client/index.html actually ships. */
const SHELL = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>ReGen Civics: Infinite Game for the ReGenerative Renaissance</title>
    <meta name="description" content="A fund and a game for regenerative land projects." />
    <link rel="canonical" href="https://regencivics.earth/" />
    <meta property="og:type" content="website" />
    <meta property="og:url" content="https://regencivics.earth/" />
    <meta property="og:title" content="ReGen Civics: Infinite Game for the ReGenerative Renaissance" />
    <meta property="og:description" content="A fund and a game for regenerative land projects." />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:url" content="https://regencivics.earth/" />
    <meta name="twitter:title" content="ReGen Civics: Infinite Game for the ReGenerative Renaissance" />
    <meta name="twitter:description" content="A fund and a game for regenerative land projects." />
  </head>
  <body><div id="root"></div></body>
</html>`;

const POST = {
  slug: "the-regen-ship",
  title: "The ReGen Ship",
  excerpt: "A regenerative pirate ship with a chest of seeds.",
  author: "Rye",
  date: "2026-07-01",
  content: "## Aboard\n\nShe sails Cascadia.",
};

const count = (html: string, needle: string) => html.split(needle).length - 1;

describe("prerendered blog head", () => {
  const html: string = buildPostHtml(SHELL, POST);

  it.each([
    ["<title>", "<title>"],
    ["meta description", 'name="description"'],
    ["canonical", 'rel="canonical"'],
    ["og:type", 'property="og:type"'],
    ["og:url", 'property="og:url"'],
    ["og:title", 'property="og:title"'],
    ["og:description", 'property="og:description"'],
    ["twitter:url", 'name="twitter:url"'],
    ["twitter:title", 'name="twitter:title"'],
    ["twitter:description", 'name="twitter:description"'],
  ])("emits exactly one %s", (_label, needle) => {
    expect(count(html, needle)).toBe(1);
  });

  it("points every URL tag at the post, never the homepage", () => {
    const url = "https://regencivics.earth/blog/the-regen-ship";
    expect(html).toContain(`<link rel="canonical" href="${url}"`);
    expect(html).toContain(`<meta property="og:url" content="${url}"`);
    expect(html).toContain(`<meta name="twitter:url" content="${url}"`);
    // The shell's homepage canonical must be gone, not merely outranked.
    expect(html).not.toContain('<link rel="canonical" href="https://regencivics.earth/" ');
  });

  it("uses the post title, not the shell's site title", () => {
    expect(html).toMatch(/<title>The ReGen Ship \| ReGen Civics Blog<\/title>/);
    expect(html).not.toContain("<title>ReGen Civics: Infinite Game");
  });

  it("switches og:type from website to article", () => {
    expect(html).toContain('<meta property="og:type" content="article"');
    expect(html).not.toContain('content="website"');
  });

  it("still carries the BlogPosting JSON-LD and the crawler-visible article", () => {
    expect(html).toContain('"@type":"BlogPosting"');
    expect(html).toContain("<noscript>");
    expect(html).toContain('id="__prerendered_blog_post__"');
    expect(html).toContain("She sails Cascadia.");
  });

  it("keeps the article ahead of the app root, where crawlers read it", () => {
    expect(html.indexOf("__prerendered_blog_post__")).toBeLessThan(
      html.indexOf('<div id="root">'),
    );
  });
});
