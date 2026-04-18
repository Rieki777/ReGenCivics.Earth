/**
 * PageWrapper. Wraps page content with a mount-fade transition to prevent
 * flash-of-unstyled-content (FOUC) during hydration.
 * Also serves as a natural slot for per-page Suspense boundaries.
 */
import { useState, useEffect, ReactNode } from "react";
import { cn } from "@/lib/utils";
import { ReadingProgressBar } from "./ReadingProgressBar";
import { shouldShowConfetti, currentSeasonFromDate } from "@/lib/seasonalConfetti";

const SEASON_COLORS: Record<string, string[]> = {
  spring: ["#7dd87d", "#4a7c59", "#9de89d"],
  summer: ["#ffd700", "#d4a574", "#7dd87d"],
  autumn: ["#d4a574", "#8b6914", "#ffd700"],
  winter: ["#f0ebe3", "#4a7c59", "#7dd87d"],
};

function SeasonalConfettiOverlay() {
  const season = currentSeasonFromDate();
  const colors = SEASON_COLORS[season] ?? SEASON_COLORS.spring;
  const particles = Array.from({ length: 20 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    color: colors[i % colors.length],
    delay: Math.random() * 0.8,
    size: 4 + Math.random() * 4,
  }));
  return (
    <div className="fixed inset-0 pointer-events-none z-[200]" aria-hidden="true">
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute rounded-full"
          style={{
            left: `${p.x}%`,
            top: "-5%",
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
            animation: `confetti-fall 2.5s ease-in ${p.delay}s forwards`,
          }}
        />
      ))}
    </div>
  );
}

interface PageWrapperProps {
  children: ReactNode;
  className?: string;
}

export function PageWrapper({ children, className }: PageWrapperProps) {
  const [mounted, setMounted] = useState(false);

  const [confetti, setConfetti] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Restore high-contrast mode from localStorage
    const mode = localStorage.getItem("rc-contrast-mode");
    if (mode === "high") document.documentElement.dataset.contrast = "high";
    // Seasonal confetti on transition days
    if (shouldShowConfetti()) {
      setConfetti(true);
      setTimeout(() => setConfetti(false), 3000);
    }
  }, []);

  return (
    <>
      <ReadingProgressBar />
      <div id="live-announcer" aria-live="polite" role="status" className="sr-only" />
      {confetti && <SeasonalConfettiOverlay />}
      <div
        className={cn(
          "transition-opacity duration-150",
          mounted ? "opacity-100" : "opacity-0",
          className
        )}
      >
        {children}
      </div>
    </>
  );
}
