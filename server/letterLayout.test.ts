import { describe, expect, it } from "vitest";
import {
  defaultLayoutForTemplate,
  isHtmlEmailTemplateRow,
  isMarkdownEmailTemplateRow,
  letterFilename,
  letterSkipsSendWrap,
  slugifyLetterKey,
  uniqueLetterKey,
  TEMPLATE_KEY_RE,
} from "@shared/letterLayout";
import { markdownLetterDocument } from "@shared/letterHtml";
import { renderLetterPdf } from "./lib/letterPdf";

describe("letter layout helpers", () => {
  it("uses announcement for the quality-check letter", () => {
    expect(defaultLayoutForTemplate("land_project_accepted")).toBe("announcement");
    expect(letterSkipsSendWrap("announcement")).toBe(true);
    expect(letterSkipsSendWrap("plain")).toBe(false);
  });

  it("accepts EmailSettings camelCase keys and composer snake_case keys", () => {
    expect(TEMPLATE_KEY_RE.test("applicationReceived")).toBe(true);
    expect(TEMPLATE_KEY_RE.test("land_project_accepted")).toBe(true);
    expect(TEMPLATE_KEY_RE.test("letter_season_2_next_steps")).toBe(true);
    expect(TEMPLATE_KEY_RE.test("../etc")).toBe(false);
  });

  it("slugs a new template key", () => {
    expect(slugifyLetterKey("Season 2 next steps")).toBe("letter_season_2_next_steps");
    expect(uniqueLetterKey("Season 2 next steps", ["letter_season_2_next_steps"])).toBe(
      "letter_season_2_next_steps_2",
    );
  });

  it("keeps EmailSettings HTML rows separate from markdown letters", () => {
    expect(isHtmlEmailTemplateRow({ bodyFormat: null })).toBe(true);
    expect(isHtmlEmailTemplateRow({ bodyFormat: "html" })).toBe(true);
    expect(isMarkdownEmailTemplateRow({ bodyFormat: "markdown" })).toBe(true);
    expect(isHtmlEmailTemplateRow({ bodyFormat: "markdown" })).toBe(false);
  });

  it("names a PDF from the subject", () => {
    expect(letterFilename("Season 2 next steps!")).toBe("season-2-next-steps.pdf");
  });
});

describe("markdownLetterDocument", () => {
  it("adds forest chrome for announcement", () => {
    const html = markdownLetterDocument("Hi **{{name}}**\n\n[Open](https://regencivics.earth/apply)", "announcement");
    expect(html).toContain("ReGen Civics");
    expect(html).toContain("regencivics-logo-dark-transparent-rounded.webp");
    expect(html).toContain('bgcolor="#4a7c59"');
    expect(html).toContain("{{name}}");
    expect(html).toContain("<!DOCTYPE html>");
  });
});

describe("renderLetterPdf", () => {
  it("returns a PDF with the same letter content", () => {
    const { bytes, filename } = renderLetterPdf({
      subject: "Quality check passed",
      body: "Hi {{name}}\n\n> Important: complete the steps.\n\n[Schedule a call](https://calendly.com/rieki-cordon/30min)",
      layout: "announcement",
    });
    expect(filename).toBe("quality-check-passed.pdf");
    expect(String.fromCharCode(bytes[0], bytes[1], bytes[2], bytes[3])).toBe("%PDF");
    expect(bytes.length).toBeGreaterThan(200);
  });
});
