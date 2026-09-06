/**
 * Crowd Pooling campaign gallery (/campaigns).
 *
 * Lists real campaigns from the database via campaigns.list. Demo campaigns
 * (isDemo = 1, seeded examples) render with a persistent "Example" badge and
 * never count in the impact strip. Card click navigates to /campaign/:id,
 * the real, shareable campaign page.
 *
 * Spec: CROWDPOOLING_PLATFORM_SPEC.md Part D (gallery + routing).
 */

import { Link, useLocation } from "wouter";
import {
  Users, MapPin, Target, Sparkles,
  FileText, DollarSign, TrendingUp,
  X, Copy, ChevronDown, ChevronUp, Play,
  Share2, Twitter, MessageCircle, Filter, SortAsc, Lock,
  Hourglass, AlertTriangle, Star,
  Bell, CheckCircle, BookOpen, Leaf,
  Map as MapIcon, LayoutGrid
} from "lucide-react";
import { CampaignMap } from "@/components/crowdpool/CampaignMap";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { SEO, pageSEO } from "@/components/SEO";
import { pageCopy } from "@/data/pageCopy";
import { SeedOfLifeIcon } from "@/components/SeedOfLifeIcon";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import { copyToClipboard } from "@/lib/clipboard";
import { trpc } from "@/lib/trpc";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { useCountUp } from "@/hooks/useCountUp";
import { cdnImg } from "@/lib/utils";

// ────────────────────────────────────────────────────────────────────────────────
// Card model: what the gallery renders, mapped from DB campaign rows
// ────────────────────────────────────────────────────────────────────────────────
export interface GalleryCampaign {
  id: number;
  name: string;
  location: string;
  description: string;
  /** totalValue + financialTarget: the whole pool the campaign is raising. */
  targetAmount: number;
  /** pledgedTotal: what the community has pledged so far. Financial pledges are
   *  already inside it; pledgedFinancial is a breakdown, never an addend. */
  currentAmount: number;
  /** pledgedFinancial only, for the second bar. */
  financialAmount: number;
  /** The cash ask alone. The second bar divides by THIS, not by the whole goal. */
  financialTarget: number;
  currency: string;
  /** Omitted when the API doesn't expose it yet; the UI then omits the row. */
  contributorsCount?: number;
  recentContributions: number;
  /** ISO date string derived from startedAt + durationDays, or null. */
  deadline: string | null;
  image: string;
  tags: string[];
  status: "active" | "funded";
  isDemo: boolean;
  daoLink: string | null;
  createdAtMs: number;
}

// Currency symbols
const currencySymbols: Record<string, string> = {
  USD: "$", EUR: "€", GBP: "£", PHP: "₱", JPY: "¥", INR: "₹"
};

