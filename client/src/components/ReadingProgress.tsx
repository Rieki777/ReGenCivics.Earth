/**
 * ReadingProgress - Thin progress bar at top of page showing scroll progress
 * Applied to long-form content pages (BlogPost, Opportunity, Fund, etc.)
 * Pure CSS + scroll listener — no animation library.
 */
import { useEffect, useRef } from "react";

export function ReadingProgress() {
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const update = () => {
      const { scrollTop, scrollHeight, clientHeight } = document.documentElement;
      const progress = scrollHeight === clientHeight ? 1 : scrollTop / (scrollHeight - clientHeight);
      if (barRef.current) {
        barRef.current.style.transform = `scaleX(${Math.min(1, Math.max(0, progress))})`;
      }
    };
    window.addEventListener("scroll", update, { passive: true });
    update();
    return () => window.removeEventListener("scroll", update);
  }, []);

  return (
    <div
      ref={barRef}
      className="fixed top-0 left-0 right-0 h-[3px] bg-[#7dd87d] origin-left z-[100]"
      style={{ transform: "scaleX(0)", transition: "transform 80ms linear" }}
    />
  );
}

export default ReadingProgress;
