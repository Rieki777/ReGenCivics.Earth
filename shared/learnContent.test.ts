/**
 * Shape guards for the Learn hub content.
 *
 * These pages exist to be cited by answer engines, and the citation research
 * behind LLM_DISCOVERABILITY_PLAN.md section 2 is specific about the shape:
 * a direct 40 to 60 word answer, a sourced table or figure, visible author
 * and dates, a next step. Those are all checkable, so they get checked here
 * rather than trusted to whoever writes the next article.
 */
import { describe, it, expect } from "vitest";
import {
  LEARN_ARTICLES,
  LEARN_SLUGS,
  getLearnArticle,
  parseInline,
  stripInline,
} from "./learnContent";

const wordCount = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

describe("learn content", () => {
  it("ships the six pages the 2026-08-01 visibility panel called for", () => {
    expect(LEARN_SLUGS).toEqual([
      "start-a-community-on-your-land",
      "intentional-community-structures",
      "how-to-start-an-ecovillage",
      "community-governance-models",
      "crowd-pooling",
      "nine-forms-of-capital",
    ]);
  });

  it("has unique slugs", () => {
    expect(new Set(LEARN_SLUGS).size).toBe(LEARN_SLUGS.length);
  });

  describe.each(LEARN_ARTICLES.map((a) => [a.slug, a] as const))("%s", (_slug, article) => {
    it("leads with a 40 to 60 word answer", () => {
      const words = wordCount(stripInline(article.answer));
      expect(words).toBeGreaterThanOrEqual(40);
      expect(words).toBeLessThanOrEqual(60);
    });

    it("names an author and carries ISO published and updated dates", () => {
      expect(article.author.length).toBeGreaterThan(0);
      expect(article.authorTitle.length).toBeGreaterThan(0);
      expect(article.published).toMatch(ISO_DATE);
      expect(article.updated).toMatch(ISO_DATE);
    });

    it("carries at least one table or figure, and every one of them is sourced", () => {
      const tables = article.sections.flatMap((s) => (s.table ? [s.table] : []));
      const figures = article.sections.flatMap((s) => (s.figure ? [s.figure] : []));
      expect(tables.length + figures.length).toBeGreaterThan(0);
      for (const t of tables) {
        expect(t.source.length).toBeGreaterThan(0);
        // Every row must have one cell per column, or the rendered table skews.
        for (const row of t.rows) expect(row.length).toBe(t.columns.length);
      }
      for (const f of figures) expect(f.source.length).toBeGreaterThan(0);
    });

    it("has FAQ entries for the FAQPage schema", () => {
      expect(article.faqs.length).toBeGreaterThanOrEqual(4);
      for (const faq of article.faqs) {
        expect(faq.question.trim().endsWith("?")).toBe(true);
        expect(wordCount(faq.answer)).toBeGreaterThanOrEqual(20);
      }
    });

    it("offers a concrete next step into an offering", () => {
      expect(article.nextSteps.length).toBeGreaterThan(0);
      for (const step of article.nextSteps) {
        expect(step.href.startsWith("/")).toBe(true);
        expect(step.blurb.length).toBeGreaterThan(0);
      }
    });

    it("links 2 to 3 siblings that actually exist", () => {
      expect(article.related.length).toBeGreaterThanOrEqual(2);
      expect(article.related.length).toBeLessThanOrEqual(3);
      for (const slug of article.related) {
        expect(getLearnArticle(slug), `related slug ${slug} does not resolve`).toBeDefined();
        expect(slug).not.toBe(article.slug);
      }
    });

    it("uses no em-dashes anywhere (STEERING 1.1)", () => {
      const all = JSON.stringify(article);
      expect(all.includes("—"), "em-dash found").toBe(false);
    });

    it("keeps every inline link well formed", () => {
      const texts = [
        article.answer,
        ...article.sections.flatMap((s) => [...(s.paragraphs ?? []), ...(s.bullets ?? [])]),
      ];
      for (const text of texts) {
        for (const token of parseInline(text)) {
          if (token.type !== "link") continue;
          expect(token.label.length).toBeGreaterThan(0);
          expect(
            token.href.startsWith("/") || token.href.startsWith("https://"),
            `bad href ${token.href}`,
          ).toBe(true);
        }
      }
    });
  });
});

describe("parseInline", () => {
  it("splits text and links", () => {
    expect(parseInline("read [the fund](/fund) now")).toEqual([
      { type: "text", value: "read " },
      { type: "link", label: "the fund", href: "/fund" },
      { type: "text", value: " now" },
    ]);
  });

  it("is reusable across calls, so the regex lastIndex never leaks", () => {
    const first = parseInline("a [x](/x) b");
    const second = parseInline("a [x](/x) b");
    expect(second).toEqual(first);
  });

  it("leaves plain text alone", () => {
    expect(parseInline("no links here")).toEqual([{ type: "text", value: "no links here" }]);
  });

  it("strips link syntax down to the label", () => {
    expect(stripInline("read [the fund](/fund) now")).toBe("read the fund now");
  });
});
