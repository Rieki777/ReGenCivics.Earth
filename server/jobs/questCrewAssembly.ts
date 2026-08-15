/**
 * Multiplayer Mode crew assembly job (deterministic cron, zero LLM).
 *
 * Runs on a Railway cron via POST /api/cron/quest-crew-assembly. Each run:
 *  1. Groups open signups by (quest, bioregion); refills forming crews, then
 *     forms new crews whenever a group reaches the quest's crewSizeMin
 *     (planning rules live in server/lib/questCrews.ts, pure and unit-tested).
 *  2. Creates each new crew's forum thread (the crew chat), seeded with a
 *     welcome post naming the quest, the members, the steps, and done.
 *  3. Sends every member one formation email, keyed on formationEmailSentAt
 *     (idempotent across reruns) and bounded per run.
 *  4. Sweeps quest_completions to mark members complete and closes crews with
 *     a completion post. Token credits stay on the existing quest completion
 *     path; this job never touches balances.
 *
 * Spec: CLAUDE_CODE_PROMPT_2026-07-16_MULTIPLAYER_COORDINATION.md, Phase A.
 */

import { and, asc, eq, inArray, isNull } from "drizzle-orm";
import { getDb } from "../db";
import * as db from "../db";
import {
  bioregions,
  questCompletions,
  questCrewMembers,
  questCrews,
  questCrewSignups,
  users,
} from "../../drizzle/schema";
import { liveMultiplayerQuests, getMultiplayerQuest } from "@shared/multiplayerQuests";
import {
  crewCompletionPost,
  crewStatusForCount,
  crewWelcomePost,
  formationEmail,
  isCrewComplete,
  membersDueFormationEmail,
  planCrewAssembly,
} from "../lib/questCrews";
import { sendEmail, toAbsoluteUrl } from "../_core/email";

const CREW_CHAT_CATEGORY = {
  slug: "crew-chats",
  name: "Crew Chats",
  description:
    "Home threads for multiplayer quest crews. Each thread is one crew planning a quest, doing it, and posting the proof.",
};

const CREWS_SYSTEM_OPENID = "quest-crews-system";
const CREWS_SYSTEM_NAME = "ReGen Civics Crews";
const CREWS_SYSTEM_HANDLE = "regen-crews";

/** Formation emails sent per run, so a big launch day can't trip the limiter. */
const MAX_EMAILS_PER_RUN = 50;
const EMAIL_SPACING_MS = 150;

export type QuestCrewAssemblyReport = {
  ok: boolean;
  crewsFormed: number;
  membersAdded: number;
  threadsCreated: number;
  emailsSent: number;
  crewsCompleted: number;
  errors: string[];
};

