/**
 * Reading what a village says about module usage, and refusing the rest.
 *
 * Every village serves `GET /api/platform/module-usage`. It is the only place
 * reach exists: the village counts the members who opened each module during a
 * lunar cycle, divides by its own active members, caps the result at one, and
 * publishes counts with no member in them. `/api/platform/info` carries module
 * ids and a lifecycle word and NOTHING about how much anything was used, which
 * is why splitting a pool from it was splitting by installation.
 *
 * ── THIS FILE IS A BOUNDARY, AND IT IS THE ONLY ONE ─────────────────────────
 *
 * A village runs its own code on its own database. It can print any number it
 * likes. The three things standing between that and a wrong payment are all
 * here:
 *
 * 1. **The cap.** A village's contribution to any module is at most 1.0, so
 *    inventing members inflates the denominator as fast as the numerator. This
 *    file re-imposes the cap rather than trusting that the village applied it,
 *    because a rule enforced only at the other end of a network call is a habit
 *    rather than a rule.
 * 2. **The cycle.** A report for a cycle other than the one being settled, or
 *    for a cycle the village has not sealed, is refused. An open cycle's numbers
 *    are still moving, and settling against a moving number pays somebody for
 *    a total that changed after the transfer.
 * 3. **Provenance is trusted in ONE DIRECTION ONLY.** A village saying "the
 *    platform built this" is a claim against the claimant's own interest: it
 *    means the share recycles instead of being paid, so nobody gains by lying
 *    that way, and it is taken at face value. A village saying "this outside
 *    person built it, pay them" is a claim in somebody's favour, and it is
 *    taken as a NAME and never as a payment instruction. Money needs a reviewed
 *    line in the hub's own registry as well.
 *
 * Nothing here parses a member, an id, or a name. If a future report starts
 * carrying one, this file is where it must be dropped.
 *
 * ── WHAT THIS DELIBERATELY DOES NOT READ, MEASURED OFF THE LIVE ENDPOINT ────
 *
 * The report carries more than this file consumes (checked against Amora
 * 2026-08-29, `protocol: "module-usage/1"`). Each omission is a decision:
 *
 * - **`disposition`**, the village's own settlement verdict for the module
 *   ("recycled", and so on). NOT READ, and this is the whole point of the
 *   boundary. The hub decides what happens to a share; a village that could
 *   hand down a settlement word would be governing the pool from the Game side,
 *   which the founder ruled against. It is a useful cross-check for a human
 *   comparing the two statements and it is never an input.
 * - **`proof`** (`alg: ed25519`, `kid`, `signedAt`, `signature`) and
 *   **`protocol`**. NOT VERIFIED, and not claimed to be. Checking a signature
 *   needs the village's public key and the exact bytes it was taken over, and
 *   this hub has neither. Inventing a canonicalisation would produce a check
 *   that passes on anything, which is worse than no check because it reads like
 *   one. The report is trusted exactly as far as the cap and the one-directional
 *   provenance rule below allow, and no further, whether or not it is signed.
 * - **`builtByNamespace`**. Not read, because nothing in the hub resolves a
 *   namespace yet; `builtByAccount` is the lookup key and a second identifier
 *   with no resolver would be a second thing to keep true.
 * - **per-module `activeMembers`**. Not read: `reach` already divides by it,
 *   and a hub that re-derived the fraction could disagree with the village
 *   about a number the village is the authority on.
 *
 * ── WHAT IS MISSING IS SAID, NEVER FILLED IN ────────────────────────────────
 *
 * A village on an older build serves the report without provenance on it. This
 * reader does not guess a default: it records `provenance: "unstated"`, the
 * module still earns its share, and the share is held under a state that names
 * the reason. A fallback here would be a claim about who built somebody else's
 * code, decided by whichever value happened to be convenient.
 */
import type { PoolUsage } from "./modulePool";
import { isUsableHandle, type ModuleBuilder } from "./moduleBuilders";

