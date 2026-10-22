/**
 * /opportunity: the long-form page about the ReGen Network Cooperative and its
 * cooperative treasury (the network treasury).
 *
 * History. Until 2026-09-27 this page was the fund's investment memorandum.
 * ADR-62 rewrote it as a short page about the cooperative, and saved
 * the memorandum in git tag archive/fund-pages-2026-09-27. On 2026-10-21 Rye
 * asked for the memorandum's structure and language back with the cooperative
 * as its legal entity (ADR-78): "the structure of that all stays, it's just a
 * cooperative legal entity". So this page follows the old one section by
 * section (the alliance, the snapshot, the opportunity, why now, the three
 * tiers, impact, how projects are chosen, risks, team, comparison, who it's
 * for, the process, the questions, the 2040 vision) and adds what Rye named as
 * the major key: land projects pooling their resources in one treasury and
 * co-owning each other's projects.
 *
 * Rye chose "structure, no return promises". Everything that priced upside on
 * the old page is gone: the modelled return target, the fee and waterfall
 * sections, the payout schedule, the token listing plan, the token value
 * section and the comparison rows built on them. Gate G5 in
 * scripts/check-fund-claims.mjs still fails the build if any of it returns.
 *
 * Every fact about the cooperative comes from COOP in shared/fund.ts, and the
 * gate fails the build if this file stops importing it. The sentences written
 * here that COOP does not carry go on the counsel review list.
 */

import { useState, useRef, useCallback, useId, type ReactNode, type FormEvent, type MouseEvent as ReactMouseEvent } from "react";
import { Link } from "wouter";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BarChart3,
  Building,
  Calendar,
  CheckCircle2,
  ChevronDown,
  CircleDot,
  CircleHelp,
  Clock,
  Coins,
  Compass,
  FileSignature,
  Heart,
  History,
  Landmark,
  Layers,
  Leaf,
  Mail,
  Network,
  PencilRuler,
  RefreshCw,
  Scale,
  Shield,
  Signpost,
  Sparkles,
  Sprout,
  TreePine,
  Users,
  Vote,
  Workflow,
  type LucideIcon,
} from "lucide-react";
import { COOP, COOP_LINEAGE_HEADING } from "@shared/fund";
import { CAPITAL_TYPES, type CapitalType } from "@shared/capitals";
import { CAPITAL_COLORS } from "@shared/crowdpoolingTaxonomy";
import { trpc } from "@/lib/trpc";
import { useThrottledScroll } from "@/hooks/useThrottledScroll";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { Button } from "@/components/ui/button";
import { AnimatedSection } from "@/components/AnimatedSection";
import { SEO, pageSEO } from "@/components/SEO";
import { RelatedContent, relatedContentMap } from "@/components/RelatedContent";
import { ReadingProgress } from "@/components/ReadingProgress";
import { TableOfContents } from "@/components/TableOfContents";
import { MobileTableOfContents, type TocAction, type TocSection } from "@/components/MobileTableOfContents";

// =============================================
// PAGE DATA
// =============================================

const CALL_URL = "https://calendly.com/rieki-cordon/30min";
const LOI_HREF = "/loi";
const INTEREST_HREF = "/loi?path=interest";

// Module-level so SEO's effect (which depends on the array) runs once. The
// crumb reads the page title from pageSEO, so the two can't disagree.
const BREADCRUMBS = [
  { name: "Home", url: "/" },
  { name: pageSEO.opportunity.title, url: "/opportunity" },
];

/**
 * The page's sections in order. Both tables of contents read this one list,
 * so an entry can never point at a section that is not on the page.
 */
const SECTIONS: TocSection[] = [
  { id: "where-it-stands", title: "Where it stands" },
  { id: "lineage", title: COOP_LINEAGE_HEADING },
  { id: "alliance", title: "What the alliance is" },
  { id: "terms", title: "Proposed treasury snapshot" },
  { id: "co-ownership", title: "How land projects co-own each other" },
  { id: "opportunity", title: "The opportunity" },
  { id: "why-now", title: "Why now" },
  { id: "allocation", title: "How the treasury would be used" },
  { id: "design", title: "How it's being designed" },
  { id: "impact", title: "Impact framework" },
  { id: "choosing-projects", title: "How land projects are chosen" },
  { id: "risks", title: "What could go wrong" },
  { id: "team", title: "Team and operating model" },
  { id: "comparison", title: "How it compares" },
  { id: "capital", title: "The nine forms of capital" },
  { id: "right-for-you", title: "Is this right for you?" },
  { id: "process", title: "How it comes together" },
  { id: "faq", title: "Questions" },
  { id: "vision", title: "The vision: 2040" },
  { id: "sign", title: "Sign a letter of intent" },
];

const MOBILE_ACTIONS: TocAction[] = [{ label: "Sign a letter of intent", href: LOI_HREF, icon: FileSignature }];

/**
 * Anchor offset for every section. index.css gives every [id] a 112px
 * scroll-margin-top from an unlayered rule, and an unlayered rule outranks any
 * plain Tailwind utility. On phones the fixed page header plus the mobile table
 * of contents reach about 168px, so a section opened from the contents landed
 * with its heading hidden under them. The important modifier is the one
 * utility that outranks the unlayered rule.
 */
const SECTION_CLASS = "mb-12 md:mb-16 scroll-mt-48! md:scroll-mt-32!";

const P = "text-white/85 text-[15px] md:text-base leading-relaxed safe-prose";
const P_SMALL = "text-white/80 text-sm leading-relaxed safe-prose";
const CARD = "bg-white/5 rounded-xl p-5 border border-white/15";
const H3 = "text-base md:text-lg font-bold text-[#7dd87d] mb-3";
const DISPLAY = { fontFamily: "var(--font-display)" } as const;

/**
 * One icon per design principle, keyed by title. If COOP renames or adds a
 * principle, it renders with the fallback icon until someone picks one here.
 */
const PRINCIPLE_ICONS: Record<string, LucideIcon> = {
  "Owned by its members": Vote,
  "One pooled treasury": Coins,
  "Land projects co-own each other": Network,
  "Every form of capital counts": Layers,
  "No managing partners": RefreshCw,
  "Held for the long term": TreePine,
};

/**
 * One plain line per capital. A Record over CapitalType, so adding a tenth
 * capital to shared/capitals.ts fails the typecheck until it has a line here.
 */
const CAPITAL_LINES: Record<CapitalType, string> = {
  intellectual: "Knowledge, designs and systems that make the work smarter.",
  social: "Relationships, trust and the connections that hold a community together.",
  material: "Tools, equipment, buildings and supplies.",
  financial: "Money and grants that pay for the work.",
  living: "Soil, water, plants, animals and the land itself.",
  cultural: "Stories, art, music and the traditions that carry meaning.",
  spiritual: "Purpose, ceremony and the practices that keep people rooted.",
  experiential: "Skills and hands-on wisdom earned by doing the work.",
  health: "Movement, rest, care and the wellbeing of bodies and minds.",
};

const titleCase = (word: string) => word.charAt(0).toUpperCase() + word.slice(1);

/** The path from here. No dates on purpose: none are set. */
const PATH: { label: string; text: string; current?: boolean }[] = [
  { label: "Now", text: `Signing letters of intent toward ${COOP.loiThreshold}.`, current: true },
  { label: "Next", text: "The founding gathering chooses the legal form with counsel and adopts the bylaws." },
  { label: "Then", text: "The network treasury launches, and money moves for the first time." },
];

/** The lineage that is real. No years and no counts, on purpose. */
const LINEAGE: { label: string; text: string }[] = [
  {
    label: "SEEDS",
    text:
      "SEEDS began as a whitepaper on regenerative economics and grew into a live " +
      "digital economy and governance system.",
  },
  {
    label: "Hypha",
    text:
      "Hypha followed: the DAO and governance tools the ecosystem runs on. ReGen " +
      "Civics uses Hypha for its formal decisions today.",
  },
  {
    label: "ReGen Civics seasons",
    text:
      "ReGen Civics runs its game in seasons. Each season a new cohort of land " +
      "projects goes through the incubator, designs its game and gathers the " +
      "support it needs.",
  },
];

const ALLIANCE_PARTS: { title: string; body: string; icon: LucideIcon }[] = [
  {
    title: "The Treasury",
    body: `The ${COOP.treasuryName} of the ${COOP.name}. In formation, and not yet a legal entity.`,
    icon: Coins,
  },
  {
    title: "The Network",
    body: "Land projects and organizations working together across many countries and bioregions.",
    icon: Network,
  },
  {
    title: "The Infrastructure",
    body: "Governance technology built to coordinate billions toward regeneration.",
    icon: Workflow,
  },
];

/** The proposed snapshot. Every value is a proposal; none is a term. */
const SNAPSHOT: { label: string; value: string; note: string }[] = [
  { label: "Launches at", value: "$20M", note: "In signed letters of intent" },
  { label: "Minimum", value: "None", note: "Sign for any amount" },
  { label: "Legal form", value: "Cooperative", note: "Formed to meet the funders' legal and regulatory needs" },
  { label: "Governance", value: "1 member, 1 vote", note: "An elected board that rotates" },
  { label: "Proposed split", value: "60 / 30 / 10", note: "Land projects / alliance / innovation" },
  { label: "Horizon", value: "Long term", note: "Built to hold land for generations" },
  { label: "Reach", value: "Global", note: "Many countries, one network" },
  { label: "Status", value: COOP.statusLabel, note: "Accepts no money until it forms" },
];

const POOL_STEPS: { title: string; body: string; icon: LucideIcon }[] = [
  {
    title: "Pool",
    body: "Land projects and people commit capital to one network treasury, and bring their land, skills, tools and time.",
    icon: Coins,
  },
  {
    title: "Co-own",
    body: "The treasury holds a shared stake in member land projects, so each project co-owns a piece of the others.",
    icon: Network,
  },
  {
    title: "Grow together",
    body: "Projects hire each other and the alliance first, share what they learn, and govern the treasury together.",
    icon: Sprout,
  },
];

const GAP_REASONS: { title: string; body: string }[] = [
  {
    title: "Isolation kills good projects.",
    body:
      "Casual attempts at community mostly never launch. Committed founders do far better, and the research is " +
      "consistent that shared commitment structures and governance are the difference between communities that " +
      "last decades and ones that dissolve in years. Most serious projects still launch without those support " +
      "systems, which keeps single land projects out of reach of larger capital.",
  },
  {
    title: "Checking each project costs too much.",
    body:
      "Most funders lack the time or the expertise to evaluate small land projects one by one, and the cost of " +
      "checking a project often runs higher than what the project needs.",
  },
  {
    title: "No ecosystem support.",
    body:
      "Projects fail when they work alone, without shared infrastructure, governance frameworks or anyone to " +
      "lean on when a season goes badly.",
  },
];

