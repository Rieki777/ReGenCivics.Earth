/**
 * Get your Village OS: the offer, in one place (ADR-69).
 *
 * Rye, 2026-10-02: one front door at /village-os with two ways to start a
 * village on Village OS, plus the paid custom build. The rulings this file
 * carries:
 *   - Run it yourself: free and open source.
 *   - We host it: free for accepted Season 2 projects (applications approved
 *     or active, season 2). We draft a first version of the village from the
 *     project's application, and the founders choose what goes live. Hosting
 *     never depends on giving (`HOSTING_DEPENDS_ON_GIFT`).
 *   - Membership: a recurring gift to CORE, the Church of the Regenerative
 *     Earth, makes someone a member of the church, and members join the weekly
 *     founders circles CORE is starting. The membership sentence and button
 *     stay off until the Legal session rules (`VILLAGE_OS_MEMBERSHIP_URL`
 *     unset). Nothing on the hosting card mentions giving.
 *   - The code link waits for the Village OS repo's security cleanup
 *     (`VILLAGE_OS_SHOW_REPO` unset).
 *
 * Every surface that describes the offer reads its words from here: the
 * /village-os page, the hosting request at /village-os/host, the last stage of
 * every session board, and /custom-games. `shared/villageOsOffer.test.ts`
 * holds the copy to the writing rules and keeps fee words off the free cards.
 *
 * The request form's input schema lives here too, so the page and the router
 * (server/routes/villageOs.ts) validate the same thing.
 */
import { z } from "zod";
import { intakeStatus, type IntakeStatus } from "./applicationWindow";

/** Hosting never depends on giving. A test pins this; changing it is a Legal question first. */
export const HOSTING_DEPENDS_ON_GIFT = false as const;

export const VILLAGE_OS_PATH = "/village-os";
export const VILLAGE_OS_HOST_PATH = "/village-os/host";
export const VILLAGE_OS_REPO_URL = "https://github.com/Rieki777/village-os";
export const AMORA_VILLAGE_URL = "https://amora.regencivics.earth";
/** Amora's circles map, the page "Open the map" links to. */
export const AMORA_CIRCLES_URL = `${AMORA_VILLAGE_URL}/map/circles`;
/**
 * Amora's map-only, public view of its circles, which the Week 2 board frames
 * once Amora lets us. The full page opens on Amora's header and search, and
 * would run in the viewer's own Amora session (an admin's view on a stream).
 */
export const AMORA_CIRCLES_EMBED_URL = `${AMORA_VILLAGE_URL}/embed/circles`;
export const CORE_SITE_URL = "https://core.regencivics.earth";

/** Hosting this season is for accepted Season 2 projects (Rye, 2026-10-02). */
export const HOSTING_SEASON = 2;
export const ACCEPTED_APPLICATION_STATUSES = ["approved", "active"] as const;

export function isAcceptedForHosting(app: { status: string | null | undefined; season: number | null | undefined }): boolean {
  return (
    app.season === HOSTING_SEASON &&
    (ACCEPTED_APPLICATION_STATUSES as readonly string[]).includes(app.status ?? "")
  );
}

/* ------------------------------------------------------------------- copy */

export type OfferCard = {
  key: "self" | "hosted" | "custom";
  kicker: string;
  title: string;
  tag: string;
  lines: string[];
};

