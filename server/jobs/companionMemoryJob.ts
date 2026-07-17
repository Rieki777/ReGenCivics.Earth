/**
 * Consent-based player memory writer (Phase D2): deterministic, zero LLM.
 *
 * For OPTED-IN players only (companionMemoryOptIn = 1), derives small
 * game-journey facts from events: quest completions, crew memberships, and
 * gratitude milestones. Fact builders live in server/lib/companionMemory.ts
 * (pure, unit-tested); the (userId, sourceRef) unique key makes every write
 * idempotent across reruns. Players who opt out stop accumulating facts
 * immediately; their existing facts stay visible on the settings surface
 * until they delete them.
 */

import { and, eq, sql } from "drizzle-orm";
import { getDb } from "../db";
import {
  playerCompanionMemory,
  playerProfiles,
  questCompletions,
  questCrewMembers,
  questCrews,
  userTokenLedger,
  bioregions,
} from "../../drizzle/schema";
import { getMultiplayerQuest } from "@shared/multiplayerQuests";
import {
  crewMembershipFact,
  gratitudeMilestoneFacts,
  questCompletionFact,
  type MemoryFact,
} from "../lib/companionMemory";

const MAX_USERS_PER_RUN = 200;

export type CompanionMemoryReport = { ok: boolean; usersScanned: number; factsWritten: number; errors: string[] };

export async function runCompanionMemoryJob(): Promise<CompanionMemoryReport> {
  const report: CompanionMemoryReport = { ok: true, usersScanned: 0, factsWritten: 0, errors: [] };
  const db = await getDb();
  if (!db) return { ...report, ok: false, errors: ["database unavailable"] };

  const optedIn = await db
    .select({ userId: playerProfiles.userId })
    .from(playerProfiles)
    .where(eq(playerProfiles.companionMemoryOptIn, 1))
    .limit(MAX_USERS_PER_RUN);

  for (const { userId } of optedIn) {
    if (userId === null) continue; // profile rows can predate user linkage
    try {
      report.usersScanned += 1;
      const facts: MemoryFact[] = [];

      const completions = await db
        .select({ id: questCompletions.id, questTitle: questCompletions.questTitle, completedAt: questCompletions.completedAt })
        .from(questCompletions)
        .where(eq(questCompletions.userId, userId));
      for (const c of completions) {
        facts.push(questCompletionFact({ completionId: c.id, questTitle: c.questTitle, completedAt: c.completedAt }));
      }

      const memberships = await db
        .select({
          memberId: questCrewMembers.id,
          status: questCrewMembers.status,
          questId: questCrews.questId,
          bioregionName: bioregions.name,
        })
        .from(questCrewMembers)
        .innerJoin(questCrews, eq(questCrews.id, questCrewMembers.crewId))
        .leftJoin(bioregions, eq(bioregions.id, questCrews.bioregionId))
        .where(eq(questCrewMembers.userId, userId));
      for (const m of memberships) {
        if (m.status === "left") continue;
        const quest = getMultiplayerQuest(m.questId);
        facts.push(
          crewMembershipFact({
            memberId: m.memberId,
            questTitle: quest?.title ?? m.questId,
            bioregionName: m.bioregionName ?? "their bioregion",
          }),
        );
      }

      const [gratitude] = await db
        .select({ count: sql<number>`count(*)` })
        .from(userTokenLedger)
        .where(and(eq(userTokenLedger.userId, userId), eq(userTokenLedger.source, "gratitude_received")));
      facts.push(...gratitudeMilestoneFacts(Number(gratitude?.count ?? 0)));

      for (const fact of facts) {
        try {
          await db.insert(playerCompanionMemory).values({
            userId,
            surface: fact.surface,
            fact: fact.fact,
            sourceRef: fact.sourceRef,
          });
          report.factsWritten += 1;
        } catch {
          // (userId, sourceRef) unique: already written, which is the point.
        }
      }
    } catch (err: any) {
      report.errors.push(`user ${userId}: ${err?.message ?? err}`);
    }
  }

  report.ok = report.errors.length === 0;
  return report;
}