const SOLUTION_ROWS: string[][] = [
  ["Single projects fail often", "Many projects co-owned together, with alliance support"],
  ["Checking each project costs too much", "Shared standards and council expertise"],
  ["Projects work in isolation", "One network sharing infrastructure, tools and people"],
  ["Impact is hard to measure", "On-chain records and third-party verification (planned)"],
];

const WHY_NOW: { title: string; items: string[] }[] = [
  {
    title: "Land",
    items: [
      "Good regenerative land is still available at reasonable prices",
      "Strong projects are looking for capital partners now",
    ],
  },
  {
    title: "The network",
    items: [
      "Land projects go through the ReGen Civics incubator season by season",
      "The SEEDS and Hypha years built the relationships and tools the network runs on",
    ],
  },
  {
    title: "The field",
    items: [
      "Large asset managers are moving into natural capital",
      "The window to build the coordination layer for land projects is open now, and it narrows",
    ],
  },
];

const SIGN_EARLY = [
  "Help choose the legal form the treasury takes",
  "Help choose the first land projects it backs",
  "Shape the bylaws and terms at the founding gathering",
  "A voice while the structure is forming",
];

type Tier = {
  share: number;
  title: string;
  icon: LucideIcon;
  color: string;
  lead: string;
  body: string[];
  chips: string[];
  note?: string;
};

const TIERS: Tier[] = [
  {
    share: 60,
    title: "Land projects",
    icon: Building,
    color: "#7dd87d",
    lead: "Shared stakes in operating land projects",
    body: [
      "For its first years the treasury would take a shared, minority stake (proposed: 10 to 40%) in existing, " +
        "operating regenerative land projects with working models and revenue. It partners with projects that " +
        "already work and need capital to grow or replicate what they do.",
      "These are startup villages, regenerative communities, eco-developments, retreat centers and education " +
        "campuses. Every member land project co-owns, through the cooperative, a piece of each project the " +
        "treasury backs.",
    ],
    chips: [
      "Housing (memberships, leases)",
      "Agriculture (farms, food forests)",
      "Education (workshops, courses)",
      "Retreats (eco-tourism, wellness)",
      "Ecological credits (emerging)",
    ],
    note:
      "Once the treasury has partnered with strong existing projects, members may choose to buy land outright " +
      "and build new regenerative communities from the ground up.",
  },
  {
    share: 30,
    title: "Alliance organizations",
    icon: Network,
    color: "#d4a574",
    lead: "The organizations that build what land projects need",
    body: [
      "Operating businesses with customers that build the infrastructure regenerative communities run on.",
      "Land projects hire alliance organizations first, so money stays in the network. As land projects grow, " +
        "the organizations serving them grow too, and the cooperative that holds a stake in both grows stronger.",
    ],
    chips: [
      "Housing",
      "Energy",
      "Governance tools",
      "Waste to resource",
      "Education",
      "Legal and financial",
      "Technology",
    ],
  },
  {
    share: 10,
    title: "Innovation",
    icon: Sparkles,
    color: "#ffd700",
    lead: "Young companies building tools for the transition",
    body: ["Companies with proven revenue that are ready to scale tools land projects use."],
    chips: ["AgTech", "Climate tech", "PropTech", "FinTech", "GovTech"],
  },
];

const IMPACT_TARGETS: { value: string; label: string; desc: string }[] = [
  { value: "3,000+", label: "Acres", desc: "moved to regenerative management" },
  { value: "30,000+", label: "Tons of CO2", desc: "stored over 10 years" },
  { value: "75+", label: "Rural jobs", desc: "at living wages" },
  { value: "1.5B+", label: "Gallons of water", desc: "conserved each year" },
  { value: "20+", label: "Communities", desc: "supported with alliance infrastructure" },
  { value: "500+", label: "Families", desc: "living regeneratively" },
];

const VERIFICATION = [
  "Impact measured with established frameworks (HEIST, IRIS+, GRI or equivalent)",
  "Independent verification each year, by auditors chosen at formation",
  "Seasonal impact reports alongside the financial statements",
  "Verified figures recorded on-chain, where anyone can check them",
  "Community-reported data checked by alliance organizations",
];

const THEORY_OF_CHANGE = [
  "Capital pooled",
  "Land projects backed",
  "Regenerative practice scaled",
  "Healthier land and communities",
  "The network grows",
  "More projects join",
  "A regenerative economy takes root",
];

const SPREAD: { title: string; body: string }[] = [
  { title: "Geography", body: "Many continents and climate zones. The treasury has no presence in any country today." },
  { title: "Stage", body: "Mostly operating, growing projects at first; new builds later." },
  { title: "Income", body: "Housing, agriculture, education and retreats, balanced across the network." },
  { title: "Size", body: "From 5-acre intensive sites to 5,000+ acre regenerative farms." },
  { title: "Community type", body: "Villages, retreat centers, education campuses and co-living." },
];

const STANDARDS = [
  "At least 2 years of operation, for the first projects",
  "A clear governance structure and community agreements",
  "A working financial model with more than one source of income",
  "Regenerative practice, confirmed by alliance partners",
  "Alignment with the network's values and ways of coordinating",
];

const REVIEW_STEPS: { title: string; body: string }[] = [
  { title: "First look", body: "Fit with the alliance, operating status and financial health." },
  { title: "Site visit", body: "The team, the health of the community and the quality of the land." },
  { title: "Financial review", body: "Income, costs and plans for growth." },
  { title: "Impact check", body: "Regenerative practice confirmed by alliance partners." },
  { title: "Council review", body: "Domain experts look at the fit." },
  { title: "Member vote", body: "Members decide, one member, one vote, under the bylaws they adopt." },
];

const RISK_QA: { q: string; a: string }[] = [
  {
    q: "If a land project struggles to earn",
    a:
      "The treasury starts with projects that already operate and earn. The alliance supports them, the quality " +
      "standards screen them, and spreading across many projects means one struggling project doesn't sink the rest.",
  },
  {
    q: "If a project doesn't reach maturity",
    a:
      "The land is the floor. Every month the treasury holds a stake in a project is a month of planting fruiting " +
      "trees, building soil and infrastructure, and growing community. If a project can't carry on, the land is " +
      "still there, and the people from that project are welcome in other projects across the network, where they " +
      "keep contributing.",
  },
  {
    q: "If crypto markets fall",
    a:
      "The treasury is built on land and working communities, and blockchain is a coordination tool for it. If the " +
      "technology disappeared tomorrow, the land projects would still be there and still be running.",
  },
  {
    q: "If rules change for on-chain governance",
    a:
      "Legal structures come first, and on-chain governance is a coordination layer on top of them. If we had to " +
      "set the blockchain tools aside, the cooperative would run through conventional administration, with more " +
      "paperwork and less transparency.",
  },
  {
    q: `If the treasury never reaches ${COOP.loiThreshold}`,
    a: "Then it doesn't launch, and no money has moved. A letter of intent is not binding.",
  },
  {
    q: "If you need your money back",
    a:
      "Capital in land works over years. How and when a member can take capital back out will be set in the " +
      "bylaws, to meet the legal and regulatory needs of the funders. Sign with a long horizon in mind.",
  },
];

const RISK_ROWS: string[][] = [
  ["Market", "Land values fall", "Spread across many places; the land itself is the floor"],
  ["Operations", "A project fails", "Alliance support, quality standards, and proven projects first"],
  ["Regulation", "Land use or digital asset rules change", "Spread across jurisdictions; legal structures first; local counsel"],
  ["Long horizon", "Capital is committed for years", "Withdrawal terms set in the bylaws; signers decide at the founding gathering"],
  ["Governance", "Decisions take time", "A clear proposal process, one member one vote, and an on-chain record"],
  ["Ecological credits", "Credit markets swing", "Counted as a bonus; the plan works without them"],
  ["Technology", "Blockchain tools fail", "Conventional administration as a backup; legal structures stand on their own"],
  ["Currency", "Money held in many currencies", "Natural balance across countries; local entities hold local currency"],
];

const OPERATING_ROWS: string[][] = [
  ["Governance platform", "Base (Coinbase's blockchain) and Hypha"],
  ["Legal counsel", "Counsel experienced in cooperatives, digital assets and land (to be announced)"],
  ["Community and land management", "Regional operators and community stewards"],
  ["Impact verification", "Third-party measurement, chosen at formation"],
  ["Treasury administration", "An experienced administrator, to be chosen"],
  ["Alliance network", "The organizations of the ReGen Civics alliance"],
];

const COMPARE_HEAD = ["", "Traditional impact fund", "Typical land fund", COOP.name];
const COMPARE_ROWS: string[][] = [
  ["What it backs", "Public stocks or bonds", "Farmland only", "Land projects and the organizations that serve them"],
  ["Who owns it", "Outside shareholders", "The fund's investors", "Its members"],
  ["Say in decisions", "None", "A limited advisory role", "One member, one vote"],
  ["Impact checks", "Self-reported ESG scores", "Organic certification", "On-chain and third-party verified (planned)"],
  ["Transparency", "Quarterly PDF reports", "Annual statements", "Live on-chain records (planned)"],
  ["Reach", "Global public markets", "One country or region", "Many countries, one coordination layer"],
  ["How projects relate", "Separate holdings", "Separate holdings", "Land projects co-own each other"],
];

const GOOD_FIT = [
  "Funders who want measurable regeneration on real land",
  "Land projects ready to pool resources with other projects",
  "Family offices and foundations thinking in generations",
  "People at home with both traditional finance and blockchain tools",
  "People who want a vote, and want to use it",
  "Anyone excited to build coordination infrastructure early",
];

const NOT_A_FIT = [
  "Anyone who needs their money back within 5 to 7 years",
  "Anyone uncomfortable with blockchain tools",
  "Anyone who needs a guaranteed outcome",
  "Anyone who wants to hand over money and never think about it again",
];

const STAGE_ONE = [
  { title: "Discovery", body: "Read this page, explore the governance docs and book a call." },
  { title: "Sign a letter of intent", body: "Name an amount. It's not binding and no money moves." },
  { title: "Conversations", body: "Calls with Rieki and the council." },
  { title: "Due diligence", body: "Ask questions, and visit land projects if you'd like." },
  { title: "Confirm or adjust", body: "Change your amount any time before the founding gathering." },
];

