/**
 * Character sheet shared by /profile and /crowd-pooling.
 *
 * Village OS owns the character. ReGen Civics owns gifts. Gifts stay in
 * `saved_contributions`. This module does not open a second ledger, and it
 * does not call the network.
 *
 * SEAM FOR A LATER PUBLIC-PROFILE PULL
 *
 * A future pull is one-way, the same direction as docs/CROWDPOOL_HUB_CONTRACT.md:
 * this app may read a public profile and writes nothing back. Match the member
 * by the Hypha identity already stored on `player_profiles` (`baseAccountName`
 * or `hyphaProfileUrl`). `characterFromPublicProfile` is the only door.
 *
 * The pull may copy `archetypeKey`, `partyKeys`, `portraitUrl`, and
 * `displayName`. When the village sends both `stageIndex` and `stageCount`,
 * the maturity arc can draw. It must not copy a token balance, open powers,
 * or a wallet. Sending the gift total back would be a contract change and
 * must not mint.
 */

import { CAPITAL_TYPES, type CapitalType } from "./capitals";
import { CAPITAL_LABELS } from "./crowdpoolingTaxonomy";
import { ARCHETYPE_KEYS, ARCHETYPES, type ArchetypeKey } from "./archetypes";

export interface VillagePublicProfile {
  archetypeKey: string;
  partyKeys: string[];
  /** URL the village will serve. Never a caller-supplied filesystem path. */
  portraitUrl: string | null;
  displayName: string;
  stageIndex?: number;
  stageCount?: number;
}

export type PortraitPresentation = "f" | "m";

/**
 * The six capitals on the "How gifts pool" diagram.
 * Everyday words sit under the capital name: Living is land, Material is
 * equipment, Financial is money, Experiential is skills and roles.
 * Intellectual, Spiritual, and Health stay off the diagram. A gift in one
 * of those still appears as a record row.
 */
export const POOL_CAPITALS = [
  "living",
  "material",
  "financial",
  "experiential",
  "social",
  "cultural",
] as const satisfies readonly CapitalType[];

export const POOL_EVERYDAY: Record<(typeof POOL_CAPITALS)[number], string | null> = {
  living: "Land",
  material: "Equipment",
  financial: "Money",
  experiential: "Skills and roles",
  social: null,
  cultural: null,
};

const CIRCUMFERENCE = 2 * Math.PI * 122;

export function isArchetypeKey(key: string): key is ArchetypeKey {
  return (ARCHETYPE_KEYS as readonly string[]).includes(key);
}

export function archetypeByKey(key: string | null | undefined) {
  if (!key) return null;
  return ARCHETYPES.find((a) => a.key === key) ?? null;
}

/** Illustrated class portrait. Null until the member picks one. */
export function classPortraitSrc(key: string | null | undefined, presentation: string | null | undefined): string | null {
  if (!key || !isArchetypeKey(key)) return null;
  if (presentation !== "f" && presentation !== "m") return null;
  return `/images/avatars/${key}-${presentation}-olive.webp`;
}

/**
 * The arc is the ladder drawn round the face.
 * Both numbers have to be known. A missing rung draws nothing.
 * `(index + 1) / count` counts the rung the member is standing on.
 */
export function maturityArc(stageIndex: number | null | undefined, stageCount: number | null | undefined): number | null {
  if (typeof stageIndex !== "number" || typeof stageCount !== "number") return null;
  if (!Number.isFinite(stageIndex) || !Number.isFinite(stageCount) || stageCount <= 0) return null;
  return Math.max(0, Math.min(1, (stageIndex + 1) / stageCount));
}

export function arcDash(arc: number | null): { circumference: number; offset: number } | null {
  if (arc === null) return null;
  return { circumference: CIRCUMFERENCE, offset: CIRCUMFERENCE * (1 - arc) };
}

