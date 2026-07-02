/**
 * Church of the Regenerative Earth (CORE) payment permissions.
 *
 * Steward payment rights are DATA-DRIVEN. The only source of truth is
 * the `church_role_holders` table, never hardcoded names or user IDs. This lets
 * the community grant and revoke rights through governance over time without a
 * code change. A holder is active when `revokedAt IS NULL`; a user may hold more
 * than one active row, and the effective right is the OR across them.
 *
 * These helpers are the server-side gate for every church payment mutation.
 * Never trust the client. See ADR-18 and STEERING section 2.
 */
import { and, eq, isNull } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { churchRoleHolders } from "../../drizzle/schema";

export type ChurchRoleSummary = {
  roles: Array<"steward">;
  canAcceptPayments: boolean;
  canMakePayments: boolean;
  holderRows: number;
};

/** Active (non-revoked) church roles + effective payment rights for a user. */
export async function getChurchRolesForUser(userId: number): Promise<ChurchRoleSummary> {
  const empty: ChurchRoleSummary = { roles: [], canAcceptPayments: false, canMakePayments: false, holderRows: 0 };
  if (!userId) return empty;
  const db = await getDb();
  if (!db) return empty;

  const rows = await db
    .select()
    .from(churchRoleHolders)
    .where(and(eq(churchRoleHolders.userId, userId), isNull(churchRoleHolders.revokedAt)));

  if (rows.length === 0) return empty;

  const roles = Array.from(new Set(rows.map((r) => r.role)));
  return {
    roles,
    canAcceptPayments: rows.some((r) => r.canAcceptPayments === 1),
    canMakePayments: rows.some((r) => r.canMakePayments === 1),
    holderRows: rows.length,
  };
}

/** Throw FORBIDDEN unless the user may accept payments on behalf of the church. */
export async function assertCanAcceptPayments(userId: number): Promise<void> {
  const summary = await getChurchRolesForUser(userId);
  if (!summary.canAcceptPayments) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You do not have the right to accept payments for the church.",
    });
  }
}

/** Throw FORBIDDEN unless the user may make payments on behalf of the church. */
export async function assertCanMakePayments(userId: number): Promise<void> {
  const summary = await getChurchRolesForUser(userId);
  if (!summary.canMakePayments) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You do not have the right to make payments for the church.",
    });
  }
}
