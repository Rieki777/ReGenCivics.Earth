/**
 * Tokenomics Page - ReGen Civics
 * How tokens work here: the Game's two tokens ($ReGen and RGVoice), where the
 * two tokens from the earlier fund design ($RCivics and RCVoice) stand, and
 * what a token is for.
 * Design: Enchanted Forest theme
 * Mobile-first layout
 *
 * Rewritten 2026-09-27 (Phase 0, FUNDING_ENGINE_PLAN v1.2). This page used to
 * describe $RCivics as an investment: capital in, distributions out, liquidity
 * pools, secondary markets and a direct-investment route. None of it was true
 * or on offer, and the fund is now a cooperative in design. The old page is
 * tagged archive/fund-pages-2026-09-27. Every sentence about the cooperative
 * or the fund-design tokens comes from COOP in shared/fund.ts.
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
  Lock,
  Sprout,
  Leaf,
  Users,
  RefreshCw,
  ScrollText,
  Landmark,
} from "lucide-react";
import { COOP } from "@shared/fund";
import { LandscapeSVG } from "@/components/backgrounds/LandscapeSVG";
import { ReadingTime } from "@/components/ReadingTime";
import { Pullquote } from "@/components/Pullquote";
import { StarsDivider } from "@/components/dividers/StarsDivider";

// Animated path from a contribution to a token and a vote
function AnimatedTokenFlow() {
  const [step, setStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const steps = [
    {
      id: 'contribute',
      label: 'Contribute',
      icon: '🌱',
      color: '#7dd87d',
      from: 'You',
      to: 'A quest or a need',
      description: 'You complete a quest, help a land project with something it needs, or send gratitude to someone whose work helped you.',
      tokenFlow: 'Contribution made',
    },
    {
      id: 'recognize',
      label: 'Recognized',
      icon: '🙏',
      color: '#d4a574',
      from: 'Other players',
      to: 'Your contribution',
      description: 'Other players read your quest completion proposal and vote on it, or send you gratitude. Older work, like contributions from the SEEDS era, goes through a community proposal.',
      tokenFlow: 'Community recognition',
    },
    {
      id: 'record',
      label: 'Recorded',
      icon: '📜',
      color: '#4a9f9f',
      from: 'The Game',
      to: 'Your account',
      description: 'The Game credits $ReGen and RGVoice to your account. Each credit is logged with its source: a quest, a gratitude cycle, a harvest or a proposal.',
      tokenFlow: '$ReGen and RGVoice credited',
    },
    {
      id: 'voice',
      label: 'Voice',
      icon: '🗳️',
      color: '#ffd700',
      from: 'Your RGVoice',
      to: 'Game decisions',
      description: 'RGVoice gives your vote weight on proposals about quests, rules and seasons. It wanes 3% each month, so voice stays with the people playing now.',
      tokenFlow: 'Your vote carries weight',
    },
    {
      id: 'hypha',
      label: 'On Hypha',
      icon: '⛓️',
      color: '#c8a8e0',
      from: 'Your account',
      to: 'Hypha on Base',
      description: 'Once your balance reaches the claim threshold, you can move tokens on-chain to Hypha, where binding votes happen. The move goes one way.',
      tokenFlow: 'Claimed on-chain',
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
            aria-label={`Step ${i + 1}: ${s.label}`}
            className={`focus-ring flex-1 flex flex-col items-center gap-1 p-2 min-h-[44px] rounded-xl transition-all ${
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
            <p className="text-white/70 text-xs mb-1">FROM</p>
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
            <p className="text-white/70 text-xs mb-1">TO</p>
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
          className="focus-ring px-6 py-3 bg-[#7dd87d] text-[#1a472a] rounded-xl font-bold hover:bg-[#9de89d] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          {isPlaying ? 'Playing...' : '▶ Play the Path'}
        </button>
        <div className="flex gap-2">
          <button
            onClick={() => { setIsPlaying(false); setStep(s => Math.max(0, s - 1)); }}
            aria-label="Previous step"
            className="focus-ring px-4 py-3 bg-white/10 text-white rounded-xl hover:bg-white/20 transition-all"
          >
            ←
          </button>
          <button
            onClick={() => { setIsPlaying(false); setStep(s => Math.min(steps.length - 1, s + 1)); }}
            aria-label="Next step"
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

// ─── The Game's two tokens ────────────────────────────────────────────────────
function GameTokens() {
  return (
    <div className="grid md:grid-cols-2 gap-6">
      {/* RGVoice */}
      <div className="bg-gradient-to-br from-[#c8a8e0]/10 to-[#c8a8e0]/5 rounded-2xl border border-[#c8a8e0]/30 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-full bg-[#c8a8e0] flex items-center justify-center">
            <Vote className="w-6 h-6 text-[#1a472a]" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white" style={{ fontFamily: "var(--font-display)" }}>
              RGVoice
            </h3>
            <p className="text-[#c8a8e0] text-sm">Game Governance Token</p>
          </div>
        </div>
        <div className="space-y-3 mb-5">
          {[
            { icon: Vote, text: "Gives your vote weight on quests, Game rules and seasonal decisions" },
            { icon: Sprout, text: "Earned by completing quests and contributing. It can't be bought." },
            { icon: Lock, text: "Non-transferable and non-tradable. It stays tied to your own participation." },
            { icon: RefreshCw, text: "Wanes 3% each month, so governance stays with the people playing now" },
            { icon: Users, text: "Can be delegated to a player you trust" },
          ].map(({ icon: Icon, text }, i) => (
            <div key={i} className="flex items-start gap-3">
              <Icon className="w-4 h-4 text-[#c8a8e0] mt-0.5 flex-shrink-0" />
              <p className="text-white/75 text-sm">{text}</p>
            </div>
          ))}
        </div>
        <div className="bg-[#c8a8e0]/10 rounded-xl p-4 border border-[#c8a8e0]/20">
          <p className="text-[#c8a8e0] text-xs font-semibold mb-1">Where binding votes happen</p>
          <p className="text-white/70 text-sm">Formal governance and binding votes happen on Hypha, where vote weight comes from RGVoice held.</p>
        </div>
      </div>

      {/* $ReGen */}
      <div className="bg-gradient-to-br from-[#7dd87d]/10 to-[#4a7c59]/5 rounded-2xl border border-[#7dd87d]/30 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-full bg-[#7dd87d] flex items-center justify-center">
            <Coins className="w-6 h-6 text-[#1a472a]" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white" style={{ fontFamily: "var(--font-display)" }}>
              $ReGen
            </h3>
            <p className="text-[#7dd87d] text-sm">The Game's Token</p>
          </div>
        </div>
        <div className="space-y-3 mb-5">
          {[
            { icon: Sprout, text: "Earned through quests, gratitude from other players and seasonal harvests" },
            { icon: Leaf, text: "Records contributions to the Game and the wider movement" },
            { icon: Users, text: "Role awards for the people who run the Game are paid in $ReGen" },
            { icon: ScrollText, text: "Past work counts too: SEEDS-era contributions can be recognized by proposal" },
            { icon: Vote, text: "What else it does inside the Game is ours to decide together through governance" },
          ].map(({ icon: Icon, text }, i) => (
            <div key={i} className="flex items-start gap-3">
              <Icon className="w-4 h-4 text-[#7dd87d] mt-0.5 flex-shrink-0" />
              <p className="text-white/75 text-sm">{text}</p>
            </div>
          ))}
        </div>
        <div className="bg-[#7dd87d]/10 rounded-xl p-4 border border-[#7dd87d]/20">
          <p className="text-[#7dd87d] text-xs font-semibold mb-1">What a token is here</p>
          <p className="text-white/70 text-sm">{COOP.tokensNote}</p>
        </div>
      </div>
    </div>
  );
}

