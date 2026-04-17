/**
 * GratitudeSection - Profile section showing gratitude sends, received, $ReGen earned,
 * power meter, moon phase, and gratitude journal.
 */
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Heart, Send, Moon, ArrowRight, ExternalLink } from "lucide-react";
import { Link } from "wouter";

/* ─── Types ─────────────────────────────────────────────────────────── */

interface GratitudeJournalEntry {
  id: number;
  personName: string;
  personId: number;
  message: string;
  date: string;
}

interface GratitudeSectionProps {
  /** People acknowledged this cycle */
  peopleSentThisCycle: number;
  /** Effective budget for this cycle (after tier multiplier + streak) */
  effectiveBudget: number;
  /** Full-power threshold (default 10) */
  fullPowerThreshold: number;
  /** People who acknowledged you last cycle */
  peopleReceivedLastCycle: number;
  /** Lifetime: total unique people who sent you gratitude */
  lifetimePeopleReceived: number;
  /** Lifetime: total number of times you've been acknowledged */
  lifetimeTimesReceived: number;
  /** Current streak of cycles with 10+ sends */
  streakCycles: number;
  /** Accumulated $ReGen earned from gratitude (internal, not on-chain) */
  regenEarnedFromGratitude: number;
  /** Claim threshold */
  claimThreshold: number;
  /** Days remaining in current cycle */
  daysRemainingInCycle: number;
  /** Moon phase: 0-1 where 0 = new moon, 0.5 = full moon */
  moonPhase: number;
  /** Journal: gratitude you've sent this cycle */
  journalSent: GratitudeJournalEntry[];
  /** Journal: gratitude you've received this cycle */
  journalReceived: GratitudeJournalEntry[];
}

/* ─── Power Meter ───────────────────────────────────────────────────── */

function PowerMeter({
  sent,
  threshold,
}: {
  sent: number;
  threshold: number;
}) {
  const fullPowerRemaining = Math.max(0, threshold - sent);
  const ratio = Math.min(sent / 20, 1); // scale to 20 max display

  // Color zones
  const getColor = () => {
    if (sent <= threshold) return "#7dd87d"; // green: full power
    if (sent <= 20) return "#ffd700"; // yellow: diluting
    return "#a0a0a0"; // grey: spread thin
  };

  return (
    <div className="mt-3 space-y-1.5">
      {/* Bar */}
      <div className="relative h-3 bg-white/10 rounded-full overflow-hidden">
        <div
          className="absolute inset-y-0 left-0 rounded-full transition-all duration-500"
          style={{
            width: `${Math.min(ratio * 100, 100)}%`,
            backgroundColor: getColor(),
            opacity: 0.8,
          }}
        />
        {/* Markers at 5 and 10 */}
        <div
          className="absolute top-0 bottom-0 w-px bg-white/30"
          style={{ left: `${(5 / 20) * 100}%` }}
        />
        <div
          className="absolute top-0 bottom-0 w-px bg-white/50"
          style={{ left: `${(threshold / 20) * 100}%` }}
        />
      </div>
      {/* Labels */}
      <div className="flex justify-between text-[10px] text-white/65">
        <span>0</span>
        <span style={{ position: "relative", left: "-15%" }}>5</span>
        <span style={{ position: "relative", left: "-5%" }}>10</span>
        <span>20+</span>
      </div>
      <p className="text-xs text-white/60 text-center">
        {fullPowerRemaining > 0 ? (
          <>
            <span className="text-[#7dd87d] font-semibold">
              {fullPowerRemaining} of {threshold}
            </span>{" "}
            full-power sends remaining
          </>
        ) : (
          <span className="text-[#ffd700]">
            Spreading across {sent} people (diluting)
          </span>
        )}
      </p>
    </div>
  );
}

/* ─── Progress Ring ──────────────────────────────────────────────────── */

function ProgressRing({
  value,
  max,
  size = 80,
  strokeWidth = 6,
}: {
  value: number;
  max: number;
  size?: number;
  strokeWidth?: number;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(value / max, 1);
  const offset = circumference * (1 - progress);
  const isComplete = value >= max;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.1)"
          strokeWidth={strokeWidth}
        />
        {/* Progress arc */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={isComplete ? "#d4a017" : "#7dd87d"}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-700"
        />
      </svg>
      {/* Center text */}
      <div className="absolute inset-0 flex items-center justify-center">
        <span
          className="text-lg font-bold"
          style={{
            color: isComplete ? "#d4a017" : "#ffffff",
            fontFamily: "var(--font-display)",
          }}
        >
          {Math.round(value)}
        </span>
      </div>
    </div>
  );
}

/* ─── Moon Phase Icon ────────────────────────────────────────────────── */

function MoonPhaseIcon({
  phase,
  size = 20,
}: {
  phase: number;
  size?: number;
}) {
  // Simple crescent representation
  // phase 0 = new (dark), 0.25 = first quarter, 0.5 = full, 0.75 = last quarter
  const illumination = Math.abs(Math.cos(phase * 2 * Math.PI)) * 0.5 + 0.5;

  return (
    <div
      className="rounded-full border border-white/20 relative overflow-hidden"
      style={{ width: size, height: size }}
    >
      <div
        className="absolute inset-0 rounded-full"
        style={{
          background: `radial-gradient(circle at ${phase < 0.5 ? "60%" : "40%"} 50%, rgba(250,248,243,${illumination}) 0%, rgba(250,248,243,0.05) 100%)`,
        }}
      />
    </div>
  );
}

/* ─── Main Component ─────────────────────────────────────────────────── */

