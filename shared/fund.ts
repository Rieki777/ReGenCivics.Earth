/**
 * The ReGen Civics Fund: one place that says what is true about it.
 *
 * Why this file exists. Until 2026-08-30 the fund's story lived in twenty-one
 * places and none of them agreed. The page told humans the target was 12 to 18%
 * net IRR. The crawler prose that Google and every AI assistant actually read
 * (server/_core/crawler-content.ts, injected into every response, not just
 * crawler ones) said 8 to 12%. Both numbers had been live for about two years.
 * Nobody wrote either one twice; they were written once each, in different
 * files, by people who could not see the other file.
 *
 * That is the failure this module is for. Every surface that describes the fund
 * reads its name, its status, its target year and its statement from here, so
 * the next contradiction has to be introduced deliberately rather than by
 * forgetting a file. scripts/check-fund-claims.mjs fails the build if a surface
 * stops importing from here or reintroduces one of the retired claims.
 *
 * What is true as of 2026-08-30, per Rye's rulings:
 *   - The Fund is in formation. It is not a legal entity.
 *   - It is separate from Church of the Regenerative Earth (CORE), which is.
 *   - Target launch is 2027.
 *   - The economics below are PROPOSED. They are settled at the founding event
 *     by the founding investors, not by this repo.
 *   - No exemption has been CHOSEN. Rye's ruling of 2026-08-30 is that the
 *     page may name Regulation D 506(c) as the likely path provided it says
 *     plainly, in the same breath, that nothing is selected and the founding
 *     investors may settle on another. One field carries that sentence and
 *     one surface renders it. Everywhere else the ban still holds.
 *
 * When a number here changes, it changes once, and every surface follows.
 */

