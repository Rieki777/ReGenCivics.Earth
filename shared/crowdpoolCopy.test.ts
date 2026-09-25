import { describe, expect, it } from "vitest";
import * as copy from "./crowdpoolCopy";
import { TOKEN_LINE, HOLDER_LINE, LOAN_INTEREST_LINE, STRIP, EXAMPLE_BANNER, ASKS_NO_MONEY } from "./crowdpoolCopy";

/**
 * STEERING section 1 plus the campaign words (contribution, route, complete;
 * claim belongs to the token bridge) and the fund words campaign pages never
 * carry.
 */
const WRITING_RULE_PATTERNS: Array<[string, RegExp]> = [
  ["em-dash", /\u2014/],
  ["contrast framing", /\bnot just\b|\bisn't about\b|\bit's not\b|\bnot \w+(?: \w+)?,? but\b|\bless \w+, more\b/i],
  [
    "AI word pattern",
    /\b(delve|tapestry|foster|leverage|embark|vibrant|crucial|groundbreaking|unlock|unlocks|unleash|seamless|robust|comprehensive|cutting-edge|empower|utilize|genuinely|honestly|straightforward|journey)\b|it's worth noting|in conclusion|testament to|beacon of/i,
  ],
  ["rhetorical opener", /^(what if|have you ever)\b/i],
  ["passive inspiration", /join us|be part of something bigger|together we can/i],
  ["donation words", /\b(donation|donations|donor|donors|charitable)\b|tax deductible/i],
  ["pledge", /\bpledg(e|es|ed|ing)\b/i],
  ["funded", /\bfunded\b/i],
  ["earmark", /\bearmark/i],
  ["fund words", /\$RCivics|fund minimum|CHF 250|\breserve\b|\ballocation\b|\ballocate\b|\brouting\b|\bseat\b/i],
];

/** "Claim" is the token bridge's word. The fixed token disclaimer is the one allowed use. */
function claimOutsideDisclaimer(text: string): boolean {
  return /\bclaim(s|ed)?\b/i.test(text.replace(/no claim about value/gi, ""));
}

function writingRuleBreaks(text: string): string[] {
  const out: string[] = [];
  for (const [name, re] of WRITING_RULE_PATTERNS) if (re.test(text)) out.push(name);
  if (claimOutsideDisclaimer(text)) out.push("claim");
  if (/undefined|null|NaN|\[object/.test(text)) out.push("template leak");
  return out;
}

/** Every string an export can produce: plain strings, object values, array items, and functions called with sample text. */
function collect(value: unknown, path: string, out: Array<[string, string]>): void {
  if (typeof value === "string") {
    out.push([path, value]);
  } else if (typeof value === "function") {
    const args = ["Harmony Valley", "Spring Build", "Ma Earth"].slice(0, Math.max(value.length, 1));
    collect((value as (...a: string[]) => unknown)(...args), `${path}()`, out);
  } else if (Array.isArray(value)) {
    value.forEach((v, i) => collect(v, `${path}[${i}]`, out));
  } else if (value && typeof value === "object") {
    for (const [k, v] of Object.entries(value)) collect(v, `${path}.${k}`, out);
  }
}

describe("shared/crowdpoolCopy", () => {
  const strings: Array<[string, string]> = [];
  for (const [name, value] of Object.entries(copy)) collect(value, name, strings);

  it("exports a real set of strings", () => {
    expect(strings.length).toBeGreaterThan(60);
  });

  it("keeps every string inside the writing rules", () => {
    const breaks = strings
      .map(([path, text]) => [path, writingRuleBreaks(text)] as const)
      .filter(([, found]) => found.length > 0);
    expect(breaks).toEqual([]);
  });

  it("carries the token line exactly", () => {
    expect(TOKEN_LINE("Harmony Valley")).toBe(
      "Your help earns Harmony Valley's token as you deliver it. The token tracks what you pooled. It makes no claim about value.",
    );
  });

  it("names who holds the money on each route, and keeps loans token-free", () => {
    expect(HOLDER_LINE.maearth).toBe(
      "Ma Earth holds this money and pays the project. It never passes through ReGen Civics. You finish on their site.",
    );
    expect(HOLDER_LINE.gosteward).toBe(
      "Steward holds this money and pays the project. It never passes through ReGen Civics. You finish on their site.",
    );
    expect(LOAN_INTEREST_LINE).toBe("Loans earn interest. They earn no tokens.");
  });

  it("keeps the page strip and example banner as ruled", () => {
    expect(STRIP).toEqual({
      noMoneyHere: "No money moves through this site yet.",
      maEarthEitherWay: "Gifts through Ma Earth go to the project either way.",
      stewardsAnswer: "Stewards are asked to answer every offer and post what happens.",
    });
    expect(EXAMPLE_BANNER).toBe("This is an example campaign. You can try every step, and nothing you send reaches a real project.");
    expect(ASKS_NO_MONEY).toBe("This project asks for no money");
  });

  it("the rule checker catches what it should", () => {
    expect(writingRuleBreaks("Your pledge unlocks the next stage \u2014 funded!")).toEqual(
      expect.arrayContaining(["em-dash", "AI word pattern", "pledge", "funded"]),
    );
    expect(writingRuleBreaks("Claim your place")).toContain("claim");
    expect(writingRuleBreaks("It makes no claim about value.")).toEqual([]);
    expect(writingRuleBreaks("Routing buys a seat")).toContain("fund words");
    expect(writingRuleBreaks("It's not money, but time")).toContain("contrast framing");
  });
});
