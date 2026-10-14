/**
 * Harness stories. Each one sets up its canned tRPC data, then renders a real
 * component from client/src. Add a story whenever you touch a screen that is
 * awkward to reach in the running app.
 */
import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { mockData } from "./trpc-stub";
import { PublicationReview, ComposeBox } from "@/components/HarvestCompose";
import { QuestGameIntro } from "@/components/QuestGameIntro";
import { AdminAllianceTab } from "@/components/admin/AdminAllianceTab";
import { InquirySection } from "@/components/admin/AdminInquirySection";
import { AdminEventAnalytics } from "@/components/AdminEventAnalytics";
import { AdminAIAssistant } from "@/components/AdminAIAssistant";
import { AdminBroadcastPanel } from "@/components/AdminBroadcastPanel";
import { EmailDraftAgent } from "@/components/admin/EmailDraftAgent";
import { DictationButton } from "@/components/admin/dictation";
import Seasons from "@/pages/Seasons";
import VillageOs from "@/pages/VillageOs";
import { SeasonWheel } from "@/components/SeasonWheel";
import { SeasonalRhythmSection } from "@/components/SeasonalRhythmSection";
import { CrowdpoolReadiness } from "@/components/CrowdpoolReadiness";
import SessionBoard from "@/pages/SessionBoard";
import AllianceApply from "@/pages/AllianceApply";
import AllianceApplyStatus from "@/pages/AllianceApplyStatus";
import { AdminAllianceApplications } from "@/components/admin/AdminAllianceApplications";
import { AdminToolQueue } from "@/components/admin/AdminToolQueue";
import ToolDetail from "@/pages/ToolDetail";
import ToolsLibrary from "@/pages/ToolsLibrary";
import ApplyStatus from "@/pages/ApplyStatus";
import ToolSubmit from "@/pages/ToolSubmit";
import { Router, Route } from "wouter";
import { memoryLocation } from "wouter/memory-location";
import { defaultBoardState } from "@shared/sessionBoard";
import { EXPORT_COPY, weekHeading } from "@shared/boardEntries";
import { needsSummary, projectCardLines, projectView } from "@shared/humanNeeds";
import { SessionSubmissions } from "@/components/profile/SessionSubmissions";
import { SessionBoardExport } from "@/components/admin/SessionBoardExport";
import { Toaster } from "@/components/ui/sonner";

export type Story = {
  title: string;
  /** Runs before render. Put mockData writes and localStorage setup here. */
  setup?: () => void;
  render: () => ReactNode;
};

/**
 * One publication with every target state worth looking at: a block-level fact
 * flag (approve must be disabled), a clean pass, a published surface asking for
 * its weekly note, and the site surface which takes no first comment.
 */
const REVIEW_FIXTURE = {
  publication: { id: 1, title: "Why we chose a VC structure", status: "draft" },
  targets: [
    {
      id: 1, publicationId: 1, surface: "linkedin", itemId: 11, status: "draft",
      externalUrl: null,
      verificationStatus: "flagged",
      verificationFlags: [
        {
          claim: "RGVoice holders vote on Fund allocations",
          problem: "Token swap. RGVoice governs the Game; Fund governance is RCVoice.",
          severity: "block",
        },
        {
          claim: "Fund I closed at $4M",
          problem: "No figure like this appears in the source material.",
          severity: "warn",
        },
      ],
      firstComment: "Full write-up: https://regencivics.earth/blog/vc-structure",
      weeklyNote: null,
    },
    {
      // Approved, so the un-approve escape hatch shows.
      id: 2, publicationId: 1, surface: "instagram", itemId: 12, status: "approved",
      externalUrl: null,
      verificationStatus: "passed", verificationFlags: [],
      firstComment: null, weeklyNote: null,
    },
    {
      id: 3, publicationId: 1, surface: "facebook", itemId: 13, status: "published",
      externalUrl: "https://facebook.com/regencivics/posts/1",
      verificationStatus: "passed", verificationFlags: [],
      firstComment: null, weeklyNote: null,
    },
    {
      id: 4, publicationId: 1, surface: "site", itemId: 14, status: "draft",
      externalUrl: null,
      verificationStatus: "unverified", verificationFlags: null,
      firstComment: null, weeklyNote: null,
    },
    {
      id: 5, publicationId: 1, surface: "email", itemId: 15, status: "draft",
      externalUrl: null,
      verificationStatus: "unverified", verificationFlags: null,
      firstComment: null, weeklyNote: null,
    },
  ],
  items: [
    { id: 11, status: "ready", body: "We chose a venture structure because legibility moves more capital than purity. Investors read a cap table faster than they read a manifesto." },
    { id: 12, status: "ready", body: "Soil first. Governance second. Everything else follows from those two." },
    { id: 13, status: "ready", body: "Three land projects joined this month. Here is what each one is actually planting." },
    { id: 14, status: "ready", body: "# Why we chose a VC structure\n\nThe short answer is legibility." },
    { id: 15, status: "edited", body: "A note from the land\n\nThree projects joined this month. Here is what each one is planting." },
  ],
  images: [],
  article: null,
};

/**
 * Stand-in for the app's fixed bottom nav. MobileTabBar and SmartBottomNav both
 * need wouter, season tint and tRPC, which the harness has no business booting
 * just to occupy 4rem of screen. What matters for layout is the geometry, so
 * this reproduces it exactly: fixed, full width, h-16, z-50.
 */
function BottomNavStandIn() {
  return (
    <div
      data-standin-nav
      className="fixed bottom-0 left-0 right-0 z-50 h-16 border-t border-[#7dd87d]/20 bg-[#1a472a] flex items-center justify-center text-[11px] text-white/60"
    >
      bottom nav stand-in (h-16, z-50)
    </div>
  );
}

const ALLIANCE_INQUIRIES = [
  {
    id: 1,
    pathType: "alliance",
    fullName: "Rye",
    email: "rieki@pm.me",
    status: "new",
    createdAt: new Date(Date.now() - 208 * 24 * 3_600_000).toISOString(),
    allianceSupportDescription:
      "We help land projects set up governance councils, shared treasuries, and the legal wrappers they need to hold land together.",
    partnershipDescription: "Longer partnership vision that should stay inside the opened row.",
  },
  {
    id: 2,
    pathType: "alliance",
    fullName: "Anonymous",
    email: "partner@example.org",
    status: "new",
    createdAt: new Date(Date.now() - 12 * 24 * 3_600_000).toISOString(),
    partnershipDescription: "We provide sustainable building materials and on-site training for regenerative villages.",
  },
  {
    id: 3,
    pathType: "alliance",
    fullName: "Maya Chen",
    email: "maya@bioregional.coop",
    status: "contacted",
    createdAt: new Date(Date.now() - 6 * 3_600_000).toISOString(),
    allianceSupportCategories: JSON.stringify(["legal", "land_tenure", "governance_consulting"]),
  },
];

function volumeDaysFrom(startIso: string, count: number): string[] {
  const start = Date.parse(`${startIso}T00:00:00.000Z`);
  return Array.from({ length: count }, (_, i) =>
    new Date(start + i * 86_400_000).toISOString().slice(0, 10),
  );
}

/** Approximate the live 30d curve: quiet early August, a late-August bump, taper into September. */
const CURRENT_VOLUME_FIXTURE = volumeDaysFrom("2026-08-07", 28).flatMap((day, i) => {
  const bump = Math.max(0, Math.round(10 * Math.exp(-((i - 18) ** 2) / 32)));
  if (bump === 0) return [];
  const rows: Array<{ day: string; event: string; count: number }> = [
    { day, event: "apply_started", count: Math.max(1, Math.round(bump * 0.4)) },
  ];
  if (i % 3 === 0) rows.push({ day, event: "apply_form_submitted", count: 1 });
  if (i % 4 === 0) rows.push({ day, event: "newsletter_signup", count: 1 });
  if (i % 5 === 0) rows.push({ day, event: "share_clicked", count: 1 });
  if (i >= 12 && i <= 22 && i % 2 === 0) {
    rows.push({ day, event: "apply_step_2", count: 1 });
  }
  return rows;
});

