/**
 * Multiplayer Mode crew assembly: the pure, deterministic core (zero LLM).
 *
 * Everything here is a plain function over plain data so the assembly rules are
 * unit-testable without a database. The cron job (server/jobs/questCrewAssembly.ts)
 * loads rows, calls these planners, and applies the results.
 *
 * Rules (spec: CLAUDE_CODE_PROMPT_2026-07-16_MULTIPLAYER_COORDINATION.md):
 * - When open signups for (quest, bioregion) reach crewSizeMin, a crew forms.
 * - Crews still forming refill from new signups before any new crew is created.
 * - Signups beyond crewSizeMax start the next crew forming in that bioregion.
 * - One formation email per member per crew, ever (keyed on formationEmailSentAt).
 */

import type { MultiplayerQuest } from "@shared/multiplayerQuests";

export type PlannableSignup = {
  id: number;
  userId: number;
};

export type OpenCrew = {
  crewId: number;
  /** Members with status "joined" (or "completed"); "left" members free a slot. */
  activeMemberCount: number;
  /** userIds already on the crew in any status, to avoid re-adding a row. */
  memberUserIds: number[];
};

export type AssemblyPlan = {
  /** Signups assigned to existing crews with open slots, oldest crew first. */
  refills: { crewId: number; signups: PlannableSignup[] }[];
  /** New crews to create, each with its founding member signups. */
  newCrews: { signups: PlannableSignup[] }[];
  /** Signups left open, waiting for enough players (below crewSizeMin). */
  leftoverSignupIds: number[];
};

/**
 * Plan assembly for one (quest, bioregion) group. `openSignups` must be sorted
 * oldest first (first come, first crewed). `openCrews` must be sorted oldest
 * first and contain only crews in status forming or ready.
 */
export function planCrewAssembly(
  quest: Pick<MultiplayerQuest, "crewSizeMin" | "crewSizeMax">,
  openSignups: PlannableSignup[],
  openCrews: OpenCrew[],
): AssemblyPlan {
  const refills: AssemblyPlan["refills"] = [];
  const newCrews: AssemblyPlan["newCrews"] = [];

  // A player already on a crew for this quest never fills a second slot.
  const alreadyCrewed = new Set<number>(openCrews.flatMap((c) => c.memberUserIds));
  const seenUserIds = new Set<number>();
  const queue = openSignups.filter((s) => {
    if (alreadyCrewed.has(s.userId) || seenUserIds.has(s.userId)) return false;
    seenUserIds.add(s.userId);
    return true;
  });

  // 1. Refill crews that formed at less than crewSizeMax (or lost members).
  for (const crew of openCrews) {
    const openSlots = quest.crewSizeMax - crew.activeMemberCount;
    if (openSlots <= 0 || queue.length === 0) continue;
    const taken = queue.splice(0, openSlots);
    if (taken.length > 0) refills.push({ crewId: crew.crewId, signups: taken });
  }

  // 2. Form new crews while enough signups remain, filling each to crewSizeMax.
  while (queue.length >= quest.crewSizeMin) {
    const size = Math.min(queue.length, quest.crewSizeMax);
    newCrews.push({ signups: queue.splice(0, size) });
  }

  return { refills, newCrews, leftoverSignupIds: queue.map((s) => s.id) };
}

/** Crew status after a membership change: full crews are ready, partial forming. */
export function crewStatusForCount(
  activeMemberCount: number,
  crewSizeMax: number,
): "forming" | "ready" {
  return activeMemberCount >= crewSizeMax ? "ready" : "forming";
}

export type EmailableMember = {
  memberId: number;
  status: "joined" | "left" | "completed";
  formationEmailSentAt: Date | null;
};

/**
 * Which members are owed the formation email. The formationEmailSentAt stamp is
 * the idempotency key: one email per member per crew, ever, even across reruns.
 */
export function membersDueFormationEmail<T extends EmailableMember>(members: T[]): T[] {
  return members.filter((m) => m.status === "joined" && m.formationEmailSentAt === null);
}

