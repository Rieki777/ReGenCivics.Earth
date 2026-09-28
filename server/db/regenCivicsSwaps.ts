/**
 * Admin/server write path for regen_civics_swaps.
 *
 * Ally Steward reads confirmed rows only. There is intentionally no
 * member-facing "I swapped" endpoint in this package — ops / admin code
 * calls these helpers after verifying the swap off-platform.
 *
 * Token rows pre-fill Hypha-on-Base placeholders (counterparty, chain,
 * venue). A future bridge fills txRef / amounts; no live RPC here.
 */
import { and, eq, sql } from "drizzle-orm";
import { regenCivicsSwaps } from "../../drizzle/schema";
import { getDb } from "../db";

export const REGEN_CIVICS_COUNTERPARTY = "ReGen Civics" as const;
export const TOKEN_SWAP_CHAIN = "base" as const;
export const TOKEN_SWAP_VENUE = "hypha" as const;

export type SwapKind = "resource" | "token";
export type SwapStatus = "pending" | "confirmed" | "cancelled";
export type SwapDirection = "in" | "out" | "swap";

export type RecordResourceSwapInput = {
  userId: number;
  resourceDescription: string;
  /** When true (default), row is inserted already confirmed. */
  confirm?: boolean;
  confirmedBy?: number | null;
  notes?: string | null;
};

export type RecordTokenSwapInput = {
  userId: number;
  /** Defaults to "ReGen Civics". */
  counterparty?: string;
  chain?: string;
  venue?: string;
  txRef?: string | null;
  tokenSymbol?: string | null;
  amountIn?: string | null;
  amountOut?: string | null;
  direction?: SwapDirection | null;
  confirm?: boolean;
  confirmedBy?: number | null;
  notes?: string | null;
};

async function requireDb() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db;
}

/** Insert a resource swap. Admin/server only. */
export async function recordResourceSwap(
  input: RecordResourceSwapInput,
): Promise<number> {
  const db = await requireDb();
  const confirm = input.confirm !== false;
  const [result] = await db.insert(regenCivicsSwaps).values({
    userId: input.userId,
    swapKind: "resource",
    status: confirm ? "confirmed" : "pending",
    resourceDescription: input.resourceDescription,
    confirmedAt: confirm ? new Date() : null,
    confirmedBy: confirm ? (input.confirmedBy ?? null) : null,
    notes: input.notes ?? null,
  });
  return result.insertId;
}

/** Insert a token swap with Hypha-on-Base placeholders. Admin/server only. */
export async function recordTokenSwap(
  input: RecordTokenSwapInput,
): Promise<number> {
  const db = await requireDb();
  const confirm = input.confirm !== false;
  const [result] = await db.insert(regenCivicsSwaps).values({
    userId: input.userId,
    swapKind: "token",
    status: confirm ? "confirmed" : "pending",
    counterparty: input.counterparty ?? REGEN_CIVICS_COUNTERPARTY,
    chain: input.chain ?? TOKEN_SWAP_CHAIN,
    venue: input.venue ?? TOKEN_SWAP_VENUE,
    txRef: input.txRef ?? null,
    tokenSymbol: input.tokenSymbol ?? null,
    amountIn: input.amountIn ?? null,
    amountOut: input.amountOut ?? null,
    direction: input.direction ?? null,
    confirmedAt: confirm ? new Date() : null,
    confirmedBy: confirm ? (input.confirmedBy ?? null) : null,
    notes: input.notes ?? null,
  });
  return result.insertId;
}

/** Mark an existing swap confirmed. Admin/server only. */
export async function confirmSwap(
  swapId: number,
  confirmedBy: number,
): Promise<void> {
  const db = await requireDb();
  await db
    .update(regenCivicsSwaps)
    .set({
      status: "confirmed",
      confirmedAt: new Date(),
      confirmedBy,
    })
    .where(eq(regenCivicsSwaps.id, swapId));
}

/** True when the user has at least one confirmed swap of the given kind. */
export async function hasConfirmedSwap(
  userId: number,
  swapKind: SwapKind,
): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  const rows = await db
    .select({ id: regenCivicsSwaps.id })
    .from(regenCivicsSwaps)
    .where(
      and(
        eq(regenCivicsSwaps.userId, userId),
        eq(regenCivicsSwaps.swapKind, swapKind),
        eq(regenCivicsSwaps.status, "confirmed"),
      ),
    )
    .limit(1);

  return rows.length > 0;
}

/** Ally Steward evidence pair for a user. */
export async function getAllyStewardSwapEvidence(userId: number): Promise<{
  hasConfirmedResourceSwap: boolean;
  hasConfirmedTokenSwap: boolean;
}> {
  const [hasConfirmedResourceSwap, hasConfirmedTokenSwap] = await Promise.all([
    hasConfirmedSwap(userId, "resource"),
    hasConfirmedSwap(userId, "token"),
  ]);
  return { hasConfirmedResourceSwap, hasConfirmedTokenSwap };
}

/** Count confirmed swaps by kind (debug / admin). */
export async function countConfirmedSwaps(userId: number): Promise<{
  resource: number;
  token: number;
}> {
  const db = await getDb();
  if (!db) return { resource: 0, token: 0 };

  const rows = (await db.execute(sql`
    SELECT swapKind, COUNT(*) AS cnt
    FROM regen_civics_swaps
    WHERE userId = ${userId} AND status = 'confirmed'
    GROUP BY swapKind
  `)) as unknown as Array<{ swapKind: string; cnt: number }>;

  const list = Array.isArray(rows) ? rows : [];
  let resource = 0;
  let token = 0;
  for (const r of list) {
    if (r.swapKind === "resource") resource = Number(r.cnt);
    if (r.swapKind === "token") token = Number(r.cnt);
  }
  return { resource, token };
}
