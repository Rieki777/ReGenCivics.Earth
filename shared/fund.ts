/**
 * The cooperative: one place that says what is true about it.
 *
 * Why this file exists. Until 2026-08-30 the fund's story lived in twenty-one
 * places and none of them agreed. The page told humans the target was 12 to 18%
 * net IRR; the crawler prose that search engines and AI assistants read said 8
 * to 12%. Nobody wrote either one twice. They were written once each, in files
 * nobody could see side by side. Every surface that describes the cooperative
 * reads its sentences from here, so the next contradiction has to be written
 * on purpose. scripts/check-fund-claims.mjs fails the build if a surface stops
 * importing from here or brings back return, yield, listing or offer language.
 *
 * What changed on 2026-09-27 (FUNDING_ENGINE_PLAN v1.2, Rye's ruling). The
 * "ReGen Civics Fund" is no longer described as a fund. It is being designed as
 * a member-owned purchasing cooperative: land projects and people pool what
 * they have to buy and steward land together, for use, governed one member, one
 * vote. Rye called it "a cooperative regenerative society". Everything the fund
 * copy carried (target IRR, fees, carry, preferred return, distributions, the
 * 506(c) exemption, the accredited-investor gate, the $20M threshold, the
 * $250,000 minimum) is gone from every public surface. None of it was ever
 * agreed with anyone, and a purchasing cooperative loses the "bought for use"
 * position the moment a page promises upside (United Housing Foundation v.
 * Forman, 1975). The old pages are tagged archive/fund-pages-2026-09-27 so they
 * can come back if Rye decides to.
 *
 * What is true today:
 *   - The cooperative is in design. It is not a legal entity.
 *   - It accepts no money. Nothing on the site is an offer of anything.
 *   - Its legal form, bylaws and terms are set with counsel and its founding
 *     members, not in this repo.
 *   - Church of the Regenerative Earth (CORE) stays separate.
 *
 * When a sentence here changes, it changes once, and every surface follows.
 * Every change to this file goes on the counsel review list.
 */

export const COOP = {
  /** The working name. Counsel may change it; if so, it changes here once. */
  name: "ReGen Network Cooperative",

  /** Rye's phrase for what it is, 2026-09-27. */
  tagline: "A cooperative regenerative society",

  status: "design" as const,
  statusLabel: "In design",

  /**
   * False, and the reason most of this module exists. Until this flips, no
   * surface may use the present tense about the cooperative's members,
   * holdings, land, votes or terms.
   */
  hasLegalEntity: false,

  /** False until the cooperative is formed and counsel has signed off. */
  acceptsMoney: false,

  /** The one-sentence definition (plan v1.2, section 12.1). Verbatim. */
  definition:
    "A member-owned cooperative network in which land projects and people buy " +
    "and steward land together, governed democratically by the network itself.",

  /**
   * The paragraph every surface uses, verbatim. A reader who meets the
   * cooperative on a page, in an email and through an AI assistant gets the
   * same sentences three times.
   */
  statement:
    "The ReGen Network Cooperative is being designed as a member-owned " +
    "cooperative in which land projects and people buy and steward land " +
    "together, governed democratically by the network itself. It is not yet a " +
    "legal entity and it accepts no money. We are designing it now with land " +
    "projects, future members and counsel.",

  /** Short form, for meta descriptions and anywhere under a character cap. */
  statementShort:
    "The ReGen Network Cooperative is in design: a member-owned cooperative " +
    "where land projects and people buy and steward land together. It is not " +
    "yet a legal entity and accepts no money.",

  /**
   * How it is being designed to work. Design principles, not terms: each line
   * says what the design is aiming for, and the heading that introduces them
   * must say they are subject to counsel and the founding members.
   */
  designPrinciples: [
    {
      title: "Owned by its members",
      body:
        "Land projects and the people who work with them own the cooperative " +
        "together and govern it one member, one vote.",
    },
    {
      title: "Every form of capital counts",
      body:
        "Members' contributions are recognized across all nine forms of " +
        "capital, from money to time, skills, tools and relationships.",
    },
    {
      title: "Membership stays with the member",
      body: "A membership can't be sold or traded. There is no market for it.",
    },
    {
      title: "No managing partners",
      body:
        "Members elect a small board that rotates. The network hires the people " +
        "who run the day-to-day work.",
    },
    {
      title: "Land held for the long term",
      body:
        "The leading design is the one community land trusts use: the " +
        "cooperative holds land and leases it long term to member projects. " +
        "Counsel will confirm the structure.",
    },
    {
      title: "Built for use",
      body:
        "People join to use and care for shared land, tools and services. " +
        "Membership is for the land projects and people who use the cooperative.",
    },
  ],

  /** Heading line that must introduce designPrinciples wherever they render. */
  designPrinciplesNote:
    "These are the design principles we are working from. The legal form, " +
    "bylaws and terms will be set with counsel and adopted by the founding members.",

  /** Where it stands, in the only tense that is true today. */
  whereItStands:
    "We are designing the cooperative now with land projects, future members " +
    "and counsel. Its legal form, bylaws and terms are not set. When they are, " +
    "the founding members will adopt them together.",

  /** Three entities, never blurred (ruling 6, updated for v1.2). */
  entities:
    "Church of the Regenerative Earth (CORE) is the church and operating " +
    "entity. ReGen Civics is the platform and alliance; it is not the church. " +
    "The ReGen Network Cooperative is in design; it is not part of CORE and is " +
    "not yet an entity.",

  /** What telling us you're interested means, and nothing more. */
  interestPromise:
    "Telling us you're interested is not a commitment and involves no money. " +
    "We'll keep you posted as the cooperative takes shape and invite you into " +
    "the design conversations.",

  /** The one disclaimer. Rendered once per surface that describes the cooperative. */
  notAnOffer:
    "Nothing on this site is an offer to sell, or a request to buy, securities, " +
    "memberships or any other financial product. The cooperative is not formed " +
    "and accepts no money.",

  /** Tokens, in the only way the site may describe them today. */
  tokensNote:
    "Tokens in ReGen Civics record contributions and carry governance weight in " +
    "the Game. They make no claim about financial value.",

  /**
   * The Fund-side tokens from the earlier design. The 2026-09-27 legal research
   * (docs/private/research/legal-plan-conflicts.md, conflict 1) found neither
   * can carry cooperative capital or votes: $RCivics is a live ERC-20 with a
   * public claim bridge, and a Colorado LCA restricts how member interests
   * transfer. So no surface may tie them to the cooperative until counsel rules.
   */
  coopTokens: {
    rcivics:
      "$RCivics comes from the earlier fund design. Its role, if any, in the " +
      "cooperative is being reviewed with counsel.",
    rcvoice:
      "RCVoice comes from the earlier fund design. The cooperative is designed " +
      "to vote one member, one vote, and how RCVoice relates to that is being " +
      "reviewed with counsel.",
  },
} as const;

/**
 * The lineage that IS real, kept apart from the cooperative's own record so the
 * two can never be confused. SEEDS, Hypha and the ReGen Civics seasons happened.
 * The cooperative has no record yet, because it does not exist yet.
 */
export const COOP_LINEAGE_HEADING = "Where this comes from";

export type CoopFacts = typeof COOP;