const RICH_VOLUME_FIXTURE = volumeDaysFrom("2026-08-05", 30).flatMap((day, i) => {
  const views = 4 + ((i * 5) % 9);
  const cta = i % 3 === 0 ? 1 : i % 7 === 0 ? 2 : 0;
  const started = i % 4 === 0 ? 1 : 0;
  const submitted = i % 8 === 0 ? 1 : 0;
  const rows: Array<{ day: string; event: string; count: number }> = [
    { day, event: "page_view", count: views },
  ];
  if (cta) rows.push({ day, event: "cta_click", count: cta });
  if (started) rows.push({ day, event: "apply_started", count: started });
  if (submitted) rows.push({ day, event: "apply_form_submitted", count: submitted });
  if (i === 20) rows.push({ day, event: "loi_submitted", count: 1 });
  if (i % 5 === 0) rows.push({ day, event: "newsletter_signup", count: 1 });
  return rows;
});

function BlockedMicStory() {
  const [value, setValue] = useState("");
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    const btn = document.querySelector("[data-testid=dictation-button]") as HTMLButtonElement | null;
    if (!btn) return;
    btn.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
    btn.dispatchEvent(new PointerEvent("pointerup", { bubbles: true }));
  }, []);
  return (
    <div className="relative max-w-md p-16">
      <p className="mb-3 text-sm font-medium text-[#1a472a]">Shared admin mic, Blocked permission</p>
      <textarea
        ref={ref}
        value={value}
        onChange={(event) => setValue(event.target.value)}
        className="mb-2 min-h-[80px] w-full rounded-xl border border-[#1a472a]/25 bg-white p-2 text-sm text-[#1a472a]"
      />
      <DictationButton value={value} onChange={setValue} targetRef={ref} />
    </div>
  );
}

/** An Alliance Partner application at each stage (ADR-72). */
const ALLIANCE_APP = {
  id: 7,
  userId: 1,
  contactEmail: "ana@seedcommons.org",
  contactName: "Ana Ribeiro",
  organizationName: "Seed Commons",
  organizationUrl: "https://seedcommons.org",
  roles: JSON.stringify(["Funding", "Coordination", "Legal"]),
  otherSupport: null,
  scope: "local",
  location: "Oaxaca",
  country: "Mexico",
  latitude: null,
  longitude: null,
  supportDescription: "We run a flow fund and legal clinics for land trusts in two bioregions.",
  partnershipDescription: "A shared treasury template the land projects can adopt.",
  toolRepoUrl: "https://github.com/seedcommons/treasury",
  status: "submitted",
  reviewNote: null,
  sourceInquiryId: null,
  organisationId: null,
  submittedAt: new Date("2026-10-12T18:00:00Z"),
  createdAt: new Date("2026-10-11T18:00:00Z"),
  updatedAt: new Date("2026-10-12T18:00:00Z"),
};

const SIGNED_IN = { id: 1, name: "Ana Ribeiro", email: "ana@seedcommons.org", role: "user" };

/** Two tools an applicant brings: one fine, one still missing its sentence (ADR-73). */
const DRAFT_TOOLS = JSON.stringify([
  { name: "Commons Treasury", url: "https://github.com/seedcommons/treasury", description: "A shared treasury template land projects adopt to pool and steward funds together.", kind: "software", isOpenSource: true },
  { name: "", url: "https://seedcommons.org/press-kit", description: "", kind: "physical", isOpenSource: false },
]);

const LIBRARY_TOOL = {
  id: 4, name: "Commons Treasury", slug: "commons-treasury", websiteUrl: "https://github.com/seedcommons/treasury",
  logoUrl: null, cardImageUrl: null,
  shortSummary: "A shared treasury template land projects adopt to pool and steward funds together.",
  longDescription: "Set up in an afternoon. Works with Hypha and any multisig. Ships with a plain-language agreement template.",
  pricingModel: "open_source", gettingStartedUrl: "https://seedcommons.org/start", isOpenSource: 1, isPhysical: 0, toolKind: "software",
  regions: ["Americas", "Europe"], integrations: null, problemStatements: null, status: "approved", totalClicks: 42, seasonSpotlight: null,
  createdAt: "2026-10-13", updatedAt: "2026-10-13",
  categories: [{ name: "Finance", slug: "finance" }, { name: "Governance", slug: "governance" }],
  partnerName: "Seed Commons", partnerUrl: "https://seedcommons.org", usedByProjects: 3, interopStage: "not_assessed",
  endorsements: [{ id: 1, userName: "Maya", comment: "We moved our land fund onto this in a week.", createdAt: "2026-10-10" }],
};

/* ------------------------------------------------ Week 3 board (2026-10-14) */

/**
 * Week 3's board, mid-session: 47 minutes in, three minutes into the stage the
 * room is on. Rows marked `mine` come back from whoami as this browser's own,
 * so take-back buttons, pressed picks and "Yours" tags show the way they do
 * live. Ids: 1xx this person, 2xx a teammate on the same card, 3xx other projects.
 */
type W3Row = { id: number; block: string | null; text: string; projectId: number | null; kind?: string; chosen?: boolean; mine?: boolean };

function w3Card(id: number, name: string, place: string | null = null, applicationId: number | null = null) {
  return { id, name, place, url: null, phase: null, whereNow: null, ready: [], nextMove: null, shared: false, hidden: false, applicationId, displayName: null };
}

const W3_CARDS = [
  w3Card(5, "Toa Hermitage", "Big Island, Hawai'i", 41),
  w3Card(7, "Amora", "Dominicalito, Costa Rica", 57),
  w3Card(9, "Lupine Hollow", "Willamette Valley, Oregon"),
  w3Card(11, "Riverbend Commons"),
];

const TOA = 5;
const AMORA = 7;
const LUPINE = 9;

/** Human needs picked and seeds planted on stage 6, read again on 7, 9 and 13. */
const W3_NEEDS_ROWS: W3Row[] = [
  { id: 101, block: "needs", text: "love", projectId: TOA, mine: true },
  { id: 102, block: "needs", text: "vitality", projectId: TOA, mine: true },
  { id: 103, block: "needs", text: "growth", projectId: TOA, mine: true },
  { id: 104, block: "needs", text: "play", projectId: TOA, mine: true },
  { id: 105, block: "top", text: "love", projectId: TOA, mine: true },
  { id: 106, block: "top", text: "vitality", projectId: TOA, mine: true },
  { id: 201, block: "needs", text: "love", projectId: TOA },
  { id: 202, block: "needs", text: "autonomy", projectId: TOA },
  { id: 203, block: "top", text: "love", projectId: TOA },
  { id: 301, block: "needs", text: "vitality", projectId: AMORA },
  { id: 302, block: "needs", text: "love", projectId: AMORA },
  { id: 303, block: "needs", text: "significance", projectId: AMORA },
  { id: 304, block: "top", text: "vitality", projectId: AMORA },
  { id: 305, block: "top", text: "love", projectId: AMORA },
  { id: 306, block: "top", text: "contribution", projectId: AMORA },
  { id: 307, block: "needs", text: "routine", projectId: LUPINE },
  { id: 308, block: "needs", text: "love", projectId: LUPINE },
  { id: 309, block: "top", text: "routine", projectId: LUPINE },
];

