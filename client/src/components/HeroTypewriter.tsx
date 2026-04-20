/**
 * HeroTypewriter: reveals a multi-segment sentence character-by-character
 * over a fixed total duration. Each segment carries its own className so
 * keywords can keep color accents while the whole sentence types through
 * in sequence. Honors prefers-reduced-motion by rendering the full text
 * immediately. Uses requestAnimationFrame so reveal timing stays smooth.
 */
import { useEffect, useState } from "react";

export type HeroSegment = {
  text: string;
  /** Tailwind or raw className applied to this segment's span. */
  className?: string;
};

type Props = {
  segments: HeroSegment[];
  /** Total duration of the reveal in ms. Default 2800ms. */
  durationMs?: number;
  /** Delay before the reveal starts, in ms. Default 250ms. */
  startDelayMs?: number;
  /** Class applied to the outer wrapper. */
  className?: string;
  /** Inline style applied to the outer wrapper. */
  style?: React.CSSProperties;
  /** Show a blinking caret while typing and briefly after. Default true. */
  showCaret?: boolean;
};

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function HeroTypewriter({
  segments,
  durationMs = 2800,
  startDelayMs = 250,
  className,
  style,
  showCaret = true,
}: Props) {
  const totalChars = segments.reduce((sum, s) => sum + s.text.length, 0);
  const [charCount, setCharCount] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (prefersReducedMotion()) {
      setCharCount(totalChars);
      setDone(true);
      return;
    }
    let raf = 0;
    let start = 0;

    const step = (ts: number) => {
      if (!start) start = ts;
      const elapsed = ts - start - startDelayMs;
      if (elapsed < 0) {
        raf = requestAnimationFrame(step);
        return;
      }
      const progress = Math.min(1, elapsed / durationMs);
      const target = Math.floor(progress * totalChars);
      setCharCount(target);
      if (progress < 1) {
        raf = requestAnimationFrame(step);
      } else {
        setDone(true);
      }
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [durationMs, startDelayMs, totalChars]);

  // Walk segments, emitting only the portion revealed so far.
  const revealed: React.ReactNode[] = [];
  let cursor = 0;
  for (let i = 0; i < segments.length; i += 1) {
    const seg = segments[i];
    const segStart = cursor;
    cursor += seg.text.length;
    if (charCount <= segStart) break;
    const take = Math.max(0, Math.min(seg.text.length, charCount - segStart));
    revealed.push(
      <span key={i} className={seg.className}>
        {seg.text.slice(0, take)}
      </span>
    );
  }

  const showingCaret = showCaret && !done;
  const fullLabel = segments.map((s) => s.text).join("");

  return (
    <span className={className} style={style} aria-label={fullLabel}>
      {revealed}
      {showingCaret && (
        <span aria-hidden="true" className="typewriter-caret">
          |
        </span>
      )}
    </span>
  );
}