export function GratitudeSection({
  peopleSentThisCycle,
  effectiveBudget,
  fullPowerThreshold,
  peopleReceivedLastCycle,
  lifetimePeopleReceived,
  lifetimeTimesReceived,
  streakCycles,
  regenEarnedFromGratitude,
  claimThreshold,
  daysRemainingInCycle,
  moonPhase,
  journalSent,
  journalReceived,
}: GratitudeSectionProps) {
  const perPerson =
    peopleSentThisCycle > 0
      ? Math.round(effectiveBudget / peopleSentThisCycle)
      : effectiveBudget;

  return (
    <div className="space-y-4">
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <h3
          className="text-lg font-bold text-white flex items-center gap-2"
          style={{ fontFamily: "var(--font-display)" }}
        >
          <Heart className="w-5 h-5 text-[#d4a017]" />
          Gratitude
        </h3>
        <div className="flex items-center gap-2 text-xs text-white/50">
          <MoonPhaseIcon phase={moonPhase} size={16} />
          <span>
            {daysRemainingInCycle <= 3
              ? `Cycle ends in ${daysRemainingInCycle}d`
              : `${daysRemainingInCycle}d left`}
          </span>
        </div>
      </div>

      {/* Three stat boxes */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Box 1: Gratitude Sends */}
        <Card className="bg-white/10 border border-white/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Send className="w-4 h-4 text-[#7dd87d]" />
              <span className="text-xs text-white/60 uppercase tracking-wider">
                Sends
              </span>
            </div>
            <p className="text-2xl font-bold text-white">
              {peopleSentThisCycle}
            </p>
            <p className="text-xs text-white/50 mt-1">
              people this cycle ({perPerson} each)
            </p>
            {streakCycles > 0 && (
              <p className="text-xs text-[#d4a017] mt-1">
                {streakCycles} cycle streak (+{Math.min(streakCycles * 3, 30)}%)
              </p>
            )}
            <PowerMeter
              sent={peopleSentThisCycle}
              threshold={fullPowerThreshold}
            />
            {/* CTA */}
            <Link href="/community">
              <Button
                variant="ghost"
                size="sm"
                className="w-full mt-3 text-[#7dd87d] hover:text-white hover:bg-[#7dd87d]/10 text-xs"
              >
                Go Express some Gratitude
                <ArrowRight className="w-3 h-3 ml-1" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Box 2: Gratitude Received */}
        <Card className="bg-white/10 border border-white/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Heart className="w-4 h-4 text-[#d4a017]" />
              <span className="text-xs text-white/60 uppercase tracking-wider">
                Received
              </span>
            </div>
            <p className="text-2xl font-bold text-white">
              {peopleReceivedLastCycle}
            </p>
            <p className="text-xs text-white/50 mt-1">
              people last cycle
            </p>
            <p className="text-xs text-white/65 mt-2">
              Lifetime: {lifetimePeopleReceived} people, {lifetimeTimesReceived}{" "}
              times
            </p>
          </CardContent>
        </Card>

        {/* Box 3: $ReGen Earned from Gratitude */}
        <Card className="bg-white/10 border border-white/20">
          <CardContent className="p-4 flex flex-col items-center">
            <div className="flex items-center gap-2 mb-2 self-start">
              <Moon className="w-4 h-4 text-purple-400" />
              <span className="text-xs text-white/60 uppercase tracking-wider">
                $ReGen Earned
              </span>
            </div>
            <ProgressRing
              value={regenEarnedFromGratitude}
              max={claimThreshold}
              size={72}
              strokeWidth={5}
            />
            <p className="text-xs text-white/50 mt-2 text-center">
              {regenEarnedFromGratitude >= claimThreshold ? (
                <a
                  href="https://app.hypha.earth"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#d4a017] hover:underline inline-flex items-center gap-1"
                >
                  Claim on Hypha
                  <ExternalLink className="w-3 h-3" />
                </a>
              ) : (
                <>
                  {claimThreshold - regenEarnedFromGratitude} more to claim
                </>
              )}
            </p>
            <p className="text-[10px] text-white/55 mt-1 text-center leading-tight">
              Reach {claimThreshold} to make a formal claim. This reduces
              governance burden until we automate.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Gratitude Journal */}
      {(journalReceived.length > 0 || journalSent.length > 0) && (
        <Card className="bg-white/5 border border-white/10">
          <CardContent className="p-4">
            <h4
              className="text-sm font-bold text-white/80 mb-3"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Gratitude Journal
            </h4>
            <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
              {/* Received entries first */}
              {journalReceived.map((entry) => (
                <div
                  key={`r-${entry.id}`}
                  className="flex gap-3 text-sm border-l-2 border-[#d4a017]/40 pl-3"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-white/70 leading-relaxed">
                      "{entry.message}"
                    </p>
                    <p className="text-xs text-white/65 mt-0.5">
                      from{" "}
                      <Link
                        href={`/profile/${entry.personId}`}
                        className="text-[#7dd87d] hover:underline"
                      >
                        {entry.personName}
                      </Link>{" "}
                      &middot; {entry.date}
                    </p>
                  </div>
                </div>
              ))}
              {/* Sent entries */}
              {journalSent.map((entry) => (
                <div
                  key={`s-${entry.id}`}
                  className="flex gap-3 text-sm border-l-2 border-[#7dd87d]/30 pl-3"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-white/60 leading-relaxed">
                      "{entry.message}"
                    </p>
                    <p className="text-xs text-white/65 mt-0.5">
                      to{" "}
                      <Link
                        href={`/profile/${entry.personId}`}
                        className="text-[#7dd87d] hover:underline"
                      >
                        {entry.personName}
                      </Link>{" "}
                      &middot; {entry.date}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
