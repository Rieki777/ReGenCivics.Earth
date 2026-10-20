/**
 * A project's Village OS 1.0 file: what its stewards download from their
 * Village profile, for Village OS to load as a draft its founders review,
 * publish and then edit (Rye, 2026-10-20; ADR-77).
 *
 * THE CONTRACT. `schema` names the shape, and Village OS's importer (built in
 * the village-os repo, "Start from your ReGen Civics profile") is to refuse
 * one it doesn't know. The Week 4 board's card shape
 * ("regen-civics/village-card@1", shared/villageOsCard.ts) rides inside as
 * `card`, assembled from the parts the stewards kept, so one reader handles
 * both. shared/projectProfile.test.ts pins the top-level keys; change them
 * only with a new schema version, and tell the Village OS importer.
 *
 * ONLY THE STEWARDS' OWN ANSWERS GO IN (Rye's call 2). A decision a steward
 * kept or wrote carries its value; anything else is null or empty, which
 * tells Village OS to keep its own default. Links inside the card point only
 * at human needs the stewards kept, because Village OS links a seat, circle
 * or quest only to a human need the village has taken on. `status` lists
 * every decision and how it stands, so the importer can say what's still
 * open. `notes` carries the stewards' words for the decisions the founders
 * set by hand in Village OS (`lands: "note"` in shared/villageDecisions.ts).
 *
 * NO MONEY (Rye's call 6). No price, dues, land figure or amount appears here
 * unless the project typed it, and the modules that move or raise money
 * (VILLAGE_OS_MONEY_MODULES) are never switched on by this file.
 */
import { VILLAGE_CARD_SCHEMA, type VillageOsCard } from "./villageOsCard";
import { CAP_KEEP_DEFAULT, VILLAGE_DECISIONS, VILLAGE_OS_MONEY_MODULES } from "./villageDecisions";
import { decisionLines, type DecisionStatus, type VillageProfile } from "./projectProfile";

export const VILLAGE_FILE_SCHEMA = "regen-civics/village@1";

export type VillageFile = {
  schema: typeof VILLAGE_FILE_SCHEMA;
  generatedAt: string;
  from: { site: string; project: string; applicationId: number; weeks: number[] };
  /** The Week 4 card's shape, from the parts the stewards kept. Parts nobody kept are empty. */
  card: VillageOsCard;
  /** Settings Village OS sets from the file. */
  identity: {
    name: string | null;
    tagline: string | null;
    location: string | null;
    memberWord: string | null;
    timezone: string | null;
    hemisphere: "north" | "south" | null;
    currency: string | null;
  };
  /** Only the optional modules the stewards switch on; core modules always run, money modules never come from here. */
  modules: { on: string[] | null };
  /** A whole number of tokens, or "declined" (keep Village OS's 10,000, as the founders' choice). */
  economy: { issuanceCap: number | typeof CAP_KEEP_DEFAULT | null };
  /** Words for Village OS's own editors, for the founders to read and save. */
  purpose: { statement: string | null };
  membership: { covenant: string | null };
  quests: { tokenName: string | null };
  legal: { exitPolicy: string | null };
  /** The stewards' words for what the founders set by hand, by decision key. */
  notes: Record<string, { title: string; text: string }>;
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

  // Village OS links only to a human need the village has taken on: keep the links inside the kept human needs.
  const inScope = new Set((needs?.needs ?? []).map((n) => n.needKey));
  const card: VillageOsCard = {
    schema: VILLAGE_CARD_SCHEMA,
    needs: needs?.needs ?? [],
    variables: needs?.variables ?? {},
    needLinks: (circles?.needLinks ?? []).filter((l) => inScope.has(l.needKey)),
    seats: (seats?.seats ?? []).map((s) => ({ ...s, needLinks: s.needLinks.filter((l) => inScope.has(l.needKey)) })),
    circles: (circles?.circles ?? []).map((c) => ({ ...c, needs: c.needs.filter((n) => inScope.has(n)) })),
    decisions: decisions?.decisions ?? { together: [], how: null, agreement: null },
    entry: text("membership.entry"),
    quests: (quests?.quests ?? []).map((q) => ({ ...q, need: q.need && inScope.has(q.need) ? q.need : null })),
    customNeeds: needs?.customNeeds ?? [],
    // The board's first line, players and shape are nobody's kept answer, so they stay out.
    firstLine: null,
    players: { toStart: null, now: null },
    shape: { shape: null, line: null },
    from: { ...profile.card.from },
  };

  const on = mine<string[]>("modules.on");
  const cap = mine<number | string>("economy.issuanceCap");
  const hemisphere = text("identity.hemisphere");

  const notes: VillageFile["notes"] = {};
  const status: VillageFile["status"] = {};
  for (const d of VILLAGE_DECISIONS) {
    const s = by.get(d.key);
    status[d.key] = { status: s?.status ?? "open", from: s?.status === "yours" ? "Your stewards" : s?.from ?? null };
    if (d.lands === "note" && s?.status === "yours") {
      const words = decisionLines(d, s.value).join("\n\n");
      if (words) notes[d.key] = { title: d.title, text: words };
    }
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
      hemisphere: hemisphere === "north" || hemisphere === "south" ? hemisphere : null,
      currency: text("identity.currency"),
    },
    modules: { on: Array.isArray(on) ? on.filter((k) => !MONEY.has(k)) : null },
    economy: { issuanceCap: cap === CAP_KEEP_DEFAULT ? CAP_KEEP_DEFAULT : typeof cap === "number" ? cap : null },
    purpose: { statement: text("purpose.statement") },
    membership: { covenant: text("membership.covenant") },
    quests: { tokenName: text("quests.tokenName") },
    legal: { exitPolicy: text("legal.exitPolicy") },
    notes,
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
