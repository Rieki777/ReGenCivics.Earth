/**
 * Private token ledger (all four tokens).
 *
 * First domain extracted from the monolithic server/db.ts per
 * FIXES_TO_MAKE_2026-04-25_world-class.md item 26. Re-exported from
 * server/db.ts so existing import paths continue to work.
 *
 * Why this is its own module: every credit/debit on the private ledger
 * touches the security-critical path (transaction wrap, ledger sum
 * recompute, no public-balance writes). Pulling it out of the 3500-line
 * mega-file makes that contract reviewable on its own.
 *
 * Architecture rules (also in .ai/docs/STEERING.md section 5):
 *   - Reads (game logic) use TOTAL = private + public.
 *   - Writes (credits AND debits) only touch the private ledger.
 *   - Spend limit checks use PRIVATE only.
 *   - One-way flow private -> public via the Hypha claim bridge.
 */

import { desc, eq, sql } from "drizzle-orm";
import { getDb } from "../db";
import { playerProfiles, userTokenLedger } from "../../drizzle/schema";

export type TokenType = "rcvoice" | "rgvoice" | "rcivics" | "regen";

/**
 * Source tag for ledger writes. Kept as a free string so callers can add
 * new sources (harvest, grant, expense, migrated_from_*, etc) without
 * editing this union.
 */
export type CreditSource = string;

const TOKEN_TO_PROFILE_COLUMN: Record<TokenType, string> = {
  rcvoice: "rcvoicePrivate",
  rgvoice: "rgvoicePrivate",
  rcivics: "rcivicsPrivate",
  regen: "regenPrivate",
};

/**
 * Credit (or debit if amount is negative) the user's private token ledger
 * for one of the four tokens. Writes an audit row to user_token_ledger and
 * recomputes the matching private balance column on player_profiles inside
 * a single SQL transaction so the two stay in sync.
 *
 * Returns the new private balance after the credit. If the user has no
 * player_profiles row the helper still writes the ledger entry (so the
 * audit trail is complete) but skips the column bump, and returns null.
 * Once the user creates a profile the column cache rebuilds from the
 * ledger sum on the next credit.
 */
export async function creditPrivateTokens(params: {
  userId: number;
  tokenType: TokenType;
  amount: number;
  source: CreditSource;
  sourceId?: number | null;
  sourceRef?: string | null;
  tenantId?: number | null;
  description?: string | null;
}): Promise<number | null> {
  const { userId, tokenType, amount, source, sourceId, sourceRef, tenantId, description } = params;
  if (amount === 0) return null;
  const db = await getDb();
  if (!db) return null;

  const column = TOKEN_TO_PROFILE_COLUMN[tokenType];

  // Wrap the ledger insert + cache update in a single transaction so two
  // concurrent calls cannot race the column read/write, and a failure
  // partway through cannot leave the ledger and cache out of sync. The
  // cache is recomputed deterministically from the ledger sum (rather
  // than additive arithmetic), which also self-heals any prior drift.
  return db.transaction(async (tx) => {
    // Always write the audit entry first. This way the ledger history
    // is preserved even for users who have no player_profiles row yet
    // (e.g., they signed up but never completed profile creation).
    await tx.insert(userTokenLedger).values({
      userId,
      tokenType,
      amount,
      source,
      sourceId: sourceId ?? null,
      sourceRef: sourceRef ?? null,
      tenantId: tenantId ?? null,
      description: description ?? null,
    });

    const [profile] = await tx
      .select()
      .from(playerProfiles)
      .where(eq(playerProfiles.userId, userId))
      .limit(1);
    if (!profile) {
      console.warn(
        `[tokens] creditPrivateTokens: no profile for user ${userId}, ledger row written but column cache not updated`,
      );
      return null;
    }

    // Recompute the cache from the ledger sum (deterministic). If a prior
    // call landed a ledger row but failed before updating the cache, this
    // call corrects the divergence.
    await tx.execute(sql`
      UPDATE player_profiles
      SET ${sql.identifier(column)} = (
        SELECT COALESCE(SUM(amount), 0) FROM user_token_ledger
        WHERE userId = ${userId} AND tokenType = ${tokenType}
      )
      WHERE userId = ${userId}
    `);

    const [updated] = await tx
      .select()
      .from(playerProfiles)
      .where(eq(playerProfiles.userId, userId))
      .limit(1);
    return (updated as Record<string, unknown> | undefined)?.[column] as number | null ?? null;
  });
}

/**
 * Read the full private-ledger history for a user (newest first). Used by
 * the profile dialog to show where the tokens came from.
 */
export async function getUserTokenLedger(userId: number, limit = 100) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(userTokenLedger)
    .where(eq(userTokenLedger.userId, userId))
    .orderBy(desc(userTokenLedger.createdAt))
    .limit(limit);
}
