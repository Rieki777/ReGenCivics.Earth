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
  /** The strip's fourth row while a campaign is live, examples included (ruling 2026-09-27, question 1). */
  ifNotComplete:
    "If it doesn't complete, help already given stays recorded in the project's token, lent things go home on the agreed date or sooner if you ask, and offers that haven't started are released with our thanks.",
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
  /** An example campaign's routes were never checked, so the intro says what they are. */
  introExample:
    "These are example routes. On a real campaign, the ReGen Civics team checks each one before it shows here.",
  /** While the routes load, so the block never says "no money route" on a page that has one. */
  loading: "Loading the ways to put money in.",
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
  // Added by lane 5 where the spec was silent.
  /** Live real campaigns exist, and every one of their needs is filled. */
  allFilled: "Every need on the live campaigns is filled right now.",
  loading: "Gathering every open need...",
  placeRemote: "Remote",
  placeEither: "On the land or remote",
  exampleRoute: "Example route",
  exampleTag: "Example",
  routeRow: (project: string, label: string) => `${project}: ${label}`,
  verbLabel: (verb: string, title: string) => `${verb}: ${title}`,
} as const;

// ── The campaign gallery (/campaigns, lane 5) ───────────────────────────────

export const GALLERY = {
  tabs: {
    active: (n: number) => `Active (${n})`,
    needs: (n: number) => `Needs (${n})`,
    upcoming: "Upcoming: Season Applications Open",
    complete: (n: number) => `Complete (${n})`,
  },
  stillOpen: "Still open",
  seeProject: "See the project",
  contributors: (n: number) => (Number(n) === 1 ? "1 contributor" : `${n} contributors`),
  share: "Share",
  shareTitle: (name: string) => `Share ${name}`,
  shareLabel: (name: string) => `Share ${name}`,
  shareOnX: "Share on X",
  shareOnWhatsApp: "Share on WhatsApp",
  copyLink: "Copy link",
  linkCopied: "Link copied",
  sortLabel: "Sort campaigns",
  sort: {
    needsHand: "Needs a hand",
    newest: "Newest",
    closingSoonest: "Closing soonest",
    closestToComplete: "Closest to complete",
  },
  examplesHeading: "Example campaigns",
  examplesCaption: "These show how a campaign works. Nothing sent on them reaches a real project.",
  impactHeading: "Combined impact across live campaigns",
  impact: { campaigns: "live campaigns", needsMet: "needs met", places: "places" },
  noCampaigns: "No campaigns yet.",
  firstSeason: "The first season opens late 2026 / early 2027.",
  noMatch: "No campaigns match your filters.",
  noneComplete: "No campaign is complete yet.",
  clearFilters: "Clear filters",
  howItWorks: "How crowd pooling works",
  watchVideo: "Watch: What is crowd pooling?",
} as const;

// ── Creator, steward and admin surfaces (section 14.1, lane 4) ──────────────
// These show to a project's stewards and the ReGen Civics review team, never
// to contributors. The money-share note itself is built from numbers in
// shared/campaignProgress.ts (moneyShareNote) and never blocks anything.

/** The campaign wizard's Money step. */
export const MONEY_STEP = {
  stepLabel: "Money",
  heading: "Money this project needs",
  intro:
    "Most of what a land project needs isn't money. Campaigns usually ask for 10 to 30 percent of their whole ask in money, and some ask for none.",
  asksMoney: "This project asks for money",
  asksNone: "This project asks for no money",
  chooseOne: "Choose one to continue.",
  howMuch: (currency: string) => `How much money, in ${currency}?`,
  addAmount: "Add how much money this project asks for.",
  suggestion: (pct: string, amount: string) => `${pct} percent of your whole ask would be ${amount}.`,
  useAmount: (amount: string) => `Use ${amount}`,
  sliderLabel: "Money as a share of the whole ask",
  inKindAsk: (amount: string) => `In-kind ask: ${amount}`,
  moneyLine: (amount: string, pct: string) => `Money: ${amount} (${pct}% of the whole ask)`,
  whereHeading: "Where can people put money in?",
  maEarthField: "Your project's page on Ma Earth",
  stewardField: "Your project's page on Steward",
  routesHelper:
    "The ReGen Civics team checks each link before it shows on your campaign. The money goes straight to your project and never passes through ReGen Civics.",
  notANeed:
    "Money isn't added as a need. Set the money this project asks for, and add the routes it holds, in the Money step.",
  summaryInKind: "In-kind ask",
  /** Shown once on the project page the wizard sends a new campaign's steward to. */
  created: "Campaign created. The ReGen Civics team reviews it before it goes live.",
} as const;

