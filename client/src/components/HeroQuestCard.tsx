/**
 * HeroQuestCard - Enhanced quest card with background image.
 * Used for Fire and Food Foresting as the primary entry points.
 */
import type { ReactNode } from "react";

interface HeroQuestCardProps {
  backgroundImage: string;
  title: string;
  subtitle?: string;
  badge?: string;
  onClick?: () => void;
  /** Pulse the border to draw attention (e.g., when no quests started yet) */
  pulse?: boolean;
  children?: ReactNode;
  className?: string;
}

export function HeroQuestCard({
  backgroundImage,
  title,
  subtitle,
  badge,
  onClick,
  pulse = false,
  children,
  className = "",
}: HeroQuestCardProps) {
  return (
    <div
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === "Enter" || e.key === " ") onClick(); } : undefined}
      className={`quest-shimmer relative rounded-2xl overflow-hidden cursor-pointer group transition-all duration-300 hover:shadow-xl ${
        pulse ? "ring-2 ring-amber-400/40 animate-pulse" : ""
      } ${className}`}
      style={{ minHeight: 160 }}
    >
      {/* Background image */}
      <div
        className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-105"
        style={{ backgroundImage: `url(${backgroundImage})` }}
      />

      {/* Dark gradient overlay for text readability */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/10" />

      {/* Content */}
      <div className="relative z-10 flex flex-col justify-end h-full p-4" style={{ minHeight: 160 }}>
        {badge && (
          <span className="inline-block self-start px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-bold mb-2 border border-amber-500/30">
            {badge}
          </span>
        )}
        <h3
          className="text-white font-bold text-base leading-tight mb-0.5 drop-shadow-md"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {title}
        </h3>
        {subtitle && (
          <p className="text-white/70 text-xs drop-shadow-sm">{subtitle}</p>
        )}
        {children}
      </div>
    </div>
  );
}
