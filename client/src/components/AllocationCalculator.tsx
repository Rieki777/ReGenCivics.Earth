/**
 * AllocationCalculator - Interactive comparison calculator showing
 * hypothetical allocation scenarios for the ReGen Civics Fund.
 * Compares traditional vs regenerative portfolio allocations.
 * 
 * DISCLAIMER: All figures are hypothetical projections for illustration only.
 * Past performance does not guarantee future results.
 */
import { useState, useMemo } from "react";
import { TrendingUp, Leaf, Shield, Sparkles, Info } from "lucide-react";
import { AnimatedSection } from "@/components/AnimatedSection";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type Scenario = {
  name: string;
  description: string;
  landProjects: number;
  allianceOrgs: number;
  cashReserve: number;
  projectedReturn: number; // annual %
  impactScore: number; // 1-10
  riskLevel: string;
  color: string;
};

const scenarios: Scenario[] = [
  {
    name: "Conservative",
    description: "Lower risk, steady growth with emphasis on established projects",
    landProjects: 40,
    allianceOrgs: 30,
    cashReserve: 30,
    projectedReturn: 6,
    impactScore: 6,
    riskLevel: "Lower",
    color: "#7dd87d",
  },
  {
    name: "Balanced",
    description: "Our recommended allocation balancing growth, impact, and stability",
    landProjects: 55,
    allianceOrgs: 30,
    cashReserve: 15,
    projectedReturn: 10,
    impactScore: 8,
    riskLevel: "Moderate",
    color: "#fbbf24",
  },
  {
    name: "Growth",
    description: "Higher allocation to emerging projects with greater upside potential",
    landProjects: 65,
    allianceOrgs: 25,
    cashReserve: 10,
    projectedReturn: 14,
    impactScore: 9,
    riskLevel: "Higher",
    color: "#f97316",
  },
];

function formatCurrency(amount: number): string {
  if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `$${(amount / 1_000).toFixed(0)}K`;
  return `$${amount.toFixed(0)}`;
}