/** The money route quiz (EligibilityQuiz), in the wizard and the steward's Money routes card. */
export const ROUTE_QUIZ = {
  title: "Which money route fits this project?",
  intro: "Three quick questions. The answer picks a route below. You can add both.",
  sizeUnder: (symbol: string) => `Under ${symbol}100,000`,
  sizeOver: (symbol: string) => `${symbol}100,000 or more`,
  resultFooter: "Add that route below.",
  startOver: "Start over",
} as const;

/** When a need is wanted, how a thing may come, and where work happens (section 14.1). */
export const NEED_FORM = {
  whenAndHow: "When and how",
  whenAndWhere: "When and where",
  neededFrom: "Needed from (optional)",
  neededUntil: "Needed until (optional)",
  howTake: "How would you take it?",
  asGift: "As a gift",
  onLoan: "On loan",
  chooseMode: "Choose at least one: as a gift or on loan.",
  endsBeforeStart: "A need can't end before it starts.",
  startsOn: "Starts on (optional)",
  startsOnHelper: "With a start date, the role card shows when it ends and the hours in all.",
  whereDone: "Where is this done?",
  onTheLand: "On the land",
  remote: "Remote",
  either: "Either",
} as const;

/** The steward's Money routes card (client/src/components/project/MoneyRoutesCard.tsx). */
export const MONEY_ROUTES_CARD = {
  title: "Money routes",
  intro:
    "The routes people use to put money into this project. The ReGen Civics team checks each one before it shows on your page.",
  none: "No routes yet.",
  status: {
    pending: "Waiting for the ReGen Civics team to check it.",
    verified: "Checked. It shows on your page.",
    rejected: (note: string) => (note ? `Not shown. ${note}` : "Not shown."),
    example: "Example route. It never links out.",
  },
  remove: "Remove",
  removed: "Route removed.",
  partnerLabel: "Kind of route",
  partnerOptions: { maearth: "Ma Earth (gifts)", gosteward: "Steward (loans)" },
  urlLabel: "Link to your project's page",
  proofLabel: "A link that shows this page is yours (optional)",
  proofHelper: "For example, your project's own website linking to it.",
  send: "Send for checking",
  sent: "Sent. The ReGen Civics team will check it.",
  loanRoutesWait:
    "Steward routes wait until loans can show to every visitor. You can add yours now and it stays waiting.",
  notSure: "Not sure which fits?",
  exampleCampaign: "Example campaigns keep their example routes.",
  closedCampaign: "This campaign is closed, so it takes no new routes.",
} as const;

/** The review team's check of a campaign's money routes (AdminCampaignApproval). */
export const ROUTE_REVIEW = {
  heading: "Money routes to check",
  intro: "Open each link and check it is this project's own page. Only verified routes show on the project page.",
  none: "This campaign has no money routes.",
  proof: "Link the project gave to show the page is theirs",
  added: (date: string) => `Added ${date}`,
  currencyLabel: "Currency of the numbers on that page",
  noteLabel: "Why (the project sees this)",
  verify: "Verify",
  dontShow: "Don't show",
  verifiedDone: "Verified. It shows on the project page.",
  rejectedDone: "Hidden. The project sees your note.",
  status: {
    pending: "Waiting for a check.",
    verified: "Verified. It shows on the project page.",
    rejected: "Not shown.",
    example: "Example route. It never links out.",
  },
  loanRailOff: "Loan routes can't be verified until the loan route switch is on.",
} as const;

/** Ready to crowdpool ticks stored on a campaign (section 12). */
export const READINESS_STORED = {
  hint: "Your ticks are saved on this campaign. The review team sees them.",
  saveFailed: "Couldn't save that tick. Try again.",
  projectTicked: (date: string) => `The project ticked this on ${date}.`,
  projectTickedNoDate: "The project ticked this.",
  notTicked: "Not ticked by the project.",
} as const;

/** Give or lend on a steward's offer card, and the Returned stamp (section 6.4). */
export const LOAN_ROW = {
  gift: "Gift",
  loan: (from: string, until: string) => (from ? `Loan: ${from} to ${until}` : `Loan: until ${until}`),
  condition: (terms: string) => `Condition: ${terms}`,
  returnedButton: "Returned",
  returnedOn: (date: string) => `Returned ${date}`,
  dialogTitle: "Mark returned",
  dialogButton: "Mark returned",
  done: "Marked returned.",
} as const;

/** The money half as a steward or the review team reads it. */
export const STEWARD_MONEY = {
  inKindAsked: "In-kind asked",
  moneyAsked: "Money asked",
  landValue: "Land value",
  duration: "Duration",
  days: (n: string) => `${n} days`,
} as const;