export async function runQuestCrewAssemblyJob(): Promise<QuestCrewAssemblyReport> {
  const report: QuestCrewAssemblyReport = {
    ok: true,
    crewsFormed: 0,
    membersAdded: 0,
    threadsCreated: 0,
    emailsSent: 0,
    crewsCompleted: 0,
    errors: [],
  };

  const database = await getDb();
  if (!database) {
    return { ...report, ok: false, errors: ["database unavailable"] };
  }

  const quests = liveMultiplayerQuests();

  // ── 1. Assemble crews per (quest, bioregion) ───────────────────────────────
  for (const quest of quests) {
    try {
      const openSignups = await database
        .select()
        .from(questCrewSignups)
        .where(and(eq(questCrewSignups.questId, quest.questId), eq(questCrewSignups.status, "open")))
        .orderBy(asc(questCrewSignups.createdAt), asc(questCrewSignups.id));
      if (openSignups.length === 0) continue;

      const byBioregion = new Map<number, typeof openSignups>();
      for (const s of openSignups) {
        const group = byBioregion.get(s.bioregionId) ?? [];
        group.push(s);
        byBioregion.set(s.bioregionId, group);
      }

      for (const [bioregionId, group] of byBioregion) {
        const openCrewRows = await database
          .select()
          .from(questCrews)
          .where(
            and(
              eq(questCrews.questId, quest.questId),
              eq(questCrews.bioregionId, bioregionId),
              inArray(questCrews.status, ["forming", "ready"]),
            ),
          )
          .orderBy(asc(questCrews.createdAt), asc(questCrews.id));

        const openCrews = [] as { crewId: number; activeMemberCount: number; memberUserIds: number[] }[];
        for (const crew of openCrewRows) {
          const members = await database
            .select()
            .from(questCrewMembers)
            .where(eq(questCrewMembers.crewId, crew.id));
          openCrews.push({
            crewId: crew.id,
            activeMemberCount: members.filter((m) => m.status !== "left").length,
            memberUserIds: members.map((m) => m.userId),
          });
        }

        const plan = planCrewAssembly(quest, group, openCrews);

        // Refill crews that still have open slots.
        for (const refill of plan.refills) {
          for (const signup of refill.signups) {
            await addMemberFromSignup(database, refill.crewId, signup.id, signup.userId);
            report.membersAdded += 1;
          }
          const crewState = openCrews.find((c) => c.crewId === refill.crewId);
          const newCount = (crewState?.activeMemberCount ?? 0) + refill.signups.length;
          await database
            .update(questCrews)
            .set({ status: crewStatusForCount(newCount, quest.crewSizeMax) })
            .where(and(eq(questCrews.id, refill.crewId), inArray(questCrews.status, ["forming", "ready"])));
        }

        // Form new crews.
        for (const newCrew of plan.newCrews) {
          const [inserted] = await database.insert(questCrews).values({
            questId: quest.questId,
            bioregionId,
            crewSize: quest.crewSizeMax,
            status: crewStatusForCount(newCrew.signups.length, quest.crewSizeMax),
          });
          const crewId = inserted.insertId;
          for (const signup of newCrew.signups) {
            await addMemberFromSignup(database, crewId, signup.id, signup.userId);
            report.membersAdded += 1;
          }
          report.crewsFormed += 1;
        }
      }
    } catch (err: any) {
      report.errors.push(`assemble ${quest.questId}: ${err?.message ?? err}`);
    }
  }

  // ── 2. Create crew chat threads for crews that lack one ───────────────────
  try {
    const crewsNeedingThread = await database
      .select()
      .from(questCrews)
      .where(and(isNull(questCrews.forumThreadId), inArray(questCrews.status, ["forming", "ready", "active"])));

    if (crewsNeedingThread.length > 0) {
      const categoryId = await getOrCreateCrewChatCategory();
      const systemUserId = await getOrCreateCrewsSystemUser(database);
      for (const crew of crewsNeedingThread) {
        try {
          const quest = getMultiplayerQuest(crew.questId);
          if (!quest || categoryId === null || systemUserId === null) continue;
          const memberNames = await crewMemberNames(database, crew.id);
          const bioregionName = await bioregionNameById(database, crew.bioregionId);
          const post = crewWelcomePost({ quest, bioregionName, memberNames });
          const threadId = await db.createForumPost({
            categoryId,
            authorId: systemUserId,
            title: post.title,
            content: post.content,
            tags: ["multiplayer", quest.slug],
            bioregionId: crew.bioregionId,
          });
          await database
            .update(questCrews)
            .set({ forumThreadId: threadId })
            .where(eq(questCrews.id, crew.id));
          report.threadsCreated += 1;
        } catch (err: any) {
          report.errors.push(`thread crew ${crew.id}: ${err?.message ?? err}`);
        }
      }
    }
  } catch (err: any) {
    report.errors.push(`thread pass: ${err?.message ?? err}`);
  }

  // ── 3. Formation emails (idempotent per member per crew) ──────────────────
  try {
    report.emailsSent = await sendFormationEmails(database, report.errors);
  } catch (err: any) {
    report.errors.push(`email pass: ${err?.message ?? err}`);
  }

  // ── 4. Completion sweep ────────────────────────────────────────────────────
  try {
    report.crewsCompleted = await sweepCompletions(database, report.errors);
  } catch (err: any) {
    report.errors.push(`completion sweep: ${err?.message ?? err}`);
  }

  report.ok = report.errors.length === 0;
  return report;
}