export const VILLAGE_OS_OFFER = {
  title: "Get your Village OS",
  lede:
    "Village OS is where a village's Game runs: its circles and roles, its quests, its gratitude and its Game Guide. Amora runs on it today. There are two ways to start yours.",
  amoraLine: "See a village running on it at amora.regencivics.earth.",

  self: {
    key: "self",
    kicker: "Option 1",
    title: "Run it yourself",
    tag: "Free and open source",
    lines: [
      "Village OS is free and open source. Host it on your own server, choose your settings and modules, and change any part of the code.",
      "Give the setup guide to your own AI assistant and it walks you through each step. If you're technical, follow it yourself.",
      "The software is free. You pay your own hosting provider, and setup needs a computer.",
      "New modules you offer back to the shared Module Library get reviewed and can reach every village.",
    ],
  } satisfies OfferCard,
  selfButton: "See the code",
  selfPending: "The code link and the setup guide open with the next Village OS release.",

  hosted: {
    key: "hosted",
    kicker: "Option 2",
    title: "We host it for you",
    tag: "Free for accepted Season 2 projects",
    lines: [
      "The ReGen Civics team runs your village at its own web address and keeps it updated.",
      "We draft a first version of your village from your Season 2 application. You review it and choose what goes live.",
      "Your village's data stays yours. Ask any time and we export it and help you move to your own server.",
      "Hosting is free and never depends on giving.",
    ],
  } satisfies OfferCard,
  hostedButton: "Ask us to host your village",

  custom: {
    key: "custom",
    kicker: "Or",
    title: "A custom build with our team",
    tag: "A paid build",
    lines: [
      "For a project that wants its Game designed and built with the core team over a season.",
      "It is a $20,000 build, paid in milestones. You own the result completely.",
    ],
  } satisfies OfferCard,
  customButton: "See custom builds",

  circle: {
    kicker: "The founders circle",
    title: "Weekly support from CORE",
    /**
     * lines[1] is the membership sentence. /village-os shows it only once
     * VILLAGE_OS_MEMBERSHIP_URL is set, after the Legal session rules on it.
     */
    lines: [
      "The Church of the Regenerative Earth (CORE) is starting a small weekly circle for founders doing this work: a place to be met, to share what's hard, and to support each other.",
      "Setting up a recurring gift to CORE makes you a member of the church, and members join the founders circles.",
      "Circles offer spiritual and peer support. For medical or mental health care, please see a licensed professional.",
    ],
    button: "Become a member of CORE",
    /** Shown while membership is off. Promises no date and no path through hosting. */
    pending: "More about the founders circles will be here.",
  },

  howHostingWorks: [
    { title: "Ask", body: "Sign in, pick your accepted Season 2 application, and tell us a few things about your village." },
    { title: "We draft", body: "A person on our team reads your request and drafts a first version of your village from your application." },
    { title: "You choose", body: "You review the draft, change what you like, and choose what goes live." },
    { title: "You're live", body: "Your village runs at its own web address. We keep it updated, and you can take it with you any time." },
  ],

  facts: [
    "The software is in English today.",
    "On hosted villages, our team can read the settings and keys a village stores, so we can keep it running.",
    "Hosted villages are kept with Railway in the United States.",
  ],

  thankYou: {
    title: "Thank you. Your request is in.",
    body: "A person from our team reads every request and writes to you with next steps.",
    giftLine:
      "If you'd like to join the founders circles, you can become a member of CORE with a recurring gift. It is separate from your request and changes nothing about it.",
    notNow: "Not now",
  },

  /** The body follows the intake window: see notEligibleCopy below. */
  notEligible: {
    title: "Hosting this season is for accepted Season 2 projects",
    applyButton: "Apply to Season 2",
  },

  /** The last page of every session board (ADR-68, ADR-69). Date-free, so closed boards stay true. */
  board: {
    title: "Get your Village OS",
    lede: "Amora runs its village on Village OS. Your project can too. Pick the way that fits your team.",
    selfLine: "Free and open source. Host it yourself, with your own AI assistant as your guide.",
    hostedLine: "Free for accepted Season 2 projects. We host it and draft your first version with you.",
    link: "regencivics.earth/village-os",
  },
} as const;

/**
 * What /village-os/host tells a signed-in founder with no accepted Season 2
 * project. Season 2 takes rolling applications only until its crowdpooling
 * round opens (intakeStatus in shared/applicationWindow.ts), so the apply
 * sentence and the apply button show only while that window is open. After
 * it closes, a new applicant can no longer become eligible this season, and
 * the copy points to running Village OS yourself.
 */
export function notEligibleCopy(intake: IntakeStatus = intakeStatus()): { title: string; body: string; showApply: boolean } {
  const title = VILLAGE_OS_OFFER.notEligible.title;
  if (intake.rolling && intake.openSeason === HOSTING_SEASON) {
    return {
      title,
      body:
        "Season 2 applications are open and rolling until " +
        intake.closesOn +
        ". Apply, and once your project is accepted you can ask us to host your village. You can also run Village OS yourself today.",
      showApply: true,
    };
  }
  return {
    title,
    body: "Hosting this season is for projects accepted into Season 2. You can run Village OS yourself today.",
    showApply: false,
  };
}

/** Words the free and hosted surfaces never use. The custom card may say it is paid. */
export const OFFER_FORBIDDEN_WORDS = [
  /\bfee(s)?\b/i,
  /\bprice(d|s)?\b/i,
  /\bsubscri(be|ption)/i,
  /\bpay (to|for) host/i,
  /\bunlock/i,
  /\bin exchange for\b/i,
  /\byour gift gets you\b/i,
  /tax[- ]deductible/i,
  /\bcharitable\b/i,
  /\btherapy\b/i,
  /\bcounsel(l)?ing\b/i,
  /\bclinical\b/i,
  /\bconfidential\b/i,
];

