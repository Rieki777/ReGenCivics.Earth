import { useState, useEffect } from "react";
import { useLocation } from "wouter";

const STORAGE_KEY = "regen-recent-pages";
const MAX_PAGES = 10;

export type RecentPage = { path: string; title: string; visitedAt: string };

export function useRecentPages() {
  const [location] = useLocation();
  const [pages, setPages] = useState<RecentPage[]>(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]"); }
    catch { return []; }
  });

  useEffect(() => {
    if (location === "/") return;
    const title = document.title.split("|")[0]?.trim() || location;
    setPages(prev => {
      const filtered = prev.filter(p => p.path !== location);
      const updated = [{ path: location, title, visitedAt: new Date().toISOString() }, ...filtered].slice(0, MAX_PAGES);
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(updated)); } catch {}
      return updated;
    });
  }, [location]);

  return pages;
}
