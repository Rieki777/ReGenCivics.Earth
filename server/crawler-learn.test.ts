/**
 * The crawler-visible Learn HTML and its JSON-LD.
 *
 * shared/learnContent.test.ts checks the content data. This checks what the
 * server actually emits from it, which is a different failure surface: escaping,
 * script-tag safety, JSON-LD validity, and route resolution. Both the blog
 * prerender bug (duplicate head tags, 2026-08-03) and the Prerender.io 503
 * (2026-08-01) were failures of the serving path with perfectly good content
 * behind them, so the serving path gets its own tests.
 */
import { describe, it, expect } from "vitest";
import {
  resolveCrawlerContent,
  wrapForInjection,
  escapeHtml,
} from "./_core/crawler-content";
import { LEARN_ARTICLES, stripInline } from "@shared/learnContent";

const SITE = "https://regencivics.earth";

/** Pulls the JSON-LD out of a CrawlerContent the way vite.ts embeds it. */
function embedded(jsonld: object): string {
  return `<script type="application/ld+json">${JSON.stringify(jsonld)}</script>`;
}

describe("escapeHtml", () => {
  it("neutralises every character that can break out of markup", () => {
    expect(escapeHtml('<a href="x">&</a>')).toBe(
      "&lt;a href=&quot;x&quot;&gt;&amp;&lt;/a&gt;",
    );
  });

  it("escapes the ampersand first, so entities are not double-broken", () => {
    // & -> &amp; must happen before < -> &lt;, or the output reads "&lt;" as
    // literal text rather than an escaped bracket.
    expect(escapeHtml("&lt;")).toBe("&amp;lt;");
  });
});

describe("wrapForInjection", () => {
  const wrapped = wrapForInjection("<p>hello</p>");

  it("emits both the noscript copy and the off-screen copy", () => {
    expect(wrapped).toContain("<noscript><p>hello</p></noscript>");
    expect(wrapped).toContain('id="__crawler_content__"');
  });

  it("hides the off-screen copy from assistive tech", () => {
    expect(wrapped).toContain('aria-hidden="true"');
    expect(wrapped).toContain("left:-99999px");
  });
});

