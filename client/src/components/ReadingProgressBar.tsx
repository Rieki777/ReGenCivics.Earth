import { useEffect, useRef, useState } from "react";

/**
 * A thin bar across the top showing how far down the page you are. It
 * measures once per frame and writes straight to the bar, as a scaleX
 * transform the compositor animates; React renders only when the bar appears
 * or disappears. It used to re-render and read layout on every scroll event,
 * on about 40 pages (STEERING.md section 13).
 */
export function ReadingProgressBar() {
  const bar = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    let frame = 0;
    const measure = () => {
      frame = 0;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const progress = docHeight > 0 ? Math.min(100, (window.scrollY / docHeight) * 100) : 0;
      setShown(progress >= 1);
      const el = bar.current;
      if (el) {
        el.style.transform = `scaleX(${progress / 100})`;
        el.setAttribute("aria-valuenow", String(Math.round(progress)));
      }
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(measure);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    measure();
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div
      ref={bar}
      className={`fixed top-0 left-0 z-[100] h-0.5 w-full origin-left bg-[#7dd87d] transition-transform duration-100${shown ? "" : " hidden"}`}
      style={{ transform: "scaleX(0)" }}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label="Reading progress"
    />
  );
}