export type CompletableMember = {
  userId: number;
  status: "joined" | "left" | "completed";
};

/**
 * A crew is complete when every member who did not leave has completed the
 * quest, and at least one such member exists. Members who left don't block.
 */
export function isCrewComplete(members: CompletableMember[]): boolean {
  const staying = members.filter((m) => m.status !== "left");
  return staying.length > 0 && staying.every((m) => m.status === "completed");
}

// ── Player-facing copy builders (writing rules: STEERING.md section 1) ────────

export type CrewCopyContext = {
  quest: Pick<MultiplayerQuest, "title" | "slug" | "steps" | "definitionOfDone" | "crewRoles">;
  bioregionName: string;
  memberNames: string[];
};

/** The welcome post that opens every crew's forum thread. */
export function crewWelcomePost(ctx: CrewCopyContext): { title: string; content: string } {
  const { quest, bioregionName, memberNames } = ctx;
  const members = memberNames.map((n) => `- ${n}`).join("\n");
  const steps = quest.steps.map((s, i) => `${i + 1}. **${s.title}.** ${s.description}`).join("\n");
  const roles = quest.crewRoles.map((r) => `- **${r.name}**: ${r.description}`).join("\n");

  const content = [
    `A crew has formed in ${bioregionName} for **${quest.title}**. This thread is your crew's home. Plan here, post your progress here, and celebrate here when it's done.`,
    ``,
    `**Your crew**`,
    members,
    ``,
    `**The parts to claim**`,
    roles,
    ``,
    `**The steps**`,
    steps,
    ``,
    `**Done means**`,
    quest.definitionOfDone,
    ``,
    `First move: say hello and claim your part.`,
  ].join("\n");

  return {
    title: `${quest.title} crew, ${bioregionName}`,
    content,
  };
}

/** Posted to the crew thread when the whole crew has completed the quest. */
export function crewCompletionPost(ctx: { questTitle: string; bioregionName: string }): string {
  return [
    `**${ctx.questTitle}** is complete. Every member of this ${ctx.bioregionName} crew finished the quest.`,
    ``,
    `What you did here is the real game: a small group coordinating to change a real place. Thank each other, share the best photo one more time, and keep the thread. The next crew in ${ctx.bioregionName} will want to know how you did it.`,
  ].join("\n");
}

/** The crew formation email. Warm, short, one ask: go meet your crew. */
export function formationEmail(ctx: {
  recipientName: string;
  questTitle: string;
  bioregionName: string;
  memberNames: string[];
  threadUrl: string;
  questUrl: string;
}): { subject: string; html: string } {
  const others = ctx.memberNames.filter((n) => n !== ctx.recipientName);
  const crewLine =
    others.length > 0
      ? `You're crewing with ${listNames(others)}.`
      : `Your crewmates are listed in the crew thread.`;

  return {
    subject: `Your ${ctx.questTitle} crew has formed in ${ctx.bioregionName}`,
    html: [
      `<h2>Your crew is ready</h2>`,
      `<p>Hi ${escapeHtml(ctx.recipientName)},</p>`,
      `<p>Enough players in ${escapeHtml(ctx.bioregionName)} signed up for <strong>${escapeHtml(ctx.questTitle)}</strong>, and a crew has formed around it. ${escapeHtml(crewLine)}</p>`,
      `<p>Your crew's home is its thread. The quest, the steps, and what done means are all posted there. First move: say hello and claim your part.</p>`,
      `<p><a href="${ctx.threadUrl}" style="display:inline-block;background:#166534;color:#ffffff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;">Meet your crew</a></p>`,
      `<p style="font-size:14px;color:#555;">Quest details: <a href="${ctx.questUrl}">${escapeHtml(ctx.questTitle)}</a></p>`,
    ].join("\n"),
  };
}

/** "Ana, Ben, and Cleo" style name list. */
export function listNames(names: string[]): string {
  if (names.length === 0) return "";
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(", ")}, and ${names[names.length - 1]}`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
