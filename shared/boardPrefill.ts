/**
 * What the presenter card can take from an incubator application and its
 * campaign. Only fields those records actually store. Anything else stays
 * blank, and a value already on the card is left alone (see `prefillWrites`).
 */
import { cleanRepoUrl } from "./interopTools";
import { isCurrentReadinessKey } from "./crowdpoolReadiness";
import {
  BOARD_LIMITS,
  PROJECT_PHASES,
  cleanBoardLine,
  cleanBoardText,
  type ProjectPhase,
} from "./sessionBoard";

export const PREFILL_FIELDS = ["place", "url", "phase", "whereNow", "ready", "pain"] as const;
export type PrefillField = (typeof PREFILL_FIELDS)[number];

/** Stored on a prefilled pain chip so the room can see where it came from. */
export const PREFILL_ITEM_NAME = "From the application";

export const PREFILL_NOTE = "Filled from the Season 2 application. Edit anything that isn't right.";

const LAND_HELD = new Set(["owned", "leased", "committed"]);

const LAND_LINE: Record<string, string> = {
  owned: "The land is owned",
  leased: "The land is leased",
  committed: "The land is promised or under contract",
  seeking: "Still looking for land",
};

/** A legal-structure answer that does not name one. */
const LEGAL_EMPTY = new Set(["none", "n/a", "na", "no", "not yet", "seeking", "unknown", "-", "tbd"]);

export type PrefillApplication = {
  projectName: string;
  location?: string | null;
  country?: string | null;
  landStatus?: string | null;
  projectSizeHectares?: number | null;
  currentPeopleCount?: number | null;
  currentHouseholdCount?: number | null;
  teamSize?: number | null;
  teamDescription?: string | null;
  regenerativePractices?: string | null;
  websiteUrl?: string | null;
};

export type PrefillCampaign = {
  currentPhase?: string | null;
  legalStructure?: string | null;
  landStatus?: string | null;
  landSize?: string | null;
  housingPlans?: string | null;
  foodSystems?: string | null;
  waterSystems?: string | null;
  energySystems?: string | null;
  challenges?: string | null;
  teamSize?: number | null;
  teamDescription?: string | null;
  regenerativePractices?: string | null;
  websiteUrl?: string | null;
};

export type PrefillRecord = {
  application: PrefillApplication;
  /** The campaign linked to that application, when there is one. */
  campaign?: PrefillCampaign | null;
  /**
   * Readiness keys a steward ticked on that campaign. When this list is
   * non-empty it is the whole set: inferred checks are not added beside it.
   */
  readinessTicks?: readonly string[] | null;
};

export type BoardPrefill = {
  place?: string;
  url?: string;
  phase?: ProjectPhase;
  whereNow?: string;
  ready?: string[];
  pain?: string;
};

export type BoardCardSnapshot = {
  place: string | null;
  url: string | null;
  phase: string | null;
  whereNow: string | null;
  ready: readonly string[];
  painCount: number;
};

const blank = (v: string | null | undefined): boolean => !v || !v.trim();

function line(raw: string | null | undefined, max: number): string | null {
  return cleanBoardLine(raw, max);
}

