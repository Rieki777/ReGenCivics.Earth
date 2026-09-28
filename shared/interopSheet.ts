/**
 * The interoperability sheet: what a tool speaks, so we can see where two
 * projects already meet.
 *
 * One intake, not two. Somebody describing their tool on /interop-sessions is
 * submitting it to the tools library AND answering the interoperability
 * questions in the same pass, so every tool in the library has been through
 * this and the library can show which tools are part of the shared system.
 *
 * The overlap is computed from controlled vocabularies rather than prose,
 * which is the whole reason the sheet asks in fields instead of a text box.
 * Two projects "overlap" when they name the same protocol, the same data
 * format or the same identity model, and that answer is exact, free, and
 * explainable to the people in the room. Per STEERING section 11, the
 * deterministic half is a plain function; nothing here needs an LLM.
 *
 * The vocabularies are open on purpose: a tool can name something not on the
 * list, and an unrecognised term still matches another tool that names it
 * identically. Closed enums would have meant the first person to bring
 * something new could not describe it.
 */

/** A facet of a sheet that two tools can share. */
export type OverlapAxis = "protocols" | "dataFormats" | "identityModels" | "surfaces";

export const OVERLAP_AXES: OverlapAxis[] = ["protocols", "dataFormats", "identityModels", "surfaces"];

export const AXIS_LABEL: Record<OverlapAxis, string> = {
  protocols: "Protocol or spec",
  dataFormats: "Data format",
  identityModels: "Identity model",
  surfaces: "Integration surface",
};

/**
 * Suggestions, not limits. These seed the pickers so people reach for the same
 * words where a shared word exists, which is what makes the overlap real
 * rather than an artefact of spelling.
 */
export const SUGGESTED_PROTOCOLS = [
  "ActivityPub", "AT Protocol", "DIDComm", "Verifiable Credentials", "OAuth 2.0",
  "OpenID Connect", "Matrix", "Nostr", "IPFS", "Hypha", "Holochain", "Farcaster",
  "Open Badges", "Trust over IP", "Solid", "MCP", "Webmention", "RSS / Atom",
];

export const SUGGESTED_DATA_FORMATS = [
  "JSON-LD", "JSON", "RDF / Turtle", "GeoJSON", "CSV", "Markdown", "iCalendar",
  "Schema.org", "Protobuf", "YAML", "SQL", "Parquet",
];

export const SUGGESTED_IDENTITY_MODELS = [
  "DID", "Verifiable Credential", "OAuth account", "Email magic link",
  "Wallet / keypair", "API key", "Anonymous", "Nation-state ID", "None yet",
];

export const SUGGESTED_SURFACES = [
  "REST API", "GraphQL", "Webhooks", "Feed (RSS/Atom/iCal)", "SDK / library",
  "CLI", "MCP server", "Database", "File export", "Nothing yet",
];

export const SUGGESTIONS: Record<OverlapAxis, string[]> = {
  protocols: SUGGESTED_PROTOCOLS,
  dataFormats: SUGGESTED_DATA_FORMATS,
  identityModels: SUGGESTED_IDENTITY_MODELS,
  surfaces: SUGGESTED_SURFACES,
};

/** The sheet's structured half. The prose and the attachment sit beside it. */
export interface SheetFacets {
  protocols: string[];
  dataFormats: string[];
  identityModels: string[];
  surfaces: string[];
}

export const MAX_TERMS_PER_AXIS = 24;
export const MAX_TERM_LENGTH = 60;

/**
 * Normalise one term for comparison: case and spacing should never decide
 * whether two projects are judged to share a protocol.
 */
export function normalizeTerm(raw: string): string {
  return raw
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u001F\u007F]/g, "")
    .replace(/[\u200B-\u200F\u202A-\u202E\u2066-\u2069\uFEFF]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_TERM_LENGTH);
}

/** The key two terms are matched on. Display keeps the author's spelling. */
export function termKey(raw: string): string {
  return normalizeTerm(raw).toLowerCase().replace(/[\s._-]+/g, "");
}

