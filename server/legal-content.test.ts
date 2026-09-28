/**
 * The legal pages an agent reads must be the legal pages a human reads.
 *
 * shared/legalContent.ts is generated from the components by
 * scripts/extract-legal-content.mjs. The hazard is drift: someone edits the
 * privacy policy, does not regenerate, and the crawler keeps serving the old
 * text to agents and directory reviewers while the site shows the new one.
 * That is worse than the blank page this replaced, because a stale policy
 * looks authoritative.
 *
 * So this re-runs the extraction and compares, rather than trusting anyone to
 * remember the second step.
 */
import { describe, it, expect } from "vitest";
import { LEGAL_CONTENT, getLegalPage } from "@shared/legalContent";
import { extractAll, render } from "../scripts/extract-legal-content.mjs";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("generated legal content", () => {
  it("matches what the components say today", () => {
    const committed = readFileSync(
      resolve(__dirname, "..", "shared", "legalContent.ts"),
      "utf8",
    );
    expect(
      render(extractAll()),
      "shared/legalContent.ts is stale. Run: node scripts/extract-legal-content.mjs",
    ).toBe(committed);
  });

  it("covers all four pages", () => {
    expect(LEGAL_CONTENT.map((p) => p.slug).sort()).toEqual([
      "disclaimers",
      "privacy-policy",
      "risk-disclosure",
      "terms-of-use",
    ]);
  });

  it("carries the real text, not a summary", () => {
    // Length is the crude signal that someone replaced the extraction with a
    // hand-written blurb, which is the specific mistake this file exists to
    // prevent. The privacy policy is about 4 KB; a summary would be a few
    // hundred characters.
    for (const page of LEGAL_CONTENT) {
      expect(page.html.length, `${page.slug} is suspiciously short`).toBeGreaterThan(2000);
    }
  });

  it("keeps the sentences that do the legal work", () => {
    // Spot checks on load-bearing clauses. If an extraction change silently
    // drops a section, a length check alone would not notice.
    expect(getLegalPage("privacy-policy")!.html).toContain("respects your privacy");
    expect(getLegalPage("disclaimers")!.html).toContain("NOT AN OFFER TO SELL SECURITIES");
    expect(getLegalPage("risk-disclosure")!.html).toContain("READ THIS CAREFULLY BEFORE INVESTING");
    expect(getLegalPage("terms-of-use")!.html).toContain("Acceptance of Terms");
  });

  it("leaks no JSX props into the document text", () => {
    // The first extraction did exactly this: the opening-tag scan stopped at
    // the `/>` inside icon={<Shield ... />} and put `title="..."
    // lastUpdated="..." seo={...}` into the body as prose.
    for (const page of LEGAL_CONTENT) {
      expect(page.html).not.toMatch(/className=|lastUpdated=|seo=|style=\{/);
    }
  });

  it("states a last-updated date on every page", () => {
    // A legal document with no date is one a reader cannot judge.
    for (const page of LEGAL_CONTENT) {
      expect(page.lastUpdated, `${page.slug} has no date`).toBeTruthy();
    }
  });
});
