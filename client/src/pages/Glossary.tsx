/**
 * Glossary Page - Searchable reference for all key terms
 * Helps first-time visitors understand specialized terminology
 */
import { useState, useMemo } from "react";
import { Search, BookOpen, ExternalLink, Plus, X, Send } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { SEO } from "@/components/SEO";
import { BackButton } from "@/components/BackButton";
import { SeedOfLifeIcon } from "@/components/SeedOfLifeIcon";
import { AnimatedSection } from "@/components/AnimatedSection";
import { Link } from "wouter";
import { PageTransition } from "@/components/PageTransition";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";

interface GlossaryEntry {
  term: string;
  definition: string;
  category: string;
  relatedLink?: string;
  relatedLabel?: string;
}

const glossaryEntries: GlossaryEntry[] = [
  // Core Concepts
  {
    term: "ReGenerative Renaissance",
    definition: "A global movement to shift from extractive economic systems to ones that restore and regenerate ecological, social, and financial capital. ReGen Civics positions itself as a catalyst for this transition.",
    category: "Core Concepts",
    relatedLink: "/",
    relatedLabel: "Learn more",
  },
  {
    term: "Infinite Game",
    definition: "A concept from James P. Carse's philosophy. Unlike finite games (played to win), infinite games are played to continue playing. ReGen Civics is designed as an infinite game where the goal is perpetual regeneration, not extraction.",
    category: "Core Concepts",
    relatedLink: "/game",
    relatedLabel: "Game Overview",
  },
  {
    term: "Ecosystemic Development",
    definition: "An approach to development that mimics natural ecosystems, creating interconnected, self-sustaining systems rather than isolated projects. It integrates ecological, social, and economic dimensions.",
    category: "Core Concepts",
  },
  {
    term: "9 Forms of Capital",
    definition: "A framework recognizing nine types of wealth beyond money: Financial, Material, Living (ecological), Social, Intellectual, Experiential, Spiritual, Cultural, and Health capital. The first eight come from Ethan Roland and Gregory Landua's 8 Forms of Capital. ReGen Civics added the ninth, Health, covering body vitality, wellness, movement, rest, and care.",
    category: "Core Concepts",
    relatedLink: "/learn/nine-forms-of-capital",
    relatedLabel: "Why we added a ninth",
  },
  {
    term: "Health Capital",
    definition: "The physical and emotional vitality a person holds, and the work that builds it in others: movement, rest, bodywork, nutrition, recovery, and care. The ninth form of capital, added by ReGen Civics because the standard eight have no place for it.",
    category: "Core Concepts",
    relatedLink: "/learn/nine-forms-of-capital",
    relatedLabel: "The nine forms of capital",
  },
  {
    term: "HEIST Framework",
    definition: "Holistic Ecosystemic Impact and Sustainability Tracking. A proprietary framework used by ReGen Civics to measure, audit, and verify the regenerative impact of land projects across multiple dimensions.",
    category: "Core Concepts",
  },

  // Fund & Investment
  {
    term: "Crowd-Pooling",
    definition: "A mechanism where community members pool resources (money, skills, materials, time) to collectively fund and support regenerative land projects. Similar to crowdfunding but includes non-financial contributions.",
    category: "Fund & Investment",
    relatedLink: "/crowd-pooling",
    relatedLabel: "Crowd Pooling Tool",
  },
  {
    term: "Impact Investing",
    definition: "Investments made with the intention to generate positive, measurable social and environmental impact alongside a financial return. ReGen Civics focuses on land-backed impact investments.",
    category: "Fund & Investment",
    relatedLink: "/opportunity",
    relatedLabel: "Investment Thesis",
  },
  {
    term: "Land-Backed Investment",
    definition: "Investment secured by real land assets, providing tangible collateral. ReGen Civics invests in regenerative land projects where the land itself serves as the underlying asset.",
    category: "Fund & Investment",
    relatedLink: "/fund",
    relatedLabel: "Fund Overview",
  },
  {
    term: "De-risked Vehicle",
    definition: "A financial structure designed to reduce investment risk through diversification, collateral, governance safeguards, and staged capital deployment. The ReGen Civics fund uses multiple de-risking strategies.",
    category: "Fund & Investment",
  },
  {
    term: "Treasury",
    definition: "The collective financial resources managed by the ReGen Civics fund, including invested capital, returns, and community contributions. Governed transparently through DAO mechanisms.",
    category: "Fund & Investment",
    relatedLink: "/fund",
    relatedLabel: "Treasury Dashboard",
  },

  // Governance & Technology
  {
    term: "Hypha DAO",
    definition: "A Decentralized Autonomous Organization platform that ReGen Civics uses for governance, proposals, and community decision-making. Built on the Base blockchain (Coinbase L2).",
    category: "Governance & Technology",
    relatedLink: "/governance",
    relatedLabel: "Governance",
  },
  {
    term: "DAO (Decentralized Autonomous Organization)",
    definition: "An organization governed by smart contracts and community voting rather than centralized leadership. Decisions are made transparently through proposals and token-weighted voting.",
    category: "Governance & Technology",
    relatedLink: "/governance",
    relatedLabel: "Governance",
  },
  {
    term: "Base Blockchain",
    definition: "A Layer 2 blockchain built by Coinbase, offering low transaction costs and high speed. ReGen Civics chose Base for its accessibility, security, and alignment with mainstream adoption.",
    category: "Governance & Technology",
  },
  // $Regen Token, $RCivics Token, and RGVoice Token entries removed: the prior
  // glossary copy described both as generic "utility tokens" which
  // didn't reflect the Fund/Game split documented in
  // CONTEXT_THE_TWO_GAMES.md. Token model lives on /tokenomics and
  // /bionomics where the full picture is canonical.

  // Program & Community
  {
    term: "Season",
    definition: "A structured program cycle (typically 13 weeks) where land projects go through an incubator process. Each season follows natural rhythms: Spring (planting), Summer (growing), Fall (harvesting), Winter (resting).",
    category: "Program & Community",
    relatedLink: "/seasons",
    relatedLabel: "Seasons",
  },
  {
    term: "Quest",
    definition: "A specific task or mission within the ReGen Civics game that players can complete to earn tokens and contribute to regenerative outcomes. Quests range from educational to hands-on ecological work.",
    category: "Program & Community",
    relatedLink: "/quest",
    relatedLabel: "Start Questing",
  },
  {
    term: "Player",
    definition: "An active participant in the ReGen Civics infinite game. Players complete quests, earn tokens, contribute to governance, and support land projects through various forms of capital.",
    category: "Program & Community",
    relatedLink: "/play",
    relatedLabel: "Become a Player",
  },
  {
    term: "Alliance Partner",
    definition: "An organization that joins the ReGen Civics network to provide services, expertise, or resources to regenerative land projects. Partners include NGOs, consultancies, and service providers.",
    category: "Program & Community",
    relatedLink: "/ally",
    relatedLabel: "Alliance",
  },
  {
    term: "The Gathering Grove",
    definition: "The community forum within ReGen Civics where players, investors, land projects, and alliance partners connect, discuss, and collaborate.",
    category: "Program & Community",
    relatedLink: "/community",
    relatedLabel: "Community Forum",
  },
  {
    term: "Seed of Life",
    definition: "A sacred geometry symbol used as the visual identity of ReGen Civics. Represents the interconnected, fractal nature of regenerative systems and the potential for growth from a single seed.",
    category: "Program & Community",
  },

  // Land & Ecology
  {
    term: "Ecovillage",
    definition: "An intentional community designed to be socially, economically, and ecologically sustainable. Ecovillages are a primary investment target for the ReGen Civics fund.",
    category: "Land & Ecology",
    relatedLink: "/land",
    relatedLabel: "Land Projects",
  },
  {
    term: "Regenerative Agriculture",
    definition: "Farming practices that restore soil health, increase biodiversity, improve water cycles, and sequester carbon. Goes beyond sustainability to actively improve the land.",
    category: "Land & Ecology",
  },
  {
    term: "Restoration Ecology",
    definition: "The scientific study and practice of restoring degraded, damaged, or destroyed ecosystems. A key component of many ReGen Civics land projects.",
    category: "Land & Ecology",
  },
  {
    term: "Bioregion",
    definition: "A geographic area defined by natural boundaries (watersheds, ecosystems) rather than political borders. ReGen Civics organizes projects by bioregion to support place-based regeneration.",
    category: "Land & Ecology",
  },

  // Historical
  {
    term: "SEEDS",
    definition: "The predecessor movement to ReGen Civics, focused on building a regenerative economy. Many of the frameworks, community members, and principles of ReGen Civics evolved from the SEEDS ecosystem.",
    category: "Historical",
    relatedLink: "/blog/remembering-our-roots",
    relatedLabel: "Our History",
  },
];

