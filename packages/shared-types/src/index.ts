/**
 * Cross-app type definitions for ReGen Civics.
 *
 * Single source of truth for types that both `apps/web` (the main site)
 * and `apps/gov` (the Loomio bridge Next.js app) need to talk about
 * the same shape of data. New types are added here when both apps
 * touch them; types unique to one app stay local to that app.
 *
 * Naming: prefer types that describe an over-the-wire payload (the
 * shape that crosses an API boundary), not the full Drizzle row. The
 * web app's server-side code can keep importing from `drizzle/schema`
 * directly.
 */

export type CitizenshipTier = 'explorer' | 'pollinator' | 'co-creator' | 'steward';

export type ContributionTier =
  | 'Seedling'
  | 'Sprout'
  | 'Sapling'
  | 'Grower'
  | 'Cultivator'
  | 'Elder'
  | 'Guardian';

/**
 * Public-facing user summary. Anything here is safe to render in lists
 * and forum threads without leaking PII.
 */
export interface PublicUser {
  id: number;
  name: string;
  handle: string | null;
  avatarUrl: string | null;
  citizenshipTier: CitizenshipTier;
  contributionTier: ContributionTier;
}

/**
 * Land project summary as it appears in lists, the map, and bridge UIs.
 * Mirrors the union of fields apps/web and apps/gov both consume.
 */
export interface LandProjectSummary {
  id: number;
  slug: string;
  name: string;
  shortDescription: string | null;
  bioregionId: number | null;
  status: 'draft' | 'active' | 'paused' | 'archived';
  heroImageUrl: string | null;
}

/**
 * Bioregion record shared across map + project listings.
 */
export interface BioregionSummary {
  id: number;
  name: string;
  slug: string;
  centerLat: number | null;
  centerLng: number | null;
}

/**
 * Common shape returned by paginated list endpoints. Cursor is opaque
 * to the client; just pass it back as-is on the next request.
 */
export interface CursorPage<T> {
  items: T[];
  nextCursor: string | null;
}
