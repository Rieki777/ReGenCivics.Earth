/**
 * MapTransition - Dissolve transition when navigating from the map.
 * Preloads the destination route chunk, then dissolves the map away
 * with a 600ms fade+blur animation. Navigation happens at the 300ms midpoint.
 * Falls back to direct navigation after 2 seconds if the chunk hasn't loaded.
 */
import { useState, useCallback, type ReactNode } from "react";
import { useLocation } from "wouter";

const PRELOAD_TIMEOUT = 2000;
const DISSOLVE_DURATION = 600;
const NAV_MIDPOINT = 300;

// Map paths to their lazy imports (matching App.tsx route definitions)
const routeMap: Record<string, () => Promise<unknown>> = {
  "/quest": () => import("@/pages/Quest"),
  "/land": () => import("@/pages/Land"),
  "/ally": () => import("@/pages/Ally"),
  "/play": () => import("@/pages/Play"),
  "/opportunity": () => import("@/pages/Opportunity"),
  "/investor": () => import("@/pages/InvestorForm"),
  "/community": () => import("@/pages/Community"),
  "/schedule": () => import("@/pages/Schedule"),
  "/profile": () => import("@/pages/PlayerProfile"),
  "/map": () => import("@/pages/Map"),
  "/apply": () => import("@/pages/Apply"),
  "/fund": () => import("@/pages/Fund"),
  "/loi": () => import("@/pages/LOI"),
};

interface MapTransitionProps {
  targetPath: string;
  onTransitionStart?: () => void;
  children: ReactNode;
  className?: string;
}

export function MapTransition({ targetPath, onTransitionStart, children, className }: MapTransitionProps) {
  const [, navigate] = useLocation();
  const [loading, setLoading] = useState(false);

  const handleClick = useCallback(async () => {
    onTransitionStart?.();
    setLoading(true);

    // Preload the route chunk with timeout
    const preloadPromise = routeMap[targetPath]?.() ?? Promise.resolve();
    const timeoutPromise = new Promise(resolve => setTimeout(resolve, PRELOAD_TIMEOUT));
    await Promise.race([preloadPromise, timeoutPromise]);

    // Find the map overlay element and start dissolve
    const mapOverlay = document.querySelector('[data-map-overlay]');
    if (mapOverlay) {
      mapOverlay.classList.add('map-dissolve-out');

      // Navigate at midpoint (300ms) so new page renders behind the dissolving map
      setTimeout(() => {
        navigate(targetPath);
      }, NAV_MIDPOINT);

      // Clean up after full animation
      setTimeout(() => {
        mapOverlay.classList.remove('map-dissolve-out');
        setLoading(false);
      }, DISSOLVE_DURATION);
    } else {
      // No overlay found, just navigate directly
      navigate(targetPath);
      setLoading(false);
    }
  }, [targetPath, navigate, onTransitionStart]);

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className={className}
      type="button"
    >
      {children}
    </button>
  );
}
