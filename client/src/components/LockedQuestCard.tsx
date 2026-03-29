/**
 * LockedQuestCard - Greyed-out quest card with lock overlay.
 * Shows title and subtitle so players know what's ahead, but is not interactive.
 */
import { Lock } from "lucide-react";

interface LockedQuestCardProps {
  title: string;
  subtitle?: string;
  className?: string;
  children?: React.ReactNode;
}

export function LockedQuestCard({ title, subtitle, className = "", children }: LockedQuestCardProps) {
  return (
    <div
      className={`relative rounded-2xl border border-[#1a472a]/10 bg-[#f8f5f0] p-4 opacity-40 grayscale select-none ${className}`}
      aria-disabled="true"
    >
      {/* Lock icon badge */}
      <div className="absolute top-3 right-3 z-10">
        <div className="bg-emerald-400/10 rounded-full p-1.5">
          <Lock className="w-5 h-5 text-emerald-400/70" />
        </div>
      </div>

      {/* Card content (visible but dimmed) */}
      <div className="pr-10">
        <h3
          className="font-bold text-[#1a472a] text-sm leading-tight mb-1"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {title}
        </h3>
        {subtitle && (
          <p className="text-[#1a472a]/60 text-xs line-clamp-2">{subtitle}</p>
        )}
      </div>
      {children}
    </div>
  );
}
