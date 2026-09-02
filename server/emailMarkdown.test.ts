import { describe, expect, it } from "vitest";
import { markdownToEmailHtml, wrapEmailHtml, markdownEmailDocument, applyMarkdownWrap, applyMarkdownLinePrefix } from "@shared/emailMarkdown";

describe("markdownToEmailHtml", () => {
  it("turns paragraphs and line breaks into styled paragraphs", () => {
    const html = markdownToEmailHtml("Hello {{name}},\n\nWelcome aboard.");
    expect(html).toContain("{{name}}");
    expect(html).toMatch(/<p style="color:#333/);
    expect(html).toContain("Welcome aboard.");
    expect(html).not.toContain("<script");
  });

  it("renders bold, italic, and links", () => {
    const html = markdownToEmailHtml("This is **bold** and *italic* and a [call](https://regencivics.earth/apply).");
    expect(html).toContain("<strong>bold</strong>");
    expect(html).toContain("<em>italic</em>");
    expect(html).toContain('href="https://regencivics.earth/apply"');
    expect(html).toContain("call");
  });

  it("drops javascript: links", () => {
    const html = markdownToEmailHtml("Click [nope](javascript:alert(1)).");
    expect(html).not.toContain("javascript:");
    expect(html).toContain("nope");
  });

  it("renders unordered and ordered lists", () => {
    const html = markdownToEmailHtml("Next:\n\n- one\n- two\n\nThen:\n\n1. first\n2. second");
    expect(html).toContain("<ul");
    expect(html).toContain("<ol");
    expect(html).toContain("one");
    expect(html).toContain("first");
  });

  it("renders headings, quotes, and rules", () => {
    const html = markdownToEmailHtml("## Important\n\n> Hold the land first.\n\n---\n\nDone.");
    expect(html).toContain("<h2");
    expect(html).toContain("Important");
    expect(html).toContain("<blockquote");
    expect(html).toContain("<hr");
  });

  it("escapes raw HTML", () => {
    const html = markdownToEmailHtml("Hi <script>alert(1)</script> {{projectName}}");
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
    expect(html).toContain("{{projectName}}");
  });
});

describe("wrapEmailHtml", () => {
  it("adds the team signature when the body does not already have it", () => {
    const html = wrapEmailHtml("<p>Hi</p>");
    expect(html).toContain("The ReGen Civics Team");
  });

  it("does not duplicate the signature", () => {
    const html = wrapEmailHtml("<p>Warm regards</p><p>The ReGen Civics Team</p>");
    expect(html.match(/ReGen Civics Team/g)?.length).toBe(1);
  });
});

describe("markdownEmailDocument", () => {
  it("wraps converted markdown", () => {
    const html = markdownEmailDocument("Hi **{{name}}**");
    expect(html).toContain("<strong>{{name}}</strong>");
    expect(html).toContain("max-width:600px");
  });
});

describe("applyMarkdownWrap", () => {
  it("wraps a selection with bold markers", () => {
    const out = applyMarkdownWrap("say hello there", 4, 9, "**", "**");
    expect(out.value).toBe("say **hello** there");
    expect(out.selectionStart).toBe(6);
    expect(out.selectionEnd).toBe(11);
  });
});

describe("applyMarkdownLinePrefix", () => {
  it("prefixes the current line", () => {
    const out = applyMarkdownLinePrefix("Hi\nnext", 4, "## ");
    expect(out.value).toBe("Hi\n## next");
  });
});
