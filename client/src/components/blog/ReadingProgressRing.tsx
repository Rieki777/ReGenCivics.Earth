/**
 * ReadingProgressRing — a circular reading-progress indicator for blog posts.
 * Sits directly below the floating Share button on mobile. The ring fills as
 * the reader scrolls; tapping it scrolls back to the top.
 */

import React from 'react';

export function ReadingProgressRing({
  progress,
  className = '',
}: {
  progress: number;
  className?: string;
}) {
  const pct = Math.min(100, Math.max(0, progress));
  const r = 20;
  const circumference = 2 * Math.PI * r;
  const offset = circumference * (1 - pct / 100);

  return (
    <button
      type="button"
      aria-label={`Reading progress ${Math.round(pct)}%. Scroll to top.`}
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      className={`relative grid h-12 w-12 place-items-center rounded-full bg-[#1a472a]/90 shadow-lg backdrop-blur-sm ring-1 ring-[#7dd87d]/25 transition-transform hover:scale-105 ${className}`}
    >
      <svg width="48" height="48" viewBox="0 0 48 48" className="-rotate-90">
        <circle cx="24" cy="24" r={r} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="4" />
        <circle
          cx="24"
          cy="24"
          r={r}
          fill="none"
          stroke="#7dd87d"
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-[stroke-dashoffset] duration-150 ease-out"
        />
      </svg>
      <span className="absolute text-[10px] font-bold tabular-nums text-white">
        {Math.round(pct)}
      </span>
    </button>
  );
}