/** The per-module line a village publishes. */
export interface VillageModuleUsage {
  moduleId: string;
  /** Members of THIS village who opened the module in the cycle. */
  membersReached: number;
  /** `membersReached / activeMembers`, capped at 1 by the village and again here. */
  reach: number;
  /** The credit line, for reading. Never a lookup key, never a payment instruction. */
  builtBy: string | null;
  /** The builder's ReGen Civics handle, as the village states it. A name, not an authority. */
  builtByAccount: string | null;
  /**
   * "platform" and "third-party" are the village's own statement. "unstated"
   * means the report carried no provenance for this module at all, which is
   * what an older village build looks like, and is not the same fact as either.
   */
  provenance: "platform" | "third-party" | "unstated";
  /**
   * Whether the village says this listing may draw from the pool at all.
   *
   * Module Library Contract clause 14: "a listing that declares `pricing` is
   * not pool-eligible", because a paid module is already being paid by the
   * villages running it and paying it again out of a common pool would have
   * every village funding a product only some of them use. The hub cannot see a
   * price; this field is the only signal it gets, and until the village started
   * sending it the hub was counting priced modules into the denominator and
   * diluting everybody else.
   *
   * `null` is a real answer meaning the report said nothing, which is what an
   * older build looks like, and is NOT the same fact as `false`.
   */
  poolEligible: boolean | null;
}

/** One village's whole answer, after this file has finished refusing things. */
export interface VillageUsageReport {
  instanceId: string | null;
  cycleId: string;
  cycleNumber: number;
  sealed: boolean;
  /** When the village sealed the cycle, if it said. Null is a real answer. */
  sealedAt: string | null;
  activeMembers: number;
  modules: VillageModuleUsage[];
}

/** Why a report was refused, as a sentence somebody can act on. */
export interface VillageUsageRefusal {
  ok: false;
  reason: string;
}

export type VillageUsageParse = ({ ok: true } & { report: VillageUsageReport }) | VillageUsageRefusal;

/**
 * The cycle id every village and this hub agree on: `lunar-` and the number of
 * whole lunations since the Meeus reference new moon, zero padded to six.
 *
 * Both sides compute it from the same epoch and the same synodic month
 * (`shared/lunar.ts` here is a verbatim port of the village's). This function
 * and `parseVillageCycleId` are the only place the string form is made or read,
 * for the reason the village platform learned the hard way: a second spelling
 * of one cycle id, written into the same column, split one lunation's ledger in
 * two and a settlement silently read only half of it.
 */
export function formatVillageCycleId(cycleNumber: number): string {
  return `lunar-${String(cycleNumber).padStart(6, "0")}`;
}

/** The number inside a `lunar-NNNNNN` id, or null if it is not one. */
export function parseVillageCycleId(cycleId: string): number | null {
  const m = /^lunar-(\d{1,9})$/.exec(cycleId);
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isSafeInteger(n) ? n : null;
}

const MAX_MODULES = 500;
const MAX_ID_LENGTH = 80;

function finiteNumber(value: unknown): number | null {
  const n = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  return Number.isFinite(n) ? n : null;
}

/**
 * Read one village's usage report for one cycle, or say why it cannot be used.
 *
 * `expectedCycleNumber` is the cycle being settled. A report for any other
 * cycle is refused rather than counted, because a village answering about last
 * month while the hub settles this one produces a statement whose inputs nobody
 * can reconstruct from the cycle number printed on it.
 */
