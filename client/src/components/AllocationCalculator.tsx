/**
 * AllocationCalculator - Personal Investment Return Projector
 * Models hypothetical return scenarios for ReGen Civics Fund investors
 * based on actual fund mechanics: 1.5% mgmt fee, 8% preferred return,
 * 20% carry, quarterly distributions from Year 3.
 *
 * DISCLAIMER: All figures are hypothetical projections for illustration only.
 * Past performance does not guarantee future results.
 */
import { useState, useMemo } from "react";
import { TrendingUp, Sparkles, Info, ChevronDown, ChevronUp, Calendar, Coins } from "lucide-react";
import { AnimatedSection } from "@/components/AnimatedSection";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const RETURN_SCENARIOS = [
  { label: "Conservative", netIRR: 0.10, cashYield: 0.05, color: "#7dd87d" },
  { label: "Target", netIRR: 0.15, cashYield: 0.07, color: "#fbbf24" },
  { label: "Optimistic", netIRR: 0.18, cashYield: 0.09, color: "#f97316" },
];

const PROJECTION_YEARS = [3, 5, 7, 10, 15, 20];
const MIN_INVESTMENT = 250_000;
const MAX_INVESTMENT = 5_000_000;
const PREFERRED_RETURN = 0.08;
const CARRY_RATE = 0.20;
const EARMARK_DD_FEE_PCT = 0.03;
const EARMARK_DD_FEE_MAX = 20_000;

function fmt(amount: number): string {
  if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `$${(amount / 1_000).toFixed(0)}K`;
  return `$${amount.toFixed(0)}`;
}

