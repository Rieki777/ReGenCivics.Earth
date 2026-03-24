/**
 * useNavVisits - Track page visits for the Smart Bottom Nav
 * Stores visit counts in localStorage keyed by route path.
 * Listens to Wouter route changes and increments on each navigation.
 */

import { useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";

const STORAGE_KEY = "regen_nav_visits";

interface VisitData {
  counts: Record<string, number>;
  total: number;
}

function loadVisits(): VisitData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        counts: parsed.counts || {},
        total: parsed.total || 0,
      };
    }
  } catch { /* corrupted data */ }
  return { counts: {}, total: 0 };
}

function saveVisits(data: VisitData) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch { /* storage full */ }
}

export function useNavVisits() {
  const [location] = useLocation();
  const [visits, setVisits] = useState<VisitData>(loadVisits);

  // Track visit on route change
  useEffect(() => {
    // Normalize path: strip trailing slash, query params
    const path = location.split("?")[0].replace(/\/$/, "") || "/";

    setVisits((prev) => {
      const next: VisitData = {
        counts: { ...prev.counts, [path]: (prev.counts[path] || 0) + 1 },
        total: prev.total + 1,
      };
      saveVisits(next);
      return next;
    });
  }, [location]);

  const resetVisits = useCallback(() => {
    const empty: VisitData = { counts: {}, total: 0 };
    saveVisits(empty);
    setVisits(empty);
  }, []);

  return {
    counts: visits.counts,
    totalVisits: visits.total,
    resetVisits,
  };
}
