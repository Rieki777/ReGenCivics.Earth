import { useState, useCallback } from "react";

const STORAGE_KEY = "regen-favorite-pages";

export type FavoritePage = { path: string; title: string; addedAt: string };

export function useFavoritePages() {
  const [favorites, setFavorites] = useState<FavoritePage[]>(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]"); }
    catch { return []; }
  });

  const toggle = useCallback((path: string, title: string) => {
    setFavorites(prev => {
      const exists = prev.some(f => f.path === path);
      const updated = exists
        ? prev.filter(f => f.path !== path)
        : [...prev, { path, title, addedAt: new Date().toISOString() }];
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(updated)); } catch {}
      return updated;
    });
  }, []);

  const isFavorite = useCallback((path: string) => favorites.some(f => f.path === path), [favorites]);

  return { favorites, toggle, isFavorite };
}