// ═══ Build 3 (build spec 2026-09-27, section 15) ═══════════════════════════
// Rye's rulings of 2026-09-27: no need at 0, the binding close date, nudges,
// the status link, the arrival note, Follow, "Needed to start" and the
// default opening day. Where these mention tokens they say help "stays
// recorded" in the project's token, never that tokens are earned for hours.

/** No need at 0 (ruling 2026-09-27). The rule is isListableValue in shared/needRules.ts. */
export const ZERO_VALUE = {
  field: "Add what this need is worth. A need can't be listed at 0.",
  server: (title: string) => `"${title}" is listed at 0. Give it a value above 0 so it counts toward the whole ask.`,
  review: (n: number) =>
    Number(n) === 1
      ? "1 need is listed at 0. Ask the project to give it a value."
      : `${n} needs are listed at 0. Ask the project to give each one a value.`,
  /** The value field a listed need at 0 opens on its row in the wizard (lane 2 addition). */
  valueLabel: (currencySymbol: string) => `What it's worth (${currencySymbol})`,
} as const;

/** The nine-month cap on new campaigns (ruling 2026-09-04, enforced from 2026-09-27). */
export const DURATION = {
  intro: "How long should your campaign run? Up to nine months, 273 days.",
  tooLong: "A campaign runs nine months at most, 273 days.",
} as const;

/** The wizard's day field and the end of its range (lane 2 additions beside DURATION). */
export const DURATION_FIELD = {
  daysLabel: "Days the campaign runs",
  rangeEnd: "9 months",
} as const;

/** One need on another project, offered when a campaign closes, an offer is declined or a place is released. */
export type OtherNeedLine = { verb: string; title: string; projectName: string };

/**
 * The close date (sections 9.1, 9.3, 9.4, 9.7). The per-person lines are put
 * together by closeLinesFor in shared/campaignClose.ts.
 */
export const CLOSE = {
  /** Under the completion line on a campaign that closed without completing. */
  afterLine:
    "Help already given stays recorded in the project's token. Lent things go home on the agreed date, or sooner if you ask. Offers that hadn't started were released with our thanks.",
  completion: (date: string) => `Crowdpooling closed on ${date}. It didn't complete.`,
  completionNoDate: "Crowdpooling closed. It didn't complete.",
  stateTag: "Didn't complete",
  timeline: "Crowdpooling closed. It didn't complete.",
  lines: {
    releasedAtClose: (title: string) => `Your offer of "${title}" hadn't started, so it's released with our thanks.`,
    waitingClosed: (title: string) => `Your offer of "${title}" was still waiting, so it's closed with our thanks.`,
    lendHome: (title: string, until: string) => `Your ${title} goes home on ${until}, or sooner if you ask the stewards.`,
    lendHomeNoDate: (title: string) => `Your ${title} goes home when you and the stewards agree, or sooner if you ask.`,
    placeStays: (title: string) => `Your place in ${title} stays with the stewards, who will mark it delivered or release it.`,
    givenRecorded: (title: string, project: string) => `What you gave for "${title}" stays recorded in ${project}'s token.`,
    more: (n: number) =>
      Number(n) === 1
        ? "And 1 more offer is on your contributions page."
        : `And ${n} more offers are on your contributions page.`,
  },
  /** Up to two other open needs. With none, use followInstead. */
  otherNeeds: (list: OtherNeedLine[]) =>
    `These could use you now: ${list.map((n) => `${n.verb} ${n.title} at ${n.projectName}`).join("; ")}.`,
  followInstead: (project: string) => `Follow ${project} to hear when it asks again.`,
} as const;

