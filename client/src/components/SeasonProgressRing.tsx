/**
 * SeasonProgressRing - Shows 4-season completion progress.
 * Used in Epic Quest section header and optionally at the top of the quest page.
 */
import type { Season } from "@/hooks/useQuestUnlocks";

const SEASONS: { id: Season; label: string; emoji: string }[] = [
  { id: "spring", label: "Spring", emoji: "🌱" },
  { id: "summer", label: "Summer", emoji: "☀️" },
  { id: "fall", label: "Fall", emoji: "🍂" },
  { id: "winter", label: "Winter", emoji: "❄️" },
];

interface SeasonProgressRingProps {
  completedSeasons: Season[];
  className?: string;
  compact?: boolean;
}

export function SeasonProgressRing({ completedSeasons, className = "", compact = false }: SeasonProgressRingProps) {
  const completed = completedSeasons.length;
  const allDone = completed === 4;

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className="flex items-center gap-1.5">
        {SEASONS.map(season => {
          const done = completedSeasons.includes(season.id);
          return (
            <div
              key={season.id}
              className="flex flex-col items-center gap-0.5"
              title={`${season.label}: ${done ? "Complete" : "Incomplete"}`}
            >
              {!compact && (
                <span className="text-xs">{season.emoji}</span>
              )}
              <div
                className={`w-3 h-3 rounded-full border-2 transition-colors ${
                  done
                    ? "bg-[#7dd87d] border-[#7dd87d]"
                    : "bg-transparent border-[#1a472a]/20"
                }`}
              />
              {!compact && (
                <span className={`text-[9px] font-medium ${done ? "text-[#7dd87d]" : "text-[#1a472a]/80"}`}>
                  {season.label}
                </span>
              )}
            </div>
          );
        })}
      </div>
      <span className={`text-xs ${allDone ? "text-[#7dd87d] font-semibold" : "text-[#1a472a]/80"}`}>
        {allDone ? "All seasons complete" : `${completed} of 4 seasons`}
      </span>
    </div>
  );
}