const STAGE_THREE = [
  { title: "Join", body: "Sign the membership agreement under the adopted bylaws, and choose any earmarks." },
  { title: "Contribute", body: "Only now does money move, into an account the founding members choose." },
  { title: "Take your seat", body: "Your vote in the cooperative, one member, one vote." },
  { title: "See it all", body: "The treasury's land projects and decisions, on an on-chain record." },
  { title: "Join the network", body: "Alliance channels, monthly calls and the community." },
];

const OVER_TIME: { period: string; text: string }[] = [
  { period: "Year 1: first projects", text: "Members vote the treasury into its first 15 to 25 land projects. Seasonal updates to every member." },
  { period: "Years 2 to 3: the network grows", text: "Projects build and earn, alliance organizations join, and members review how it's working." },
  { period: "Years 4 to 7: more projects, more members", text: "New members join, and earlier projects help newer ones get started." },
  { period: "Year 7 and on: a living network", text: "Land projects in many countries co-owning each other, held for the long term." },
];

const VISION: { title: string; body: string }[] = [
  {
    title: "For land projects",
    body:
      "Hundreds of regenerative land projects co-own each other through the cooperative. A new project joins and " +
      "inherits the tools, the relationships and the support of everyone who came before it.",
  },
  {
    title: "For communities",
    body:
      "Thousands of regenerative villages, all supported by alliance infrastructure. Modular hempcrete houses that " +
      "scale and heal land. Solar from alliance energy partners. Governance tools from alliance builders. Every " +
      "service keeps money circulating in the regenerative economy.",
  },
  {
    title: "For the planet",
    body:
      "Millions of acres moved from degradation to regeneration. Carbon stored in soil, biodiversity restored, water " +
      "cycles healed. Coordination makes regeneration the most valuable use of land.",
  },
  {
    title: "For the members",
    body:
      "Members govern a network coordinating regeneration around the world, one member, one vote. The treasury they " +
      "pooled is still at work, holding land for the generations after them.",
  },
];

// =============================================
// REUSABLE COMPONENTS
// =============================================

/**
 * Status bar under the page header. Full width at the top of the page on
 * tablet and desktop, then a small pill once the reader scrolls. Hidden on
 * phones: there the mobile table of contents carries the same link in its own
 * row, and the full bar used to sit on top of it for the first 200px.
 */
function CoopStatusBanner() {
  const [minimized, setMinimized] = useState(false);

  const handleScroll = useCallback(() => {
    setMinimized(window.scrollY > 200);
  }, []);

  useThrottledScroll(handleScroll);

  if (minimized) {
    return (
      <div className="hidden md:block fixed top-[73px] right-4 z-40">
        <Link
          href={LOI_HREF}
          className="bg-gradient-to-r from-[#d4a574] to-[#ffd700] text-[#1a472a] px-4 py-2 rounded-full font-bold text-sm shadow-[0_0_15px_rgba(255,215,0,0.4)] hover:shadow-[0_0_20px_rgba(255,215,0,0.6)] transition-all flex items-center gap-2"
          style={{ fontFamily: "var(--font-accent)" }}
        >
          <FileSignature className="w-4 h-4" aria-hidden="true" />
          Sign a letter of intent
        </Link>
      </div>
    );
  }

  return (
    <div className="hidden md:block fixed top-[73px] left-0 right-0 z-40 bg-gradient-to-r from-[#d4a574] via-[#ffd700] to-[#d4a574] border-b-2 border-[#ffd700]/50 shadow-[0_4px_15px_rgba(255,215,0,0.3)]">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-center gap-4 text-[#1a472a]">
          <p className="flex items-center gap-2 font-bold text-base">
            <span className="w-2.5 h-2.5 rounded-full bg-[#1a472a] flex-shrink-0" aria-hidden="true" />
            {COOP.treasuryLabel}: {COOP.statusLabel}, launches at {COOP.loiThreshold} in letters of intent
          </p>
          <span className="text-[#1a472a]" aria-hidden="true">|</span>
          <Link
            href={LOI_HREF}
            className="inline-flex items-center bg-[#1a472a] hover:bg-[#0d2818] text-white text-sm px-3 py-1 rounded-md font-medium transition-colors"
          >
            Sign a letter of intent
          </Link>
        </div>
      </div>
    </div>
  );
}

function SectionHeading({ icon: Icon, children }: { icon: LucideIcon; children: ReactNode }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <Icon className="w-6 h-6 text-[#7dd87d] flex-shrink-0" aria-hidden="true" />
      <h2 className="text-xl md:text-2xl font-bold text-white" style={DISPLAY}>
        {children}
      </h2>
    </div>
  );
}

