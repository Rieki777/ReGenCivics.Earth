/**
 * The $ReGen builders' pool: the arithmetic, as pure functions (ADR-50, ADR-51).
 *
 * ReGen Civics pays a pool of $ReGen each lunar cycle, split across the modules
 * villages are actually running. A builder who charges for a module bills the
 * village directly and is out of the pool by construction, so the economic
 * incentive points at keeping modules free.
 *
 * ── WHAT CHANGED IN ADR-51, AND WHY IT HAD TO ───────────────────────────────
 *
 * This file used to split the pool by HOW MANY VILLAGES RAN A MODULE, a binary
 * count, and it dropped any module without a hub builder record before working
 * out the denominator, so platform-built modules never entered it at all.
 *
 * Both halves were wrong, and the village platform's own pool header had
 * already written down why: excluding the platform's modules "would be
 * splitting a fixed sum among whoever remained, which quietly pays third-party
 * builders for the platform's usage as well as their own". Module Library
 * Contract clause 14 promises payment "proportional to how many members open
 * it", which a village count is not. And the founder ruled it (R64):
 *
 *   "regen civics built modules pay out regen civics but have it go to the
 *    regen civics gratitude pool as the Game tokens $ReGen ... so that outside
 *    module builders are treated the same as regen civics core team acting on
 *    equal footing. One day a new organisation could spin up and have created
 *    more modules in the Games than groups are using than us and get more of
 *    the revenue."
 *
 * So: the weight is REACH, every village's own count of the members who opened
 * the module divided by its active members and capped at one; platform-built
 * modules are IN the denominator on the same footing as anybody else; and their
 * share is RECYCLED rather than paid, into the ReGen Civics gratitude pool,
 * where the community gives it out.
 *
 * **The model is meant to be losable.** Another organisation whose modules are
 * opened by more members earns more than ReGen Civics does, out of the same
 * pool, by the same arithmetic. Nothing in this file gives the platform a
 * privileged rate, an exemption, or a floor, and nothing in it assumes ReGen
 * Civics is permanently the centre.
 *
 * Pure by design: no database, no clock, no network. Everything the statement
 * job learns from the world it passes in, so a statement can be recomputed from
 * its own snapshot years later and produce the same numbers.
 */

/** Below this, a transfer can cost the treasury more than it carries. */
export const POOL_DUST_FLOOR = 1;

/**
 * PROPOSED, and not enforced anywhere yet (design doc D6).
 *
 * The v1 behaviour is simpler and is what the job actually does: an unpayable
 * share rolls into the next cycle's pool and is re-split by that cycle's usage.
 * There is no per-builder escrow, so there is nothing for a timer to expire.
 *
 * Kept as a named number so the proposal has one home, and deliberately not
 * read by the job or published by the router: a rule the code does not enforce
 * must not be served to anybody as though it were the rule.
 */
export const PROPOSED_ACCRUAL_CYCLES = 3;

/**
 * Why a share is not being paid out to a builder this cycle.
 *
 * The `no-...` reasons are reported separately and never merged, because they
 * have different fixes: one builder needs to link an address they already have,
 * the other needs to open an account. Telling both of them the same thing at
 * the moment they are owed money is how a builder gives up.
 */
export type PoolPaymentState =
  | "payable"
  /**
   * The platform built it. It earned on the same measure as everybody else and
   * its share goes back into the ReGen Civics gratitude pool to be given out
   * (R64). Not a refusal and not a shortfall: it is the model working.
   */
  | "recycled"
  /**
   * A village's manifest names a third-party builder the hub has no reviewed
   * record of. The share is HELD, never sent. A village runs its own code on
   * its own database and can print any handle it likes; paying on that alone
   * would let any deployment redirect a payment to a stranger by editing one
   * JSON field. The fix is a reviewed line in the hub's builder registry, and
   * `moduleBuilderProblems` names what that line has to carry.
   */
  | "unattested"
  | "no-account"
  | "no-address"
  | "unusable-address"
  | "below-floor";

/** The states that mean somebody is owed and nobody could be paid. */
export const ACCRUING_STATES: readonly PoolPaymentState[] = Object.freeze([
  "unattested",
  "no-account",
  "no-address",
  "unusable-address",
]);

export function isAccruingState(state: PoolPaymentState): boolean {
  return ACCRUING_STATES.includes(state);
}

