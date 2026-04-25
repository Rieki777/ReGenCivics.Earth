/**
 * ViewportTriggeredVideo — autoplay-when-visible <video>. Uses
 * IntersectionObserver to start playback only after the element crosses the
 * trigger threshold, and pause + reset when it leaves the viewport. Solves
 * the "video already mid-way by the time the user scrolls to it" problem
 * Rye flagged on 2026-04-24.
 *
 * The element is muted + playsInline so iOS Safari and Chrome auto-allow
 * the play() call without a user gesture. Looping is configurable.
 */

import { useEffect, useRef, type CSSProperties } from "react";

export interface ViewportTriggeredVideoProps {
  src: string;
  /** Resolved alt-style label for accessibility tools that surface video. */
  ariaLabel?: string;
  /** className applied to the <video> element. */
  className?: string;
  style?: CSSProperties;
  /** Loop the video. Default: true. */
  loop?: boolean;
  /**
   * 0..1 — how much of the element must be visible before playback starts.
   * Default 0.5 (50%) per the fixes spec.
   */
  threshold?: number;
  /**
   * When true, reset currentTime to 0 each time the element leaves the
   * viewport so the user always sees the start when scrolling back. Default: true.
   */
  resetOnExit?: boolean;
}

export function ViewportTriggeredVideo({
  src,
  ariaLabel,
  className,
  style,
  loop = true,
  threshold = 0.5,
  resetOnExit = true,
}: ViewportTriggeredVideoProps) {
  const ref = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      // Older browsers: just play and let it loop. Better than silence.
      el.play().catch(() => { /* ignored */ });
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            el.play().catch(() => { /* user gesture not required for muted */ });
          } else {
            el.pause();
            if (resetOnExit) {
              try { el.currentTime = 0; } catch { /* ignored */ }
            }
          }
        }
      },
      { threshold }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold, resetOnExit]);

  return (
    <video
      ref={ref}
      src={src}
      muted
      playsInline
      loop={loop}
      preload="metadata"
      aria-label={ariaLabel}
      className={className}
      style={style}
    />
  );
}
