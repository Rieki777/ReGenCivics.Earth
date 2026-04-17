/**
 * Tokenomics Page - ReGen Civics
 * Interactive, animated page explaining $RCivics tokenomics
 * Design: Enchanted Forest theme with financial credibility
 * Mobile-first layout
 */

import { useState, useEffect, useRef } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { BackButton } from "@/components/BackButton";
import { SEO } from "@/components/SEO";
import { PageWrapper } from "@/components/PageWrapper";
import {
  ArrowRight,
  Coins,
  Vote,
  TrendingUp,
  Droplets,
  Lock,
  Unlock,
  ChevronDown,
  ChevronUp,
  Sprout,
  Globe,
  Repeat,
  BarChart3,
  Leaf,
  Users,
  Building,
  Wallet,
  Zap,
  Shield,
  RefreshCw,
  TreeDeciduous,
  CircleDot,
  ArrowLeftRight,
  Layers,
  Star,
} from "lucide-react";

// Animated Token Flow Component
function AnimatedTokenFlow() {
  const [step, setStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const steps = [
    {
      id: 'invest',
      label: 'Capital Enters',
      icon: '💰',
      color: '#d4a574',
      from: 'Investors',
      to: 'ReGen Civics Fund',
      description: 'Investors contribute capital (fiat, crypto, or equity) to the ReGen Civics Fund in exchange for $RCivics tokens representing their proportional stake.',
      tokenFlow: '$RCivics issued to investors',
    },
    {
      id: 'deploy',
      label: 'Capital Deployed',
      icon: '🌱',
      color: '#7dd87d',
      from: 'ReGen Civics Fund',
      to: 'Land Projects',
      description: 'The Fund deploys capital to vetted Land Projects: startup villages, eco-communities, and regenerative farms. Each project receives funding to build and grow.',
      tokenFlow: 'RCVoice issued to Land Projects',
    },
    {
      id: 'services',
      label: 'Services Flow',
      icon: '🍄',
      color: '#4a9f9f',
      from: 'Land Projects',
      to: 'Alliance Organizations',
      description: 'Land Projects hire Alliance Organizations for the services they need (legal, ecology, tech, finance, etc.). Capital stays within the regenerative network rather than leaking to conventional providers.',
      tokenFlow: 'RCVoice issued to Alliance Orgs',
    },
    {
      id: 'returns',
      label: 'Returns Generated',
      icon: '📈',
      color: '#ffd700',
      from: 'Portfolio',
      to: 'Success Fees Pool',
      description: 'Land Projects generate returns through land appreciation, community revenue, and regenerative outcomes. Alliance Organizations generate revenue through services rendered.',
      tokenFlow: 'Success fees accumulate',
    },
    {
      id: 'distribute',
      label: 'Rewards Distributed',
      icon: '🎯',
      color: '#c17f3a',
      from: 'Success Fees Pool',
      to: '$RCivics Holders',
      description: 'Success fees are distributed proportionally to all $RCivics token holders. Own 10% of $RCivics, receive 10% of all distributions. The cycle then repeats.',
      tokenFlow: 'Distributions to all $RCivics holders',
    },
  ];

  useEffect(() => {
    if (isPlaying) {
      timerRef.current = setTimeout(() => {
        setStep(s => {
          if (s >= steps.length - 1) {
            setIsPlaying(false);
            return s;
          }
          return s + 1;
        });
      }, 2000);
    }
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [isPlaying, step, steps.length]);

  const handlePlay = () => {
    setStep(0);
    setIsPlaying(true);
  };

  const currentStep = steps[step];

  return (
    <div className="space-y-8">
      {/* Step indicators */}
      <div className="flex items-center justify-between gap-1 sm:gap-2">
        {steps.map((s, i) => (
          <button
            key={s.id}
            onClick={() => { setIsPlaying(false); setStep(i); }}
            className={`focus-ring flex-1 flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${
              i === step
                ? 'bg-white/15 scale-105'
                : i < step
                ? 'bg-white/5 opacity-70'
                : 'bg-white/5 opacity-40'
            }`}
          >
            <span className="text-xl sm:text-2xl">{s.icon}</span>
            <span className="text-[10px] sm:text-xs text-white/70 hidden sm:block text-center leading-tight break-words">{s.label}</span>
            <div className={`w-2 h-2 rounded-full transition-all ${
              i === step ? 'bg-white scale-125' : i < step ? 'bg-[#7dd87d]' : 'bg-white/20'
            }`} />
          </button>
        ))}
      </div>

      {/* Main flow visualization */}
      <div
        className="rounded-2xl p-6 sm:p-8 border-2 transition-all duration-500"
        style={{ borderColor: currentStep.color + '60', background: `linear-gradient(135deg, ${currentStep.color}15, rgba(13,40,24,0.8))` }}
      >
        {/* Flow arrow */}
        <div className="flex items-center justify-center gap-3 sm:gap-6 mb-6">
          <div className="bg-white/10 rounded-xl px-4 py-3 text-center flex-1">
            <p className="text-white/50 text-xs mb-1">FROM</p>
            <p className="font-bold text-white text-sm sm:text-base">{currentStep.from}</p>
          </div>
          <div className="flex flex-col items-center gap-1">
            <span className="text-3xl">{currentStep.icon}</span>
            <div className="flex gap-1">
              {[0,1,2].map(i => (
                <div
                  key={i}
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: currentStep.color, opacity: 0.4 + i * 0.3 }}
                />
              ))}
            </div>
          </div>
          <div className="bg-white/10 rounded-xl px-4 py-3 text-center flex-1">
            <p className="text-white/50 text-xs mb-1">TO</p>
            <p className="font-bold text-white text-sm sm:text-base">{currentStep.to}</p>
          </div>
        </div>

        {/* Description */}
        <p className="text-white/80 text-sm sm:text-base leading-relaxed mb-4 text-center">
          {currentStep.description}
        </p>

        {/* Token flow badge */}
        <div className="flex justify-center">
          <div
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold"
            style={{ backgroundColor: currentStep.color + '25', color: currentStep.color, border: `1px solid ${currentStep.color}50` }}
          >
            <span>⟳</span> {currentStep.tokenFlow}
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-4">
        <button
          onClick={handlePlay}
          disabled={isPlaying}
          className="focus-ring px-6 py-3 bg-[#7dd87d] text-[#1a472a] rounded-xl font-bold hover:bg-[#6bc76b] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          {isPlaying ? 'Playing...' : '▶ Play Full Cycle'}
        </button>
        <div className="flex gap-2">
          <button
            onClick={() => { setIsPlaying(false); setStep(s => Math.max(0, s - 1)); }}
            className="focus-ring px-4 py-3 bg-white/10 text-white rounded-xl hover:bg-white/20 transition-all"
          >
            ←
          </button>
          <button
            onClick={() => { setIsPlaying(false); setStep(s => Math.min(steps.length - 1, s + 1)); }}
            className="focus-ring px-4 py-3 bg-white/10 text-white rounded-xl hover:bg-white/20 transition-all"
          >
            →
          </button>
        </div>
        <span className="text-white/60 text-sm">{step + 1} / {steps.length}</span>
      </div>

      {/* All steps overview */}
      <div className="grid grid-cols-5 gap-1.5 sm:gap-2 mt-4">
        {steps.map((s, i) => (
          <div
            key={s.id}
            className={`rounded-lg p-2 sm:p-3 text-center border transition-all cursor-pointer min-h-[68px] flex flex-col items-center justify-center ${
              i === step ? 'border-white/40 bg-white/10' : 'border-white/10 bg-white/5 hover:bg-white/8'
            }`}
            onClick={() => { setIsPlaying(false); setStep(i); }}
          >
            <div className="text-base sm:text-lg mb-1">{s.icon}</div>
            <p className="text-[9px] sm:text-xs text-white/60 leading-tight break-words text-balance">{s.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// Interactive Returns Flow Toggle Component
// ─── Animated counter hook ───────────────────────────────────────────────────
function useCountUp(target: number, duration = 2000, start = false) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!start) return;
    let startTime: number | null = null;
    const step = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      setValue(Math.floor(progress * target));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [target, duration, start]);
  return value;
}

// ─── Intersection observer hook ──────────────────────────────────────────────
function useInView(threshold = 0.3) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setInView(true); },
      { threshold }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [threshold]);
  return { ref, inView };
}

