/**
 * Player profile queries.
 *
 * Extracted from the db.ts god module (foundation audit Phase 2, finding C1),
 * following server/db/newsletter.ts: functions moved unchanged, re-exported
 * from db.ts so existing `import { ... } from "./db"` keeps working, typecheck
 * proves the move.
 *
 * This is only the profile CRUD. The `playerProfiles` table is read from all
 * over db.ts (token balances, contribution scores, tiers), and those queries
 * belong to their own domains; they are not dragged here just because they
 * touch the same table.
 *
 * updatePlayerProfile reaches back to db.ts for getUserProfile to run the
 * reverse sync into userProfiles. Same import direction as getDb, and the
 * sync's forward half still lives in db.ts's upsertUserProfile; the two field
 * lists must stay in lockstep, so splitting them apart would be worse than the
 * import.
 */
import { and, desc, eq, inArray } from "drizzle-orm";
import { InsertPlayerProfile, playerProfiles, userProfiles } from "../../drizzle/schema";
import { getDb, getUserProfile } from "../db";

export async function createPlayerProfile(data: InsertPlayerProfile) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(playerProfiles).values(data);
  return result[0].insertId;
}

export async function getPlayerProfileById(id: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(playerProfiles).where(eq(playerProfiles.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getPlayerProfileByUserId(userId: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(playerProfiles).where(eq(playerProfiles.userId, userId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

/**
 * Batch lookup of player profiles by userId. Returns a Record keyed by
 * userId so callers can do `map[userId]` without a second pass. Used by
 * forum listing to avoid the per-author N+1 select.
 */
export async function getPlayerProfilesByUserIds(
  userIds: number[],
): Promise<Record<number, typeof playerProfiles.$inferSelect>> {
  if (userIds.length === 0) return {};
  const db = await getDb();
  if (!db) return {};
  const unique = Array.from(new Set(userIds));
  const rows = await db.select().from(playerProfiles).where(inArray(playerProfiles.userId, unique));
  return Object.fromEntries(rows.map((p) => [p.userId, p]));
}

export async function getPlayerProfileByBaseAccount(baseAccountName: string) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(playerProfiles)
    .where(eq(playerProfiles.baseAccountName, baseAccountName))
    .limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getAllPlayerProfiles() {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(playerProfiles)
    .where(eq(playerProfiles.isActive, 1))
    .orderBy(desc(playerProfiles.createdAt));
}

export async function getVerifiedPlayerProfiles() {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(playerProfiles)
    .where(and(eq(playerProfiles.isVerified, 1), eq(playerProfiles.isActive, 1)))
    .orderBy(desc(playerProfiles.totalContributionValue));
}

export async function updatePlayerProfile(id: number, data: Partial<InsertPlayerProfile>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(playerProfiles).set(data).where(eq(playerProfiles.id, id));

  // Reverse sync: push shared display fields to userProfiles so both tables
  // stay consistent regardless of which form saves. Mirrors the same field
  // set as the forward sync in upsertUserProfile (0169, Phase 2B) — keep the
  // two lists in lockstep or the tables drift.
  const syncToUser: Record<string, string | number | undefined> = {};
  if (data.avatarUrl !== undefined) syncToUser.avatarUrl = data.avatarUrl ?? undefined;
  if (data.displayName !== undefined) syncToUser.displayName = data.displayName;
  if (data.bio !== undefined) syncToUser.bio = data.bio ?? undefined;
  if (data.bannerUrl !== undefined) syncToUser.bannerUrl = data.bannerUrl ?? undefined;
  if (data.website !== undefined) syncToUser.website = data.website ?? undefined;
  if (data.forumLocation !== undefined) syncToUser.location = data.forumLocation ?? undefined;
  if (data.preferredLanguage !== undefined) syncToUser.preferredLanguage = data.preferredLanguage ?? undefined;
  if (data.onboardingComplete !== undefined) syncToUser.onboardingComplete = data.onboardingComplete;
  if (Object.keys(syncToUser).length > 0) {
    try {
      const [pp] = await db.select({ userId: playerProfiles.userId })
        .from(playerProfiles).where(eq(playerProfiles.id, id)).limit(1);
      if (pp?.userId) {
        const existing = await getUserProfile(pp.userId);
        if (existing) {
          await db.update(userProfiles).set(syncToUser).where(eq(userProfiles.userId, pp.userId));
        }
      }
    } catch (_e) {
      console.warn("Failed to sync playerProfile fields to userProfiles:", _e);
    }
  }
}

export async function deletePlayerProfile(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Soft delete by setting isActive to 0
  await db.update(playerProfiles).set({ isActive: 0 }).where(eq(playerProfiles.id, id));
}
