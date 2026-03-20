/**
 * ReadingProgress - Thin progress bar at top of page showing scroll progress
 * Applied to long-form content pages (BlogPost, Opportunity, Fund, etc.)
 * Pure CSS + throttled scroll listener via useThrottledScroll.
 */
import { useRef, useCallback } from "react";
import { useThrottledScroll } from "@/hooks/useThrottledScroll";

export function ReadingProgress() {
  const barRef = useRef<HTMLDivElement>(null);

  const update = useCallback(() => {
    const { scrollTop, scrollHeight, clientHeight } = document.documentElement;
    const progress = scrollHeight === clientHeight ? 1 : scrollTop / (scrollHeight - clientHeight);
    if (barRef.current) {
      barRef.current.style.transform = `scaleX(${Math.min(1, Math.max(0, progress))})`;
    }
  }, []);

  useThrottledScroll(update);

  return (
    <div
      ref={barRef}
      className="fixed top-0 left-0 right-0 origin-left z-[100]"
      style={{
        height: '3px',
        background: '#ffd700',
        boxShadow: '0 0 6px rgba(255,215,0,0.5)',
        transform: 'scaleX(0)',
        transition: 'transform 80ms linear',
      }}
    />
  );
}

export default ReadingProgress;
