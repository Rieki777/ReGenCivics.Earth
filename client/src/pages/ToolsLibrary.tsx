/**
 * Tools Library - Browse and discover regenerative tools
 * Route: /tools
 */
import { useState } from "react";
import { Wrench, Sparkles, ExternalLink, Loader2, Users, Search, X } from "lucide-react";
import { SEO } from "@/components/SEO";
import { AnimatedSection } from "@/components/AnimatedSection";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { BackButton } from "@/components/BackButton";
import { Link } from "wouter";
import { TaoSpinner } from "@/components/TaoSpinner";
import { EXTERNAL_TOOLS } from "@/config/externalTools";

const CATEGORIES = [
  "All",
  "Land Management",
  "Governance",
  "Finance",
  "Community",
  "Mapping",
  "Education",
  "Communication",
  "Data & Research",
];

const PRICING_OPTIONS = [
  { value: "", label: "Any pricing" },
  { value: "free", label: "Free" },
  { value: "freemium", label: "Freemium" },
  { value: "paid", label: "Paid" },
  { value: "open_source", label: "Open Source" },
];

const TYPE_OPTIONS = [
  { value: "", label: "Any type" },
  { value: "digital", label: "Digital" },
  { value: "physical", label: "Physical" },
];

const SORT_OPTIONS = [
  { value: "popular", label: "Most popular" },
  { value: "newest", label: "Newest" },
  { value: "name", label: "A to Z" },
];

