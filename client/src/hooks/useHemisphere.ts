/**
 * useHemisphere, detects northern/southern hemisphere via IP geolocation
 * and derives the current season for the user's location.
 * Caches result in sessionStorage so it only runs once per session.
 */

import { useState, useEffect } from "react";

export type Hemisphere = "northern" | "southern";
export type Season = "spring" | "summer" | "fall" | "winter";

interface HemisphereResult {
  hemisphere: Hemisphere;
  currentSeason: Season;
  loading: boolean;
}

const SESSION_KEY = "regen_hemisphere";
const OVERRIDE_KEY = "regen_hemisphere_override";

function deriveSeasonFromHemisphere(hemisphere: Hemisphere, month: number): Season {
  // month is 0-indexed (January = 0)
  const northernSeason = (): Season => {
    if (month >= 2 && month <= 4) return "spring";
    if (month >= 5 && month <= 7) return "summer";
    if (month >= 8 && month <= 10) return "fall";
    return "winter";
  };
  const southernSeason = (): Season => {
    if (month >= 2 && month <= 4) return "fall";
    if (month >= 5 && month <= 7) return "winter";
    if (month >= 8 && month <= 10) return "spring";
    return "summer";
  };
  return hemisphere === "northern" ? northernSeason() : southernSeason();
}

export function useHemisphere(): HemisphereResult {
  const [state, setState] = useState<HemisphereResult>({
    hemisphere: "northern",
    currentSeason: "spring",
    loading: true,
  });

  useEffect(() => {
    const month = new Date().getMonth();

    // Check for manual override first
    const override = sessionStorage.getItem(OVERRIDE_KEY) as Hemisphere | null;
    if (override) {
      setState({
        hemisphere: override,
        currentSeason: deriveSeasonFromHemisphere(override, month),
        loading: false,
      });
      return;
    }

    // Check session cache
    const cached = sessionStorage.getItem(SESSION_KEY) as Hemisphere | null;
    if (cached) {
      setState({
        hemisphere: cached,
        currentSeason: deriveSeasonFromHemisphere(cached, month),
        loading: false,
      });
      return;
    }

    // Fetch from ipapi.co
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000);

    fetch("https://ipapi.co/json/", { signal: controller.signal })
      .then(res => res.json())
      .then((data: { latitude?: number }) => {
        clearTimeout(timeout);
        const hemisphere: Hemisphere = (data.latitude ?? 1) >= 0 ? "northern" : "southern";
        sessionStorage.setItem(SESSION_KEY, hemisphere);
        setState({
          hemisphere,
          currentSeason: deriveSeasonFromHemisphere(hemisphere, month),
          loading: false,
        });
      })
      .catch(() => {
        clearTimeout(timeout);
        // Default to northern on failure
        sessionStorage.setItem(SESSION_KEY, "northern");
        setState({
          hemisphere: "northern",
          currentSeason: deriveSeasonFromHemisphere("northern", month),
          loading: false,
        });
      });

    return () => controller.abort();
  }, []);

  return state;
}

/** Toggle hemisphere override in sessionStorage and reload hook state */
export function setHemisphereOverride(hemisphere: Hemisphere) {
  sessionStorage.setItem(OVERRIDE_KEY, hemisphere);
  sessionStorage.setItem(SESSION_KEY, hemisphere);
}
