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
  // Try cache first for each
  for (const key of keys) {
    const cached = await cacheGet(`gv:${key}`);
    if (cached !== null && cached !== undefined) {
      result[key] = Number(cached);
    }
  }
  const missing = keys.filter(k => !(k in result));
  if (missing.length === 0) return result;

  const db = await getDb();
  if (!db) return result;

  for (const key of missing) {
    try {
      const rows = await db.execute(sql`SELECT value FROM game_variables WHERE \`key\` = ${key} AND isActive = 1 LIMIT 1`);
      const row = (rows as any)?.[0]?.[0];
      if (row) {
        result[key] = Number(row.value);
        await cacheSet(`gv:${key}`, String(result[key]), VAR_CACHE_TTL);
      }
    } catch { /* skip missing variables */ }
  }
  return result;
}

export async function invalidateGameVariable(key: string) {
  await cacheDel(`gv:${key}`);
}

// ─── Current Season ─────────────────────────────────────────────────────────

export async function getCurrentSeason(): Promise<{ id: number; name: string; slug: string } | null> {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.execute(sql`SELECT id, name, slug FROM game_seasons WHERE status = 'active' LIMIT 1`);
  const row = (rows as any)?.[0]?.[0];
  if (!row) return null;
  return { id: row.id, name: row.name, slug: row.slug };
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
  visibility: "public" | "admin_only" = "public",
): Promise<void> {
  const db = await getDb();
  if (!db) return;

  await db.execute(sql`
    INSERT INTO activity_feed_events (eventType, actorType, actorId, targetType, targetId, metadata, visibility, createdAt)
    VALUES (${eventType}, ${actorType}, ${actorId ?? null}, ${targetType ?? null}, ${targetId ?? null}, ${metadata ? JSON.stringify(metadata) : null}, ${visibility}, NOW())
  `);
}

// ─── Tier Labels ────────────────────────────────────────────────────────────

export function getTierFromPercentile(percentile: number): string {
  if (percentile >= 95) return "Guardian";
  if (percentile >= 85) return "Elder";
  if (percentile >= 70) return "Steward";
  if (percentile >= 50) return "Grower";
  if (percentile >= 30) return "Sapling";
  if (percentile >= 15) return "Sprout";
  return "Seedling";
}