describe("Learn crawler content", () => {
  describe.each(LEARN_ARTICLES.map((a) => [a.slug, a] as const))("/learn/%s", (slug, article) => {
    it("resolves and carries a title, description, body and JSON-LD", async () => {
      const c = await resolveCrawlerContent(`/learn/${slug}`);
      expect(c).not.toBeNull();
      expect(c!.title).toContain(article.metaTitle);
      expect(c!.description).toBe(article.metaDescription);
      expect(c!.bodyHtml.length).toBeGreaterThan(1000);
      expect(c!.jsonld).toBeDefined();
    });

    it("puts the direct answer, the byline and both dates in the HTML", async () => {
      const c = await resolveCrawlerContent(`/learn/${slug}`);
      const html = c!.bodyHtml;
      expect(html).toContain(escapeHtml(stripInline(article.answer)));
      expect(html).toContain(escapeHtml(article.author));
      expect(html).toContain(`<time datetime="${article.published}">`);
      expect(html).toContain(`<time datetime="${article.updated}">`);
    });

    it("renders every section heading, table cell and FAQ", async () => {
      const c = await resolveCrawlerContent(`/learn/${slug}`);
      const html = c!.bodyHtml;
      for (const s of article.sections) {
        expect(html).toContain(`<h2>${escapeHtml(s.heading)}</h2>`);
        for (const col of s.table?.columns ?? []) {
          expect(html).toContain(`<th>${escapeHtml(col)}</th>`);
        }
        for (const row of s.table?.rows ?? []) {
          for (const cell of row) expect(html).toContain(`<td>${escapeHtml(cell)}</td>`);
        }
      }
      for (const faq of article.faqs) {
        expect(html).toContain(`<h3>${escapeHtml(faq.question)}</h3>`);
      }
    });

    it("attributes every table and figure visibly, not only in the data", async () => {
      const c = await resolveCrawlerContent(`/learn/${slug}`);
      for (const s of article.sections) {
        if (s.table) expect(c!.bodyHtml).toContain(escapeHtml(s.table.source));
        if (s.figure) expect(c!.bodyHtml).toContain(escapeHtml(s.figure.source));
      }
    });

    it("emits JSON-LD that survives being embedded in a <script> tag", async () => {
      const c = await resolveCrawlerContent(`/learn/${slug}`);
      const tag = embedded(c!.jsonld!);
      // A literal "</script>" anywhere in the serialized JSON ends the script
      // element early and dumps the rest of the graph into the DOM as text.
      // No amount of valid JSON saves you from that.
      expect(tag.slice(0, -"</script>".length)).not.toContain("</script>");
      // And it must round-trip: extract the payload and re-parse it.
      const payload = tag.replace(/^<script type="application\/ld\+json">/, "").replace(/<\/script>$/, "");
      expect(() => JSON.parse(payload)).not.toThrow();
    });

    it("scopes its FAQPage and Article to this URL, not the site", async () => {
      const c = await resolveCrawlerContent(`/learn/${slug}`);
      const graph = (c!.jsonld as { "@graph": Array<Record<string, unknown>> })["@graph"];
      const url = `${SITE}/learn/${slug}`;

      const art = graph.find((n) => n["@type"] === "Article")!;
      expect(art.url).toBe(url);
      expect(art.datePublished).toBe(article.published);
      expect(art.dateModified).toBe(article.updated);
      expect((art.author as { name: string }).name).toBe(article.author);

      const faq = graph.find((n) => n["@type"] === "FAQPage")!;
      // The shell ships a site-wide FAQPage on every route. Without an @id and
      // url anchoring this one to the page, an engine has to guess which of the
      // two describes the URL it just fetched.
      expect(faq["@id"]).toBe(`${url}#faq`);
      expect(faq.url).toBe(url);
      expect((faq.mainEntity as unknown[]).length).toBe(article.faqs.length);

      const crumbs = graph.find((n) => n["@type"] === "BreadcrumbList")!;
      const items = crumbs.itemListElement as Array<{ position: number; item: string }>;
      expect(items.map((i) => i.position)).toEqual([1, 2, 3]);
      expect(items[2].item).toBe(url);
    });

    it("keeps every FAQ answer identical between the HTML and the schema", async () => {
      const c = await resolveCrawlerContent(`/learn/${slug}`);
      const graph = (c!.jsonld as { "@graph": Array<Record<string, unknown>> })["@graph"];
      const faq = graph.find((n) => n["@type"] === "FAQPage")!;
      const questions = faq.mainEntity as Array<{
        name: string;
        acceptedAnswer: { text: string };
      }>;
      // Schema that disagrees with the visible page is the one thing answer
      // engines actively penalise, so the two are checked against each other
      // rather than each against the source.
      for (const q of questions) {
        expect(c!.bodyHtml).toContain(escapeHtml(q.name));
        expect(c!.bodyHtml).toContain(escapeHtml(q.acceptedAnswer.text));
      }
    });
  });

  describe("the /learn index", () => {
    it("lists every article with a link and a summary", async () => {
      const c = await resolveCrawlerContent("/learn");
      expect(c).not.toBeNull();
      for (const a of LEARN_ARTICLES) {
        expect(c!.bodyHtml).toContain(`href="/learn/${a.slug}"`);
        expect(c!.bodyHtml).toContain(escapeHtml(a.title));
      }
    });

    it("emits CollectionPage JSON-LD covering all of them", async () => {
      const c = await resolveCrawlerContent("/learn");
      const ld = c!.jsonld as { "@type": string; hasPart: Array<{ url: string }> };
      expect(ld["@type"]).toBe("CollectionPage");
      expect(ld.hasPart.map((p) => p.url).sort()).toEqual(
        LEARN_ARTICLES.map((a) => `${SITE}/learn/${a.slug}`).sort(),
      );
    });
  });

  describe("route resolution", () => {
    it("returns null for a slug that does not exist", async () => {
      expect(await resolveCrawlerContent("/learn/does-not-exist")).toBeNull();
    });

    it("does not match nested or traversal-shaped paths", async () => {
      expect(await resolveCrawlerContent("/learn/crowd-pooling/extra")).toBeNull();
      expect(await resolveCrawlerContent("/learn/../admin")).toBeNull();
      expect(await resolveCrawlerContent("/learn/Crowd-Pooling")).toBeNull();
    });

    it("does not confuse the index with a slug", async () => {
      const index = await resolveCrawlerContent("/learn");
      const article = await resolveCrawlerContent("/learn/crowd-pooling");
      expect(index!.title).not.toBe(article!.title);
    });
  });
});
