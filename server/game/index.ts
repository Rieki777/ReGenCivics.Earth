/**
 * ReGen Games Core System
 * Shared utilities: getGameVariable, recordScoreEvent, logActivityEvent, getCurrentSeason
 */
import { getDb } from "../db";
import { eq, and, sql, desc } from "drizzle-orm";
import { cacheGet, cacheSet, cacheDel } from "../cache";

// ─── Game Variables ─────────────────────────────────────────────────────────

const VAR_CACHE_TTL = 300; // 5 minutes

export async function getGameVariable(key: string): Promise<number> {
  // Check Redis cache
  const cached = await cacheGet(`gv:${key}`);
  if (cached !== null && cached !== undefined) return Number(cached);

  const db = await getDb();
  if (!db) throw new Error(`Game variable lookup failed: DB unavailable (key: ${key})`);

  const rows = await db.execute(sql`SELECT value FROM game_variables WHERE \`key\` = ${key} AND isActive = 1 LIMIT 1`);
  const result = (rows as any)?.[0]?.[0];
  if (!result) throw new Error(`Game variable not found: ${key}`);

  const value = Number(result.value);
  await cacheSet(`gv:${key}`, String(value), VAR_CACHE_TTL);
  return value;
}

export async function getGameVariables(keys: string[]): Promise<Record<string, number>> {
  const result: Record<string, number> = {};
  // Cache reads in parallel — the mechanics snapshot asks for 100+ keys and
  // a sequential await per key made cold paths crawl.
  const cached = await Promise.all(keys.map((key) => cacheGet(`gv:${key}`)));
  keys.forEach((key, i) => {
    const c = cached[i];
    if (c !== null && c !== undefined) result[key] = Number(c);
  });
  const missing = keys.filter(k => !(k in result));
  if (missing.length === 0) return result;

  const db = await getDb();
  if (!db) return result;

  // ONE batch query for everything the cache lacked. With Redis absent this
  // used to be one SELECT per key on every call — a public-endpoint DB
  // hammer with a large key list.
  try {
    const keyList = sql.join(missing.map((k) => sql`${k}`), sql`, `);
    const rows = await db.execute(
      sql`SELECT \`key\`, value FROM game_variables WHERE \`key\` IN (${keyList}) AND isActive = 1`,
    );
    const list: any[] = Array.isArray((rows as any)?.[0]) ? (rows as any)[0] : [];
    await Promise.all(
      list.map((row: any) => {
        result[row.key] = Number(row.value);
        return cacheSet(`gv:${row.key}`, String(result[row.key]), VAR_CACHE_TTL);
      }),
    );
  } catch { /* missing table or DB error — callers fall back per key */ }
  return result;
}

export async function invalidateGameVariable(key: string) {
  await cacheDel(`gv:${key}`);
}

/**
 * The never-throws read: getGameVariable with a caller-supplied fallback.
 *
 * This is THE replacement for the half-dozen per-file raw-SQL readVar
 * helpers that used to live in assembly/governance/forum/jobs — those
 * bypassed the cache, ignored isActive, and two of them had a `|| fallback`
 * zero-trap that made a stored 0 impossible. One reader, one behavior:
 * cached, isActive-filtered, fallback on missing/NaN/DB-down, and a stored
 * 0 is a real value.
 */
export async function getGameVariableOr(key: string, fallback: number): Promise<number> {
  try {
    const v = await getGameVariable(key);
    return Number.isFinite(v) ? v : fallback;
  } catch {
    return fallback;
  }
}

// ─── Citizenship tier ranks ─────────────────────────────────────────────────

/**
 * player_profiles.citizenshipTier is an ENUM of STRINGS
 * ('explorer'|'co_creator'|'steward'|'sage'), so every `Number(tier) >= n`
 * compare in the codebase silently evaluated NaN >= n === false — tier gates
 * either never passed (isStewardPlus) or always passed (min-tier checks
 * against 0). Rank through this instead of Number().
 */
export function citizenshipTierRank(tier: unknown): number {
  if (typeof tier === "number" && Number.isFinite(tier)) return tier;
  switch (String(tier ?? "").toLowerCase()) {
    case "co_creator": return 1;
    case "steward": return 2;
    case "sage":
    case "guardian": return 3;
    default: {
      const n = Number(tier);
      return Number.isFinite(n) ? n : 0; // explorer / unknown
    }
  }
}

// ─── Current Season ─────────────────────────────────────────────────────────

const SEASON_CACHE_KEY = 'game:current-season';
const SEASON_CACHE_TTL = 3600; // 1 hour, manually invalidate on season transition

export async function getCurrentSeason(): Promise<{ id: number; name: string; slug: string } | null> {
  const cached = await cacheGet<{ id: number; name: string; slug: string } | null>(SEASON_CACHE_KEY);
  if (cached !== null && cached !== undefined) return cached;

  const db = await getDb();
  if (!db) return null;
  const rows = await db.execute(sql`SELECT id, name, slug FROM game_seasons WHERE status = 'active' LIMIT 1`);
  const row = (rows as any)?.[0]?.[0];
  const result = row ? { id: row.id, name: row.name, slug: row.slug } : null;
  await cacheSet(SEASON_CACHE_KEY, result, SEASON_CACHE_TTL);
  return result;
}

