/**
 * Shared copy for the crowdpool campaign surfaces: the project page, the
 * offer sheet and its receipt, the money block, the whole-ask sheet and the
 * Needs tab. One file so a word changes once, and so shared/crowdpoolCopy.test.ts
 * can hold every string to the writing rules (STEERING section 1).
 *
 * Words: contribution (never donation or pledge), route (never earmark),
 * complete (never funded). "Claim" belongs to the token bridge and stays off
 * campaign surfaces; the one exception is the fixed token disclaimer "makes no
 * claim about value", which carries an allow comment for the scoped guard.
 * Campaign pages carry no fund copy at all.
 *
 * Progress lines (in-kind, money, open, halves, completion) are built in
 * shared/campaignProgress.ts from numbers; the fixed strings live here.
 * Later build lanes add to this file; nothing here is removed without
 * checking its readers.
 */

// ── Tokens (R33). Copy only: this build issues no tokens. ────────────────────

/** The project's own campaign token, earned as help is delivered. Never RGVoice or $ReGen. */
export const TOKEN_LINE = (project: string) =>
  // banned-terms-allow: "no claim about value" is the token disclaimer, not the claim verb
  `Your help earns ${project}'s token as you deliver it. The token tracks what you pooled. It makes no claim about value.`;
export const TOKEN_HELD_LINE = "We hold your tokens until you make an account.";
export const TOKEN_PRACTICE_LINE = "Practice run. Real campaigns issue the project's token as you deliver.";
export const LOAN_INTEREST_LINE = "Loans earn interest. They earn no tokens.";

// ── Give or lend (section 6) ────────────────────────────────────────────────

export const LOAN_RISK_LINE =
  "Loans are at the lender's risk unless you and the project agree otherwise. Write anything you've agreed here.";

export const GIVE_LEND = {
  legend: "Give it or lend it?",
  give: "Give it",
  lend: "Lend it",
  chooseError: "Choose give or lend.",
  loanOnly: "The project would take this on loan. It comes back to you.",
  availableFrom: "Available from",
  until: "Until",
  terms: "Condition and anything you've agreed",
  missingUntil: "Add the date it needs to come back.",
  untilBeforeNeed: "The loan ends before the project needs it. Pick a later date.",
  untilBeforeFrom: "The loan can't end before it starts.",
  freeformValueLabel: "Roughly what is it worth? (optional)",
  freeformValueHelper: "The stewards use this to see the whole ask. Leave it blank if you're not sure.",
} as const;

// ── The project page (section 8) ────────────────────────────────────────────

export const ASKS_NO_MONEY = "This project asks for no money";

export const EXAMPLE_BANNER =
  "This is an example campaign. You can try every step, and nothing you send reaches a real project.";

/** The light strip under the full two-line bar. */
export const STRIP = {
  noMoneyHere: "No money moves through this site yet.",
  maEarthEitherWay: "Gifts through Ma Earth go to the project either way.",
  stewardsAnswer: "Stewards are asked to answer every offer and post what happens.",
};

export const PAGE = {
  liveCampaign: "Live campaign",
  pooledSoFar: "Pooled so far",
  somethingElse: "Something else to offer?",
  offerSomethingElse: "Offer something else",
  tryFillingNeed: "Try filling a need",
  tryFillingIntro: "Pick a need to see which form of capital it fills. Nothing is sent until you choose to.",
  needsHeading: "What this project needs",
  needsIntro: "Grouped by the form of capital each one feeds. Pick one and the project's stewards answer you.",
  whatHasHappened: "What has happened",
  whatHasHappenedEmpty: "Nothing has happened here yet. Accepted offers, deliveries and updates show up here.",
  seeEverything: (n: number) => `See everything (${n})`,
  otherCampaignsFrom: (project: string) => `Other campaigns from ${project}`,
  moreCampaigns: "More campaigns",
  campaignNotFound: "We couldn't find that campaign.",
  browseLiveCampaigns: "Browse live campaigns",
  filled: "Filled",
} as const;

/** "What can you bring?" (section 8.3). */
export const BRING = {
  heading: "What can you bring?",
  money: "Money",
  showing: (shown: number, total: number) => `Showing ${shown} of ${total} needs.`,
  showAll: "Show all",
} as const;

// ── Money routes and the money block (section 7) ────────────────────────────

/** The label a route gets when a steward adds it. */
export const ROUTE_LABELS = {
  maearth: "Give through Ma Earth",
  gosteward: "Lend through Steward",
} as const;

/** Who holds the money on each route. */
export const HOLDER_LINE = {
  maearth: "Ma Earth holds this money and pays the project. It never passes through ReGen Civics. You finish on their site.",
  gosteward: "Steward holds this money and pays the project. It never passes through ReGen Civics. You finish on their site.",
};

/** The partner's name as it reads inside a sentence. */
export const PARTNER_NAMES: Record<string, string> = {
  maearth: "Ma Earth",
  gosteward: "Steward",
  grant: "a grant",
  other: "another route",
};

