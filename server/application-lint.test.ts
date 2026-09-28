/**
 * The application draft lint (shared/applicationLint.mjs, run from
 * scripts/lint-application-draft.mjs; funding engine Phase 1, the application
 * kit). Pure: no database, no portal.
 */
import { describe, expect, it } from "vitest";
import {
  charCount,
  confirmedNumberSet,
  extractNumbers,
  lintAnswer,
  normalizeNumber,
  parseDraft,
  wordCount,
} from "../shared/applicationLint.mjs";
import { G5_RULES as SHARED_G5_RULES, RETIRED as SHARED_RETIRED } from "../shared/g5Rules.mjs";
// @ts-expect-error plain .mjs module, typed loosely on purpose
import { G5_RULES as GATE_G5_RULES, RETIRED as GATE_RETIRED } from "../scripts/check-fund-claims.mjs";
// @ts-expect-error plain .mjs module, typed loosely on purpose
import { lintAnswer as cliLintAnswer } from "../scripts/lint-application-draft.mjs";

const EM_DASH = String.fromCharCode(0x2014);
const EN_DASH = String.fromCharCode(0x2013);

describe("one rulebook", () => {
  it("the site gate and the draft lint use the same G5 rules and retired claims", () => {
    expect(GATE_G5_RULES).toBe(SHARED_G5_RULES);
    expect(GATE_RETIRED).toBe(SHARED_RETIRED);
    expect(cliLintAnswer).toBe(lintAnswer);
  });
});

describe("parseDraft", () => {
  it("splits answers by numbered headings and skips quoted notes", () => {
    const md = "# PearX\n\n## 12\nFirst answer.\n\n## Q13. What is your traction?\n> the pasted question\nSecond answer.\n";
    const answers = parseDraft(md);
    expect(answers.get(12)).toBe("First answer.");
    expect(answers.get(13)).toBe("Second answer.");
    expect(answers.size).toBe(2);
  });
});

describe("counting", () => {
  it("counts characters as code points and words by whitespace", () => {
    expect(charCount("abc")).toBe(3);
    expect(charCount("a\nb")).toBe(3);
    expect(wordCount("  two words  ")).toBe(2);
    expect(wordCount("")).toBe(0);
  });
});

describe("lintAnswer", () => {
  const q = { char_limit: 20, word_limit: null };

  it("fails an answer over the character limit and says how much to cut", () => {
    const r = lintAnswer(q, "x".repeat(25));
    expect(r.errors.join(" ")).toContain("25 characters, limit 20 (cut 5)");
  });

  it("reads camelCase limits from a database row the same way", () => {
    expect(lintAnswer({ charLimit: 20 }, "x".repeat(25)).errors.join(" ")).toContain("(cut 5)");
    expect(lintAnswer({ wordLimit: 2 }, "one two three").errors.join(" ")).toContain("3 words, limit 2 (cut 1)");
  });

  it("fails upside language, retired claims and dashes", () => {
    const long = { char_limit: null };
    expect(lintAnswer(long, "Target returns of 8% annually.").errors.join(" ")).toContain("G5");
    // fund-claims-allow: the lint has to be shown the retired claim it must catch
    expect(lintAnswer(long, "The ReGen Civics Fund is open.").errors.join(" ")).toContain("retired claim");
    expect(lintAnswer(long, `We build tools${EM_DASH}fast.`).errors).toContain("contains an em-dash");
    expect(lintAnswer(long, `Weeks 3${EN_DASH}5.`).errors).toContain("contains an en-dash");
  });

  it("warns on AI words, contrast framing and unconfirmed numbers without failing", () => {
    const long = { char_limit: null };
    const r = lintAnswer(long, "We leverage tools. It is not just software, but a network. 66 projects applied.");
    expect(r.errors).toEqual([]);
    expect(r.warnings.join(" ")).toContain('AI word: "leverage"');
    expect(r.warnings.join(" ")).toContain("contrast framing");
    expect(r.warnings.join(" ")).toContain("number not in confirmed metrics: 66");
  });

  it("accepts a number that matches a confirmed metric in any common form", () => {
    const long = { char_limit: null };
    const confirmed = confirmedNumberSet([{ displayValue: "$10,000", valueNumeric: 10000 }]);
    expect(confirmed.has("10000")).toBe(true);
    expect(lintAnswer(long, "We have been paid $10K so far.", confirmed).warnings).toEqual([]);
    expect(lintAnswer(long, "We have been paid $10,000 so far.", confirmed).warnings).toEqual([]);
    expect(lintAnswer(long, "We have been paid $12K so far.", confirmed).warnings.join(" ")).toContain("$12K");
  });

  it("fails an answer that still carries a placeholder", () => {
    const long = { char_limit: null };
    expect(lintAnswer(long, "Founded by a veteran [VERIFY: 16 years or a decade].").errors.join(" ")).toContain("unresolved placeholder");
    expect(lintAnswer(long, "We are raising $X on a post-money SAFE.").errors.join(" ")).toContain('"$X"');
    expect(lintAnswer(long, "to reach [N] paying projects").errors.join(" ")).toContain('"[N]"');
    expect(lintAnswer(long, "Prices: [DECIDE]").errors.join(" ")).toContain("[DECIDE]");
    expect(lintAnswer(long, "We raised $10K and $XYZ Corp paid.").errors).toEqual([]);
  });

  it("treats an empty or missing answer as zero characters, not a crash", () => {
    expect(lintAnswer(q, "").chars).toBe(0);
    expect(lintAnswer(q, undefined as unknown as string).errors).toEqual([]);
  });
});

describe("numbers", () => {
  it("extracts claim-like numbers and skips years and small counts", () => {
    expect(extractNumbers("In 2022, 43 projects applied and we raised $10K, a 12% share, 50+ in all, 3 founders.")).toEqual([
      "43",
      "$10K",
      "12%",
      "50+",
    ]);
  });

  it("normalizes units", () => {
    expect(normalizeNumber("$10K")).toBe("10000");
    expect(normalizeNumber("1,200")).toBe("1200");
    expect(normalizeNumber("3.5M")).toBe("3500000");
    expect(normalizeNumber("12%")).toBe("12%");
  });
});