/** Insert (or revive) the member row and mark the signup crewed. */
async function addMemberFromSignup(
  database: NonNullable<Awaited<ReturnType<typeof getDb>>>,
  crewId: number,
  signupId: number,
  userId: number,
) {
  const existing = await database
    .select()
    .from(questCrewMembers)
    .where(and(eq(questCrewMembers.crewId, crewId), eq(questCrewMembers.userId, userId)))
    .limit(1);
  if (existing.length > 0) {
    // A returning member keeps their original formation email stamp.
    await database
      .update(questCrewMembers)
      .set({ status: "joined" })
      .where(eq(questCrewMembers.id, existing[0].id));
  } else {
    await database.insert(questCrewMembers).values({ crewId, userId });
  }
  await database
    .update(questCrewSignups)
    .set({ status: "crewed", crewId })
    .where(eq(questCrewSignups.id, signupId));
}

async function sendFormationEmails(
  database: NonNullable<Awaited<ReturnType<typeof getDb>>>,
  errors: string[],
): Promise<number> {
  // Only crews with a thread: the email's one ask is "go meet your crew".
  const crews = await database
    .select()
    .from(questCrews)
    .where(and(inArray(questCrews.status, ["forming", "ready", "active"])));
  let sent = 0;

  for (const crew of crews) {
    if (sent >= MAX_EMAILS_PER_RUN) break;
    if (!crew.forumThreadId) continue;
    const quest = getMultiplayerQuest(crew.questId);
    if (!quest) continue;

    const members = await database
      .select()
      .from(questCrewMembers)
      .where(eq(questCrewMembers.crewId, crew.id));
    const due = membersDueFormationEmail(
      members.map((m) => ({ memberId: m.id, status: m.status, formationEmailSentAt: m.formationEmailSentAt })),
    );
    if (due.length === 0) continue;

    const memberNames = await crewMemberNames(database, crew.id);
    const bioregionName = await bioregionNameById(database, crew.bioregionId);
    const threadUrl = toAbsoluteUrl(`/community/post/${crew.forumThreadId}`, { campaign: "crew_formation" });
    const questUrl = toAbsoluteUrl(`/multiplayer`, { campaign: "crew_formation" });

    for (const dueMember of due) {
      if (sent >= MAX_EMAILS_PER_RUN) break;
      const memberRow = members.find((m) => m.id === dueMember.memberId);
      if (!memberRow) continue;
      try {
        const [user] = await database.select().from(users).where(eq(users.id, memberRow.userId)).limit(1);
        if (!user?.email) {
          // No email on file: stamp so the job doesn't retry forever.
          await database
            .update(questCrewMembers)
            .set({ formationEmailSentAt: new Date() })
            .where(eq(questCrewMembers.id, memberRow.id));
          continue;
        }
        const mail = formationEmail({
          recipientName: user.name || "friend",
          questTitle: quest.title,
          bioregionName,
          memberNames,
          threadUrl,
          questUrl,
        });
        const result = await sendEmail({ to: user.email, subject: mail.subject, html: mail.html });
        // Stamp only on a real send. EMAIL_HOLD and limiter blocks return a
        // null id, and those members stay due for the next run.
        if (result.id !== null) {
          await database
            .update(questCrewMembers)
            .set({ formationEmailSentAt: new Date() })
            .where(eq(questCrewMembers.id, memberRow.id));
          sent += 1;
        }
        await new Promise((r) => setTimeout(r, EMAIL_SPACING_MS));
      } catch (err: any) {
        errors.push(`email member ${memberRow.id}: ${err?.message ?? err}`);
      }
    }
  }
  return sent;
}

