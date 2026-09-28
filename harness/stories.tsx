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
import { SeasonWheel } from "@/components/SeasonWheel";
import { SeasonalRhythmSection } from "@/components/SeasonalRhythmSection";
import { CrowdpoolReadiness } from "@/components/CrowdpoolReadiness";
import { ApplicationKitPanel, PacketView } from "@/components/admin/funding/ApplicationKitPanel";
import { AnswerBankPanel } from "@/components/admin/funding/AnswerBankPanel";

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

// ── Funding engine Phase 1: the application kit ─────────────────────────────
const KIT_NOW = Date.now();
const kitInDays = (d: number) => new Date(KIT_NOW + d * 86_400_000).toISOString();
const KIT_EM_DASH = String.fromCharCode(0x2014);

const KIT_FUNDER = {
  id: 7, name: "PearX", category: "Accelerator (tech wedge)", track: "accelerator", stage: "drafting",
  appStatus: "preparing", cycle: "W27", deadline: "The Regular Deadline is October 4th at 11:59PM PST.",
  deadlineAt: kitInDays(6), deadlineSource: "https://pear.vc/pearx-application/", deadlineVerifiedAt: "2026-09-27",
  link: "https://pear.vc/pearx-application/", priority: "P1",
};

let kitQuestionId = 100;
function kitQuestion(over: Record<string, unknown>) {
  kitQuestionId += 1;
  return {
    id: kitQuestionId, pipelineId: 7, programKey: "pearx_w27", cycle: "W27", questionOrder: kitQuestionId - 100,
    section: "Company", questionText: "", fieldType: "long_text", isRequired: true, charLimit: null, wordLimit: null,
    answerId: null, answerDraft: null, draftUpdatedAt: null, draftUpdatedBy: null, verified: true, sourceUrl: null,
    notes: null, createdAt: "2026-09-27T00:00:00Z", updatedAt: "2026-09-27T00:00:00Z", lint: null, ...over,
  };
}

const KIT_PACKET = {
  programKey: "pearx_w27",
  cycle: "W27",
  funder: KIT_FUNDER,
  confirmedNumbers: [],
  summary: { questions: 8, required: 7, answered: 6, requiredMissing: 1, overLimit: 1, withErrors: 2, withWarnings: 2 },
  questions: [
    kitQuestion({ questionText: "Company name", fieldType: "short_text", answerDraft: "ReGen Civics" }),
    kitQuestion({
      questionText: "One-line description of the company", fieldType: "short_text", charLimit: 280,
      answerDraft: "ReGen Civics helps regenerative land projects design structures that hold together, then connects them into a network funders can trust.",
    }),
    kitQuestion({
      section: "Pitch", questionText: "What are you building, and why?", charLimit: 2000,
      answerDraft: "Land projects fail in known ways: money disputes, founder burnout, unclear decision rights, no path to owning the land. We qualify projects against those patterns, help them design the structures that prevent them, and count every form of capital members bring, from money to time, skills, tools and relationships. Our tools are free and open. We earn fees for structure design and onboarding work.",
    }),
    kitQuestion({
      section: "Pitch", questionText: "What unique insight do you have into this problem?", charLimit: 2000,
      answerDraft: "We build tools" + KIT_EM_DASH + "fast. Target returns of 8% annually keep members in.",
    }),
    kitQuestion({
      section: "Pitch", questionText: "What traction do you have?", charLimit: 500,
      answerDraft: "66 land projects have applied across two seasons with no paid marketing. We run a 13-week public incubator cohort this fall.",
    }),
    kitQuestion({
      section: "Founders", questionText: "Tell us about a time you tackled a problem in a novel way.", charLimit: 300,
      answerDraft: "When our first community fractured over who had contributed what, we stopped arguing about fairness and started counting. We built a ledger that recorded time, skills, tools and relationships beside money, and let the group see it. The arguments stopped once the record was shared, because people could finally see their own contributions counted.",
    }),
    kitQuestion({ section: "Founders", questionText: "Founder video (1 minute)", fieldType: "video", notes: "Unlisted YouTube or Loom link." }),
    kitQuestion({ section: "Other", questionText: "Anything else we should know?", isRequired: false, charLimit: 1000 }),
  ],
};