export function boardProjectNameKey(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

export function parsePrefillFields(raw: string | null | undefined): PrefillField[] {
  if (!raw) return [];
  const ok = new Set<string>(PREFILL_FIELDS);
  const out: PrefillField[] = [];
  for (const part of raw.split(",")) {
    const key = part.trim();
    if (ok.has(key) && !out.includes(key as PrefillField)) out.push(key as PrefillField);
  }
  return out;
}

export function formatPrefillFields(fields: readonly PrefillField[]): string | null {
  const uniq = PREFILL_FIELDS.filter((f) => fields.includes(f));
  return uniq.length ? uniq.join(",") : null;
}

export function dropPrefillFields(raw: string | null | undefined, drop: readonly PrefillField[]): string | null {
  const gone = new Set<string>(drop);
  return formatPrefillFields(parsePrefillFields(raw).filter((f) => !gone.has(f)));
}

function landWord(status: string | null | undefined): string | null {
  const key = status?.trim().toLowerCase() ?? "";
  return LAND_LINE[key] ?? null;
}

function phaseFromText(raw: string | null | undefined): ProjectPhase | undefined {
  const text = raw?.trim().toLowerCase().replace(/[.!?]+$/, "") ?? "";
  if (!text) return undefined;
  for (const phase of PROJECT_PHASES) {
    if (text === phase.key || text === phase.title.toLowerCase()) return phase.key;
  }
  return undefined;
}

function namedLegal(raw: string | null | undefined): boolean {
  const text = raw?.trim().toLowerCase() ?? "";
  return text.length > 0 && !LEGAL_EMPTY.has(text);
}

function placeFrom(app: PrefillApplication): string | undefined {
  const location = line(app.location, BOARD_LIMITS.place);
  if (!location) return undefined;
  const country = line(app.country, 80);
  if (!country || location.toLowerCase().includes(country.toLowerCase())) return location;
  const joined = `${location}, ${country}`;
  return joined.length <= BOARD_LIMITS.place ? joined : location;
}

function readyFrom(record: PrefillRecord): string[] | undefined {
  const ticks = (record.readinessTicks ?? []).filter(isCurrentReadinessKey);
  if (ticks.length) {
    const unique = [...new Set(ticks)];
    return unique.length ? unique : undefined;
  }
  const status = (record.application.landStatus || record.campaign?.landStatus || "").trim().toLowerCase();
  const ready: string[] = [];
  if (LAND_HELD.has(status)) ready.push("land");
  if (namedLegal(record.campaign?.legalStructure)) ready.push("legal");
  return ready.length ? ready : undefined;
}

function whereNowFrom(record: PrefillRecord, phase: ProjectPhase | undefined): string | undefined {
  const app = record.application;
  const camp = record.campaign;
  const parts: string[] = [];

  const landBits = [
    landWord(app.landStatus) ?? landWord(camp?.landStatus),
    app.projectSizeHectares && app.projectSizeHectares > 0 ? `${app.projectSizeHectares} hectares` : null,
    line(camp?.landSize, 80),
    placeFrom(app) ? `in ${placeFrom(app)}` : null,
  ].filter(Boolean);
  if (landBits.length) parts.push(`Land: ${landBits.join(", ")}.`);

  const peopleBits: string[] = [];
  const team = app.teamSize ?? camp?.teamSize;
  if (team && team > 0) peopleBits.push(`${team} in the core team`);
  if (app.currentPeopleCount && app.currentPeopleCount > 0) peopleBits.push(`${app.currentPeopleCount} people there now`);
  if (app.currentHouseholdCount && app.currentHouseholdCount > 0) peopleBits.push(`${app.currentHouseholdCount} households`);
  const teamText = line(app.teamDescription, 400) ?? line(camp?.teamDescription, 400);
  if (peopleBits.length || teamText) {
    const head = peopleBits.length ? peopleBits.join(", ") : "";
    parts.push(`People: ${[head, teamText].filter(Boolean).join(". ")}.`.replace(/\.\./g, "."));
  }

  const practices = line(app.regenerativePractices, 400) ?? line(camp?.regenerativePractices, 400);
  if (practices) parts.push(`Practices: ${practices}`);

  const built = [
    ["Housing", camp?.housingPlans],
    ["Food", camp?.foodSystems],
    ["Water", camp?.waterSystems],
    ["Energy", camp?.energySystems],
  ]
    .map(([label, value]) => {
      const text = line(value, 180);
      return text ? `${label}: ${text}` : null;
    })
    .filter(Boolean);
  if (built.length) parts.push(`Built: ${built.join(". ")}.`);

  if (!phase) {
    const wrote = line(camp?.currentPhase, 120);
    if (wrote) parts.push(`Phase they wrote: ${wrote}.`);
  }

  if (!parts.length) return undefined;
  return cleanBoardText(parts.join("\n\n"), BOARD_LIMITS.whereNow) ?? undefined;
}

/** The card fields this record can fill. Omits anything the record does not hold. */
export function suggestBoardPrefill(record: PrefillRecord): BoardPrefill {
  const phase = phaseFromText(record.campaign?.currentPhase);
  const whereNow = whereNowFrom(record, phase);
  const place = placeFrom(record.application);
  const url = cleanRepoUrl(record.application.websiteUrl) ?? cleanRepoUrl(record.campaign?.websiteUrl) ?? undefined;
  const ready = readyFrom(record);
  const pain = line(record.campaign?.challenges, BOARD_LIMITS.note) ?? undefined;
  const out: BoardPrefill = {};
  if (place) out.place = place;
  if (url) out.url = url;
  if (phase) out.phase = phase;
  if (whereNow) out.whereNow = whereNow;
  if (ready) out.ready = ready;
  if (pain) out.pain = pain;
  return out;
}

/** Keep a live value. Fill a field only when the card is still empty there. */
export function prefillWrites(current: BoardCardSnapshot, suggestion: BoardPrefill): BoardPrefill {
  const out: BoardPrefill = {};
  if (blank(current.place) && suggestion.place) out.place = suggestion.place;
  if (blank(current.url) && suggestion.url) out.url = suggestion.url;
  if (blank(current.phase) && suggestion.phase) out.phase = suggestion.phase;
  if (blank(current.whereNow) && suggestion.whereNow) out.whereNow = suggestion.whereNow;
  if (current.ready.length === 0 && suggestion.ready?.length) out.ready = suggestion.ready;
  if (current.painCount === 0 && suggestion.pain) out.pain = suggestion.pain;
  return out;
}

export function writtenPrefillFields(writes: BoardPrefill): PrefillField[] {
  return PREFILL_FIELDS.filter((field) => {
    const value = writes[field];
    return Array.isArray(value) ? value.length > 0 : Boolean(value);
  });
}
