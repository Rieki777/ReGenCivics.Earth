/**
 * A project's Village OS 1.0 file: what its stewards download from their
 * Village profile and Village OS loads as a draft for the founders to review,
 * publish and then edit (Rye, 2026-10-20; ADR-77).
 *
 * THE CONTRACT. `schema` names the shape, and Village OS's importer refuses
 * one it doesn't know. The Week 4 board's card ("regen-civics/village-card@1",
 * shared/villageOsCard.ts) rides inside as `card`, so one reader handles both.
 * A test pins the top-level keys (shared/villageFile.test.ts); change them
 * only with a new schema version, and tell the Village OS importer.
 *
 * ONLY THE STEWARDS' OWN ANSWERS GO IN (Rye's call 2). A decision a steward
 * confirmed or typed carries its value; anything else is null, which tells
 * Village OS to keep its own default. `status` lists every decision and how it
 * stands, so the importer can say what's still to answer.
 *
 * NO MONEY (Rye's call 6). No price, dues, land figure or amount appears here
 * unless the project typed it, and the money modules (exchange, redemption,
 * payments) are never switched on by this file.
 */
import { VILLAGE_CARD_SCHEMA, type VillageOsCard } from "./villageOsCard";
import { VILLAGE_DECISIONS, VILLAGE_OS_MONEY_MODULES } from "./villageDecisions";
import type { DecisionStatus, VillageProfile } from "./projectProfile";

export const VILLAGE_FILE_SCHEMA = "regen-civics/village@1";

export type VillageFile = {
  schema: typeof VILLAGE_FILE_SCHEMA;
  generatedAt: string;
  from: { site: string; project: string; applicationId: number; weeks: number[] };
  /** The Week 4 card, built from the parts the stewards confirmed. Unconfirmed parts are empty. */
  card: VillageOsCard;
  identity: {
    name: string | null;
    tagline: string | null;
    location: string | null;
    memberWord: string | null;
    timezone: string | null;
    hemisphere: string | null;
    currency: string | null;
  };
  purpose: { statement: string | null };
  membership: { covenant: string | null; entry: string | null; rite: string | null; greeterSeat: string | null; joining: string | null };
  seats: { nextHolder: string | null };
  decide: { voting: string | null; founders: string | null; stewards: string | null };
  quests: { contribution: string | null; tokenName: string | null };
  seasons: string | null;
  /** `on` is the optional modules the stewards switch on; core modules always run, money modules never come from here. */
  modules: { on: string[] | null };
  economy: { issuanceCap: number | "none" | null; poolToken: string | null };
  legal: { exitPolicy: string | null; structure: string | null; land: string | null; care: string | null };
  network: { tools: string[] };
  launch: { address: string | null };
  /** Every decision, and how it stands. */
  status: Record<string, { status: DecisionStatus; from: string | null }>;
};

const MONEY = new Set<string>(VILLAGE_OS_MONEY_MODULES);

/** The project's 1.0 file, from its profile. */
export function toVillageFile(profile: VillageProfile, opts: { now?: Date; site?: string } = {}): VillageFile {
  const by = new Map(profile.decisions.map((d) => [d.key, d]));
  const mine = <T,>(key: string): T | null => {
    const d = by.get(key);
    return d && d.status === "yours" ? (d.value as T) : null;
  };
  const text = (key: string) => {
    const v = mine<unknown>(key);
    return typeof v === "string" ? v : null;
  };

  const needs = mine<{ needs: VillageOsCard["needs"]; variables: VillageOsCard["variables"]; customNeeds: VillageOsCard["customNeeds"] }>("needs.scope");
  const circles = mine<{ circles: VillageOsCard["circles"]; needLinks: VillageOsCard["needLinks"] }>("circles.list");
  const seats = mine<{ seats: VillageOsCard["seats"] }>("seats.cards");
  const decisions = mine<{ decisions: VillageOsCard["decisions"] }>("decide.together");
  const quests = mine<{ quests: VillageOsCard["quests"] }>("quests.first");
  const tools = mine<{ tools: string[] }>("network.tools");

  const card: VillageOsCard = {
    schema: VILLAGE_CARD_SCHEMA,
    needs: needs?.needs ?? [],
    variables: needs?.variables ?? {},
    needLinks: circles?.needLinks ?? [],
    seats: seats?.seats ?? [],
    circles: circles?.circles ?? [],
    decisions: decisions?.decisions ?? { together: [], how: null, agreement: null },
    entry: text("membership.entry"),
    quests: quests?.quests ?? [],
    customNeeds: needs?.customNeeds ?? [],
    // The project's own words about its Game; Village OS keeps them as notes, never as settings.
    firstLine: profile.card.firstLine,
    players: profile.card.players,
    shape: profile.card.shape,
    from: profile.card.from,
  };

  const on = mine<string[]>("modules.on");
  const cap = mine<number | "none">("economy.issuanceCap");

  const status: VillageFile["status"] = {};
  for (const d of VILLAGE_DECISIONS) {
    const s = by.get(d.key);
    status[d.key] = { status: s?.status ?? "open", from: s?.status === "yours" ? "Your stewards" : s?.from ?? null };
  }

  return {
    schema: VILLAGE_FILE_SCHEMA,
    generatedAt: (opts.now ?? new Date()).toISOString(),
    from: { site: opts.site ?? profile.card.from.site, project: profile.card.from.project, applicationId: profile.applicationId, weeks: [...profile.weeks] },
    card,
    identity: {
      name: text("identity.name"),
      tagline: text("identity.tagline"),
      location: text("identity.location"),
      memberWord: text("identity.memberWord"),
      timezone: text("identity.timezone"),
      hemisphere: text("identity.hemisphere"),
      currency: text("identity.currency"),
    },
    purpose: { statement: text("purpose.statement") },
    membership: {
      covenant: text("membership.covenant"),
      entry: text("membership.entry"),
      rite: text("membership.rite"),
      greeterSeat: text("membership.greeter"),
      joining: text("membership.joining"),
    },
    seats: { nextHolder: text("seats.nextHolder") },
    decide: { voting: text("decide.voting"), founders: text("decide.founders"), stewards: text("decide.stewards") },
    quests: { contribution: text("quests.contribution"), tokenName: text("quests.tokenName") },
    seasons: text("seasons.year"),
    modules: { on: Array.isArray(on) ? on.filter((k) => !MONEY.has(k)) : null },
    economy: { issuanceCap: cap === "none" || typeof cap === "number" ? cap : null, poolToken: text("economy.poolToken") },
    legal: { exitPolicy: text("legal.exitPolicy"), structure: text("legal.structure"), land: text("legal.land"), care: text("legal.care") },
    network: { tools: tools?.tools ?? [] },
    launch: { address: text("launch.address") },
    status,
  };
}

/** The file as the text the page downloads and copies. */
export function villageFileText(file: VillageFile): string {
  return JSON.stringify(file, null, 2);
}

/** A file name for the download: "templeofroots-com-village-os-1.0.json". */
export function villageFileName(project: string): string {
  const slug = project.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "village";
  return `${slug}-village-os-1.0.json`;
}