const KIT_PROGRAMS = [
  {
    programKey: "500global_b37", cycle: "Batch 37",
    funder: { ...KIT_FUNDER, id: 6, name: "500 Global", cycle: "Batch 37", deadlineAt: kitInDays(2), stage: "drafting" },
    summary: { questions: 66, required: 48, answered: 41, requiredMissing: 7, overLimit: 2, withErrors: 3, withWarnings: 9 },
  },
  { programKey: "pearx_w27", cycle: "W27", funder: KIT_FUNDER, summary: KIT_PACKET.summary },
  {
    programKey: "yc_w27", cycle: "W27",
    funder: { ...KIT_FUNDER, id: 1, name: "Y Combinator", deadlineAt: kitInDays(36), stage: "qualified", link: "https://apply.ycombinator.com/home" },
    summary: { questions: 49, required: 0, answered: 0, requiredMissing: 0, overLimit: 0, withErrors: 0, withWarnings: 0 },
  },
  {
    programKey: "emergent_ventures", cycle: "rolling",
    funder: { ...KIT_FUNDER, id: 9, name: "Emergent Ventures", track: "grant", stage: null, cycle: "rolling", deadlineAt: null },
    summary: { questions: 23, required: 14, answered: 0, requiredMissing: 14, overLimit: 0, withErrors: 0, withWarnings: 0 },
  },
];

function kitAnswer(over: Record<string, unknown>) {
  return {
    id: 1, projectId: 0, slug: "", canonicalQuestion: "", tags: null, bodyShort: null, body150: null, body500: null,
    bodyLong: null, sourceRefs: null, status: "draft", approvedAt: null, approvedBy: null, verifiedAt: null,
    usedCount: 0, wonCount: 0, notes: null, sortOrder: 0, createdAt: "2026-09-27T00:00:00Z",
    updatedAt: "2026-09-27T00:00:00Z", lint: {}, ...over,
  };
}

const KIT_ANSWERS = {
  confirmedNumbers: [],
  answers: [
    kitAnswer({
      id: 1, slug: "what-we-do", canonicalQuestion: "What does your company do?", status: "approved", usedCount: 3,
      bodyShort: "Operating system for regenerative villages",
      body500: "ReGen Civics is coordination and diligence software for regenerative land projects like ecovillages and community farms. We qualify projects, help them pool the land, labor, expertise and cash they need, and run the governance systems that keep contributors aligned.",
    }),
    kitAnswer({
      id: 2, slug: "traction", canonicalQuestion: "What is your traction?", sortOrder: 30,
      bodyLong: "66 land projects have applied across two seasons (43 in 2022, 23 since February 2026), with no paid marketing [VERIFY: the definition of applied and both counts].",
    }),
    kitAnswer({
      id: 3, slug: "raise", canonicalQuestion: "How much are you raising and what for?", sortOrder: 90,
      bodyLong: "[DECIDE] $X on a post-money SAFE to reach [N] paying projects within 18 months.",
      notes: "Rye sets the ask (plan v1.3 section 2).",
    }),
  ],
};

export const STORIES: Record<string, Story> = {
  /** Funding engine Phase 1: every program with its deadline and packet counts. */
  "funding-applications": {
    title: "/admin/funding, Applications: programs by deadline",
    setup: () => {
      mockData["fundingKit.programs"] = KIT_PROGRAMS;
    },
    render: () => (
      <div className="-m-6 bg-[#f0ebe3] p-4 md:p-6">
        <ApplicationKitPanel />
      </div>
    ),
  },

  /**
   * One packet with every state worth seeing: a clean answer, one over its
   * limit, a dash and a G5 phrase, an unconfirmed number, a required video
   * still empty, and an optional question left blank.
   */
  "funding-packet": {
    title: "/admin/funding, Applications: the PearX W27 packet",
    setup: () => {
      mockData["fundingKit.packet"] = KIT_PACKET;
      mockData["fundingKit.answers"] = KIT_ANSWERS;
      mockData["fundingKit.draftHistory"] = [];
    },
    render: () => (
      <div className="-m-6 bg-[#f0ebe3] p-4 md:p-6">
        <PacketView programKey="pearx_w27" onBack={() => undefined} />
      </div>
    ),
  },

  /** The answer bank: an approved answer, and two drafts that cannot be approved yet. */
  "funding-answer-bank": {
    title: "/admin/funding, Answer bank",
    setup: () => {
      mockData["fundingKit.answers"] = KIT_ANSWERS;
      mockData["fundingKit.answerHistory"] = [];
    },
    render: () => (
      <div className="-m-6 bg-[#f0ebe3] p-4 md:p-6">
        <AnswerBankPanel />
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
   * The crowdpool readiness checklist as /crowd-pooling#ready shows it, on the
   * page's parchment. Ticks persist per storageKey in this browser only.
   */
  "crowdpool-readiness": {
    title: "/crowd-pooling#ready: Ready to crowdpool",
    render: () => (
      <div className="-m-6 bg-[#f8f5f0] p-6">
        <div className="max-w-3xl mx-auto">
          <CrowdpoolReadiness id="ready" storageKey="harness" />
        </div>
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