// ─── Flowing particles animation ─────────────────────────────────────────────
function FlowingParticles() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    const particles: { x: number; y: number; vx: number; vy: number; size: number; alpha: number; color: string }[] = [];
    const colors = ["#7dd87d", "#d4a574", "#4a9f9f", "#ffd700"];

    for (let i = 0; i < 40; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.8,
        vy: (Math.random() - 0.5) * 0.8,
        size: Math.random() * 3 + 1,
        alpha: Math.random() * 0.5 + 0.2,
        color: colors[Math.floor(Math.random() * colors.length)],
      });
    }

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.color + Math.floor(p.alpha * 255).toString(16).padStart(2, "0");
        ctx.fill();
      });
      animRef.current = requestAnimationFrame(animate);
    };
    animate();
    return () => cancelAnimationFrame(animRef.current);
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />;
}

// ─── Token Phase Card ─────────────────────────────────────────────────────────
function PhaseCard({
  number,
  title,
  subtitle,
  description,
  icon: Icon,
  color,
  active,
  onClick,
}: {
  number: number;
  title: string;
  subtitle: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`focus-ring w-full text-left rounded-2xl border-2 transition-all duration-300 overflow-hidden ${
        active
          ? `border-[${color}] bg-[${color}]/10`
          : "border-white/10 bg-white/5 hover:border-white/20"
      }`}
      style={{ borderColor: active ? color : undefined }}
    >
      <div className="p-5">
        <div className="flex items-start gap-4">
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 text-[#1a472a] font-bold text-lg"
            style={{ backgroundColor: color }}
          >
            {number}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color }}>
              {subtitle}
            </p>
            <h3 className="text-lg font-bold text-white mb-2" style={{ fontFamily: "var(--font-display)" }}>
              {title}
            </h3>
            {active && (
              <p className="text-white/70 text-sm leading-relaxed">{description}</p>
            )}
          </div>
          <div style={{ color }} className="flex-shrink-0 mt-1">
            <Icon className="w-5 h-5" />
          </div>
        </div>
      </div>
    </button>
  );
}

