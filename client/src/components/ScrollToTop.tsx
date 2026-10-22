/**
 * ScrollToTop - Scrolls to top of page on route change
 * Also provides a floating "back to top" button on long pages
 */
import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { ArrowUp } from "lucide-react";

export function ScrollToTop() {
  const [location] = useLocation();
  const [showButton, setShowButton] = useState(false);

  // Scroll to top on route change, UNLESS the URL carries a hash fragment.
  // When there's a hash (e.g. /bionomics#local-food-economies), scroll to that
  // section instead of clobbering the anchor with a jump to the top. Long pages
  // mount sections asynchronously, and a lazy page (/season2) can take more
  // than two seconds to arrive on a slow phone, so retry for up to ten seconds,
  // and stop as soon as the person scrolls on their own.
  useEffect(() => {
    const hash = typeof window !== "undefined" ? window.location.hash : "";
    if (hash && hash.length > 1) {
      const id = decodeURIComponent(hash.slice(1));
      const scrollToHash = () => {
        const el = document.getElementById(id);
        if (el) {
          el.scrollIntoView({ behavior: "instant", block: "start" });
          return true;
        }
        return false;
      };
      if (scrollToHash()) return;
      let attempts = 0;
      const stop = () => {
        window.clearInterval(timer);
        window.removeEventListener("wheel", stop);
        window.removeEventListener("touchmove", stop);
        window.removeEventListener("keydown", stop);
      };
      const timer = window.setInterval(() => {
        attempts += 1;
        if (scrollToHash() || attempts >= 100) stop();
      }, 100);
      window.addEventListener("wheel", stop, { passive: true });
      window.addEventListener("touchmove", stop, { passive: true });
      window.addEventListener("keydown", stop);
      return stop;
    }
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [location]);

  // Show the button once the page has scrolled past 500px. A marker covering
  // the top 500px of the page tells us through an IntersectionObserver, so
  // scrolling runs no handler at all; reading window.scrollY in a scroll
  // handler made the browser finish its layout work inside every scroll event.
  // The marker spans the whole distance, so a jump across it (a link to an
  // anchor, the scroll to top on a new page) always flips it, even on a
  // screen shorter than 500px.
  const markerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const marker = markerRef.current;
    if (!marker || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([entry]) => {
      setShowButton(!entry.isIntersecting);
    });
    io.observe(marker);
    return () => io.disconnect();
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <>
    <div ref={markerRef} aria-hidden="true" className="pointer-events-none absolute left-0 top-0 h-[500px] w-px" />
    <button
      onClick={scrollToTop}
      style={{ left: "calc(env(safe-area-inset-left, 0px) + 1rem)" }}
      className={`tap-44 fixed bottom-20 left-4 z-40 w-11 h-11 rounded-full bg-[#1a472a]/80 backdrop-blur-sm border border-[#7dd87d]/40 text-[#7dd87d] shadow-lg hover:bg-[#1a472a] hover:border-[#7dd87d]/60 transition-all duration-200 flex items-center justify-center ${
        showButton
          ? "opacity-100 translate-y-0"
          : "opacity-0 translate-y-5 pointer-events-none"
      }`}
      aria-label="Scroll to top"
      title="Back to top"
    >
      <ArrowUp className="w-5 h-5" />
    </button>
    </>
  );
}