/** Clean one axis: trimmed, deduplicated by key, bounded, author's casing kept. */
export function cleanTerms(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of raw) {
    if (typeof item !== "string") continue;
    const term = normalizeTerm(item);
    if (!term) continue;
    const key = termKey(term);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(term);
    if (out.length >= MAX_TERMS_PER_AXIS) break;
  }
  return out;
}

export function cleanFacets(raw: Partial<Record<OverlapAxis, unknown>>): SheetFacets {
  return {
    protocols: cleanTerms(raw.protocols),
    dataFormats: cleanTerms(raw.dataFormats),
    identityModels: cleanTerms(raw.identityModels),
    surfaces: cleanTerms(raw.surfaces),
  };
}

/** A sheet as the overlap engine sees it. */
export interface OverlapInput {
  id: number;
  toolName: string;
  facets: SheetFacets;
}

export interface SharedTerm {
  axis: OverlapAxis;
  /** The spelling of the first sheet that named it. */
  term: string;
  key: string;
}

export interface OverlapPair {
  a: { id: number; toolName: string };
  b: { id: number; toolName: string };
  shared: SharedTerm[];
  /** How many terms the two have in common, across every axis. */
  score: number;
}

/**
 * Every pair of tools that share at least one term, strongest first.
 *
 * Quadratic in the number of sheets on purpose: this is a working group, not a
 * marketplace, and an exact answer over a few dozen sheets is worth more than
 * an approximate one that nobody can check by eye.
 */
export function computeOverlaps(sheets: readonly OverlapInput[]): OverlapPair[] {
  const pairs: OverlapPair[] = [];
  for (let i = 0; i < sheets.length; i++) {
    for (let j = i + 1; j < sheets.length; j++) {
      const a = sheets[i];
      const b = sheets[j];
      const shared: SharedTerm[] = [];
      for (const axis of OVERLAP_AXES) {
        const bKeys = new Map(b.facets[axis].map((t) => [termKey(t), t] as const));
        for (const term of a.facets[axis]) {
          const key = termKey(term);
          if (bKeys.has(key)) shared.push({ axis, term, key });
        }
      }
      if (shared.length) {
        pairs.push({
          a: { id: a.id, toolName: a.toolName },
          b: { id: b.id, toolName: b.toolName },
          shared,
          score: shared.length,
        });
      }
    }
  }
  // Strongest first, then by name so the order is stable between renders.
  return pairs.sort((x, y) => y.score - x.score || x.a.toolName.localeCompare(y.a.toolName));
}

export interface TermTally {
  axis: OverlapAxis;
  term: string;
  key: string;
  /** How many sheets name it. */
  count: number;
  toolNames: string[];
}

/**
 * What the whole group already agrees on, per axis, most-shared first.
 *
 * This is the raw material for a standard: a term several projects already
 * name is a candidate for the shared foundation, and one only a single project
 * names is a proposal rather than common ground.
 */
export function tallyTerms(sheets: readonly OverlapInput[]): TermTally[] {
  const byKey = new Map<string, TermTally>();
  for (const sheet of sheets) {
    for (const axis of OVERLAP_AXES) {
      for (const term of sheet.facets[axis]) {
        const key = `${axis}:${termKey(term)}`;
        const existing = byKey.get(key);
        if (existing) {
          existing.count += 1;
          if (!existing.toolNames.includes(sheet.toolName)) existing.toolNames.push(sheet.toolName);
        } else {
          byKey.set(key, { axis, term, key: termKey(term), count: 1, toolNames: [sheet.toolName] });
        }
      }
    }
  }
  return [...byKey.values()].sort(
    (a, b) => b.count - a.count || a.axis.localeCompare(b.axis) || a.term.localeCompare(b.term),
  );
}

/** Terms at least this many sheets name are common ground rather than one project's choice. */
export const COMMON_GROUND_THRESHOLD = 2;

export function commonGround(sheets: readonly OverlapInput[]): TermTally[] {
  return tallyTerms(sheets).filter((t) => t.count >= COMMON_GROUND_THRESHOLD);
}