/** A section opening with an illustration and its heading laid over the bottom edge. */
function ImageHeader({
  src,
  alt,
  title,
  width,
  height,
  crop = false,
}: {
  src: string;
  alt: string;
  title: string;
  width: number;
  height: number;
  /** Portrait art: show a landscape band of it so it doesn't fill the screen. */
  crop?: boolean;
}) {
  return (
    <div className="relative rounded-2xl overflow-hidden mb-6">
      <img
        src={src}
        alt={alt}
        className={`w-full rounded-2xl border border-[#7dd87d]/20 ${crop ? "aspect-[4/3] md:aspect-[16/9] object-cover object-center" : "object-contain"}`}
        width={width}
        height={height}
        loading="lazy"
        decoding="async"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-[#0d2818]/90 via-transparent to-transparent rounded-2xl" />
      <div className="absolute bottom-0 left-0 right-0 p-5 md:p-8">
        <h2 className="text-xl md:text-2xl font-bold text-white" style={DISPLAY}>
          {title}
        </h2>
      </div>
    </div>
  );
}

function CheckList({ items, icon: Icon = CheckCircle2, iconClass = "text-[#7dd87d]" }: { items: string[]; icon?: LucideIcon; iconClass?: string }) {
  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <li key={item} className="flex items-start gap-2 text-sm text-white/85 leading-relaxed">
          <Icon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${iconClass}`} aria-hidden="true" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

/**
 * A table on tablet and desktop, stacked cards on phones, so nothing scrolls
 * sideways on a narrow screen. The first column names each row. When
 * highlightLast is set, the last column is the cooperative's and reads green.
 */
function ResponsiveTable({
  head,
  rows,
  caption,
  highlightLast = false,
}: {
  head: string[];
  rows: string[][];
  caption: string;
  highlightLast?: boolean;
}) {
  const last = head.length - 1;
  return (
    <>
      <table className="hidden md:table w-full border-collapse text-sm">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr className="border-b border-[#7dd87d]/40">
            {head.map((h, i) => (
              <th
                key={`${h}-${i}`}
                scope="col"
                className={`text-left py-2 px-3 font-semibold ${highlightLast && i === last ? "text-[#7dd87d]" : "text-white/80"}`}
              >
                {h || <span className="sr-only">Row</span>}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row[0]} className="border-b border-white/10 align-top">
              {row.map((cell, i) =>
                i === 0 ? (
                  <th key={i} scope="row" className="text-left py-2 px-3 font-semibold text-white/90">
                    {cell}
                  </th>
                ) : (
                  <td
                    key={i}
                    className={`py-2 px-3 ${highlightLast && i === last ? "text-[#7dd87d] font-semibold" : "text-white/80"}`}
                  >
                    {cell}
                  </td>
                ),
              )}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="md:hidden space-y-3">
        {rows.map((row) => (
          <div key={row[0]} className="rounded-xl p-4 border border-white/15 bg-white/5">
            <h3 className="font-bold text-white text-sm mb-2">{row[0]}</h3>
            <dl className="space-y-1.5 text-sm">
              {row.slice(1).map((cell, j) => {
                const col = j + 1;
                return (
                  <div key={col}>
                    <dt className={`text-xs ${highlightLast && col === last ? "text-[#7dd87d]" : "text-white/75"}`}>{head[col]}</dt>
                    <dd className={highlightLast && col === last ? "text-[#7dd87d] font-semibold" : "text-white/85"}>{cell}</dd>
                  </div>
                );
              })}
            </dl>
          </div>
        ))}
      </div>
    </>
  );
}

// Inline FAQ item. The closed answer is inert, so a link inside it is out of
// the tab order until the question is opened.
function FAQItem({ question, children }: { question: string; children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const panelId = useId();
  return (
    <div className="border-b border-white/10 last:border-b-0">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-controls={panelId}
        className="w-full min-h-[44px] py-4 flex items-start justify-between text-left hover:text-[#7dd87d] transition-colors gap-3"
      >
        <span className="font-semibold text-white text-[15px] md:text-base leading-relaxed">{question}</span>
        <span className={`transform transition-transform duration-300 flex-shrink-0 mt-1 ${isOpen ? "rotate-180" : ""}`}>
          <ChevronDown className="w-4 h-4 text-[#7dd87d]" aria-hidden="true" />
        </span>
      </button>
      <div
        id={panelId}
        inert={!isOpen}
        className={`transition-all duration-400 ease-in-out overflow-hidden ${isOpen ? "max-h-[2000px] opacity-100 pb-4" : "max-h-0 opacity-0"}`}
      >
        <div className="text-white/80 text-sm md:text-[15px] leading-relaxed space-y-3 safe-prose min-w-0">{children}</div>
      </div>
    </div>
  );
}

// Glowing divider
function GlowDivider() {
  return (
    <div className="my-10 md:my-14 flex items-center justify-center" aria-hidden="true">
      <div className="h-px flex-1 bg-gradient-to-r from-transparent via-[#7dd87d]/30 to-transparent" />
      <div className="mx-4 w-2 h-2 rounded-full bg-[#7dd87d]/50 shadow-[0_0_8px_rgba(125,216,125,0.5)]" />
      <div className="h-px flex-1 bg-gradient-to-r from-transparent via-[#7dd87d]/30 to-transparent" />
    </div>
  );
}

// Magnetic call-to-action button. Holds still for readers who ask for less motion.
function MagneticCTAButton() {
  const btnRef = useRef<HTMLAnchorElement>(null);
  const reducedMotion = useReducedMotion();

  const handleMouseMove = (e: ReactMouseEvent<HTMLAnchorElement>) => {
    if (reducedMotion || !btnRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    const dx = (e.clientX - (rect.left + rect.width / 2)) * 0.15;
    const dy = (e.clientY - (rect.top + rect.height / 2)) * 0.15;
    btnRef.current.style.transform = `translate(${dx}px, ${dy}px)`;
  };

  const handleMouseLeave = () => {
    if (!btnRef.current) return;
    btnRef.current.style.transform = "translate(0, 0)";
  };

  return (
    <Link
      ref={btnRef}
      href={LOI_HREF}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ transition: "transform 0.2s ease, box-shadow 0.2s ease" }}
      className="inline-flex items-center justify-center gap-2 min-h-[44px] bg-gradient-to-r from-[#d4a574] to-[#ffd700] text-[#1a472a] font-bold px-6 py-3 rounded-xl text-base hover:shadow-[0_0_20px_rgba(255,215,0,0.4)]"
    >
      <FileSignature className="w-5 h-5" aria-hidden="true" />
      Sign a letter of intent
    </Link>
  );
}

/**
 * Email signup. Subscribes to the ReGen Civics newsletter, which is double
 * opt-in: the server sends a confirmation email and the address stays pending
 * until it is clicked, so success here means "check your inbox".
 */
function CoopUpdates() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);
  const subscribeMutation = trpc.newsletter.subscribe.useMutation({
    onSuccess: () => setDone(true),
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!email) return;
    subscribeMutation.mutate({ email, name: name || undefined, source: "other" });
  };

  return (
    <AnimatedSection animation="slide-up">
      <div className="mb-10 rounded-2xl border border-[#7dd87d]/20 bg-white/[0.03] p-6 md:p-8 hover:border-[#7dd87d]/40 transition-colors">
        <div className="flex items-center gap-2 mb-2">
          <Mail className="w-5 h-5 text-[#7dd87d]" aria-hidden="true" />
          <h3 className="font-bold text-white text-lg" style={DISPLAY}>
            Treasury updates
          </h3>
        </div>
        <p className="text-white/80 text-sm mb-4">
          We share news about the cooperative treasury, and how close it is to launch, in the ReGen Civics newsletter.
        </p>
        {done ? (
          <p className="text-[#7dd87d] text-sm font-semibold" role="status">
            Check your email to confirm your subscription.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              placeholder="Your name (optional)"
              aria-label="Your name (optional)"
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="flex-1 min-h-[44px] bg-white/10 border border-white/45 rounded-lg px-3 py-2 text-white placeholder:text-white/60 text-base sm:text-sm focus:outline-none focus:border-[#7dd87d]/50"
            />
            <input
              type="email"
              placeholder="your@email.com"
              aria-label="Email address for treasury updates"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="flex-1 min-h-[44px] bg-white/10 border border-white/45 rounded-lg px-3 py-2 text-white placeholder:text-white/60 text-base sm:text-sm focus:outline-none focus:border-[#7dd87d]/50"
            />
            <button
              type="submit"
              disabled={subscribeMutation.isPending}
              className="min-h-[44px] bg-[#7dd87d] text-[#1a472a] font-bold px-5 py-2 rounded-lg text-sm hover:bg-[#9de89d] transition-colors whitespace-nowrap disabled:opacity-70"
            >
              {subscribeMutation.isPending ? "Sending..." : "Get updates"}
            </button>
          </form>
        )}
        {subscribeMutation.isError && !done && (
          <p className="text-red-300 text-sm mt-2" role="alert">
            That didn't go through. Please try again in a moment.
          </p>
        )}
      </div>
    </AnimatedSection>
  );
}

// =============================================
// MAIN COMPONENT
// =============================================

export default function Opportunity() {
  const isDesktop = useMediaQuery("(min-width: 1024px)");

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0d2818] via-[#1a472a] to-[#0d2818]">
      <SEO {...pageSEO.opportunity} breadcrumbs={BREADCRUMBS} />
      {isDesktop ? (
        <TableOfContents sections={SECTIONS} />
      ) : (
        <MobileTableOfContents sections={SECTIONS} actions={MOBILE_ACTIONS} />
      )}

      {/* Fixed header. 44px targets on phones; the tighter padding there keeps
          the bar the same 56px height the mobile contents are pinned under. */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#1a472a]/95 backdrop-blur-md border-b border-[#ffd700]/30">
        <div className="container mx-auto px-4 py-1.5 md:py-3 flex items-center justify-between">
          <Link
            href="/"
            aria-label="Home"
            className="inline-flex items-center justify-center gap-2 min-h-[44px] min-w-[44px] md:min-h-0 md:min-w-0 text-white hover:text-[#ffd700] transition-colors"
          >
            <ArrowLeft className="w-5 h-5" aria-hidden="true" />
            <span className="font-medium hidden sm:inline">Home</span>
          </Link>
          <Button
            asChild
            variant="outline"
            size="sm"
            className="rounded-xl border-2 border-[#7dd87d]/50 text-[#7dd87d] hover:bg-[#7dd87d]/10 min-h-[44px] min-w-[44px] md:min-h-0 md:min-w-0"
          >
            <a href={CALL_URL} target="_blank" rel="noopener noreferrer" aria-label="Book a call">
              <Calendar className="w-4 h-4 sm:mr-2" aria-hidden="true" />
              <span className="hidden sm:inline">Book a call</span>
            </a>
          </Button>
        </div>
      </header>

      <CoopStatusBanner />

      {/* Main Content */}
      <section className="pt-28 md:pt-24 pb-16">
        <div className="container mx-auto px-4">
          {/* On large screens, shift content left to make room for TOC sidebar (w-72 + 2rem gap = ~320px) */}
          <div className="max-w-4xl mx-auto lg:mr-80 xl:mr-80 min-w-0">

            {/* ===== HERO ===== */}
            <AnimatedSection animation="slide-up">
              <div className="hero-grain relative text-center mb-12 rounded-2xl py-6">
                <div className="relative z-10 flex flex-col items-center">
                  <span className="inline-flex items-center gap-2 px-4 py-1.5 mb-5 rounded-full border border-[#7dd87d]/40 bg-[#7dd87d]/10 text-[#7dd87d] text-xs font-bold uppercase tracking-[0.2em]">
                    <span className="w-2 h-2 rounded-full bg-[#7dd87d]" aria-hidden="true" />
                    {COOP.statusLabel}
                  </span>
                  <p className="text-xs md:text-sm uppercase tracking-[0.2em] text-[#d4a574] mb-3">{COOP.name}</p>
                  <h1 className="text-3xl md:text-5xl font-bold text-white mb-5 leading-tight" style={DISPLAY}>
                    {COOP.tagline}
                  </h1>
                  <p className="text-base md:text-xl text-white/90 max-w-3xl mx-auto leading-relaxed safe-prose">
                    {COOP.statement}
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3 justify-center mt-7 w-full sm:w-auto">
                    <Link
                      href={LOI_HREF}
                      className="inline-flex items-center justify-center gap-2 min-h-[44px] bg-gradient-to-r from-[#d4a574] to-[#ffd700] text-[#1a472a] font-bold px-6 py-3 rounded-xl text-base hover:shadow-[0_0_20px_rgba(255,215,0,0.4)] transition-shadow"
                    >
                      <FileSignature className="w-5 h-5" aria-hidden="true" />
                      Sign a letter of intent
                    </Link>
                    <a
                      href="#co-ownership"
                      className="inline-flex items-center justify-center gap-2 min-h-[44px] border-2 border-[#7dd87d]/60 text-[#7dd87d] hover:bg-[#7dd87d]/10 font-semibold px-6 py-3 rounded-xl text-base transition-colors"
                    >
                      How co-ownership works
                      <ArrowRight className="w-4 h-4" aria-hidden="true" />
                    </a>
                  </div>
                </div>
              </div>
            </AnimatedSection>

            {/* ===== WHERE IT STANDS =====
                Above the fold, on purpose: the most honest sentence on the page
                is the first thing after the hero. */}
            <section id="where-it-stands" className={SECTION_CLASS}>
              <AnimatedSection animation="slide-up">
                <div className="bg-[#0d2818] border-2 border-[#7dd87d]/40 rounded-2xl p-5 md:p-6">
                  <div className="flex items-center gap-2 mb-3">
                    <Signpost className="w-5 h-5 text-[#7dd87d] flex-shrink-0" aria-hidden="true" />
                    <h2 className="text-base font-bold text-[#7dd87d] uppercase tracking-wider" style={DISPLAY}>
                      Where it stands
                    </h2>
                  </div>
                  <p className="text-white text-[15px] md:text-base leading-relaxed font-semibold safe-prose">{COOP.launch}</p>
                  <p className="text-white/85 text-sm md:text-[15px] leading-relaxed mt-3 safe-prose">{COOP.whereItStands}</p>
                  <ol className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-5">
                    {PATH.map((step) => (
                      <li
                        key={step.label}
                        aria-current={step.current ? "step" : undefined}
                        className={`rounded-xl p-4 border ${step.current ? "border-[#ffd700]/50 bg-[#ffd700]/5" : "border-white/15 bg-white/5"}`}
                      >
                        <span className={`text-xs font-bold uppercase tracking-wider ${step.current ? "text-[#ffd700]" : "text-[#7dd87d]"}`}>
                          {step.label}
                          {step.current && <span className="sr-only"> (current step)</span>}
                        </span>
                        <p className="text-white/85 text-sm mt-2 leading-relaxed">{step.text}</p>
                      </li>
                    ))}
                  </ol>
                  <p className="text-white/75 text-sm leading-relaxed mt-5 safe-prose">{COOP.entities}</p>
                </div>
              </AnimatedSection>
            </section>

            {/* ===== WHERE THIS COMES FROM ===== */}
            <section id="lineage" className={SECTION_CLASS}>
              <AnimatedSection animation="slide-up">
                <SectionHeading icon={History}>{COOP_LINEAGE_HEADING}</SectionHeading>
                <p className="text-white/80 text-sm md:text-[15px] leading-relaxed mb-6 safe-prose">
                  SEEDS, Hypha and the ReGen Civics seasons happened. The treasury has no record of its own yet, because
                  it is still in formation.
                </p>
                <ol className="relative pl-6 border-l border-[#7dd87d]/30 space-y-6">
                  {LINEAGE.map((item) => (
                    <li key={item.label} className="relative">
                      <span
                        className="absolute -left-[34.5px] top-4 w-5 h-5 rounded-full border-2 border-[#7dd87d] bg-[#0d2818] flex items-center justify-center"
                        aria-hidden="true"
                      >
                        <span className="w-2 h-2 rounded-full bg-[#7dd87d]" />
                      </span>
                      <div className="rounded-xl p-4 border border-white/15 bg-white/5">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-[#7dd87d]">{item.label}</h3>
                        <p className="text-white/80 text-sm mt-1 leading-relaxed">{item.text}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              </AnimatedSection>
            </section>

            {/* ===== WHAT THE ALLIANCE IS ===== */}
            <section id="alliance" className={SECTION_CLASS}>
              <AnimatedSection animation="slide-up">
                <ImageHeader
                  src="/images/opportunity/opp-alliance-ecosystem.webp"
                  alt="Illustration of land projects, homes and gardens linked by glowing roots into one living network"
                  title="What the alliance is"
                  width={1920}
                  height={1072}
                />
                <p className={`${P} mb-5`}>The ReGen Civics alliance is three things:</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {ALLIANCE_PARTS.map((part) => {
                    const Icon = part.icon;
                    return (
                      <div key={part.title} className={CARD}>
                        <div className="w-10 h-10 rounded-full bg-[#7dd87d]/20 flex items-center justify-center mb-3">
                          <Icon className="w-5 h-5 text-[#7dd87d]" aria-hidden="true" />
                        </div>
                        <h3 className="font-bold text-white text-base mb-1" style={DISPLAY}>
                          {part.title}
                        </h3>
                        <p className="text-white/80 text-sm leading-relaxed">{part.body}</p>
                      </div>
                    );
                  })}
                </div>
                <p className="text-white/80 text-sm mt-4 text-center safe-prose">
                  When we say "the alliance", we mean all of it together: the treasury, the land projects and the
                  partner organizations.
                </p>
              </AnimatedSection>
            </section>

            {/* ===== PROPOSED TREASURY SNAPSHOT =====
                id="terms" is linked from investor emails sent before 2026-09-27.
                The true answer to "terms" is still this box: every value here is
                proposed, and the terms are set at the founding gathering. */}
            <section id="terms" className={SECTION_CLASS}>
              <AnimatedSection animation="scale-in">
                <div className="bg-gradient-to-br from-[#1a472a] to-[#0d2818] border-2 border-[#7dd87d]/40 rounded-2xl p-5 md:p-6 shadow-[0_0_30px_rgba(125,216,125,0.08)]">
                  <div className="flex items-center gap-2 mb-3 justify-center">
                    <BarChart3 className="w-5 h-5 text-[#7dd87d]" aria-hidden="true" />
                    <h2 className="text-base font-bold text-[#7dd87d] uppercase tracking-wider" style={DISPLAY}>
                      Proposed treasury snapshot
                    </h2>
                  </div>
                  <p className="text-center text-sm text-[#e8c9a3] mb-4 safe-prose">
                    Every value here is proposed. The terms are set with counsel at the founding gathering.
                  </p>
                  <dl className="grid grid-cols-2 md:grid-cols-4 gap-px bg-white/15 rounded-xl overflow-hidden">
                    {SNAPSHOT.map((item) => (
                      <div key={item.label} className="bg-[#14391f] p-4 text-center flex flex-col justify-start">
                        <dt className="text-[11px] md:text-xs uppercase tracking-wider text-white/75 font-semibold order-1">
                          {item.label}
                        </dt>
                        <dd className="order-2 mt-1">
                          <span className="block text-lg md:text-xl font-bold text-[#7dd87d]" style={DISPLAY}>
                            {item.value}
                          </span>
                          <span className="block text-xs text-white/75 mt-1 leading-snug">{item.note}</span>
                        </dd>
                      </div>
                    ))}
                  </dl>
                </div>
              </AnimatedSection>
            </section>

            {/* ===== HOW LAND PROJECTS CO-OWN EACH OTHER ===== */}
            <section id="co-ownership" className={SECTION_CLASS}>
              <AnimatedSection animation="slide-up">
                <ImageHeader
                  src="/images/opportunity/opp-network-effect.webp"
                  alt="Illustration of a golden current circling between a village, a workshop and a glowing tree, linking them in one loop"
                  title="How land projects co-own each other"
                  width={2752}
                  height={1536}
                />
                <div className="space-y-4 mb-6">
                  <p className={P}>
                    Most land projects stand alone today. Each one finds its own land, gathers its own people, builds its
                    own tools and learns hard lessons by itself.
                  </p>
                  <p className={P}>
                    The cooperative treasury is how we pool our resources into the network of land projects. The
                    treasury holds a shared stake in the land projects the members choose to back, and every member owns
                    a share of the cooperative. So each land project in the network co-owns a piece of every other one,
                    and each has a reason to help the others thrive.
                  </p>
                </div>
                <ol className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  {POOL_STEPS.map((step, i) => {
                    const Icon = step.icon;
                    return (
                      <li key={step.title} className={CARD}>
                        <div className="flex items-center gap-3 mb-2">
                          <span className="w-8 h-8 rounded-full bg-[#7dd87d] text-[#1a472a] flex items-center justify-center text-sm font-bold flex-shrink-0">
                            {i + 1}
                          </span>
                          <h3 className="font-bold text-white text-base flex items-center gap-2" style={DISPLAY}>
                            <Icon className="w-4 h-4 text-[#7dd87d]" aria-hidden="true" />
                            {step.title}
                          </h3>
                        </div>
                        <p className="text-white/80 text-sm leading-relaxed">{step.body}</p>
                      </li>
                    );
                  })}
                </ol>
                <h3 className={H3}>The network effect</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
                  <div className="bg-white/5 rounded-xl p-4 border border-white/20">
                    <h4 className="font-bold text-white text-sm mb-2">A land project on its own</h4>
                    <p className="text-sm text-white/80">
                      Hires outside consultants <span aria-hidden="true">&#8594;</span> money leaves the movement{" "}
                      <span aria-hidden="true">&#8594;</span> nothing is shared
                    </p>
                  </div>
                  <div className="bg-white/5 rounded-xl p-4 border border-[#7dd87d]/40">
                    <h4 className="font-bold text-[#7dd87d] text-sm mb-2">A land project in the network</h4>
                    <p className="text-sm text-white/85">
                      Hires an alliance organization <span aria-hidden="true">&#8594;</span> money stays in the network{" "}
                      <span aria-hidden="true">&#8594;</span> both grow <span aria-hidden="true">&#8594;</span> the
                      cooperative that holds a stake in both grows stronger
                    </p>
                  </div>
                </div>
                <div className="bg-[#7dd87d]/10 rounded-xl p-4 border border-[#7dd87d]/30 text-sm">
                  <p className="text-white/90 safe-prose">
                    <strong className="text-[#7dd87d]">Example:</strong> a village in Costa Rica needs solar. It hires an
                    alliance energy partner that already serves other land projects in the network. The village gets
                    specialists who understand regenerative land, the energy partner grows, and the network every member
                    co-owns gets stronger. Money keeps circulating among the land projects and the organizations that
                    serve them.
                  </p>
                </div>
              </AnimatedSection>
            </section>

            <GlowDivider />

            {/* ===== THE OPPORTUNITY ===== */}
            <section id="opportunity" className={SECTION_CLASS}>
              <AnimatedSection animation="slide-up">
                <SectionHeading icon={Sparkles}>The opportunity</SectionHeading>
                <div className="space-y-4 mb-6">
                  <p className={P}>
                    The opportunity reaches past agriculture into how people live: housing, community development,
                    infrastructure, energy, education and sustainable living. The treasury is designed to back both the{" "}
                    <strong className="text-white">land projects</strong> (startup villages, towns and micro-cities) and
                    the <strong className="text-white">alliance organizations</strong> that support them (housing,
                    infrastructure, energy, waste, governance and the other services a village needs to thrive).
                  </p>
                  <p className={P}>
                    The regenerative agriculture market is projected to grow from $9.2 billion in 2025 to $18.3 billion by
                    2031 (Mordor Intelligence, 2026). The estimated financing gap each year runs between $200 and $450
                    billion, and less than 5% of the capital needed is at work today.
                  </p>
                  <p className={P}>
                    BCG puts the regenerative landscapes opportunity at $310 billion (BCG, 2025). Global agrifood systems
                    need $1.1 trillion a year over the next five years (Bain &amp; Company, 2025). Closing the financing
                    gap in regenerative agriculture alone would open $4.5 trillion a year in new opportunities and avoid
                    $5.7 trillion in costs from environmental damage (AgFunder News, 2024).
                  </p>
                </div>

                <div className={`${CARD} mb-6`}>
                  <h3 className="font-bold text-white mb-3">Why the gap exists</h3>
                  <ul className="space-y-3 text-sm">
                    {GAP_REASONS.map((item) => (
                      <li key={item.title} className="flex items-start gap-3">
                        <AlertTriangle className="w-4 h-4 text-amber-300 mt-0.5 flex-shrink-0" aria-hidden="true" />
                        <p className="text-white/85 leading-relaxed">
                          <strong className="text-white">{item.title}</strong> {item.body}
                        </p>
                      </li>
                    ))}
                  </ul>
                </div>

                <h3 className={H3}>What the cooperative changes</h3>
                <p className={`${P_SMALL} mb-4`}>
                  The cooperative turns the failure rate around with an ecosystem of support: shared governance, pooled
                  resources, quality standards, and many projects held together.
                </p>
                <ResponsiveTable
                  head={["Challenge", "The cooperative's answer"]}
                  rows={SOLUTION_ROWS}
                  caption="Challenges land projects face, and the cooperative's answer to each"
                />
              </AnimatedSection>
            </section>

            {/* ===== WHY NOW ===== */}
            <section id="why-now" className={SECTION_CLASS}>
              <AnimatedSection animation="slide-up">
                <div className="bg-gradient-to-br from-amber-900/25 to-transparent rounded-2xl p-6 md:p-8 border border-[#ffd700]/25">
                  <div className="flex items-center gap-3 mb-4">
                    <Clock className="w-6 h-6 text-[#ffd700]" aria-hidden="true" />
                    <h2 className="text-xl md:text-2xl font-bold text-white" style={DISPLAY}>
                      Why now
                    </h2>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
                    {WHY_NOW.map((group) => (
                      <div key={group.title} className="bg-white/5 rounded-xl p-4 border border-white/15">
                        <h3 className="font-bold text-[#ffd700] text-sm mb-2">{group.title}</h3>
                        <ul className="space-y-1.5">
                          {group.items.map((item) => (
                            <li key={item} className="text-sm text-white/85 flex items-start gap-2">
                              <span className="text-[#ffd700] mt-0.5" aria-hidden="true">&#8226;</span>
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                  <div className="bg-[#ffd700]/10 rounded-xl p-4 border border-[#ffd700]/25">
                    <h3 className="font-bold text-[#ffd700] text-sm mb-2">Why sign early</h3>
                    <CheckList items={SIGN_EARLY} iconClass="text-[#ffd700]" />
                  </div>
                </div>
              </AnimatedSection>
            </section>

            {/* ===== HOW THE TREASURY WOULD BE USED ===== */}
            <section id="allocation" className={SECTION_CLASS}>
              <AnimatedSection animation="slide-up">
                <ImageHeader
                  src="/images/opportunity/opp-three-tier-strategy.webp"
                  alt="Illustration in three tiers: farms and villages on the ground, workshops and domes above them, and a tower of tools at the top, all linked by golden roots"
                  title="How the treasury would be used"
                  width={1792}
                  height={2400}
                  crop
                />
                <p className={`${P} mb-5`}>
                  The proposed split has three tiers, each strengthening the others. The founding members set the real
                  split.
                </p>
                <div className="mb-6" aria-hidden="true">
                  <div className="flex h-4 rounded-full overflow-hidden">
                    {TIERS.map((tier) => (
                      <div key={tier.title} style={{ width: `${tier.share}%`, backgroundColor: tier.color }} />
                    ))}
                  </div>
                </div>
                <div className="space-y-4">
                  {TIERS.map((tier) => {
                    const Icon = tier.icon;
                    return (
                      <div key={tier.title} className={CARD}>
                        <div className="flex items-center gap-3 mb-2">
                          <span
                            className="w-3 h-3 rounded-full flex-shrink-0"
                            style={{ backgroundColor: tier.color }}
                            aria-hidden="true"
                          />
                          <Icon className="w-5 h-5 text-[#7dd87d]" aria-hidden="true" />
                          <h3 className="font-bold text-white">
                            {tier.title} ({tier.share}%, proposed)
                          </h3>
                        </div>
                        <p className="text-sm font-semibold text-[#7dd87d] mb-2">{tier.lead}</p>
                        <div className="space-y-2 mb-3">
                          {tier.body.map((para) => (
                            <p key={para} className={P_SMALL}>
                              {para}
                            </p>
                          ))}
                        </div>
                        <ul className="flex flex-wrap gap-2">
                          {tier.chips.map((chip) => (
                            <li key={chip} className="bg-white/10 rounded-lg px-3 py-1.5 text-xs text-white/85">
                              {chip}
                            </li>
                          ))}
                        </ul>
                        {tier.note && <p className="text-sm text-white/80 mt-3 safe-prose">{tier.note}</p>}
                      </div>
                    );
                  })}
                </div>
              </AnimatedSection>
            </section>

            {/* ===== HOW IT'S BEING DESIGNED ===== */}
            <section id="design" className={SECTION_CLASS}>
              <AnimatedSection animation="slide-up">
                <SectionHeading icon={PencilRuler}>How it's being designed</SectionHeading>
                <p className="text-[#e8c9a3] text-sm md:text-[15px] leading-relaxed mb-6 safe-prose">
                  {COOP.designPrinciplesNote}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {COOP.designPrinciples.map((principle) => {
                    const Icon = PRINCIPLE_ICONS[principle.title] ?? CircleDot;
                    return (
                      <div
                        key={principle.title}
                        className="bg-white/5 rounded-xl p-5 border border-[#7dd87d]/20 hover:border-[#7dd87d]/40 transition-colors"
                      >
                        <div className="w-10 h-10 rounded-full bg-[#7dd87d]/20 flex items-center justify-center mb-3">
                          <Icon className="w-5 h-5 text-[#7dd87d]" aria-hidden="true" />
                        </div>
                        <h3 className="font-bold text-white text-base mb-1" style={DISPLAY}>
                          {principle.title}
                        </h3>
                        <p className="text-white/80 text-sm leading-relaxed">{principle.body}</p>
                      </div>
                    );
                  })}
                </div>
              </AnimatedSection>
            </section>

            {/* ===== IMPACT FRAMEWORK ===== */}
            <section id="impact" className={SECTION_CLASS}>
              <AnimatedSection animation="slide-up">
                <SectionHeading icon={Heart}>Impact framework</SectionHeading>
                <p className={`${P} mb-5`}>
                  Impact is designed to be measured and verified by third parties, and it sits at the center of the
                  plan: healthier land makes healthier communities. Nothing has been measured yet, because the treasury
                  has backed no projects yet.
                </p>
                <div className="bg-[#7dd87d]/10 rounded-xl p-5 border border-[#7dd87d]/30 mb-6">
                  <h3 className="font-bold text-white mb-2">Core philosophy</h3>
                  <p className="text-sm text-white/85 leading-relaxed safe-prose">
                    We focus on fundamentals: an exceptional quality of life for the people who live on our land
                    projects. Communities built on the healthiest land, growing the healthiest food and raising the
                    healthiest people draw others to them. Ecological credit markets (carbon, biodiversity, water) may
                    add income as they mature, and the plan works without them.
                  </p>
                </div>

                <h3 className={H3}>Design targets for every $50 million at work</h3>
                <ul className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
                  {IMPACT_TARGETS.map((item) => (
                    <li key={item.label} className="bg-white/5 rounded-xl p-4 border border-white/15 text-center">
                      <p className="text-lg font-bold text-[#7dd87d]" style={DISPLAY}>
                        {item.value}
                      </p>
                      <p className="text-sm font-semibold text-white/90">{item.label}</p>
                      <p className="text-xs text-white/75">{item.desc}</p>
                    </li>
                  ))}
                </ul>
                <p className="text-xs text-white/75 -mt-3 mb-6">These are design targets. The treasury has no results yet.</p>

                <h3 className={H3}>Measurement and verification (planned)</h3>
                <div className="mb-6">
                  <CheckList items={VERIFICATION} />
                </div>

                <div className={CARD}>
                  <h3 className="font-bold text-white text-sm mb-3">Theory of change</h3>
                  <ol className="flex flex-wrap items-center gap-2 text-xs">
                    {THEORY_OF_CHANGE.map((step, i) => (
                      <li key={step} className="flex items-center gap-2">
                        <span className="bg-[#7dd87d]/20 text-[#9de89d] px-2.5 py-1 rounded-full font-semibold">{step}</span>
                        {i < THEORY_OF_CHANGE.length - 1 && (
                          <ArrowRight className="w-3 h-3 text-[#7dd87d]" aria-hidden="true" />
                        )}
                      </li>
                    ))}
                  </ol>
                </div>
              </AnimatedSection>
            </section>

            {/* ===== HOW LAND PROJECTS ARE CHOSEN ===== */}
            <section id="choosing-projects" className={SECTION_CLASS}>
              <AnimatedSection animation="slide-up">
                <SectionHeading icon={Compass}>How land projects are chosen</SectionHeading>
                <h3 className={H3}>Spread across the network</h3>
                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
                  {SPREAD.map((item) => (
                    <div key={item.title} className="bg-white/5 rounded-lg p-3 border border-white/15 text-sm">
                      <dt className="font-semibold text-[#7dd87d] inline">{item.title}: </dt>
                      <dd className="text-white/85 inline">{item.body}</dd>
                    </div>
                  ))}
                </dl>

                <h3 className={H3}>Quality standards</h3>
                <p className={`${P_SMALL} mb-2`}>Every land project the treasury backs shows:</p>
                <div className="mb-6">
                  <CheckList items={STANDARDS} />
                </div>

                <h3 className={H3}>Where projects come from, and how they're reviewed</h3>
                <p className={`${P_SMALL} mb-4`}>
                  Land projects come to the network through the ReGen Civics seasons and incubator, and through
                  relationships built over the SEEDS and Hypha years.
                </p>
                <ol className="space-y-2 mb-6">
                  {REVIEW_STEPS.map((step, i) => (
                    <li key={step.title} className="flex items-start gap-3 text-sm">
                      <span className="w-7 h-7 rounded-full bg-[#7dd87d]/20 text-[#9de89d] flex items-center justify-center flex-shrink-0 text-xs font-bold">
                        {i + 1}
                      </span>
                      <p className="pt-1">
                        <strong className="text-white">{step.title}:</strong>{" "}
                        <span className="text-white/85">{step.body}</span>
                      </p>
                    </li>
                  ))}
                </ol>

                <div className={CARD}>
                  <h3 className="font-bold text-white mb-2">Earmarking (proposed)</h3>
                  <p className={`${P_SMALL} mb-2`}>
                    Funders could direct up to 90% of what they put in toward a specific land project, with at least 10%
                    staying in the shared treasury. If the project passes review and the member vote, the money goes to
                    it.
                  </p>
                  <p className={P_SMALL}>
                    If an earmarked project doesn't pass, most of the money would come back, and 3% or $20,000 (whichever
                    is less) would cover the cost of the review. Like every figure here, the founding members set it, and
                    none of it applies until the treasury forms.
                  </p>
                </div>
              </AnimatedSection>
            </section>

            {/* ===== WHAT COULD GO WRONG ===== */}
            <section id="risks" className={SECTION_CLASS}>
              <AnimatedSection animation="slide-up">
                <SectionHeading icon={Shield}>What could go wrong</SectionHeading>
                <p className={`${P} mb-5`}>Nothing here is promised. Here are the risks, and what the design does about them.</p>
                <div className="space-y-3 mb-6">
                  {RISK_QA.map((item) => (
                    <div key={item.q} className="bg-white/5 rounded-xl p-4 border border-white/15">
                      <h3 className="font-bold text-amber-200 text-sm mb-1.5">{item.q}</h3>
                      <p className={P_SMALL}>{item.a}</p>
                    </div>
                  ))}
                </div>

                <h3 className={H3}>Risks at a glance</h3>
                <ResponsiveTable
                  head={["Risk", "What could happen", "What the design does"]}
                  rows={RISK_ROWS}
                  caption="Risks to the cooperative treasury and how the design responds to each"
                />
                <p className="text-sm text-white/80 mt-4 safe-prose">
                  This is not a complete list of risks. The founding documents will carry the full discussion before
                  anyone commits.{" "}
                  <Link href="/disclaimers" className="text-[#7dd87d] underline underline-offset-2 hover:text-[#ffd700]">
                    Read the disclaimers
                  </Link>
                </p>

                <div className="mt-6 bg-[#0d2818]/70 border border-[#7dd87d]/30 rounded-2xl p-5 md:p-6">
                  <h3 className="text-base md:text-lg font-bold text-white mb-2" style={DISPLAY}>
                    Regeneration is our foundation
                  </h3>
                  <p className="text-white/85 text-sm md:text-base leading-relaxed safe-prose">
                    The treasury owns no land today. Once it holds a stake in a project, every month of holding it is a
                    month of doing the work: planting fruiting trees, healing soil, building infrastructure, making the
                    land more abundant. If one project can't carry on, the land is still there, and the work done on it
                    stays in it. The land itself is the floor.
                  </p>
                </div>
              </AnimatedSection>
            </section>

            {/* ===== TEAM AND OPERATING MODEL ===== */}
            <section id="team" className={SECTION_CLASS}>
              <AnimatedSection animation="slide-up">
                <SectionHeading icon={Users}>Team and operating model</SectionHeading>
                <h3 className={H3}>Leadership</h3>
                <div className={`${CARD} mb-6`}>
                  <h4 className="font-bold text-white mb-1">Rieki Cordon, Catalyst</h4>
                  <p className={`${P_SMALL} mb-3`}>
                    Co-founder of SEEDS and Hypha, with a decade of experience building regenerative economic systems,
                    decentralized governance frameworks and impact-focused financial infrastructure. Led the design of
                    new financial tools serving 10,000+ people in regenerative communities across 40+ countries, over a
                    7-year exploration of decentralized governance.
                  </p>
                  <p className="text-sm text-white/80 safe-prose">
                    Role: setting up the initial conditions of the coordination infrastructure. The{" "}
                    <Link href="/governance" className="text-[#7dd87d] underline underline-offset-2 hover:text-[#ffd700]">
                      governance page
                    </Link>{" "}
                    shows how decisions are made today.
                  </p>
                </div>

                <h3 className={H3}>Operating model</h3>
                <p className={`${P_SMALL} mb-4`}>
                  At launch the network works with specialist partners and keeps its own staff small.
                </p>
                <div className="mb-6">
                  <ResponsiveTable
                    head={["Function", "Partner"]}
                    rows={OPERATING_ROWS}
                    caption="Who carries each function of the cooperative treasury"
                  />
                </div>

                <h3 className={H3}>Members govern together</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                  <div className="bg-white/5 rounded-xl p-4 border border-white/15">
                    <h4 className="font-bold text-white text-sm mb-1">One member, one vote</h4>
                    <p className={P_SMALL}>
                      Every member holds the same vote, whatever they put in: land projects and people alike. Members
                      vote on which land projects the treasury backs, on major sales and on the network's direction.
                    </p>
                  </div>
                  <div className="bg-white/5 rounded-xl p-4 border border-white/15">
                    <h4 className="font-bold text-white text-sm mb-1">A board that rotates</h4>
                    <p className={P_SMALL}>
                      Members elect a small board that rotates, and the network hires the people who run the day-to-day
                      work. You can delegate your vote to someone you trust.
                    </p>
                  </div>
                </div>
                <div className={CARD}>
                  <h4 className="font-bold text-white text-sm mb-1">Time</h4>
                  <p className={P_SMALL}>
                    Taking full part means a few hours during each season's four-week discussion, then a few hours a day
                    during the one-week festival gathering that closes it. Seasons come two or three times a year. You
                    can delegate this if you'd rather.
                  </p>
                </div>
              </AnimatedSection>
            </section>

            {/* ===== HOW IT COMPARES ===== */}
            <section id="comparison" className={SECTION_CLASS}>
              <AnimatedSection animation="slide-up">
                <SectionHeading icon={Scale}>How it compares</SectionHeading>
                <ResponsiveTable
                  head={COMPARE_HEAD}
                  rows={COMPARE_ROWS}
                  caption={`How the ${COOP.name} compares with a traditional impact fund and a typical land fund`}
                  highlightLast
                />
              </AnimatedSection>
            </section>

            {/* ===== THE NINE FORMS OF CAPITAL ===== */}
            <section id="capital" className={SECTION_CLASS}>
              <AnimatedSection animation="slide-up">
                <SectionHeading icon={Leaf}>The nine forms of capital</SectionHeading>
                <p className={`${P} mb-6`}>
                  Money is one of nine forms of capital a land project runs on. ReGen Civics recognizes contributions in
                  all nine today, and the cooperative is being designed to recognize all nine too.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {CAPITAL_TYPES.map((capital) => (
                    <div key={capital} className="bg-white/5 rounded-xl p-4 border border-white/15">
                      <h3 className="font-bold text-white text-sm mb-1 flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                          style={{ backgroundColor: CAPITAL_COLORS[capital] }}
                          aria-hidden="true"
                        />
                        {titleCase(capital)}
                      </h3>
                      <p className="text-white/80 text-sm leading-relaxed">{CAPITAL_LINES[capital]}</p>
                    </div>
                  ))}
                </div>
                <p className="text-white/75 text-xs md:text-sm mt-4 leading-relaxed safe-prose">
                  The first eight come from Ethan Roland and Gregory Landua's eight forms of capital. Health is the
                  ninth, added by ReGen Civics.{" "}
                  <Link href="/learn/nine-forms-of-capital" className="text-[#7dd87d] underline underline-offset-2">
                    Why we added a ninth
                  </Link>
                </p>
              </AnimatedSection>
            </section>

            {/* ===== IS THIS RIGHT FOR YOU? ===== */}
            <section id="right-for-you" className={SECTION_CLASS}>
              <AnimatedSection animation="slide-up">
                <div className="bg-gradient-to-br from-white/5 to-transparent rounded-2xl p-6 md:p-8 border border-white/15">
                  <h2 className="text-xl md:text-2xl font-bold text-white mb-5" style={DISPLAY}>
                    Is this right for you?
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h3 className="font-bold text-[#7dd87d] text-sm mb-3 flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4" aria-hidden="true" /> A good fit for
                      </h3>
                      <CheckList items={GOOD_FIT} />
                    </div>
                    <div>
                      <h3 className="font-bold text-amber-200 text-sm mb-3 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4" aria-hidden="true" /> Not a fit for
                      </h3>
                      <CheckList items={NOT_A_FIT} icon={AlertTriangle} iconClass="text-amber-200" />
                    </div>
                  </div>
                  <p className="text-sm text-white/85 mt-6 text-center safe-prose">
                    <strong className="text-white">There is no minimum.</strong> Sign for the amount that's right for
                    you. Land projects can sign too. The founding members set the terms of joining.
                  </p>
                </div>
              </AnimatedSection>
            </section>

            {/* ===== HOW IT COMES TOGETHER ===== */}
            <section id="process" className={SECTION_CLASS}>
              <AnimatedSection animation="slide-up">
                <ImageHeader
                  src="/images/opportunity/opp-investment-journey.webp"
                  alt="Illustration of a winding path through gardens and workshops to a round table where people meet"
                  title="How it comes together"
                  width={1792}
                  height={2400}
                  crop
                />

                <div className={`${CARD} mb-4`}>
                  <div className="flex items-center gap-3 mb-3">
                    <span className="w-8 h-8 rounded-full bg-[#7dd87d] text-[#1a472a] flex items-center justify-center text-sm font-bold flex-shrink-0">1</span>
                    <h3 className="font-bold text-white">Letters of intent (now, until {COOP.loiThreshold} is signed)</h3>
                  </div>
                  <ol className="space-y-2">
                    {STAGE_ONE.map((item) => (
                      <li key={item.title} className="bg-white/5 rounded-lg p-3 text-sm">
                        <p className="text-white font-semibold">{item.title}</p>
                        <p className="text-white/80 mt-0.5">{item.body}</p>
                      </li>
                    ))}
                  </ol>
                  <p className="text-sm text-[#7dd87d] mt-3 font-semibold">
                    The goal: {COOP.loiThreshold} in signed letters of intent.
                  </p>
                </div>

                <div className={`${CARD} mb-4`}>
                  <div className="flex items-center gap-3 mb-3">
                    <span className="w-8 h-8 rounded-full bg-[#7dd87d] text-[#1a472a] flex items-center justify-center text-sm font-bold flex-shrink-0">2</span>
                    <h3 className="font-bold text-white">The founding gathering (once {COOP.loiThreshold} is signed)</h3>
                  </div>
                  <p className={`${P_SMALL} mb-3`}>
                    When {COOP.loiThreshold} in letters of intent are signed, we host a gathering of several days that
                    brings everyone together.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                    <div className="bg-white/5 rounded-lg p-3">
                      <h4 className="font-bold text-[#7dd87d] text-sm mb-1">Who comes</h4>
                      <p className="text-sm text-white/80">
                        Every signer, land project representatives, alliance organization leaders, council members,
                        advisors and counsel.
                      </p>
                    </div>
                    <div className="bg-white/5 rounded-lg p-3">
                      <h4 className="font-bold text-[#7dd87d] text-sm mb-1">What it decides</h4>
                      <p className="text-sm text-white/80">
                        The legal form, chosen to meet the legal and regulatory needs of the funders; the bylaws and
                        terms; and the first land projects.
                      </p>
                    </div>
                  </div>
                  <div className="bg-[#7dd87d]/10 rounded-lg p-3 border border-[#7dd87d]/30 text-sm">
                    <p className="text-white/90">
                      <strong className="text-[#7dd87d]">Your decision point:</strong> after the gathering, each signer
                      commits, changes the amount, or steps back.
                    </p>
                  </div>
                </div>

                <div className={`${CARD} mb-6`}>
                  <div className="flex items-center gap-3 mb-3">
                    <span className="w-8 h-8 rounded-full bg-[#7dd87d] text-[#1a472a] flex items-center justify-center text-sm font-bold flex-shrink-0">3</span>
                    <h3 className="font-bold text-white">The treasury launches</h3>
                  </div>
                  <ol className="space-y-2 text-sm">
                    {STAGE_THREE.map((item, i) => (
                      <li key={item.title} className="flex items-start gap-3">
                        <span className="text-[#7dd87d] font-bold mt-0.5">{i + 1}.</span>
                        <p>
                          <strong className="text-white">{item.title}:</strong>{" "}
                          <span className="text-white/80">{item.body}</span>
                        </p>
                      </li>
                    ))}
                  </ol>
                </div>

                <h3 className={H3}>What to expect over time</h3>
                <ol className="space-y-3 mb-4">
                  {OVER_TIME.map((item) => (
                    <li key={item.period} className="bg-white/5 rounded-lg p-4 border border-white/15">
                      <h4 className="font-bold text-[#7dd87d] text-sm mb-1">{item.period}</h4>
                      <p className="text-sm text-white/80">{item.text}</p>
                    </li>
                  ))}
                </ol>
                <p className="text-sm text-white/80 text-center safe-prose">
                  This is an active partnership in building the coordination infrastructure for regenerative land.
                </p>
              </AnimatedSection>
            </section>

            <GlowDivider />

            {/* ===== QUESTIONS ===== */}
            <section id="faq" className={SECTION_CLASS}>
              <AnimatedSection animation="slide-up">
                <SectionHeading icon={CircleHelp}>Questions</SectionHeading>
                <div className="border border-white/15 rounded-2xl bg-white/[0.03] px-5 md:px-6">
                  <FAQItem question="Is a letter of intent binding?">
                    <p>{COOP.loiPromise}</p>
                  </FAQItem>

                  <FAQItem question="Is there a minimum?">
                    <p>
                      No. Sign for any amount. The founding members set the terms of joining at the founding gathering.
                    </p>
                  </FAQItem>

                  <FAQItem question="What does co-owning each other's projects mean?">
                    <p>
                      The treasury holds a shared stake in the land projects it backs, and every member, including every
                      member land project, owns a share of the cooperative. Through it, each project co-owns a piece of
                      the others. When one project thrives the whole network is stronger, and every project has a
                      reason to help the others.
                    </p>
                  </FAQItem>

                  <FAQItem question="What legal form will it take?">
                    <p>
                      A cooperative, governed one member, one vote. {COOP.launch} Once {COOP.loiThreshold} is signed,
                      the signers, land projects and counsel choose the exact form together.
                    </p>
                  </FAQItem>

                  <FAQItem question="Is this an offer?">
                    <p>{COOP.notAnOffer}</p>
                  </FAQItem>

                  <FAQItem question="How is this different from a farmland REIT?">
                    <p>
                      Three ways. Our land projects are villages, regenerative communities, retreats and
                      eco-developments with income from housing, agriculture, education and more. A share of the
                      treasury also backs the alliance organizations that build what these communities need: housing,
                      energy, governance, waste and education. And the land projects co-own each other through the
                      cooperative, so the network supports every project in it.
                    </p>
                  </FAQItem>

                  <FAQItem question="What if regenerative practices don't improve crop yields?">
                    <p>
                      Plans for projects that already operate start from conventional crop yields, so regenerative gains
                      are a bonus. Land projects also earn from many sources besides farming: housing, retreats,
                      education, eco-tourism and community memberships. No single source has to carry a project.
                    </p>
                  </FAQItem>

                  <FAQItem question="How long is my capital committed?">
                    <p>
                      For years. Capital in land works slowly: soil takes 5 to 10 years to regenerate and communities 7
                      to 15 to establish. How and when a member can take capital back out will be set in the bylaws at
                      the founding gathering. Sign with a long horizon in mind.
                    </p>
                  </FAQItem>

                  <FAQItem question="Why hold land for the long term?">
                    <p>
                      A fund with a 10-year life has to sell at year 10, often just as regenerative practices mature.
                      Holding for the long term lines capital up with how long regeneration takes, so no member project
                      is sold off on a fund's timeline.
                    </p>
                  </FAQItem>

                  <FAQItem question="How do land projects come to the network?">
                    <p>
                      Through the ReGen Civics seasons and incubator, and through relationships built over the SEEDS and
                      Hypha years. Projects come for the coordination tools, the support network and the shared
                      treasury.
                    </p>
                  </FAQItem>

                  <FAQItem question="How do you count ecological credits?">
                    <p>
                      Conservatively, as a bonus. Carbon, biodiversity, water and other credits may add income as those
                      markets mature, and the plan doesn't depend on them. The fundamentals come first: a high quality
                      of life for the people living on our land projects.
                    </p>
                  </FAQItem>

                  <FAQItem question="How does earmarking work?">
                    <p>
                      As proposed, once the treasury forms: a funder could direct up to 90% of what they put in toward a
                      specific land project, with the rest staying in the shared treasury. If the project passes review
                      and the member vote, the money goes to it. If it doesn't, the money comes back, less a review fee
                      of 3% or $20,000 (whichever is less), or moves to another project. None of this is live.
                    </p>
                  </FAQItem>

                  <FAQItem question="Who runs the land projects day to day?">
                    <p>
                      Each land project's own stewards and operators. For the first projects the treasury would hold a
                      minority stake, and the projects keep running themselves and governing their own communities. The
                      alliance supports them with housing, energy, governance, waste and agriculture, and ReGen Civics
                      brings coordination tools and alliance access.
                    </p>
                  </FAQItem>

                  <FAQItem question={`What if the treasury doesn't reach ${COOP.loiThreshold}?`}>
                    <p>
                      It doesn't launch, and no money has moved. Until then your letter of intent is not binding. Once{" "}
                      {COOP.loiThreshold} is signed, the treasury can start with fewer, well-chosen projects and grow
                      from there.
                    </p>
                  </FAQItem>

                  <FAQItem question="Do I have to take part in governance?">
                    <p>
                      You choose. Vote on every proposal, delegate your vote to someone you trust, or delegate and stay
                      lightly involved. It's one member, one vote either way.
                    </p>
                  </FAQItem>

                  <FAQItem question="What happens to tokens?">
                    <p>{COOP.tokensNote}</p>
                    <p>$ReGen and RGVoice are the Game's tokens, earned by playing and contributing.</p>
                    <p>{COOP.coopTokens.rcivics}</p>
                    <p>{COOP.coopTokens.rcvoice}</p>
                  </FAQItem>

                  <FAQItem question="I don't trust crypto. Why use blockchain at all?">
                    <p>
                      The treasury is anchored in land and working communities, and blockchain is a coordination tool for
                      it. Coordinating many land projects across countries on paper alone takes armies of lawyers and
                      administrators, and on-chain governance keeps a transparent record anyone can check. If the
                      technology disappeared tomorrow, the land projects would still be there.
                    </p>
                  </FAQItem>

                  <FAQItem question="Are you backing farmland or communities?">
                    <p>
                      Communities on regenerative land. For the first projects the treasury would hold a minority stake
                      in operating projects: startup villages with farming, housing, education and retreats; communities
                      with food forests, co-living and wellness programs; campuses teaching regenerative practice; and
                      retreat centers on regenerative land. Each one has several sources of income.
                    </p>
                  </FAQItem>

                  <FAQItem question="Can I become a member now?">
                    <p>
                      Not yet. The cooperative has no members until it forms. You can{" "}
                      <Link href={LOI_HREF} className="text-[#7dd87d] underline underline-offset-2">
                        sign a letter of intent
                      </Link>{" "}
                      now, and every signer is invited to the founding gathering.
                    </p>
                  </FAQItem>
                </div>
              </AnimatedSection>
            </section>

            {/* ===== THE VISION: 2040 ===== */}
            <section id="vision" className={SECTION_CLASS}>
              <AnimatedSection animation="slide-up">
                <ImageHeader
                  src="/images/opportunity/opp-vision-2040.webp"
                  alt="Illustration of a regenerative village: people tending gardens, homes with green roofs and bridges over a river"
                  title="The vision: 2040"
                  width={2752}
                  height={1536}
                />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {VISION.map((item) => (
                    <div key={item.title} className="bg-white/5 rounded-xl p-5 border border-[#7dd87d]/25">
                      <h3 className="font-bold text-[#7dd87d] text-sm mb-2">{item.title}</h3>
                      <p className="text-sm text-white/85 leading-relaxed">{item.body}</p>
                    </div>
                  ))}
                </div>
              </AnimatedSection>
            </section>

            <GlowDivider />

            {/* ===== SIGN A LETTER OF INTENT ===== */}
            <section id="sign" className={SECTION_CLASS}>
              <AnimatedSection animation="scale-in">
                <div className="text-center bg-gradient-to-br from-[#7dd87d]/10 to-transparent rounded-2xl p-8 md:p-12 border border-[#7dd87d]/30">
                  <h2 className="text-xl md:text-2xl font-bold text-white mb-3" style={DISPLAY}>
                    Sign a letter of intent
                  </h2>
                  <p className="text-white/85 text-sm md:text-base mb-6 max-w-2xl mx-auto safe-prose">
                    The treasury launches at {COOP.loiThreshold}. {COOP.loiPromise}
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3 justify-center mb-4">
                    <MagneticCTAButton />
                    <Button
                      asChild
                      variant="outline"
                      className="h-auto min-h-[44px] border-2 border-[#7dd87d]/60 text-[#7dd87d] hover:bg-[#7dd87d]/10 px-6 py-3 rounded-xl text-base"
                    >
                      <a href={CALL_URL} target="_blank" rel="noopener noreferrer">
                        <Calendar className="w-5 h-5 mr-2" aria-hidden="true" />
                        Book a call<span className="sr-only"> (opens in a new tab)</span>
                      </a>
                    </Button>
                  </div>
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-x-6">
                    <Link
                      href={INTEREST_HREF}
                      className="inline-flex items-center justify-center gap-1 min-h-[44px] text-sm text-white/85 hover:text-[#7dd87d] underline underline-offset-2 transition-colors"
                    >
                      <Landmark className="w-4 h-4" aria-hidden="true" />
                      Bringing land, skills or time? Tell us
                    </Link>
                    <Link
                      href="/investor/contact"
                      className="inline-flex items-center justify-center gap-1 min-h-[44px] text-sm text-white/85 hover:text-[#7dd87d] underline underline-offset-2 transition-colors"
                    >
                      <Mail className="w-4 h-4" aria-hidden="true" />
                      Contact the team
                    </Link>
                  </div>
                  <p className="text-xs text-white/75 mt-6 max-w-2xl mx-auto leading-relaxed safe-prose">{COOP.notAnOffer}</p>
                </div>
              </AnimatedSection>
            </section>

            {/* ===== TREASURY UPDATES ===== */}
            <CoopUpdates />

            {/* ===== RELATED CONTENT ===== */}
            <AnimatedSection animation="fade-in">
              <RelatedContent pages={relatedContentMap.opportunity.pages} blog={relatedContentMap.opportunity.blog} />
            </AnimatedSection>

          </div>
        </div>
      </section>

      <ReadingProgress />
    </div>
  );
}
