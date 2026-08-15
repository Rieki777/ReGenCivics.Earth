/**
 * Plays Library - Browse plays: designed economic systems (Vision Plays)
 * and packaged community cultures (Culture Plays).
 * Route: /plays
 *
 * Lifecycle shown on cards: Envisioned -> In Trial -> Practiced.
 */
import { useState } from "react";
import { Gamepad2, Users, X, Download, ChevronDown, ChevronUp, Scale } from "lucide-react";
import { SEO } from "@/components/SEO";
import { AnimatedSection } from "@/components/AnimatedSection";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { BackButton } from "@/components/BackButton";
import { Link } from "wouter";
import { TaoSpinner } from "@/components/TaoSpinner";
import {
  ROBUSTNESS_DIMENSIONS,
  BASELINE_NEEDS,
  robustnessAverage,
  playKindLabel,
} from "@/data/playVision";

const CATEGORIES = [
  "All",
  "Ecovillage",
  "Urban Community",
  "Land Trust",
  "Cooperative",
  "DAO",
  "Network",
  "Bioregion",
];

const KIND_TABS = [
  { value: "", label: "All Plays" },
  { value: "vision", label: "Envisioned" },
  { value: "culture", label: "Practiced" },
];

const PRICING_OPTIONS = [
  { value: "", label: "Any pricing" },
  { value: "free", label: "Free" },
  { value: "open_source", label: "Open Source" },
  { value: "paid", label: "Paid" },
];

const SCALE_OPTIONS = [
  { value: "", label: "Any scale" },
  { value: "small", label: "Small (< 20)" },
  { value: "medium", label: "Medium (20-100)" },
  { value: "large", label: "Large (100+)" },
];

const SORT_OPTIONS = [
  { value: "popular", label: "Most adopted" },
  { value: "newest", label: "Newest" },
  { value: "name", label: "A to Z" },
];

export const PLAY_SECTIONS = [
  { key: "sectionIdentity", label: "Identity and Origin" },
  { key: "sectionGovernance", label: "Governance Model" },
  { key: "sectionEconomics", label: "Economic Design" },
  { key: "sectionLegal", label: "Legal Structure" },
  { key: "sectionRoles", label: "Roles and Circles" },
  { key: "sectionSeasons", label: "Seasonal Rhythm" },
  { key: "sectionLandEcology", label: "Land and Ecology" },
  { key: "sectionAgreements", label: "Community Agreements" },
  { key: "sectionConflict", label: "Conflict Resolution" },
  { key: "sectionHealth", label: "Health and Wellbeing" },
  { key: "sectionEducation", label: "Education and Knowledge" },
  { key: "sectionCulture", label: "Culture and Social Life" },
  { key: "sectionExternalRelations", label: "External Relations" },
  { key: "sectionScaling", label: "Scaling and Evolution" },
];

/** The published criteria a Vision Play is reviewed against. */
const PLAY_CRITERIA = [
  {
    title: "A needs set, declared and measurable",
    detail:
      "Which needs the play honors, how they're weighted, and how you'd know they're met. Every play covers the baseline at minimum: " +
      BASELINE_NEEDS.join(", ") +
      ".",
  },
  {
    title: "A coordination design",
    detail:
      "How people, resources, and information move so those needs get met. Currencies, commons, markets, gifts, planning, any mix.",
  },
  {
    title: "Steering",
    detail:
      "How the play makes decisions and corrects course. Who holds the wheel, and how the wheel changes hands.",
  },
  {
    title: "The more-than-human world",
    detail:
      "The best plays count the needs of soil, water, forests, and wildlife alongside our own.",
  },
  {
    title: "Receipts, or honest speculation",
    detail:
      "Where the play or its parts have run in reality, for how long, at what scale. Fresh designs are welcome when they say what's untested.",
  },
  {
    title: "The robustness self-test",
    detail:
      "Six scores published in the open, after biologist Olivier Hamant's marks of systems that endure.",
  },
];

