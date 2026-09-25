/**
 * Crowd Pooling campaign gallery (/campaigns).
 *
 * Lists real campaigns from the database via campaigns.list. Each card
 * (GalleryCard) reads the campaign's progress summary, the one reading every
 * surface uses (shared/campaignProgress.ts): in-kind first, then money, no
 * percentage headline. A card opens the project page focused on its campaign
 * (/project/:key?campaign=:id), the one canonical campaign page.
 *
 * Example campaigns (isDemo = 1, seeded) sit in their own labelled section
 * below the real ones, keep their Example tag, and never count in the impact
 * strip.
 *
 * Tabs: Active, Needs (every open need across live campaigns, from
 * campaigns.listOpenNeeds; ?tab=needs opens it), Upcoming, Complete.
 *
 * Spec: build spec 2026-09-25, sections 9.2 and 17 (lane 5); earlier,
 * CROWDPOOLING_PLATFORM_SPEC.md Part D.
 */

import { Link, useLocation, useSearch } from "wouter";
import {
  Target, Sparkles, FileText,
  ChevronDown, ChevronUp, Play,
  Filter, SortAsc, Lock, AlertTriangle,
  Bell, CheckCircle, BookOpen, Leaf,
  Map as MapIcon, LayoutGrid
} from "lucide-react";
import { CampaignMap } from "@/components/crowdpool/CampaignMap";
import {
  GALLERY_SORTS,
  GalleryCard,
  sortGallery,
  toGalleryCampaign,
  type GalleryCampaign,
  type GallerySort,
} from "@/components/crowdpool/GalleryCard";
import { NeedsTab } from "@/components/crowdpool/NeedsTab";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SEO, pageSEO } from "@/components/SEO";
import { pageCopy } from "@/data/pageCopy";
import { SeedOfLifeIcon } from "@/components/SeedOfLifeIcon";
import { useEffect, useState, useMemo } from "react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { useCountUp } from "@/hooks/useCountUp";
import { GALLERY, HOW_IT_WORKS } from "@shared/crowdpoolCopy";

export type { GalleryCampaign } from "@/components/crowdpool/GalleryCard";

// ────────────────────────────────────────────────────────────────────────────────
// Tabs: Active, Needs, Upcoming, Complete. ?tab= carries all but Active.
// ────────────────────────────────────────────────────────────────────────────────
type GalleryTab = "active" | "needs" | "upcoming" | "complete";

function tabFromSearch(search: string): GalleryTab {
  const t = new URLSearchParams(search).get("tab");
  return t === "needs" || t === "upcoming" || t === "complete" ? t : "active";
}

/** Write the tab into the address without adding a history entry. */
function writeTab(tab: GalleryTab) {
  const params = new URLSearchParams(window.location.search);
  if (tab === "active") params.delete("tab");
  else params.set("tab", tab);
  const qs = params.toString();
  window.history.replaceState(window.history.state, "", `${window.location.pathname}${qs ? `?${qs}` : ""}${window.location.hash}`);
}

