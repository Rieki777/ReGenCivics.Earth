/**
 * SeasonalQuestFeed, shows featured quests for the current season.
 * Data comes from seasonalQuestsData (static). Season is detected via useHemisphere.
 */

import { useState } from "react";
import { ChevronDown, Lock } from "lucide-react";
import { useHemisphere, setHemisphereOverride } from "@/hooks/useHemisphere";
import { useQuestUnlocks } from "@/hooks/useQuestUnlocks";
import { SeasonProgressRing } from "@/components/SeasonProgressRing";
import { seasonalQuestsData } from "@/data/seasonalQuestsData";
import type { Season } from "@/hooks/useHemisphere";

// Season color palettes
const SEASON_COLORS: Record<string, {
  bg: string;
  text: string;
  border: string;
  pill: string;
  header: string;
}> = {
  spring: {
    bg: "bg-emerald-50",
    text: "text-emerald-800",
    border: "border-emerald-300",
    pill: "bg-emerald-100 text-emerald-800",
    header: "text-emerald-900",
  },
  summer: {
    bg: "bg-amber-50",
    text: "text-amber-800",
    border: "border-amber-300",
    pill: "bg-amber-100 text-amber-800",
    header: "text-amber-900",
  },
  fall: {
    bg: "bg-orange-50",
    text: "text-orange-800",
    border: "border-orange-300",
    pill: "bg-orange-100 text-orange-800",
    header: "text-orange-900",
  },
  winter: {
    bg: "bg-slate-50",
    text: "text-slate-700",
    border: "border-slate-300",
    pill: "bg-slate-100 text-slate-700",
    header: "text-slate-800",
  },
};

const SEASON_TAGLINES: Record<string, string> = {
  spring: "Spring is for planting.",
  summer: "Summer is full expression.",
  fall: "Fall is for harvesting and releasing.",
  winter: "Winter is for going inward.",
};

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function truncate(text: string, maxChars: number) {
  if (text.length <= maxChars) return text;
  return text.slice(0, maxChars).trimEnd() + "...";
}

interface SeasonalQuestFeedProps {
  /** Override the auto-detected season (e.g. when user clicks a season tab below) */
  forceSeason?: Season;
}