function fmtFull(amount: number): string {
  if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(2)}M`;
  return fmt(amount);
}

export default function AllocationCalculator() {
  const [investment, setInvestment] = useState(500_000);
  const [customInput, setCustomInput] = useState("500000");
  const [scenarioIdx, setScenarioIdx] = useState(1);
  const [earmarking, setEarmarking] = useState(false);
  const [showTerms, setShowTerms] = useState(false);

  const scenario = RETURN_SCENARIOS[scenarioIdx];

  function handleSliderChange(val: number) {
    setInvestment(val);
    setCustomInput(val.toString());
  }

  function handleInputChange(raw: string) {
    setCustomInput(raw);
    const parsed = parseFloat(raw.replace(/[^0-9.]/g, ""));
    if (!isNaN(parsed) && parsed >= MIN_INVESTMENT) {
      setInvestment(Math.min(parsed, MAX_INVESTMENT * 2));
    }
  }

  function handleInputBlur() {
    const clamped = Math.max(MIN_INVESTMENT, investment);
    setInvestment(clamped);
    setCustomInput(clamped.toString());
  }

  const projections = useMemo(() => {
    return PROJECTION_YEARS.map((year) => {
      // Portfolio NAV grows at net IRR (already after mgmt fee + carry in IRR targets)
      const nav = investment * Math.pow(1 + scenario.netIRR, year);
      const gain = nav - investment;

      // Cash distributions start Year 3 at cashYield% of invested capital per year
      const distributionYears = Math.max(0, year - 2);
      const grossDistributions = investment * scenario.cashYield * distributionYears;

      // Preferred return catch-up: LPs get 100% until 8% cumulative is met
      const preferredThreshold = investment * PREFERRED_RETURN * distributionYears;
      const excessAbovePreferred = Math.max(0, grossDistributions - preferredThreshold);
      const carryPaid = excessAbovePreferred * CARRY_RATE;
      const netDistributions = Math.max(0, grossDistributions - carryPaid);

      return { year, nav, gain, netDistributions, carryPaid, distributionYears };
    });
  }, [investment, scenario]);

  const earmarkDDFee = Math.min(investment * EARMARK_DD_FEE_PCT, EARMARK_DD_FEE_MAX);

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
              Project your hypothetical returns across different investment sizes and performance scenarios
            </p>
          </AnimatedSection>

          {/* Investment Amount */}
          <AnimatedSection animation="fade-in" delay={100}>
            <div className="glass-panel p-5 mb-6 border-white/10">
              <div className="flex items-center justify-between mb-3">
                <label className="text-white/60 text-sm">Your Investment Amount</label>
                <div className="flex items-center gap-1.5">
                  <span className="text-white/40 text-sm">$</span>
                  <input
                    type="text"
                    value={customInput}
                    onChange={(e) => handleInputChange(e.target.value)}
                    onBlur={handleInputBlur}
                    className="bg-white/10 border border-white/20 rounded-lg px-3 py-1.5 text-white text-sm font-mono w-32 text-right focus:outline-none focus:border-[#7dd87d]"
                  />
                </div>
              </div>
              <input
                type="range"
                min={MIN_INVESTMENT}
                max={MAX_INVESTMENT}
                step={50_000}
                value={Math.min(investment, MAX_INVESTMENT)}
                onChange={(e) => handleSliderChange(Number(e.target.value))}
                className="w-full accent-[#7dd87d]"
              />
              <div className="flex justify-between text-white/40 text-xs mt-1">
                <span>$250K minimum</span>
                <span>$5M+</span>
              </div>
            </div>
          </AnimatedSection>

          {/* Return Scenario Tabs */}
          <AnimatedSection animation="fade-in" delay={150}>
            <div className="flex gap-2 mb-6">
              {RETURN_SCENARIOS.map((s, idx) => (
                <button
                  key={s.label}
                  onClick={() => setScenarioIdx(idx)}
                  className={`flex-1 py-3 px-4 rounded-xl transition-all ${
                    scenarioIdx === idx
                      ? "text-[#1a472a] shadow-lg font-bold"
                      : "bg-white/5 text-white/80 hover:bg-white/10 font-medium"
                  }`}
                  style={scenarioIdx === idx ? { backgroundColor: s.color } : undefined}
                >
                  <div className="text-sm">{s.label}</div>
                  <div className={`text-xs font-normal ${scenarioIdx === idx ? "text-[#1a472a]/70" : "text-white/50"}`}>
                    ~{(s.netIRR * 100).toFixed(0)}% net IRR
                  </div>
                </button>
              ))}
            </div>
          </AnimatedSection>

          {/* Projection Table */}
          <AnimatedSection animation="fade-in" delay={200}>
            <div className="glass-panel p-6 md:p-8 border-white/10 mb-6">
              {/* NAV Growth */}
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="w-4 h-4" style={{ color: scenario.color }} />
                <p className="text-white/60 text-xs uppercase tracking-wider font-semibold">
                  Hypothetical Portfolio Value (NAV)
                </p>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="w-3.5 h-3.5 text-white/40" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-xs max-w-[220px]">
                      NAV = your proportional claim on fund assets including land values, cash, and alliance org stakes.
                      Separate from secondary token market value (token appreciation has no carry).
                    </p>
                  </TooltipContent>
                </Tooltip>
              </div>

              <div className="grid grid-cols-3 md:grid-cols-6 gap-3 mb-6">
                {projections.map((p) => (
                  <div
                    key={p.year}
                    className="text-center bg-white/5 rounded-xl p-3 border border-white/10"
                  >
                    <p className="text-white/50 text-xs mb-1.5">Year {p.year}</p>
                    <p
                      className="text-white font-bold text-base md:text-lg"
                      style={{ fontFamily: "var(--font-display)" }}
                    >
                      {fmt(p.nav)}
                    </p>
                    <p className="text-xs mt-1" style={{ color: scenario.color }}>
                      +{fmt(p.gain)}
                    </p>
                  </div>
                ))}
              </div>

              {/* Distribution Timeline */}
              <div className="pt-5 border-t border-white/10">
                <div className="flex items-center gap-2 mb-4">
                  <Calendar className="w-4 h-4 text-[#7dd87d]" />
                  <p className="text-white/60 text-xs uppercase tracking-wider font-semibold">
                    Estimated Cumulative Cash Distributions (Net to You)
                  </p>
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="w-3.5 h-3.5 text-white/40" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-xs max-w-[240px]">
                        Quarterly distributions from portfolio operations start Year 3. You receive 100% until
                        8% preferred return is met; after that, 80% to you / 20% carry to governance treasury.
                        Assumes ~{(scenario.cashYield * 100).toFixed(0)}% annual cash yield on invested capital.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </div>

                <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
                  {projections.map((p) => (
                    <div key={p.year} className="text-center">
                      <p className="text-white/50 text-xs mb-1.5">Year {p.year}</p>
                      {p.distributionYears === 0 ? (
                        <p className="text-white/30 text-sm font-medium">—</p>
                      ) : (
                        <>
                          <p className="text-[#7dd87d] font-bold text-sm md:text-base">
                            {fmt(p.netDistributions)}
                          </p>
                          {p.carryPaid > 0 && (
                            <p className="text-white/30 text-[10px] mt-0.5">
                              +{fmt(p.carryPaid)} carry
                            </p>
                          )}
                        </>
                      )}
                    </div>
                  ))}
                </div>

                <div className="mt-4 flex items-start gap-2 bg-white/5 rounded-lg px-3 py-2">
                  <div className="w-2 h-2 rounded-full bg-white/20 mt-1 shrink-0" />
                  <p className="text-white/40 text-xs">
                    Years 1–2 are reinvestment phase — no cash distributions. Year 3 also triggers annual
                    redemption windows (at NAV less 5% early-exit discount).
                  </p>
                </div>
              </div>
            </div>
          </AnimatedSection>

          {/* Earmarking Toggle */}
          <AnimatedSection animation="fade-in" delay={250}>
            <div className="glass-panel p-5 mb-6 border-white/10">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white font-medium text-sm">Earmark to a specific land project?</p>
                  <p className="text-white/50 text-xs mt-0.5">
                    Direct up to 90% of your capital to a project you choose (10% stays in diversified fund)
                  </p>
                </div>
                <button
                  onClick={() => setEarmarking(!earmarking)}
                  className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${
                    earmarking ? "bg-[#7dd87d]" : "bg-white/20"
                  }`}
                >
                  <span
                    className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${
                      earmarking ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>
              {earmarking && (
                <div className="mt-4 pt-4 border-t border-white/10 text-sm text-white/70 space-y-2">
                  <p>
                    <span className="text-[#fbbf24] font-medium">Due Diligence Fee:</span>{" "}
                    If your chosen project doesn't pass our council review, your capital is returned less a{" "}
                    <strong className="text-white">3% fee (max $20,000)</strong> to cover evaluation costs.
                  </p>
                  <p className="text-white/50 text-xs">
                    For a {fmtFull(investment)} investment: maximum at-risk DD fee ={" "}
                    <strong className="text-white/70">{fmtFull(earmarkDDFee)}</strong>
                  </p>
                  <p className="text-white/50 text-xs">
                    If the project passes, those funds deploy directly to that project — same return structure applies.
                  </p>
                </div>
              )}
            </div>
          </AnimatedSection>

          {/* Fee & Carry Structure */}
          <AnimatedSection animation="fade-in" delay={300}>
            <div className="glass-panel p-5 mb-6 border-white/10">
              <button
                onClick={() => setShowTerms(!showTerms)}
                className="w-full flex items-center justify-between text-left"
              >
                <div className="flex items-center gap-2">
                  <Coins className="w-4 h-4 text-[#d4a574]" />
                  <span className="text-white font-medium text-sm">Fee &amp; Carry Structure</span>
                </div>
                {showTerms ? (
                  <ChevronUp className="w-4 h-4 text-white/40" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-white/40" />
                )}
              </button>
              {showTerms && (
                <div className="mt-4 pt-4 border-t border-white/10 grid grid-cols-1 md:grid-cols-2 gap-5 text-sm">
                  <div className="space-y-4">
                    <div>
                      <p className="text-white/50 text-xs uppercase tracking-wider mb-1">Management Fee</p>
                      <p className="text-white font-semibold">1.5% annually</p>
                      <p className="text-white/50 text-xs mt-0.5">Applied to NAV each year — already reflected in net IRR projections above</p>
                    </div>
                    <div>
                      <p className="text-white/50 text-xs uppercase tracking-wider mb-1">Preferred Return</p>
                      <p className="text-white font-semibold">8% annualized</p>
                      <p className="text-white/50 text-xs mt-0.5">You receive 100% of distributions until cumulative 8% hurdle is met</p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <p className="text-white/50 text-xs uppercase tracking-wider mb-1">Carried Interest</p>
                      <p className="text-white font-semibold">20% above preferred return</p>
                      <p className="text-white/50 text-xs mt-0.5">
                        Applies to cash distributions and asset sales only —{" "}
                        <strong className="text-white/70">not token trading gains</strong> (you keep 100% of
                        secondary market appreciation)
                      </p>
                    </div>
                    <div>
                      <p className="text-white/50 text-xs uppercase tracking-wider mb-1">Distributions Begin</p>
                      <p className="text-white font-semibold">Year 3 (quarterly)</p>
                      <p className="text-white/50 text-xs mt-0.5">
                        Annual redemption windows also open Year 3, at NAV less 5% early-exit discount
                      </p>
                    </div>
                  </div>
                  <div className="md:col-span-2 bg-[#7dd87d]/10 border border-[#7dd87d]/20 rounded-lg p-3 text-xs text-white/70">
                    <strong className="text-[#7dd87d]">Key insight:</strong> Carry goes to the governance
                    treasury — controlled by all RCVoice holders including you. You're not paying carry to a
                    distant fund manager; you're contributing to a collectively-governed treasury you help direct.
                  </div>
                </div>
              )}
            </div>
          </AnimatedSection>

          {/* Disclaimer */}
          <AnimatedSection animation="fade-in" delay={350}>
            <p className="text-white/40 text-[10px] leading-relaxed max-w-2xl mx-auto text-center">
              <Sparkles className="w-3 h-3 inline mr-1" />
              All projections are hypothetical and for illustration purposes only. Net IRR scenarios reference
              the fund's target range of 12–18%; actual returns may differ materially. Cash yield estimates
              assume portfolio stabilization by Year 3. Fee and carry figures reflect offering terms as of early
              2026 and are subject to change. Past performance does not guarantee future results. This is not
              financial advice. Please review our{" "}
              <a href="/risk-disclosure" className="underline hover:text-white/60">
                risk disclosures
              </a>{" "}
              before making any investment decision.
            </p>
          </AnimatedSection>
        </div>
      </section>
    </TooltipProvider>
  );
}
