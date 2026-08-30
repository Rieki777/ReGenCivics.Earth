/**
 * The ready gate (response doc §12).
 *
 * Pure functions, so the rules are testable without a database and are
 * identical for the web, the Telegram bot, and any future API. The one rule
 * that must never bend: `ready` is a state a human passes an item through. No
 * importer, webhook, model or cron assigns it. These helpers only ever say
 * whether a human MAY promote; they never promote anything themselves.
 */
import { createHash } from "crypto";

export type BrainState =
  | "raw"
  | "shaped"
  | "ready"
  | "in_flight"
  | "done_claimed"
  | "done"
  | "parked";

export type BrainKind =
  | "unsorted"
  | "create"
  | "build"
  | "todo"
  | "ask"
  | "decide"
  | "material";

/**
 * Legal next states. `done` is reachable from `ready`/`in_flight` because a
 * to-do is often just done, and reopening (`done` → `in_flight`) is one tap
 * because the Opus triage that closed 529 items got at least one wrong (17.14).
 */
const NEXT: Record<BrainState, BrainState[]> = {
  raw: ["shaped", "parked"],
  shaped: ["ready", "raw", "parked"],
  ready: ["in_flight", "shaped", "parked", "done"],
  in_flight: ["done_claimed", "done", "ready", "parked"],
  done_claimed: ["done", "in_flight", "parked"],
  done: ["in_flight"],
  parked: ["raw", "shaped"],
};

export function canTransition(from: BrainState, to: BrainState): boolean {
  return NEXT[from]?.includes(to) ?? false;
}

export interface GateView {
  kind: BrainKind | string;
  ask: string | null;
  doneWhen: string | null;
  repo: string | null;
  surface: string | null;
  trust: "owner" | "external" | string;
}

/**
 * Empty array means the owner may promote. Every string is shown to Rye
 * verbatim, on the web and in the bot, so they are written to be read.
 */
export function promotionBlockers(item: GateView): string[] {
  const out: string[] = [];
  if (item.trust === "external") {
    out.push("external source: rewrite the ask in your own words first");
  }
  if (!item.ask?.trim()) out.push("missing ask");
  if (!item.doneWhen?.trim()) out.push("missing done_when");
  if (item.kind === "unsorted") out.push("missing kind");
  if (item.kind === "build" && !item.repo?.trim()) out.push("missing repo");
  return out;
}

/**
 * The receipt: a hash of exactly the fields a session acts on. Editing the body
 * does not invalidate readiness; editing the ask, done_when, repo or surface
 * does, so a session that embedded the hash can tell the item moved under it.
 */
export function readyHash(
  item: Pick<GateView, "ask" | "doneWhen" | "repo" | "surface">,
): string {
  // NUL separator, not a space: with a space, ask="a b" / doneWhen="c" would
  // hash identically to ask="a" / doneWhen="b c", and two different items
  // would share one receipt. Written as an escape so the file stays ASCII.
  return createHash("sha256")
    .update(
      [item.ask ?? "", item.doneWhen ?? "", item.repo ?? "", item.surface ?? ""].join(
        "\u0000",
      ),
    )
    .digest("hex");
}

/** The fields whose edit demotes a `ready` item back to `shaped`. */
export const GATED_FIELDS = ["ask", "doneWhen", "repo", "surface"] as const;
export type GatedField = (typeof GATED_FIELDS)[number];