export default function ToolsLibrary() {
  const { isAuthenticated } = useAuth();
  const [activeCategory, setActiveCategory] = useState("All");
  const [pricing, setPricing] = useState("");
  const [toolType, setToolType] = useState("");
  const [sortBy, setSortBy] = useState("popular");
  const [matcherInput, setMatcherInput] = useState("");
  const [showMatcher, setShowMatcher] = useState(false);

  const { data: tools = [], isLoading } = trpc.tools.list.useQuery(
    {
      categorySlug: activeCategory === "All" ? undefined : activeCategory,
      pricingModel: pricing || undefined,
      isPhysical: toolType === "physical" ? true : toolType === "digital" ? false : undefined,
      sort: sortBy === "popular" ? "clicks" : sortBy === "newest" ? "newest" : "alpha",
    },
    { staleTime: 30_000 }
  );

  const aiMatch = trpc.tools.aiMatch.useMutation();

  const handleMatch = () => {
    if (!matcherInput.trim()) return;
    aiMatch.mutate({ problem: matcherInput });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0d2818] via-[#1a472a] to-[#0d2818]">
      <SEO
        title="Tools Library | ReGen Civics"
        description="Browse regenerative tools for land management, governance, finance, and community building. Find the right tools for your project."
        image="/og/tools.webp"
        url="/tools"
      />
      <BackButton />

      {/* Hero */}
      <section className="relative pt-24 pb-10 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <AnimatedSection>
            <div className="flex items-center justify-center gap-3 mb-4">
              <Wrench className="w-8 h-8 text-[#7dd87d]" />
              <h1
                className="text-3xl md:text-5xl font-bold text-white"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Tools Library
              </h1>
            </div>
            <p className="text-white/70 text-base max-w-xl mx-auto mb-6">
              A curated collection of tools that regenerative land projects and communities actually use. Search by category, or describe your problem and let us match you.
            </p>

            {/* AI Matcher toggle */}
            <Button
              onClick={() => setShowMatcher(!showMatcher)}
              className="bg-[#7dd87d]/20 text-[#7dd87d] border border-[#7dd87d]/30 hover:bg-[#7dd87d]/30 mb-4"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              {showMatcher ? "Close Problem Matcher" : "Describe Your Problem"}
            </Button>
          </AnimatedSection>

          {/* Tools we use (external partners) */}
          <AnimatedSection className="mt-10">
            <h2 className="text-white text-lg font-bold mb-4 text-left max-w-3xl mx-auto" style={{ fontFamily: "var(--font-display)" }}>
              Tools we use
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl mx-auto">
              {EXTERNAL_TOOLS.map((tool) => (
                <a
                  key={tool.slug}
                  href={tool.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group bg-white/5 hover:bg-white/8 border border-white/10 hover:border-[#7dd87d]/40 rounded-2xl p-5 text-left transition-colors flex gap-4"
                >
                  <img
                    src={tool.logo}
                    alt={`${tool.name} logo`}
                    width={48}
                    height={48}
                    className="w-12 h-12 rounded-lg object-cover flex-shrink-0 bg-white/10"
                    loading="lazy"
                    onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-white font-bold text-base group-hover:text-[#7dd87d] transition-colors">{tool.name}</h3>
                      <ExternalLink className="w-3 h-3 text-white/65" />
                    </div>
                    <p className="text-[#7dd87d]/70 text-xs mb-2">{tool.tagline}</p>
                    <p className="text-white/60 text-sm leading-relaxed">{tool.description}</p>
                  </div>
                </a>
              ))}
            </div>
          </AnimatedSection>

          {/* AI Matcher */}
          {showMatcher && (
            <AnimatedSection className="mt-4 max-w-xl mx-auto">
              <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-3">
                <p className="text-white/60 text-sm text-left">
                  Describe what you are trying to do or the problem you are facing. We will suggest tools that might help.
                </p>
                <Textarea
                  value={matcherInput}
                  onChange={(e) => setMatcherInput(e.target.value)}
                  placeholder="e.g., I need to coordinate water management across three neighboring properties..."
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/55 min-h-[80px]"
                />
                <Button
                  onClick={handleMatch}
                  disabled={!matcherInput.trim() || aiMatch.isPending}
                  className="bg-[#7dd87d] text-[#1a472a] hover:bg-[#6bc86b] font-bold w-full"
                >
                  {aiMatch.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Matching...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Find Tools
                    </>
                  )}
                </Button>

                {/* AI Match Results */}
                {aiMatch.data && (
                  <div className="mt-4 space-y-3">
                    <p className="text-[#7dd87d] text-sm font-medium text-left">Suggested tools:</p>
                    {(aiMatch.data as any[])?.map((match: { name: string; reason: string }, i: number) => (
                      <div key={i}>
                        <div className="bg-white/5 border border-[#7dd87d]/20 rounded-xl p-3 text-left hover:border-[#7dd87d]/40 transition-colors cursor-pointer">
                          <p className="text-white font-medium text-sm">{match.name}</p>
                          <p className="text-white/50 text-xs mt-1">{match.reason}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </AnimatedSection>
          )}
        </div>
      </section>

      {/* Filters */}
      <section className="max-w-5xl mx-auto px-4 mb-8">
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
              <option key={opt.value} value={opt.value} className="bg-[#1a2f1a]">
                {opt.label}
              </option>
            ))}
          </select>

          <select
            value={toolType}
            onChange={(e) => setToolType(e.target.value)}
            className="bg-white/5 border border-white/10 text-white/80 text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#7dd87d]/40"
          >
            {TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value} className="bg-[#1a2f1a]">
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
              <option key={opt.value} value={opt.value} className="bg-[#1a2f1a]">
                {opt.label}
              </option>
            ))}
          </select>

          {(activeCategory !== "All" || pricing || toolType) && (
            <button
              onClick={() => {
                setActiveCategory("All");
                setPricing("");
                setToolType("");
              }}
              className="text-white/60 hover:text-white/70 text-sm underline flex items-center gap-1"
            >
              <X className="w-3 h-3" /> Clear filters
            </button>
          )}
        </div>

        {/* Submit CTA */}
        <div className="mt-4 flex justify-end">
          <Link href="/tools/submit">
            <Button
              size="sm"
              className="bg-[#7dd87d]/20 text-[#7dd87d] border border-[#7dd87d]/30 hover:bg-[#7dd87d]/30"
            >
              Submit a Tool
            </Button>
          </Link>
        </div>
      </section>

      {/* Tool Cards Grid */}
      <section className="max-w-5xl mx-auto px-4 pb-20">
        {isLoading ? (
          <div className="flex justify-center py-20">
            <TaoSpinner size={48} />
          </div>
        ) : tools.length === 0 ? (
          <div className="text-center py-20 border border-white/8 rounded-2xl bg-white/[0.02]">
            <Wrench className="w-10 h-10 text-white/50 mx-auto mb-3" />
            <p className="text-white/50 text-lg mb-2">No tools found</p>
            <p className="text-white/60 text-sm">
              Try adjusting your filters or submit a tool the community should know about.
            </p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {(tools as any[]).map((tool) => {
              const pricingModel: string = tool.pricingModel ?? "free";
              const categories: { name: string; slug?: string; color?: string }[] = Array.isArray(tool.categories)
                ? tool.categories
                : [];
              const summary: string = tool.shortSummary ?? "";
              const clickCount: number = tool.totalClicks ?? 0;
              const pricingLabel =
                pricingModel === "open_source"
                  ? "Open Source"
                  : pricingModel.charAt(0).toUpperCase() + pricingModel.slice(1);
              return (
              <Link key={tool.id} href={`/tools/${tool.slug}`}>
                <div className="bg-white/5 border border-white/10 rounded-2xl p-5 hover:border-[#7dd87d]/30 transition-colors cursor-pointer h-full flex flex-col">
                  {/* Logo + Name */}
                  <div className="flex items-start gap-3 mb-3">
                    {tool.logoUrl ? (
                      <img
                        src={tool.logoUrl}
                        alt={tool.name}
                        className="w-10 h-10 rounded-lg object-cover border border-white/10 flex-shrink-0"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-[#7dd87d]/10 border border-[#7dd87d]/20 flex items-center justify-center flex-shrink-0">
                        <Wrench className="w-5 h-5 text-[#7dd87d]" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <h3 className="text-white font-semibold text-sm leading-tight">{tool.name}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge className={`text-[10px] ${
                          pricingModel === "free"
                            ? "bg-[#7dd87d]/10 text-[#7dd87d] border-[#7dd87d]/20"
                            : pricingModel === "open_source"
                            ? "bg-blue-500/10 text-blue-300 border-blue-500/20"
                            : pricingModel === "freemium"
                            ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                            : "bg-purple-500/10 text-purple-300 border-purple-500/20"
                        }`}>
                          {pricingLabel}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  {/* Summary */}
                  <p className="text-white/50 text-xs leading-relaxed mb-3 flex-1 line-clamp-3">
                    {summary}
                  </p>

                  {/* Category pills */}
                  <div className="flex flex-wrap gap-1 mb-3">
                    {categories.slice(0, 3).map((cat, i) => (
                      <span
                        key={cat.slug ?? `${cat.name}-${i}`}
                        className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-white/65 border border-white/10"
                      >
                        {cat.name}
                      </span>
                    ))}
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-between pt-2 border-t border-white/5">
                    <span className="text-white/55 text-xs flex items-center gap-1">
                      <Users className="w-3 h-3" /> {clickCount} views
                    </span>
                    <span className="text-[#7dd87d] text-xs font-medium flex items-center gap-1">
                      Explore <ExternalLink className="w-3 h-3" />
                    </span>
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
