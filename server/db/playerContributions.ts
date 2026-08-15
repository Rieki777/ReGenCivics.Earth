/**
 * Player contribution queries.
 *
 * Extracted from the db.ts god module (foundation audit Phase 2, finding C1),
 * following server/db/newsletter.ts: functions moved unchanged, re-exported
 * from db.ts so existing `import { ... } from "./db"` keeps working, typecheck
 * proves the move.
 *
 * This is the playerContributions CRUD only. Contribution SCORING (the
 * contribution_score_events path, and the totals it recomputes on
 * playerProfiles) is a separate concern and stays where it is.
 */
import { and, eq } from "drizzle-orm";
import { InsertPlayerContribution, playerContributions } from "../../drizzle/schema";
import { getDb } from "../db";

export async function createPlayerContribution(data: InsertPlayerContribution) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [result] = await db.insert(playerContributions).values(data);
  return result.insertId;
}

export async function getPlayerContributionsByProfileId(profileId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db
    .select()
    .from(playerContributions)
    .where(eq(playerContributions.profileId, profileId))
    .orderBy(playerContributions.createdAt);
}

export async function deletePlayerContribution(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .delete(playerContributions)
    .where(and(eq(playerContributions.id, id), eq(playerContributions.userId, userId)));
}

export async function updatePlayerContributionStatus(
  id: number,
  status: "pending" | "verified" | "rejected"
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .update(playerContributions)
    .set({ status, verifiedAt: status === "verified" ? new Date() : null })
    .where(eq(playerContributions.id, id));
}
