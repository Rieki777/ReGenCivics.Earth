/**
 * Which modules the builders' pool pays, and who built them (ADR-50).
 *
 * WHY THIS FILE EXISTS AT ALL. The module registry lives in the village
 * platform (`game-amora` `shared/modules.ts`), not here, and the hub has no
 * way to read it: a village's public documents (`/api/platform/info`,
 * `/.well-known/village.json`) publish module ids and lifecycles and nothing
 * else, deliberately, and widening them to carry prices and credits would
 * publish every village's commercial arrangements to the open internet. So the
 * hub keeps its own record of who is owed.
 *
 * That is not a workaround, it is the second human gate. `shared/networkRegistry.ts`
 * decides which villages count; this file decides which modules are payable.
 * Both are hand-edited, reviewed in git, and deterministic (STEERING section
 * 11). A village can serve any module id it likes in its manifest; if the id is
 * not here, it pays nobody.
 *
 * The two gates compose: a forged village is not on the roster, and a forged
 * module id has no builder record. Neither can be created by writing code.
 *
 * ADDING AN ENTRY. A third-party module physically arrives as a pull request to
 * the village platform, because every listing is first-party code in that
 * repository and there is no plugin runtime. So the same reviewer who merges
 * the module adds the line here, having checked in that same review that
 * `poolStatus(def)` answers `free-third-party`: somebody outside the platform
 * wrote it, it charges the village nothing, it is not withdrawn, it is not core.
 *
 * KEEPING AN ENTRY HONEST. A builder can add a price later. The village
 * platform would then report the module as `paid` on its own store card while
 * this file still called it payable, and no code here can see that happen. The
 * defence is `reviewedOn`: every statement prints it, a stale date is visible
 * to everybody reading the public page, and the commercial terms of a module
 * cannot change without a pull request to a repository this team reviews. If
 * the library ever grows past what one reviewer can hold, this becomes a real
 * problem and wants a proper attestation instead of a date.
 */

export interface ModuleBuilder {
  /** The module id exactly as villages publish it in their manifests. */
  moduleId: string;
  /** The credit line, for reading. Never a lookup key. */
  builtBy: string;
  /**
   * The builder's ReGen Civics handle, which IS the lookup key.
   *
   * Never a wallet address. Rye's ruling: a builder is paid by holding a ReGen
   * Civics account with their Hypha account and Base address linked in their
   * own profile, and the hub resolves the address from that profile when it
   * writes a statement. An address in a file is asserted by whoever edits the
   * file; a handle is asserted by the person being paid.
   *
   * Null is a real state and not a gap: the module still earns, the statement
   * records the share as accrued, and the builder can open an account later and
   * collect what waited for them.
   */
  account: string | null;
  /** The day a human last confirmed this module is free and third-party. */
  reviewedOn: string;
}

/**
 * Empty, and correct.
 *
 * All eighteen modules in the village platform today are the platform's own, so
 * none of them is pool-eligible: paying them would pay ReGen Civics out of
 * ReGen Civics' own treasury. The pool machinery ships working and owing
 * nothing, and the first line added here will be the first real one.
 */
export const MODULE_BUILDERS: readonly ModuleBuilder[] = Object.freeze([]) as readonly ModuleBuilder[];

export function moduleBuildersById(
  entries: readonly ModuleBuilder[] = MODULE_BUILDERS,
): Map<string, ModuleBuilder> {
  return new Map(entries.map((e) => [e.moduleId, e]));
}

const HANDLE = /^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])?$/;
const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Registry-shape problems, as sentences. A unit test asserts this is empty, so
 * a malformed entry fails in CI rather than at the moment somebody is owed
 * money.
 */
export function moduleBuilderProblems(
  entries: readonly ModuleBuilder[] = MODULE_BUILDERS,
): string[] {
  const problems: string[] = [];
  const seen = new Set<string>();
  for (const e of entries) {
    if (seen.has(e.moduleId)) {
      problems.push(`module "${e.moduleId}" is listed twice. One builder per module, or the pool pays it twice`);
    }
    seen.add(e.moduleId);
    if (!e.builtBy?.trim()) {
      problems.push(`module "${e.moduleId}" credits nobody. A payment needs a builder to pay`);
    }
    if (e.account !== null) {
      if (/^0x/i.test(e.account)) {
        problems.push(`module "${e.moduleId}" puts a wallet address where the ReGen Civics handle goes. The builder links their address in their own profile and the hub reads it there`);
      } else if (!HANDLE.test(e.account)) {
        problems.push(`module "${e.moduleId}" gives "${e.account}" as a ReGen Civics account. A handle is lowercase letters, digits and hyphens`);
      }
    }
    if (!ISO_DAY.test(String(e.reviewedOn ?? ""))) {
      problems.push(`module "${e.moduleId}" gives no review date in YYYY-MM-DD form. The date is the only thing standing between this list and a module that quietly started charging`);
    }
  }
  return problems;
}