/** The private status link for people who offered without an account (section 10). */
export const LINK = {
  receiptLead: "Keep this link to check or change your offer.",
  receiptOpen: "Check or change this offer",
  copy: "Copy link",
  copied: "Link copied",
  receiptHelp:
    "You can withdraw it with this link until the stewards accept it. The link works for 180 days, and each email from the stewards brings a fresh one.",
  title: (project: string) => `Your offer to ${project}`,
  forCampaign: (offerTitle: string, campaignTitle: string) => `${offerTitle}, for ${campaignTitle}`,
  seeProject: "See the project",
  stewardNote: "A note from the stewards",
  othersHeading: "These could use you now",
  withdraw: "Withdraw this offer",
  withdrawTitle: "Withdraw this offer?",
  withdrawBody: "The stewards see that you withdrew it. You can offer again any time the campaign is open.",
  withdrawConfirm: "Withdraw",
  withdrawKeep: "Keep it",
  withdrawn: "You withdrew this offer.",
  replyLabel: "Send the stewards a note",
  replyHelp: "Up to 1,000 characters. They see it with your offer.",
  replySend: "Send note",
  replySent: "Sent. The stewards see it with your offer.",
  replyLimit: "You've sent a few notes today. The stewards will see them, and you can send more tomorrow.",
  linked: "This offer is on your account now. Sign in to see it with the rest of your contributions.",
  linkedAction: "This offer is on your account now. Sign in to change it.",
  signIn: "Sign in",
  makeAccountLead: "Make a free account with the email you used, and this offer joins Your contributions.",
  makeAccount: "Make my account",
  /** The NOT_FOUND message for a wrong, unknown or expired link: one answer for all three. */
  bad: "This link has expired or isn't right.",
  badTitle: "This link has expired or isn't right",
  badBody:
    "Each email from the stewards brings a fresh link. You can also make an account with the email you used to see every offer you've made.",
  notPendingHere: "The stewards already answered this offer, so it can't be withdrawn here.",
  // Lane 4 additions: the page's own small words and the reply refusals.
  loading: "Opening your offer...",
  loadFailed: "We couldn't open this offer just now. Try again in a moment.",
  tryAgain: "Try again",
  seeLive: "See live campaigns",
  otherNeed: (verb: string, title: string, project: string) => `${verb} ${title} at ${project}`,
  stepsHeading: "Where it stands",
  stepDone: "Done",
  stepNow: "Now",
  lending: (from: string, until: string) => `Lending ${from} to ${until}`,
  lendingUntil: (until: string) => `Lending until ${until}`,
  expiresOn: (date: string) => `This link works until ${date}. Each email from the stewards brings a fresh one.`,
  replyEmpty: "Write a note before sending it.",
  replyWithdrawn: "You withdrew this offer, so notes can't be sent from here.",
  replyExample: "Example campaigns keep their example records.",
  replyFailed: "That note didn't send. Try again in a moment.",
  withdrawFailed: "That didn't go through. Try again in a moment.",
} as const;

/** The step line for one offer (section 10.3). offerSteps in shared/offerStatus.ts puts it together. */
export const OFFER_STEPS = {
  steps: {
    sent: "Sent",
    reviewing: "Stewards reviewing",
    accepted: "Accepted",
    acceptedHours: (h: number) => (Number(h) === 1 ? "Accepted for 1 hour a week" : `Accepted for ${h} hours a week`),
    underway: "Underway",
    lent: "Lent",
    delivered: "Delivered",
    thanked: "Thanked",
  },
  endings: {
    rejected: "Not this time",
    withdrawn: "You withdrew",
    campaignCancelled: "Campaign cancelled",
    closedWithCampaign: "Closed when the campaign closed",
    releasedAtClose: "Released with thanks when the campaign closed",
    released: "Released by the stewards",
    expired: "The place closed",
    returned: "Returned to you",
  },
  stepLine: {
    pending: "Waiting on the stewards. You can withdraw it until they accept it.",
    accepted: "Accepted. The stewards will be in touch about the details.",
    fulfilled: "Delivered. Thank you.",
    thanked: "Delivered and thanked.",
  },
} as const;

/** The arrival note (section 11): the steward's card and the contributor's view. */
export const ARRIVAL = {
  title: "Arrival note",
  intro:
    "What someone needs to know once you accept them. Only people whose offer you accepted see it: in their contributions, on their offer link and in the acceptance email.",
  whoFor: "Who it's for",
  everyone: "Everyone you accept",
  onlyFor: (needTitle: string) => `Only people accepted for ${needTitle}`,
  needHelp: "Anything you leave blank here comes from the note for everyone.",
  /** Field labels on the steward's card. */
  fields: {
    whereToGo: "Where to go",
    whatToBring: "What to bring",
    askFor: "Who to ask for",
    meals: "Meals",
    beds: "Beds",
    gettingThere: "Parking or transit",
  },
  placeholderWhere: "Address or meeting point",
  save: "Save arrival note",
  saved: "Arrival note saved.",
  clear: "Clear this note",
  empty: "Add at least one line before saving.",
  exampleOnly: "Example campaigns keep their example records.",
  closedCampaign: "This campaign is closed, so its notes stay as they are.",
  /** What the contributor sees. */
  viewHeading: "Before you arrive",
  viewLabels: {
    whereToGo: "Where to go",
    whatToBring: "What to bring",
    askFor: "Ask for",
    meals: "Meals",
    beds: "Beds",
    gettingThere: "Getting there",
  },
  needsYou: (title: string) => `Needs you: read the arrival note for ${title}`,
  noticeLine: "The stewards left an arrival note for you in Your contributions.",
  // Lane 4 additions: the steward's card and the contributor's toggle.
  cleared: "Arrival note cleared.",
  saveFailed: "Couldn't save that. Try again.",
  loading: "Loading the note...",
  count: (n: number, max: number) => `${n} of ${max} characters`,
  show: "Read the arrival note",
  hide: "Hide the arrival note",
} as const;