// ────────────────────────────────────────────────────────────────────────────────
// Helpers: deadline math
// ────────────────────────────────────────────────────────────────────────────────
function daysLeft(deadline: string | null): number | null {
  if (!deadline) return null;
  const d = new Date(deadline);
  if (isNaN(d.getTime())) return null;
  const diff = d.getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

// ────────────────────────────────────────────────────────────────────────────────
// Countdown Badge (150-15)
// ────────────────────────────────────────────────────────────────────────────────
function DeadlineCountdown({ deadline }: { deadline: string | null }) {
  const days = daysLeft(deadline);
  if (days === null) return <span className="text-white/80">Ongoing</span>;
  const color = days <= 30 ? "text-red-400" : days <= 90 ? "text-amber-400" : "text-white/80";
  return (
    <span className={`flex items-center gap-1 ${color}`}>
      <Hourglass className="w-3 h-3" />
      {days} days left
    </span>
  );
}

// ────────────────────────────────────────────────────────────────────────────────
// Animated Progress Bar (150-2)
// The ghost "proposed" overlay carries accepted pledges once the detail API
// exposes delivered vs pledged; at card level we render the single
// pledgedTotal bar (showProposed off).
// ────────────────────────────────────────────────────────────────────────────────
function AnimatedProgressBar({
  label, totalValue, financialValue, targetAmount, financialTarget, currency,
  showProposed = false, proposedTotal = 0, proposedFinancial = 0,
  dark = false
}: {
  label: string;
  totalValue: number; financialValue: number; targetAmount: number;
  /** The cash ask alone. Omitted, the cash bar falls back to the whole goal. */
  financialTarget?: number;
  currency: string;
  showProposed?: boolean; proposedTotal?: number; proposedFinancial?: number;
  dark?: boolean;
}) {
  const { ref, isVisible } = useScrollAnimation({ threshold: 0.2, triggerOnce: true });
  const symbol = currencySymbols[currency] || currency;
  const safeTarget = targetAmount > 0 ? targetAmount : 1;
  // The cash bar divides by the CASH ask, not by the whole goal. Dividing it by
  // the whole goal guaranteed it looked tiny forever, because money is by design
  // the smaller part of what a project needs: a project asking 450k of which 50k
  // is cash, with the cash ask fully met, still drew a bar at eleven per cent.
  const safeFinancialTarget = (financialTarget ?? 0) > 0 ? (financialTarget as number) : safeTarget;
  const totalPct = Math.min((totalValue / safeTarget) * 100, 100);
  const financialPct = Math.min((financialValue / safeFinancialTarget) * 100, 100);
  const proposedTotalPct = showProposed ? Math.min((proposedTotal / safeTarget) * 100, 100) : 0;
  const proposedFinancialPct = showProposed ? Math.min((proposedFinancial / safeFinancialTarget) * 100, 100) : 0;

  const animatedTotal = useCountUp(totalPct, 1200, isVisible);
  const animatedFinancial = useCountUp(financialPct, 1200, isVisible);

  const isAlmostFunded = totalPct >= 80;
  const barGoldClass = isAlmostFunded ? "from-amber-400 to-amber-500" : "from-[#7dd87d] to-[#4a7c59]";
  const labelColor = dark ? "text-white/80" : "text-[#1a472a]/80";
  const textColor = dark ? "text-[#7dd87d]" : "text-[#4a7c59]";
  const amberTextColor = dark ? "text-amber-300" : "text-amber-600";
  const trackColor = dark ? "bg-white/10" : "bg-[#1a472a]/10";

  return (
    <div ref={ref} className="space-y-2">
      {label && (
        <div className="flex items-center justify-between text-xs">
          <span className={`font-medium ${dark ? "text-white/90" : "text-[#1a472a]"}`}>{label}</span>
          <span className={labelColor}>{symbol}{targetAmount.toLocaleString()} goal</span>
        </div>
      )}

      {/* Total bar */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-1">
            <TrendingUp className={`w-3 h-3 ${dark ? "text-[#7dd87d]" : "text-[#4a7c59]"}`} />
            <span className={labelColor}>Total Value</span>
          </div>
          <span className={`${textColor} font-medium`}>{symbol}{totalValue.toLocaleString()}</span>
        </div>
        <div className={`h-3 ${trackColor} rounded-full overflow-hidden relative`} style={{ willChange: "contents" }}>
          {showProposed && proposedTotal > totalValue && (
            <div
              className="absolute h-full bg-[#7dd87d]/40 rounded-full transition-all duration-1000"
              style={{ width: isVisible ? `${proposedTotalPct}%` : "0%" }}
            />
          )}
          <div
            className={`h-full bg-gradient-to-r ${barGoldClass} rounded-full relative z-10 ${isAlmostFunded && isVisible ? "animate-pulse-gold" : ""}`}
            style={{
              width: `${animatedTotal}%`,
              transition: "width 0.05s linear",
              willChange: "width"
            }}
          />
        </div>
        {showProposed && proposedTotal > totalValue && (
          <p className={`text-xs ${textColor} flex items-center gap-1`}>
            <span className="w-2 h-2 bg-[#7dd87d]/40 rounded-full inline-block" />
            +{symbol}{(proposedTotal - totalValue).toLocaleString()} proposed
          </p>
        )}
      </div>

      {/* Financial bar */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-1">
            <DollarSign className={`w-3 h-3 ${dark ? "text-amber-300" : "text-amber-600"}`} />
            <span className={labelColor}>Cash, Crypto, etc.</span>
          </div>
          <span className={`${amberTextColor} font-medium`}>{symbol}{financialValue.toLocaleString()}</span>
        </div>
        <div className={`h-3 ${trackColor} rounded-full overflow-hidden relative`}>
          {showProposed && proposedFinancial > financialValue && (
            <div
              className="absolute h-full bg-amber-400/40 rounded-full transition-all duration-1000"
              style={{ width: isVisible ? `${proposedFinancialPct}%` : "0%" }}
            />
          )}
          <div
            className="h-full bg-gradient-to-r from-amber-500 to-amber-600 rounded-full relative z-10"
            style={{
              width: `${animatedFinancial}%`,
              transition: "width 0.05s linear",
              willChange: "width"
            }}
          />
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────────
// Avatar Stack (150-8). Real initials only, never fake names. When the API
// gives us contributor names we show initials; otherwise a plain count chip.
// ────────────────────────────────────────────────────────────────────────────────
const AVATAR_COLORS = [
  "bg-[#7dd87d] text-[#1a472a]",
  "bg-amber-400 text-amber-900",
  "bg-sky-400 text-sky-900",
  "bg-purple-400 text-white",
  "bg-rose-400 text-white",
];

function initialsFor(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .map(w => w[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function AvatarStack({ contributorNames, count }: { contributorNames?: string[]; count?: number }) {
  if (contributorNames && contributorNames.length > 0) {
    const shown = contributorNames.slice(0, 5);
    const extra = contributorNames.length - shown.length;
    return (
      <div className="flex items-center gap-2">
        <div className="flex -space-x-2">
          {shown.map((name, i) => (
            <div
              key={`${name}-${i}`}
              title={name}
              className={`w-7 h-7 rounded-full border-2 border-[#0d2818] flex items-center justify-center text-[10px] font-bold ${AVATAR_COLORS[i % AVATAR_COLORS.length]}`}
              style={{ zIndex: shown.length - i }}
            >
              {initialsFor(name)}
            </div>
          ))}
          {extra > 0 && (
            <div className="w-7 h-7 rounded-full border-2 border-[#0d2818] bg-white/10 text-white flex items-center justify-center text-[10px] font-bold">
              +{extra}
            </div>
          )}
        </div>
      </div>
    );
  }
  if (typeof count === "number" && count > 0) {
    return (
      <span className="inline-flex items-center gap-1 bg-white/10 border border-white/20 text-white text-[10px] font-bold px-2 py-1 rounded-full">
        <Users className="w-3 h-3" />
        {count}
      </span>
    );
  }
  return null;
}

// ────────────────────────────────────────────────────────────────────────────────
// Momentum Badge (150-3)
// ────────────────────────────────────────────────────────────────────────────────
function MomentumBadge({ recentContributions }: { recentContributions: number }) {
  if (!recentContributions || recentContributions === 0) return null;
  return (
    <span className="inline-flex items-center gap-1 bg-[#7dd87d]/15 border border-[#7dd87d]/30 text-[#7dd87d] text-[10px] font-medium px-2 py-0.5 rounded-full">
      <span className="w-1.5 h-1.5 bg-[#7dd87d] rounded-full animate-pulse" />
      {recentContributions} contributions this week
    </span>
  );
}

// ────────────────────────────────────────────────────────────────────────────────
// Share Sheet (150-11). Shares the real campaign page URL.
// ────────────────────────────────────────────────────────────────────────────────
function ProjectShareSheet({ project }: { project: GalleryCampaign }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const pct = project.targetAmount > 0 ? Math.round((project.currentAmount / project.targetAmount) * 100) : 0;
  const url = `https://regencivics.earth/campaign/${project.id}`;
  const shareText = `Check out ${project.name} on ReGen Civics crowd pooling. They're ${pct}% of the way to their pool. ${url}`;

  const handleCopy = () => {
    copyToClipboard(url).then((ok) => {
      if (ok) { setCopied(true); setTimeout(() => setCopied(false), 2000); }
    });
  };

  const handleNativeShare = () => {
    if (navigator.share) {
      navigator.share({ title: project.name, text: shareText, url });
    } else {
      setOpen(true);
    }
  };

  return (
    <>
      <button
        onClick={(e) => { e.stopPropagation(); handleNativeShare(); }}
        className="flex items-center gap-1 text-white/70 hover:text-[#7dd87d] transition-colors text-xs"
      >
        <Share2 className="w-3 h-3" />
        Share
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
          onClick={(e) => { e.stopPropagation(); setOpen(false); }}
        >
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div
            className="relative bg-[#0d2818] border border-[#7dd87d]/20 rounded-2xl p-6 w-full max-w-sm z-10"
            onClick={e => e.stopPropagation()}
          >
            <button onClick={() => setOpen(false)} className="absolute top-3 right-3 text-white/60 hover:text-white">
              <X className="w-4 h-4" />
            </button>
            <h3 className="font-bold text-white mb-4">Share {project.name}</h3>
            <div className="space-y-3">
              <a
                href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`}
                target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-3 w-full bg-white/5 hover:bg-white/10 rounded-xl p-3 text-white transition-colors"
              >
                <Twitter className="w-4 h-4 text-sky-400" />
                Share on X / Twitter
              </a>
              <a
                href={`https://wa.me/?text=${encodeURIComponent(shareText)}`}
                target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-3 w-full bg-white/5 hover:bg-white/10 rounded-xl p-3 text-white transition-colors"
              >
                <MessageCircle className="w-4 h-4 text-green-400" />
                Share on WhatsApp
              </a>
              <button
                onClick={handleCopy}
                className="flex items-center gap-3 w-full bg-white/5 hover:bg-white/10 rounded-xl p-3 text-white transition-colors"
              >
                {copied ? <CheckCircle className="w-4 h-4 text-[#7dd87d]" /> : <Copy className="w-4 h-4 text-white/60" />}
                {copied ? "Link copied!" : "Copy link"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ────────────────────────────────────────────────────────────────────────────────
// How It Works + YouTube Facade (150-16)
// ────────────────────────────────────────────────────────────────────────────────
function HowCrowdPoolingWorks() {
  const [expanded, setExpanded] = useState(false);
  const [videoActive, setVideoActive] = useState(false);
  const YT_ID = "jxKR-WneJp0";
  const THUMB = `https://img.youtube.com/vi/${YT_ID}/maxresdefault.jpg`;

  return (
    <div className="bg-white/5 border border-[#7dd87d]/20 backdrop-blur-sm rounded-2xl overflow-hidden mb-8">
      <button
        className="flex items-center justify-between w-full p-5 text-left hover:bg-white/5 transition-colors"
        onClick={() => setExpanded(v => !v)}
      >
        <div className="flex items-center gap-3">
          <BookOpen className="w-5 h-5 text-[#7dd87d]" />
          <span className="font-bold text-white" style={{ fontFamily: 'var(--font-display)' }}>
            How Crowd Pooling Works
          </span>
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-white/60" /> : <ChevronDown className="w-4 h-4 text-white/60" />}
      </button>

      {expanded && (
        <div className="px-5 pb-5 space-y-5">
          {/* 3-step process */}
          <div className="grid md:grid-cols-3 gap-4">
            {[
              { n: 1, title: "Explore Campaigns", body: "Browse regenerative land projects and what they actually need." },
              { n: 2, title: "Pledge What You Have", body: "Commit tools, skills, time, or crypto straight to a campaign's needs." },
              { n: 3, title: "The Pool Fills", body: "When the pool fills, contributions are delivered and the project builds." },
            ].map(({ n, title, body }) => (
              <div key={n} className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-[#7dd87d]/20 border border-[#7dd87d]/30 flex items-center justify-center flex-shrink-0">
                  <span className="text-[#7dd87d] font-bold text-sm">{n}</span>
                </div>
                <div>
                  <h3 className="font-medium text-white text-sm">{title}</h3>
                  <p className="text-xs text-white/60 mt-0.5">{body}</p>
                </div>
              </div>
            ))}
          </div>

          {/* YouTube facade */}
          <div role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setVideoActive(true); } }} className="rounded-xl overflow-hidden aspect-video relative group cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#7dd87d]/50" onClick={() => setVideoActive(true)}>
            {!videoActive ? (
              <>
                <img
                  src={THUMB}
                  alt="Crowd Pooling explanation video"
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-black/40 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                  <div className="w-16 h-16 rounded-full bg-white/90 flex items-center justify-center shadow-xl">
                    <Play className="w-7 h-7 text-[#1a472a] ml-1" />
                  </div>
                </div>
                <div className="absolute bottom-3 left-3 bg-black/60 px-2 py-1 rounded text-white text-xs">
                  Watch: What is Crowd Pooling?
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
// The subscribe API is per-campaign (campaigns.subscribeByEmail), so this
// page-level form subscribes the visitor to the flagship campaign: the first
// active real campaign, or the first demo campaign when no real one is live
// yet. Per-campaign subscribing lives on each campaign page.
// ────────────────────────────────────────────────────────────────────────────────
function GetNotifiedForm({ campaignId }: { campaignId: number }) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const subscribe = trpc.campaigns.subscribeByEmail.useMutation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    try {
      await subscribe.mutateAsync({ campaignId, email, name: name || undefined });
      setSubmitted(true);
      toast.success("You're on the list!", { description: "We'll email you when crowd pooling opens." });
    } catch {
      toast.error("Could not save your email. Try again in a moment.");
    }
  };

  return (
    <div className="bg-gradient-to-br from-[#0d2818] to-[#1a472a] border border-[#7dd87d]/20 rounded-2xl p-6 sm:p-8 text-center">
      <Bell className="w-8 h-8 text-[#7dd87d] mx-auto mb-3" />
      <h2 className="text-xl font-bold text-white mb-2" style={{ fontFamily: 'var(--font-display)' }}>
        Get notified when crowd pooling opens.
      </h2>
      <p className="text-white/60 text-sm mb-5 max-w-md mx-auto">
        Leave your email and we'll write when the first season of campaigns opens for contributions.
      </p>
      {submitted ? (
        <div className="flex items-center justify-center gap-2 text-[#7dd87d]">
          <CheckCircle className="w-5 h-5" />
          <span className="font-medium">You're on the list!</span>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
          <Input
            type="text"
            placeholder="Your name"
            value={name}
            onChange={e => setName(e.target.value)}
            className="bg-white/5 border-white/20 text-white placeholder:text-white/70"
          />
          <Input
            type="email"
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
// Total Combined Impact Footer Strip (150-17). Real campaigns only: demo
// campaigns never count here (spec Part D, decision #3).
// ────────────────────────────────────────────────────────────────────────────────
function ImpactStrip({ projects }: { projects: GalleryCampaign[] }) {
  const { ref, isVisible } = useScrollAnimation({ threshold: 0.3, triggerOnce: true });
  // Values are summed as plain numbers; campaigns are USD-denominated today.
  const totalPooled = projects.reduce((s, p) => s + p.currentAmount, 0);
  const campaignCount = projects.length;
  const totalPlaces = new Set(
    projects.map(p => (p.location.split(",")[0] || p.location).trim().toLowerCase())
  ).size;

  const animPooled = useCountUp(totalPooled, 1400, isVisible);
  const animCampaigns = useCountUp(campaignCount, 800, isVisible);
  const animPlaces = useCountUp(totalPlaces, 800, isVisible);

  if (campaignCount === 0) return null;

  return (
    <div ref={ref} className="bg-[#0d2818]/80 border border-[#7dd87d]/20 backdrop-blur-sm rounded-2xl py-6 px-8 mb-8">
      <p className="text-white/60 text-xs uppercase tracking-widest text-center mb-4">Combined impact across live campaigns</p>
      <div className="flex flex-wrap items-center justify-center gap-8 sm:gap-16">
        {[
          { value: animCampaigns, label: "live campaigns", prefix: "" },
          { value: animPooled, label: "pledged so far", prefix: "$" },
          { value: animPlaces, label: "places", prefix: "" },
        ].map(({ value, label, prefix }) => (
          <div key={label} className="text-center">
            <p className="text-3xl sm:text-4xl font-bold text-[#7dd87d]">{prefix}{value.toLocaleString()}</p>
            <p className="text-white/70 text-sm">{label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────────
// Row mapping: DB campaign -> card model
// ────────────────────────────────────────────────────────────────────────────────
const LISTED_STATUSES = ["active", "funded", "completed"] as const;

function campaignDeadlineIso(row: {
  startedAt: Date | string | null;
  publishedAt: Date | string | null;
  createdAt: Date | string;
  durationDays: number;
}): string | null {
  const base = row.startedAt ?? row.publishedAt ?? row.createdAt;
  if (!base) return null;
  const start = new Date(base);
  if (isNaN(start.getTime())) return null;
  const end = new Date(start.getTime() + (row.durationDays || 90) * 24 * 60 * 60 * 1000);
  return end.toISOString();
}

// ────────────────────────────────────────────────────────────────────────────────
// Main Page Component
// ────────────────────────────────────────────────────────────────────────────────
export default function CrowdPoolingProjects() {
  const [, navigate] = useLocation();

  // 150-6: Filter + sort state
  const [activeTags, setActiveTags] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<"most-funded" | "ending-soon" | "newest" | "most-contributors">("most-funded");
  const [activeTab, setActiveTab] = useState<"active" | "upcoming" | "funded">("active");
  const [viewMode, setViewMode] = useState<"grid" | "map">("grid");

  // Real campaigns from the database. Demo campaigns (isDemo = 1) come back
  // like any other row and are labeled, never merged with hardcoded data.
  const { data: campaignRows, isLoading } = trpc.campaigns.list.useQuery({}, {
    refetchInterval: 5 * 60 * 1000,
  });

  const campaigns = useMemo<GalleryCampaign[]>(() => {
    return (campaignRows ?? [])
      .filter(c => (LISTED_STATUSES as readonly string[]).includes(c.status))
      .map((c) => {
        const rawImage = c.coverImage?.url || c.projectImageUrl || c.generatedImageUrl || "";
        // contributorsCount / recentContributions are part of the campaigns.list
        // contract but may not be exposed yet; omit gracefully until they are.
        const extras = c as { contributorsCount?: number; recentContributions?: number };
        return {
          id: c.id,
          name: c.title || c.projectName,
          location: c.location || "Location TBD",
          description: c.description || "",
          targetAmount: (c.totalValue ?? 0) + (c.financialTarget ?? 0),
          // pledgedTotal already contains the financial pledges; pledgedFinancial
          // is a breakdown of it, not a second pot. Adding them showed every cash
          // pledge twice, here and in the site-wide pooled figure below.
          currentAmount: c.pledgedTotal ?? 0,
          financialAmount: c.pledgedFinancial ?? 0,
          financialTarget: c.financialTarget ?? 0,
          currency: c.currency || "USD",
          contributorsCount: typeof extras.contributorsCount === "number" ? extras.contributorsCount : undefined,
          recentContributions: extras.recentContributions ?? 0,
          deadline: campaignDeadlineIso(c),
          image: rawImage ? cdnImg(rawImage, 800) : "",
          tags: c.currentPhase ? [c.currentPhase] : [],
          status: c.status === "active" ? "active" as const : "funded" as const,
          isDemo: c.isDemo === 1,
          daoLink: c.daoLink || null,
          createdAtMs: c.createdAt ? new Date(c.createdAt).getTime() : 0,
        };
      });
  }, [campaignRows]);

  const allTags = useMemo(
    () => Array.from(new Set(campaigns.flatMap(p => p.tags))),
    [campaigns]
  );

  const sortedProjects = useMemo(() => {
    const tabFiltered = campaigns.filter(p => {
      if (activeTab === "active") return p.status === "active";
      if (activeTab === "funded") return p.status === "funded";
      return false;
    });

    const tagFiltered = activeTags.length === 0
      ? tabFiltered
      : tabFiltered.filter(p => activeTags.some(t => p.tags.includes(t)));

    return [...tagFiltered].sort((a, b) => {
      switch (sortBy) {
        case "most-funded": {
          const pa = a.targetAmount > 0 ? a.currentAmount / a.targetAmount : 0;
          const pb = b.targetAmount > 0 ? b.currentAmount / b.targetAmount : 0;
          return pb - pa;
        }
        case "most-contributors": return (b.contributorsCount ?? 0) - (a.contributorsCount ?? 0);
        case "ending-soon": {
          const da = daysLeft(a.deadline) ?? 9999;
          const db2 = daysLeft(b.deadline) ?? 9999;
          return da - db2;
        }
        case "newest": return b.createdAtMs - a.createdAtMs;
        default: return 0;
      }
    });
  }, [campaigns, activeTab, activeTags, sortBy]);

  const toggleTag = (tag: string) => {
    setActiveTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
  };

  const openCampaign = (id: number) => navigate(`/campaign/${id}`);

  // Impact strip counts real campaigns only; demos are excluded (spec Part D).
  const realLiveCampaigns = campaigns.filter(p => !p.isDemo);

  // Flagship campaign for the page-level notify form: first active real
  // campaign, else first demo. See GetNotifiedForm comment.
  const flagship =
    campaigns.find(p => !p.isDemo && p.status === "active") ??
    campaigns.find(p => p.isDemo) ??
    campaigns[0];

  const activeCount = campaigns.filter(p => p.status === "active").length;
  const fundedCount = campaigns.filter(p => p.status === "funded").length;

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
                <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
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
            <Leaf className="w-4 h-4 text-[#7dd87d] flex-shrink-0" />
            <span>
              {pageCopy.crowdPoolingProjects.callout.text}{" "}
              <Link href="/crowd-pooling" className="font-medium text-[#7dd87d] hover:underline">
                {pageCopy.crowdPoolingProjects.callout.link}
              </Link>
            </span>
          </div>

          {/* How It Works collapsible (150-16) */}
          <HowCrowdPoolingWorks />

          {/* 150-19: Active / Upcoming / Complete tabs */}
          <div className="flex flex-wrap items-center gap-2 mb-6">
            {[
              { key: "active", label: `Active (${activeCount})` },
              { key: "upcoming", label: "Upcoming: Season Applications Open" },
              { key: "funded", label: `Complete (${fundedCount})` },
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key as typeof activeTab)}
                className={`px-4 py-2 min-h-11 rounded-full text-sm font-medium transition-all ${
                  activeTab === key
                    ? "bg-[#7dd87d] text-[#1a472a]"
                    : "bg-white/5 border border-white/20 text-white/60 hover:bg-white/10 hover:text-white"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* 150-6: Sort + filter bar */}
          <div className="flex flex-wrap items-center gap-3 mb-6">
            {/* Tag pills */}
            <div className="flex flex-wrap gap-2">
              {allTags.map(tag => (
                <button
                  key={tag}
                  onClick={() => toggleTag(tag)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                    activeTags.includes(tag)
                      ? "bg-[#7dd87d] text-[#1a472a]"
                      : "bg-white/5 border border-white/20 text-white/60 hover:bg-white/10"
                  }`}
                >
                  {tag}
                </button>
              ))}
              {activeTags.length > 0 && (
                <button
                  onClick={() => setActiveTags([])}
                  className="px-3 py-1 rounded-full text-xs font-medium text-white/60 hover:text-white/70 underline transition-colors"
                >
                  Clear filters
                </button>
              )}
            </div>

            {/* Sort dropdown */}
            <div className="ml-auto flex items-center gap-2">
              <SortAsc className="w-3 h-3 text-white/60" />
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value as typeof sortBy)}
                className="bg-white/5 border border-white/20 text-white/70 text-xs rounded-lg px-2 py-1.5 focus:outline-none focus:border-[#7dd87d]/50"
              >
                <option value="most-funded">Furthest along</option>
                <option value="ending-soon">Ending Soon</option>
                <option value="newest">Newest</option>
                <option value="most-contributors">Most Contributors</option>
              </select>

              {/* Grid / map view toggle */}
              <div className="inline-flex rounded-lg border border-white/20 overflow-hidden">
                <button
                  type="button"
                  onClick={() => setViewMode("grid")}
                  aria-pressed={viewMode === "grid"}
                  aria-label="Grid view"
                  className={`px-2.5 py-1.5 pointer-coarse:min-h-11 flex items-center transition-colors ${
                    viewMode === "grid" ? "bg-[#7dd87d] text-[#1a472a]" : "bg-white/5 text-white/60 hover:bg-white/10"
                  }`}
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("map")}
                  aria-pressed={viewMode === "map"}
                  aria-label="Map view"
                  className={`px-2.5 py-1.5 pointer-coarse:min-h-11 flex items-center transition-colors ${
                    viewMode === "map" ? "bg-[#7dd87d] text-[#1a472a]" : "bg-white/5 text-white/60 hover:bg-white/10"
                  }`}
                >
                  <MapIcon className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Upcoming tab content */}
          {activeTab === "upcoming" && (
            <div className="grid md:grid-cols-2 gap-6 mb-8">
              {[1, 2].map(i => (
                <div key={i} className="relative bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
                  <div className="absolute inset-0 bg-[#0d2818]/80 z-10 flex flex-col items-center justify-center p-6 text-center">
                    <Lock className="w-8 h-8 text-white/70 mb-3" />
                    <p className="text-white/70 font-medium mb-1">Coming this season</p>
                    <p className="text-white/60 text-sm mb-4">
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

          {/* Campaign cards grid */}
          {activeTab !== "upcoming" && (
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
                <div className="text-center py-16 text-white/60">
                  <Sparkles className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p className="text-white/80 font-medium mb-1">No campaigns yet.</p>
                  <p>The first season opens late 2026 / early 2027.</p>
                </div>
              )}

              {!isLoading && campaigns.length > 0 && sortedProjects.length === 0 && (
                <div className="text-center py-16 text-white/60">
                  <Filter className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p>No campaigns match your current filters.</p>
                  <button onClick={() => setActiveTags([])} className="mt-2 text-[#7dd87d] underline text-sm">Clear filters</button>
                </div>
              )}

              {viewMode === "map" && !isLoading && sortedProjects.length > 0 && (
                <CampaignMap campaigns={sortedProjects} onSelect={openCampaign} />
              )}

              <div className={`grid md:grid-cols-2 gap-6 ${viewMode === "map" ? "hidden" : ""}`}>
                {sortedProjects.map((project) => {
                  const pct = project.targetAmount > 0 ? Math.round((project.currentAmount / project.targetAmount) * 100) : 0;
                  const isAlmost = pct >= 80;

                  return (
                    <div
                      key={project.id}
                      className={`group relative bg-white/5 backdrop-blur-sm rounded-2xl overflow-hidden border transition-all duration-300 cursor-pointer
                        ${isAlmost
                          ? "border-amber-400/50 shadow-[0_0_20px_rgba(251,191,36,0.15)] hover:shadow-[0_0_30px_rgba(251,191,36,0.25)]"
                          : "border-[#7dd87d]/20 hover:border-[#7dd87d]/50"
                        }
                        hover:-translate-y-1 hover:shadow-[0_20px_40px_rgba(0,0,0,0.4)]`}
                      style={{ willChange: "transform" }}
                      onClick={() => openCampaign(project.id)}
                    >
                      {/* Campaign Image */}
                      <div className="h-52 relative overflow-hidden">
                        {project.image ? (
                          <img
                            src={project.image}
                            alt={project.name}
                            width="400"
                            height="208"
                            className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
                            style={{ willChange: "transform" }}
                            loading="lazy"
                          />
                        ) : (
                          <div className="absolute inset-0 bg-gradient-to-br from-[#1a472a] to-[#2d5a3d] flex items-center justify-center">
                            <SeedOfLifeIcon className="w-16 h-16 text-white/70" size={64} />
                          </div>
                        )}
                        {/* Gradient overlay */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                        {/* Funding % badge */}
                        <div className="absolute bottom-3 left-3 flex items-center gap-2 pointer-events-none">
                          <span className={`font-bold text-base px-3 py-1 rounded-lg leading-tight ${isAlmost ? "bg-amber-400 text-amber-900" : "bg-[#7dd87d] text-[#1a472a]"}`}>
                            {pct}%
                          </span>
                          <span className="text-white text-sm font-medium drop-shadow-sm">complete</span>
                        </div>

                        {/* Status badge */}
                        <Badge className={`absolute top-3 right-3 ${project.status === 'active' ? 'bg-emerald-500/80 text-white' : 'bg-white/20 text-white'}`}>
                          {project.status === 'active' ? 'In play' : 'Complete'}
                        </Badge>

                        {/* Example badge: persistent on demo campaigns (spec Part D) */}
                        {project.isDemo && (
                          <Badge className="absolute bottom-3 right-3 bg-amber-500/80 text-white text-[10px] pointer-events-none">
                            Example
                          </Badge>
                        )}
                      </div>

                      {/* Card body */}
                      <div className="p-5">
                        {/* Momentum badge (150-3) */}
                        {project.recentContributions > 0 && (
                          <div className="mb-2">
                            <MomentumBadge recentContributions={project.recentContributions} />
                          </div>
                        )}

                        {/* Almost funded treatment (150-7) */}
                        {isAlmost && project.targetAmount > project.currentAmount && (
                          <div className="mb-2 flex items-center gap-1.5 text-amber-300 text-xs font-medium">
                            <Star className="w-3 h-3 fill-amber-300" />
                            Almost There. Only {currencySymbols[project.currency] || project.currency}{(project.targetAmount - project.currentAmount).toLocaleString()} more needed
                          </div>
                        )}

                        <h3 className="text-lg font-bold text-white mb-1" style={{ fontFamily: 'var(--font-display)' }}>
                          {project.name}
                        </h3>
                        <div className="flex items-center gap-1 text-sm text-white/70 mb-3">
                          <MapPin className="w-3 h-3" />
                          {project.location}
                        </div>

                        <p className="text-sm text-white/70 mb-4 line-clamp-2">{project.description}</p>

                        {/* Animated Dual Progress Bars (150-2) */}
                        <div className="mb-4">
                          <AnimatedProgressBar
                            label="What has been pooled"
                            totalValue={project.currentAmount}
                            financialValue={project.financialAmount}
                            targetAmount={project.targetAmount}
                            financialTarget={project.financialTarget}
                            currency={project.currency}
                            dark
                          />
                        </div>

                        {/* Stats row */}
                        <div className="flex items-center justify-between text-xs text-white/70 mt-3 mb-3">
                          <div className="flex items-center gap-2">
                            <AvatarStack count={project.contributorsCount} />
                            {typeof project.contributorsCount === "number" && (
                              <span>{project.contributorsCount} contributors</span>
                            )}
                          </div>
                          <DeadlineCountdown deadline={project.deadline} />
                        </div>

                        {/* Tags */}
                        {project.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mb-4">
                            {project.tags.map((tag) => (
                              <Badge key={tag} className="text-xs bg-[#7dd87d]/10 text-[#7dd87d] border border-[#7dd87d]/20">{tag}</Badge>
                            ))}
                          </div>
                        )}

                        {/* Action row */}
                        <div className="flex items-center gap-2">
                          <Button
                            className={`flex-1 font-medium ${isAlmost ? "bg-amber-400 text-amber-900 hover:bg-amber-300" : "bg-[#7dd87d] text-[#1a472a] hover:bg-[#9de89d]"}`}
                            onClick={(e) => { e.stopPropagation(); openCampaign(project.id); }}
                          >
                            View Campaign
                          </Button>
                          <div className="flex items-center gap-1 text-white/60 text-xs" onClick={e => e.stopPropagation()}>
                            <ProjectShareSheet project={project} />
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Coming Soon placeholder card (150-12) */}
                {!isLoading && (
                  <div className="relative bg-white/5 border border-[#7dd87d]/20 rounded-2xl overflow-hidden min-h-[320px]">
                    <div className="h-52 bg-gradient-to-br from-[#1a472a]/20 to-[#0d2818]">
                      <div className="absolute inset-0 animate-pulse border-2 border-[#7dd87d]/20 rounded-2xl pointer-events-none" />
                    </div>
                    <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
                      <div className="w-10 h-10 rounded-full bg-[#7dd87d]/10 border border-[#7dd87d]/30 flex items-center justify-center mb-3 animate-pulse">
                        <Sparkles className="w-5 h-5 text-[#7dd87d]" />
                      </div>
                      <p className="text-white/80 font-semibold mb-1" style={{ fontFamily: 'var(--font-display)' }}>More Coming This Season</p>
                      <p className="text-white/60 text-sm mb-4">
                        More campaigns join as the season progresses. Want to see your project here? Apply.
                      </p>
                      <Link href="/seasons">
                        <Button className="bg-[#7dd87d]/15 border border-[#7dd87d]/40 text-[#7dd87d] hover:bg-[#7dd87d]/25 text-sm">
                          Apply for a Season
                        </Button>
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Total combined impact strip (150-17): real campaigns only */}
          <div className="mt-12">
            <ImpactStrip projects={realLiveCampaigns} />
          </div>

          {/* Get Notified (150-14): subscribes to the flagship campaign */}
          {flagship && (
            <div className="mt-8">
              <GetNotifiedForm campaignId={flagship.id} />
            </div>
          )}

          {/* CTA Section */}
          <div className="mt-8 bg-gradient-to-br from-[#0d2818]/80 to-[#1a472a]/80 backdrop-blur-sm border border-[#7dd87d]/20 rounded-2xl p-8 text-white text-center">
            <h2 className="text-2xl font-bold mb-3" style={{ fontFamily: 'var(--font-display)' }}>
              {pageCopy.crowdPoolingProjects.CTA.heading}
            </h2>
            <p className="text-white/70 max-w-lg mx-auto mb-6">
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
