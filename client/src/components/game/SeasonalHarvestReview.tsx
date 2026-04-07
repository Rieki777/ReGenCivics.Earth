/**
 * SeasonalHarvestReview - 7-card swipeable season summary shown at season end.
 * CSS scroll-snap carousel, no external deps.
 */
import { useRef, useState, useEffect, useCallback } from "react";
import { X, Share2, Heart, ArrowRight, ArrowLeft, Star, Users, Coins, TrendingUp, Award, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TierBadge } from "@/components/game/TierBadge";

interface SeasonData {
  questsCompleted: number;
  tokensEarned: number;
  referralSignups: number;
  newTier: string | null;
  scoreAtEnd: number;
  percentileAtEnd: number;
  seasonName: string;
  gratitudeSent: number;
  gratitudeReceived: number;
  contributionsByType: Record<string, number>;
}

interface Props {
  seasonData: SeasonData;
  onClose?: () => void;
}

const CARD_COUNT = 7;

const CAPITAL_LABELS: Record<string, string> = {
  social: "Social Capital",
  financial: "Financial Capital",
  living: "Living Capital",
  material: "Material Capital",
  intellectual: "Intellectual Capital",
  experiential: "Experiential Capital",
  spiritual: "Spiritual Capital",
  cultural: "Cultural Capital",
  influence: "Influence Capital",
};

const CAPITAL_COLORS: Record<string, string> = {
  social: "#7dd87d",
  financial: "#e8a838",
  living: "#5abb8a",
  material: "#c4785b",
  intellectual: "#6b8dd6",
  experiential: "#c084fc",
  spiritual: "#f472b6",
  cultural: "#fb923c",
  influence: "#a78bfa",
};

function getPercentileLabel(p: number): string {
  if (p >= 95) return "Top 5%";
  if (p >= 90) return "Top 10%";
  if (p >= 75) return "Top 25%";
  if (p >= 50) return "Top Half";
  return "Growing";
}

function getTopCapitals(contributions: Record<string, number>, count = 3) {
  return Object.entries(contributions)
    .sort(([, a], [, b]) => b - a)
    .slice(0, count);
}

