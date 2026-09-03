/**
 * AnimationLayer
 *
 * Mounts the page-wide pieces of the complex animation layer:
 *   - sets <html data-season="..."> for the seasonal backdrop
 *   - kicks off the ink-reveal IntersectionObserver
 *   - kicks off the blur-up image loader
 *   - renders the scroll progress ring
 *   - renders the ambient leaf drift layer
 *
 * All of these are no-ops when prefers-reduced-motion is set.
 * The component renders only minimal DOM and never blocks layout.
 */

import { useEffect } from "react";
import {
  useSeasonalTheme,
  useInkReveal,
  useBlurUp,
  useScrollProgress,
  useGlobalMagnetic,
  useGlobalRipple,
} from "@/hooks/useAnimationLayer";

function ScrollProgressRing() {
  const progress = useScrollProgress();
  const hidden = progress < 0.02 || progress > 0.995;
  return (
    <div
      aria-hidden="true"
      className={`scroll-progress-ring ${hidden ? "is-hidden" : ""}`}
      style={{ ["--progress" as string]: String(progress) }}
    />
  );
}

export function AnimationLayer() {
  useSeasonalTheme();
  useInkReveal();
  useBlurUp();
  useGlobalMagnetic();
  useGlobalRipple();

  // Re-run blur-up on route changes. Ink reveal handles late-mounted elements
  // itself via the MutationObserver in useInkReveal, so it is not repeated
  // here; a per-navigation IntersectionObserver was also never disconnected.
  useEffect(() => {
    const onRouteChange = () => {
      window.setTimeout(() => {
        // Re-flip blur-up images that have loaded
        const imgs = document.querySelectorAll<HTMLImageElement>("img.blur-up:not(.blur-up-loaded)");
        imgs.forEach((img) => {
          if (img.complete && img.naturalWidth > 0) img.classList.add("blur-up-loaded");
        });
      }, 120);
    };
    // Catch both back/forward and React Router pushState navigations
    const origPush = history.pushState.bind(history);
    const origReplace = history.replaceState.bind(history);
    history.pushState = function (...args: Parameters<typeof history.pushState>) {
      origPush(...args);
      onRouteChange();
    };
    history.replaceState = function (...args: Parameters<typeof history.replaceState>) {
      origReplace(...args);
      onRouteChange();
    };
    window.addEventListener("popstate", onRouteChange);
    return () => {
      window.removeEventListener("popstate", onRouteChange);
      history.pushState = origPush;
      history.replaceState = origReplace;
    };
  }, []);

  return (
    <ScrollProgressRing />
  );
}