export default function PlaysLibrary() {
  const [activeCategory, setActiveCategory] = useState("All");
  const [kindTab, setKindTab] = useState("");
  const [pricing, setPricing] = useState("");
  const [scale, setScale] = useState("");
  const [sortBy, setSortBy] = useState("popular");
  const [criteriaOpen, setCriteriaOpen] = useState(false);

  const { data: plays = [], isLoading } = trpc.plays.list.useQuery(
    {
      categorySlug: activeCategory === "All" ? undefined : activeCategory,
      pricingModel: pricing || undefined,
      scale: scale || undefined,
      kind: (kindTab || undefined) as "vision" | "culture" | undefined,
      sort: sortBy === "popular" ? "views" : sortBy === "newest" ? "newest" : "alpha",
    },
    { staleTime: 30_000 }
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0d2818] via-[#1a472a] to-[#0d2818]">
      <SEO
        title="Plays | ReGen Civics"
        description="A library of plays: whole visions for how a community meets its needs, and packaged cultures from communities already running their own game."
        url="/plays"
      />
      <BackButton />

      {/* Hero */}
      <section className="relative pt-24 pb-10 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <AnimatedSection>
            <div className="flex items-center justify-center gap-3 mb-4">
              <Gamepad2 className="w-8 h-8 text-[#7dd87d]" />
              <h1
                className="text-3xl md:text-5xl font-bold text-white"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Plays
              </h1>
            </div>
            <p className="text-white/70 text-base max-w-xl mx-auto mb-2">
              A Play is a whole vision for how a community meets its needs.
              Some are envisioned: new economic systems waiting for their
              trial. Some are practiced: packaged cultures from communities
              already running their own game.
            </p>
            <p className="text-white/60 text-sm max-w-xl mx-auto mb-6">
              Envisioned plays pool the resources for their trial through
              Crowdpooling. The best ones earn their place through trials
              instead of theory.
            </p>

            {/* Two CTAs side by side */}
            <div className="flex flex-wrap justify-center gap-3 mb-4">
              <Link href="/plays/submit">
                <Button className="bg-[#7dd87d] text-[#1a472a] hover:bg-[#9de89d] font-bold">
                  <Users className="w-4 h-4 mr-2" />
                  Submit a Play
                </Button>
              </Link>
              <a href="/downloads/create-your-play-prompt.md" download>
                <Button className="bg-[#7dd87d]/20 text-[#7dd87d] border border-[#7dd87d]/30 hover:bg-[#7dd87d]/30">
                  <Download className="w-4 h-4 mr-2" />
                  Create Your Play with AI
                </Button>
              </a>
            </div>

            {/* What makes a Play (criteria + robustness rubric) */}
            <div className="max-w-2xl mx-auto text-left">
              <button
                onClick={() => setCriteriaOpen(!criteriaOpen)}
                className="w-full flex items-center justify-between bg-white/5 border border-white/10 hover:border-[#7dd87d]/30 rounded-xl px-4 py-3 transition-colors"
              >
                <span className="flex items-center gap-2 text-white/80 text-sm font-semibold">
                  <Scale className="w-4 h-4 text-[#7dd87d]" />
                  What makes a Play (criteria v1.0)
                </span>
                {criteriaOpen ? (
                  <ChevronUp className="w-4 h-4 text-white/60" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-white/60" />
                )}
              </button>
              {criteriaOpen && (
                <div className="mt-2 bg-white/[0.03] border border-white/10 rounded-xl p-5 space-y-4">
                  {PLAY_CRITERIA.map((c) => (
                    <div key={c.title}>
                      <p className="text-white/80 text-sm font-semibold mb-0.5">
                        {c.title}
                      </p>
                      <p className="text-white/60 text-xs leading-relaxed">
                        {c.detail}
                      </p>
                    </div>
                  ))}
                  <div className="pt-3 border-t border-white/10">
                    <p className="text-white/80 text-sm font-semibold mb-2">
                      The six robustness dimensions
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {ROBUSTNESS_DIMENSIONS.map((dim) => (
                        <div key={dim.key} className="bg-white/[0.03] border border-white/[0.08] rounded-lg p-2.5">
                          <p className="text-[#7dd87d] text-xs font-semibold">
                            {dim.label}
                          </p>
                          <p className="text-white/60 text-xs leading-snug">
                            {dim.helper}
                          </p>
                        </div>
                      ))}
                    </div>
                    <p className="text-white/60 text-xs mt-3">
                      Approved Vision Plays earn the Design a Play quest
                      reward, and can launch a Crowdpooling campaign to pool
                      the resources for their trial.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* Filters */}
      <section className="max-w-5xl mx-auto px-4 mb-8">
        {/* Lifecycle tabs */}
        <div className="flex flex-wrap gap-2 mb-4">
          {KIND_TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setKindTab(tab.value)}
              className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-colors ${
                kindTab === tab.value
                  ? "bg-white text-[#1a472a]"
                  : "bg-white/5 text-white/70 border border-white/10 hover:text-white hover:border-white/20"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Category pills */}
        <div className="flex flex-wrap gap-2 mb-4">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                activeCategory === cat
                  ? "bg-[#7dd87d] text-[#1a472a]"
                  : "bg-white/5 text-white/60 border border-white/10 hover:text-white hover:border-white/20"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Dropdowns row */}
        <div className="flex flex-wrap gap-3">
          <select
            value={pricing}
            onChange={(e) => setPricing(e.target.value)}
            className="bg-white/5 border border-white/10 text-white/80 text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#7dd87d]/40"
          >
            {PRICING_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value} className="bg-[#1a472a]">
                {opt.label}
              </option>
            ))}
          </select>

          <select
            value={scale}
            onChange={(e) => setScale(e.target.value)}
            className="bg-white/5 border border-white/10 text-white/80 text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#7dd87d]/40"
          >
            {SCALE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value} className="bg-[#1a472a]">
                {opt.label}
              </option>
            ))}
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="bg-white/5 border border-white/10 text-white/80 text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#7dd87d]/40"
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value} className="bg-[#1a472a]">
                {opt.label}
              </option>
            ))}
          </select>

          {(activeCategory !== "All" || pricing || scale || kindTab) && (
            <button
              onClick={() => {
                setActiveCategory("All");
                setPricing("");
                setScale("");
                setKindTab("");
              }}
              className="text-white/60 hover:text-white/70 text-sm underline flex items-center gap-1"
            >
              <X className="w-3 h-3" /> Clear filters
            </button>
          )}
        </div>
      </section>

      {/* Play Cards Grid */}
      <section className="max-w-5xl mx-auto px-4 pb-20">
        {isLoading ? (
          <div className="flex justify-center py-20">
            <TaoSpinner size={48} />
          </div>
        ) : plays.length === 0 ? (
          <div className="text-center py-20 border border-white/8 rounded-2xl bg-white/[0.02]">
            <Gamepad2 className="w-10 h-10 text-white/70 mx-auto mb-3" />
            <p className="text-white/70 text-lg mb-2">No plays found</p>
            <p className="text-white/60 text-sm">
              Try adjusting your filters or be the first to share one.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {(plays as any[]).map((play) => {
              const lifecycle = playKindLabel(
                play.kind,
                play.totalAdoptions,
                play.campaignId,
              );
              const robustnessAvg = robustnessAverage(play.robustness);
              return (
                <Link key={play.id} href={`/plays/${play.slug}`}>
                  <div className="group bg-white/5 hover:bg-white/8 border border-white/10 hover:border-[#7dd87d]/40 rounded-2xl overflow-hidden transition-all cursor-pointer h-full flex flex-col">
                    {/* Cover image */}
                    {play.coverImageUrl ? (
                      <div className="h-40 overflow-hidden">
                        <img
                          src={play.coverImageUrl}
                          alt={play.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          loading="lazy"
                        />
                      </div>
                    ) : (
                      <div className="h-40 bg-gradient-to-br from-[#7dd87d]/20 to-[#1a472a]/40 flex items-center justify-center">
                        <Gamepad2 className="w-12 h-12 text-[#7dd87d]/40" />
                      </div>
                    )}
                    <div className="p-4 flex-1 flex flex-col">
                      {/* Badges */}
                      <div className="flex items-center flex-wrap gap-2 mb-2">
                        <Badge
                          className={
                            lifecycle === "Practiced"
                              ? "bg-[#7dd87d]/20 text-[#7dd87d] border-[#7dd87d]/30"
                              : lifecycle === "In Trial"
                                ? "bg-sky-500/20 text-sky-300 border-sky-500/30"
                                : "bg-violet-500/20 text-violet-300 border-violet-500/30"
                          }
                        >
                          {lifecycle}
                        </Badge>
                        <Badge
                          className={
                            play.pricingModel === "open_source"
                              ? "bg-white/10 text-white/70 border-white/20 text-xs"
                              : play.pricingModel === "paid"
                                ? "bg-amber-500/20 text-amber-400 border-amber-500/30 text-xs"
                                : "bg-blue-500/20 text-blue-400 border-blue-500/30 text-xs"
                          }
                        >
                          {play.pricingModel === "open_source"
                            ? "Open Source"
                            : play.pricingModel === "paid"
                              ? play.externalPriceLabel || "Paid"
                              : "Free"}
                        </Badge>
                        {play.scale && (
                          <Badge className="bg-white/10 text-white/60 border-white/20 text-xs">
                            {play.scale === "small"
                              ? "< 20"
                              : play.scale === "medium"
                                ? "20-100"
                                : "100+"}
                          </Badge>
                        )}
                      </div>
                      <h3 className="text-white font-bold text-base group-hover:text-[#7dd87d] transition-colors mb-1">
                        {play.name}
                      </h3>
                      {play.creatorProjectName && (
                        <p className="text-[#7dd87d]/70 text-xs mb-2">
                          by {play.creatorProjectName}
                        </p>
                      )}
                      <p className="text-white/60 text-sm leading-relaxed line-clamp-3 flex-1">
                        {play.summary}
                      </p>
                      {/* Category pills */}
                      {play.categories?.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-3">
                          {play.categories.slice(0, 3).map((cat: any) => (
                            <span
                              key={cat.slug}
                              className="px-2 py-0.5 rounded-full text-xs bg-white/5 text-white/70 border border-white/10"
                            >
                              {cat.name}
                            </span>
                          ))}
                        </div>
                      )}
                      {/* Footer */}
                      <div className="flex items-center gap-4 mt-3 pt-3 border-t border-white/10">
                        {robustnessAvg !== null && (
                          <span className="text-[#7dd87d]/80 text-xs font-medium">
                            Robustness {robustnessAvg}/5
                          </span>
                        )}
                        <span className="text-white/60 text-xs">
                          {play.totalAdoptions || 0} adopted
                        </span>
                        <span className="text-white/60 text-xs">
                          {play.totalViews || 0} views
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