/** Stage 7's answers: today, the goal and who it's for, per seed. */
const W3_DEPTH_ROWS: W3Row[] = [
  { id: 210, block: "n-love", text: "deprived", projectId: TOA },
  { id: 110, block: "n-love", text: "unmet", projectId: TOA, mine: true },
  { id: 111, block: "g-love", text: "thriving", projectId: TOA, mine: true },
  { id: 112, block: "b-love", text: "100", projectId: TOA, mine: true },
  { id: 113, block: "n-vitality", text: "alive", projectId: TOA, mine: true },
  { id: 114, block: "g-vitality", text: "satisfied", projectId: TOA, mine: true },
  { id: 115, block: "whole", text: "50", projectId: TOA, mine: true },
  { id: 310, block: "n-vitality", text: "unmet", projectId: AMORA },
  { id: 311, block: "g-vitality", text: "thriving", projectId: AMORA },
  { id: 312, block: "n-love", text: "alive", projectId: AMORA },
  { id: 313, block: "g-love", text: "thriving", projectId: AMORA },
  { id: 314, block: "n-routine", text: "satisfied", projectId: LUPINE },
  { id: 315, block: "g-routine", text: "alive", projectId: LUPINE },
];

/** Stage 9's answers: who meets each seed. */
const W3_MEET_ROWS: W3Row[] = [
  { id: 120, block: "m-love", text: "circle", projectId: TOA, mine: true },
  { id: 220, block: "m-love", text: "play", projectId: TOA },
  { id: 320, block: "m-vitality", text: "household", projectId: AMORA },
  { id: 321, block: "m-love", text: "play", projectId: AMORA },
  { id: 322, block: "m-routine", text: "circle", projectId: LUPINE },
  { id: 121, block: "want", text: "Guest stays in the hale. A want, and it pays for the water", projectId: TOA, mine: true },
];

/** The rest of a project's card, so stage 13 reads like a real room. */
const W3_CARD_ROWS: W3Row[] = [
  { id: 130, block: "purpose", text: "twelve families living well on land we heal together", projectId: TOA, mine: true },
  { id: 131, block: "circles", text: "food", projectId: TOA, mine: true },
  { id: 132, block: "circles", text: "water", projectId: TOA, mine: true },
  { id: 133, block: "players", text: "13-30", projectId: TOA, mine: true },
  { id: 134, block: "players-now", text: "6-12", projectId: TOA, mine: true },
  { id: 330, block: "purpose", text: "a village where every child knows the forest by name", projectId: AMORA },
  { id: 331, block: "whole", text: "100", projectId: AMORA },
  { id: 332, block: "circles", text: "love", projectId: AMORA },
  { id: 333, block: "players", text: "31-150", projectId: AMORA },
  { id: 340, block: "purpose", text: "a seed library the whole valley can borrow from", projectId: LUPINE },
  { id: 350, block: "purpose", text: "Everyone here leaves with one friend they didn't have", projectId: null },
];

/** Questions on the wall, from three projects and the room. */
const W3_ASK_ROWS: W3Row[] = [
  { id: 360, kind: "ask", block: "s3", text: "How do we start a game with only four of us on the land?", projectId: AMORA, chosen: true },
  { id: 140, kind: "ask", block: "s3", text: "Can a land trust hold the land and the game both?", projectId: TOA, mine: true },
  { id: 361, kind: "ask", block: "s3", text: "Where do tokens come in, if human needs stay out of markets?", projectId: null },
  { id: 362, kind: "ask", block: "s7", text: "Is the three-year goal for the people living there now, or everyone who might come?", projectId: LUPINE },
];

function week3Board(stage: number, opts: {
  rows?: W3Row[];
  facilitator?: boolean;
  answerCounts?: Record<string, Record<string, number>>;
  anon?: { key: string; option: string }[];
  displayName?: string;
  /** "I'm here to learn today" in place of a project. */
  learn?: boolean;
} = {}) {
  const now = Date.now();
  const state = defaultBoardState(3);
  state.stage = stage;
  state.sessionStartedAt = now - 47 * 60_000;
  state.stageStartedAt = now - 3 * 60_000;
  const rows = opts.rows ?? [];
  const facilitator = !!opts.facilitator;
  mockData["sessionBoard.get"] = {
    week: 3,
    status: "open",
    version: 7,
    serverNow: now,
    state,
    canFacilitate: facilitator,
    notes: [],
    hands: {},
    offers: {},
    answerCounts: opts.answerCounts ?? {},
    checkins: { [TOA]: 2, [AMORA]: 3, [LUPINE]: 1 },
    offerPeople: null,
    projects: W3_CARDS,
    items: rows.map((r, i) => ({
      id: r.id, kind: r.kind ?? "answer", text: r.text, projectId: r.projectId, block: r.block, theme: null,
      chosen: !!r.chosen, votes: 0, roomVotes: 0, fromItemId: null, hidden: false, displayName: null,
      createdAt: new Date(now - (rows.length - i) * 60_000).toISOString(),
    })),
    facilitatorLists: facilitator
      ? {
        register: [],
        applications: [
          { id: 41, projectName: "Toa Hermitage" },
          { id: 57, projectName: "Amora" },
          { id: 63, projectName: "Green Gulch Land Trust" },
        ],
      }
      : null,
  };
  mockData["sessionBoard.version"] = { version: 7, status: "open" };
  if (facilitator) {
    // Facilitators are signed in. No guest rows, so no claim question over the board.
    mockData["auth.me"] = { id: 2, name: "Rye", email: "rye@example.org", role: "admin" };
    mockData["sessionBoard.guestRows.result"] = { rows: 0 };
  }
  mockData["sessionBoard.whoami.result"] = {
    itemIds: rows.filter((r) => r.mine).map((r) => r.id),
    projectIds: [],
    votes: [],
    hands: [],
    offers: [],
    anon: opts.anon ?? [],
    checkins: [TOA],
    canFacilitate: facilitator,
  };
  // Wednesday as it runs: Week 3 started 47 minutes ago, Week 4 is next.
  mockData["seasonSchedule.state"] = {
    sessions: [
      { week: 3, title: null, startTime: new Date(now - 47 * 60_000).toISOString(), endTime: new Date(now + 73 * 60_000).toISOString(), status: "scheduled" },
      { week: 4, title: null, startTime: new Date(now + 7 * 86_400_000).toISOString(), endTime: new Date(now + 7 * 86_400_000 + 120 * 60_000).toISOString(), status: "scheduled" },
    ],
  };
  try {
    localStorage.setItem("session-board:project:3", JSON.stringify(opts.learn ? { learn: true } : { cardId: TOA, name: "Toa Hermitage" }));
    if (opts.displayName) localStorage.setItem("session-board:name", opts.displayName);
  } catch {
    /* the story still renders with no pick kept */
  }
}

/** The page itself at /season2/week/3, so the header, rail and footer are in every Week 3 story. */
function Week3Page() {
  const { hook } = memoryLocation({ path: "/season2/week/3", static: true });
  return (
    <Router hook={hook}>
      <Route path="/season2/week/:week"><SessionBoard /></Route>
    </Router>
  );
}

/** Thirteen tiles from all three sources: this board's cards, Week 2's cards, and applications. */
const W3_TILES = [
  { ref: "p5", name: "Toa Hermitage", place: "Big Island, Hawai'i", cardId: TOA, from: "board", fromWeek: null, here: 2 },
  { ref: "p7", name: "Amora", place: "Dominicalito, Costa Rica", cardId: AMORA, from: "board", fromWeek: null, here: 3 },
  { ref: "p9", name: "Lupine Hollow", place: "Willamette Valley, Oregon", cardId: LUPINE, from: "board", fromWeek: null, here: 1 },
  { ref: "p11", name: "Riverbend Commons", place: null, cardId: 11, from: "board", fromWeek: null, here: 0 },
  { ref: "w2p14", name: "Cedar Spiral", place: "Vancouver Island, Canada", cardId: null, from: "earlier", fromWeek: 2, here: 0 },
  { ref: "w2p15", name: "The Long Field", place: "Devon, England", cardId: null, from: "earlier", fromWeek: 2, here: 0 },
  { ref: "w2p16", name: "Kinship Acres", place: null, cardId: null, from: "earlier", fromWeek: 2, here: 0 },
  { ref: "a63", name: "Green Gulch Land Trust", place: "Marin, California", cardId: null, from: "application", fromWeek: null, here: 0 },
  { ref: "a64", name: "Casa Semilla", place: "Oaxaca, Mexico", cardId: null, from: "application", fromWeek: null, here: 0 },
  { ref: "a65", name: "Sky Meadow Farm", place: "Vermont", cardId: null, from: "application", fromWeek: null, here: 0 },
  { ref: "a66", name: "Mossy Creek Village", place: "Asheville, North Carolina", cardId: null, from: "application", fromWeek: null, here: 0 },
  { ref: "a67", name: "Tierra Viva Regenerative Cooperative of the Southern Highlands", place: "Cusco, Peru", cardId: null, from: "application", fromWeek: null, here: 0 },
  { ref: "a68", name: "Hill Farm", place: "Vermont", cardId: null, from: "application", fromWeek: null, here: 0 },
];

