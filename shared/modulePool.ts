/**
 * The $ReGen builders' pool: the arithmetic, as pure functions (ADR-50).
 *
 * ReGen Civics pays a pool of $ReGen each lunar cycle, split across the free
 * third-party modules villages are actually running. A builder who charges for
 * a module bills the village directly and is out of the pool by construction,
 * so the economic incentive points at keeping modules free.
 *
 * THIS FILE COPIES `computePoolShares` in `server/lib/gratitude-cycles.ts`, on
 * purpose. The hub already runs a proportional pool on a lunar cycle and Rye
 * asked to reuse it. Same proportional split, same `Math.floor`, same rule that
 * the pool is a ceiling on issuance and never a promise to issue.
 *
 * Pure by design: no database, no clock, no network. Everything the statement
 * job learns from the world it passes in, so a statement can be recomputed from
 * its own snapshot years later and produce the same numbers.
 */

/** Below this, a transfer can cost the treasury more than it carries. */
export const POOL_DUST_FLOOR = 1;

/** How many cycles an unpayable share waits before it lapses to the treasury. */
export const POOL_ACCRUAL_CYCLES = 3;

/**
 * Why a share is not being paid out this cycle.
 *
 * The two `no-...` reasons are reported separately and never merged, because
 * they have different fixes: one builder needs to link an address they already
 * have, the other needs to open an account. Telling both of them the same thing
 * at the moment they are owed money is how a builder gives up.
 */
export type PoolPaymentState =
  | "payable"
  | "no-account"
  | "no-address"
  | "unusable-address"
  | "below-floor";

export interface PoolUsage {
  moduleId: string;
  /** Roster villages running this module at members or above. */
  villages: number;
  /** The credit line from the registry. Never a lookup key. */
  builtBy: string | null;
  /** The builder's ReGen Civics handle, the lookup key. */
  builtByAccount: string | null;
}

/** What the hub found when it looked the builder up. */
export interface PoolIdentity {
  /** Null where the handle resolved to nobody. */
  userId: number | null;
  /** Null where the profile carries no usable Base address. */
  address: string | null;
}

export interface PoolShareLine extends PoolUsage {
  /** Exact share before flooring, kept for audit the way gratitude keeps it. */
  rawShare: number;
  /** Whole $ReGen this module earned this cycle. */
  amount: number;
  state: PoolPaymentState;
  /** Present only where the state is `payable`. */
  address: string | null;
}

export interface PoolStatementTotals {
  /** The cycle's own pool, from `pool.regen_per_cycle`. */
  pool: number;
  /** Accruals carried in from earlier cycles. */
  carryIn: number;
  /** Sum of the lines a human will actually send. */
  paid: number;
  /** Sum of the lines owed to a named builder with nowhere to send them. */
  accrued: number;
  /**
   * Flooring dust and sub-floor shares. Belongs to nobody, is never minted,
   * and never rolls. `pool + carryIn = paid + accrued + unallocated` always.
   */
  unallocated: number;
}

export interface PoolStatement {
  totals: PoolStatementTotals;
  lines: PoolShareLine[];
}

const BASE_ADDRESS = /^0x[0-9a-fA-F]{40}$/;

/**
 * A Base address, checked for shape.
 *
 * The hub checks this itself rather than trusting the column, because the
 * profile write path has never validated it: `linkBaseAccount` accepts
 * `z.string().min(1)` and the only other guard anywhere in the payout path is a
 * `startsWith("0x")`, which `"0xzz"` passes. An address that fails here is
 * reported as unpayable rather than handed to a human as if it were good.
 */
export function isUsableBaseAddress(address: string | null | undefined): boolean {
  return typeof address === "string" && BASE_ADDRESS.test(address.trim());
}

/**
 * The cycle statement's arithmetic.
 *
 * `identities` maps a module id to what the hub found when it resolved that
 * module's builder handle. A module id absent from the map is a module whose
 * registry entry named no account at all, which lands in `no-account` the same
 * way an unresolvable handle does: from the treasury's side both mean there is
 * nobody to pay.
 *
 * Ordering: lines come back sorted by amount descending then module id, so two
 * runs over the same snapshot produce byte-identical output regardless of the
 * order the roster answered in.
 */