/**
 * Invalidate the active-season cache. Call this from any admin path that
 * promotes a new season to status='active'.
 */
export async function invalidateCurrentSeason() {
  await cacheDel(SEASON_CACHE_KEY);
}

// ─── Score Events ───────────────────────────────────────────────────────────

export async function recordScoreEvent(
  userId: number,
  action: string,
  variableKey: string,
  referenceType: string,
  referenceId?: number,
): Promise<number> {
  const points = await getGameVariable(variableKey);
  const season = await getCurrentSeason();

  const db = await getDb();
  if (!db) return 0;

  await db.execute(sql`
    INSERT INTO contribution_score_events (userId, action, points, variableKey, referenceType, referenceId, seasonId, createdAt)
    VALUES (${userId}, ${action}, ${points}, ${variableKey}, ${referenceType}, ${referenceId ?? null}, ${season?.id ?? null}, NOW())
  `);

  // Also log to activity feed
  await logActivityEvent("score_event", "player", userId, action, referenceId ?? undefined, { points, variableKey });

  return points;
}

// ─── Activity Feed ──────────────────────────────────────────────────────────

export async function logActivityEvent(
  eventType: string,
  actorType: "player" | "project" | "system",
  actorId: number | undefined,
  targetType?: string,
  targetId?: number,
  metadata?: Record<string, unknown>,
  // Must match the column enum, drizzle/schema.ts activity_feed_events.
  // This said "admin_only", which is not a member of ("public","community",
  // "admin"), so MySQL stored '' and `activityFeed.list`'s `visibility !=
  // 'admin'` filter let those rows through: abuse-flag reasons went public.
  visibility: "public" | "community" | "admin" = "public",
): Promise<void> {
  const db = await getDb();
  if (!db) return;

  await db.execute(sql`
    INSERT INTO activity_feed_events (eventType, actorType, actorId, targetType, targetId, metadata, visibility, createdAt)
    VALUES (${eventType}, ${actorType}, ${actorId ?? null}, ${targetType ?? null}, ${targetId ?? null}, ${metadata ? JSON.stringify(metadata) : null}, ${visibility}, NOW())
  `);
}

// ─── Tier Labels ────────────────────────────────────────────────────────────

/**
 * Percentile bands behind the public tier labels, promoted to game_variables
 * (tiers.percentile.*, seeded 0221). getTierFromPercentile stays synchronous
 * because its callers are sync hot paths, so the live values flow through a
 * module cache refreshed opportunistically: the first call after boot (and
 * after each TTL lapse) serves the current cache and kicks off a background
 * refresh. Same eventual-consistency contract as the 5-minute gv: cache.
 */
const TIER_BAND_DEFAULTS = { guardian: 95, elder: 85, cultivator: 70, grower: 50, sapling: 30, sprout: 15 };
let tierBands = { ...TIER_BAND_DEFAULTS };
let tierBandsFetchedAt = 0;

/**
 * Await-able freshness for batch jobs: a long percentile-recalculation loop
 * should call this ONCE up front so every label in the run comes from one
 * consistent band set (the fire-and-forget refresh inside
 * getTierFromPercentile can otherwise land mid-loop after an operator tunes
 * tiers.percentile.*).
 */
export async function ensureTierBandsFresh(): Promise<void> {
  tierBandsFetchedAt = Date.now();
  await refreshTierBands().catch(() => { /* keep current bands */ });
}

async function refreshTierBands(): Promise<void> {
  const keys = Object.keys(TIER_BAND_DEFAULTS).map((k) => `tiers.percentile.${k}`);
  const vars = await getGameVariables(keys);
  const next = { ...TIER_BAND_DEFAULTS };
  for (const band of Object.keys(TIER_BAND_DEFAULTS) as (keyof typeof TIER_BAND_DEFAULTS)[]) {
    const v = vars[`tiers.percentile.${band}`];
    if (Number.isFinite(v)) next[band] = v;
  }
  tierBands = next;
}

export function getTierFromPercentile(percentile: number): string {
  if (Date.now() - tierBandsFetchedAt > VAR_CACHE_TTL * 1000) {
    tierBandsFetchedAt = Date.now();
    void refreshTierBands().catch(() => { /* keep current bands */ });
  }
  if (percentile >= tierBands.guardian) return "Guardian";
  if (percentile >= tierBands.elder) return "Elder";
  if (percentile >= tierBands.cultivator) return "Cultivator";
  if (percentile >= tierBands.grower) return "Grower";
  if (percentile >= tierBands.sapling) return "Sapling";
  if (percentile >= tierBands.sprout) return "Sprout";
  return "Seedling";
}
