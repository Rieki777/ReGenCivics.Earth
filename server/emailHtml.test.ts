import { describe, expect, it } from "vitest";
import { emailDocumentFromBody, emailDocumentFromMarkdown, sanitizeEmailHtml } from "./lib/emailHtml";

describe("sanitizeEmailHtml", () => {
  it("keeps strong tags and inline styles", () => {
    const html = sanitizeEmailHtml('<p style="color:#333;"><strong>Hello</strong></p>');
    expect(html).toContain("<strong>Hello</strong>");
    expect(html).toContain("color:#333");
  });

  it("strips script tags", () => {
    const html = sanitizeEmailHtml('<p>Hi</p><script>alert(1)</script>');
    expect(html).not.toContain("<script");
    expect(html).toContain("Hi");
  });
});

describe("emailDocumentFromMarkdown", () => {
  it("keeps lists after sanitize", () => {
    const html = emailDocumentFromMarkdown("- one\n- two");
    expect(html).toContain("<ul");
    expect(html).toContain("one");
    expect(html).toContain("The ReGen Civics Team");
  });

  it("keeps announcement tables and buttons after sanitize", () => {
    const html = emailDocumentFromMarkdown("[Open Session](https://regencivics.earth/schedule)", "announcement");
    expect(html).toContain("<table");
    expect(html).toContain("Open Session");
    expect(html).toContain("regencivics.earth/schedule");
    expect(html).toContain("ReGen Civics");
  });
});

describe("emailDocumentFromBody", () => {
  it("passes html through sanitize without wrapping twice", () => {
    const html = emailDocumentFromBody("<h2>Hello {{name}}</h2>", "html");
    expect(html).toContain("<h2>Hello {{name}}</h2>");
  });

  it("converts markdown when format is markdown", () => {
    const html = emailDocumentFromBody("Hi **{{name}}**", "markdown");
    expect(html).toContain("<strong>{{name}}</strong>");
  });
});