// ─── The two tokens from the earlier fund design ──────────────────────────────
function FundDesignTokens() {
  const tokens = [
    { name: "RCVoice", icon: Vote, text: COOP.coopTokens.rcvoice },
    { name: "$RCivics", icon: Coins, text: COOP.coopTokens.rcivics },
  ];
  return (
    <div className="grid md:grid-cols-2 gap-4">
      {tokens.map(({ name, icon: Icon, text }) => (
        <div key={name} className="bg-[#d4a574]/5 rounded-2xl border border-[#d4a574]/25 p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-[#d4a574]/20 border border-[#d4a574]/40 flex items-center justify-center flex-shrink-0">
              <Icon className="w-5 h-5 text-[#d4a574]" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white" style={{ fontFamily: "var(--font-display)" }}>
                {name}
              </h3>
              <p className="text-[#d4a574] text-xs">Earlier fund design</p>
            </div>
          </div>
          <p className="text-white/75 text-sm leading-relaxed">{text}</p>
        </div>
      ))}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function Tokenomics() {
  const { ref: statsRef, inView: statsInView } = useInView(0.3);
  // Program design facts, never traction counts.
  const projectCount = useCountUp(13, 2000, statsInView);
  const capitalCount = useCountUp(9, 1500, statsInView);
  const seasonCount = useCountUp(4, 1000, statsInView);

  return (
    <PageWrapper>
    <div className="min-h-screen bg-gradient-to-b from-[#1a472a] to-[#0d2818]">
      <SEO
        title="Tokenomics | ReGen Civics"
        description="How tokens work in ReGen Civics. $ReGen and RGVoice record contributions and carry voice in the Game. They make no claim about financial value."
        image="/og/tokenomics.jpg"
        url="/tokenomics"
      />
      <BackButton />

      {/* ── Token Note ── */}
      <div className="container px-4 pt-8">
        <div className="max-w-4xl mx-auto border-l-4 border-[#7dd87d]/60 bg-[#7dd87d]/10 rounded-r-xl px-5 py-4">
          <p className="text-white/90 text-sm leading-relaxed">
            <strong className="text-[#7dd87d]">A note on tokens:</strong> {COOP.tokensNote} <Link href="/bionomics" className="underline text-[#7dd87d] hover:text-white">Read the Bionomics page</Link> for how $ReGen, gratitude, and the living economy fit together.
          </p>
        </div>
      </div>

      {/* ── Hero ── */}
      <section className="relative min-h-[70vh] flex items-center overflow-hidden pt-16">
        <LandscapeSVG seed="tokenomics" className="absolute inset-0 text-[#7dd87d] pointer-events-none z-0" />
        <FlowingParticles />
        <div className="container relative z-10 py-16 px-4">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-5 py-2 mb-6 rounded-full bg-[#7dd87d] text-[#1a472a] text-sm font-semibold">
              <Coins className="w-5 h-5" />
              <span>Token Economics for the ReGenerative Renaissance</span>
            </div>
            <h1
              className="ink-reveal text-4xl sm:text-5xl md:text-7xl font-bold text-white mb-6 leading-none drop-shadow-[0_4px_12px_rgba(0,0,0,0.7)]"
              style={{ fontFamily: "var(--font-display)" }}
            >
              <span className="text-[#7dd87d]">Token</span>omics
            </h1>
            <ReadingTime words={1200} />
            <div className="bg-[#1a472a]/60 backdrop-blur-sm rounded-2xl border border-[#7dd87d]/20 p-6 md:p-8 mb-8 text-left">
              <p className="text-white/90 text-lg leading-relaxed mb-4 safe-prose">
                <strong className="text-[#7dd87d]">Tokenomics = Token Economics.</strong> Tokens are the things we create through our governance process to account for things. And economics? The word comes from the Ancient Greek{" "}
                <em className="text-[#d4a574]">oikonomia</em> (οἰκονομία), a compound of <em className="text-[#d4a574]">oikos</em> (οἶκος), meaning "household," and <em className="text-[#d4a574]">nomos</em> (νόμος), meaning "law" or "custom."
              </p>
              <p className="text-white/75 text-base leading-relaxed safe-prose">
                It originally meant "household management." In our case, our token economic system sees Earth as our home, and we're designing an economic system for how we can go about caring for our home together.
              </p>
            </div>
            <div className="flex flex-wrap gap-4 justify-center">
              <Link href="/loi">
                <Button
                  size="lg"
                  className="rounded-xl bg-[#7dd87d] hover:bg-[#9de89d] text-[#1a472a] font-bold px-8"
                  style={{ fontFamily: "var(--font-accent)" }}
                >
                  <Sprout className="mr-2 w-5 h-5" /> Tell us you're interested
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

      {/* ── Program facts (design, not traction) ── */}
      <section data-reveal className="py-12 px-4 bg-[#0d2818]/50">
        <div ref={statsRef} className="container">
          <div className="grid grid-cols-3 gap-4 max-w-2xl mx-auto">
            {[
              { value: `${projectCount}`, label: "Land projects per season cohort", color: "#7dd87d" },
              { value: `${capitalCount}`, label: "Forms of capital we recognize", color: "#d4a574" },
              { value: `${seasonCount}`, label: "Seasons in the ReGen Civics Year", color: "#4a9f9f" },
            ].map((stat, i) => (
              <div key={i} className="text-center p-4 bg-[#1a472a]/40 rounded-2xl border border-white/10">
                <p
                  className="text-2xl md:text-3xl font-bold mb-1"
                  style={{ color: stat.color, fontFamily: "var(--font-display)" }}
                >
                  {stat.value}
                </p>
                <p className="text-white/70 text-xs">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── The Game's two tokens ── */}
      <section className="py-16 px-4">
        <div className="container">
          <div className="max-w-4xl mx-auto">
            <h2
              className="text-3xl font-bold text-[#7dd87d] mb-3 text-center"
              style={{ fontFamily: "var(--font-display)" }}
            >
              The Game's Two Tokens
            </h2>
            <p className="text-white/70 text-center mb-10 max-w-2xl mx-auto">
              RGVoice carries your voice. $ReGen records what you bring. You earn both by playing.
            </p>
            <GameTokens />
          </div>
        </div>
      </section>

      <Pullquote>A token here is a record of something a person brought to the movement.</Pullquote>

      {/* ── How a contribution becomes a token ── */}
      <section className="py-16 px-4 bg-[#0d2818]/40">
        <div className="container">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-3xl font-bold text-[#7dd87d] mb-4 text-center" style={{ fontFamily: "var(--font-display)" }}>
              How a Contribution Becomes a Token
            </h2>
            <p className="text-white/80 text-lg leading-relaxed mb-8 text-center max-w-3xl mx-auto">
              Every token starts with something a person does. Press Play to follow the path from a quest to a vote, or step through each stage.
            </p>
            <AnimatedTokenFlow />
          </div>
        </div>
      </section>

      <StarsDivider className="my-8 max-w-4xl mx-auto px-4" />

      {/* ── From the earlier fund design ── */}
      <section className="py-16 px-4">
        <div className="container">
          <div className="max-w-4xl mx-auto">
            <h2
              className="text-3xl font-bold text-white mb-3"
              style={{ fontFamily: "var(--font-display)" }}
            >
              From the Earlier Fund Design
            </h2>
            <p className="text-white/70 mb-8 leading-relaxed safe-prose prose-readable">
              Two more tokens come from the earlier fund design. Neither one is part of the Game.
            </p>
            <FundDesignTokens />
          </div>
        </div>
      </section>

      {/* ── Where the cooperative stands ── */}
      <section className="py-16 px-4 bg-[#0d2818]/40">
        <div className="container">
          <div className="max-w-3xl mx-auto bg-[#1a472a]/50 rounded-2xl border border-[#d4a574]/30 p-6 md:p-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-11 h-11 rounded-full bg-[#d4a574]/20 border border-[#d4a574]/40 flex items-center justify-center flex-shrink-0">
                <Landmark className="w-5 h-5 text-[#d4a574]" />
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-[#d4a574]/15 text-[#d4a574] border border-[#d4a574]/40">
                {COOP.statusLabel}
              </span>
            </div>
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-1" style={{ fontFamily: "var(--font-display)" }}>
              {COOP.name}
            </h2>
            <p className="text-[#d4a574] italic mb-4">{COOP.tagline}</p>
            <p className="text-white/85 leading-relaxed mb-5 safe-prose">{COOP.statement}</p>
            <Link
              href="/fund"
              className="inline-flex items-center gap-1.5 min-h-[44px] text-[#7dd87d] font-semibold hover:gap-2.5 transition-all"
            >
              About the cooperative <ArrowRight className="w-4 h-4" />
            </Link>
            <p className="text-white/60 text-xs leading-relaxed mt-4 border-t border-white/10 pt-4">{COOP.notAnOffer}</p>
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
              A Multi-Generational Path
            </h2>
            <p className="text-white/80 text-lg leading-relaxed mb-6 safe-prose prose-readable">
              We measure our success by our shared progress toward co-creating regenerative cultures and civilizations.
            </p>
            <p className="text-white/65 leading-relaxed mb-8 safe-prose prose-readable">
              Much like planting mighty nut-bearing trees is a gift our descendants most benefit from, our efforts to create the foundations for new civilizations will be most enjoyed by those who come after us. The token system we are building keeps a record of who brought what, so the people doing the work hold the voice in where it goes.
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
              <Link href="/loi">
                <Button
                  size="lg"
                  className="rounded-xl bg-[#7dd87d] hover:bg-[#9de89d] text-[#1a472a] font-bold px-8"
                  style={{ fontFamily: "var(--font-accent)" }}
                >
                  <Sprout className="mr-2 w-5 h-5" /> Tell us you're interested
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
            <p className="text-white/60 text-sm mt-5 max-w-xl mx-auto safe-prose">{COOP.interestPromise}</p>
          </div>
        </div>
      </section>
    </div>
    </PageWrapper>
  );
}