/* --------------------------------------------------------------- the form */

const optionalText = (max: number) => z.string().trim().max(max).optional().or(z.literal(""));

/**
 * What the hosting request asks. Bounded well above the stored lengths only
 * where the server trims; consents must be exactly true.
 */
export const hostingRequestInput = z.object({
  applicationId: z.number().int().positive(),
  villageName: z.string().trim().min(2).max(120),
  /** A name for its web address, letters, digits and hyphens. */
  preferredAddress: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/, "Use letters, numbers and hyphens, like riverbend.")
    .optional()
    .or(z.literal("")),
  ownDomain: optionalText(253),
  country: optionalText(80),
  timeZone: optionalText(64),
  language: optionalText(40),
  memberWord: optionalText(40),
  currencyName: optionalText(40),
  tagline: optionalText(160),
  circleInterest: z.boolean().optional(),
  consentDraft: z.literal(true),
  consentHosting: z.literal(true),
});
export type HostingRequestInput = z.infer<typeof hostingRequestInput>;

export const HOSTING_REQUEST_STATUSES = ["requested", "reviewing", "drafting", "live", "declined", "withdrawn"] as const;
export type HostingRequestStatus = (typeof HOSTING_REQUEST_STATUSES)[number];

export const HOSTING_STATUS_LABEL: Record<HostingRequestStatus, string> = {
  requested: "Request received",
  reviewing: "A person is reading it",
  drafting: "Drafting your village",
  live: "Your village is live",
  declined: "Not this season",
  withdrawn: "Withdrawn",
};

export const CONSENT_DRAFT_LINE =
  "Draft my village from my Season 2 application: the project name, place, vision, land, team size, governance, practices and community answers.";
export const CONSENT_HOSTING_LINE =
  "I understand the ReGen Civics team can read the settings and keys my village stores, that its data is kept with Railway in the United States, and that the software is in English today.";

/* ---------------------------------------------------- the first draft */

/** The application fields a first draft may read, and only these (named in the consent line). */
export const DRAFT_FIELDS = [
  "projectName",
  "location",
  "country",
  "vision",
  "landStatus",
  "teamSize",
  "governanceApproach",
  "regenerativePractices",
  "communityEngagement",
  "meetingFrequency",
] as const;
export type DraftField = (typeof DRAFT_FIELDS)[number];

export type VillageSeed = {
  villageName: string | null;
  place: string | null;
  purpose: string | null;
  land: string | null;
  teamSize: string | null;
  governance: string | null;
  practices: string | null;
  community: string | null;
  rhythm: string | null;
  memberWord: string | null;
  currencyName: string | null;
  tagline: string | null;
  /** What the draft still needs a person to fill in. Nothing is invented. */
  gaps: string[];
};

const text = (v: unknown): string | null => {
  if (v == null) return null;
  if (Array.isArray(v)) {
    const parts = v.map((x) => String(x).trim()).filter(Boolean);
    return parts.length ? parts.join(", ") : null;
  }
  const s = String(v).trim();
  return s ? s : null;
};

/**
 * A starting set for a village from its application and its request. Pure:
 * reads only DRAFT_FIELDS plus the request's own words, invents nothing, and
 * lists every gap for the person drafting.
 */
export function applicationToVillageSeed(
  app: Partial<Record<DraftField, unknown>>,
  request: { villageName?: string | null; memberWord?: string | null; currencyName?: string | null; tagline?: string | null } = {},
): VillageSeed {
  const place = [text(app.location), text(app.country)].filter(Boolean).join(", ") || null;
  const seed: VillageSeed = {
    villageName: text(request.villageName) ?? text(app.projectName),
    place,
    purpose: text(app.vision),
    land: text(app.landStatus),
    teamSize: text(app.teamSize),
    governance: text(app.governanceApproach),
    practices: text(app.regenerativePractices),
    community: text(app.communityEngagement),
    rhythm: text(app.meetingFrequency),
    memberWord: text(request.memberWord),
    currencyName: text(request.currencyName),
    tagline: text(request.tagline),
    gaps: [],
  };
  const labels: [keyof VillageSeed, string][] = [
    ["villageName", "the village's name"],
    ["place", "where it is"],
    ["purpose", "what it is for"],
    ["governance", "how it decides"],
    ["memberWord", "what members are called"],
    ["currencyName", "what its gratitude or credits are called"],
    ["tagline", "a one-line welcome"],
  ];
  seed.gaps = labels.filter(([k]) => !seed[k]).map(([, label]) => label);
  return seed;
}
