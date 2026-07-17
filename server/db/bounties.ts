/**
 * Single payout path for the Bounty Engine.
 *
 * Every token credit for a bounty flows through payRole(). Every reversal
 * flows through reverseRole(). No other code path writes bounty rewards.
 * This makes the double-pay guard, budget cap, separation-of-duties rule,
 * and settlement hold apply automatically to every bounty kind.
 *
 * Token model: private-first. All credits go to the private ledger.
 * Tokens become claimable to Base only after claimableAt (settlement hold).
 */

import { eq, and, sql } from "drizzle-orm";
import { getDb } from "../db";
import { bounties, bountyRoles, bountyEvents, bountyPermissions, notifications, playerProfiles } from "../../drizzle/schema";
import { creditPrivateTokens, type TokenType } from "./tokens";
import { getGameVariable } from "../game";

type BountyRoleRow = typeof bountyRoles.$inferSelect;
type BountyRow = typeof bounties.$inferSelect;

function sourceTagFor(role: BountyRoleRow["role"]): string {
  switch (role) {
    case "doer": return "call_task_bounty";
    case "proposer": return "bounty_proposal";
    case "shipper": return "bounty_delivery";
    case "reviewer": return "bounty_delivery";
    case "booster": return "bounty_delivery";
    default: return "bounty_delivery";
  }
}

async function writeEvent(
  db: NonNullable<Awaited<ReturnType<typeof getDb>>>,
  bountyId: number,
  event: string,
  opts: { roleId?: number | null; actorUserId?: number | null; detail?: unknown } = {},
) {
  await db.insert(bountyEvents).values({
    bountyId,
    roleId: opts.roleId ?? null,
    actorUserId: opts.actorUserId ?? null,
    event,
    detail: opts.detail ? (opts.detail as Record<string, unknown>) : null,
  });
}

async function getSettlementHoldMs(): Promise<number> {
  try {
    const hours = await getGameVariable("bounty.settlement_hold_hours");
    if (Number.isFinite(hours) && hours > 0) return hours * 60 * 60 * 1000;
  } catch {}
  return 708 * 60 * 60 * 1000; // 29.5 days default
}

async function getSeasonBudget(): Promise<number | null> {
  try {
    const v = await getGameVariable("bounty.season_budget");
    return Number.isFinite(v) && v > 0 ? v : null;
  } catch {}
  return null;
}

/**
 * Pay a bounty role. The only legitimate write path for bounty rewards.
 *
 * Guards (in order):
 * 1. Separation of duties: one user filling multiple paid roles -> held.
 * 2. Season budget: payout would exceed cap -> held.
 * 3. Compare-and-swap payable -> paid (atomic; second call no-ops).
 * 4. creditPrivateTokens with idempotencyKey (DB-level duplicate guard).
 * 5. Set ledgerId, paidAt, claimableAt. Write paid event. Notify player.
 *
 * Returns: { ok: true } on payment, { ok: false, reason } on hold/skip.
 */