export function readVillageUsage(
  body: unknown,
  expectedCycleNumber: number,
): VillageUsageParse {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { ok: false, reason: "the report is not a JSON object" };
  }
  const b = body as Record<string, unknown>;

  const cycleId = typeof b.cycleId === "string" ? b.cycleId : "";
  const cycleNumber = parseVillageCycleId(cycleId);
  if (cycleNumber === null) {
    return {
      ok: false,
      reason: `the report names cycle "${cycleId.slice(0, 40)}", which is not a lunar-NNNNNN id this hub can place`,
    };
  }
  if (cycleNumber !== expectedCycleNumber) {
    return {
      ok: false,
      reason: `the report is for cycle ${cycleNumber} and this statement settles cycle ${expectedCycleNumber}`,
    };
  }

  // Read as a strict true. An older build that omits the field, or one that
  // answers with a string, is NOT sealed as far as this hub is concerned.
  const sealed = b.sealed === true;
  if (!sealed) {
    return {
      ok: false,
      reason: `the village has not sealed cycle ${cycleNumber}. An open cycle's numbers are still moving and a statement settled against one pays against a total that changes afterwards`,
    };
  }

  const activeMembers = finiteNumber(b.activeMembers);
  if (activeMembers === null || activeMembers < 0) {
    return { ok: false, reason: "the report carries no usable count of active members" };
  }

  const rawModules = Array.isArray(b.modules) ? b.modules : null;
  if (!rawModules) {
    return { ok: false, reason: "the report carries no modules array" };
  }
  if (rawModules.length > MAX_MODULES) {
    return { ok: false, reason: `the report lists ${rawModules.length} modules, past the ${MAX_MODULES} this hub will read` };
  }

  const modules: VillageModuleUsage[] = [];
  const seen = new Set<string>();
  for (const raw of rawModules) {
    if (!raw || typeof raw !== "object") continue;
    const m = raw as Record<string, unknown>;

    const moduleId = typeof m.moduleId === "string" ? m.moduleId.trim() : "";
    if (!moduleId || moduleId.length > MAX_ID_LENGTH) continue;
    // A module listed twice would be counted twice. The first line wins and the
    // rest are dropped, the same way the village's own report is built from a
    // set rather than a list.
    if (seen.has(moduleId)) continue;
    seen.add(moduleId);

    const membersReached = finiteNumber(m.membersReached);
    const rawReach = finiteNumber(m.reach);
    if (membersReached === null || membersReached < 0) continue;
    if (rawReach === null || rawReach < 0) continue;

    // THE CAP, re-imposed. The village applies it too, and the village's own
    // header calls it "the whole anti-inflation argument", but a cap that only
    // exists at the other end of a network call is not a cap this hub holds.
    const reach = Math.min(1, rawReach);

    const builtBy = typeof m.builtBy === "string" && m.builtBy.trim() ? m.builtBy.trim().slice(0, 200) : null;
    const builtByAccount =
      typeof m.builtByAccount === "string" && m.builtByAccount.trim()
        ? m.builtByAccount.trim().toLowerCase().slice(0, 40)
        : null;

    let provenance: VillageModuleUsage["provenance"];
    if (m.platformBuilt === true) provenance = "platform";
    else if (m.platformBuilt === false) provenance = "third-party";
    else provenance = "unstated";

    // Strict booleans. Anything else, including the string "false", is read as
    // "the report did not say", because a field this decides money on must not
    // be answered by a coercion.
    const poolEligible = m.poolEligible === true ? true : m.poolEligible === false ? false : null;

    modules.push({ moduleId, membersReached, reach, builtBy, builtByAccount, provenance, poolEligible });
  }

  modules.sort((a, b2) => (a.moduleId < b2.moduleId ? -1 : a.moduleId > b2.moduleId ? 1 : 0));

  return {
    ok: true,
    report: {
      instanceId: typeof b.instanceId === "string" ? b.instanceId.slice(0, MAX_ID_LENGTH) : null,
      cycleId,
      cycleNumber,
      sealed,
      sealedAt: typeof b.sealedAt === "string" ? b.sealedAt.slice(0, 40) : null,
      activeMembers,
      modules,
    },
  };
}

/**
 * How many of a report's modules said anything about who built them.
 *
 * Reported rather than inferred, because "no module stated its provenance" and
 * "every module said the platform built it" produce very different statements
 * and an operator needs to be able to tell them apart at a glance.
 */
export function provenanceCoverage(report: VillageUsageReport): { stated: number; unstated: number } {
  let stated = 0;
  let unstated = 0;
  for (const m of report.modules) {
    if (m.provenance === "unstated") unstated++;
    else stated++;
  }
  return { stated, unstated };
}

/* ─── Turning village answers into one cycle's usage ────────────────────── */

/** One roster village's contribution, plus how it answered. */
export interface CountedVillage {
  id: string;
  /** `ok` answered, `carried` reused its last answer, `absent` contributed nothing. */
  state: "ok" | "carried" | "absent";
  report: VillageUsageReport | null;
}