export const MONEY_BLOCK = {
  title: "Putting money in",
  introWithRoutes:
    "Most of what this project needs is listed above. If you'd like to put money in, these are the routes it holds. The ReGen Civics team checked each one.",
  asksNone: "This project asks for no money. Its needs above are where you can help.",
  noRoute: "This project has no money route yet. Its needs above are open to you.",
  maearth: {
    title: "Give through Ma Earth",
    body: "Ma Earth pools gifts and can match them with grant money, so a small gift grows.",
    button: "Give on Ma Earth",
    raised: (amount: string) => `${amount} given so far`,
  },
  gosteward: {
    title: "Lend through Steward",
    body: "Steward arranges loans that the project pays back with interest.",
    button: "Lend through Steward",
    raised: (amount: string) => `${amount} lent so far`,
  },
  asOf: (date: string) => `as of ${date}`,
  exampleRoute: "Example route",
  exampleFigures: "Example figures",
  notAdded: (amount: string, currency: string, partner: string) =>
    `${amount} ${currency} through ${partner} is shown on its own, in its own currency.`,
} as const;

// ── The whole-ask sheet (section 5) ─────────────────────────────────────────

export const WHOLE_ASK_SHEET = {
  title: "The whole ask, in nine forms of capital",
  description: (asked: string, confirmed: string) => `${asked} asked. ${confirmed} confirmed so far.`,
  hint: "See all nine forms of capital",
  /** Appended to the in-kind line to name the button. */
  triggerSuffix: ". See the whole ask by form of capital.",
  rowLabel: (capitalLabel: string) => `${capitalLabel} capital`,
  asked: (amount: string) => `Asked ${amount}`,
  confirmed: (amount: string) => `Confirmed ${amount}`,
  delivered: (amount: string) => `Delivered ${amount}`,
  nothingAsked: "Nothing asked in this form.",
  otherOffers: (amount: string) => `Plus ${amount} in other offers the stewards accepted.`,
  seeNeeds: "See these needs",
  seeMoney: "See ways to put money in",
  footer: "Values are each project's own estimates. Confirmed means the project's stewards accepted it.",
} as const;

// ── The offer sheet's receipt (section 10.4) ────────────────────────────────

export const RECEIPT = {
  answerSignedOut: (email: string) => `The stewards will answer you. We'll email you at ${email} when they do.`,
  answerSignedIn: "The stewards will answer you in your notifications and by email.",
  countsOnceAccepted: "An offer counts toward the campaign once the stewards accept it.",
  shareNeed: "Share this need",
  follow: (project: string) => `Follow ${project}`,
  close: "Close",
} as const;

/** The freeform type picker (section 10.4). The Crypto option is gone. */
export const OFFER_TYPES = {
  description: "What would you like to offer?",
  land: "Land",
  equipment: "A tool or piece of equipment",
  role: "Time or a skill",
  resource: "Materials or supplies",
  knowledge: "A knowledge session",
} as const;

// ── How it works (gallery) ──────────────────────────────────────────────────

export const HOW_IT_WORKS = [
  { title: "Pick a need", body: "Pick a need and offer it. The project's stewards answer you." },
  {
    title: "It counts once accepted",
    // banned-terms-allow: "no claim about value" is the token disclaimer, not the claim verb
    body: "An offer counts toward the campaign once the stewards accept it. It earns the project's token as you deliver it. The token tracks what you pooled and makes no claim about value.",
  },
  { title: "Both halves, by the close date", body: "A campaign is complete when both halves are confirmed by the close date." },
];

// ── The Needs tab (section 9) ───────────────────────────────────────────────

export const NEEDS_TAB = {
  heading: "Every open need, across every campaign",
  intro: "Needs no one has offered on yet come first. Pick one and it takes you to the project.",
  chips: {
    things: "Things",
    time: "Time",
    role: "A role",
    knowhow: "Know-how",
    money: "Money",
    land: "On the land",
    remote: "Remote",
  },
  placeCaption: "Needs that don't say where they happen are left out.",
  searchLabel: "Search needs",
  searchPlaceholder: "Search needs, like truck or cook",
  noOffersYet: "No one has offered yet",
  moneyHeading: "Ways to put money in",
  noRoutes: "No project has a money route yet.",
  examplesHeading: "Example needs",
  examplesCaption: "From example campaigns. Nothing sent on them reaches a real project.",
  emptyFiltered:
    "Nothing open matches that right now. Clear a filter, or add up what you can bring in the Crowd Pooling Tool.",
  clearFilters: "Clear filters",
  openTool: "Open the Crowd Pooling Tool",
  onlyExamples: "These are example campaigns. Real needs open when Season 2 starts crowdpooling.",
  nothingAtAll: "No campaigns are open yet. Real needs open when Season 2 starts crowdpooling.",
  addUp: "Add up what you can bring",
} as const;