export function parsePartyKeys(value: unknown): string[] {
  let raw = value;
  if (typeof value === "string") {
    try {
      raw = JSON.parse(value);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(raw)) return [];
  const out: string[] = [];
  for (const key of raw) {
    if (typeof key === "string" && isArchetypeKey(key) && !out.includes(key)) out.push(key);
  }
  return out;
}

export function normalizeCharacterChoice(input: {
  primaryArchetypeKey: string | null;
  partyArchetypeKeys: string[];
  portraitPresentation?: string | null;
}): {
  primaryArchetypeKey: string | null;
  partyArchetypeKeys: string[];
  portraitPresentation: PortraitPresentation | null;
} {
  const primary = input.primaryArchetypeKey && isArchetypeKey(input.primaryArchetypeKey)
    ? input.primaryArchetypeKey
    : null;
  const party: string[] = [];
  const ordered = [...(primary ? [primary] : []), ...input.partyArchetypeKeys];
  for (const key of ordered) {
    if (typeof key !== "string" || !isArchetypeKey(key) || party.includes(key)) continue;
    party.push(key);
    if (party.length === ARCHETYPE_KEYS.length) break;
  }
  const portrait = input.portraitPresentation === "f" || input.portraitPresentation === "m"
    ? input.portraitPresentation
    : null;
  return {
    primaryArchetypeKey: primary && party.includes(primary) ? primary : (party[0] ?? null),
    partyArchetypeKeys: party,
    portraitPresentation: portrait,
  };
}

/** Copy onto a gift-map save only when the profile already has a real class. */
export function archetypeKeyForSave(key: string | null | undefined): string | null {
  if (!key || !isArchetypeKey(key)) return null;
  return key;
}

/**
 * Map a future Village OS public profile onto the local character fields.
 * Drops unknown keys. Does not read balances, powers, or wallets, because
 * those fields are not on the type.
 */
export function characterFromPublicProfile(profile: VillagePublicProfile) {
  const choice = normalizeCharacterChoice({
    primaryArchetypeKey: profile.archetypeKey,
    partyArchetypeKeys: profile.partyKeys ?? [],
  });
  const stageIndex = typeof profile.stageIndex === "number" ? profile.stageIndex : null;
  const stageCount = typeof profile.stageCount === "number" ? profile.stageCount : null;
  return {
    ...choice,
    displayName: typeof profile.displayName === "string" ? profile.displayName.trim() : "",
    portraitUrl: typeof profile.portraitUrl === "string" && profile.portraitUrl.trim() ? profile.portraitUrl.trim() : null,
    arc: maturityArc(stageIndex, stageCount),
  };
}

export type GiftDraft = {
  capital: string;
  description: string;
  value: number;
  kind: "gift" | "role";
};

export type GiftLine = {
  capital: CapitalType;
  label: string;
  description: string;
  value: number;
  kind: "gift" | "role";
};

function isCapital(value: string): value is CapitalType {
  return (CAPITAL_TYPES as readonly string[]).includes(value);
}

function quietSentence(labels: string[]): string {
  if (labels.length === 0) return "";
  if (labels.length === 1) return `${labels[0]} has nothing on this sheet yet.`;
  const last = labels[labels.length - 1];
  return `${labels.slice(0, -1).join(", ")} and ${last} have nothing on this sheet yet.`;
}

/**
 * Record rows from gifts the member entered. Zero values are dropped.
 * Capitals with nothing are one quiet line, never a zero scoreboard.
 */
export function buildGiftRecord(items: GiftDraft[]) {
  const lines: GiftLine[] = [];
  for (const item of items) {
    if (!isCapital(item.capital)) continue;
    if (typeof item.value !== "number" || !Number.isFinite(item.value) || item.value <= 0) continue;
    const description = item.description.trim();
    lines.push({
      capital: item.capital,
      label: CAPITAL_LABELS[item.capital].label,
      description: description || CAPITAL_LABELS[item.capital].label,
      value: item.value,
      kind: item.kind,
    });
  }
  const used = new Set(lines.map((line) => line.capital));
  const quietLabels = POOL_CAPITALS
    .filter((capital) => !used.has(capital))
    .map((capital) => CAPITAL_LABELS[capital].label);
  const brings = lines.reduce((sum, line) => sum + line.value, 0);
  const giftCount = lines.filter((line) => line.kind === "gift").length;
  const roleCount = lines.filter((line) => line.kind === "role").length;
  const empty = lines.length === 0;
  return {
    lines,
    quietLine: empty ? "" : quietSentence(quietLabels),
    brings,
    giftCount,
    roleCount,
    empty,
  };
}

export type StandingFigures = {
  brings: number | null;
  gifts: number | null;
  roles: number | null;
};

/** Hide the row until a figure is actually above zero. Unread stays null. */
export function visibleStanding(standing: StandingFigures): { brings?: number; gifts?: number; roles?: number } | null {
  const brings = typeof standing.brings === "number" && standing.brings > 0 ? standing.brings : undefined;
  const gifts = typeof standing.gifts === "number" && standing.gifts > 0 ? standing.gifts : undefined;
  const roles = typeof standing.roles === "number" && standing.roles > 0 ? standing.roles : undefined;
  if (brings === undefined && gifts === undefined && roles === undefined) return null;
  return {
    ...(brings !== undefined ? { brings } : {}),
    ...(gifts !== undefined ? { gifts } : {}),
    ...(roles !== undefined ? { roles } : {}),
  };
}

export function standingFromRecord(record: { brings: number; giftCount: number; roleCount: number; empty: boolean } | null): StandingFigures {
  if (!record || record.empty) return { brings: null, gifts: null, roles: null };
  return {
    brings: record.brings > 0 ? record.brings : null,
    gifts: record.giftCount > 0 ? record.giftCount : null,
    roles: record.roleCount > 0 ? record.roleCount : null,
  };
}
