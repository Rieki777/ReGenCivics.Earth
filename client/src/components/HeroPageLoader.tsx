/**
 * HeroPageLoader - Shows TaoSpinner with quotes while hero page loads.
 * Preloads background image(s) and waits for initial data before revealing content.
 * Used on the 5 hero pages: Home, Fund, Land, Ally, Play.
 */
import { useState, useEffect, useCallback, ReactNode } from "react";
import { TaoSpinner } from "./TaoSpinner";

interface HeroPageLoaderProps {
  children: ReactNode;
  /** Background image URL(s) to preload before showing content */
  images: string[];
  /** Additional loading flag (e.g. from tRPC query) */
  dataLoading?: boolean;
  /** Minimum time to show the loader in ms (prevents flash) */
  minDisplayTime?: number;
}

export function HeroPageLoader({
  children,
  images,
  dataLoading = false,
  minDisplayTime = 800,
}: HeroPageLoaderProps) {
  const [imagesReady, setImagesReady] = useState(false);
  const [minTimeElapsed, setMinTimeElapsed] = useState(false);
  const [revealed, setRevealed] = useState(false);

  // Preload all images with mounted guard to prevent React error #185
  useEffect(() => {
    if (images.length === 0) {
      setImagesReady(true);
      return;
    }

    let mounted = true;
    // Pick only the image that matches the current viewport so phones do not
    // download the full-resolution desktop hero. Callers pass [desktop, mobile]
    // in that order; we pick the last entry on narrow screens.
    const isMobile = window.matchMedia("(max-width: 767px)").matches;
    const toPreload = images.length > 1 ? (isMobile ? [images[images.length - 1]] : [images[0]]) : images;
    let loaded = 0;
    const total = toPreload.length;
    const onDone = () => {
      loaded++;
      if (loaded >= total && mounted) setImagesReady(true);
    };

    toPreload.forEach((src) => {
      const img = new window.Image();
      img.onload = onDone;
      img.onerror = onDone;
      img.src = src;
    });

    // Don't hold the quote loader hostage to slow hero images on cellular.
    // After 2.5s, consider images "ready" and let the page reveal; the hero
    // background fades in progressively underneath via PageBackground.
    const safety = setTimeout(() => { if (mounted) setImagesReady(true); }, 2500);
    return () => { mounted = false; clearTimeout(safety); };
  }, [images]);

  // Minimum display time so the spinner doesn't flash
  useEffect(() => {
    const timer = setTimeout(() => setMinTimeElapsed(true), minDisplayTime);
    return () => clearTimeout(timer);
  }, [minDisplayTime]);

  // Reveal when everything is ready
  useEffect(() => {
    if (imagesReady && minTimeElapsed && !dataLoading) {
      // Small delay for the fade transition to feel smooth
      const timer = setTimeout(() => setRevealed(true), 50);
      return () => clearTimeout(timer);
    }
  }, [imagesReady, minTimeElapsed, dataLoading]);

  // Absolute cap: the quote loader never holds longer than 3s, even if a
  // tRPC query or a hero image is still pending. Keeps the loved quote moment
  // while guaranteeing fast time-to-content on slow connections.
  useEffect(() => {
    const cap = setTimeout(() => setRevealed(true), 3000);
    return () => clearTimeout(cap);
  }, []);

  // Once revealed and fade-out complete, remove the loader from the DOM entirely
  // to free up the compositing layer on mobile Safari
  const [loaderDismissed, setLoaderDismissed] = useState(false);

  return (
    <>
      {/* Loading screen - removed from DOM after fade to free GPU layers */}
      {!loaderDismissed && (
        <div
          className={`fixed inset-0 z-[9999] bg-[#0d2818] flex items-center justify-center transition-opacity duration-700 ${
            revealed ? "opacity-0 pointer-events-none" : "opacity-100"
          }`}
          onTransitionEnd={() => {
            if (revealed) setLoaderDismissed(true);
          }}
        >
          <TaoSpinner size={72} showQuote fullPage={false} />
        </div>
      )}

      {/* Page content */}
      <div
        className={`transition-opacity duration-500 ${
          revealed ? "opacity-100" : "opacity-0"
        }`}
      >
        {children}
      </div>
    </>
  );
}