// Sort alphabetically
const sortedEntries = [...glossaryEntries].sort((a, b) => a.term.localeCompare(b.term));

// Get unique categories
const categories = Array.from(new Set(glossaryEntries.map((e) => e.category)));

export default function Glossary() {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const { isAuthenticated } = useAuth();
  const [showPropose, setShowPropose] = useState(false);
  const [proposeTerm, setProposeTerm] = useState("");
  const [proposeDefinition, setProposeDefinition] = useState("");
  const utils = trpc.useUtils();
  const proposeMutation = trpc.glossary.propose.useMutation({
    onSuccess: () => {
      setProposeTerm(""); setProposeDefinition(""); setShowPropose(false);
      utils.glossary.list.invalidate();
    },
  });

  const { data: dbTerms } = trpc.glossary.list.useQuery();

  // Merge static entries with DB-approved terms (DB terms take precedence if same term name)
  const allEntries = useMemo(() => {
    const dbSet = new Set((dbTerms || []).map(t => t.term.toLowerCase()));
    const staticFiltered = sortedEntries.filter(e => !dbSet.has(e.term.toLowerCase()));
    const dbMapped: GlossaryEntry[] = (dbTerms || []).map(t => ({
      term: t.term,
      definition: t.definition,
      category: "Community Terms",
      relatedLink: t.sourceThreadUrl || undefined,
      relatedLabel: t.sourceThreadUrl ? "Source thread" : undefined,
    }));
    return [...dbMapped, ...staticFiltered].sort((a, b) => a.term.localeCompare(b.term));
  }, [dbTerms]);

  const allCategories = useMemo(() => Array.from(new Set(allEntries.map(e => e.category))), [allEntries]);

  const filtered = useMemo(() => {
    return allEntries.filter((entry) => {
      const matchesSearch =
        !search ||
        entry.term.toLowerCase().includes(search.toLowerCase()) ||
        entry.definition.toLowerCase().includes(search.toLowerCase());
      const matchesCategory = !activeCategory || entry.category === activeCategory;
      return matchesSearch && matchesCategory;
    });
  }, [search, activeCategory, allEntries]);

  return (
    <PageTransition>
      <div className="min-h-screen">
        <SEO
          title="Glossary | ReGen Civics"
          description="Definitions for key terms used in the ReGen Civics ecosystem, including HEIST framework, crowd-pooling, ecosystemic development, and more."
          url="/glossary"
        />
        <BackButton />

        {/* Hero */}
        <section className="py-16 md:py-24 px-4 text-center">
          <div className="max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#7dd87d]/10 text-[#7dd87d] text-sm mb-6" style={{ fontFamily: "var(--font-accent)" }}>
              <BookOpen className="w-4 h-4" />
              <span>Reference Guide</span>
            </div>
            <h1 className="text-3xl md:text-5xl font-bold text-white mb-4" style={{ fontFamily: "var(--font-display)" }}>
              ReGen Glossary
            </h1>
            <p className="text-white/60 text-base md:text-lg max-w-xl mx-auto mb-8 safe-prose">
              Definitions for the key terms, frameworks, and concepts used throughout the ReGen Civics ecosystem.
            </p>

            {/* Search + Propose */}
            <div className="relative max-w-md mx-auto mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/70" />
              <Input
                type="text"
                placeholder="Search terms..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-white/70 focus:border-[#7dd87d]/50"
              />
            </div>
            {isAuthenticated ? (
              <Button onClick={() => setShowPropose(!showPropose)} variant="outline" className="text-[#7dd87d] border-[#7dd87d]/30 hover:bg-[#7dd87d]/10 rounded-full text-sm">
                {showPropose ? <X className="w-4 h-4 mr-1" /> : <Plus className="w-4 h-4 mr-1" />}
                {showPropose ? "Close" : "Propose a Term"}
              </Button>
            ) : (
              <a href={getLoginUrl()} className="inline-flex items-center gap-1 text-[#7dd87d]/80 hover:text-[#7dd87d] text-sm transition-colors">
                Sign in to propose a term
              </a>
            )}
            {showPropose && (
              <div className="max-w-md mx-auto mt-4 bg-white/10 border border-white/20 rounded-2xl p-4 space-y-3 text-left">
                <input value={proposeTerm} onChange={e => setProposeTerm(e.target.value)} placeholder="Term (e.g. 'Bioregion')" className="w-full bg-white/10 border border-white/20 text-white rounded-xl px-3 py-2 text-base md:text-sm placeholder:text-white/70 outline-none focus:ring-1 focus:ring-[#7dd87d]/50" maxLength={200} />
                <textarea value={proposeDefinition} onChange={e => setProposeDefinition(e.target.value)} placeholder="Definition..." className="w-full bg-white/10 border border-white/20 text-white rounded-xl px-3 py-2 text-base md:text-sm placeholder:text-white/70 outline-none focus:ring-1 focus:ring-[#7dd87d]/50 min-h-[80px] resize-y" maxLength={5000} />
                <Button onClick={() => { if (proposeTerm.trim() && proposeDefinition.trim()) proposeMutation.mutate({ term: proposeTerm.trim(), definition: proposeDefinition.trim() }); }} disabled={!proposeTerm.trim() || !proposeDefinition.trim() || proposeMutation.isPending} className="bg-[#7dd87d] text-[#1a472a] hover:bg-[#9de89d] font-bold rounded-full px-5 text-sm">
                  <Send className="w-3 h-3 mr-1" /> {proposeMutation.isPending ? "Submitting..." : "Submit"}
                </Button>
              </div>
            )}

            {/* Category filters */}
            <div className="flex flex-wrap justify-center gap-2 mt-6">
              <button
                onClick={() => setActiveCategory(null)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                  !activeCategory
                    ? "bg-[#7dd87d] text-[#1a472a]"
                    : "bg-white/5 text-white/75 hover:bg-white/10 hover:text-white/90"
                }`}
              >
                All ({allEntries.length})
              </button>
              {allCategories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(activeCategory === cat ? null : cat)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                    activeCategory === cat
                      ? "bg-[#7dd87d] text-[#1a472a]"
                      : "bg-white/5 text-white/75 hover:bg-white/10 hover:text-white/90"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Entries */}
        <section className="pb-16 md:pb-24 px-4">
          <div className="max-w-3xl mx-auto space-y-3">
            {filtered.length === 0 && (
              <div className="text-center py-12">
                <SeedOfLifeIcon className="w-12 h-12 text-white/60 mx-auto mb-4" size={48} />
                <p className="text-white/60 text-sm">No terms match your search.</p>
              </div>
            )}
            {filtered.map((entry, i) => (
              <AnimatedSection key={entry.term} delay={Math.min(i * 0.03, 0.3)}>
                <div className="p-5 rounded-xl bg-white/5 border border-white/10 hover:border-[#7dd87d]/20 transition-colors">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-white font-bold text-base mb-1" style={{ fontFamily: "var(--font-display)" }}>
                        {entry.term}
                      </h3>
                      <span className="text-[#7dd87d] text-[10px] uppercase tracking-wider font-bold">
                        {entry.category}
                      </span>
                    </div>
                  </div>
                  <p className="text-white/70 text-sm leading-relaxed mt-2 safe-prose">
                    {entry.definition}
                  </p>
                  {entry.relatedLink && (
                    <Link
                      href={entry.relatedLink}
                      className="inline-flex items-center gap-1 mt-3 text-[#7dd87d] text-xs hover:underline"
                    >
                      {entry.relatedLabel || "Learn more"} <ExternalLink className="w-3 h-3" />
                    </Link>
                  )}
                </div>
              </AnimatedSection>
            ))}
          </div>
        </section>
      </div>
    </PageTransition>
  );
}
