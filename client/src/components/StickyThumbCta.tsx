/**
 * StickyThumbCta — mobile-only thumb-zone CTA that pins itself to the
 * bottom of the viewport once the user has scrolled past the hero. Hides
 * on desktop (md and up) where the page already has plenty of CTAs.
 * Respects iOS safe-area insets so it never overlaps the home-indicator.
 *
 * Fires analytics.ctaClick with the supplied `where` id so we can track
 * which sticky paths convert. Page-level usage: drop this once near the
 * bottom of the page tree; it is fixed-positioned and self-contained.
 */
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "wouter";
import { analytics } from "@/lib/analytics";

export interface StickyThumbCtaProps {
  /** Internal route to navigate to. */
  href: string;
  /** Button label. Keep it short — this is a thumb-zone tap target. */
  label: string;
  /** Analytics id, e.g. "fund_sticky_cta". */
  where: string;
  /** Page id for analytics, e.g. "/fund". */
  page?: string;
  /** Tone of the button. Default forest-green. */
  tone?: "forest" | "amber";
  /** Pixels of scroll before the CTA appears. Default 400. */
  revealAfter?: number;
}

export function StickyThumbCta({
  href,
  label,
  where,
  page,
  tone = "forest",
  revealAfter = 400,
}: StickyThumbCtaProps) {
  const [visible, setVisible] = useState(false);

  // Appear once the page has scrolled past `revealAfter`. A marker at that
  // depth tells us through an IntersectionObserver, so scrolling runs no
  // handler; reading window.scrollY in a scroll handler made the browser
  // finish its layout work inside every scroll event.
  const markerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const marker = markerRef.current;
    if (!marker || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([entry]) => {
      setVisible(!entry.isIntersecting && entry.boundingClientRect.top < 0);
    });
    io.observe(marker);
    return () => io.disconnect();
  }, [revealAfter]);

  const toneClass =
    tone === "amber"
      ? "bg-[#f5b942] text-[#1a472a] hover:bg-[#ffc857]"
      : "bg-[#7dd87d] text-[#1a472a] hover:bg-[#9de89d]";

  return (
    <>
    {/* On <body>, so `top` counts from the top of the page whatever wraps this. */}
    {typeof document !== "undefined"
      ? createPortal(<div ref={markerRef} aria-hidden="true" className="pointer-events-none absolute left-0 h-px w-px" style={{ top: revealAfter }} />, document.body)
      : null}
    <div
      className={`md:hidden fixed left-0 right-0 z-40 px-4 transition-all duration-300 ${
        visible ? "opacity-100 translate-y-0 pointer-events-auto" : "opacity-0 translate-y-4 pointer-events-none"
      }`}
      style={{ bottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
      aria-hidden={!visible}
    >
      <Link
        href={href}
        onClick={() => analytics.ctaClick(where, page)}
        className={`block w-full text-center font-bold rounded-full px-6 py-4 min-h-[52px] shadow-2xl ${toneClass}`}
      >
        {label}
      </Link>
    </div>
    </>
  );
}

export default StickyThumbCta;