/* ------------------------------------------------ profile: weekly sessions */

const W3_AT = "2026-10-14T18:05:00.000Z";
const W2_AT = "2026-10-07T18:40:00.000Z";

const SUBMISSION_WEEKS = [
  {
    ...weekHeading(2),
    week: 2,
    lastAt: W2_AT,
    projects: [{ cardId: 3, name: "Toa Hermitage", how: "added" }],
    entries: [
      { id: "w2-1", stage: "Drop in", label: "Your arrival word", value: "Grateful", project: null, anonymous: false, at: W2_AT },
      { id: "w2-2", stage: "Project circle", label: "A pain point you named", value: "Nobody owns the water schedule, so it slips every dry season", project: "Toa Hermitage", anonymous: false, at: W2_AT },
      { id: "w2-3", stage: "Project circle", label: "A growth opportunity you named", value: "A shared tool library with the two farms down the road", project: "Toa Hermitage", anonymous: false, at: W2_AT },
      { id: "w2-4", stage: "Harvest", label: "You voted for", value: "A shared tool library with the two farms down the road", project: null, anonymous: false, at: W2_AT },
      { id: "w2-5", stage: null, label: "You raised a hand for", value: "Week 4: Game & Organisation Co-Creation Part 2", project: null, anonymous: false, at: W2_AT },
    ],
  },
  {
    ...weekHeading(3),
    week: 3,
    lastAt: W3_AT,
    projects: [{ cardId: TOA, name: "Toa Hermitage", how: "checked in" }],
    entries: [
      { id: "w3-1", stage: "What you came for", label: "A question you asked", value: "Can a land trust hold the land and the game both?", project: "Toa Hermitage", anonymous: false, at: W3_AT },
      { id: "w3-2", stage: "What you came for", label: "What you wanted to leave with", value: "A first draft of our circles", project: "Toa Hermitage", anonymous: false, at: W3_AT },
      { id: "w3-3", stage: "What it's all for", label: "How well your main organisation meets your human needs", value: "Some", project: null, anonymous: true, at: W3_AT },
      { id: "w3-4", stage: "What it's all for", label: "Your project's first line", value: "twelve families living well on land we heal together", project: "Toa Hermitage", anonymous: false, at: W3_AT },
      { id: "w3-5", stage: "What your project is for", label: "A human need your project is here to meet", value: "Love", project: "Toa Hermitage", anonymous: false, at: W3_AT },
      { id: "w3-6", stage: "What your project is for", label: "A seed you planted", value: "Love", project: "Toa Hermitage", anonymous: false, at: W3_AT },
      { id: "w3-7", stage: "How deep, how wide", label: "Love: where your people are today", value: "Unmet", project: "Toa Hermitage", anonymous: false, at: W3_AT },
      { id: "w3-8", stage: "How deep, how wide", label: "Love: where you want them in three years", value: "Thriving", project: "Toa Hermitage", anonymous: false, at: W3_AT },
      { id: "w3-9", stage: "Tell us", label: "Something that landed for you", value: "Keeping human needs out of markets. I had never put it that plainly.", project: null, anonymous: false, at: W3_AT },
    ],
  },
];

/** The profile page's own ground (PlayerProfile.tsx), around the Submissions tab. */
function ProfileGround({ children }: { children: ReactNode }) {
  return (
    <div className="-mx-6 -mb-6 min-h-screen bg-gradient-to-b from-[#1a472a] via-[#2d5a3d] to-[#1a472a]">
      <div className="mx-auto max-w-4xl px-4 py-8">{children}</div>
    </div>
  );
}

/* ------------------------------------------------ admin: the export */

const EXPORT_ROWS = [...W3_NEEDS_ROWS, ...W3_DEPTH_ROWS, ...W3_MEET_ROWS, ...W3_CARD_ROWS].map((r) => ({
  id: r.id, kind: r.kind ?? "answer", block: r.block, text: r.text, projectId: r.projectId, createdAt: W3_AT,
}));

const EXPORT_FIXTURE = {
  generatedAt: "2026-10-14T19:00:00.000Z",
  why: EXPORT_COPY.why,
  weeks: [
    {
      week: 2, ...weekHeading(2), status: "open",
      projects: [], anonymous: [], votes: [], summary: null, projectViews: [],
      rows: [
        {
          id: 90, kind: "pain", key: null, stage: "Project circle", label: "A pain point you named", value: "Nobody owns the water schedule",
          projectId: null, projectName: null, applicationId: null, displayName: "Rye", author: "signed-in",
          userId: 1, chosen: false, hidden: false, createdAt: W2_AT,
        },
      ],
    },
    {
      week: 3, ...weekHeading(3), status: "open",
      projects: [
        { cardId: TOA, name: "Toa Hermitage", place: "Big Island, Hawai'i", applicationId: 41, applicationName: "Toa Hermitage", applicationStatus: "approved", projectPath: "/project/41-toa-hermitage", adminPath: "/admin?tab=applications&open=41", hidden: false, addedBy: null, checkins: 2 },
        { cardId: AMORA, name: "Amora", place: "Dominicalito, Costa Rica", applicationId: 57, applicationName: "Amora", applicationStatus: "under_review", projectPath: null, adminPath: "/admin?tab=applications&open=57", hidden: false, addedBy: null, checkins: 3 },
        { cardId: LUPINE, name: "Lupine Hollow", place: "Willamette Valley, Oregon", applicationId: null, applicationName: null, applicationStatus: null, projectPath: null, adminPath: null, hidden: false, addedBy: "guest", checkins: 1 },
      ],
      rows: [],
      anonymous: [
        { key: "pulse-a", label: "How it was landing", value: "Clear", createdAt: W3_AT },
        { key: "pulse-a", label: "How it was landing", value: "Clear", createdAt: W3_AT },
        { key: "pulse-a", label: "How it was landing", value: "Too fast", createdAt: W3_AT },
        { key: "pulse-b", label: "How it was landing", value: "Want to go deeper", createdAt: W3_AT },
        { key: "useful", label: "How useful the session was", value: "Very", createdAt: W3_AT },
      ],
      votes: [],
      summary: needsSummary(EXPORT_ROWS),
      projectViews: [TOA, AMORA, LUPINE].map((id) => ({
        cardId: id,
        name: W3_CARDS.find((c) => c.id === id)!.name,
        lines: projectCardLines(projectView(EXPORT_ROWS, id)),
        villageOs: { needs: [] },
      })),
    },
    {
      week: 4, ...weekHeading(4), status: "none",
      projects: [], rows: [], anonymous: [], votes: [], summary: null, projectViews: [],
    },
  ],
};

