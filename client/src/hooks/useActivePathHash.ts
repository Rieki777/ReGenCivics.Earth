/**
 * useActivePathHash: cross-section path filter state, synced via URL hash.
 *
 * Phase 3.2 of QUEST_PAGE_AND_PATH_PROGRESSION_SPEC.md. The portals at
 * the top of /quest tap into this; downstream sections (EpicQuestSection,
 * seasonal sections) read it to filter their content. URL hash chosen
 * over context so:
 *   - Filter state survives page reload.
 *   - Players can bookmark / share a "/quest filtered to Land Project" view.
 *   - Sections in different render trees can subscribe without prop-drilling.
 *
 * Hash format: `#path=investor` (or `player` / `land_project` / `ally`).
 * Setting null clears the hash entirely.
 */

import { useCallback, useEffect, useState } from "react";

export type PathSlug = "player" | "investor" | "land_project" | "ally";
const VALID: ReadonlySet<string> = new Set(["player", "investor", "land_project", "ally"]);

function parseHash(hash: string): PathSlug | null {
  // Strip leading '#' and split params
  const params = new URLSearchParams(hash.replace(/^#/, ""));
  const v = params.get("path");
  if (v && VALID.has(v)) return v as PathSlug;
  return null;
}

export function useActivePathHash(): [PathSlug | null, (next: PathSlug | null) => void] {
  const [active, setActive] = useState<PathSlug | null>(() => {
    if (typeof window === "undefined") return null;
    return parseHash(window.location.hash);
  });

  useEffect(() => {
    const onHashChange = () => setActive(parseHash(window.location.hash));
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  const set = useCallback((next: PathSlug | null) => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    if (next) {
      params.set("path", next);
    } else {
      params.delete("path");
    }
    const newHash = params.toString();
    // Use replaceState instead of setting location.hash so we don't
    // push history entries on every filter toggle.
    const url = `${window.location.pathname}${window.location.search}${newHash ? "#" + newHash : ""}`;
    window.history.replaceState(null, "", url);
    setActive(next);
  }, []);

  return [active, set];
}

/**
 * Map a path slug to the element it primarily resonates with. Used by
 * downstream sections to filter their content (Epic quests have an
 * element field; this hook maps the path filter to the matching
 * element so 'investor' shows water-element quests, etc).
 *
 * The mapping intentionally favors the elemental aesthetic of the
 * path portals (player=fire, investor=water, land_project=earth,
 * ally=air) so a player who taps the Investor portal sees water-themed
 * Epic quests like aquifer recharge or rainwater harvesting.
 */
export function pathToElement(path: PathSlug | null): "fire" | "water" | "earth" | "air" | null {
  switch (path) {
    case "player":
      return "fire";
    case "investor":
      return "water";
    case "land_project":
      return "earth";
    case "ally":
      return "air";
    default:
      return null;
  }
}
