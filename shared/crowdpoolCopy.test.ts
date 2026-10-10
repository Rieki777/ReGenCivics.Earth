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

/** Functions that take structured arguments get these instead of sample text. */
const SAMPLE_ARGS: Record<string, unknown[]> = {
  "CLOSE.otherNeeds": [
    [
      { verb: "Apply", title: "Grazing hand", projectName: "Terra Nova" },
      { verb: "Offer", title: "Seed garlic", projectName: "Pachamama" },
    ],
  ],
  "NEED_FILLED.refusal": [["Cedar posts", "Planting day", "Cob work party"]],
};

/** Every string an export can produce: plain strings, object values, array items, and functions called with sample text. */
function collect(value: unknown, path: string, out: Array<[string, string]>): void {
  if (typeof value === "string") {
    out.push([path, value]);
  } else if (typeof value === "function") {
    const args = SAMPLE_ARGS[path] ?? ["Harmony Valley", "Spring Build", "Ma Earth"].slice(0, Math.max(value.length, 1));
    collect((value as (...a: unknown[]) => unknown)(...args), `${path}()`, out);
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

  it("never says help or loans earn tokens or interest (v1.2: recorded, never earned; no promised upside)", () => {
    const earned = strings.filter(([, text]) => /\bearn(s|ed|ing)?\b[^.]*\b(token|interest|return)/i.test(text));
    expect(earned).toEqual([]);
  });

  it("carries the token line exactly", () => {
    expect(TOKEN_LINE("Harmony Valley")).toBe(
      "Your help is recorded in Harmony Valley's token as you deliver it. The token tracks what you pooled. It makes no claim about value.",
    );
  });

  it("names who holds the money on each route, and keeps loans token-free", () => {
    expect(HOLDER_LINE.maearth).toBe(
      "Ma Earth holds this money and pays the project. It never passes through ReGen Civics. You finish on their site.",
    );
    expect(HOLDER_LINE.gosteward).toBe(
      "Steward holds this money and pays the project. It never passes through ReGen Civics. You finish on their site.",
    );
    expect(LOAN_INTEREST_LINE).toBe("Steward sets each loan's terms. Loans are not recorded in the project's token.");
  });

  it("keeps the page strip and example banner as ruled", () => {
    expect(STRIP).toEqual({
      noMoneyHere: "No money moves through this site yet.",
      maEarthEitherWay: "Gifts through Ma Earth go to the project either way.",
      stewardsAnswer: "Stewards are asked to answer every offer and post what happens.",
      ifNotComplete:
        "If it doesn't complete, help already given stays recorded in the project's token, lent things go home on the agreed date or sooner if you ask, and offers that haven't started are released with our thanks.",
    });
    expect(EXAMPLE_BANNER).toBe("This is an example campaign. You can try every step, and nothing you send reaches a real project.");
    expect(ASKS_NO_MONEY).toBe("This project asks for no money");
  });

  it("says help stays recorded in the project's token in the new copy, and never that tokens are earned", () => {
    const BUILD_3 = ["ZERO_VALUE", "DURATION", "CLOSE", "LINK", "OFFER_STEPS", "ARRIVAL", "FOLLOW", "NEED_MARKER", "SEASON_DEFAULTS", "OUTBOUND_DIGEST"];
    const fresh: Array<[string, string]> = [["STRIP.ifNotComplete", STRIP.ifNotComplete]];
    for (const name of BUILD_3) collect((copy as Record<string, unknown>)[name], name, fresh);
    expect(fresh.length).toBeGreaterThan(90);
    for (const [path, text] of fresh) {
      expect(text, path).not.toMatch(/\bearn/i);
      if (/\btoken\b/i.test(text)) expect(text, path).toMatch(/stays recorded/);
    }
  });

  it("carries the build 3 copy exactly where the spec fixes it", () => {
    expect(copy.ZERO_VALUE.field).toBe("Add what this need is worth. A need can't be listed at 0.");
    expect(copy.ZERO_VALUE.server("Cedar posts")).toBe('"Cedar posts" is listed at 0. Give it a value above 0 so it counts toward the whole ask.');
    expect(copy.ZERO_VALUE.review(1)).toBe("1 need is listed at 0. Ask the project to give it a value.");
    expect(copy.ZERO_VALUE.review(3)).toBe("3 needs are listed at 0. Ask the project to give each one a value.");
    expect(copy.DURATION).toEqual({
      intro: "How long should your campaign run? Up to nine months, 273 days.",
      tooLong: "A campaign runs nine months at most, 273 days.",
    });
    expect(copy.CLOSE.afterLine).toBe(
      "Help already given stays recorded in the project's token. Lent things go home on the agreed date, or sooner if you ask. Offers that hadn't started were released with our thanks.",
    );
    expect(copy.CLOSE.otherNeeds([{ verb: "Apply", title: "Grazing hand", projectName: "Terra Nova" }])).toBe(
      "These could use you now: Apply Grazing hand at Terra Nova.",
    );
    expect(copy.CLOSE.followInstead("Harmony Valley")).toBe("Follow Harmony Valley to hear when it asks again.");
    expect(copy.LINK.replyLimit).toBe("You've sent a few notes today. The stewards will see them, and you can send more tomorrow.");
    expect(copy.LINK.linkedAction).toBe("This offer is on your account now. Sign in to change it.");
    expect(copy.LINK.title("Harmony Valley")).toBe("Your offer to Harmony Valley");
    expect(copy.LINK.forCampaign("A trailer", "Spring Build")).toBe("A trailer, for Spring Build");
    expect(copy.OFFER_STEPS.steps.acceptedHours(6)).toBe("Accepted for 6 hours a week");
    expect(copy.ARRIVAL.needsYou("Farm hand")).toBe("Needs you: read the arrival note for Farm hand");
    expect(copy.FOLLOW.emailIntro("Harmony Valley")).toBe(
      "Get news from Harmony Valley by email. News comes in the season letters from the ReGen Civics team, and a free account brings it to your notifications too.",
    );
    expect(copy.FOLLOW.emailDone("Harmony Valley")).toBe("You're on the list for news from Harmony Valley.");
    expect(copy.NEED_MARKER.statsLine(2, 3)).toBe("Needed to start: 2 of 3 met.");
    expect(copy.SEASON_DEFAULTS.upcoming("20 March 2027", 2)).toBe(
      "Default opening day: 20 March 2027. Season 2 crowdpooling opens together at the March equinox, when the Build Season opens on the Year wheel. Each project's page shows its own dates.",
    );
    expect(copy.SEASON_DEFAULTS.open("21 December 2026", 2)).toBe(
      "Season 2 crowdpooling opened on 21 December 2026, the default opening day on the Year wheel. Each project's page shows its own dates.",
    );
    expect(copy.OUTBOUND_DIGEST.choice(2, 41)).toBe("Season 2: email followers and the waitlist (41)");
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

describe("bundle 1 audience copy (build spec 2026-10-01, section 16)", () => {
  it("adds what happens if a campaign doesn't complete as the fourth step", () => {
    expect(copy.HOW_IT_WORKS).toHaveLength(4);
    expect(copy.HOW_IT_WORKS[3]).toEqual({ title: "If it doesn't complete", body: STRIP.ifNotComplete });
  });

  it("the front door's day line drops out once the round has opened", () => {
    expect(copy.START_DOOR.sendBody("20 March 2027")).toBe(
      "The ReGen Civics team checks the eight before your campaign opens. Crowdpooling opens together on 20 March 2027 by default. Ask the ReGen Civics team if your project needs a different day.",
    );
    expect(copy.START_DOOR.sendBody("20 March 2027", true)).not.toContain("20 March 2027");
    expect(copy.START_DOOR.inReview("Hill Farm")).toBe(
      "Hill Farm is in review. You can start your campaign once it's accepted. Meanwhile, get ready with the eight below.",
    );
    expect(copy.START_DOOR.inReview("Hill Farm and Oak Hollow", 2)).toMatch(/^Hill Farm and Oak Hollow are in review\./);
  });

  it("the project line on the gift map is its lead and its link", () => {
    expect(copy.CONTRIBUTOR_DOOR.projectLine).toBe(`${copy.CONTRIBUTOR_DOOR.projectLead} ${copy.CONTRIBUTOR_DOOR.projectLink}`);
  });

  it("types the money sentence once: the binding wording and the gallery's how line are built from it", () => {
    expect(copy.MONEY_ROUTE_LINE).toBe("Money goes through outside partners each project holds, never through ReGen Civics.");
    expect(copy.CROWDPOOLING_WORDING).toContain(copy.MONEY_ROUTE_LINE);
    // The binding wording is byte-identical to the text agreed with the funding lane.
    expect(copy.CROWDPOOLING_WORDING).toBe(
      "Crowdpooling coordinates and accounts for what people bring to land projects: time, things, skills, land and money. Money goes through outside partners each project holds, never through ReGen Civics. The campaigns shown today are examples; real campaigns open when Season 2 starts crowdpooling.",
    );
    expect(copy.GALLERY.howLine.endsWith(copy.MONEY_ROUTE_LINE)).toBe(true);
    expect(copy.GALLERY.howLine).toBe(
      "Pick a need and the project's stewards answer you. An offer counts once they accept it. Money goes through outside partners each project holds, never through ReGen Civics.",
    );
  });

  it("the gallery's opening line follows the default opening day", () => {
    expect(copy.GALLERY.opensLine("20 March 2027", 2, "upcoming")).toBe("Real campaigns open from 20 March 2027.");
    expect(copy.GALLERY.opensLine("20 March 2027", 2, "open")).toBe("Season 2 crowdpooling opened on 20 March 2027.");
    expect("upcoming" in copy.GALLERY.tabs).toBe(false);
  });

  it("the land projects block on /campaigns renders its running line as a lead and a link", () => {
    expect(copy.FOR_LAND_PROJECTS.running).toBe(`${copy.FOR_LAND_PROJECTS.runningLead} ${copy.FOR_LAND_PROJECTS.runningLink}`);
  });

  it("the Needs tab's quiet links name the gift map for what it is", () => {
    expect(copy.NEEDS_TAB.emptyFiltered).toBe("Nothing open matches that right now. Clear a filter to see more.");
    expect(copy.NEEDS_TAB.openTool).toBe("Map what you could bring");
    expect(copy.NEEDS_TAB.addUp).toBe("Map what you could bring");
  });
});

describe("bundle 1 need-window copy (build spec 2026-10-01, section 5.3)", () => {
  it("lists up to three still-open needs, joined in plain words", () => {
    expect(copy.NEED_FILLED.refusal([])).toBe("This need is already filled.");
    expect(copy.NEED_FILLED.refusal(["Cedar posts"])).toBe("This need is already filled. These are still open: Cedar posts.");
    expect(copy.NEED_FILLED.refusal(["Cedar posts", "Planting day"])).toBe(
      "This need is already filled. These are still open: Cedar posts and Planting day.",
    );
    expect(copy.NEED_FILLED.refusal(["Cedar posts", "Planting day", "Cob work party"])).toBe(
      "This need is already filled. These are still open: Cedar posts, Planting day and Cob work party.",
    );
  });

  it("carries the started-shift, window and empty Needs tab lines exactly", () => {
    expect(copy.SHIFT_STARTED).toBe("This shift has already started, so it isn't taking sign-ups.");
    expect(copy.WINDOW_PASSED).toBe("Window passed");
    expect(copy.NEEDS_TAB.allFilled).toBe("Nothing on the live campaigns is open right now.");
  });
});
