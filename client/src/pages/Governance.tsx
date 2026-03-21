import { Shield, Users, Vote, TrendingUp, Zap, Globe, CheckCircle2, Zap as ZapIcon } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { BackButton } from "@/components/BackButton";
import { useEffect, useRef, useState } from "react";
import { AnimatedSection } from "@/components/AnimatedSection";
import { PageWrapper } from "@/components/PageWrapper";

// Fund vs Game RCVoice Toggle Component
function RCVoiceToggle({ onModeChange }: { onModeChange?: (mode: 'fund' | 'game') => void }) {
  const [activeMode, setActiveMode] = useState<'fund' | 'game'>('fund');

  const handleModeChange = (mode: 'fund' | 'game') => {
    setActiveMode(mode);
    onModeChange?.(mode);
  };

  return (
    <div className="space-y-6">
      {/* Toggle */}
      <div className="flex gap-3 justify-center">
        <button
          onClick={() => handleModeChange('fund')}
          className={`px-7 py-3 rounded-xl font-bold text-base transition-all ${
            activeMode === 'fund'
              ? 'bg-[#d4a574] text-[#1a472a] shadow-lg shadow-[#d4a574]/30'
              : 'bg-[#1a472a]/60 border-2 border-[#d4a574]/40 text-[#d4a574] hover:border-[#d4a574]/60'
          }`}
        >
          Fund Governance
        </button>
        <button
          onClick={() => handleModeChange('game')}
          className={`px-7 py-3 rounded-xl font-bold text-base transition-all ${
            activeMode === 'game'
              ? 'bg-purple-700 text-white shadow-lg shadow-purple-700/30'
              : 'bg-[#1a472a]/60 border-2 border-purple-500/40 text-purple-400 hover:border-purple-500/60'
          }`}
        >
          Game Governance
        </button>
      </div>

      {/* Fund Mode */}
      {activeMode === 'fund' && (
        <div className="bg-gradient-to-br from-[#d4a574]/15 to-[#1a472a]/60 rounded-2xl p-8 border border-[#d4a574]/40 space-y-6">
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <img
              src="https://assets.regencivics.earth/cSiqeQzVeKFgrJHp.webp"
              alt="RCVoice Fund Token"
              width="96"
              height="96"
              className="w-24 h-24 object-contain flex-shrink-0"
              loading="lazy"
            />
            <div>
              <h3 className="text-2xl font-bold text-[#d4a574] mb-2">RCVoice: Fund Governance</h3>
              <p className="text-white/80 leading-relaxed">
                In the ReGen Civics Fund, RCVoice is distributed across four stakeholder groups based on their role and contribution. Voice is non-tradable and tied to active participation in fund operations.
              </p>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="bg-[#0d2818]/60 rounded-xl p-5 border border-[#d4a574]/30">
              <p className="text-[#d4a574] font-bold text-lg mb-3">How It's Distributed</p>
              <div className="space-y-2">
                {[
                  { label: 'Council of Domain Experts', pct: '40%', color: 'bg-[#d4a574]' },
                  { label: 'Land Projects', pct: '20%', color: 'bg-[#7dd87d]' },
                  { label: 'Alliance Organizations', pct: '20%', color: 'bg-[#4a9f9f]' },
                  { label: 'Investors', pct: '20%', color: 'bg-amber-400' },
                ].map(({ label, pct, color }) => (
                  <div key={label} className="flex items-center gap-3">
                    <div className="flex-1">
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-white/70">{label}</span>
                        <span className="text-white font-bold">{pct}</span>
                      </div>
                      <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                        <div className={`h-full ${color} rounded-full`} style={{ width: pct }} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-[#0d2818]/60 rounded-xl p-5 border border-[#d4a574]/30">
              <p className="text-[#d4a574] font-bold text-lg mb-3">Key Traits</p>
              <ul className="space-y-2 text-sm text-white/80">
                <li className="flex items-start gap-2"><span className="text-[#d4a574] mt-0.5">✦</span> Structured allocation across 4 stakeholder groups</li>
                <li className="flex items-start gap-2"><span className="text-[#d4a574] mt-0.5">✦</span> Council holds 40% voice to ensure expert-led decisions</li>
                <li className="flex items-start gap-2"><span className="text-[#d4a574] mt-0.5">✦</span> Non-tradable: tied to your role in the fund</li>
                <li className="flex items-start gap-2"><span className="text-[#d4a574] mt-0.5">✦</span> Governs investment decisions, funding proposals, and strategic direction</li>
                <li className="flex items-start gap-2"><span className="text-[#d4a574] mt-0.5">✦</span> Separate from $RCivics reward distributions</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Game Mode */}
      {activeMode === 'game' && (
        <div className="bg-gradient-to-br from-purple-900/30 to-[#1a472a]/60 rounded-2xl p-8 border border-purple-500/40 space-y-6">
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <img
              src="https://assets.regencivics.earth/dWhwxPMVWDYiuDpF.webp"
              alt="RGVoice Game Token"
              width="96"
              height="96"
              className="w-24 h-24 object-contain flex-shrink-0"
              loading="lazy"
            />
            <div>
              <h3 className="text-2xl font-bold text-purple-400 mb-2">RGVoice: Game Governance</h3>
              <p className="text-white/80 leading-relaxed">
                In the ReGen Game, RGVoice works differently. It is earned through completing quests and contributing to the game ecosystem. Voice decays 3% monthly, ensuring governance always stays with those who are currently active and engaged.
              </p>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="bg-[#0d2818]/60 rounded-xl p-5 border border-purple-500/30">
              <p className="text-purple-400 font-bold text-lg mb-3">How It's Earned</p>
              <ul className="space-y-2 text-sm text-white/80">
                <li className="flex items-start gap-2"><span className="text-purple-400 mt-0.5">✦</span> Complete quests to earn RGVoice tokens</li>
                <li className="flex items-start gap-2"><span className="text-purple-400 mt-0.5">✦</span> Contribute to game proposals and community decisions</li>
                <li className="flex items-start gap-2"><span className="text-purple-400 mt-0.5">✦</span> Mentor other players and build community</li>
                <li className="flex items-start gap-2"><span className="text-purple-400 mt-0.5">✦</span> Organize seasonal events and quests</li>
              </ul>
            </div>
            <div className="bg-[#0d2818]/60 rounded-xl p-5 border border-purple-500/30">
              <p className="text-purple-400 font-bold text-lg mb-3">Key Traits</p>
              <ul className="space-y-2 text-sm text-white/80">
                <li className="flex items-start gap-2"><span className="text-purple-400 mt-0.5">✦</span> Merit-based: earned through activity, not purchased</li>
                <li className="flex items-start gap-2"><span className="text-purple-400 mt-0.5">✦</span> <strong className="text-purple-300">3% monthly decay</strong> keeps governance with active players</li>
                <li className="flex items-start gap-2"><span className="text-purple-400 mt-0.5">✦</span> Non-tradable: your voice, not a commodity</li>
                <li className="flex items-start gap-2"><span className="text-purple-400 mt-0.5">✦</span> Governs game rules, quest design, and seasonal decisions</li>
                <li className="flex items-start gap-2"><span className="text-purple-400 mt-0.5">✦</span> Paired with $Regen utility token for in-game economy</li>
              </ul>
            </div>
          </div>

          <div className="bg-purple-900/30 rounded-xl p-4 border border-purple-500/20 text-center">
            <p className="text-purple-300 text-sm">
              <strong>The 3% decay rule</strong> is a core design feature of the Infinite Game. It ensures that those who shaped the past don't permanently control the future. Stay active, stay relevant.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// Two Tokens Section with linked toggle state
function TwoTokensSection() {
  const [rewardsMode, setRewardsMode] = useState<'fund' | 'game'>('fund');

  return (
    <>
      {/* RCVoice Fund vs Game Toggle */}
      <div className="mb-8">
        <h3 className="text-xl font-bold text-white/90 mb-2 text-center">Voice operates differently in each space</h3>
        <p className="text-white/60 text-center text-sm mb-6">Click to explore how governance voice works in the Fund vs the Game</p>
        <RCVoiceToggle onModeChange={setRewardsMode} />
      </div>

      {/* Dynamic rewards token box */}
      {rewardsMode === 'fund' ? (
        <div className="bg-[#1a472a]/60 rounded-xl p-6 border-l-4 border-[#d4a574] transition-all">
          <div className="flex items-center gap-4 mb-3">
            <img
              src="https://assets.regencivics.earth/MhyYoMLbeOhEHQLm.webp"
              alt="$RCivics Token"
              width="48"
              height="48"
              className="w-12 h-12 object-contain flex-shrink-0"
              loading="lazy"
            />
            <h3 className="text-xl font-bold text-[#d4a574]">$RCivics - Rewards Token</h3>
          </div>
          <p className="text-white/80 leading-relaxed">
            Your claim on fund returns and rewards. When the portfolio generates returns from Land Projects, Alliance Organizations, or other fund activities, distributions flow proportionally to $RCivics holders. $RCivics distributes rewards: it is your stake in the abundance the network creates together.
          </p>
        </div>
      ) : (
        <div className="bg-[#0d2818]/70 rounded-xl p-6 border-l-4 border-[#7dd87d] transition-all">
          <div className="flex items-center gap-4 mb-4">
            <img
              src="https://assets.regencivics.earth/ZWOtkRNjdCWfFFed.webp"
              alt="$ReGen Token"
              width="48"
              height="48"
              className="w-12 h-12 object-contain flex-shrink-0"
              loading="lazy"
            />
            <h3 className="text-xl font-bold text-[#7dd87d]">$ReGen - Rewards Token</h3>
          </div>
          <p className="text-white/80 leading-relaxed mb-5">
            Your claim on Game returns and rewards. Part of our Infinite Game is creating value for our token. How we do this is up for all of us to co-create.
          </p>
          <div className="space-y-3">
            {[
              { letter: 'a', text: 'Donors sponsoring the Game and the positive outcomes we\'re creating.' },
              { letter: 'b', text: 'Using $ReGen for a medium of exchange in our communities and apps like LocalScale, creating real world value and utility for buying food, housing, services, and more.' },
              { letter: 'c', text: 'Accepting a % of all fees in $ReGen at our land projects, businesses, and communities.' },
              { letter: 'd', text: 'Giving discounts for different tiers of $ReGen holdings.' },
              { letter: 'e', text: 'Anything else we can co-create and imagine together.' },
            ].map(({ letter, text }) => (
              <div key={letter} className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-[#7dd87d]/20 border border-[#7dd87d]/50 text-[#7dd87d] text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{letter}</span>
                <p className="text-white/75 text-sm leading-relaxed">{text}</p>
              </div>
            ))}
          </div>
          <div className="mt-5 bg-[#7dd87d]/10 rounded-lg p-4 border border-[#7dd87d]/20">
            <p className="text-[#7dd87d] text-sm font-semibold text-center">This is an open invitation. The value of $ReGen grows with every player, every quest, and every community that joins the game.</p>
          </div>
        </div>
      )}
    </>
  );
}

// Interactive Returns Flow Toggle Component
function HowReturnsFlowToggle() {
  const [activeTab, setActiveTab] = useState<'profits' | 'fees'>('profits');

  return (
    <div className="space-y-8">
      {/* Toggle Buttons */}
      <div className="flex gap-4 justify-center flex-wrap">
        <button
          onClick={() => setActiveTab('profits')}
          className={`px-8 py-4 rounded-xl font-bold text-lg transition-all ${
            activeTab === 'profits'
              ? 'bg-[#7dd87d] text-[#1a472a] shadow-lg shadow-[#7dd87d]/30'
              : 'bg-[#1a472a]/60 border-2 border-[#7dd87d]/40 text-[#7dd87d] hover:border-[#7dd87d]/60'
          }`}
        >
          Profits & Distributions
        </button>
        <button
          onClick={() => setActiveTab('fees')}
          className={`px-8 py-4 rounded-xl font-bold text-lg transition-all ${
            activeTab === 'fees'
              ? 'bg-[#d4a574] text-[#1a472a] shadow-lg shadow-[#d4a574]/30'
              : 'bg-[#1a472a]/60 border-2 border-[#d4a574]/40 text-[#d4a574] hover:border-[#d4a574]/60'
          }`}
        >
          Fund Fees
        </button>
      </div>

      {/* Content Panels */}
      {activeTab === 'profits' && (
        <div className="bg-gradient-to-br from-[#7dd87d]/20 to-[#4a9f9f]/20 rounded-2xl p-8 border border-[#7dd87d]/40 space-y-6">
          <h3 className="text-2xl font-bold text-[#7dd87d] text-center">Success Fees to $RCivics Holders</h3>
          <p className="text-white/80 text-center text-lg leading-relaxed">
            When Land Projects and Alliance Organizations generate returns, success fees are distributed proportionally to all $RCivics token holders. Own 10% of $RCivics, receive 10% of all profit distributions.
          </p>
          <div className="grid sm:grid-cols-2 gap-4 mt-6">
            <div className="bg-[#1a472a]/60 rounded-xl p-4 border border-[#7dd87d]/30">
              <p className="text-[#7dd87d] font-bold mb-2">Land Projects</p>
              <p className="text-white/70 text-sm">Generate returns through regenerative land use, agriculture, and community development</p>
            </div>
            <div className="bg-[#1a472a]/60 rounded-xl p-4 border border-[#4a9f9f]/30">
              <p className="text-[#4a9f9f] font-bold mb-2">Alliance Orgs</p>
              <p className="text-white/70 text-sm">Generate revenue by providing specialized services to Land Projects, keeping resources in the network</p>
            </div>
          </div>
          <p className="text-[#7dd87d] text-center font-semibold text-lg pt-4">All contributors who conduct equity swaps receive $RCivics and share in profits</p>
        </div>
      )}

      {activeTab === 'fees' && (
        <div className="bg-gradient-to-br from-[#d4a574]/20 to-[#c17f3a]/20 rounded-2xl p-8 border border-[#d4a574]/40 space-y-6">
          <h3 className="text-2xl font-bold text-[#d4a574] text-center">Management Fees Split</h3>
          <div className="grid sm:grid-cols-2 gap-6 mt-6">
            <div className="bg-[#1a472a]/60 rounded-xl p-6 border-2 border-[#d4a574]/40">
              <p className="text-[#d4a574] font-bold text-lg mb-3">Council (50%)</p>
              <p className="text-white/80 mb-4">The Council of Domain Experts receives 50% of management fees for overseeing fund operations and governance.</p>
              <p className="text-white/60 text-sm">Part of Council fees fund worker proposals to ReGen Civics for ongoing operations and development.</p>
            </div>
            <div className="bg-[#1a472a]/60 rounded-xl p-6 border-2 border-[#d4a574]/40">
              <p className="text-[#d4a574] font-bold text-lg mb-3">RCVoice Holders (50%)</p>
              <p className="text-white/80 mb-4">50% of management fees are distributed proportionally to all RCVoice holders across all four groups.</p>
              <p className="text-white/60 text-sm">This rewards those actively governing the fund with a share of management revenue.</p>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6">
            <div className="bg-[#1a472a]/40 rounded-lg p-4 text-center border border-[#d4a574]/20">
              <p className="text-[#d4a574] font-bold mb-1">🌳 Council</p>
              <p className="text-white/60 text-xs">40% Voice</p>
            </div>
            <div className="bg-[#1a472a]/40 rounded-lg p-4 text-center border border-[#4a7c59]/20">
              <p className="text-[#7dd87d] font-bold mb-1">🌱 Land Projects</p>
              <p className="text-white/60 text-xs">20% Voice</p>
            </div>
            <div className="bg-[#1a472a]/40 rounded-lg p-4 text-center border border-[#4a9f9f]/20">
              <p className="text-[#4a9f9f] font-bold mb-1">🍄 Alliance Orgs</p>
              <p className="text-white/60 text-xs">20% Voice</p>
            </div>
            <div className="bg-[#1a472a]/40 rounded-lg p-4 text-center border border-[#c17f3a]/20">
              <p className="text-[#c17f3a] font-bold mb-1">🌾 Investors</p>
              <p className="text-white/60 text-xs">20% Voice</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Animated Rewards Distribution Component
function RewardsFlowAnimation() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);
  const [isVisible, setIsVisible] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setIsVisible(true);
      },
      { threshold: 0.3 }
    );
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isVisible) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const ctx = canvas.getContext("2d")!;

    const W = canvas.width;
    const H = canvas.height;
    const cx = W / 2;
    const cy = H / 2;

    // Groups around the center
    const groups = [
      { label: "Council", sublabel: "40% Voice", color: "#d4a574", angle: -90, icon: "🌳" },
      { label: "Land Projects", sublabel: "20% Voice", color: "#4a7c59", angle: 0, icon: "🌱" },
      { label: "Alliance Orgs", sublabel: "20% Voice", color: "#4a9f9f", angle: 90, icon: "🍄" },
      { label: "Investors", sublabel: "20% Voice", color: "#c17f3a", angle: 180, icon: "🌾" },
    ];

    const radius = Math.min(W, H) * 0.32;

    // Particles
    interface Particle {
      x: number;
      y: number;
      tx: number;
      ty: number;
      progress: number;
      speed: number;
      color: string;
      size: number;
      alpha: number;
      groupIdx: number;
      trail: { x: number; y: number }[];
    }

    const particles: Particle[] = [];
    let tick = 0;

    function spawnParticle() {
      // Spawn from center, heading to a random group
      const gIdx = Math.floor(Math.random() * groups.length);
      const g = groups[gIdx];
      const rad = (g.angle * Math.PI) / 180;
      const tx = cx + Math.cos(rad) * radius;
      const ty = cy + Math.sin(rad) * radius;

      // Slight random spread at destination
      const spread = 18;
      particles.push({
        x: cx + (Math.random() - 0.5) * 10,
        y: cy + (Math.random() - 0.5) * 10,
        tx: tx + (Math.random() - 0.5) * spread,
        ty: ty + (Math.random() - 0.5) * spread,
        progress: 0,
        speed: 0.008 + Math.random() * 0.006,
        color: g.color,
        size: 3 + Math.random() * 3,
        alpha: 1,
        groupIdx: gIdx,
        trail: [],
      });
    }

    function easeInOut(t: number) {
      return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
    }

    function drawNode(
      x: number,
      y: number,
      label: string,
      sublabel: string,
      color: string,
      icon: string,
      pulse: number
    ) {
      const nodeR = 44;
      // Pulse glow
      ctx.save();
      ctx.globalAlpha = 0.18 + 0.12 * Math.sin(pulse);
      ctx.beginPath();
      ctx.arc(x, y, nodeR + 10 + 6 * Math.sin(pulse), 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.restore();

      // Circle
      ctx.save();
      ctx.beginPath();
      ctx.arc(x, y, nodeR, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.shadowColor = color;
      ctx.shadowBlur = 12;
      ctx.fill();
      ctx.restore();

      // Icon
      ctx.save();
      ctx.font = `${nodeR * 0.7}px serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(icon, x, y - 6);
      ctx.restore();

      // Label
      ctx.save();
      ctx.font = "bold 11px 'Nunito', sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      ctx.fillStyle = "#fff";
      ctx.fillText(label, x, y + nodeR + 6);
      ctx.font = "10px 'Nunito', sans-serif";
      ctx.fillStyle = color;
      ctx.fillText(sublabel, x, y + nodeR + 20);
      ctx.restore();
    }

    function drawCenter(pulse: number) {
      const r = 52;
      // Outer glow rings
      for (let i = 3; i > 0; i--) {
        ctx.save();
        ctx.globalAlpha = 0.06 * i + 0.04 * Math.sin(pulse + i);
        ctx.beginPath();
        ctx.arc(cx, cy, r + i * 14 + 4 * Math.sin(pulse), 0, Math.PI * 2);
        ctx.fillStyle = "#7dd87d";
        ctx.fill();
        ctx.restore();
      }

      // Main circle
      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
      grad.addColorStop(0, "#2a6b3a");
      grad.addColorStop(1, "#1a472a");
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.shadowColor = "#7dd87d";
      ctx.shadowBlur = 20;
      ctx.fill();
      ctx.restore();

      // Center text
      ctx.save();
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "#7dd87d";
      ctx.font = "bold 12px 'Quicksand', sans-serif";
      ctx.fillText("ReGen", cx, cy - 14);
      ctx.fillText("Portfolio", cx, cy);
      ctx.font = "10px 'Nunito', sans-serif";
      ctx.fillStyle = "#d4a574";
      ctx.fillText("$RCivics", cx, cy + 16);
      ctx.restore();
    }

    function drawConnectors() {
      groups.forEach((g) => {
        const rad = (g.angle * Math.PI) / 180;
        const nx = cx + Math.cos(rad) * radius;
        const ny = cy + Math.sin(rad) * radius;

        ctx.save();
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(nx, ny);
        ctx.strokeStyle = g.color + "33";
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 6]);
        ctx.stroke();
        ctx.restore();
      });
    }

    function draw() {
      ctx.clearRect(0, 0, W, H);

      // Background
      const bgGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, W * 0.6);
      bgGrad.addColorStop(0, "#0d2818");
      bgGrad.addColorStop(1, "#060f0a");
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, W, H);

      tick += 0.025;

      drawConnectors();

      // Spawn particles
      if (Math.random() < 0.22) spawnParticle();

      // Update & draw particles
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.progress = Math.min(1, p.progress + p.speed);
        const t = easeInOut(p.progress);
        p.x = cx + (p.tx - cx) * t + (Math.random() - 0.5) * 0.5;
        p.y = cy + (p.ty - cy) * t + (Math.random() - 0.5) * 0.5;

        p.trail.push({ x: p.x, y: p.y });
        if (p.trail.length > 8) p.trail.shift();

        // Draw trail
        for (let j = 0; j < p.trail.length - 1; j++) {
          const alpha = (j / p.trail.length) * 0.5;
          ctx.save();
          ctx.globalAlpha = alpha;
          ctx.beginPath();
          ctx.moveTo(p.trail[j].x, p.trail[j].y);
          ctx.lineTo(p.trail[j + 1].x, p.trail[j + 1].y);
          ctx.strokeStyle = p.color;
          ctx.lineWidth = p.size * 0.5;
          ctx.stroke();
          ctx.restore();
        }

        // Draw particle
        if (p.progress < 1) {
          ctx.save();
          ctx.globalAlpha = p.alpha * (1 - p.progress * 0.3);
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fillStyle = p.color;
          ctx.shadowColor = p.color;
          ctx.shadowBlur = 8;
          ctx.fill();
          ctx.restore();
        }

        if (p.progress >= 1) {
          // Burst at destination
          for (let b = 0; b < 3; b++) {
            ctx.save();
            ctx.globalAlpha = 0.6;
            ctx.beginPath();
            const bx = p.tx + (Math.random() - 0.5) * 20;
            const by = p.ty + (Math.random() - 0.5) * 20;
            ctx.arc(bx, by, 2, 0, Math.PI * 2);
            ctx.fillStyle = p.color;
            ctx.fill();
            ctx.restore();
          }
          particles.splice(i, 1);
        }
      }

      // Draw group nodes
      groups.forEach((g, idx) => {
        const rad = (g.angle * Math.PI) / 180;
        const nx = cx + Math.cos(rad) * radius;
        const ny = cy + Math.sin(rad) * radius;
        drawNode(nx, ny, g.label, g.sublabel, g.color, g.icon, tick + idx * 1.2);
      });

      drawCenter(tick);

      animFrameRef.current = requestAnimationFrame(draw);
    }

    draw();
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [isVisible]);

  return (
    <div ref={containerRef} className="relative">
      <canvas
        ref={canvasRef}
        width={560}
        height={420}
        className="w-full max-w-xl mx-auto block rounded-2xl"
        style={{ maxHeight: "420px" }}
      />
      {/* Legend below canvas */}
      <div className="mt-4 flex flex-wrap justify-center gap-3 text-xs text-white/70">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-[#7dd87d] inline-block" />
          <span>Portfolio generates returns</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-[#d4a574] inline-block" />
          <span>$RCivics distributes rewards</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-[#4a9f9f] inline-block" />
          <span>Alliance Orgs serve Land Projects</span>
        </div>
      </div>
    </div>
  );
}

// Earth Day Countdown + Governance Dashboard Placeholder
function EarthDayCountdown() {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    const earthDay = new Date("2026-04-22T00:00:00");
    const tick = () => {
      const now = new Date();
      const diff = earthDay.getTime() - now.getTime();
      if (diff <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        return;
      }
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      setTimeLeft({ days, hours, minutes, seconds });
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-[#0d2818]/70 rounded-2xl border border-[#7dd87d]/30 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#1a472a] to-[#0d2818] p-6 border-b border-[#7dd87d]/20 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#7dd87d]/20 border border-[#7dd87d]/40 mb-3">
          <span className="w-2 h-2 rounded-full bg-[#7dd87d] animate-pulse" />
          <span className="text-[#7dd87d] text-sm font-semibold">Going Live on Earth Day 2026</span>
        </div>
        <h3 className="text-2xl font-bold text-white mb-2">Live Governance Dashboard</h3>
        <p className="text-white/60 text-sm">Real-time voice distribution and active proposals from Hypha DAO</p>
      </div>

      {/* Countdown */}
      <div className="p-8">
        <p className="text-center text-white/60 text-sm mb-6">Dashboard launches in:</p>
        <div className="grid grid-cols-4 gap-4 mb-10">
          {[{ label: "Days", value: timeLeft.days }, { label: "Hours", value: timeLeft.hours }, { label: "Minutes", value: timeLeft.minutes }, { label: "Seconds", value: timeLeft.seconds }].map(({ label, value }) => (
            <div key={label} className="bg-[#1a472a]/60 rounded-xl p-4 text-center border border-[#7dd87d]/20">
              <p className="text-3xl md:text-4xl font-bold text-[#7dd87d] tabular-nums">{String(value).padStart(2, "0")}</p>
              <p className="text-white/50 text-xs mt-1">{label}</p>
            </div>
          ))}
        </div>

        {/* Preview wireframe */}
        <div className="opacity-40 pointer-events-none select-none">
          <div className="grid md:grid-cols-2 gap-4 mb-4">
            <div className="bg-[#1a472a]/50 rounded-xl p-5 border border-[#7dd87d]/20">
              <p className="text-[#7dd87d] font-semibold text-sm mb-3">Voice Distribution</p>
              <div className="space-y-2">
                {[{ label: "Council of Experts", pct: 40, color: "#d4a574" }, { label: "Land Projects", pct: 20, color: "#4a7c59" }, { label: "Alliance Orgs", pct: 20, color: "#4a9f9f" }, { label: "Investors", pct: 20, color: "#c17f3a" }].map(g => (
                  <div key={g.label}>
                    <div className="flex justify-between text-xs text-white/60 mb-1">
                      <span>{g.label}</span>
                      <span>{g.pct}%</span>
                    </div>
                    <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${g.pct}%`, backgroundColor: g.color }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-[#1a472a]/50 rounded-xl p-5 border border-[#7dd87d]/20">
              <p className="text-[#7dd87d] font-semibold text-sm mb-3">Active Proposals</p>
              <div className="space-y-2">
                {["Q2 Portfolio Allocation", "New Alliance Partner: EcoLegal", "Seasonal Festival Agenda"].map(p => (
                  <div key={p} className="flex items-center gap-2 bg-white/5 rounded-lg px-3 py-2">
                    <span className="w-2 h-2 rounded-full bg-[#7dd87d] flex-shrink-0" />
                    <span className="text-white/60 text-xs">{p}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="text-center mt-6">
          <a href="https://app.hypha.earth/en/dho/regen-civics/agreements" target="_blank" rel="noopener noreferrer">
            <Button className="bg-[#7dd87d] text-[#1a472a] hover:bg-[#6bc76b] font-bold">
              Preview on Hypha Now →
            </Button>
          </a>
          <p className="text-white/40 text-xs mt-3">Full dashboard integration launches April 22, 2026 (Earth Day)</p>
        </div>
      </div>
    </div>
  );
}

export default function Governance() {
  return (
    <PageWrapper>
    <div className="min-h-screen bg-gradient-to-b from-[#1a472a] to-[#0d2818]">
      <BackButton />
      
      {/* Hero Section */}
      <section className="relative py-20 px-4">
        <div className="container">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-5 py-2 mb-6 rounded-full bg-[#7dd87d] text-[#1a472a] text-sm font-semibold">
              <Globe className="w-5 h-5" />
              <span>Governance as Coordination Infrastructure</span>
            </div>
            
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-6" style={{ fontFamily: 'var(--font-display)' }}>
              How We Govern Regenerative Systems
            </h1>
            
            <p className="text-xl text-white/90 leading-relaxed">
              ReGen Civics operates two distinct but complementary governance systems: one for coordinating capital (the Fund) and one for coordinating community engagement (the Game). Both are designed to be transparent, participatory, and aligned with regenerative outcomes.
            </p>
          </div>
        </div>
      </section>

      {/* Fund vs Game Governance Comparison Chart - moved to top */}
      <section data-reveal className="py-16 px-4 bg-[#0d2818]/50">
        <div className="container">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-3xl font-bold text-[#7dd87d] mb-4 text-center">Fund vs Game: Governance at a Glance</h2>
            <p className="text-white/80 text-lg leading-relaxed mb-12 text-center max-w-3xl mx-auto">
              Two spaces, two governance systems, one shared mission. Here's how they compare side by side.
            </p>

            {/* Comparison Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr>
                    <th className="text-left py-4 px-4 text-white/50 font-medium w-1/3">Dimension</th>
                    <th className="py-4 px-4 w-1/3">
                      <div className="flex flex-col items-center gap-2">
                        <img
                          src="https://assets.regencivics.earth/cSiqeQzVeKFgrJHp.webp"
                          alt="RCVoice"
                          width="40"
                          height="40"
                          className="w-10 h-10 object-contain"
                          loading="lazy"
                        />
                        <span className="text-[#d4a574] font-bold text-base">ReGen Civics Fund</span>
                        <span className="text-white/50 text-xs">Capital &amp; Governance</span>
                      </div>
                    </th>
                    <th className="py-4 px-4 w-1/3">
                      <div className="flex flex-col items-center gap-2">
                        <img
                          src="https://assets.regencivics.earth/dWhwxPMVWDYiuDpF.webp"
                          alt="RGVoice"
                          width="40"
                          height="40"
                          className="w-10 h-10 object-contain"
                          loading="lazy"
                        />
                        <span className="text-purple-400 font-bold text-base">ReGen Game</span>
                        <span className="text-white/50 text-xs">Play &amp; Community</span>
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {[
                    {
                      dimension: 'Governance Token',
                      fund: 'RCVoice',
                      game: 'RGVoice',
                      fundColor: 'text-[#d4a574]',
                      gameColor: 'text-purple-400',
                    },
                    {
                      dimension: 'Utility Token',
                      fund: '$RCivics (rewards)',
                      game: '$Regen (in-game economy)',
                      fundColor: 'text-[#7dd87d]',
                      gameColor: 'text-[#7dd87d]',
                    },
                    {
                      dimension: 'How Voice is Earned',
                      fund: 'Role-based allocation (Council 40%, others 20% each)',
                      game: 'Merit-based: complete quests, contribute to community',
                      fundColor: 'text-white/80',
                      gameColor: 'text-white/80',
                    },
                    {
                      dimension: 'Voice Decay',
                      fund: 'No decay: tied to your stakeholder role',
                      game: '3% monthly decay: keeps governance with active players',
                      fundColor: 'text-white/80',
                      gameColor: 'text-purple-300',
                    },
                    {
                      dimension: 'Tradability',
                      fund: 'RCVoice: non-tradable / $RCivics: tradable',
                      game: 'RGVoice: non-tradable / $Regen: tradable',
                      fundColor: 'text-white/80',
                      gameColor: 'text-white/80',
                    },
                    {
                      dimension: 'What It Governs',
                      fund: 'Investment decisions, funding proposals, alliance strategy',
                      game: 'Quest design, game rules, seasonal decisions',
                      fundColor: 'text-white/80',
                      gameColor: 'text-white/80',
                    },
                    {
                      dimension: 'Primary Participants',
                      fund: 'Council, Land Projects, Alliance Orgs, Investors',
                      game: 'Players, Quest Creators, Community Builders',
                      fundColor: 'text-white/80',
                      gameColor: 'text-white/80',
                    },
                    {
                      dimension: 'Governance Platform',
                      fund: 'Hypha DHO (on-chain)',
                      game: 'Hypha DHO (on-chain)',
                      fundColor: 'text-white/80',
                      gameColor: 'text-white/80',
                    },
                    {
                      dimension: 'Financial Returns',
                      fund: '$RCivics holders receive proportional portfolio returns & $RCVoice holders receive a share of success and management fees',
                      game: '$Regen earned through quests, tradable in-game',
                      fundColor: 'text-[#d4a574]',
                      gameColor: 'text-purple-300',
                    },
                  ].map(({ dimension, fund, game, fundColor, gameColor }) => (
                    <tr key={dimension} className="hover:bg-white/5 transition-colors">
                      <td className="py-4 px-4 text-white/60 font-medium">{dimension}</td>
                      <td className="py-4 px-4 text-center">
                        <span className={fundColor}>{fund}</span>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <span className={gameColor}>{game}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Bottom note */}
            <div className="mt-8 grid sm:grid-cols-2 gap-4">
              <div className="bg-[#d4a574]/10 rounded-xl p-5 border border-[#d4a574]/30 text-center">
                <p className="text-[#d4a574] font-bold mb-2">Fund Governance</p>
                <p className="text-white/70 text-sm">Structured for institutional trust and long-term capital deployment. Designed to be credible to investors and regulators while remaining community-led.</p>
                <a href="https://app.hypha.earth/en/dho/regen-civics/agreements" target="_blank" rel="noopener noreferrer" className="inline-block mt-3">
                  <Button size="sm" className="bg-[#d4a574] text-[#1a472a] hover:bg-[#c49060] font-bold">
                    Explore Fund Governance &rarr;
                  </Button>
                </a>
              </div>
              <div className="bg-purple-900/20 rounded-xl p-5 border border-purple-500/30 text-center">
                <p className="text-purple-400 font-bold mb-2">Game Governance</p>
                <p className="text-white/70 text-sm">Designed for active community participation. The 3% decay rule ensures governance always belongs to those who are currently playing and contributing.</p>
                <a href="https://app.hypha.earth/en/dho/regen-games/agreements" target="_blank" rel="noopener noreferrer" className="inline-block mt-3">
                  <Button size="sm" className="bg-purple-700 text-white hover:bg-purple-800 font-bold">
                    Explore Game Governance &rarr;
                  </Button>
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Two Tokens, Two Powers */}
      <section className="py-16 px-4">
        <div className="container">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-3xl font-bold text-[#7dd87d] mb-4 text-center">Two Tokens, Two Powers</h2>
            <p className="text-white/80 text-lg leading-relaxed mb-10 text-center max-w-3xl mx-auto">
              ReGen Civics uses two distinct tokens, each serving a fundamentally different purpose. Voice governs decisions. Tokens distribute rewards. These two systems are designed to be complementary.
            </p>
            <div className="flex justify-center mb-8">
              <img
                src="/images/governance/rcvoice-vs-rgvoice.webp"
                alt="RCVoice vs RGVoice: Two Tokens Coordinating Systemic Regeneration"
                width="1200"
                height="675"
                className="w-full rounded-xl shadow-2xl"
                loading="lazy"
              />
            </div>
            {/* RCVoice Fund vs Game Toggle + dynamic rewards token box */}
            <TwoTokensSection />
          </div>
        </div>
      </section>

      {/* Fund Governance Structure */}
      <section className="py-16 px-4 bg-[#0d2818]/50">
        <div className="container">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold text-[#7dd87d] mb-8 flex items-center gap-3">
              <Users className="w-8 h-8" />
              ReGen Civics Fund: Four Voice-Holder Groups
            </h2>
            
            <p className="text-white/90 text-lg leading-relaxed mb-12">
              The ReGen Civics Fund is governed by four distinct groups, each bringing unique perspectives and expertise. Together, they make strategic decisions about capital allocation, land project selection, and alliance partnerships.
            </p>
            
            {/* Fund Governance Structure Graphic */}
            <div className="mb-12 flex justify-center">
              <img
                src="https://d2xsxph8kpxj0f.cloudfront.net/310519663294072435/kP95yWoqdEQdQYEQLAKGck/governance-fund-structure-v2_688d510f.webp"
                alt="ReGen Civics Fund Governance Structure"
                width="1200"
                height="800"
                className="w-full max-w-2xl rounded-xl shadow-2xl"
                loading="lazy"
              />
            </div>
            
            {/* Four Voice-Holder Groups */}
            <div className="space-y-6 mb-12">
              <div className="bg-[#1a472a]/50 rounded-lg p-6 border-l-4 border-[#d4a574]">
                <h3 className="text-xl font-bold text-[#d4a574] mb-3">1. Council of Domain Experts</h3>
                <p className="text-white/80 mb-3"><strong>Role:</strong> Operational leadership and strategic guidance</p>
                <ul className="text-white/70 text-sm space-y-1 ml-4 mb-3">
                  <li>• Evaluate land project applications for funding</li>
                  <li>• Assess alliance partner fit, impact, and deal structure</li>
                  <li>• Guide fund strategy, risk management, and draft seasonal funding proposals</li>
                  <li>• Mentor emerging leaders in the regenerative movement</li>
                  <li>• Vote on proposals through the lens of domain expertise and long-term regenerative strategy</li>
                </ul>
                <p className="text-white/60 text-sm"><strong>Voice Share (Phase 1):</strong> 40%</p>
                <p className="text-white/60 text-sm"><strong>Selection:</strong> Domain experts selected by all voice holders</p>
              </div>
              
              <div className="bg-[#1a472a]/50 rounded-lg p-6 border-l-4 border-[#4a9f4a]">
                <h3 className="text-xl font-bold text-[#4a9f4a] mb-3">2. Land Project Representatives</h3>
                <p className="text-white/80 mb-3"><strong>Role:</strong> Ground-truth perspective on regenerative implementation</p>
                <ul className="text-white/70 text-sm space-y-1 ml-4 mb-3">
                  <li>• Provide feedback on fund mechanisms and support structures</li>
                  <li>• Share learnings from on-the-ground implementation</li>
                  <li>• Propose new alliance partnerships and collaborations</li>
                  <li>• Vote on proposals through the lens of on-the-ground regenerative impact</li>
                </ul>
                <p className="text-white/60 text-sm"><strong>Voice Share (Phase 1):</strong> 20%</p>
                <p className="text-white/60 text-sm"><strong>Selection:</strong> One representative per active land project in the fund</p>
              </div>
              
              <div className="bg-[#1a472a]/50 rounded-lg p-6 border-l-4 border-[#7dd87d]">
                <h3 className="text-xl font-bold text-[#7dd87d] mb-3">3. Alliance Organizations</h3>
                <p className="text-white/80 mb-3"><strong>Role:</strong> Ecosystem integration, movement building, and service delivery</p>
                <p className="text-white/70 text-sm mb-3 leading-relaxed">
                  Alliance Organizations provide the specialized services that Land Projects need - from regenerative agriculture expertise to legal, financial, and infrastructure support. By prioritizing Alliance Organizations as service providers, Land Projects keep resources circulating within the regenerative network rather than flowing out to conventional providers.
                </p>
                <ul className="text-white/70 text-sm space-y-1 ml-4 mb-3">
                  <li>• Connect fund to broader regenerative networks</li>
                  <li>• Deliver specialized services to Land Projects, keeping resources in the network</li>
                  <li>• Propose collaborative initiatives and partnerships</li>
                  <li>• Vote on proposals through the lens of ecosystem integration and service delivery</li>
                </ul>
                <p className="text-white/60 text-sm"><strong>Voice Share (Phase 1):</strong> 20%</p>
                <p className="text-white/60 text-sm"><strong>Selection:</strong> One representative per active alliance partner</p>
              </div>
              
              <div className="bg-[#1a472a]/50 rounded-lg p-6 border-l-4 border-[#d4a574]">
                <h3 className="text-xl font-bold text-[#d4a574] mb-3">4. Investors</h3>
                <p className="text-white/80 mb-3"><strong>Role:</strong> Capital stewardship and financial accountability</p>
                <ul className="text-white/70 text-sm space-y-1 ml-4 mb-3">
                  <li>• Ensure fund sustainability and ROI on regenerative impact</li>
                  <li>• Propose investment strategies and risk management</li>
                  <li>• Vote on proposals through the lens of capital stewardship and financial sustainability</li>
                  <li>• Share insights on market opportunities</li>
                </ul>
                <p className="text-white/60 text-sm"><strong>Voice Share (Phase 1):</strong> 20%</p>
                <p className="text-white/60 text-sm"><strong>Selection:</strong> Proportional to capital contributed (with minimum thresholds)</p>
              </div>
            </div>

            {/* Governance Evolution Graphic */}
            <div className="mb-12">
              <h3 className="text-2xl font-bold text-white mb-6 text-center">Governance Evolution: Three Phases</h3>
              <p className="text-white/80 text-sm mb-8 text-center">
                The fund's governance intentionally evolves to include "The People" - those living and working in land projects and organizations:
              </p>
              <div className="flex justify-center">
                <img
                  src="https://d2xsxph8kpxj0f.cloudfront.net/310519663294072435/kP95yWoqdEQdQYEQLAKGck/governance-evolution-v2_66ad1937.webp"
                  alt="ReGen Civics Governance Evolution"
                  width="1200"
                  height="800"
                  className="w-full rounded-xl shadow-2xl"
                  loading="lazy"
                />
              </div>
            </div>

            {/* Seasonal Voting Process */}
            <div className="mb-12">
              <h3 className="text-2xl font-bold text-white mb-6 text-center">Seasonal Voting Process</h3>
              <p className="text-white/80 text-sm mb-8 text-center">
                Every season, the ReGen Civics community gathers to propose, discuss, and vote on initiatives that shape the fund's direction and impact.
              </p>
              <div className="flex justify-center mb-8">
                <img
                  src="https://d2xsxph8kpxj0f.cloudfront.net/310519663294072435/kP95yWoqdEQdQYEQLAKGck/seasonal-voting-v2_08cf1fa6.webp"
                  alt="ReGen Civics Seasonal Voting Process"
                  width="1200"
                  height="800"
                  className="w-full rounded-xl shadow-2xl"
                  loading="lazy"
                />
              </div>
              <div className="bg-[#0d2818]/50 rounded-lg p-6 border border-[#7dd87d]/30">
                <p className="text-white/60 text-sm text-center">
                  <strong>Voting Threshold:</strong> 90% approval required for major decisions (fund strategy, distributions, governance changes)
                </p>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Game Governance Section */}
      <section className="py-16 px-4 bg-[#0d2818]/50">
        <div className="container">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold text-[#7dd87d] mb-8 flex items-center gap-3">
              <ZapIcon className="w-8 h-8" />
              ReGen Game: By the Players, For the Players
            </h2>
            
            <p className="text-white/90 text-lg leading-relaxed mb-12">
              The ReGen Game operates on a fundamentally different principle: <strong>governance by active participation</strong>. Players earn voice through Quest completion and contributions, ensuring that those who are most engaged in the Game's mission have the greatest say in its direction.
            </p>
            
            {/* How Player Voice Works */}
            <div className="space-y-6 mb-12">
              <div className="bg-[#1a472a]/50 rounded-lg p-6 border-l-4 border-[#7dd87d]">
                <h3 className="text-xl font-bold text-[#7dd87d] mb-3">Earn Voice Through Action</h3>
                <p className="text-white/80">
                  Every quest completed = voice earned. Every contribution made = voice earned. The more you play and contribute, the more your voice grows. There's no minimum threshold; everyone who participates has a voice.
                </p>
              </div>

              <div className="bg-[#1a472a]/50 rounded-lg p-6 border-l-4 border-[#7dd87d]">
                <h3 className="text-xl font-bold text-[#7dd87d] mb-3">Monthly Voice Decay (3%)</h3>
                <p className="text-white/80">
                  Voice wanes by 3% each month. This ensures the game continuously shifts governance power to current active players. It doesn't matter if you joined a few years into the game; your voice grows with your participation and the game always belongs to those playing now.
                </p>
              </div>

              <div className="bg-[#1a472a]/50 rounded-lg p-6 border-l-4 border-[#7dd87d]">
                <h3 className="text-xl font-bold text-[#7dd87d] mb-3">Governance Through Growth</h3>
                <p className="text-white/80">
                  Quests are designed to increase your understanding, health, capability, awareness, and decision-making abilities. The more you play, the better equipped you are to make wise decisions about the Game's direction. Our thesis: the Game should be governed by those actively working on themselves.
                </p>
              </div>
            </div>

            {/* Why This Model Works */}
            <div className="mb-12">
              <h3 className="text-2xl font-bold text-white mb-6">Why?</h3>
              <div className="space-y-4">
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-[#7dd87d]/30">
                  <h4 className="text-lg font-bold text-[#7dd87d] mb-3">Decentralized by Design</h4>
                  <p className="text-white/80">
                    No single player or group can dominate governance. Voice is earned through participation and naturally redistributes through monthly waning. The Game remains decentralized and responsive to the active community.
                  </p>
                </div>
                
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-[#7dd87d]/30">
                  <h4 className="text-lg font-bold text-[#7dd87d] mb-3">Meritocratic and Inclusive</h4>
                  <p className="text-white/80">
                    There's no gatekeeping or voting committee. Anyone can participate and earn voice. New players can quickly gain influence by engaging deeply with quests and contributing to the community.
                  </p>
                </div>
                
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-[#7dd87d]/30">
                  <h4 className="text-lg font-bold text-[#7dd87d] mb-3">Aligned with Regeneration</h4>
                  <p className="text-white/80">
                    Governance power flows to those who are most committed to personal and collective regeneration. The Game's direction is shaped by players who are actively healing themselves and contributing to the movement.
                  </p>
                </div>
                
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-[#7dd87d]/30">
                  <h4 className="text-lg font-bold text-[#7dd87d] mb-3">Future-Proof</h4>
                  <p className="text-white/80">
                    The monthly voice decay ensures the Game never becomes stale or controlled by early players. As new seasons begin and new players join, the Game continuously refreshes its governance. It's always a Game for active players.
                  </p>
                </div>
              </div>
            </div>
            
            {/* Game Governance in Action */}
            <div className="bg-[#1a472a]/50 rounded-lg p-6 border border-[#7dd87d]/30">
              <h3 className="text-xl font-bold text-[#7dd87d] mb-4">Game Governance in Action</h3>
              <p className="text-white/80 mb-4">
                Players use their voice to:
              </p>
              <ul className="space-y-2 text-white/80 text-sm">
                <li className="flex gap-2">
                  <CheckCircle2 className="w-5 h-5 text-[#7dd87d] flex-shrink-0" />
                  <span>Vote on new quest designs and seasonal themes</span>
                </li>
                <li className="flex gap-2">
                  <CheckCircle2 className="w-5 h-5 text-[#7dd87d] flex-shrink-0" />
                  <span>Vote on Quest completion proposals submitted by other Players, verifying that quests were genuinely completed and the work created real value</span>
                </li>
                <li className="flex gap-2">
                  <CheckCircle2 className="w-5 h-5 text-[#7dd87d] flex-shrink-0" />
                  <span>Propose and approve Game rule changes</span>
                </li>
                <li className="flex gap-2">
                  <CheckCircle2 className="w-5 h-5 text-[#7dd87d] flex-shrink-0" />
                  <span>Determine token distribution and reward structures</span>
                </li>
                <li className="flex gap-2">
                  <CheckCircle2 className="w-5 h-5 text-[#7dd87d] flex-shrink-0" />
                  <span>Shape the Game's evolution and long-term vision</span>
                </li>
              </ul>
              <div className="mt-4 bg-[#7dd87d]/10 rounded-lg p-4 border border-[#7dd87d]/20">
                <p className="text-[#7dd87d] text-sm">
                  <strong>Why this matters:</strong> When you submit a Quest completion proposal, other Players will read it and learn from your work. This is why we make our proposals add real value: your contribution becomes part of the collective knowledge of the Game.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Why Collective Governance Matters */}
      <section className="py-16 px-4 bg-[#0d2818]/50">
        <div className="container">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold text-[#7dd87d] mb-12 text-center">
              Why Collective Governance Matters
            </h2>
            
            <div className="space-y-6">
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-[#7dd87d]/30">
                <h3 className="text-xl font-bold text-[#7dd87d] mb-3">Building Trust Through Participation</h3>
                <p className="text-white/80">
                  When people have a voice in decisions that affect them, they become invested in outcomes. Collective governance transforms stakeholders into stewards.
                </p>
              </div>
              
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-[#7dd87d]/30">
                <h3 className="text-xl font-bold text-[#7dd87d] mb-3">Distributed Wisdom</h3>
                <p className="text-white/80">
                  No single perspective holds all the answers. By bringing together domain experts, land projects, alliance organizations, investors, and eventually the people living in these communities, we access diverse wisdom and reduce blind spots.
                </p>
              </div>
              
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-[#7dd87d]/30">
                <h3 className="text-xl font-bold text-[#7dd87d] mb-3">Regenerative Alignment</h3>
                <p className="text-white/80">
                  Governance structures that reflect regenerative principles - distributed, adaptive, inclusive, and growth-oriented - will naturally produce regenerative outcomes.
                </p>
              </div>
              
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-[#7dd87d]/30">
                <h3 className="text-xl font-bold text-[#7dd87d] mb-3">Movement Infrastructure</h3>
                <p className="text-white/80">
                  ReGen Civics governance is more than just making decisions; it's about building the infrastructure for a regenerative movement. We're modeling what collective governance can look like at scale and exploring diverse strategies to achieve our goals.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Governance as Movement Infrastructure */}
      <section className="py-16 px-4 bg-[#0d2818]/50">
        <div className="container">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold text-[#7dd87d] mb-8 text-center">
              Governance as Movement Infrastructure
            </h2>
            
            <p className="text-white/90 text-lg leading-relaxed mb-8 text-center">
              The governance systems we build today become the templates for tomorrow's regenerative societies. By creating transparent, participatory, and adaptive governance structures, we're not just managing a fund and a Game - we're demonstrating what's possible when we trust people to make wise decisions about their own futures.
            </p>
            
            <p className="text-white/90 text-lg leading-relaxed text-center">
              The Regenerative Renaissance requires governance that evolves with our understanding, includes those most affected by decisions, and aligns incentives toward collective wellbeing. ReGen Civics governance is designed to do exactly that.
            </p>
          </div>
        </div>
      </section>

      {/* Live Governance Dashboard - Earth Day Countdown */}
      <section className="py-16 px-4">
        <div className="container">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold text-[#7dd87d] mb-4 text-center">Live Governance Dashboard</h2>
            <p className="text-white/80 text-lg leading-relaxed mb-10 text-center max-w-3xl mx-auto">
              Real-time voice distribution and active proposals from Hypha, live for all to see.
            </p>
            <EarthDayCountdown />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4">
        <div className="container">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl font-bold text-white mb-6">
              Access Live Governance Spaces
            </h2>
            <p className="text-xl text-white/90 mb-8">
              Explore our live governance systems, join the next Seasonal Festival, or apply to become a land project or alliance partner.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a href="https://app.hypha.earth/en/dho/regen-civics/agreements" target="_blank" rel="noopener noreferrer">
                <Button size="lg" className="bg-[#7dd87d] text-[#1a472a] hover:bg-[#6bc76b] font-bold">
                  Explore Fund Governance →
                </Button>
              </a>
              <a href="https://app.hypha.earth/en/dho/regen-games/agreements" target="_blank" rel="noopener noreferrer">
                <Button size="lg" variant="outline" className="border-[#7dd87d] text-[#7dd87d] hover:bg-[#7dd87d]/10 font-bold">
                  Explore Game Governance →
                </Button>
              </a>
            </div>
          </div>
        </div>
      </section>
    </div>
    </PageWrapper>
  );
}
