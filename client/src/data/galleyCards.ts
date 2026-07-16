/**
 * The Galley cookbook cards, for the client (cookbook grid + remixer).
 * Canonical data lives in shared/galleyCards.ts so the server remix engine and
 * this UI read the exact same cards. This file re-exports it for the @/ alias.
 */
export type { GalleyTrack, GalleyCategory, GalleyCard } from "@shared/galleyCards";
export { GALLEY_CARDS, INGREDIENT_ALIASES, SEASONAL_STAPLES } from "@shared/galleyCards";
