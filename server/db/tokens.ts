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
 *
 * ── THE ISSUANCE MODEL. READ THIS BEFORE BUILDING ANY EARNING FEATURE ───────
 *
 * R92, the founder, 2026-08-29: "ReGen Civics mints on transfer with all
 * actions and so do these Games. We may add a different function later to mint
 * from a treasury but that will be a future optional setting."
 *
 * THE HUB MINTS ON TRANSFER, and `creditPrivateTokens` is where that happens.
 * A private token comes into existence at the moment somebody is credited. No
 * account is debited to fund it, no supply is drawn down, and there is no
 * pre-issued pool of tokens waiting to be handed out. The function below takes
 * a userId and an amount and inserts a row. That is the whole issuance
 * mechanism, and its being that simple is the design rather than an oversight.
 *
 * SO A "POOL" IN THIS CODEBASE IS A CEILING ON ISSUANCE AND NEVER A BALANCE.
 * `pool.regen_per_cycle`, `gratitude_cycles.poolPerCycle` and
 * `bounty.season_budget` each cap how much may be created in a period. None of
 * them is an account, none of them is decremented by a payment, and reading one
 * as a balance is the mistake this paragraph exists to stop. What a pool leaves
 * unspent is never minted, so it is never lost either.
 *
 * THE HUB MINTS NOTHING ON CHAIN, and the two facts sit together without
 * conflict. `server/blockchain.ts` opens with "Read-only Base blockchain
 * queries, no wallet, no signing" and that invariant holds: this repository
 * holds no key and signs nothing. On-chain $ReGen is issued when a Hypha space
 * executes a proposal, which is a decision made by that space's own members.
 * The two halves join at the claim bridge, where `players.requestClaim` debits
 * the private ledger and Hypha issues the on-chain token.
 *
 * A TREASURY HOLDING ALREADY-ISSUED TOKENS IS A LATER, OPTIONAL SETTING. R92
 * says so in as many words. Nothing here assumes one exists, nothing checks a
 * treasury balance before crediting, and no feature should be built on the
 * assumption that one is coming. `server/tokenMintModel.test.ts` fails the day
 * one appears without this comment changing with it.
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

/**
 * Sources whose credits are RESTRICTED: visible to the holder, counted in the
 * private balance, and NOT claimable to Base.
 *
 * Why this exists. `players.requestClaim` takes a list of token types and no
 * amount, and claims the whole private balance for each one. Crowdpool $RCivics
 * is issued at contribution so a contributor can see where they stand
 * immediately, but the money behind it can still be refunded until the campaigns
 * they routed to close. Without this set, a contributor holding restricted
 * crowdpool $RCivics beside any ordinary $RCivics would sweep both to Base in a
 * single claim, on a bridge that is one-way by design. The refund would then be
 * owed against tokens that had already left the platform.
 *
 * A restriction lifts by writing a compensating ledger row, never by editing
 * history: credit the same amount under an unrestricted source and debit it here.
 * That keeps the ledger append-only and leaves the reason visible.
 *
 * Add a source here the moment it can be reversed, not the moment somebody
 * remembers to.
 */
// Typed as a plain readonly array rather than `as const`, so the emptiness guard
// in getRestrictedBalance stays meaningful. With `as const` the compiler knows the
// length literally and calls the guard dead code, which is exactly the guard you
// want alive the day someone empties this list: `source IN ()` is invalid SQL.
export const RESTRICTED_CREDIT_SOURCES: readonly string[] = [
  "crowdpool_contribution",
];

/**
 * The part of a private balance that cannot be claimed, computed FROM THE LEDGER
 * rather than cached in a column.
 *
 * That choice is deliberate and it is the sibling repo's most expensive lesson:
 * a stored number that is meant to agree with the ledger is a number that can
 * disagree with it, and when they disagree the ledger is right and the cache is
 * a silent bug. Claims are rare, so the scan costs nothing that matters.
 */
export async function getRestrictedBalance(
  userId: number,
  tokenType: TokenType,
): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  if (RESTRICTED_CREDIT_SOURCES.length === 0) return 0;

  const [row]: any = await db.execute(sql`
    SELECT COALESCE(SUM(amount), 0) AS restricted
    FROM user_token_ledger
    WHERE userId = ${userId}
      AND tokenType = ${tokenType}
      AND source IN (${sql.join(RESTRICTED_CREDIT_SOURCES.map((s) => sql`${s}`), sql`, `)})
  `);
  const raw = Array.isArray(row) ? row[0]?.restricted : row?.restricted;
  const restricted = Number(raw ?? 0);
  // A restricted total can only reduce what is claimable. If compensating rows
  // ever drive it negative, treat it as zero rather than handing the holder
  // MORE than their private balance.
  return Number.isFinite(restricted) && restricted > 0 ? restricted : 0;
}

/**
 * What the holder may actually claim to Base: their private balance less
 * anything still restricted. Never negative.
 */
export async function getClaimableBalance(
  userId: number,
  tokenType: TokenType,
  privateBalance: number,
): Promise<number> {
  const restricted = await getRestrictedBalance(userId, tokenType);
  return Math.max(0, (privateBalance ?? 0) - restricted);
}

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
  idempotencyKey?: string | null;
}): Promise<number | null> {
  const { userId, tokenType, amount, source, sourceId, sourceRef, tenantId, description, idempotencyKey } = params;
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
    // The idempotencyKey unique constraint makes duplicate bounty credits
    // physically impossible at the DB layer even if application logic races.
    await tx.insert(userTokenLedger).values({
      userId,
      tokenType,
      amount,
      source,
      sourceId: sourceId ?? null,
      sourceRef: sourceRef ?? null,
      tenantId: tenantId ?? null,
      description: description ?? null,
      idempotencyKey: idempotencyKey ?? null,
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