/** Withdraw in Your contributions (build spec 2026-09-27, section 10.6). The dialog reuses LINK's words. */
export const YOUR_OFFERS = {
  withdraw: "Withdraw",
  withdrawLabel: (title: string) => `Withdraw your offer of ${title}`,
} as const;

/** Notes people sent the stewards from their offer link, as the stewards see them. */
export const OFFER_NOTES = {
  heading: "Notes from their offer link",
  row: (n: number) =>
    Number(n) === 1
      ? "1 offer has a note from the person who offered. Read it with the offer."
      : `${n} offers have notes from the people who offered. Read them with each offer.`,
} as const;

/** One Follow control (section 12.5). A follow is on the project, so it lasts across seasons. */
export const FOLLOW = {
  follow: "Follow",
  following: "Following",
  followProject: (project: string) => `Follow ${project}`,
  emailIntro: (project: string) =>
    `Get news from ${project} by email. News comes in the season letters from the ReGen Civics team, and a free account brings it to your notifications too.`,
  emailLabel: "Your email",
  emailSubmit: "Send me news",
  emailDone: (project: string) => `You're on the list for news from ${project}.`,
  invalidEmail: "Enter a valid email address.",
  error: "Couldn't save that. Try again.",
  seasonHeading: "Hear when crowdpooling opens",
  seasonBody: "Leave your email and we'll write when real campaigns open.",
  seasonSignedIn: "Tell me when it opens",
  seasonSubmit: "Tell me",
  seasonDone: "You're on the list. We'll write when real campaigns open.",
  practiceHeading: "Want to hear when real campaigns open?",
  bannerButton: "Hear when it opens",
  exampleRefused: "Example projects can't be followed. You can hear when real campaigns open instead.",
  // Lane 5 additions: the receipt button once pressed, and the season body
  // for someone signed in, who gives no email because we have theirs.
  followingProject: (project: string) => `Following ${project}`,
  seasonBodySignedIn: (email: string) => `We'll write to ${email} when real campaigns open.`,
} as const;

/** "Needed to start", a steward-only mark on needs (section 13). */
export const NEED_MARKER = {
  intro: "Mark the needs your project can't begin without. Only your stewards see this mark.",
  label: "Needed to start",
  statsLine: (met: number, n: number) => `Needed to start: ${met} of ${n} met.`,
  moneyRefused: "Money isn't a need, so it can't be marked.",
  saveFailed: "Couldn't save that. Try again.",
  /** Refusals from campaigns.setNeededToStart (lane 2 additions). */
  stewardsOnly: "Only this project's stewards can mark its needs.",
  exampleRefused: "Example campaigns keep their example records.",
  closedRefused: "This campaign is closed, so its marks stay as they are.",
  /** The chip on a marked need in the steward's needs list. */
  chip: "Needed to start",
} as const;

/**
 * The default opening day and "What we look for" on /campaigns (section 14).
 * Both are defaults: each project can choose its own day (ruling 2026-09-24).
 * The day comes from defaultCrowdpoolOpening in shared/crowdpoolCalendar.ts.
 */
export const SEASON_DEFAULTS = {
  upcoming: (date: string, seasonNumber: number) =>
    `Default opening day: ${date}. Season ${seasonNumber} crowdpooling opens together at the December solstice, when the Resource Season opens on the Year wheel. Each project can choose its own day.`,
  open: (date: string, seasonNumber: number) =>
    `Season ${seasonNumber} crowdpooling opened on ${date}, the default opening day on the Year wheel. Each project can choose its own day.`,
  lookForLead: "What we look for, by default: ",
  lookForLink: "the Ready to crowdpool list",
  /** The block's name for screen readers (lane 2 addition). */
  label: "Season defaults",
} as const;

/** The Outbound season digest audience for email-only followers (section 12.4). */
export const OUTBOUND_DIGEST = {
  group: "Season digest",
  choice: (seasonNumber: number, count: number) => `Season ${seasonNumber}: email followers and the waitlist (${count})`,
  exclude: "Leave out people who already offered on a live campaign",
  footer: "You asked for news about crowdpooling on regencivics.earth.",
} as const;