// ─── Supply Table ─────────────────────────────────────────────────────────────
function SupplyTable() {
  const rows = [
    { contributor: "1,000 ETH investment (CHF 1,518,930)", rcivics: "1,518,930 $RCivics", value: "CHF 1,518,930", color: "#d4a574" },
    { contributor: "CHF 200k financial models (Knowledge Capital)", rcivics: "200,000 $RCivics", value: "CHF 1,718,930", color: "#7dd87d" },
    { contributor: "CHF 1M software open-sourced (Material Capital)", rcivics: "1,000,000 $RCivics", value: "CHF 2,718,930", color: "#4a9f9f" },
    { contributor: "CHF 1M ProjectX land-backed token swap", rcivics: "1,000,000 $RCivics", value: "CHF 3,718,930", color: "#c17f3a" },
    { contributor: "CHF 10M land as future ReGen Civics site", rcivics: "10,000,000 $RCivics", value: "CHF 13,718,930", color: "#ffd700" },
  ];

  return (
    <div className="overflow-x-auto rounded-2xl border border-white/10">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-[#1a472a]/60 border-b border-white/10">
            <th className="text-left p-4 text-[#7dd87d] font-semibold">Contribution</th>
            <th className="text-right p-4 text-[#7dd87d] font-semibold whitespace-nowrap">$RCivics Issued</th>
            <th className="text-right p-4 text-[#7dd87d] font-semibold whitespace-nowrap">Cumulative Value</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-white/5 hover:bg-white/5 transition-colors">
              <td className="p-4 text-white/80">{row.contributor}</td>
              <td className="p-4 text-right font-mono font-bold" style={{ color: row.color }}>
                {row.rcivics}
              </td>
              <td className="p-4 text-right text-white/60">{row.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-white/60 text-xs p-4">
        Example only. Actual issuance governed by 90% unity threshold. 1 CHF = 1 $RCivics in early years.
      </p>
    </div>
  );
}

// ─── Token Comparison ─────────────────────────────────────────────────────────
function TokenComparison() {
  return (
    <div className="grid md:grid-cols-2 gap-6">
      {/* RCVoice */}
      <div className="bg-gradient-to-br from-[#d4a574]/10 to-[#c17f3a]/5 rounded-2xl border border-[#d4a574]/30 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-full bg-[#d4a574] flex items-center justify-center">
            <Vote className="w-6 h-6 text-[#1a472a]" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white" style={{ fontFamily: "var(--font-display)" }}>
              RCVoice
            </h3>
            <p className="text-[#d4a574] text-sm">Fund Governance Token</p>
          </div>
        </div>
        <div className="space-y-3 mb-5">
          {[
            { icon: Shield, text: "Governs all fund decisions and proposals" },
            { icon: Sprout, text: "Granted to representatives - cannot be bought" },
            { icon: Lock, text: "Non-transferable and non-tradable" },
            { icon: Users, text: "Council 40% / Land Projects, Alliance Orgs, Investors 20% each" },
            { icon: TrendingUp, text: 'Evolves: Governance may mature so that "The People" of the ecosystem earn voice over time until we hold 50%' },
          ].map(({ icon: Icon, text }, i) => (
            <div key={i} className="flex items-start gap-3">
              <Icon className="w-4 h-4 text-[#d4a574] mt-0.5 flex-shrink-0" />
              <p className="text-white/75 text-sm">{text}</p>
            </div>
          ))}
        </div>
        <div className="bg-[#d4a574]/10 rounded-xl p-4 border border-[#d4a574]/20">
          <p className="text-[#d4a574] text-xs font-semibold mb-1">Management Fee Share</p>
          <p className="text-white/70 text-sm">50% of management fees distributed proportionally to all RCVoice holders</p>
        </div>
      </div>

      {/* $RCivics */}
      <div className="bg-gradient-to-br from-[#7dd87d]/10 to-[#4a7c59]/5 rounded-2xl border border-[#7dd87d]/30 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-full bg-[#7dd87d] flex items-center justify-center">
            <Coins className="w-6 h-6 text-[#1a472a]" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white" style={{ fontFamily: "var(--font-display)" }}>
              $RCivics
            </h3>
            <p className="text-[#7dd87d] text-sm">Rewards and Returns Token</p>
          </div>
        </div>
        <div className="space-y-3 mb-5">
          {[
            { icon: TrendingUp, text: "Proportional claim on success fees and portfolio returns" },
            { icon: Wallet, text: "Acquired through investment, equity swap, or contribution" },
            { icon: Unlock, text: "Tradable utility token - available on secondary markets when live" },
            { icon: Globe, text: "Index token representing a stake in every project in the alliance" },
            { icon: TreeDeciduous, text: "Backed by land and regeneration - value grows as ecosystems thrive" },
          ].map(({ icon: Icon, text }, i) => (
            <div key={i} className="flex items-start gap-3">
              <Icon className="w-4 h-4 text-[#7dd87d] mt-0.5 flex-shrink-0" />
              <p className="text-white/75 text-sm">{text}</p>
            </div>
          ))}
        </div>
        <div className="bg-[#7dd87d]/10 rounded-xl p-4 border border-[#7dd87d]/20">
          <p className="text-[#7dd87d] text-xs font-semibold mb-1">Success Fee Distribution</p>
          <p className="text-white/70 text-sm">100% of success fees distributed proportionally to $RCivics holders</p>
        </div>
      </div>
    </div>
  );
}

// ─── Acquisition Routes ───────────────────────────────────────────────────────
function AcquisitionRoutes() {
  const routes = [
    {
      icon: Wallet,
      title: "Direct Investment",
      badge: "Open Now",
      badgeColor: "#7dd87d",
      description:
        "Invest directly in the ReGen Civics Fund. Financial contributions are acknowledged at 1 CHF = 1 $RCivics. The primary route for institutional investors and individuals seeking an economic stake in the regenerative ecosystem.",
      cta: "Submit Letter of Intent",
      ctaLink: "/loi",
      details: [
        "Minimum investment: TBD at first close",
        "Accredited investors only",
        "Receive both $RCivics (returns) and RCVoice (governance)",
        "CHF-pegged valuation in early years",
      ],
    },
    {
      icon: ArrowLeftRight,
      title: "Equity Swap",
      badge: "For Orgs and Projects",
      badgeColor: "#4a9f9f",
      description:
        "Land projects and alliance organisations can conduct a token swap - exchanging equity or value-backed tokens of equal value with ReGen Civics. Both parties hold a stake in each other and benefit when the other grows.",
      cta: "Apply as Alliance Partner",
      ctaLink: "/connect?path=alliance",
      details: [
        "Equal value exchange of project tokens for $RCivics",
        "7-year minimum liquidity lock",
        "Lifetime access to alliance tools and services",
        "Both parties benefit from each other's growth",
      ],
    },
    {
      icon: Star,
      title: "Secondary Markets",
      badge: "Coming Soon",
      badgeColor: "#ffd700",
      description:
        "As the ecosystem matures and liquidity pools are established, $RCivics will be available on secondary markets. We will announce listings through our official channels.",
      cta: "Join the Waitlist",
      ctaLink: "/newsletter",
      details: [
        "Liquidity pools being established with alliance partners",
        "Targeting launch alongside Earth Day 2026 governance dashboard",
        "Will enable fluid exchange across all alliance tokens",
        "Announcement via newsletter and community channels",
      ],
    },
  ];

  const [open, setOpen] = useState<number | null>(0);

  return (
    <div className="space-y-4">
      {routes.map((route, i) => (
        <div
          key={i}
          className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden"
        >
          <button
            onClick={() => setOpen(open === i ? null : i)}
            className="focus-ring w-full p-5 text-left hover:bg-white/5 transition-colors"
          >
            <div className="flex items-center gap-4">
              <div
                className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: route.badgeColor + "20", border: `1px solid ${route.badgeColor}40` }}
              >
                <route.icon className="w-5 h-5" style={{ color: route.badgeColor }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-lg font-bold text-white" style={{ fontFamily: "var(--font-display)" }}>
                    {route.title}
                  </h3>
                  <span
                    className="text-xs font-semibold px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: route.badgeColor + "20", color: route.badgeColor, border: `1px solid ${route.badgeColor}40` }}
                  >
                    {route.badge}
                  </span>
                </div>
                <p className="text-white/60 text-sm mt-0.5 line-clamp-1">{route.description.slice(0, 80)}...</p>
              </div>
              {open === i ? (
                <ChevronUp className="w-5 h-5 text-white/60 flex-shrink-0" />
              ) : (
                <ChevronDown className="w-5 h-5 text-white/60 flex-shrink-0" />
              )}
            </div>
          </button>
          {open === i && (
            <div className="px-5 pb-5">
              <p className="text-white/75 text-sm leading-relaxed mb-4">{route.description}</p>
              <ul className="space-y-2 mb-5">
                {route.details.map((d, j) => (
                  <li key={j} className="flex items-start gap-2 text-sm text-white/65">
                    <CircleDot className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" style={{ color: route.badgeColor }} />
                    {d}
                  </li>
                ))}
              </ul>
              <Link href={route.ctaLink}>
                <Button
                  className="font-semibold"
                  style={{ backgroundColor: route.badgeColor, color: "#1a472a" }}
                >
                  {route.cta} <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </Link>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Liquidity Pool Visual ────────────────────────────────────────────────────
function LiquidityPoolVisual() {
  const [step, setStep] = useState(0);

  const steps = [
    { label: "Alliance Partner X conducts token swap with ReGen Civics", pool: 0 },
    { label: "Partner X adds 250k $RCivics + 250k PartX to liquidity pool", pool: 500000 },
    { label: "ReGen Civics adds 150k PartX + 150k $RCivics to same pool", pool: 800000 },
    { label: "Pool is live - anyone can trade between PartX and $RCivics", pool: 800000 },
  ];

  return (
    <div className="bg-[#0d2818]/60 rounded-2xl border border-[#7dd87d]/20 p-6">
      <h4 className="text-lg font-bold text-white mb-4" style={{ fontFamily: "var(--font-display)" }}>
        How Liquidity Pools Work
      </h4>
      <div className="flex items-center gap-3 mb-6 p-4 bg-[#1a472a]/40 rounded-xl">
        <Droplets className="w-5 h-5 text-[#4a9f9f] flex-shrink-0" />
        <p className="text-white/75 text-sm">{steps[step].label}</p>
      </div>
      {step >= 1 && (
        <div className="mb-4">
          <div className="flex justify-between text-xs text-white/50 mb-1">
            <span>Pool Size</span>
            <span className="text-[#4a9f9f] font-bold">CHF {steps[step].pool.toLocaleString()}</span>
          </div>
          <div className="h-4 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${(steps[step].pool / 800000) * 100}%`,
                background: "linear-gradient(90deg, #4a9f9f, #7dd87d)",
              }}
            />
          </div>
        </div>
      )}
      <div className="flex gap-2 flex-wrap">
        {steps.map((s, i) => (
          <button
            key={i}
            onClick={() => setStep(i)}
            className={`focus-ring px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              step === i
                ? "bg-[#4a9f9f] text-[#0d2818]"
                : "bg-white/10 text-white/60 hover:bg-white/20"
            }`}
          >
            Step {i + 1}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Returns Flow Diagram ─────────────────────────────────────────────────────
function ReturnsFlowDiagram() {
  const [animated, setAnimated] = useState(false);
  const { ref, inView } = useInView(0.3);

  useEffect(() => {
    if (inView) setAnimated(true);
  }, [inView]);

  const groups = [
    { label: "Council of Experts", pct: "Majority", color: "#d4a574", icon: "🌳" },
    { label: "Land Projects", pct: "Pro-rata", color: "#4a7c59", icon: "🌱" },
    { label: "Alliance Orgs", pct: "Pro-rata", color: "#4a9f9f", icon: "🤝" },
    { label: "Investors", pct: "Pro-rata", color: "#c17f3a", icon: "💛" },
  ];

  return (
    <div ref={ref} className="bg-[#0d2818]/60 rounded-2xl border border-[#7dd87d]/20 p-6">
      <h4 className="text-lg font-bold text-white mb-2" style={{ fontFamily: "var(--font-display)" }}>
        Distribution Breakdown
      </h4>
      <p className="text-white/60 text-sm mb-6">
        Portfolio Distributions go to <strong className="text-[#7dd87d]">$RCivics holders</strong>. Management fees split 50% Council / 50% all RCVoice holders.
      </p>

      {/* Portfolio source */}
      <div className="flex justify-center mb-6">
        <div className="bg-gradient-to-br from-[#1a472a] to-[#0d2818] rounded-2xl border-2 border-[#7dd87d]/40 px-6 py-4 text-center">
          <p className="text-[#7dd87d] text-xs font-semibold uppercase tracking-wider mb-1">Portfolio</p>
          <p className="text-white font-bold">Land Projects + Alliance Orgs</p>
          <p className="text-white/50 text-xs mt-1">Generate returns together</p>
        </div>
      </div>

      {/* Flow arrows */}
      <div className="flex justify-center mb-4">
        <div className="flex flex-col items-center gap-1">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-0.5 h-4 rounded-full transition-all duration-500"
              style={{
                backgroundColor: "#7dd87d",
                opacity: animated ? 0.8 - i * 0.2 : 0,
                transitionDelay: `${i * 150}ms`,
              }}
            />
          ))}
          <div
            className="text-[#7dd87d] text-lg transition-all duration-500"
            style={{ opacity: animated ? 1 : 0, transitionDelay: "450ms" }}
          >
            ↓
          </div>
        </div>
      </div>

      {/* Distribution split */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-[#7dd87d]/10 border border-[#7dd87d]/30 rounded-xl p-4 text-center">
          <p className="text-[#7dd87d] font-bold text-lg">Portfolio Distributions</p>
          <p className="text-white/60 text-xs mt-1">To $RCivics holders</p>
          <p className="text-white/50 text-xs">Proportional to token holdings</p>
        </div>
        <div className="bg-[#d4a574]/10 border border-[#d4a574]/30 rounded-xl p-4 text-center">
          <p className="text-[#d4a574] font-bold text-lg">Management Fees</p>
          <p className="text-white/60 text-xs mt-1">50% Council + 50% RCVoice</p>
          <p className="text-white/50 text-xs">Council funds worker proposals</p>
        </div>
      </div>

      {/* Recipients */}
      <div className="grid grid-cols-2 gap-2">
        {groups.map((g, i) => (
          <div
            key={i}
            className="flex items-center gap-2 bg-[#1a472a]/40 rounded-lg px-3 py-2 transition-all duration-500"
            style={{
              borderLeft: `3px solid ${g.color}`,
              opacity: animated ? 1 : 0,
              transform: animated ? "translateX(0)" : "translateX(-10px)",
              transitionDelay: `${i * 100 + 600}ms`,
            }}
          >
            <span className="text-base">{g.icon}</span>
            <div>
              <p className="text-white text-xs font-semibold">{g.label}</p>
              <p className="text-white/50 text-xs">{g.pct}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function Tokenomics() {
  const [activePhase, setActivePhase] = useState(0);
  const { ref: statsRef, inView: statsInView } = useInView(0.3);
  const projectCount = useCountUp(13, 2000, statsInView);
  const allianceCount = useCountUp(30, 2500, statsInView);
  const chfRate = useCountUp(1, 1000, statsInView);

  const phases = [
    {
      number: 1,
      title: "Acknowledgement Token",
      subtitle: "Phase 1 - Active Now",
      description:
        "The first function of $RCivics is to acknowledge and reciprocate contributions to the Regenerative Renaissance. New tokens are minted only when contributions are formally acknowledged through governance - so every token in circulation represents real value contributed to the movement. Contributions can be financial, knowledge, material, natural, or experiential capital.",
      icon: Sprout,
      color: "#7dd87d",
    },
    {
      number: 2,
      title: "Index / Investment Token",
      subtitle: "Phase 2 - Building",
      description:
        "As the portfolio grows, $RCivics matures into an index token for the Regenerative Renaissance. Financial contributions are directed towards land projects in exchange for their tokens - so $RCivics comes to represent a proportional stake in every project and organisation in the alliance. Backed by land and regeneration: as ecosystems thrive, the backing behind $RCivics grows.",
      icon: BarChart3,
      color: "#d4a574",
    },
    {
      number: 3,
      title: "Liquidity Token",
      subtitle: "Phase 3 - Emerging",
      description:
        "As token swaps are established across the portfolio, $RCivics becomes the interchange token for the entire alliance. Any token in the ecosystem can be converted to any other by routing through $RCivics liquidity pools. All trading yields and fees are reinvested into regeneration. You can spend tokens from one project at another - automatically, behind the scenes.",
      icon: Droplets,
      color: "#4a9f9f",
    },
    {
      number: 4,
      title: "Ecosystem Access Token",
      subtitle: "Phase 4 - Future",
      description:
        "In the coming future, organisations using the ReGen Civics ecosystem of tools will stake $RCivics tokens to access the full suite of alliance services. This creates organic demand without extractive fees. Alliance organisations are encouraged to hold their $RCivics tokens after the 7-year liquidity lock to retain lifetime access to the ecosystem's tools and benefits.",
      icon: Lock,
      color: "#ffd700",
    },
  ];

  return (
    <PageWrapper>
    <div className="min-h-screen bg-gradient-to-b from-[#1a472a] to-[#0d2818]">
      <SEO
        title="$RCivics Tokenomics | ReGen Civics"
        description="Understand the $RCivics token economy - an index token for the Regenerative Renaissance backed by land, governed by community, and designed to keep value circulating within the ecosystem."
        url="/tokenomics"
      />
      <BackButton />

      {/* ── $ReGen Caveat Note ── */}
      <div className="container px-4 pt-8">
        <div className="max-w-4xl mx-auto border-l-4 border-[#7dd87d]/60 bg-[#7dd87d]/10 rounded-r-xl px-5 py-4">
          <p className="text-white/90 text-sm leading-relaxed">
            <strong className="text-[#7dd87d]">A note on $ReGen:</strong> This page focuses on $RCivics, the Fund's token. $ReGen is the token for the Infinite Game, anchored in local food systems and the bioregions playing it. Its full design lives on the other side of the bridge. <Link href="/bionomics" className="underline text-[#7dd87d] hover:text-white">Read the Bionomics page</Link> for how $ReGen, gratitude, and the living economy fit together.
          </p>
        </div>
      </div>

      {/* ── Hero ── */}
      <section className="relative min-h-[70vh] flex items-center overflow-hidden pt-16">
        <FlowingParticles />
        <div className="container relative z-10 py-16 px-4">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-5 py-2 mb-6 rounded-full bg-[#7dd87d] text-[#1a472a] text-sm font-semibold">
              <Coins className="w-5 h-5" />
              <span>Token Economics for the Regenerative Renaissance</span>
            </div>
            <h1
              className="ink-reveal text-4xl sm:text-5xl md:text-7xl font-bold text-white mb-6 leading-none drop-shadow-[0_4px_12px_rgba(0,0,0,0.7)]"
              style={{ fontFamily: "var(--font-display)" }}
            >
              <span className="text-[#7dd87d]">$RCivics</span> Tokenomics
            </h1>
            <div className="bg-[#1a472a]/60 backdrop-blur-sm rounded-2xl border border-[#7dd87d]/20 p-6 md:p-8 mb-8 text-left">
              <p className="text-white/90 text-lg leading-relaxed mb-4 safe-prose">
                <strong className="text-[#7dd87d]">Tokenomics = Token Economics.</strong> Tokens are the things we create through our governance process to account for things. And economics? The word comes from the Ancient Greek{" "}
                <em className="text-[#d4a574]">oikonomia</em> (οἰκονομία) - a compound of <em className="text-[#d4a574]">oikos</em> (οἶκος), meaning "household," and <em className="text-[#d4a574]">nomos</em> (νόμος), meaning "law" or "custom."
              </p>
              <p className="text-white/75 text-base leading-relaxed safe-prose">
                It originally meant "household management." In our case, our token economic system sees Earth as our home - and we're designing an economic system for how we can go about caring for our home together.
              </p>
            </div>
            <div className="flex flex-wrap gap-4 justify-center">
              <Link href="/loi">
                <Button
                  size="lg"
                  className="rounded-xl bg-[#7dd87d] hover:bg-[#6bc76b] text-[#1a472a] font-bold px-8"
                  style={{ fontFamily: "var(--font-accent)" }}
                >
                  <Wallet className="mr-2 w-5 h-5" /> Acquire $RCivics
                </Button>
              </Link>
              <Link href="/governance">
                <Button
                  size="lg"
                  variant="outline"
                  className="rounded-xl border-2 border-[#d4a574]/60 text-[#d4a574] hover:bg-[#d4a574]/10 px-8"
                  style={{ fontFamily: "var(--font-accent)" }}
                >
                  <Vote className="mr-2 w-5 h-5" /> Governance Model
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Stats ── */}
      <section data-reveal className="py-12 px-4 bg-[#0d2818]/50">
        <div ref={statsRef} className="container">
          <div className="grid grid-cols-3 gap-4 max-w-2xl mx-auto">
            {[
              { value: `${projectCount}`, label: "Projects per Season", suffix: "", color: "#7dd87d" },
              { value: `${allianceCount}+`, label: "Alliance Orgs Interested", suffix: "", color: "#d4a574" },
              { value: `${chfRate} CHF`, label: "= 1 $RCivics (Early Years)", suffix: "", color: "#4a9f9f" },
            ].map((stat, i) => (
              <div key={i} className="text-center p-4 bg-[#1a472a]/40 rounded-2xl border border-white/10">
                <p
                  className="text-2xl md:text-3xl font-bold mb-1"
                  style={{ color: stat.color, fontFamily: "var(--font-display)" }}
                >
                  {stat.value}
                </p>
                <p className="text-white/50 text-xs">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Two Tokens ── */}
      <section className="py-16 px-4">
        <div className="container">
          <div className="max-w-4xl mx-auto">
            <h2
              className="text-3xl font-bold text-[#7dd87d] mb-3 text-center"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Two Tokens, Two Powers
            </h2>
            <p className="text-white/70 text-center mb-10 max-w-2xl mx-auto">
              RCVoice governs decisions. $RCivics governs rewards. Understanding this distinction is the foundation of everything else.
            </p>
            <TokenComparison />
          </div>
        </div>
      </section>

      {/* ── 4 Phases ── */}
      <section className="py-16 px-4 bg-[#0d2818]/40">
        <div className="container">
          <div className="max-w-4xl mx-auto">
            <h2
              className="text-3xl font-bold text-white mb-3 text-center"
              style={{ fontFamily: "var(--font-display)" }}
            >
              4 Progressive Functions
            </h2>
            <p className="text-white/60 text-center mb-10 max-w-2xl mx-auto">
              $RCivics is not a static token. It matures through four stacking functions as the ecosystem grows. Tap each phase to learn more.
            </p>

            {/* Phase timeline indicator */}
            <div className="flex items-center justify-center gap-2 mb-8">
              {phases.map((p, i) => (
                <button
                  key={i}
                  onClick={() => setActivePhase(i)}
                  className="focus-ring flex flex-col items-center gap-1"
                >
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300"
                    style={{
                      backgroundColor: activePhase === i ? p.color : "transparent",
                      border: `2px solid ${p.color}`,
                      color: activePhase === i ? "#1a472a" : p.color,
                    }}
                  >
                    {p.number}
                  </div>
                  {i < phases.length - 1 && (
                    <div className="hidden" />
                  )}
                </button>
              ))}
            </div>

            <div className="space-y-3">
              {phases.map((phase, i) => (
                <PhaseCard
                  key={i}
                  {...phase}
                  active={activePhase === i}
                  onClick={() => setActivePhase(i)}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Supply Table ── */}
      <section className="py-16 px-4">
        <div className="container">
          <div className="max-w-4xl mx-auto">
            <h2
              className="text-3xl font-bold text-white mb-3"
              style={{ fontFamily: "var(--font-display)" }}
            >
              How Supply Is Created
            </h2>
            <p className="text-white/70 mb-6 leading-relaxed safe-prose prose-readable">
              $RCivics starts at zero. New tokens are minted only when new contributions are formally acknowledged through the governance process - requiring a 90% unity threshold to pass. Every token in circulation represents real value contributed to the movement.
            </p>
            <SupplyTable />
          </div>
        </div>
      </section>

      {/* ── Returns Flow ── */}
      <section className="py-16 px-4 bg-[#0d2818]/40">
        <div className="container">
          <div className="max-w-4xl mx-auto">
            <h2
              className="text-3xl font-bold text-white mb-3"
              style={{ fontFamily: "var(--font-display)" }}
            >
              How Returns Flow
            </h2>
            <p className="text-white/70 mb-8 leading-relaxed safe-prose prose-readable">
              Returns are generated by the entire portfolio - land projects and alliance organisations alike. Alliance organisations do the work land projects need, keeping resources circulating within the network rather than flowing out to external providers.
            </p>
            <div className="grid md:grid-cols-2 gap-6">
              <ReturnsFlowDiagram />
              <div className="space-y-4">
                <div className="bg-[#1a472a]/40 rounded-2xl border border-[#7dd87d]/20 p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <RefreshCw className="w-5 h-5 text-[#7dd87d]" />
                    <h4 className="font-bold text-white">Network Circulation</h4>
                  </div>
                  <p className="text-white/70 text-sm leading-relaxed safe-prose">
                    Land projects use their funds to pay alliance organisations for services wherever possible - legal support, ecological design, technology, financial modelling, organisational development. Every payment within the network strengthens the whole.
                  </p>
                </div>
                <div className="bg-[#1a472a]/40 rounded-2xl border border-[#d4a574]/20 p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <Zap className="w-5 h-5 text-[#d4a574]" />
                    <h4 className="font-bold text-white">Shared Abundance</h4>
                  </div>
                  <p className="text-white/70 text-sm leading-relaxed safe-prose">
                    ReGen Civics distributes returns directly to its members. Profits are shared proportionally among investors, land projects, alliance organisations, and players. Every surplus generated from fees, yields, or contributions flows back to the people who created it.
                  </p>
                </div>
                <div className="bg-[#1a472a]/40 rounded-2xl border border-[#4a9f9f]/20 p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <TreeDeciduous className="w-5 h-5 text-[#4a9f9f]" />
                    <h4 className="font-bold text-white">Backed by Regeneration</h4>
                  </div>
                  <p className="text-white/70 text-sm leading-relaxed safe-prose">
                    As we regenerate land and communities, the assets backing $RCivics increase in value. A food forest producing abundant yields is worth more than degraded farmland. Regeneration is the return.
                  </p>
                </div>
              </div>

              {/* Regeneration is our foundation */}
              <div className="mt-8 max-w-4xl mx-auto bg-[#0d2818]/70 border border-[#7dd87d]/30 rounded-2xl p-6 md:p-8">
                <div className="flex items-center gap-3 mb-3">
                  <Sprout className="w-6 h-6 text-[#7dd87d]" />
                  <h3 className="text-xl font-bold text-white" style={{ fontFamily: "var(--font-display)" }}>
                    Regeneration is our foundation
                  </h3>
                </div>
                <p className="text-white/85 text-base leading-relaxed safe-prose">
                  Every month we hold a project, we are doing the work. Planting fruiting trees,
                  healing soil, building infrastructure, making the land more abundant and more
                  valuable. So if any individual project fails to deliver its planned returns,
                  we can sell the land. Because of the regenerative work we have done, the land
                  is presumably worth more than when we acquired it. That sale becomes a return
                  for investors. Successful projects create ongoing yield. Failed projects, in
                  our model, can also become a source of returns. The land itself is the floor.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Liquidity Pools ── */}
      <section className="py-16 px-4">
        <div className="container">
          <div className="max-w-4xl mx-auto">
            <h2
              className="text-3xl font-bold text-white mb-3"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Liquidity Pools and Token Swaps
            </h2>
            <p className="text-white/70 mb-8 leading-relaxed safe-prose prose-readable">
              When two organisations conduct a token swap, both parties set up liquidity pools - always-available exchanges where community members can trade between project tokens and $RCivics. This creates the network effect that makes $RCivics the interchange token for the entire alliance.
            </p>
            <div className="grid md:grid-cols-2 gap-6">
              <LiquidityPoolVisual />
              <div className="bg-[#0d2818]/60 rounded-2xl border border-[#7dd87d]/20 p-6">
                <h4 className="text-lg font-bold text-white mb-4" style={{ fontFamily: "var(--font-display)" }}>
                  What a Token Swap Means
                </h4>
                <div className="space-y-4">
                  {[
                    { icon: ArrowLeftRight, color: "#7dd87d", title: "Equal Value Exchange", desc: "Two organisations swap equity or value-backed tokens of equal value. Both now hold a stake in each other." },
                    { icon: Lock, color: "#d4a574", title: "7-Year Minimum Lock", desc: "Both parties commit to locking their liquidity for at least 7 years - ensuring long-term stability and deep alignment with regenerative timelines." },
                    { icon: Globe, color: "#4a9f9f", title: "Fluid Alliance Tokens", desc: "Any token in the ecosystem becomes convertible to any other through $RCivics - automatically, behind the scenes." },
                    { icon: Layers, color: "#ffd700", title: "Lifetime Access", desc: "Projects that hold their $RCivics after the lock period retain lifetime access to all alliance tools and services." },
                  ].map(({ icon: Icon, color, title, desc }, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: color + "20" }}>
                        <Icon className="w-4 h-4" style={{ color }} />
                      </div>
                      <div>
                        <p className="text-white font-semibold text-sm">{title}</p>
                        <p className="text-white/60 text-sm">{desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── How to Acquire ── */}
      <section className="py-16 px-4 bg-[#0d2818]/40">
        <div className="container">
          <div className="max-w-4xl mx-auto">
            <h2
              className="text-3xl font-bold text-white mb-3"
              style={{ fontFamily: "var(--font-display)" }}
            >
              How to Acquire $RCivics
            </h2>
            <p className="text-white/70 mb-8">
              There are currently three routes to acquiring $RCivics tokens. Secondary market listings will be announced as the ecosystem matures.
            </p>
            <AcquisitionRoutes />
          </div>
        </div>
      </section>

      {/* Network Circulation */}
      <section className="py-16 px-4 bg-[#0d2818]/50">
        <div className="container">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-3xl font-bold text-[#7dd87d] mb-4 text-center">Network Circulation: How Resources Flow</h2>
            <p className="text-white/80 text-lg leading-relaxed mb-12 text-center max-w-3xl mx-auto safe-prose">
              One of the most powerful features of the ReGen Civics model is that money circulates within the regenerative network. Land Projects hire Alliance Organizations for the services they need, keeping capital flowing between regenerative actors rather than leaking to conventional providers.
            </p>

            {/* Flow Diagram */}
            <div className="relative mb-12">
              {/* Center Hub */}
              <div className="flex flex-col items-center mb-8">
                <div className="bg-gradient-to-br from-[#1a472a] to-[#0d2818] border-2 border-[#7dd87d] rounded-2xl px-8 py-5 text-center shadow-lg shadow-[#7dd87d]/20">
                  <p className="text-[#7dd87d] font-bold text-lg">ReGen Civics Fund</p>
                  <p className="text-white/60 text-sm">Capital deployed to the network</p>
                </div>
                <div className="w-0.5 h-8 bg-[#7dd87d]/40" />
                <div className="text-[#7dd87d] text-xs font-semibold">funds</div>
                <div className="w-0.5 h-8 bg-[#7dd87d]/40" />
              </div>

              {/* Two columns: Land Projects + Alliance Orgs */}
              <div className="grid md:grid-cols-2 gap-6 mb-8">
                {/* Land Projects */}
                <div className="bg-[#1a472a]/50 rounded-2xl p-6 border border-[#4a7c59]/50">
                  <div className="flex items-center gap-3 mb-4">
                    <span className="text-3xl">🌱</span>
                    <div>
                      <h3 className="text-lg font-bold text-[#7dd87d]">Land Projects</h3>
                      <p className="text-white/60 text-sm">Startup villages, eco-communities, regenerative farms</p>
                    </div>
                  </div>
                  <p className="text-white/70 text-sm leading-relaxed mb-4 safe-prose">
                    Land Projects receive capital to develop regenerative communities. Rather than hiring conventional service providers, they prioritize Alliance Organizations within the network for every service they need.
                  </p>
                  <div className="bg-[#0d2818]/50 rounded-lg p-3">
                    <p className="text-xs font-semibold text-[#7dd87d] mb-2">Services they need:</p>
                    <div className="flex flex-wrap gap-1.5">
                      {["Legal & Governance", "Ecology & Restoration", "Architecture", "Infrastructure", "Finance & Accounting", "Technology", "Education", "Healthcare", "Food Systems", "Energy"].map(s => (
                        <span key={s} className="px-2 py-0.5 bg-[#7dd87d]/10 text-[#7dd87d] rounded text-xs border border-[#7dd87d]/20">{s}</span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Alliance Organizations */}
                <div className="bg-[#1a472a]/50 rounded-2xl p-6 border border-[#4a9f9f]/50">
                  <div className="flex items-center gap-3 mb-4">
                    <span className="text-3xl">🍄</span>
                    <div>
                      <h3 className="text-lg font-bold text-[#4a9f9f]">Alliance Organizations</h3>
                      <p className="text-white/60 text-sm">Specialized service providers in the regenerative space</p>
                    </div>
                  </div>
                  <p className="text-white/70 text-sm leading-relaxed mb-4 safe-prose">
                    Alliance Organizations are the specialists who do the work Land Projects need. By serving Land Projects, they generate revenue that flows back into the ecosystem - and they earn $RCivics tokens representing their stake in the network's collective success.
                  </p>
                  <div className="bg-[#0d2818]/50 rounded-lg p-3">
                    <p className="text-xs font-semibold text-[#4a9f9f] mb-2">Organization types:</p>
                    <div className="flex flex-wrap gap-1.5">
                      {["Legal Firms", "Ecology Consultants", "Tech Builders", "Infrastructure Co-ops", "Financial Advisors", "Governance Designers", "Education Orgs", "Health Practitioners", "Food Innovators", "Energy Providers"].map(s => (
                        <span key={s} className="px-2 py-0.5 bg-[#4a9f9f]/10 text-[#4a9f9f] rounded text-xs border border-[#4a9f9f]/20">{s}</span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Circulation arrow */}
              <div className="flex items-center justify-center gap-4 mb-8">
                <div className="flex-1 h-0.5 bg-gradient-to-r from-transparent via-[#7dd87d]/40 to-[#7dd87d]/40" />
                <div className="bg-[#1a472a] border border-[#7dd87d]/40 rounded-full px-6 py-3 text-center">
                  <p className="text-[#7dd87d] font-bold text-sm">Resources stay in the network</p>
                  <p className="text-white/50 text-xs">Land Projects pay Alliance Orgs, not conventional providers</p>
                </div>
                <div className="flex-1 h-0.5 bg-gradient-to-l from-transparent via-[#7dd87d]/40 to-[#7dd87d]/40" />
              </div>

              {/* Returns flow back */}
              <div className="bg-gradient-to-r from-[#d4a574]/10 via-[#d4a574]/5 to-[#d4a574]/10 rounded-2xl p-6 border border-[#d4a574]/30 text-center">
                <p className="text-[#d4a574] font-bold text-lg mb-2">Returns Flow to $RCivics Holders</p>
                <p className="text-white/70 text-sm leading-relaxed max-w-2xl mx-auto safe-prose">
                  As Land Projects generate returns (through land appreciation, community revenue, and regenerative outcomes) and Alliance Organizations generate revenue (through services rendered), success fees are distributed proportionally to all $RCivics token holders - creating a self-reinforcing cycle where every participant benefits from the network's collective growth.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Animated Token Flow Visualization */}
      <section className="py-16 px-4">
        <div className="container">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-3xl font-bold text-[#7dd87d] mb-4 text-center">How Tokens Move Through the Ecosystem</h2>
            <p className="text-white/80 text-lg leading-relaxed mb-8 text-center max-w-3xl mx-auto">
              Capital enters the network, flows to Land Projects and Alliance Organizations, and returns as rewards to $RCivics holders. Press Play to watch the full cycle, or step through each stage manually.
            </p>
            <AnimatedTokenFlow />
          </div>
        </div>
      </section>

      {/* ── Multi-generational ── */}
      <section className="py-16 px-4">
        <div className="container">
          <div className="max-w-3xl mx-auto text-center">
            <div className="text-5xl mb-6">🌳</div>
            <h2
              className="text-3xl font-bold text-white mb-6"
              style={{ fontFamily: "var(--font-display)" }}
            >
              A Multi-Generational Journey
            </h2>
            <p className="text-white/80 text-lg leading-relaxed mb-6 safe-prose prose-readable">
              We don't focus on market cycles, bull runs, or token valuations. We measure our success by our shared progress towards co-creating regenerative cultures and civilizations.
            </p>
            <p className="text-white/65 leading-relaxed mb-8 safe-prose prose-readable">
              Much like planting mighty nut-bearing trees is a gift our descendants most benefit from, our efforts to create the foundations for new civilizations will be most enjoyed by those who come after us. The token economic system we are building keeps value circulating within the movement: rewarding those who contribute, backing the token with the land and communities we regenerate, and building a financial system that is genuinely by the people and for the planet.
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
              <Link href="/investor">
                <Button
                  size="lg"
                  className="rounded-xl bg-[#7dd87d] hover:bg-[#6bc76b] text-[#1a472a] font-bold px-8"
                  style={{ fontFamily: "var(--font-accent)" }}
                >
                  <Wallet className="mr-2 w-5 h-5" /> Invest in the Movement
                </Button>
              </Link>
              <Link href="/governance">
                <Button
                  size="lg"
                  variant="outline"
                  className="rounded-xl border-2 border-[#7dd87d]/50 text-[#7dd87d] hover:bg-[#7dd87d]/10 px-8"
                  style={{ fontFamily: "var(--font-accent)" }}
                >
                  Governance Model <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
    </PageWrapper>
  );
}