// ────────────────────────────────────────────────────────────────────────────────
// How It Works + YouTube Facade (150-16). The three steps come from
// shared/crowdpoolCopy.ts HOW_IT_WORKS.
// ────────────────────────────────────────────────────────────────────────────────
function HowCrowdPoolingWorks() {
  const [expanded, setExpanded] = useState(false);
  const [videoActive, setVideoActive] = useState(false);
  const YT_ID = "jxKR-WneJp0";
  const THUMB = `https://img.youtube.com/vi/${YT_ID}/maxresdefault.jpg`;

  return (
    <div className="bg-white/5 border border-[#7dd87d]/20 backdrop-blur-sm rounded-2xl overflow-hidden mb-8">
      <button
        type="button"
        aria-expanded={expanded}
        className="flex items-center justify-between w-full p-5 min-h-11 text-left hover:bg-white/5 transition-colors"
        onClick={() => setExpanded(v => !v)}
      >
        <div className="flex items-center gap-3">
          <BookOpen className="w-5 h-5 text-[#7dd87d]" aria-hidden="true" />
          <span className="font-bold text-white" style={{ fontFamily: 'var(--font-display)' }}>
            {GALLERY.howItWorks}
          </span>
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-white/60" aria-hidden="true" /> : <ChevronDown className="w-4 h-4 text-white/60" aria-hidden="true" />}
      </button>

      {expanded && (
        <div className="px-5 pb-5 space-y-5">
          <ol className="grid md:grid-cols-3 gap-4">
            {HOW_IT_WORKS.map(({ title, body }, i) => (
              <li key={title} className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-[#7dd87d]/20 border border-[#7dd87d]/30 flex items-center justify-center flex-shrink-0">
                  <span className="text-[#7dd87d] font-bold text-sm">{i + 1}</span>
                </div>
                <div>
                  <h3 className="font-medium text-white text-sm">{title}</h3>
                  <p className="text-xs text-white/75 mt-0.5">{body}</p>
                </div>
              </li>
            ))}
          </ol>

          {/* YouTube facade */}
          <div role="button" tabIndex={0} aria-label={GALLERY.watchVideo} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setVideoActive(true); } }} className="rounded-xl overflow-hidden aspect-video relative group cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#7dd87d]/50" onClick={() => setVideoActive(true)}>
            {!videoActive ? (
              <>
                <img
                  src={THUMB}
                  alt=""
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-black/40 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                  <div className="w-16 h-16 rounded-full bg-white/90 flex items-center justify-center shadow-xl">
                    <Play className="w-7 h-7 text-[#1a472a] ml-1" aria-hidden="true" />
                  </div>
                </div>
                <div className="absolute bottom-3 left-3 bg-black/60 px-2 py-1 rounded text-white text-xs">
                  {GALLERY.watchVideo}
                </div>
              </>
            ) : (
              <iframe
                className="w-full h-full"
                src={`https://www.youtube.com/embed/${YT_ID}?autoplay=1&playsinline=1`}
                title="Crowd Pooling Explainer"
                allow="autoplay; fullscreen"
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────────
// "Get Notified" Email Capture (150-14)
//
// Joins the crowdpool waitlist for the current Game season
// (campaigns.joinWaitlist; the server picks the season). Nobody is emailed
// automatically: Rye writes to this list from admin Outbound, and every
// letter carries a "Stop these emails" link. It needs no campaign, so it
// shows even when the gallery is empty. Per-campaign email follows live on
// each campaign page.
// ────────────────────────────────────────────────────────────────────────────────
function GetNotifiedForm() {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const subscribe = trpc.campaigns.joinWaitlist.useMutation();

  // A project page with no campaign links here as /campaigns#get-notified.
  // wouter navigation never scrolls to a hash, so do it once this mounts.
  useEffect(() => {
    if (window.location.hash !== "#get-notified") return;
    const t = window.setTimeout(() => {
      document.getElementById("get-notified")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 300);
    return () => window.clearTimeout(t);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    try {
      await subscribe.mutateAsync({ email: email.trim(), name: name.trim() || undefined });
      setSubmitted(true);
      toast.success("You're on the list!", { description: "We'll email you when crowd pooling opens." });
    } catch {
      toast.error("Could not save your email. Try again in a moment.");
    }
  };

  return (
    <div className="bg-gradient-to-br from-[#0d2818] to-[#1a472a] border border-[#7dd87d]/20 rounded-2xl p-6 sm:p-8 text-center">
      <Bell className="w-8 h-8 text-[#7dd87d] mx-auto mb-3" aria-hidden="true" />
      <h2 className="text-xl font-bold text-white mb-2" style={{ fontFamily: 'var(--font-display)' }}>
        Get notified when crowd pooling opens.
      </h2>
      <p className="text-white/75 text-sm mb-5 max-w-md mx-auto">
        Leave your email and we'll write when the first season of campaigns opens for contributions.
      </p>
      {submitted ? (
        <div className="flex items-center justify-center gap-2 text-[#7dd87d]">
          <CheckCircle className="w-5 h-5" aria-hidden="true" />
          <span className="font-medium">You're on the list!</span>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
          <Input
            type="text"
            aria-label="Your name"
            placeholder="Your name"
            value={name}
            onChange={e => setName(e.target.value)}
            className="bg-white/5 border-white/20 text-white placeholder:text-white/70"
          />
          <Input
            type="email"
            aria-label="Your email"
            placeholder="Your email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            className="bg-white/5 border-white/20 text-white placeholder:text-white/70"
          />
          <Button
            type="submit"
            disabled={subscribe.isPending}
            className="bg-[#7dd87d] text-[#1a472a] hover:bg-[#9de89d] font-semibold whitespace-nowrap"
          >
            {subscribe.isPending ? "Saving..." : "Notify Me"}
          </Button>
        </form>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────────
// Combined impact strip (150-17). Real live campaigns only: examples never
// count here. Needs met comes from each campaign's progress summary, the same
// reading as every card; nothing is summed across currencies.
// ────────────────────────────────────────────────────────────────────────────────
function ImpactStrip({ projects }: { projects: GalleryCampaign[] }) {
  const { ref, isVisible } = useScrollAnimation({ threshold: 0.3, triggerOnce: true });
  const needsMet = projects.reduce((s, p) => s + (p.progress.inKind.needsMet || 0), 0);
  const campaignCount = projects.length;
  const totalPlaces = new Set(
    projects
      .map(p => (p.location ?? "").split(",")[0].trim().toLowerCase())
      .filter(Boolean)
  ).size;

  const animNeedsMet = useCountUp(needsMet, 1400, isVisible);
  const animCampaigns = useCountUp(campaignCount, 800, isVisible);
  const animPlaces = useCountUp(totalPlaces, 800, isVisible);

  if (campaignCount === 0) return null;

  return (
    <div ref={ref} className="bg-[#0d2818]/80 border border-[#7dd87d]/20 backdrop-blur-sm rounded-2xl py-6 px-4 sm:px-8 mb-8">
      <p className="text-white/75 text-xs uppercase tracking-widest text-center mb-4">{GALLERY.impactHeading}</p>
      <div className="flex flex-wrap items-center justify-center gap-8 sm:gap-16">
        {[
          { value: animCampaigns, label: GALLERY.impact.campaigns },
          { value: animNeedsMet, label: GALLERY.impact.needsMet },
          { value: animPlaces, label: GALLERY.impact.places },
        ].map(({ value, label }) => (
          <div key={label} className="text-center">
            <p className="text-3xl sm:text-4xl font-bold text-[#7dd87d]">{value.toLocaleString()}</p>
            <p className="text-white/75 text-sm">{label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function CardGrid({ campaigns, trailing }: { campaigns: GalleryCampaign[]; trailing?: React.ReactNode }) {
  return (
    <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {campaigns.map((c) => (
        <li key={c.id} className="min-w-0">
          <GalleryCard campaign={c} />
        </li>
      ))}
      {trailing}
    </ul>
  );
}

// ────────────────────────────────────────────────────────────────────────────────
// Main Page Component
// ────────────────────────────────────────────────────────────────────────────────
const LISTED_STATUSES = ["active", "funded", "completed"] as const;

export default function CrowdPoolingProjects() {
  const [, navigate] = useLocation();
  const search = useSearch();
  const tabInUrl = tabFromSearch(search);

  const [activeTags, setActiveTags] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<GallerySort>("needs-hand");
  const [activeTab, setActiveTab] = useState<GalleryTab>(tabInUrl);
  const [viewMode, setViewMode] = useState<"grid" | "map">("grid");

  // Back and forward, or a link to ?tab=needs while the page is open.
  useEffect(() => setActiveTab(tabInUrl), [tabInUrl]);

  const selectTab = (tab: GalleryTab) => {
    setActiveTab(tab);
    writeTab(tab);
  };

  // Real campaigns from the database. Example campaigns (isDemo = 1) come back
  // like any other row and are labelled, never merged with hardcoded data.
  const { data: campaignRows, isLoading } = trpc.campaigns.list.useQuery({}, {
    refetchInterval: 5 * 60 * 1000,
  });
  // Every open need across live campaigns (cached 60 s on the server). The
  // tab count and the "Needs a hand" sort both read it.
  const { data: openNeeds, isLoading: needsLoading } = trpc.campaigns.listOpenNeeds.useQuery(undefined, {
    staleTime: 60 * 1000,
  });

  const campaigns = useMemo<GalleryCampaign[]>(() => {
    return (campaignRows ?? [])
      .filter(c => (LISTED_STATUSES as readonly string[]).includes(c.status) && !!c.progress)
      .map((c) => toGalleryCampaign(c));
  }, [campaignRows]);

  /** Open needs no one has offered on yet, per campaign, for "Needs a hand". */
  const noOfferCounts = useMemo(() => {
    const m = new Map<number, number>();
    for (const row of [...(openNeeds?.needs ?? []), ...(openNeeds?.examples ?? [])]) {
      if (row.noOffersYet) m.set(row.campaignId, (m.get(row.campaignId) ?? 0) + 1);
    }
    return m;
  }, [openNeeds]);

  const allTags = useMemo(
    () => Array.from(new Set(campaigns.flatMap(p => p.tags))),
    [campaigns]
  );

  const shown = useMemo(() => {
    const tabFiltered = campaigns.filter(p => {
      if (activeTab === "active") return p.status === "active";
      if (activeTab === "complete") return p.status === "funded" || p.status === "completed";
      return false;
    });
    const tagFiltered = activeTags.length === 0
      ? tabFiltered
      : tabFiltered.filter(p => activeTags.some(t => p.tags.includes(t)));
    return sortGallery(tagFiltered, sortBy, noOfferCounts);
  }, [campaigns, activeTab, activeTags, sortBy, noOfferCounts]);

  const realShown = shown.filter(p => !p.isDemo);
  const exampleShown = shown.filter(p => p.isDemo);

  const toggleTag = (tag: string) => {
    setActiveTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
  };

  const openCampaign = (path: string) => navigate(path);

  // Impact strip counts real live campaigns only; examples are excluded.
  const realLiveCampaigns = campaigns.filter(p => !p.isDemo && p.status === "active");

  const activeCount = campaigns.filter(p => p.status === "active").length;
  const completeCount = campaigns.filter(p => p.status === "funded" || p.status === "completed").length;
  const needsCount = (openNeeds?.needs.length ?? 0) + (openNeeds?.examples.length ?? 0);

  const tabs: Array<{ key: GalleryTab; label: string }> = [
    { key: "active", label: GALLERY.tabs.active(activeCount) },
    { key: "needs", label: GALLERY.tabs.needs(needsCount) },
    { key: "upcoming", label: GALLERY.tabs.upcoming },
    { key: "complete", label: GALLERY.tabs.complete(completeCount) },
  ];

  const showGallery = activeTab === "active" || activeTab === "complete";
  // While no real campaign is open, the Needs tab carries the waitlist form
  // itself, so the one at the foot of the page steps aside (one form, one id).
  const needsTabShowsNotify = activeTab === "needs" && (openNeeds
    ? openNeeds.needs.length === 0 && openNeeds.realCampaignCount === 0
    : !needsLoading);

  return (
    <div
      className="crowd-pooling-hero-bg min-h-screen relative"
      style={{
        backgroundColor: "#0d2818",
        backgroundSize: "cover",
        backgroundPosition: "center top",
      }}
    >
      {/* Responsive hero background: desktop painting on md+, unique
          mobile-portrait version on small screens. Set via scoped style
          so the 9:16 mobile image doesn't get stretched/blurred on iPhone. */}
      <style>{`
        .crowd-pooling-hero-bg { background-image: url('/images/crowd-pooling-hero.webp'); }
        @media (max-width: 640px) {
          .crowd-pooling-hero-bg { background-image: url('/images/crowd-pooling-hero-mobile.webp'); }
        }
      `}</style>

      {/* Dark overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0d2818]/55 via-[#0a1f10]/65 to-[#0d2818]/85 pointer-events-none" />

      <SEO {...pageSEO.crowdPoolingProjects} />

      {/* Preload hero image: desktop and mobile variants with media queries
          so the browser only fetches the one it actually needs. */}
      <link
        rel="preload"
        as="image"
        href="/images/crowd-pooling-hero.webp"
        media="(min-width: 641px)"
        fetchPriority="high"
      />
      <link
        rel="preload"
        as="image"
        href="/images/crowd-pooling-hero-mobile.webp"
        media="(max-width: 640px)"
        fetchPriority="high"
      />

      <div className="relative z-10">
        {/* Hero Section */}
        <div className="relative text-white py-16 md:py-24 px-4 overflow-hidden">
          <div className="relative z-10 container">
            <div className="max-w-3xl mx-auto text-center">
              <div className="inline-flex items-center gap-2 px-4 py-2 mb-6 rounded-full bg-[#7dd87d]/15 border border-[#7dd87d]/30">
                <SeedOfLifeIcon className="w-5 h-5 text-[#7dd87d]" size={20} />
                <span className="text-sm font-medium text-[#7dd87d]">{pageCopy.crowdPoolingProjects.hero.label}</span>
              </div>
              <h1
                className="text-4xl md:text-6xl font-bold mb-4 text-white drop-shadow-lg"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                {pageCopy.crowdPoolingProjects.hero.heading}
              </h1>
              <p className="text-white/90 text-base md:text-lg mb-10 max-w-2xl mx-auto">
                {pageCopy.crowdPoolingProjects.hero.subtext}
              </p>

              <div className="flex flex-col sm:flex-row gap-3 justify-center flex-wrap">
                <Link href="/crowd-pooling">
                  <Button className="bg-[#7dd87d] text-[#1a472a] hover:bg-[#9de89d] w-full sm:w-auto font-semibold">
                    <FileText className="w-4 h-4 mr-2" />
                    {pageCopy.crowdPoolingProjects.hero.CTAs.createProposal}
                  </Button>
                </Link>
                <Link href="/compare-projects">
                  <Button variant="outline" className="border-white/30 text-white hover:bg-white/10 w-full sm:w-auto">
                    <Target className="w-4 h-4 mr-2" />
                    {pageCopy.crowdPoolingProjects.hero.CTAs.compareProjects}
                  </Button>
                </Link>
                <Link href="/create-campaign">
                  <Button variant="outline" className="border-white/30 text-white hover:bg-white/10 w-full sm:w-auto">
                    <Sparkles className="w-4 h-4 mr-2" />
                    {pageCopy.crowdPoolingProjects.hero.CTAs.listProject}
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Season Notice Banner: stays until the first season goes live. */}
        <div className="bg-gradient-to-r from-amber-500/15 via-amber-400/10 to-amber-500/15 border-y border-amber-400/30 backdrop-blur-sm py-4 px-4 pr-20 md:pr-4">
          <div className="container">
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 text-center">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" aria-hidden="true" />
                <p className="text-white/90 text-sm sm:text-base">
                  <span className="font-semibold text-amber-300">Early preview.</span>{" "}
                  Our first season of crowd pooling goes live late 2026 / early 2027.
                  Campaigns marked Example show how it will work.
                </p>
              </div>
              <Link href="/newsletter">
                <Button size="sm" className="bg-amber-500/20 border border-amber-400/40 text-amber-200 hover:bg-amber-500/30 hover:text-white text-xs sm:text-sm whitespace-nowrap">
                  <Bell className="w-3.5 h-3.5 mr-1.5" />
                  Sign up for updates
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <main className="container py-8 md:py-12">

          {/* Explanatory callout */}
          <div className="bg-white/5 border border-[#7dd87d]/20 backdrop-blur-sm rounded-xl px-5 py-4 mb-6 text-sm text-white/80 flex items-center gap-3">
            <Leaf className="w-4 h-4 text-[#7dd87d] flex-shrink-0" aria-hidden="true" />
            <span>
              {pageCopy.crowdPoolingProjects.callout.text}{" "}
              <Link href="/crowd-pooling" className="font-medium text-[#7dd87d] hover:underline">
                {pageCopy.crowdPoolingProjects.callout.link}
              </Link>
            </span>
          </div>

          {/* How It Works collapsible (150-16) */}
          <HowCrowdPoolingWorks />

          {/* Active / Needs / Upcoming / Complete tabs */}
          <div className="flex flex-wrap items-center gap-2 mb-6">
            {tabs.map(({ key, label }) => (
              <button
                key={key}
                type="button"
                aria-pressed={activeTab === key}
                onClick={() => selectTab(key)}
                className={`px-4 py-2 min-h-11 rounded-full text-sm font-medium transition-all ${
                  activeTab === key
                    ? "bg-[#7dd87d] text-[#1a472a]"
                    : "bg-white/5 border border-white/20 text-white/80 hover:bg-white/10 hover:text-white"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* The Needs tab */}
          {activeTab === "needs" && (
            <NeedsTab
              data={openNeeds}
              isLoading={needsLoading}
              notifyForm={<div id="get-notified" className="scroll-mt-24"><GetNotifiedForm /></div>}
            />
          )}

          {/* Phase filter, sort and view, for the campaign tabs */}
          {showGallery && (
            <div className="flex flex-wrap items-center gap-3 mb-6">
              {allTags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {allTags.map(tag => (
                    <button
                      key={tag}
                      type="button"
                      aria-pressed={activeTags.includes(tag)}
                      onClick={() => toggleTag(tag)}
                      className={`px-3 min-h-11 pointer-coarse:min-h-11 rounded-full text-xs font-medium transition-all ${
                        activeTags.includes(tag)
                          ? "bg-[#7dd87d] text-[#1a472a]"
                          : "bg-white/5 border border-white/20 text-white/80 hover:bg-white/10"
                      }`}
                    >
                      {tag}
                    </button>
                  ))}
                  {activeTags.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setActiveTags([])}
                      className="px-3 min-h-11 pointer-coarse:min-h-11 rounded-full text-xs font-medium text-white/80 hover:text-white underline transition-colors"
                    >
                      {GALLERY.clearFilters}
                    </button>
                  )}
                </div>
              )}

              <div className="ml-auto flex items-center gap-2">
                <SortAsc className="w-3 h-3 text-white/60" aria-hidden="true" />
                <label htmlFor="gallery-sort" className="sr-only">{GALLERY.sortLabel}</label>
                <select
                  id="gallery-sort"
                  value={sortBy}
                  onChange={e => setSortBy(e.target.value as GallerySort)}
                  className="bg-[#0d2818] border border-white/20 text-white/90 text-sm rounded-lg px-2 min-h-11 pointer-coarse:min-h-11 focus:outline-none focus:border-[#7dd87d]/50"
                >
                  {GALLERY_SORTS.map(({ key, label }) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>

                {/* Grid / map view toggle */}
                <div className="inline-flex rounded-lg border border-white/20 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setViewMode("grid")}
                    aria-pressed={viewMode === "grid"}
                    aria-label="Grid view"
                    className={`px-2.5 py-1.5 min-h-11 min-w-11 pointer-coarse:min-h-11 flex items-center justify-center transition-colors ${
                      viewMode === "grid" ? "bg-[#7dd87d] text-[#1a472a]" : "bg-white/5 text-white/70 hover:bg-white/10"
                    }`}
                  >
                    <LayoutGrid className="w-3.5 h-3.5" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode("map")}
                    aria-pressed={viewMode === "map"}
                    aria-label="Map view"
                    className={`px-2.5 py-1.5 min-h-11 min-w-11 pointer-coarse:min-h-11 flex items-center justify-center transition-colors ${
                      viewMode === "map" ? "bg-[#7dd87d] text-[#1a472a]" : "bg-white/5 text-white/70 hover:bg-white/10"
                    }`}
                  >
                    <MapIcon className="w-3.5 h-3.5" aria-hidden="true" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Upcoming tab content */}
          {activeTab === "upcoming" && (
            <div className="grid md:grid-cols-2 gap-6 mb-8">
              {[1, 2].map(i => (
                <div key={i} className="relative bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
                  <div className="absolute inset-0 bg-[#0d2818]/80 z-10 flex flex-col items-center justify-center p-6 text-center">
                    <Lock className="w-8 h-8 text-white/70 mb-3" aria-hidden="true" />
                    <p className="text-white/80 font-medium mb-1">Coming this season</p>
                    <p className="text-white/75 text-sm mb-4">
                      More campaigns join as the season progresses.
                      Want to see your project here? Apply.
                    </p>
                    <Link href="/seasons">
                      <Button className="bg-[#7dd87d]/20 border border-[#7dd87d]/40 text-[#7dd87d] hover:bg-[#7dd87d]/30 text-sm">
                        Apply Now
                      </Button>
                    </Link>
                  </div>
                  <div className="h-52 bg-gradient-to-br from-[#1a472a]/30 to-[#0d2818] animate-pulse-subtle" />
                  <div className="p-5 blur-sm pointer-events-none select-none">
                    <div className="h-4 bg-white/10 rounded w-3/4 mb-2" />
                    <div className="h-3 bg-white/5 rounded w-1/2 mb-4" />
                    <div className="h-2 bg-white/5 rounded w-full" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Campaign cards */}
          {showGallery && (
            <>
              {isLoading && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="animate-pulse rounded-2xl bg-white/10 h-72 p-6 space-y-4">
                      <div className="h-40 bg-[#1a472a]/40 rounded-xl" />
                      <div className="h-4 bg-[#7dd87d]/20 rounded w-3/4" />
                      <div className="h-3 bg-[#7dd87d]/10 rounded w-1/2" />
                    </div>
                  ))}
                </div>
              )}

              {!isLoading && campaigns.length === 0 && (
                <div className="text-center py-16 text-white/75">
                  <Sparkles className="w-10 h-10 mx-auto mb-3 opacity-30" aria-hidden="true" />
                  <p className="text-white/85 font-medium mb-1">{GALLERY.noCampaigns}</p>
                  <p>{GALLERY.firstSeason}</p>
                </div>
              )}

              {!isLoading && campaigns.length > 0 && shown.length === 0 && activeTags.length > 0 && (
                <div className="text-center py-16 text-white/75">
                  <Filter className="w-10 h-10 mx-auto mb-3 opacity-30" aria-hidden="true" />
                  <p>{GALLERY.noMatch}</p>
                  <button type="button" onClick={() => setActiveTags([])} className="mt-2 min-h-11 text-[#7dd87d] underline text-sm">
                    {GALLERY.clearFilters}
                  </button>
                </div>
              )}

              {!isLoading && activeTab === "complete" && campaigns.length > 0 && shown.length === 0 && activeTags.length === 0 && (
                <p className="text-center py-12 text-white/80">{GALLERY.noneComplete}</p>
              )}

              {viewMode === "map" && !isLoading && shown.length > 0 && (
                <CampaignMap campaigns={shown} onSelect={openCampaign} />
              )}

              {!isLoading && (
                <div className={viewMode === "map" ? "hidden" : ""}>
                  <CardGrid
                    campaigns={realShown}
                    trailing={activeTab === "active" ? (
                      // Coming Soon placeholder card (150-12)
                      <li className="relative bg-white/5 border border-[#7dd87d]/20 rounded-2xl overflow-hidden min-h-[320px]">
                        <div className="h-52 bg-gradient-to-br from-[#1a472a]/20 to-[#0d2818]">
                          <div className="absolute inset-0 animate-pulse border-2 border-[#7dd87d]/20 rounded-2xl pointer-events-none" />
                        </div>
                        <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
                          <div className="w-10 h-10 rounded-full bg-[#7dd87d]/10 border border-[#7dd87d]/30 flex items-center justify-center mb-3 animate-pulse">
                            <Sparkles className="w-5 h-5 text-[#7dd87d]" aria-hidden="true" />
                          </div>
                          <p className="text-white/85 font-semibold mb-1" style={{ fontFamily: 'var(--font-display)' }}>More Coming This Season</p>
                          <p className="text-white/75 text-sm mb-4">
                            More campaigns join as the season progresses. Want to see your project here? Apply.
                          </p>
                          <Link href="/seasons">
                            <Button className="bg-[#7dd87d]/15 border border-[#7dd87d]/40 text-[#7dd87d] hover:bg-[#7dd87d]/25 text-sm">
                              Apply for a Season
                            </Button>
                          </Link>
                        </div>
                      </li>
                    ) : null}
                  />

                  {/* Example campaigns in their own labelled section */}
                  {exampleShown.length > 0 && (
                    <section aria-labelledby="example-campaigns-heading" className="mt-12">
                      <h2 id="example-campaigns-heading" className="text-2xl font-bold text-white" style={{ fontFamily: 'var(--font-display)' }}>
                        {GALLERY.examplesHeading}
                      </h2>
                      <p className="text-white/80 text-sm mt-1 mb-5">{GALLERY.examplesCaption}</p>
                      <CardGrid campaigns={exampleShown} />
                    </section>
                  )}
                </div>
              )}
            </>
          )}

          {/* Combined impact strip (150-17): real live campaigns only */}
          <div className="mt-12">
            <ImpactStrip projects={realLiveCampaigns} />
          </div>

          {/* Get Notified (150-14): joins the season's crowdpool waitlist */}
          {!needsTabShowsNotify && (
            <div id="get-notified" className="mt-8 scroll-mt-24">
              <GetNotifiedForm />
            </div>
          )}

          {/* CTA Section */}
          <div className="mt-8 bg-gradient-to-br from-[#0d2818]/80 to-[#1a472a]/80 backdrop-blur-sm border border-[#7dd87d]/20 rounded-2xl p-8 text-white text-center">
            <h2 className="text-2xl font-bold mb-3" style={{ fontFamily: 'var(--font-display)' }}>
              {pageCopy.crowdPoolingProjects.CTA.heading}
            </h2>
            <p className="text-white/75 max-w-lg mx-auto mb-6">
              {pageCopy.crowdPoolingProjects.CTA.body}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/create-campaign">
                <Button className="bg-[#7dd87d] text-[#1a472a] hover:bg-[#9de89d] w-full sm:w-auto font-semibold">
                  Start a Campaign
                </Button>
              </Link>
              <Link href="/schedule">
                <Button variant="outline" className="border-white/30 text-white hover:bg-white/10 w-full sm:w-auto">
                  {pageCopy.crowdPoolingProjects.CTA.joinSessionLabel}
                </Button>
              </Link>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
