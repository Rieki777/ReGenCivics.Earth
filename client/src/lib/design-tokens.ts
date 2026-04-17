/**
 * ReGen Civics Design Tokens
 *
 * Single source of truth for the organic dark-forest palette, spacing, radius,
 * shadows, and typography. Every component should consume these tokens instead
 * of hard-coded hex values.
 *
 * Palette anchored in actual codebase usage (top 12 colors by count as of
 * 2026-04-17). See `DESIGN_SYSTEM.md` for rationale and migration guidance.
 */

// ============================================================================
// COLOR
// ============================================================================

/**
 * Forest: the grounded surface palette. Deep forest at the bottom, lighter
 * greens layered on top. Use these for backgrounds, cards, borders, and
 * subdued UI.
 */
export const forest = {
  deepest: "#0a1f14", // bg only, deepest shadow layer
  deep: "#0d2818",    // primary app background
  base: "#1a472a",    // primary surface (cards, nav)
  moss: "#2d5a3d",    // secondary surface, raised cards
  sage: "#4a7c59",    // borders, tertiary surface
} as const;

/**
 * Spring: the living accent. Used for primary actions, active states,
 * success signals, and the active voice of ReGen Civics.
 */
export const spring = {
  base: "#7dd87d",    // primary accent
  hover: "#9de89d",   // hover / highlight state
  soft: "#a8e6a8",    // subtle backgrounds, hover washes
} as const;

/**
 * Parchment: the warm light palette. For text on dark, light-mode surfaces,
 * and any cream backgrounds.
 */
export const parchment = {
  base: "#f0ebe3",        // primary text on forest
  soft: "#e8e4de",        // secondary text on forest
  warm: "#f8f5f0",        // warm cream
  whisper: "#f0f7f0",     // greentinted cream
} as const;

/**
 * Amber: warm accent for governance highlights, autumn season, and signals
 * that warrant warmth. Gold is reserved for high-emphasis governance marks
 * (vote counts, council decisions).
 */
export const amber = {
  tan: "#d4a574",     // warm autumn accent
  gold: "#ffd700",    // high-emphasis governance highlight
  dim: "#d4a017",     // deep gold for borders / pressed states
} as const;

/**
 * Alert: destructive / warning. Use sparingly. One red. One warning tone.
 */
export const alert = {
  red: "#ef6f6c",         // destructive actions, errors
  warnBg: "#fef3c7",      // warning toast bg
  warnFg: "#92400e",      // warning toast fg
} as const;

/**
 * Brand: reserved for third-party brand buttons. These are the only
 * off-palette colors allowed, and only on buttons that link to those
 * services.
 */
export const brand = {
  twitter: "#1da1f2",
  linkedin: "#0a66c2",
} as const;

/**
 * Season accents: the four seasons render a single accent each on calendar,
 * quest cards, and season headers. Keep these locked. Do not invent new
 * seasonal greens or tans.
 */
export const season = {
  spring: spring.base,    // #7dd87d
  summer: forest.sage,    // #4a7c59
  autumn: amber.tan,      // #d4a574
  winter: forest.deep,    // #0d2818
} as const;

/**
 * Governance chart slices: locked 4-slice palette for Fund governance
 * ("Who Holds the Vote"). Do not extend this list without a spec change.
 */
export const governanceSlices = [
  { label: "Stewardship Council", share: 40, color: forest.sage },
  { label: "Investors",           share: 20, color: spring.base },
  { label: "Land Projects",       share: 20, color: parchment.base },
  { label: "Alliance Partners",   share: 20, color: amber.gold },
] as const;

// ============================================================================
// DEPRECATED (migrate away from these)
// ============================================================================

/**
 * These hex values appear in the codebase but should be migrated to canonical
 * tokens above. Keep this list updated as migrations complete.
 *
 * Migration map lives in `FIXES_TO_MAKE_VISUAL_AUDIT.md` (color normalization
 * migration table). Do not import from here; this is documentation only.
 */
export const DEPRECATED_COLORS = {
  "#6bc86b": spring.base,    // drift green -> spring.base
  "#6cc86c": spring.base,
  "#4a9f4a": forest.sage,    // drift green -> sage
  "#2e7d32": forest.base,    // material green -> forest.base
  "#a5d6a7": spring.soft,
  "#e8f5e9": parchment.whisper,
  "#4a9f9f": amber.gold,     // alliance teal -> amber.gold (matches governanceSlices)
  "#fbbf24": amber.tan,      // tailwind amber -> amber.tan
  "#f59e0b": amber.dim,
  "#d4a017": amber.dim,
  "#f0c040": amber.gold,
  "#60a5fa": spring.base,    // blue drift -> spring.base for emphasis
  "#c084fc": spring.base,    // purple drift -> spring.base
  "#87ceeb": parchment.whisper,
  "#fef3c7": alert.warnBg,   // keep as alert.warnBg
} as const;

// ============================================================================
// SPACING (8pt grid)
// ============================================================================

export const spacing = {
  xs: "4px",     // 0.25rem
  sm: "8px",     // 0.5rem
  md: "16px",    // 1rem
  lg: "24px",    // 1.5rem
  xl: "32px",    // 2rem
  "2xl": "48px", // 3rem
  "3xl": "64px", // 4rem
  "4xl": "96px", // 6rem
} as const;

// ============================================================================
// RADIUS
// ============================================================================

export const radius = {
  sm: "8px",     // chips, inline pills
  md: "12px",    // buttons, inputs
  lg: "16px",    // cards
  xl: "24px",    // feature cards, modals
  full: "9999px" // circular
} as const;

// ============================================================================
// SHADOW (calm, layered, not heavy)
// ============================================================================

export const shadow = {
  sm: "0 1px 2px rgba(10, 31, 20, 0.12)",
  md: "0 4px 12px rgba(10, 31, 20, 0.14)",
  lg: "0 8px 32px rgba(10, 31, 20, 0.18)",
  xl: "0 16px 48px rgba(10, 31, 20, 0.22)",
  glow: "0 0 24px rgba(125, 216, 125, 0.25)", // spring.base glow for active elements
} as const;

// ============================================================================
// TYPOGRAPHY
// ============================================================================

export const typography = {
  display: "'Quicksand', sans-serif",
  body: "'Nunito', sans-serif",
  accent: "'Righteous', cursive",
  sizes: {
    xs: "0.8125rem", // 13px (mobile-safe min)
    sm: "0.9375rem", // 15px
    base: "1rem",    // 16px
    lg: "1.125rem",  // 18px
    xl: "1.25rem",   // 20px
    "2xl": "1.5rem", // 24px
    "3xl": "1.875rem",// 30px
    "4xl": "2.25rem",// 36px
    "5xl": "3rem",   // 48px
    "6xl": "3.75rem",// 60px
  },
  weight: {
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },
  leading: {
    tight: 1.2,
    snug: 1.4,
    normal: 1.6,
    relaxed: 1.75,
  },
} as const;

// ============================================================================
// Z-INDEX (matches index.css @theme)
// ============================================================================

export const z = {
  base: 0,
  raised: 10,
  sticky: 40,
  nav: 50,
  dropdown: 60,
  modal: 70,
  toast: 80,
  ring: 90,
} as const;

// ============================================================================
// CONVENIENCE RE-EXPORTS
// ============================================================================

export const colors = {
  forest,
  spring,
  parchment,
  amber,
  alert,
  brand,
  season,
} as const;

export default {
  colors,
  spacing,
  radius,
  shadow,
  typography,
  z,
} as const;
