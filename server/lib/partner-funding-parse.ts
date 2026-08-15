/**
 * Partner funding extractors.
 *
 * Ma Earth and GoSteward render their live totals in different ways, and both
 * change their markup without warning. So these parsers are deliberately
 * layered and forgiving: they try a structured pass over any embedded JSON
 * first (Next.js RSC streams, __NEXT_DATA__, JSON-LD, data attributes), then
 * fall back to reading the numbers out of the visible page text. Any field a
 * pass cannot find comes back null, and a page with none of them parses to
 * null overall.
 *
 * A null result means "leave the cached value alone." The hydration job never
 * zeroes a number it failed to read, so a partner that blocks server fetches or
 * moves its numbers behind client-side rendering degrades to the last good
 * cache instead of showing $0. That is the intended behavior, per
 * CROWDPOOLING_PLATFORM_SPEC.md Part C.
 *
 * Pure module: no network, no db, no side effects. Unit-tested against saved
 * HTML fixtures in server/__fixtures__/partner/.
 */

export interface PartnerFunding {
  /** Total money raised, whole units of the page's currency. null if unread. */
  raised: number | null;
  /** Distinct backers / supporters / investors. null if unread. */
  contributorCount: number | null;
  /** Percent of goal reached (0-1000). null if unread. */
  percent: number | null;
}

export type PartnerKey = "maearth" | "gosteward";

// Key aliases seen across crowdfunding payloads. Ordered specific -> generic so
// "amountRaised" wins over a bare "raised" that might appear elsewhere.
const RAISED_KEYS = [
  "amountRaised", "totalRaised", "raisedAmount", "amount_raised", "fundedAmount",
  "donationTotal", "totalDonated", "currentAmount", "pledgedTotal", "raised",
];
const GOAL_KEYS = [
  "fundingGoal", "goalAmount", "targetAmount", "fundingTarget", "goal", "target",
];
const PERCENT_KEYS = [
  "percentFunded", "percentComplete", "percentRaised", "percentageFunded",
  "progressPercent", "percent",
];
const BACKER_KEYS = [
  "supporterCount", "backerCount", "backersCount", "investorCount",
  "contributorCount", "donorCount", "numberOfSupporters", "numBackers",
  "backers", "supporters", "investors", "contributors", "donors", "lenders",
];

/** Parse a comma/decimal number string to a rounded non-negative int, or null. */
function toInt(raw: string | number | null | undefined): number | null {
  if (raw == null) return null;
  const n = typeof raw === "number" ? raw : parseFloat(String(raw).replace(/,/g, ""));
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n);
}

/**
 * Find the first number attached to any of `aliases` inside an embedded JSON
 * blob. Handles plain (`"key":123`), string (`"key":"123"`), and RSC/escaped
 * (`\"key\":123`) forms so it works on raw HTML with script payloads intact.
 */
function jsonNumberFor(html: string, aliases: string[]): number | null {
  const alt = aliases.join("|");
  const re = new RegExp(
    // optional backslash, quote, key, quote, colon, optional opening quote, number
    String.raw`\\?["'](?:` + alt + String.raw`)\\?["']\s*:\s*\\?["']?\s*(\d[\d,]*(?:\.\d+)?)`,
    "i",
  );
  const m = re.exec(html);
  return m ? toInt(m[1]) : null;
}

/** Strip scripts, styles, and tags to a single line of visible text. */
function stripToText(html: string): string {
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&#36;/g, "$")
    .replace(/&quot;/gi, '"')
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ")
    .trim();
}

/** "$12,450 raised" / "raised $12,450" out of visible text. */
function moneyRaisedFromText(text: string): number | null {
  const forward =
    /(?:\$|USD\s?)\s?(\d[\d,]*)(?:\.\d+)?\s*(?:\+\s*)?(?:raised|pledged|committed|donated|contributed|invested|loaned|funded|in\s+donations)\b/i;
  const backward =
    /\b(?:raised|pledged|committed|donated|invested|loaned)\b[^$0-9]{0,12}(?:\$|USD\s?)\s?(\d[\d,]*)/i;
  const m = forward.exec(text) ?? backward.exec(text);
  return m ? toInt(m[1]) : null;
}

/**
 * "68% funded", "100% of $11,526,615 Funded", "funded to 68%" out of text.
 * GoSteward's live widget renders "N% of $AMOUNT Funded", so "N% of $" counts.
 */
function percentFromText(text: string): number | null {
  const patterns = [
    /\b(\d{1,4})\s?%\s*(?:funded|raised|to\s+goal|complete|reached)\b/i,
    /\b(\d{1,4})\s?%\s+of\s+(?:the\s+)?(?:goal|target|\$)/i,
    /\bfunded\b[^0-9%]{0,8}(\d{1,4})\s?%/i,
  ];
  for (const re of patterns) {
    const m = re.exec(text);
    if (m) return toInt(m[1]);
  }
  return null;
}

/** "212 investors" / "184 supporters" out of visible text. */
function backersFromText(text: string, nouns: string): number | null {
  const re = new RegExp(String.raw`\b(\d[\d,]*)\s+(?:` + nouns + String.raw`)\b`, "i");
  const m = re.exec(text);
  return m ? toInt(m[1]) : null;
}

/** Clamp + round the merged result; percent kept in a sane 0-1000 range. */
function normalize(f: PartnerFunding): PartnerFunding {
  const raised = toInt(f.raised);
  const contributorCount = toInt(f.contributorCount);
  let percent = f.percent == null ? null : Math.round(f.percent);
  if (percent != null && (percent < 0 || percent > 1000)) percent = null;
  return { raised, contributorCount, percent };
}

/**
 * Shared core: JSON pass, then text pass, then fill percent from raised/goal
 * when the page gives raised + goal but no explicit percent. `nouns` tunes the
 * backer regex per partner (donors vs investors).
 */
function parseFunding(html: string, nouns: string): PartnerFunding {
  const jsonRaised = jsonNumberFor(html, RAISED_KEYS);
  const jsonGoal = jsonNumberFor(html, GOAL_KEYS);
  const jsonPercent = jsonNumberFor(html, PERCENT_KEYS);
  const jsonBackers = jsonNumberFor(html, BACKER_KEYS);

  const text = stripToText(html);
  const raised = jsonRaised ?? moneyRaisedFromText(text);
  const contributorCount = jsonBackers ?? backersFromText(text, nouns);
  let percent = jsonPercent ?? percentFromText(text);
  if (percent == null && raised != null && jsonGoal != null && jsonGoal > 0) {
    percent = Math.round((raised / jsonGoal) * 100);
  }
  return normalize({ raised, contributorCount, percent });
}

/** Ma Earth: donation-oriented, gift + matching. */
export function parseMaEarthFunding(html: string): PartnerFunding {
  return parseFunding(html, "supporters?|backers?|donors?|contributors?|gardeners?|trees?\\s+planted");
}

/** GoSteward: loan / investment-oriented. */
export function parseGoStewardFunding(html: string): PartnerFunding {
  return parseFunding(html, "investors?|lenders?|backers?|supporters?|contributors?");
}

/**
 * Entry point for the hydration job. Returns the parsed funding for a partner,
 * or null when nothing at all could be read (so the caller leaves the cached
 * numbers and lastFetchedAt untouched).
 */
export function extractPartnerFunding(html: string | null | undefined, partner: PartnerKey): PartnerFunding | null {
  if (!html) return null;
  const f = partner === "gosteward" ? parseGoStewardFunding(html) : parseMaEarthFunding(html);
  if (f.raised == null && f.contributorCount == null && f.percent == null) return null;
  return f;
}