export function SeasonalQuestFeed({ forceSeason }: SeasonalQuestFeedProps = {}) {
  const { currentSeason, hemisphere, loading } = useHemisphere();
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  const [showAll, setShowAll] = useState(false);

  let unlocks: ReturnType<typeof useQuestUnlocks> | null = null;
  try { unlocks = useQuestUnlocks(); } catch { /* outside provider */ }
  const isLocked = unlocks ? !unlocks.isSeasonalPracticeUnlocked : false;

  const season: Season = forceSeason ?? (loading ? "spring" : currentSeason);
  const colors = SEASON_COLORS[season] ?? SEASON_COLORS.spring;
  const tagline = SEASON_TAGLINES[season] ?? SEASON_TAGLINES.spring;

  const seasonQuests = seasonalQuestsData.filter(
    (q) => q.season === season || q.season === "any"
  );
  const featured = seasonQuests.slice(0, 3);
  const remaining = seasonQuests.slice(3);

  function toggleCard(id: string) {
    setExpandedCards((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function handleHemisphereSwitch() {
    const next = hemisphere === "northern" ? "southern" : "northern";
    setHemisphereOverride(next);
    // Force re-render by reloading; the hook will pick up the override on mount
    window.location.reload();
  }

  return (
    <section className="py-14">
      <div className="container">
        <div className="max-w-5xl mx-auto">
          {/* Gate banner for locked state */}
          {isLocked && unlocks && (
            <div className="flex items-center gap-3 bg-[#f0f7f0] border border-[#7dd87d]/30 rounded-2xl px-5 py-4 mb-6">
              <Lock className="w-5 h-5 text-emerald-400/70 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-[#1a472a] text-sm font-medium">Complete the Rites of Passage to access Seasonal Practices</p>
                <SeasonProgressRing completedSeasons={unlocks.completedSeasons} compact className="mt-2" />
              </div>
            </div>
          )}

          <div className={isLocked ? "opacity-40 grayscale pointer-events-none" : ""}>
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-2">
            <div>
              <h2
                className={`text-2xl md:text-3xl font-bold ${colors.header}`}
                style={{ fontFamily: "var(--font-display)" }}
              >
                What's alive this{" "}
                <span className={`${colors.text}`}>{capitalize(season)}</span>
              </h2>
              <p className={`text-sm mt-1 ${colors.text} opacity-80`}>
                {tagline}
              </p>
            </div>
            {/* Hemisphere toggle */}
            <p className="text-xs text-[#1a472a]/80 shrink-0">
              Detected: {capitalize(hemisphere)} hemisphere.{" "}
              {!loading && (
                <button
                  onClick={handleHemisphereSwitch}
                  className="underline hover:text-[#1a472a] transition-colors"
                >
                  Not right? Switch.
                </button>
              )}
            </p>
          </div>

          {/* Divider */}
          <div className={`h-px ${colors.bg} border-t ${colors.border} mb-8`} />

          {/* Featured cards */}
          {featured.length === 0 && (
            <p className={`${colors.text} opacity-70 text-center py-8`}>
              No seasonal quests found for this season yet.
            </p>
          )}

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5 mb-8">
            {featured.map((quest) => {
              const expanded = expandedCards.has(quest.id);
              return (
                <div
                  key={quest.id}
                  className={`${colors.bg} border ${colors.border} rounded-2xl p-5 shadow-sm flex flex-col gap-3`}
                >
                  {/* Hero image */}
                  <div className={`h-32 -mx-5 -mt-5 mb-1 overflow-hidden rounded-t-2xl ${colors.bg} flex items-center justify-center`}>
                    <img
                      src={`/quest-images/seasonal/${quest.id}.webp`}
                      alt={quest.title}
                      width={640}
                      height={480}
                      className="w-full h-full object-cover"
                      loading="lazy"
                      decoding="async"
                      onError={(e) => {
                        const img = e.currentTarget as HTMLImageElement;
                        img.style.display = 'none';
                        const parent = img.parentElement;
                        if (parent && !parent.querySelector('.img-fallback')) {
                          const fallback = document.createElement('div');
                          fallback.className = `img-fallback w-full h-full flex items-center justify-center opacity-40`;
                          const svgNS = 'http://www.w3.org/2000/svg';
                          const svg = document.createElementNS(svgNS, 'svg');
                          svg.setAttribute('width', '40');
                          svg.setAttribute('height', '40');
                          svg.setAttribute('viewBox', '0 0 24 24');
                          svg.setAttribute('fill', 'none');
                          svg.setAttribute('stroke', 'currentColor');
                          svg.setAttribute('stroke-width', '1.5');
                          svg.setAttribute('stroke-linecap', 'round');
                          svg.setAttribute('stroke-linejoin', 'round');
                          const circle = document.createElementNS(svgNS, 'path');
                          circle.setAttribute('d', 'M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2z');
                          const hand = document.createElementNS(svgNS, 'path');
                          hand.setAttribute('d', 'M12 8v4l3 3');
                          svg.appendChild(circle);
                          svg.appendChild(hand);
                          fallback.appendChild(svg);
                          parent.appendChild(fallback);
                        }
                      }}
                    />
                  </div>

                  {/* Season pill */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`text-xs font-semibold px-2 py-0.5 rounded-full ${colors.pill}`}
                    >
                      {capitalize(quest.season === "any" ? "anytime" : quest.season)}
                    </span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full border ${colors.border} ${colors.text} opacity-70`}
                    >
                      {quest.element}
                    </span>
                  </div>

                  {/* Title */}
                  <h3
                    className={`font-bold text-base leading-snug ${colors.header}`}
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    {quest.title}
                  </h3>

                  {/* Tagline */}
                  <p className={`text-sm italic ${colors.text} opacity-90`}>
                    {quest.tagline}
                  </p>

                  {/* Description */}
                  <p className={`text-sm ${colors.text} opacity-80 leading-relaxed`}>
                    {expanded
                      ? quest.description
                      : truncate(quest.description, 100)}
                  </p>

                  {/* Time estimate */}
                  <p className={`text-xs ${colors.text} opacity-60`}>
                    Time: {quest.estimatedTime}
                  </p>

                  {/* Expand button */}
                  <button
                    onClick={() => toggleCard(quest.id)}
                    className={`flex items-center gap-1 text-xs font-semibold ${colors.text} hover:opacity-100 opacity-70 transition-opacity self-start mt-auto`}
                  >
                    {expanded ? "Show less" : "Learn more"}
                    <ChevronDown
                      className={`w-3.5 h-3.5 transition-transform ${expanded ? "rotate-180" : ""}`}
                    />
                  </button>

                  {/* Expanded deliverable */}
                  {expanded && (
                    <div
                      className={`mt-1 pt-3 border-t ${colors.border} text-xs ${colors.text} opacity-75`}
                    >
                      <strong>Deliverable:</strong> {quest.deliverable}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Explore all accordion */}
          {remaining.length > 0 && (
            <div>
              <button
                onClick={() => setShowAll(!showAll)}
                className={`flex items-center gap-2 text-sm font-semibold ${colors.text} border ${colors.border} ${colors.bg} px-4 py-2 rounded-full hover:opacity-90 transition-opacity`}
              >
                <ChevronDown
                  className={`w-4 h-4 transition-transform ${showAll ? "rotate-180" : ""}`}
                />
                {showAll
                  ? "Hide remaining quests"
                  : `Explore all seasonal quests (${remaining.length} more)`}
              </button>

              {showAll && (
                <div className="mt-5 grid sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {remaining.map((quest) => (
                    <div
                      key={quest.id}
                      className={`${colors.bg} border ${colors.border} rounded-xl p-4 flex flex-col gap-1.5`}
                    >
                      <span
                        className={`text-xs font-semibold ${colors.text} opacity-60`}
                      >
                        {capitalize(quest.season === "any" ? "anytime" : quest.season)} · {quest.element}
                      </span>
                      <h4
                        className={`font-bold text-sm ${colors.header}`}
                        style={{ fontFamily: "var(--font-display)" }}
                      >
                        {quest.title}
                      </h4>
                      <p className={`text-xs ${colors.text} opacity-75 italic`}>
                        {quest.tagline}
                      </p>
                      <p className={`text-xs ${colors.text} opacity-60`}>
                        {quest.estimatedTime}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
        </div>
      </div>
    </section>
  );
}
