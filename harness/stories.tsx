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

export const STORIES: Record<string, Story> = {
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
};