/**
 * Sum every counting village's reach per module, and decide what the hub is
 * willing to say about who built each one.
 *
 * THE DENOMINATOR INCLUDES EVERYTHING ANY VILLAGE OPENED. A module the hub has
 * never heard of, a module nobody has attested, and the platform's own modules
 * all enter the split on the same footing. Dropping any of them would hand
 * their share to whoever remained, which is the failure R64 and the village
 * platform's own header both name, and it is what the previous version of this
 * split did to every platform module.
 *
 * PROVENANCE RESOLUTION, in order, and the order is the argument:
 *
 * 1. **A hub attestation wins.** It was written by a reviewer of this hub, in
 *    a diff, against a module they checked. Nothing a village serves overrides
 *    it in either direction.
 * 2. **A village saying the platform built it is believed.** It costs the
 *    village's own side of the ledger nothing and costs the claimed builder a
 *    payment, so it is a claim nobody profits from making falsely.
 * 3. **A village naming an outside builder supplies the NAME only.** The line
 *    carries the credit so a reader can see who is owed, and `attested` stays
 *    false so the money waits for a reviewed line rather than moving on the
 *    say-so of the deployment that would benefit.
 * 4. **Silence stays silence.** `unstated` is carried through as an unattested
 *    line with no credit on it, never as "third-party" and never as "ours".
 *
 * Villages disagreeing about who built one module is possible and is not
 * resolved by majority: any village calling a module the platform's own makes
 * it recycle, because the only thing that claim can do is take a payment away.
 */
export function mergeVillageUsage(
  villages: readonly CountedVillage[],
  attestations: ReadonlyMap<string, ModuleBuilder>,
): PoolUsage[] {
  const acc = new Map<
    string,
    {
      reach: number; membersReached: number; villages: number;
      claimedPlatform: boolean; claimedBuiltBy: string | null; claimedAccount: string | null;
      saidEligible: boolean; saidIneligible: boolean;
    }
  >();

  for (const village of villages) {
    if (village.state === "absent" || !village.report) continue;
    for (const m of village.report.modules) {
      const row = acc.get(m.moduleId) ?? {
        reach: 0,
        membersReached: 0,
        villages: 0,
        claimedPlatform: false,
        claimedBuiltBy: null as string | null,
        claimedAccount: null as string | null,
        saidEligible: false,
        saidIneligible: false,
      };
      if (m.poolEligible === true) row.saidEligible = true;
      if (m.poolEligible === false) row.saidIneligible = true;
      row.reach += m.reach;
      row.membersReached += m.membersReached;
      if (m.reach > 0) row.villages += 1;
      if (m.provenance === "platform") row.claimedPlatform = true;
      if (m.provenance === "third-party") {
        row.claimedBuiltBy = row.claimedBuiltBy ?? m.builtBy;
        // Only a handle the hub could actually look up is carried forward. A
        // malformed one is dropped here rather than travelling as far as a
        // database lookup that would never match anything.
        if (row.claimedAccount === null && isUsableHandle(m.builtByAccount)) {
          row.claimedAccount = m.builtByAccount;
        }
      }
      acc.set(m.moduleId, row);
    }
  }

  const out: PoolUsage[] = [];
  for (const [moduleId, row] of acc) {
    /*
     * CLAUSE 14: a listing that declares a price is out of the pool by
     * construction, so it must leave the DENOMINATOR and not merely go unpaid.
     * Leaving it in dilutes every free module by the reach of something that is
     * already being paid by the villages running it.
     *
     * The rule is UNANIMITY AMONG THOSE THAT SPEAK, and that is deliberate.
     * Removing a module from the denominator raises everybody else's share,
     * including the remover's own favourites, so unlike "the platform built
     * this" it is a claim a village could profit from. Requiring that no
     * village contradicts it means a single honest deployment keeps a module
     * in, and disagreement is impossible in practice anyway: every listing is
     * first-party code in one repository, so its price is the same fact
     * everywhere.
     *
     * Silence is NOT ineligibility. A village on a build that predates the
     * field says nothing about any of its modules, and reading that as "priced"
     * would drop every module it runs out of the split and zero its builders.
     * Silence keeps today's behaviour, which is that the module is counted; it
     * is still never PAID without an attestation.
     */
    if (row.saidIneligible && !row.saidEligible) continue;
    const attested = attestations.get(moduleId);
    if (attested) {
      out.push({
        moduleId,
        reach: row.reach,
        membersReached: row.membersReached,
        villages: row.villages,
        platformBuilt: attested.kind === "platform",
        builtBy: attested.builtBy,
        builtByAccount: attested.account,
        attested: true,
      });
      continue;
    }
    out.push({
      moduleId,
      reach: row.reach,
      membersReached: row.membersReached,
      villages: row.villages,
      platformBuilt: row.claimedPlatform,
      builtBy: row.claimedBuiltBy,
      builtByAccount: row.claimedAccount,
      attested: false,
    });
  }

  out.sort((a, b) => (a.moduleId < b.moduleId ? -1 : a.moduleId > b.moduleId ? 1 : 0));
  return out;
}