export function computeStatement(params: {
  pool: number;
  carryIn?: number;
  usage: readonly PoolUsage[];
  identities: ReadonlyMap<string, PoolIdentity>;
  dustFloor?: number;
}): PoolStatement {
  const pool = Math.max(0, Math.floor(params.pool));
  const carryIn = Math.max(0, Math.floor(params.carryIn ?? 0));
  const floor = params.dustFloor ?? POOL_DUST_FLOOR;
  const available = pool + carryIn;

  const counted = params.usage.filter((u) => u.villages > 0);
  const totalVillages = counted.reduce((sum, u) => sum + u.villages, 0);

  if (totalVillages <= 0 || available <= 0) {
    return {
      totals: { pool, carryIn, paid: 0, accrued: 0, unallocated: available },
      lines: [],
    };
  }

  let paid = 0;
  let accrued = 0;

  const lines: PoolShareLine[] = counted.map((u) => {
    const rawShare = (u.villages / totalVillages) * available;
    const amount = Math.floor(rawShare);
    const identity = params.identities.get(u.moduleId);

    let state: PoolPaymentState;
    let address: string | null = null;

    if (amount < floor) {
      // Checked FIRST. A share too small to send is too small to send whoever
      // the builder is, and reporting it as "no address" would send a builder
      // off to fix an account that was never the reason.
      state = "below-floor";
    } else if (!u.builtByAccount || !identity || identity.userId === null) {
      state = "no-account";
    } else if (!identity.address) {
      state = "no-address";
    } else if (!isUsableBaseAddress(identity.address)) {
      state = "unusable-address";
    } else {
      state = "payable";
      address = identity.address.trim();
    }

    if (state === "payable") paid += amount;
    else if (state !== "below-floor") accrued += amount;

    return { ...u, rawShare, amount, state, address };
  });

  lines.sort((a, b) => b.amount - a.amount || a.moduleId.localeCompare(b.moduleId));

  return {
    totals: { pool, carryIn, paid, accrued, unallocated: available - paid - accrued },
    lines,
  };
}

/**
 * The one identity a reader can check by addition, stated as code so a test can
 * assert it rather than a comment promising it.
 */
export function statementBalances(totals: PoolStatementTotals): boolean {
  return totals.pool + totals.carryIn === totals.paid + totals.accrued + totals.unallocated;
}

/**
 * A stable fingerprint of everything that went INTO a statement.
 *
 * Two runs over the same inputs produce the same digest, and any change to the
 * roster, the counts, the pool, the carry or the resolved identities changes
 * it. That is what makes a published statement checkable by somebody who was
 * not there: they can rebuild the inputs, hash them, and compare.
 *
 * Canonical by construction: keys are written in a fixed order and every list
 * is sorted, so a statement never depends on the order villages answered in.
 * The digest itself is computed by the caller (node:crypto is not available to
 * every consumer of `shared/`); this function's job is to produce the exact
 * bytes to hash.
 */
export function statementSnapshotInput(params: {
  cycleNumber: number;
  pool: number;
  carryIn: number;
  dustFloor: number;
  villages: readonly { id: string; instanceId: string | null; state: string; modules: readonly string[] }[];
  usage: readonly PoolUsage[];
}): string {
  return JSON.stringify({
    v: 1,
    cycleNumber: params.cycleNumber,
    pool: params.pool,
    carryIn: params.carryIn,
    dustFloor: params.dustFloor,
    villages: [...params.villages]
      .sort((a, b) => a.id.localeCompare(b.id))
      .map((v) => ({
        id: v.id,
        instanceId: v.instanceId,
        state: v.state,
        modules: [...v.modules].sort(),
      })),
    usage: [...params.usage]
      .sort((a, b) => a.moduleId.localeCompare(b.moduleId))
      .map((u) => ({
        moduleId: u.moduleId,
        villages: u.villages,
        builtBy: u.builtBy,
        builtByAccount: u.builtByAccount,
      })),
  });
}

/** The CSV a treasury tool consumes. Payable lines only: this file is a to-do list. */
export function statementCsv(statement: PoolStatement, cycleNumber: number): string {
  const rows = [["cycle", "moduleId", "builder", "account", "address", "villages", "amountRegen"]];
  for (const line of statement.lines) {
    if (line.state !== "payable") continue;
    rows.push([
      String(cycleNumber),
      line.moduleId,
      line.builtBy ?? "",
      line.builtByAccount ?? "",
      line.address ?? "",
      String(line.villages),
      String(line.amount),
    ]);
  }
  return rows.map((r) => r.map(csvCell).join(",")).join("\n") + "\n";
}

/** RFC 4180 quoting. A builder's name is free text and can hold a comma. */
function csvCell(value: string): string {
  return /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}
