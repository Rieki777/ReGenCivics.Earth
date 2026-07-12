/**
 * Crew-gating for treasure-map pins by data source.
 *
 * Some partner data is shared with us under a personal-use / people-we-know
 * scope (iOverlander, permission secured 2026-07-12). Those pins are visible to
 * signed-in crew ("people we know") and never sent to anonymous visitors. The
 * server enforces this at the query layer (server/routes/ship.ts `map.list` /
 * `map.get`); this module is the single source of truth for which sources are
 * crew-only, shared by the router and its tests.
 *
 * Everything stays removable in one query by `source` (ADR-35).
 */
export const CREW_ONLY_SOURCES = ["ioverlander"] as const;

export function isCrewOnlySource(source: string | null | undefined): boolean {
  return source != null && (CREW_ONLY_SOURCES as readonly string[]).includes(source);
}

/** True when a pin with this source may be shown to the given viewer. */
export function isLocationVisible(source: string | null | undefined, isAuthenticated: boolean): boolean {
  return isAuthenticated || !isCrewOnlySource(source);
}