export default function AllocationCalculator() {
  const [selectedScenario, setSelectedScenario] = useState(1); // Default to Balanced
  const [investmentAmount, setInvestmentAmount] = useState(500000);

  const scenario = scenarios[selectedScenario];

  const projections = useMemo(() => {
    const years = [1, 3, 5, 7, 10];
    return years.map((year) => {
      const value = investmentAmount * Math.pow(1 + scenario.projectedReturn / 100, year);
      return { year, value };
    });
  }, [investmentAmount, scenario.projectedReturn]);

  const amountOptions = [250000, 500000, 1000000, 2500000, 5000000];

  return (
    <TooltipProvider>
      <section className="relative py-12 md:py-16" id="calculator">
        <div className="container max-w-4xl">
          <AnimatedSection animation="fade-in" className="text-center mb-10">
            <h2
              className="text-3xl md:text-4xl font-bold text-white mb-4 text-shadow-strong"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Allocation Explorer
            </h2>
            <p className="text-white/80 text-base md:text-lg max-w-2xl mx-auto text-shadow-subtle">
              Explore hypothetical allocation scenarios for the ReGen Civics Fund
            </p>
          </AnimatedSection>

          {/* Investment Amount Selector */}
          <AnimatedSection animation="fade-in" delay={100}>
            <div className="glass-panel p-5 mb-6 border-white/10">
              <label className="text-white/60 text-sm mb-3 block">Investment Amount</label>
              <div className="flex flex-wrap gap-2">
                {amountOptions.map((amount) => (
                  <button
                    key={amount}
                    onClick={() => setInvestmentAmount(amount)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      investmentAmount === amount
                        ? "bg-[#7dd87d] text-[#1a472a]"
                        : "bg-white/10 text-white/70 hover:bg-white/20"
                    }`}
                  >
                    {formatCurrency(amount)}
                  </button>
                ))}
              </div>
            </div>
          </AnimatedSection>

          {/* Scenario Tabs */}
          <AnimatedSection animation="fade-in" delay={200}>
            <div className="flex gap-2 mb-6">
              {scenarios.map((s, idx) => (
                <button
                  key={s.name}
                  onClick={() => setSelectedScenario(idx)}
                  className={`flex-1 py-3 px-4 rounded-xl text-sm font-bold transition-all ${
                    selectedScenario === idx
                      ? "text-[#1a472a] shadow-lg"
                      : "bg-white/5 text-white/60 hover:bg-white/10"
                  }`}
                  style={
                    selectedScenario === idx
                      ? { backgroundColor: s.color }
                      : undefined
                  }
                >
                  {s.name}
                </button>
              ))}
            </div>
          </AnimatedSection>

          {/* Scenario Detail */}
          <AnimatedSection animation="fade-in" delay={300}>
            <div className="glass-panel p-6 md:p-8 border-white/10">
              <p className="text-white/70 text-sm mb-6">{scenario.description}</p>

              {/* Allocation Bar */}
              <div className="mb-6">
                <p className="text-white/60 text-xs mb-2 uppercase tracking-wider font-semibold">
                  Portfolio Allocation
                </p>
                <div className="flex rounded-lg overflow-hidden h-8">
                  <div
                    className="flex items-center justify-center text-xs font-bold text-[#1a472a] transition-all duration-500"
                    style={{
                      width: `${scenario.landProjects}%`,
                      backgroundColor: "#7dd87d",
                    }}
                  >
                    {scenario.landProjects}% Land
                  </div>
                  <div
                    className="flex items-center justify-center text-xs font-bold text-[#1a472a] transition-all duration-500"
                    style={{
                      width: `${scenario.allianceOrgs}%`,
                      backgroundColor: "#fbbf24",
                    }}
                  >
                    {scenario.allianceOrgs}% Alliance
                  </div>
                  <div
                    className="flex items-center justify-center text-xs font-bold text-white/80 transition-all duration-500"
                    style={{
                      width: `${scenario.cashReserve}%`,
                      backgroundColor: "rgba(255,255,255,0.15)",
                    }}
                  >
                    {scenario.cashReserve}% Reserve
                  </div>
                </div>
              </div>

              {/* Key Metrics */}
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <TrendingUp className="w-4 h-4 text-[#7dd87d]" />
                    <Tooltip>
                      <TooltipTrigger>
                        <Info className="w-3 h-3 text-white/30" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-xs max-w-[200px]">
                          Hypothetical projected annual return. Actual returns may vary significantly. Not a guarantee.
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <p className="text-2xl md:text-3xl font-bold text-white" style={{ fontFamily: "var(--font-display)" }}>
                    {scenario.projectedReturn}%
                  </p>
                  <p className="text-white/50 text-xs">Projected Annual</p>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <Leaf className="w-4 h-4 text-[#7dd87d]" />
                  </div>
                  <p className="text-2xl md:text-3xl font-bold text-white" style={{ fontFamily: "var(--font-display)" }}>
                    {scenario.impactScore}/10
                  </p>
                  <p className="text-white/50 text-xs">Impact Score</p>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <Shield className="w-4 h-4 text-[#7dd87d]" />
                  </div>
                  <p className="text-2xl md:text-3xl font-bold text-white" style={{ fontFamily: "var(--font-display)" }}>
                    {scenario.riskLevel}
                  </p>
                  <p className="text-white/50 text-xs">Risk Level</p>
                </div>
              </div>

              {/* Projection Table */}
              <div className="mb-4">
                <p className="text-white/60 text-xs mb-3 uppercase tracking-wider font-semibold">
                  Hypothetical Growth Projection
                </p>
                <div className="grid grid-cols-5 gap-2">
                  {projections.map((p) => (
                    <div key={p.year} className="text-center">
                      <p className="text-white/40 text-xs mb-1">Year {p.year}</p>
                      <p className="text-white font-bold text-sm md:text-base">
                        {formatCurrency(p.value)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Disclaimer */}
              <div className="mt-6 pt-4 border-t border-white/10">
                <p className="text-white/30 text-[10px] leading-relaxed">
                  <Sparkles className="w-3 h-3 inline mr-1" />
                  All projections are hypothetical and for illustration purposes only. Actual returns may differ materially. 
                  Past performance does not guarantee future results. This is not financial advice. 
                  Please review our{" "}
                  <a href="/risk-disclosure" className="underline hover:text-white/50">
                    risk disclosures
                  </a>{" "}
                  before making investment decisions.
                </p>
              </div>
            </div>
          </AnimatedSection>
        </div>
      </section>
    </TooltipProvider>
  );
}
