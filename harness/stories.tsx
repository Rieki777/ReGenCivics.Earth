/**
 * Harness stories. Each one sets up its canned tRPC data, then renders a real
 * component from client/src. Add a story whenever you touch a screen that is
 * awkward to reach in the running app.
 */
import type { ReactNode } from "react";
import { mockData } from "./trpc-stub";
import { PublicationReview } from "@/components/HarvestCompose";
import { QuestGameIntro } from "@/components/QuestGameIntro";
import { AdminAllianceTab } from "@/components/admin/AdminAllianceTab";
import { InquirySection } from "@/components/admin/AdminInquirySection";
import { AdminEventAnalytics } from "@/components/AdminEventAnalytics";

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
  ],
  items: [
    { id: 11, status: "ready", body: "We chose a venture structure because legibility moves more capital than purity. Investors read a cap table faster than they read a manifesto." },
    { id: 12, status: "ready", body: "Soil first. Governance second. Everything else follows from those two." },
    { id: 13, status: "ready", body: "Three land projects joined this month. Here is what each one is actually planting." },
    { id: 14, status: "ready", body: "# Why we chose a VC structure\n\nThe short answer is legibility." },
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

export const STORIES: Record<string, Story> = {
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

  "publication-review": {
    title: "Publication review: fact flags, first comment, weekly note",
    setup: () => {
      mockData["harvest.publicationReview"] = REVIEW_FIXTURE;
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
};
