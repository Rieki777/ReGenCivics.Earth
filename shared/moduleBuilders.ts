/**
 * The hub's ATTESTATIONS about who built a module (ADR-50, ADR-51).
 *
 * ── WHAT THIS FILE STOPPED BEING, IN ADR-51 ─────────────────────────────────
 *
 * It used to be the only place the hub could learn that a module existed, and
 * `countUsage` dropped every module id that was not in it before working out
 * the denominator. That had two costs. It excluded the platform's own modules
 * from the split, which is the failure the village platform's own pool header
 * names: excluding them "would be splitting a fixed sum among whoever remained,
 * which quietly pays third-party builders for the platform's usage as well as
 * their own". And it meant a fork inherited an EMPTY LIST and therefore a pool
 * that paid nobody, forever, until somebody hand-edited a file the fork had no
 * way to know it needed to edit.
 *
 * Provenance now travels with the module. Every village publishes, per module
 * and per cycle, who built it and whether the platform built it, and the hub
 * reads that (`shared/villageUsage.ts`). **A fork therefore inherits a working
 * pool with nothing in this file at all.**
 *
 * ── WHAT IT IS NOW: THE ONE THING A MANIFEST MAY NOT DECIDE ─────────────────
 *
 * A village runs its own code on its own database and can print any handle it
 * likes. Reading a payment instruction out of that would let any deployment
 * redirect money to a stranger by editing one JSON field. So the split is
 * decided by what villages report, and the PAYMENT is decided here.
 *
 * The asymmetry is deliberate and it is the whole design:
 *
 * - **"The platform built this"** is a claim against the claimant's own
 *   interest: it means the share recycles instead of being paid out. Nobody
 *   gains by lying that way, so a manifest saying it is taken at face value and
 *   needs no line here.
 * - **"This outside person built it, pay them"** is a claim in somebody's
 *   favour. A manifest saying it supplies a NAME and never an authority. Until
 *   a reviewed line here attests the same builder, the share is held and the
 *   statement says `unattested` next to it in words.
 *
 * ADDING AN ENTRY. A third-party module physically arrives as a pull request to
 * the village platform, because every listing is first-party code in that
 * repository and there is no plugin runtime. So the same reviewer who merges
 * the module adds the line here, having checked in that same review that the
 * module charges the village nothing, is not withdrawn, and is not core.
 *
 * KEEPING AN ENTRY HONEST. A builder can add a price later. The village
 * platform would then report the module as paid on its own store card while
 * this file still called it payable, and no code here can see that happen. The
 * defence is `reviewedOn`: every statement prints it, a stale date is visible
 * to everybody reading the public page, and the commercial terms of a module
 * cannot change without a pull request to a repository this team reviews. If
 * the library ever grows past what one reviewer can hold, this becomes a real
 * problem and wants a proper attestation instead of a date.
 */

/**
 * Which side of the pool an attestation puts a module on.
 *
 * `platform` exists so a hub can state that a module is its own BEFORE the
 * villages running it are on a build that reports provenance. It is the same
 * fact a manifest states, written by the party who would be paid rather than
 * by the party who runs the code, and it is here so that turning the recycling
 * on today is a reviewed one-line diff rather than a guess in code.
 */
export type ModuleBuilderKind = "platform" | "third-party";

export interface ModuleBuilder {
  /** The module id exactly as villages publish it in their manifests. */
  moduleId: string;
  /** Who built it, for the hub's purposes. */
  kind: ModuleBuilderKind;
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
   * collect what waited for them. It is also the only valid value on a
   * `platform` entry, which is never paid out to anybody.
   */
  account: string | null;
  /** The day a human last confirmed this module is free and third-party. */
  reviewedOn: string;
}

/**
 * Empty, and still correct.
 *
 * Every module in the village platform today is the platform's own, and none of
 * them has yet been attested here, so the pool pays nobody and recycles nothing
 * on this hub's own say-so. What changed in ADR-51 is what that emptiness now
 * COSTS: nothing. The split no longer runs through this list, so an empty file
 * means "the hub attests nothing", never "no module earned".
 */
export const MODULE_BUILDERS: readonly ModuleBuilder[] = Object.freeze([]) as readonly ModuleBuilder[];

export function moduleBuildersById(
  entries: readonly ModuleBuilder[] = MODULE_BUILDERS,
): Map<string, ModuleBuilder> {
  return new Map(entries.map((e) => [e.moduleId, e]));
}

const HANDLE = /^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])?$/;
const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

/** Whether a handle is one the hub could store and look up. Shared with the parser. */
export function isUsableHandle(handle: string | null | undefined): boolean {
  return typeof handle === "string" && HANDLE.test(handle);
}

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
    if (e.kind !== "platform" && e.kind !== "third-party") {
      problems.push(`module "${e.moduleId}" gives no builder kind. Say "platform" if this hub built it, or "third-party" if somebody outside did`);
    }
    if (!e.builtBy?.trim()) {
      problems.push(`module "${e.moduleId}" credits nobody. A payment needs a builder to pay`);
    }
    if (e.kind === "platform" && e.account !== null) {
      problems.push(`module "${e.moduleId}" is attested as the platform's own and also names an account to pay. A platform module's share recycles into the gratitude pool and is never sent to a wallet`);
    }
    if (e.account !== null) {
      if (/^0x/i.test(e.account)) {
        problems.push(`module "${e.moduleId}" puts a wallet address where the ReGen Civics handle goes. The builder links their address in their own profile and the hub reads it there`);
      } else if (!isUsableHandle(e.account)) {
        problems.push(`module "${e.moduleId}" gives "${e.account}" as a ReGen Civics account. A handle is lowercase letters, digits and hyphens`);
      }
    }
    if (!ISO_DAY.test(String(e.reviewedOn ?? ""))) {
      problems.push(`module "${e.moduleId}" gives no review date in YYYY-MM-DD form. The date is the only thing standing between this list and a module that quietly started charging`);
    }
  }
  return problems;
}
