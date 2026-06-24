/**
 * ScrollToTop - Scrolls to top of page on route change
 * Also provides a floating "back to top" button on long pages
 */
import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { ArrowUp } from "lucide-react";

export function ScrollToTop() {
  const [location] = useLocation();
  const [showButton, setShowButton] = useState(false);

  // Scroll to top on route change, UNLESS the URL carries a hash fragment.
  // When there's a hash (e.g. /bionomics#local-food-economies), scroll to that
  // section instead of clobbering the anchor with a jump to the top. Long pages
  // mount sections asynchronously, so retry briefly until the target exists.
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
      const timer = window.setInterval(() => {
        attempts += 1;
        if (scrollToHash() || attempts >= 20) window.clearInterval(timer);
      }, 100);
      return () => window.clearInterval(timer);
    }
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [location]);

  // Show/hide floating button based on scroll position
  useEffect(() => {
    const handleScroll = () => {
      setShowButton(window.scrollY > 500);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <button
      onClick={scrollToTop}
      style={{ left: "calc(env(safe-area-inset-left, 0px) + 1rem)" }}
      className={`fixed bottom-20 left-4 z-40 w-11 h-11 rounded-full bg-[#1a472a]/80 backdrop-blur-sm border border-[#7dd87d]/40 text-[#7dd87d] shadow-lg hover:bg-[#1a472a] hover:border-[#7dd87d]/60 transition-all duration-200 flex items-center justify-center ${
        showButton
          ? "opacity-100 scale-100 translate-y-0"
          : "opacity-0 scale-75 translate-y-5 pointer-events-none"
      }`}
      aria-label="Scroll to top"
      title="Back to top"
    >
      <ArrowUp className="w-5 h-5" />
    </button>
  );
}