/* ------------------------------------------------------------------ */
/*  Shared card wrapper                                                */
/* ------------------------------------------------------------------ */
function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`flex-shrink-0 w-full h-full snap-center flex flex-col items-center justify-center p-8 ${className}`}
      style={{
        background: "linear-gradient(145deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)",
        backdropFilter: "blur(12px)",
        borderRadius: 20,
        border: "1px solid rgba(125, 216, 125, 0.15)",
      }}
    >
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Dot indicator                                                      */
/* ------------------------------------------------------------------ */
function Dots({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex gap-2 justify-center py-3">
      {Array.from({ length: total }).map((_, i) => (
        <span
          key={i}
          className="rounded-full transition-all duration-300"
          style={{
            width: i === current ? 20 : 8,
            height: 8,
            backgroundColor: i === current ? "#7dd87d" : "rgba(255,255,255,0.25)",
          }}
        />
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */
export function SeasonalHarvestReview({ seasonData, onClose }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeCard, setActiveCard] = useState(0);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const idx = Math.round(el.scrollLeft / el.clientWidth);
    setActiveCard(Math.min(idx, CARD_COUNT - 1));
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener("scroll", handleScroll, { passive: true });
    return () => el.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  const goTo = (idx: number) => {
    scrollRef.current?.scrollTo({ left: idx * (scrollRef.current?.clientWidth ?? 0), behavior: "smooth" });
  };

  const next = () => { if (activeCard < CARD_COUNT - 1) goTo(activeCard + 1); };
  const prev = () => { if (activeCard > 0) goTo(activeCard - 1); };

  const topCapitals = getTopCapitals(seasonData.contributionsByType);
  const percentileLabel = getPercentileLabel(seasonData.percentileAtEnd);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: "rgba(0,0,0,0.6)", backdropFilter: "blur(6px)" }}
    >
      <div
        className="relative w-full max-w-md mx-4"
        style={{
          backgroundColor: "#0d2818",
          borderRadius: 24,
          overflow: "hidden",
          maxHeight: "90vh",
        }}
      >
        {/* Close button */}
        {onClose && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-10 text-white/50 hover:text-white transition-colors"
            aria-label="Close season review"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        {/* Carousel */}
        <div
          ref={scrollRef}
          className="flex overflow-x-auto"
          style={{
            scrollSnapType: "x mandatory",
            WebkitOverflowScrolling: "touch",
            scrollbarWidth: "none",
            msOverflowStyle: "none",
            height: 480,
          }}
        >
          {/* Card 1: Your Season in Review */}
          <Card>
            <p className="text-sm uppercase tracking-widest text-[#7dd87d] mb-2 font-medium">
              Season Complete
            </p>
            <h2
              className="text-2xl font-bold text-white mb-1 text-center"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {seasonData.seasonName}
            </h2>
            <p className="text-white/50 text-sm mb-6">Your season in review</p>

            <div className="flex flex-col items-center gap-3 mb-6">
              <span
                className="text-6xl font-black text-white"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {seasonData.scoreAtEnd.toLocaleString()}
              </span>
              <p className="text-white/60 text-sm">Contribution Score</p>
            </div>

            <Badge
              className="text-sm px-4 py-1"
              style={{
                backgroundColor: "rgba(125, 216, 125, 0.15)",
                color: "#7dd87d",
                border: "1px solid rgba(125, 216, 125, 0.3)",
              }}
            >
              <Star className="w-3.5 h-3.5 mr-1.5" />
              {percentileLabel}
            </Badge>
          </Card>

          {/* Card 2: Quests Completed */}
          <Card>
            <Award className="w-10 h-10 text-[#7dd87d] mb-4" />
            <p className="text-sm uppercase tracking-widest text-[#7dd87d] mb-2 font-medium">
              Quests Completed
            </p>
            <span
              className="text-6xl font-black text-white mb-4"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {seasonData.questsCompleted}
            </span>

            {Object.keys(seasonData.contributionsByType).length > 0 && (
              <div className="w-full mt-4 space-y-2">
                <p className="text-xs text-white/60 uppercase tracking-wider">By type</p>
                {Object.entries(seasonData.contributionsByType).map(([type, count]) => (
                  <div key={type} className="flex justify-between text-sm">
                    <span className="text-white/70 capitalize">{CAPITAL_LABELS[type] ?? type}</span>
                    <span className="text-white font-medium">{count}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-4 pt-4 border-t border-white/10 w-full text-center">
              <p className="text-white/50 text-xs">
                {seasonData.tokensEarned.toLocaleString()} XP earned from quests
              </p>
            </div>
          </Card>

          {/* Card 3: Tokens Earned */}
          <Card>
            <Coins className="w-10 h-10 text-[#e8a838] mb-4" />
            <p className="text-sm uppercase tracking-widest text-[#e8a838] mb-2 font-medium">
              $ReGen Earned
            </p>
            <span
              className="text-5xl font-black text-white mb-2"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {seasonData.tokensEarned.toLocaleString()}
            </span>
            <p className="text-white/50 text-sm mb-6">tokens this season</p>

            <div className="w-full space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-white/60">Quest completions</span>
                <span className="text-white font-medium">
                  {seasonData.questsCompleted > 0
                    ? Math.round(seasonData.tokensEarned * 0.6).toLocaleString()
                    : 0}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-white/60">Referral bonuses</span>
                <span className="text-white font-medium">
                  {seasonData.referralSignups > 0
                    ? Math.round(seasonData.tokensEarned * 0.2).toLocaleString()
                    : 0}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-white/60">Community activity</span>
                <span className="text-white font-medium">
                  {Math.round(
                    seasonData.tokensEarned -
                    Math.round(seasonData.tokensEarned * 0.6) -
                    (seasonData.referralSignups > 0 ? Math.round(seasonData.tokensEarned * 0.2) : 0)
                  ).toLocaleString()}
                </span>
              </div>
            </div>
          </Card>

          {/* Card 4: Community Impact */}
          <Card>
            <Users className="w-10 h-10 text-[#6b8dd6] mb-4" />
            <p className="text-sm uppercase tracking-widest text-[#6b8dd6] mb-2 font-medium">
              Community Impact
            </p>

            <div className="grid grid-cols-2 gap-6 mt-4 w-full">
              <div className="text-center">
                <span className="text-3xl font-black text-white block" style={{ fontFamily: "var(--font-display)" }}>
                  {seasonData.referralSignups}
                </span>
                <p className="text-white/50 text-xs mt-1">Referral signups</p>
              </div>
              <div className="text-center">
                <span className="text-3xl font-black text-white block" style={{ fontFamily: "var(--font-display)" }}>
                  {seasonData.gratitudeSent}
                </span>
                <p className="text-white/50 text-xs mt-1">Gratitude sent</p>
              </div>
              <div className="text-center">
                <span className="text-3xl font-black text-white block" style={{ fontFamily: "var(--font-display)" }}>
                  {seasonData.gratitudeReceived}
                </span>
                <p className="text-white/50 text-xs mt-1">Gratitude received</p>
              </div>
              <div className="text-center">
                <span className="text-3xl font-black text-white block" style={{ fontFamily: "var(--font-display)" }}>
                  {seasonData.questsCompleted}
                </span>
                <p className="text-white/50 text-xs mt-1">Endorsements</p>
              </div>
            </div>
          </Card>

          {/* Card 5: Your Growth */}
          <Card>
            <TrendingUp className="w-10 h-10 text-[#c084fc] mb-4" />
            <p className="text-sm uppercase tracking-widest text-[#c084fc] mb-2 font-medium">
              Your Growth
            </p>

            {seasonData.newTier && (
              <div className="flex items-center gap-3 mb-6 px-4 py-3 rounded-xl" style={{ backgroundColor: "rgba(125, 216, 125, 0.1)" }}>
                <TierBadge tier={seasonData.newTier} size="md" showLabel />
                <span className="text-[#7dd87d] text-sm font-medium">New tier reached.</span>
              </div>
            )}

            <div className="w-full space-y-4 mt-2">
              <p className="text-xs text-white/60 uppercase tracking-wider">Top Contributions</p>
              {topCapitals.map(([type, value]) => {
                const maxVal = topCapitals[0]?.[1] ?? 1;
                const pct = Math.round((value / maxVal) * 100);
                const color = CAPITAL_COLORS[type] ?? "#7dd87d";
                return (
                  <div key={type} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-white/70">{CAPITAL_LABELS[type] ?? type}</span>
                      <span className="text-white font-medium">{value}</span>
                    </div>
                    <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: "rgba(255,255,255,0.08)" }}>
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${pct}%`, backgroundColor: color }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Card 6: Shareable Card */}
          <Card className="relative">
            <div
              className="w-full rounded-2xl p-6 flex flex-col items-center gap-3"
              style={{
                background: "linear-gradient(160deg, #0d2818 0%, #1a4a2e 50%, #0d2818 100%)",
                border: "1.5px solid rgba(125, 216, 125, 0.3)",
              }}
            >
              <p className="text-xs uppercase tracking-widest text-[#7dd87d] font-medium">
                {seasonData.seasonName}
              </p>
              <span
                className="text-4xl font-black text-white"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {seasonData.scoreAtEnd.toLocaleString()}
              </span>
              <p className="text-white/50 text-xs">Contribution Score</p>

              <div className="flex gap-4 mt-2">
                <div className="text-center">
                  <span className="text-lg font-bold text-white">{seasonData.questsCompleted}</span>
                  <p className="text-white/60 text-[10px]">Quests</p>
                </div>
                <div className="text-center">
                  <span className="text-lg font-bold text-white">{seasonData.tokensEarned}</span>
                  <p className="text-white/60 text-[10px]">$ReGen</p>
                </div>
                <div className="text-center">
                  <span className="text-lg font-bold text-white">{seasonData.gratitudeReceived}</span>
                  <p className="text-white/60 text-[10px]">Gratitude</p>
                </div>
              </div>

              {seasonData.newTier && (
                <div className="mt-2">
                  <TierBadge tier={seasonData.newTier} size="sm" showLabel />
                </div>
              )}

              <Badge
                className="mt-2 text-[10px]"
                style={{
                  backgroundColor: "rgba(125, 216, 125, 0.12)",
                  color: "#7dd87d",
                  border: "1px solid rgba(125, 216, 125, 0.25)",
                }}
              >
                {percentileLabel}
              </Badge>

              <p className="text-white/20 text-[9px] mt-2">regen.civics</p>
            </div>

            <Button
              className="mt-4 gap-2"
              style={{
                backgroundColor: "#7dd87d",
                color: "#0d2818",
              }}
              onClick={() => {
                if (navigator.share) {
                  navigator.share({
                    title: `My ${seasonData.seasonName} season review`,
                    text: `I scored ${seasonData.scoreAtEnd.toLocaleString()} and completed ${seasonData.questsCompleted} quests on ReGen Civics.`,
                  }).catch(() => {});
                }
              }}
            >
              <Share2 className="w-4 h-4" />
              Share
            </Button>
          </Card>

          {/* Card 7: Gratitude */}
          <Card>
            <Heart className="w-10 h-10 text-[#f472b6] mb-4" />
            <p className="text-sm uppercase tracking-widest text-[#f472b6] mb-2 font-medium">
              Gratitude
            </p>

            <p className="text-white/60 text-sm text-center mb-4">
              You received {seasonData.gratitudeReceived} gratitude{" "}
              {seasonData.gratitudeReceived === 1 ? "token" : "tokens"} this season
              and sent {seasonData.gratitudeSent}.
            </p>

            <div
              className="w-full rounded-xl p-4 mb-4 text-center"
              style={{ backgroundColor: "rgba(244, 114, 182, 0.08)", border: "1px solid rgba(244, 114, 182, 0.15)" }}
            >
              <MessageCircle className="w-5 h-5 text-[#f472b6]/60 mx-auto mb-2" />
              <p className="text-white/60 text-xs">
                Gratitude messages from your community will appear here.
              </p>
            </div>

            <Button
              variant="outline"
              className="gap-2 border-[#f472b6]/30 text-[#f472b6] hover:bg-[#f472b6]/10"
            >
              <Heart className="w-4 h-4" />
              Send end-of-season gratitude
            </Button>
          </Card>
        </div>

        {/* Dots + nav */}
        <div className="px-6 pb-5 pt-1">
          <Dots current={activeCard} total={CARD_COUNT} />

          <div className="flex justify-between items-center mt-2">
            <button
              onClick={prev}
              disabled={activeCard === 0}
              className="text-white/60 hover:text-white disabled:opacity-20 transition-colors p-2"
              aria-label="Previous card"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>

            <p className="text-white/30 text-xs">
              {activeCard + 1} of {CARD_COUNT}
            </p>

            <button
              onClick={next}
              disabled={activeCard === CARD_COUNT - 1}
              className="text-white/60 hover:text-white disabled:opacity-20 transition-colors p-2"
              aria-label="Next card"
            >
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Hide scrollbar */}
        <style>{`
          div[style*="scroll-snap-type"]::-webkit-scrollbar { display: none; }
        `}</style>
      </div>
    </div>
  );
}