export interface PoolUsage {
  moduleId: string;
  /**
   * THE WEIGHT, and the whole of the change in ADR-51.
   *
   * The sum, across every village that answered, of that village's own
   * `membersReached / activeMembers` for this module, each capped at 1.0 by the
   * village before it leaves. One village can therefore contribute at most one
   * village's worth of weight however many members it invents, which is the
   * only defence a hub has against a fork printing its own numbers.
   *
   * Not an integer. A module opened by three of four members in one village
   * carries 0.75.
   */
  reach: number;
  /** Members who opened it, summed. Reported to a reader, never a denominator. */
  membersReached: number;
  /** Villages that contributed any reach. Reported, and no longer the weight. */
  villages: number;
  /**
   * Built by the platform running this hub. Earns on the same footing; its
   * share recycles instead of being sent.
   */
  platformBuilt: boolean;
  /** The credit line from the registry or the village manifest. Never a lookup key. */
  builtBy: string | null;
  /** The builder's ReGen Civics handle, the lookup key. */
  builtByAccount: string | null;
  /**
   * A reviewed hub record attests this builder. False means the only source for
   * the handle is a village's own manifest, which is not enough to pay on.
   * Meaningless for a platform-built module, which is never paid out at all.
   */
  attested: boolean;
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
   * What the platform's own modules earned, going to the ReGen Civics gratitude
   * pool rather than to anybody's wallet (R64). Published, because the point of
   * the rule is that a village or an author can SEE the platform's share going
   * back in rather than into a pocket.
   */
  recycled: number;
  /**
   * Flooring dust and sub-floor shares. Belongs to nobody, is never minted,
   * and never rolls.
   * `pool + carryIn = paid + accrued + recycled + unallocated` always.
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

  // A module nobody opened draws nothing. `> 0` and not `>= 0`, so a module
  // that is switched on everywhere and opened by nobody earns nothing: the
  // meter rejects installation as a measure and this is where that lands.
  const counted = params.usage.filter((u) => u.reach > 0);
  const totalReach = counted.reduce((sum, u) => sum + u.reach, 0);

  if (totalReach <= 0 || available <= 0) {
    return {
      totals: { pool, carryIn, paid: 0, accrued: 0, recycled: 0, unallocated: available },
      lines: [],
    };
  }

  let paid = 0;
  let accrued = 0;
  let recycled = 0;

  const lines: PoolShareLine[] = counted.map((u) => {
    const rawShare = (u.reach / totalReach) * available;
    const amount = Math.floor(rawShare);
    const identity = params.identities.get(u.moduleId);

    let state: PoolPaymentState;
    let address: string | null = null;

    if (amount < floor) {
      // Checked FIRST. A share too small to send is too small to send whoever
      // the builder is, and reporting it as "no address" would send a builder
      // off to fix an account that was never the reason.
      state = "below-floor";
    } else if (u.platformBuilt) {
      // Checked SECOND, before every builder-identity question, because none of
      // them applies: nobody is looked up, no address is resolved, and the
      // platform is never told to go and link a wallet. R64 says this share
      // goes to the gratitude pool, and it goes there whether or not the
      // platform happens to hold an account.
      state = "recycled";
    } else if (!u.attested) {
      state = "unattested";
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
    else if (state === "recycled") recycled += amount;
    else if (state !== "below-floor") accrued += amount;

    return { ...u, rawShare, amount, state, address };
  });

  lines.sort((a, b) => b.amount - a.amount || a.moduleId.localeCompare(b.moduleId));

  return {
    totals: { pool, carryIn, paid, accrued, recycled, unallocated: available - paid - accrued - recycled },
    lines,
  };
}

/**
 * The one identity a reader can check by addition, stated as code so a test can
 * assert it rather than a comment promising it.
 */
export function statementBalances(totals: PoolStatementTotals): boolean {
  return (
    totals.pool + totals.carryIn ===
    totals.paid + totals.accrued + totals.recycled + totals.unallocated
  );
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
 *
 * `v: 2` because ADR-51 changed what the inputs ARE. A v1 digest was taken over
 * village counts and a usage list with no reach in it, so a v1 and a v2 digest
 * over the same cycle are not comparable and must not silently look it.
 */
export function statementSnapshotInput(params: {
  cycleNumber: number;
  pool: number;
  carryIn: number;
  dustFloor: number;
  villages: readonly {
    id: string;
    instanceId: string | null;
    state: string;
    cycleId: string | null;
    sealed: boolean;
    activeMembers: number;
    modules: readonly string[];
  }[];
  usage: readonly PoolUsage[];
}): string {
  return JSON.stringify({
    v: 2,
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
        cycleId: v.cycleId,
        sealed: v.sealed,
        activeMembers: v.activeMembers,
        modules: [...v.modules].sort(),
      })),
    usage: [...params.usage]
      .sort((a, b) => a.moduleId.localeCompare(b.moduleId))
      .map((u) => ({
        moduleId: u.moduleId,
        // Fixed to six places so a float that reprints differently on another
        // Node build cannot change a published digest.
        reach: u.reach.toFixed(6),
        membersReached: u.membersReached,
        villages: u.villages,
        platformBuilt: u.platformBuilt,
        builtBy: u.builtBy,
        builtByAccount: u.builtByAccount,
        attested: u.attested,
      })),
  });
}

/** The CSV a treasury tool consumes. Payable lines only: this file is a to-do list. */
export function statementCsv(statement: PoolStatement, cycleNumber: number): string {
  const rows = [["cycle", "moduleId", "builder", "account", "address", "reach", "membersReached", "amountRegen"]];
  for (const line of statement.lines) {
    if (line.state !== "payable") continue;
    rows.push([
      String(cycleNumber),
      line.moduleId,
      line.builtBy ?? "",
      line.builtByAccount ?? "",
      line.address ?? "",
      line.reach.toFixed(6),
      String(line.membersReached),
      String(line.amount),
    ]);
  }
  return rows.map((r) => r.map(csvCell).join(",")).join("\n") + "\n";
}

/** RFC 4180 quoting. A builder's name is free text and can hold a comma. */
function csvCell(value: string): string {
  return /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}