export async function payRole(
  roleId: number,
  opts: { actorUserId?: number | null; skipSeparationOfDuties?: boolean } = {},
): Promise<{ ok: boolean; reason?: string }> {
  const db = await getDb();
  if (!db) return { ok: false, reason: "db_unavailable" };

  // Load role and its bounty
  const [role] = await db
    .select()
    .from(bountyRoles)
    .where(eq(bountyRoles.id, roleId))
    .limit(1);
  if (!role) return { ok: false, reason: "role_not_found" };
  if (role.payStatus === "paid" || role.payStatus === "reversed" || role.payStatus === "void") {
    return { ok: false, reason: "already_settled" };
  }
  if (role.payStatus !== "payable") {
    return { ok: false, reason: `payStatus_is_${role.payStatus}` };
  }
  if (!role.userId) return { ok: false, reason: "no_user" };
  if (role.amount <= 0) return { ok: false, reason: "zero_amount" };

  const [bounty] = await db
    .select()
    .from(bounties)
    .where(eq(bounties.id, role.bountyId))
    .limit(1);
  if (!bounty) return { ok: false, reason: "bounty_not_found" };

  // Load all roles on this bounty for the separation-of-duties check
  const allRoles = await db
    .select()
    .from(bountyRoles)
    .where(eq(bountyRoles.bountyId, role.bountyId));

  // ── Guard 1: Separation of duties ──────────────────────────────────────────
  // If this user fills more than one paid role on the bounty, hold for
  // maintainer consent rather than paying automatically. skipSeparationOfDuties
  // is set by consentAndPay, where a maintainer has already reviewed the
  // conflict and explicitly approved the payout — without this bypass the guard
  // re-held the role immediately and the payout deadlocked forever.
  const paidRoles = opts.skipSeparationOfDuties ? [] : allRoles.filter(
    (r) => r.id !== roleId && r.userId === role.userId && r.payStatus !== "unfilled" && r.payStatus !== "void",
  );
  if (paidRoles.length > 0) {
    await db.update(bountyRoles).set({ payStatus: "held" }).where(eq(bountyRoles.id, roleId));
    await writeEvent(db, bounty.id, "held", {
      roleId,
      actorUserId: opts.actorUserId,
      detail: { reason: "separation_of_duties", conflictingRoles: paidRoles.map((r) => r.id) },
    });
    return { ok: false, reason: "separation_of_duties" };
  }

  // ── Guard 2: Season budget ────────────────────────────────────────────────
  const budget = await getSeasonBudget();
  if (budget !== null) {
    // db.execute returns mysql2's [rows, fields] tuple, so the rows are at
    // [0] and the single aggregate row at [0][0]. The previous
    // `const [sumRow]` unwrap bound sumRow to the rows ARRAY, whose `.total`
    // is always undefined, so `spent` was always 0 and this budget cap never
    // fired unless one role alone exceeded the whole budget.
    const budgetRes = await db.execute(sql`
      SELECT COALESCE(SUM(br.amount), 0) AS total
      FROM bounty_roles br
      JOIN bounties b ON b.id = br.bountyId
      WHERE br.payStatus IN ('paid') AND b.tokenType = ${bounty.tokenType}
    `);
    const spent = Number((budgetRes as any)?.[0]?.[0]?.total ?? 0);
    if (spent + role.amount > budget) {
      await db.update(bountyRoles).set({ payStatus: "held" }).where(eq(bountyRoles.id, roleId));
      await writeEvent(db, bounty.id, "held", {
        roleId,
        actorUserId: opts.actorUserId,
        detail: { reason: "season_budget_exceeded", budget, spent, requested: role.amount },
      });
      return { ok: false, reason: "season_budget_exceeded" };
    }
  }

  // ── Guard 3: Compare-and-swap payable -> paid ─────────────────────────────
  const result = await db
    .update(bountyRoles)
    .set({ payStatus: "paid" })
    .where(and(eq(bountyRoles.id, roleId), eq(bountyRoles.payStatus, "payable")));
  const affected = (result as unknown as { affectedRows?: number }[])[0]?.affectedRows
    ?? (result as unknown as { affectedRows?: number })?.affectedRows
    ?? 0;
  if (!affected) {
    return { ok: false, reason: "race_already_paid" };
  }

  // ── Guard 4 + 5: Credit + stamp ──────────────────────────────────────────
  const holdMs = await getSettlementHoldMs();
  const now = new Date();
  const claimableAt = new Date(now.getTime() + holdMs);
  const idempotencyKey = `bounty:${bounty.id}:${role.role}`;

  let ledgerId: number | null = null;
  try {
    ledgerId = await creditPrivateTokens({
      userId: role.userId,
      tokenType: bounty.tokenType as TokenType,
      amount: role.amount,
      source: sourceTagFor(role.role),
      sourceId: bounty.id,
      idempotencyKey,
      description: bounty.title,
    });
  } catch (err: unknown) {
    // If the unique constraint fires, another call already credited. The
    // compare-and-swap above should prevent this, but handle defensively.
    const msg = err instanceof Error ? err.message : String(err);
    if (/duplicate/i.test(msg) || /unique/i.test(msg)) {
      return { ok: false, reason: "duplicate_credit_blocked" };
    }
    throw err;
  }

  await db.update(bountyRoles).set({
    ledgerId,
    paidAt: now,
    claimableAt,
  }).where(eq(bountyRoles.id, roleId));

  await writeEvent(db, bounty.id, "paid", {
    roleId,
    actorUserId: opts.actorUserId,
    detail: { amount: role.amount, tokenType: bounty.tokenType, claimableAt: claimableAt.toISOString() },
  });

  // Notify the player
  const tokenLabel = bounty.tokenType === "rcivics" ? "$RCivics" : "$ReGen";
  const roleLabel = role.role === "proposer" ? "proposed" : role.role === "shipper" ? "shipped" : "completed";
  await db.insert(notifications).values({
    userId: role.userId,
    type: "mention",
    title: `Bounty paid: ${bounty.title.slice(0, 180)}`,
    body: `${role.amount} ${tokenLabel} credited for work you ${roleLabel}. Claimable to Base after ${claimableAt.toLocaleDateString()}.`,
    // BountyDetail is the one place this bounty is guaranteed to render;
    // the old #bounty-{id} anchor had no matching element anywhere.
    link: `/bounties/${bounty.id}`,
  });

  return { ok: true };
}

/**
 * Reverse a paid bounty role during the settlement hold window.
 *
 * Only callable by a user with canReverse. Only works while now < claimableAt
 * and payStatus = paid. Writes a compensating negative credit with source
 * `bounty_reversed` and sets payStatus = reversed.
 */