async function sweepCompletions(
  database: NonNullable<Awaited<ReturnType<typeof getDb>>>,
  errors: string[],
): Promise<number> {
  const crews = await database
    .select()
    .from(questCrews)
    .where(inArray(questCrews.status, ["forming", "ready", "active"]));
  let completed = 0;

  for (const crew of crews) {
    try {
      const members = await database
        .select()
        .from(questCrewMembers)
        .where(eq(questCrewMembers.crewId, crew.id));
      const staying = members.filter((m) => m.status !== "left");
      if (staying.length === 0) continue;

      // Members whose quest_completions row landed after the crew formed.
      const notYetCompleted = staying.filter((m) => m.status === "joined");
      if (notYetCompleted.length > 0) {
        const completions = await database
          .select({ userId: questCompletions.userId, completedAt: questCompletions.completedAt })
          .from(questCompletions)
          .where(
            and(
              eq(questCompletions.questId, crew.questId),
              inArray(
                questCompletions.userId,
                notYetCompleted.map((m) => m.userId),
              ),
            ),
          );
        const completedUserIds = new Set(
          completions.filter((c) => c.completedAt >= crew.createdAt).map((c) => c.userId),
        );
        for (const member of notYetCompleted) {
          if (completedUserIds.has(member.userId)) {
            await database
              .update(questCrewMembers)
              .set({ status: "completed" })
              .where(eq(questCrewMembers.id, member.id));
            member.status = "completed";
          }
        }
      }

      if (isCrewComplete(staying.map((m) => ({ userId: m.userId, status: m.status })))) {
        await database.update(questCrews).set({ status: "complete" }).where(eq(questCrews.id, crew.id));
        completed += 1;
        if (crew.forumThreadId) {
          const quest = getMultiplayerQuest(crew.questId);
          const systemUserId = await getOrCreateCrewsSystemUser(database);
          if (quest && systemUserId !== null) {
            const bioregionName = await bioregionNameById(database, crew.bioregionId);
            await db.createForumReply({
              postId: crew.forumThreadId,
              authorId: systemUserId,
              content: crewCompletionPost({ questTitle: quest.title, bioregionName }),
            });
          }
        }
      }
    } catch (err: any) {
      errors.push(`sweep crew ${crew.id}: ${err?.message ?? err}`);
    }
  }
  return completed;
}

async function crewMemberNames(
  database: NonNullable<Awaited<ReturnType<typeof getDb>>>,
  crewId: number,
): Promise<string[]> {
  const rows = await database
    .select({ name: users.name, status: questCrewMembers.status })
    .from(questCrewMembers)
    .innerJoin(users, eq(users.id, questCrewMembers.userId))
    .where(eq(questCrewMembers.crewId, crewId));
  return rows.filter((r) => r.status !== "left").map((r) => r.name || "A player");
}

async function bioregionNameById(
  database: NonNullable<Awaited<ReturnType<typeof getDb>>>,
  bioregionId: number,
): Promise<string> {
  const [row] = await database.select().from(bioregions).where(eq(bioregions.id, bioregionId)).limit(1);
  return row?.name ?? "your bioregion";
}

async function getOrCreateCrewChatCategory(): Promise<number | null> {
  const existing = await db.getForumCategoryBySlug(CREW_CHAT_CATEGORY.slug);
  if (existing) return existing.id;
  try {
    return await db.createForumCategory(CREW_CHAT_CATEGORY);
  } catch {
    const raced = await db.getForumCategoryBySlug(CREW_CHAT_CATEGORY.slug);
    return raced?.id ?? null;
  }
}

/** Idempotent system user for crew welcome posts, same shape as the elder bots. */
async function getOrCreateCrewsSystemUser(
  database: NonNullable<Awaited<ReturnType<typeof getDb>>>,
): Promise<number | null> {
  const existing = await db.getUserByOpenId(CREWS_SYSTEM_OPENID);
  if (existing) return existing.id;
  try {
    await database.insert(users).values({
      openId: CREWS_SYSTEM_OPENID,
      name: CREWS_SYSTEM_NAME,
      handle: CREWS_SYSTEM_HANDLE,
      loginMethod: "system",
      role: "user",
    });
  } catch {
    // Unique-constraint race: another run created it first. Fall through.
  }
  const created = await db.getUserByOpenId(CREWS_SYSTEM_OPENID);
  return created?.id ?? null;
}