export const FUND = {
  /**
   * The only name. Not "ReGen Civics Alliance Fund" (Fund.tsx, JsonLD.tsx, the
   * welcome email), not "ReGen Civics Regenerative Land Fund" (StructuredData,
   * SEO, vite meta, the digest email). Those four names described one thing.
   */
  name: "ReGen Civics Fund",

  status: "formation" as const,
  statusLabel: "In formation",

  /** The year the fund is aiming to launch. Not 2026: that year is now spent. */
  launchTarget: "2027",

  /**
   * False, and the reason most of this module exists. Until this flips, no
   * surface may use the present tense about the fund's operations, holdings,
   * jurisdictions, or terms.
   */
  hasLegalEntity: false,

  /**
   * The founding-event threshold. Q2 default: the page's own number, which
   * Opportunity.tsx and the Day 14 drip email already agreed on.
   */
  loiThreshold: "$20M",

  /** Q10: still enforced by the LOI form. Labelled proposed everywhere it shows. */
  proposedMinimumUsd: 250_000,
  proposedMinimumLabel: "$250,000 (proposed)",

  /**
   * Q4: one target figure, everywhere. The page's 12 to 18%, not the crawler's
   * 8 to 12%. A modelled target, never a promise, never a projection presented
   * as a result.
   */
  targetNetIrr: "12 to 18%",
  targetNetIrrLabel: "Target net IRR, modelled. Assumptions available on request.",

  /**
   * The label that goes on every economic figure on every surface. Q3 default:
   * these are Rye's proposal for the founding event, not terms agreed with
   * anyone. If they ever are agreed, this string changes and the numbers do not.
   */
  termsLabel: "Proposed terms, to be settled at the founding event",

  /** Proposed economics. One copy. No surface carries its own. */
  proposedTerms: {
    managementFee: "1.5% annually",
    carriedInterest: "20% above the preferred return",
    preferredReturn: "8% cumulative",
    fundTerm: "Perpetual",
    allocation: "60 / 30 / 10, land / alliance / innovation",
    fundSizeTarget: "$25M to $50M",
    distributions: "Quarterly, planned from Year 3 after formation",
  },

  /**
   * The paragraph every surface uses. Verbatim, not paraphrased: the point is
   * that a reader who meets the fund on the page, in an email, and through an
   * AI assistant gets the same sentences three times rather than three stories.
   */
  statement:
    "The ReGen Civics Fund is in formation. It is not yet a legal entity. " +
    "We are gathering non-binding Letters of Intent. When they reach critical " +
    "mass, the founding investors meet to agree the legal structure together, " +
    "and the fund is formed. Target launch: 2027. Until then no capital is " +
    "accepted and no money moves.",

  /** Short form, for meta descriptions and other places under a character cap. */
  statementShort:
    "The ReGen Civics Fund is in formation, gathering non-binding Letters of " +
    "Intent. Target launch 2027. No capital is accepted yet.",

  /**
   * Already on the page at Opportunity.tsx:628 and reused, not rewritten.
   *
   * This comment used to end: "Naming an exemption is a claim nobody has made:
   * counsel has not chosen one, and 'we intend to rely on 506(c)' is still the
   * claim." That reasoning was put to Rye on 2026-08-30 and he ruled the other
   * way, with a stronger disclosure attached than the one it argued against.
   * See exemptionIntent below. The objection is kept here because it is the
   * argument counsel should be shown alongside the line itself.
   */
  offeringDisclaimer:
    "This is not an offer to sell securities. An offering will only be made " +
    "through a confidential private placement memorandum to accredited " +
    "investors in compliance with applicable securities laws.",

  /**
   * Rye's ruling, 2026-08-30. Names the likely exemption and refuses to let it
   * read as settled. Rendered once, in the NOT AN OFFER block on Opportunity,
   * next to the disclaimer that qualifies it. Gate 1d bans these strings on
   * purpose; this is the one deliberate use, and the suppression carries why.
   */
  // fund-claims-allow: Rye's ruling 2026-08-30. Names 506(c) as the likely path and says in the same sentence that nothing is selected. The gate exists to stop this being re-authored by accident, not to stop a decision.
  exemptionIntent:
    "No securities exemption has been chosen. Regulation D 506(c) is the " +
    "likely path, and the founding investors may settle on another when the " +
    "fund is formed.",

  /** Eligibility, in the only tense that is true today. */
  eligibility:
    "When formed, the fund will be open to accredited investors only.",

  /** Ruling 6. Three things, never blurred. */
  entities:
    "Church of the Regenerative Earth (CORE) is the church and operating " +
    "entity. ReGen Civics is the platform and alliance; it is not the church. " +
    "The ReGen Civics Fund is in formation; it is not part of CORE and is not " +
    "yet an entity.",

  /**
   * What actually happens at the founding event. Q12: no date, because there
   * is none. The agenda is what the Day 14 drip email has been describing
   * accurately since before this session.
   */
  foundingEvent:
    "When Letters of Intent reach critical mass, investors, land project " +
    "stewards and a council of domain experts gather to agree the fund's legal " +
    "structure, jurisdiction, terms and governance together.",

  /** Q13. What signing an LOI gets you, and nothing more. */
  loiPromise:
    "A Letter of Intent is a non-binding indication of interest. It carries no " +
    "obligation. Signers are invited to the founding event when the threshold " +
    "is reached.",

  /**
   * Q9, Rye's ruling of 2026-08-29: the deck stays, labelled. Two different
   * files carry this label, and they are not the same document: Fund.tsx links
   * the repo PDF, email.ts links a CloudFront v3 copy this repo does not
   * control or generate. Neither has been read against the current copy.
   */
  deckLabel: "July 2026 draft, pre-formation",
} as const;

/**
 * The lineage that IS real, kept separate from the fund's own record so the two
 * can never be confused. SEEDS, Hypha and five seasons of ReGen Civics happened.
 * The fund has no track record, because it has made no investments.
 */
export const FUND_LINEAGE_HEADING = "Where this comes from";

export type FundFacts = typeof FUND;