export async function reverseRole(
  roleId: number,
  reason: string,
  actorUserId: number,
): Promise<{ ok: boolean; reason?: string }> {
  const db = await getDb();
  if (!db) return { ok: false, reason: "db_unavailable" };

  const [role] = await db
    .select()
    .from(bountyRoles)
    .where(eq(bountyRoles.id, roleId))
    .limit(1);
  if (!role) return { ok: false, reason: "role_not_found" };
  if (role.payStatus !== "paid") return { ok: false, reason: `payStatus_is_${role.payStatus}` };
  if (!role.userId) return { ok: false, reason: "no_user" };
  if (!role.claimableAt) return { ok: false, reason: "no_claimable_at" };

  const now = new Date();
  if (now >= role.claimableAt) {
    return { ok: false, reason: "settlement_hold_expired" };
  }

  const [bounty] = await db
    .select({ id: bounties.id, title: bounties.title, tokenType: bounties.tokenType })
    .from(bounties)
    .where(eq(bounties.id, role.bountyId))
    .limit(1);
  if (!bounty) return { ok: false, reason: "bounty_not_found" };

  // Compare-and-swap paid -> reversed (atomic; concurrent reversal no-ops)
  const result = await db
    .update(bountyRoles)
    .set({ payStatus: "reversed" })
    .where(and(eq(bountyRoles.id, roleId), eq(bountyRoles.payStatus, "paid")));
  const affected = (result as unknown as { affectedRows?: number }[])[0]?.affectedRows
    ?? (result as unknown as { affectedRows?: number })?.affectedRows
    ?? 0;
  if (!affected) return { ok: false, reason: "race_already_reversed" };

  // Compensating debit with a distinct idempotency key
  await creditPrivateTokens({
    userId: role.userId,
    tokenType: bounty.tokenType as TokenType,
    amount: -role.amount,
    source: "bounty_reversed",
    sourceId: bounty.id,
    idempotencyKey: `bounty:${bounty.id}:${role.role}:rev`,
    description: `Reversed: ${bounty.title.slice(0, 180)} — ${reason}`,
  });

  await writeEvent(db, bounty.id, "reversed", {
    roleId,
    actorUserId,
    detail: { reason, amount: -role.amount },
  });

  // Notify the player
  const tokenLabel = bounty.tokenType === "rcivics" ? "$RCivics" : "$ReGen";
  await db.insert(notifications).values({
    userId: role.userId,
    type: "mention",
    title: `Bounty reversed: ${bounty.title.slice(0, 180)}`,
    body: `${role.amount} ${tokenLabel} has been reversed from your balance. Reason: ${reason}`,
    link: `/bounties/${bounty.id}`,
  });

  return { ok: true };
}

/**
 * Look up a bounty permission row for a user.
 */
export async function getBountyPermission(userId: number) {
  const db = await getDb();
  if (!db) return null;
  const [row] = await db
    .select()
    .from(bountyPermissions)
    .where(eq(bountyPermissions.userId, userId))
    .limit(1);
  return row ?? null;
}

/**
 * Read bounty tier amounts from game_variables. Returns delivery amount
 * and proposal amount (delivery * proposal_fraction).
 */
export async function getTierAmounts(
  tier: "trivial" | "small" | "medium" | "large",
): Promise<{ delivery: number; proposal: number }> {
  try {
    const [delivery, fraction] = await Promise.all([
      getGameVariable(`bounty.tier.${tier}.delivery`).catch(() => 0),
      getGameVariable("bounty.proposal_fraction").catch(() => 0.15),
    ]);
    return {
      delivery: Math.round(delivery),
      proposal: Math.round(delivery * fraction),
    };
  } catch {
    return { delivery: 0, proposal: 0 };
  }
}

/**
 * Check citizenship tier floor for large bounties.
 * Returns true if the user meets the minimum tier.
 */
export async function meetsLargeTierFloor(userId: number): Promise<boolean> {
  try {
    const minTierRaw = (await getGameVariable("bounty.large_tier_min").catch(() => 0));
    // game_variable is numeric; we use the value as an index into tiers
    // For now the floor defaults to 0 (explorer = everyone qualifies)
    if (!minTierRaw || minTierRaw === 0) return true;
    const tierOrder = ["explorer", "co_creator", "steward", "sage"];
    const minIdx = Number(minTierRaw);
    const db = await getDb();
    if (!db) return true;
    const [profile] = await db
      .select({ citizenshipTier: playerProfiles.citizenshipTier })
      .from(playerProfiles)
      .where(eq(playerProfiles.userId, userId))
      .limit(1);
    if (!profile?.citizenshipTier) return true;
    const userIdx = tierOrder.indexOf(profile.citizenshipTier);
    return userIdx >= minIdx;
  } catch {
    return true;
  }
}
