/**
 * usePageVisitTracker - Logs page visits to localStorage for progress map tracking.
 * Runs on every route change via useLocation.
 */
import { useEffect } from "react";
import { useLocation } from "wouter";

const STORAGE_KEY = "regen-progress-map";

export function usePageVisitTracker() {
  const [location] = useLocation();

  useEffect(() => {
    if (!location) return;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const stored = raw ? JSON.parse(raw) : { completedNodes: [], visitedPages: [] };
      if (!stored.visitedPages) stored.visitedPages = [];
      const basePath = "/" + location.split("/")[1]; // normalize /quest/3 -> /quest
      if (!stored.visitedPages.includes(basePath)) {
        stored.visitedPages.push(basePath);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
      }
    } catch { /* ignore localStorage errors */ }
  }, [location]);
}
