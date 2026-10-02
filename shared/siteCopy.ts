/**
 * How the site describes itself, in one place (Rye's framing, chosen 2026-09-28).
 *
 * The homepage hero, the needs section, the search and AI-assistant
 * descriptions and the crawler text read from here. Before this, index.html,
 * SEO.tsx, server/_core/vite.ts, StructuredData.tsx and the onboarding header
 * each kept their own copy, and they had already drifted into three different
 * descriptions. index.html and the llms files are static and cannot import
 * this, so server/site-copy.test.ts holds them to these strings.
 *
 * Keep the present tense true: the game runs with regenerative land projects
 * today and is built for any community that shares land or housing. HOAs and
 * refugee camps do not use it yet, so no line says they do.
 */

/** The line that types out under "ReGen Civics" on the homepage. */
export const SITE_TAGLINE =
  "In the age of AI and potential upheavals in our economy, we make games that help people meet their needs together, from refugee camps to HOAs.";

/**
 * What search engines and AI assistants read first: the meta, Open Graph and
 * Twitter descriptions, the Organization JSON-LD and the crawler text. It stays
 * under 160 characters so search results show all of it.
 */
export const SITE_DESCRIPTION =
  "An in-real-life game for regenerative land projects, built for any community that shares land or housing, from refugee camps to HOAs. A cooperative in design.";

/** The needs the games are for, in Rye's order. */
export const LOCAL_NEEDS = ["Housing", "Food", "Water", "Air", "Joy", "Meaning", "Purpose"] as const;
export type LocalNeed = (typeof LOCAL_NEEDS)[number];

/** The homepage section under the welcome video. */
export const NEEDS_SECTION = {
  heading: "Housing, food, water, air, joy, meaning, and purpose",
  body:
    "Every community needs these, and meeting them locally takes coordination. People show up for " +
    "coordination that's engaging and easy, so we make it a game: quests, roles and shared goals that " +
    "help people meet their needs together while they regenerate the land they live on. The game runs " +
    "with regenerative land projects today, and it's built for any community that shares land or housing.",
} as const;