export const STORIES: Record<string, Story> = {
  /**
   * Meant to fail: one deliberately broken example per check, beside a good
   * one, so a change to harness/audit-checks.mjs can be proven to still bite
   * (CLAUDE.md, UI readability gate, step 3). `pnpm ui:audit` skips it unless
   * named.
   */
  "audit-selftest": {
    title: "Audit self-test: each check's bad example, beside a good one",
    render: () => (
      <div className="space-y-4 bg-white p-6 text-[#1a472a]">
        {/* The site's global focus ring (index.css) covers plain outline-none,
            so the bad examples override it the way a real regression would. */}
        <style>{`
          .audit-no-focus:focus-visible { outline: none !important; box-shadow: none !important; }
          .audit-faint-focus:focus-visible { outline: none !important; box-shadow: 0 0 0 2px #e9f5e9 !important; }
          @keyframes audit-bg-slide { from { background-position: 0% 0; } to { background-position: 100% 0; } }
          .audit-bg-slide { background: linear-gradient(90deg, #ffffff, #c8ecc8); background-size: 200% 100%; animation: audit-bg-slide 4s linear infinite; }
          @keyframes audit-blur-pulse { from { filter: blur(0); } to { filter: blur(2px); } }
          .audit-blur-pulse { animation: audit-blur-pulse 3s ease-in-out infinite alternate; }
        `}</style>
        {/* Endless motion: the two bad ones run on the main thread, the good
            one (opacity on an ordinary element) runs on the compositor. */}
        <svg width="40" height="20" aria-hidden="true">
          <circle cx="10" cy="10" r="6" fill="#1a472a" className="animate-pulse" />
          <circle cx="30" cy="10" r="5" fill="#1a472a">
            <animate attributeName="r" values="4;6;4" dur="2s" repeatCount="indefinite" />
          </circle>
        </svg>
        <p className="audit-bg-slide rounded px-3 py-2">Bad: a background that slides forever</p>
        <span aria-hidden="true" className="audit-blur-pulse inline-block h-3 w-3 rounded-full bg-[#1a472a]" />
        <p className="flex items-center gap-2 px-3 py-2">
          <span aria-hidden="true" className="animate-pulse inline-block h-3 w-3 rounded-full bg-[#1a472a]" />
          Good: an opacity pulse on an ordinary element
        </p>
        <button type="button" className="audit-no-focus min-h-11 rounded border border-[#1a472a] px-4">Bad: no focus style</button>
        <button type="button" className="audit-faint-focus min-h-11 rounded border border-[#1a472a] px-4">Bad: faint focus ring</button>
        <button type="button" className="min-h-11 rounded border border-[#1a472a] px-4 focus-visible:ring-2 focus-visible:ring-[#1a472a]">Good: clear focus ring</button>
        <p>
          Read <a href="#a" className="text-[#2d5a3d] no-underline">the colour-only link</a> in this sentence, and{" "}
          <a href="#b" className="underline">the underlined link</a> too.
        </p>
        <div className="flex gap-2">
          <button type="button" aria-pressed="true" className="min-h-11 rounded border border-[#1a472a] bg-[#1a472a] px-3 text-white focus-visible:ring-2 focus-visible:ring-[#1a472a]">Bad on</button>
          <button type="button" aria-pressed="false" className="min-h-11 rounded border border-[#1a472a] bg-white px-3 text-[#1a472a] focus-visible:ring-2 focus-visible:ring-[#1a472a]">Bad off</button>
        </div>
        <div className="flex gap-2">
          <button type="button" aria-pressed="true" className="min-h-11 rounded border-2 border-[#1a472a] px-3 font-semibold focus-visible:ring-2 focus-visible:ring-[#1a472a]">✓ Good on</button>
          <button type="button" aria-pressed="false" className="min-h-11 rounded border border-[#1a472a] px-3 focus-visible:ring-2 focus-visible:ring-[#1a472a]">Good off</button>
        </div>
      </div>
    ),
  },

  "alliance-apply-form": {
    title: "Become an Alliance Partner: the application form, mid-draft",
    setup: () => {
      mockData["auth.me"] = SIGNED_IN;
      mockData["allianceApplications.mine"] = [{ ...ALLIANCE_APP, status: "draft", submittedAt: null, supportDescription: "We run a flow fund" }];
    },
    render: () => <AllianceApply />,
  },

  "alliance-apply-tools": {
    title: "Alliance form: the Your tools section, after trying to send",
    setup: () => {
      mockData["auth.me"] = SIGNED_IN;
      mockData["allianceApplications.mine"] = [{ ...ALLIANCE_APP, status: "draft", submittedAt: null, tools: DRAFT_TOOLS, libraryTools: [] }];
    },
    render: () => <AllianceApply />,
  },

  "alliance-status-tools": {
    title: "Alliance status: approved, with tools listed and one in review",
    setup: () => {
      mockData["auth.me"] = SIGNED_IN;
      mockData["allianceApplications.mine"] = [{
        ...ALLIANCE_APP, status: "approved",
        libraryTools: [
          { toolId: 4, createdByApplication: true, name: "Commons Treasury", slug: "commons-treasury", websiteUrl: "https://github.com/seedcommons/treasury", shortSummary: null, status: "approved", toolKind: "software" },
          { toolId: 5, createdByApplication: true, name: "Press Kit", slug: "press-kit", websiteUrl: "https://seedcommons.org/press-kit", shortSummary: null, status: "pending", toolKind: "physical" },
        ],
      }];
      mockData["interopSessions.linkMyVote.result"] = { voted: true };
    },
    render: () => <AllianceApplyStatus />,
  },

  "admin-tool-queue": {
    title: "Admin > Alliance: tools waiting for review",
    setup: () => {
      mockData["tools.listPending"] = [
        { id: 5, name: "Press Kit", slug: "press-kit", websiteUrl: "https://seedcommons.org/press-kit", shortSummary: "A printable kit for telling a land project's story at markets and gatherings.", longDescription: null, toolKind: "physical", isOpenSource: 0, contactEmail: "ana@seedcommons.org", createdAt: "2026-10-13", submitterName: "Ana Ribeiro", allianceApplicationId: 7, allianceOrganization: "Seed Commons", allianceStatus: "under_review" },
        { id: 6, name: "Soil Ledger", slug: "soil-ledger", websiteUrl: "https://soilledger.example/app", shortSummary: "Track soil tests across seasons.", longDescription: null, toolKind: "software", isOpenSource: 1, contactEmail: null, createdAt: "2026-10-12", submitterName: "Jo", allianceApplicationId: null, allianceOrganization: null, allianceStatus: null },
      ];
    },
    render: () => (
      <div className="bg-[#f0ebe3] p-4">
        <AdminToolQueue />
      </div>
    ),
  },

  "tool-detail-partner": {
    title: "A tool page: Alliance Partner, used by land projects, owner can edit",
    setup: () => {
      mockData["auth.me"] = SIGNED_IN;
      mockData["tools.getBySlug"] = LIBRARY_TOOL;
      mockData["tools.mine"] = [LIBRARY_TOOL];
      mockData["tools.list"] = [LIBRARY_TOOL, { ...LIBRARY_TOOL, id: 9, slug: "hylo", name: "Hylo", pricingModel: "free", partnerName: null, usedByProjects: 0 }];
    },
    render: () => {
      const { hook } = memoryLocation({ path: "/tools/commons-treasury", static: true });
      return (
        <Router hook={hook}>
          <Route path="/tools/:slug"><ToolDetail /></Route>
        </Router>
      );
    },
  },

  "tools-library-cards": {
    title: "The Tools Library with a partner's tool",
    setup: () => {
      mockData["tools.list"] = [LIBRARY_TOOL, { ...LIBRARY_TOOL, id: 9, slug: "hylo", name: "Hylo", pricingModel: "free", partnerName: null, usedByProjects: 0, shortSummary: "Community coordination platform connecting people and projects." }];
      mockData["tools.categories"] = [{ id: 1, name: "Finance", slug: "finance", toolCount: 1 }];
    },
    render: () => <ToolsLibrary />,
  },

  "apply-status-tools-picker": {
    title: "Land project status: accepted, with the tools picker",
    setup: () => {
      mockData["auth.me"] = SIGNED_IN;
      mockData["applications.myApplications"] = [{ id: 3, projectName: "Hill Farm", status: "approved", location: "Vermont", season: 2, submittedAt: "2026-10-01" }];
      mockData["tools.options"] = [
        { id: 1, name: "Gitcoin", slug: "gitcoin", toolKind: null },
        { id: 2, name: "Hypha", slug: "hypha", toolKind: null },
        { id: 3, name: "Hylo", slug: "hylo", toolKind: null },
        { id: 4, name: "Commons Treasury", slug: "commons-treasury", toolKind: "software" },
      ];
      mockData["tools.projectTools"] = [2, 3];
      mockData["seasonSchedule.linkMyVote.result"] = { voted: false };
    },
    render: () => <ApplyStatus />,
  },

  "tool-submit": {
    title: "Submit a tool: the first step",
    setup: () => { mockData["auth.me"] = SIGNED_IN; },
    render: () => <ToolSubmit />,
  },

  "alliance-status-approved": {
    title: "Alliance Partner status: approved, not voted yet",
    setup: () => {
      mockData["auth.me"] = SIGNED_IN;
      mockData["allianceApplications.mine"] = [{ ...ALLIANCE_APP, status: "approved" }];
      mockData["interopSessions.linkMyVote.result"] = { voted: false };
    },
    render: () => <AllianceApplyStatus />,
  },

  "alliance-status-changes": {
    title: "Alliance Partner status: changes requested, with the review note",
    setup: () => {
      mockData["auth.me"] = SIGNED_IN;
      mockData["allianceApplications.mine"] = [{ ...ALLIANCE_APP, status: "changes_requested", reviewNote: "Could you add a link to the treasury template?" }];
    },
    render: () => <AllianceApplyStatus />,
  },

  "alliance-admin-applications": {
    title: "Admin > Alliance: applications list with the invite backlog",
    setup: () => {
      mockData["allianceApplications.list"] = [
        ALLIANCE_APP,
        { ...ALLIANCE_APP, id: 8, organizationName: "Mycelium Mapping Co", contactName: "Jo", contactEmail: "jo@mycelium.org", status: "approved", sourceInquiryId: 42, roles: JSON.stringify(["Technology"]) },
      ];
      mockData["allianceApplications.inviteBacklog"] = [{ id: 8, organizationName: "Mycelium Mapping Co", contactEmail: "jo@mycelium.org" }];
    },
    render: () => (
      <div className="bg-[#f0ebe3] p-4">
        <AdminAllianceApplications />
      </div>
    ),
  },

  /**
   * The first-run quest intro over the bottom nav. Two things to check:
   * nothing scrolls horizontally, and the Next / Skip controls clear the bar.
   */
  "quest-game-intro": {
    title: "Quest intro overlay, with the fixed bottom nav in place",
    setup: () => {
      localStorage.removeItem("regen_game_entered");
    },
    render: () => (
      <>
        <QuestGameIntro onEnter={() => undefined} />
        <BottomNavStandIn />
      </>
    ),
  },

  "alliance-inquiry-list": {
    title: "Admin Alliance Partner Inquiries: application blurb on each row",
    render: () => (
      <AdminAllianceTab
        inquiries={ALLIANCE_INQUIRIES}
        InquirySectionComp={InquirySection}
      />
    ),
  },

  "harvest-compose": {
    title: "Harvest Compose idea box with the shared dictation mic",
    render: () => (
      <div className="max-w-3xl">
        <ComposeBox onComposed={() => undefined} />
      </div>
    ),
  },

  "email-draft-agent": {
    title: "Write with me chat input with the shared dictation mic",
    render: () => (
      <div className="max-w-xl">
        <EmailDraftAgent
          currentSubject="Season update"
          currentBody="Friends,"
          statusLabel="all subscribers"
          recipientCount={12}
          variant="newsletter"
          onApply={() => undefined}
        />
      </div>
    ),
  },

  "dictation-blocked-mic": {
    title: "DictationButton when the browser has Blocked the microphone",
    setup: () => {
      class FakeSpeechRecognition {
        continuous = false;
        interimResults = false;
        lang = "";
        onresult = null;
        onerror = null;
        onend = null;
        start() {}
        stop() {}
        abort() {}
      }
      Object.defineProperty(window, "SpeechRecognition", {
        configurable: true,
        value: FakeSpeechRecognition,
      });
      Object.defineProperty(navigator, "permissions", {
        configurable: true,
        value: {
          query: async () => ({ state: "denied", onchange: null }),
        },
      });
    },
    render: () => <BlockedMicStory />,
  },

  "admin-ai-chat": {
    title: "Admin AI chatbot input with the shared dictation mic",
    setup: () => {
      mockData["auth.me"] = { id: "u1", role: "admin", name: "Rye" };
      mockData["quickNotes.status"] = { ready: true, voice: true };
    },
    render: () => (
      <div className="relative min-h-[560px]">
        <AdminAIAssistant context={{ activeTab: "overview" }} />
      </div>
    ),
  },

  "broadcast-message": {
    title: "Broadcast Message field with the shared dictation mic",
    setup: () => {
      mockData["admin.broadcast.getBufferProfiles"] = [
        { id: "tw", service: "twitter", service_username: "regencivics", formatted_username: "@regencivics" },
        { id: "li", service: "linkedin", service_username: "regencivics", formatted_username: "ReGen Civics" },
      ];
    },
    render: () => (
      <div className="max-w-3xl p-4">
        <AdminBroadcastPanel />
      </div>
    ),
  },

  "publication-review": {
    title: "Publication review: fact flags, first comment, weekly note",
    setup: () => {
      mockData["harvest.publicationReview"] = REVIEW_FIXTURE;
      mockData["harvest.sendPreview.result"] = {
        subject: "A note from the land",
        recipientCount: 12,
        confirmToken: "harness-token",
      };
    },
    render: () => (
      <div className="max-w-3xl">
        <PublicationReview publicationId={1} />
      </div>
    ),
  },

  /**
   * Matches the live 30d snapshot: page views and CTA clicks are 0, apply /
   * share / newsletter events are present. Use this to check empty-card
   * treatment and the apply conversion strip.
   */
  "behavior-analytics": {
    title: "Behavior analytics, current 30d shape (zeros + apply funnel)",
    setup: () => {
      mockData["analytics.funnel"] = {
        pageViews: 0,
        ctaClicks: 0,
        applySubmitted: 3,
        loiSubmitted: 0,
      };
      mockData["analytics.top"] = [
        { event: "apply_started", count: 7 },
        { event: "apply_form_submitted", count: 3 },
        { event: "newsletter_signup", count: 3 },
        { event: "share_clicked", count: 3 },
        { event: "apply_step_2", count: 2 },
        { event: "apply_step_3", count: 2 },
        { event: "apply_step_4", count: 2 },
        { event: "apply_step_5", count: 2 },
      ];
      mockData["analytics.volume"] = CURRENT_VOLUME_FIXTURE;
    },
    render: () => (
      <div className="max-w-6xl">
        <AdminEventAnalytics />
      </div>
    ),
  },

  /**
   * A fuller series so the multi-line volume chart and live sparklines
   * are visible, including page views and CTA clicks.
   */
  "behavior-analytics-rich": {
    title: "Behavior analytics, richer series (page views + CTA + apply)",
    setup: () => {
      mockData["analytics.funnel"] = {
        pageViews: 184,
        ctaClicks: 22,
        applySubmitted: 5,
        loiSubmitted: 1,
      };
      mockData["analytics.top"] = [
        { event: "page_view", count: 184 },
        { event: "cta_click", count: 22 },
        { event: "apply_started", count: 11 },
        { event: "apply_form_submitted", count: 5 },
        { event: "newsletter_signup", count: 8 },
        { event: "share_clicked", count: 6 },
        { event: "apply_step_2", count: 9 },
        { event: "loi_submitted", count: 1 },
      ];
      mockData["analytics.volume"] = RICH_VOLUME_FIXTURE;
    },
    render: () => (
      <div className="max-w-6xl">
        <AdminEventAnalytics />
      </div>
    ),
  },

  /**
   * /seasons: the ReGen Civics Year wheel on top of the page. Check the wheel
   * at 390 and 1280, that every corner tab clears the ring, and that the
   * panel, particles and village painting all follow the chosen season.
   */
  "seasons-page": {
    title: "/seasons: the ReGen Civics Year",
    setup: () => {
      // The roles table as /team reads it, after the 2026-09-24 season moves.
      mockData["roles.list"] = [
        { title: "Season Facilitator", kind: "game", seasons: ["winter", "spring", "summer", "fall"] },
        { title: "Incubator Guide", kind: "game", seasons: ["winter", "spring"] },
        { title: "Game Designer", kind: "game", seasons: ["winter", "spring"] },
        { title: "Skills Builder", kind: "game", seasons: ["winter"] },
        { title: "Tool Curator", kind: "game", seasons: ["winter", "spring"] },
        { title: "Alliance Weaver", kind: "game", seasons: ["spring", "summer"] },
        { title: "Outreach Writer", kind: "game", seasons: ["spring", "summer"] },
        { title: "Storyteller", kind: "game", seasons: ["winter", "spring", "summer"] },
        { title: "Quest Steward", kind: "game", seasons: ["winter", "spring", "summer"] },
        { title: "Treasury Steward", kind: "game", seasons: ["winter", "spring", "summer", "fall"] },
        { title: "Forum Gardener", kind: "game", seasons: ["winter", "spring", "summer", "fall"] },
        { title: "Design Season Organizer", kind: "game", seasons: ["winter"] },
        { title: "Resource Season Organizer", kind: "game", seasons: ["spring"] },
        { title: "Build Season Organizer", kind: "game", seasons: ["summer"] },
        { title: "Rest Season Organizer", kind: "game", seasons: ["fall"] },
        { title: "Assembly Steward", kind: "game", seasons: ["winter", "spring", "summer"] },
        { title: "Fund Steward", kind: "fund", seasons: ["winter", "spring", "summer", "fall"] },
      ];
    },
    render: () => (
      <div className="-m-6">
        <Seasons />
      </div>
    ),
  },

  /** /team's rhythm cards, which read the same four seasons as the wheel. */
  "team-season-rhythm": {
    title: "/team: The Rhythm of the Infinite Game",
    render: () => (
      <div className="-m-6">
        <SeasonalRhythmSection />
      </div>
    ),
  },

  /**
   * The crowdpool readiness checklist as /create-campaign#ready shows it, on the
   * page's parchment. Ticks persist per storageKey in this browser only.
   */
  "crowdpool-readiness": {
    title: "/create-campaign#ready: Ready to crowdpool",
    render: () => (
      <div className="-m-6 bg-[#f8f5f0] p-6">
        <div className="max-w-3xl mx-auto">
          <CrowdpoolReadiness id="ready" storageKey="harness" />
        </div>
      </div>
    ),
  },

  /**
   * Week board shell. `stage` is the room's stage index. The live Week 2 plan
   * is Rieki's minutes, including 6 for Get your Village OS.
   */
  "week-board-welcome": {
    title: "Week board: Welcome, today's total",
    setup: () => {
      const state = defaultBoardState(2);
      state.stage = 0;
      state.plan = [5, 8, 10, 10, 5, 42, 12, 15, 7, 3, 6];
      mockData["sessionBoard.get"] = {
        week: 2,
        status: "open",
        version: 1,
        serverNow: Date.now(),
        state,
        canFacilitate: true,
        notes: [],
        hands: {},
        offers: {},
        offerPeople: null,
        projects: [],
        items: [],
      };
      mockData["sessionBoard.version"] = { version: 1, status: "open" };
    },
    render: () => {
      const { hook } = memoryLocation({ path: "/season2/week/2", static: true });
      return (
        <Router hook={hook}>
          <Route path="/season2/week/:week"><SessionBoard /></Route>
        </Router>
      );
    },
  },

  "week-board-village": {
    title: "Week board: Building in Village OS",
    setup: () => {
      const state = defaultBoardState(2);
      state.stage = 3;
      state.plan = [5, 8, 10, 10, 5, 42, 12, 15, 7, 3, 6];
      mockData["sessionBoard.get"] = {
        week: 2,
        status: "open",
        version: 1,
        serverNow: Date.now(),
        state,
        canFacilitate: false,
        notes: [],
        hands: {},
        offers: {},
        offerPeople: null,
        projects: [],
        items: [],
      };
      mockData["sessionBoard.version"] = { version: 1, status: "open" };
    },
    render: () => {
      const { hook } = memoryLocation({ path: "/season2/week/2", static: true });
      return (
        <Router hook={hook}>
          <Route path="/season2/week/:week"><SessionBoard /></Route>
        </Router>
      );
    },
  },

  /** /village-os with both offer switches off, which is how the page ships. */
  "village-os": {
    title: "/village-os: Start your own game",
    setup: () => {
      mockData["churchDonations.zeffyEnabled"] = {
        enabled: true,
        embedUrl: "https://www.zeffy.com/en-US/embed/donation-form/donation-312",
      };
    },
    render: () => (
      <div className="-m-6">
        <VillageOs />
      </div>
    ),
  },

  /** The wheel alone, as it looks in the middle of spring. */
  "season-wheel-spring": {
    title: "Season wheel on 2027-01-20 (spring, Season 2)",
    render: () => (
      <div className="-m-6">
        <SeasonWheel now={new Date("2027-01-20T18:00:00Z")} />
      </div>
    ),
  },

  /**
   * Week 3, stage 2 "Tap your project", as a guest on a phone: thirteen tiles
   * from this board, Week 2 and applications (so the filter shows), Toa
   * Hermitage picked. The audit taps "Change project" and opens "Add your
   * project" with a name typed, so the tiles, the pressed pick and the add
   * form are all measured.
   */
  "week3-checkin": {
    title: "Week 3, Tap your project: tiles from all three sources, one picked, adding a project",
    setup: () => {
      week3Board(1);
      mockData["sessionBoard.checkInOptions"] = { tiles: W3_TILES };
    },
    render: () => <Week3Page />,
  },

  /** The same stage for the facilitator: "You're with ...", the name field, and card care open. */
  "week3-checkin-host": {
    title: "Week 3, Tap your project: picked, facilitator, link, merge and hide open",
    setup: () => {
      week3Board(1, { facilitator: true, displayName: "Rye" });
      mockData["sessionBoard.checkInOptions"] = { tiles: W3_TILES.slice(0, 6) };
    },
    render: () => <Week3Page />,
  },

  /**
   * Stage 4 for someone here to learn: the "Answering for the room" chip, the
   * question wall as a guest sees it (an answered one, one of mine), and hopes.
   */
  "week3-came-for": {
    title: "Week 3, What you came for: here to learn, the question wall, a two-line note",
    setup: () => {
      week3Board(3, {
        learn: true,
        rows: [
          ...W3_ASK_ROWS,
          { id: 150, block: "hope", text: "How other projects decide who joins", projectId: null, mine: true },
          { id: 250, block: "hope", text: "Clarity on who decides what", projectId: TOA },
          { id: 363, block: "hope", text: "How to bring the neighbours in", projectId: AMORA },
        ],
      });
    },
    render: () => <Week3Page />,
  },

  /**
   * Stage 6 "What it's all for": the room's anonymous pick with counts, the
   * private card with words tapped in (the audit types and taps), and the
   * project's first line under the "For Toa Hermitage" chip.
   */
  "week3-prompt": {
    title: "Week 3, What it's all for: anonymous pick, the private card, a note for the project",
    setup: () => {
      week3Board(5, {
        rows: [
          { id: 130, block: "purpose", text: "twelve families living well on land we heal together", projectId: TOA, mine: true },
          { id: 330, block: "purpose", text: "a village where every child knows the forest by name", projectId: AMORA },
        ],
        answerCounts: { mate: { hardly: 1, little: 3, some: 4, mostly: 2, fully: 0 } },
        anon: [{ key: "mate", option: "some" }],
      });
    },
    render: () => <Week3Page />,
  },

  /** Stage 7: four human needs picked, two seeds planted, teammates' counts, and Across the room. */
  "week3-needs-pick": {
    title: "Week 3, What your project is for: some picked, seeds planted",
    setup: () => {
      week3Board(6, {
        rows: [...W3_NEEDS_ROWS, { id: 107, block: "other", text: "Belonging to a place", projectId: TOA, mine: true }],
      });
    },
    render: () => <Week3Page />,
  },

  /** Stage 8: a seed with today and the goal set (so the rung's meaning shows), a teammate who differs, and the ladder. */
  "week3-needs-depth": {
    title: "Week 3, How deep, how wide: today and goal set, the rung meaning, the room's ladder",
    setup: () => {
      week3Board(7, {
        rows: [...W3_NEEDS_ROWS, ...W3_DEPTH_ROWS],
        answerCounts: { "pulse-a": { clear: 5, deeper: 2, fast: 1, lost: 0 } },
        anon: [{ key: "pulse-a", option: "clear" }],
      });
    },
    render: () => <Week3Page />,
  },

  /** Stage 10: who meets each seed, with the deck's tip opened on "A market", and The room leans. */
  "week3-needs-meet": {
    title: "Week 3, Who meets each need: ways with small print, a tip open, the room leans",
    setup: () => {
      week3Board(9, { rows: [...W3_NEEDS_ROWS, ...W3_DEPTH_ROWS, ...W3_MEET_ROWS] });
    },
    render: () => <Week3Page />,
  },

  /** Stage 14: "Polish your first line" and every project's card, read aloud. */
  "week3-room-card": {
    title: "Week 3, Your project in one breath: the first line and every project's card",
    setup: () => {
      week3Board(13, { rows: [...W3_NEEDS_ROWS, ...W3_DEPTH_ROWS, ...W3_MEET_ROWS, ...W3_CARD_ROWS] });
    },
    render: () => <Week3Page />,
  },

  /** Stage 15 for the facilitator: the wall with Mark answered, the box picks, one move, Week 4 picks. */
  "week3-questions": {
    title: "Week 3, Your questions and next week: facilitator marks answered",
    setup: () => {
      week3Board(14, {
        facilitator: true,
        rows: [
          ...W3_ASK_ROWS,
          { id: 160, block: "box", text: "vision", projectId: TOA, mine: true },
          { id: 161, block: "box", text: "patterns", projectId: TOA, mine: true },
          { id: 162, block: "week4", text: "circles", projectId: TOA, mine: true },
        ],
      });
    },
    render: () => <Week3Page />,
  },

  /** Stage 16: the Season feedback box (Week 4 from the schedule), one line, and the anonymous pick. */
  "week3-tellus": {
    title: "Week 3, Tell us: the feedback box with a topic typed and shared",
    setup: () => {
      week3Board(15, {
        rows: [{ id: 170, block: "landed", text: "Keeping human needs out of markets", projectId: null, mine: true }],
        answerCounts: { useful: { notyet: 0, little: 1, useful: 3, very: 4, exactly: 2 } },
        anon: [{ key: "useful", option: "very" }],
      });
    },
    render: () => <Week3Page />,
  },

  /** Stage 17: closing words (one of mine, with its take-back), Week 3's numbers, and the board staying open. */
  "week3-close": {
    title: "Week 3, Close: closing words and the week's numbers",
    setup: () => {
      week3Board(16, {
        rows: [
          ...W3_NEEDS_ROWS,
          ...W3_ASK_ROWS,
          { id: 380, kind: "leave", block: null, text: "Rooted", projectId: null },
          { id: 381, kind: "leave", block: null, text: "Curious", projectId: null },
          { id: 180, kind: "leave", block: null, text: "Grateful", projectId: null, mine: true },
        ],
      });
    },
    render: () => <Week3Page />,
  },

  /** Stage 1, the first screen everyone sees on Wednesday: Welcome, Part 1 of 2. */
  "week3-welcome": {
    title: "Week 3, Welcome: the first screen, as a guest",
    setup: () => {
      week3Board(0);
    },
    render: () => <Week3Page />,
  },

  /** Stage 3, Drop in: the breath and an arrival word, one of mine with its take-back. */
  "week3-dropin": {
    title: "Week 3, Drop in: the breath and arrival words",
    setup: () => {
      week3Board(2, {
        rows: [
          { id: 390, kind: "arrive", block: null, text: "Rested", projectId: null },
          { id: 190, kind: "arrive", block: null, text: "Hopeful", projectId: null, mine: true },
        ],
      });
    },
    render: () => <Week3Page />,
  },

  /** Stage 5, Why now: the clip link and one line for the project. */
  "week3-whynow": {
    title: "Week 3, Why now: the clip and one line",
    setup: () => {
      week3Board(4, { rows: [{ id: 191, block: "whynow", text: "We have less time than I thought to get the water right", projectId: TOA, mine: true }] });
    },
    render: () => <Week3Page />,
  },

  /** Stage 9, Living ways: the chestnut line, empty so its example shows, and the allies pick. */
  "week3-living": {
    title: "Week 3, Living ways: the chestnut and the allies",
    setup: () => {
      week3Board(8, { rows: [...W3_NEEDS_ROWS, { id: 192, block: "allies", text: "birds", projectId: TOA, mine: true }] });
    },
    render: () => <Week3Page />,
  },

  /** Stages 11 to 13: who decides, circles and players, from the centre out. */
  "week3-decides": {
    title: "Week 3, Who decides: today and the aim, and a game in place of a meeting",
    setup: () => {
      week3Board(10, { rows: W3_NEEDS_ROWS });
    },
    render: () => <Week3Page />,
  },
  "week3-circles": {
    title: "Week 3, Circles and players",
    setup: () => {
      week3Board(11, { rows: [...W3_NEEDS_ROWS, ...W3_CARD_ROWS] });
    },
    render: () => <Week3Page />,
  },
  "week3-centre": {
    title: "Week 3, From the centre out: one economy and one rite",
    setup: () => {
      week3Board(12, { rows: W3_NEEDS_ROWS });
    },
    render: () => <Week3Page />,
  },

  /** Stage 18, after the Close: get your Village OS. */
  "week3-village": {
    title: "Week 3, Your village: get your Village OS",
    setup: () => {
      week3Board(17);
    },
    render: () => <Week3Page />,
  },

  /** The profile's Submissions, Weekly sessions: Week 3 open, Week 2 opened by the audit. */
  "profile-weekly-sessions": {
    title: "Profile > Submissions: Weekly sessions, Week 3 and Week 2",
    setup: () => {
      mockData["auth.me"] = SIGNED_IN;
      mockData["sessionBoard.mySubmissions"] = { weeks: SUBMISSION_WEEKS };
      try { localStorage.removeItem("season-voter-key"); } catch { /* nothing kept */ }
    },
    render: () => (
      <ProfileGround>
        <SessionSubmissions />
      </ProfileGround>
    ),
  },

  /** Signed in on a browser that answered as a guest: the claim question, before anything moves. */
  "profile-guest-claim": {
    title: "Profile > Submissions: We found 4 answers given as a guest in this browser",
    setup: () => {
      mockData["auth.me"] = SIGNED_IN;
      mockData["sessionBoard.mySubmissions"] = { weeks: [] };
      mockData["sessionBoard.guestRows.result"] = { rows: 4 };
      try {
        localStorage.setItem("season-voter-key", "s0123456789abcdef0123456789abcdef");
        localStorage.removeItem(`session-board:claim-declined:${SIGNED_IN.id}`);
      } catch { /* the question needs the key */ }
    },
    render: () => (
      <ProfileGround>
        <SessionSubmissions />
        <Toaster />
      </ProfileGround>
    ),
  },

  /** Admin > Events: the export panel after "See each week's summary", every disclosure open. Light theme. */
  "admin-session-export": {
    title: "Admin > Events: Weekly session answers, each week's summary",
    setup: () => {
      mockData["sessionBoard.adminExport"] = EXPORT_FIXTURE;
    },
    render: () => (
      <div className="bg-[#f0ebe3] p-4">
        <SessionBoardExport />
      </div>
    ),
  },
};
