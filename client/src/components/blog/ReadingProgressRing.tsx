/**
 * ReadingProgressRing — a circular reading-progress indicator for blog posts.
 * Sits directly below the floating Share button on mobile. The ring fills as
 * the reader scrolls; tapping it scrolls back to the top.
 *
 * The page hands it progress through `ref.current.setProgress` once a frame,
 * and the ring writes that straight to its DOM, so scrolling never re-renders it.
 */

import React, { useImperativeHandle, useRef } from 'react';

const RADIUS = 20;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

const label = (pct: number) => `Reading progress ${pct}%. Scroll to top.`;

export interface ReadingProgressRingHandle {
  /** Reading progress, 0 to 100. */
  setProgress: (progress: number) => void;
}

export function ReadingProgressRing({
  ref,
  className = '',
}: {
  ref?: React.Ref<ReadingProgressRingHandle>;
  className?: string;
}) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const arcRef = useRef<SVGCircleElement>(null);
  const numberRef = useRef<HTMLSpanElement>(null);
  const shownRef = useRef(0);

  useImperativeHandle(ref, () => ({
    setProgress(progress: number) {
      const pct = Math.min(100, Math.max(0, progress));
      arcRef.current?.setAttribute('stroke-dashoffset', `${CIRCUMFERENCE * (1 - pct / 100)}`);
      const rounded = Math.round(pct);
      if (rounded === shownRef.current) return;
      shownRef.current = rounded;
      if (numberRef.current) numberRef.current.textContent = `${rounded}`;
      buttonRef.current?.setAttribute('aria-label', label(rounded));
    },
  }), []);

  return (
    <button
      ref={buttonRef}
      type="button"
      aria-label={label(0)}
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      className={`relative grid h-12 w-12 place-items-center rounded-full bg-[#1a472a]/90 shadow-lg backdrop-blur-sm ring-1 ring-[#7dd87d]/25 transition-transform hover:scale-105 ${className}`}
    >
      <svg width="48" height="48" viewBox="0 0 48 48" className="-rotate-90">
        <circle cx="24" cy="24" r={RADIUS} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="4" />
        <circle
          ref={arcRef}
          cx="24"
          cy="24"
          r={RADIUS}
          fill="none"
          stroke="#7dd87d"
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={CIRCUMFERENCE}
          className="transition-[stroke-dashoffset] duration-150 ease-out"
        />
      </svg>
      <span ref={numberRef} className="absolute text-[10px] font-bold tabular-nums text-white">
        0
      </span>
    </button>
  );
}
