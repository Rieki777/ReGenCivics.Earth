/**
 * Pure planning for the application kit's seed, import and backfill scripts
 * (funding engine Phase 1). The decisions live here so they are tested
 * without a database: which funder row a program belongs to, what a seed may
 * write on it, and which free-text deadlines become real instants.
 *
 * The rule the whole file follows: seeds own research facts, Rye owns the
 * working columns. A seed may set a program's cycle, deadline and question
 * list. It never writes appStatus, stage, owner, next action, notes or any
 * draft, and it never overwrites a deadline Rye set by hand with a guess.
 */
import { parseDeadlineText, type DeadlineKind } from "../../shared/fundingDeadlines";
import { isFundingTrack, type FundingTrack } from "../../shared/fundingStages";

export interface SeedQuestion {
  order: number;
  section?: string | null;
  text: string;
  char_limit?: number | null;
  word_limit?: number | null;
  required?: boolean | null;
  field_type?: string | null;
  verified?: boolean | null;
  source_url?: string | null;
  notes?: string | null;
}

export interface SeedProgram {
  program_key: string;
  program: string;
  cycle: string;
  track?: string | null;
  deadline_at?: string | null;
  deadline_text?: string | null;
  deadline_verified?: boolean | null;
  deadline_source_url?: string | null;
  application_url?: string | null;
  /** Optional: the funder row's name, for programs not in PROGRAM_FUNDERS. */
  funder_name?: string | null;
  questions: SeedQuestion[];
}

export interface QuestionSeedFile {
  generated_at?: string | null;
  programs: SeedProgram[];
}

/**
 * The funder row each known program belongs to. Y Combinator already has a
 * pipeline row; the others did not when the kit was built (2026-09-27).
 * "Emergent Fund" in the pipeline is a different organization from Emergent
 * Ventures, so the match is by exact name, never a fuzzy one.
 */
export const PROGRAM_FUNDERS: Record<string, { name: string; category: string }> = {
  "500global_b37": { name: "500 Global", category: "Accelerator (tech wedge)" },
  pearx_w27: { name: "PearX", category: "Accelerator (tech wedge)" },
  yc_w27: { name: "Y Combinator", category: "Accelerator (tech wedge)" },
  techstars_spring27: { name: "Techstars", category: "Accelerator (tech wedge)" },
  emergent_ventures: { name: "Emergent Ventures", category: "Fellowship / prize" },
};

export function funderFor(program: SeedProgram): { name: string; category: string } | null {
  const known = PROGRAM_FUNDERS[program.program_key];
  if (program.funder_name) {
    return {
      name: program.funder_name,
      category: known?.category ?? (program.track === "accelerator" ? "Accelerator (tech wedge)" : "Fellowship / prize"),
    };
  }
  return known ?? null;
}

/** Problems that stop a seed file before it touches the database. */
export function validateQuestionSeed(seed: QuestionSeedFile): string[] {
  const problems: string[] = [];
  const keys = new Set<string>();
  for (const p of seed.programs ?? []) {
    if (!/^[a-z0-9_]+$/.test(p.program_key ?? "")) problems.push(`bad program_key: ${JSON.stringify(p.program_key)}`);
    if (keys.has(p.program_key)) problems.push(`duplicate program_key: ${p.program_key}`);
    keys.add(p.program_key);
    if (!p.cycle) problems.push(`${p.program_key}: no cycle`);
    if (!funderFor(p)) problems.push(`${p.program_key}: no funder row known; add funder_name to the seed`);
    const orders = new Set<number>();
    for (const q of p.questions ?? []) {
      if (!Number.isInteger(q.order) || q.order < 1) problems.push(`${p.program_key}: bad order ${q.order}`);
      if (orders.has(q.order)) problems.push(`${p.program_key}: duplicate order ${q.order}`);
      orders.add(q.order);
      if (!q.text || !q.text.trim()) problems.push(`${p.program_key} #${q.order}: empty question text`);
      for (const [name, v] of [["char_limit", q.char_limit], ["word_limit", q.word_limit]] as const) {
        if (v !== null && v !== undefined && (!Number.isInteger(v) || v < 1)) problems.push(`${p.program_key} #${q.order}: bad ${name} ${v}`);
      }
    }
  }
  return problems;
}

/** A program's deadline: its stated instant, else its text parsed. Never an approximate date. */
export function programDeadline(program: SeedProgram): { at: Date | null; kind: DeadlineKind | "stated"; note: string } {
  if (program.deadline_at) {
    const at = new Date(program.deadline_at);
    if (!Number.isNaN(at.getTime())) return { at, kind: "stated", note: "stated in the seed" };
  }
  const parsed = parseDeadlineText(program.deadline_text);
  return { at: parsed.at, kind: parsed.kind, note: parsed.note };
}

export interface FunderRowLite {
  id: number;
  name: string;
  track: string | null;
  cycle: string | null;
  deadlineAt: Date | string | null;
  deadlineSource?: string | null;
  deadlineVerifiedAt?: Date | string | null;
  link: string | null;
}

function sameInstant(a: Date | string | null, b: Date): boolean {
  if (!a) return false;
  const t = typeof a === "string" ? new Date(a).getTime() : a.getTime();
  return t === b.getTime();
}

/** YYYY-MM-DD of a DATE column value (drizzle reads it as UTC midnight). */
function ymd(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  return (typeof value === "string" ? value : value.toISOString()).slice(0, 10);
}

/**
 * The day the seed's research checked a verified deadline. A string, never a
 * Date: mysql2 would write a Date to a DATE column in the machine's local time
 * and land a day early on a Pacific laptop.
 */
function verifiedDay(program: SeedProgram, generatedAt: string | null | undefined): string | null {
  return program.deadline_verified && generatedAt ? generatedAt.slice(0, 10) : null;
}

/** What the question seed writes on a funder row. Program facts only; see the file header. */
export function planFunderUpdate(program: SeedProgram, row: FunderRowLite, generatedAt: string | null | undefined) {
  const patch: Record<string, unknown> = {};
  const track = isFundingTrack(program.track) ? program.track : null;
  if (!row.track && track) patch.track = track;
  if (program.cycle && row.cycle !== program.cycle) patch.cycle = program.cycle;
  const deadline = programDeadline(program);
  if (deadline.at) {
    if (!sameInstant(row.deadlineAt, deadline.at)) patch.deadlineAt = deadline.at;
    const source = program.deadline_source_url?.slice(0, 500);
    if (source && row.deadlineSource !== source) patch.deadlineSource = source;
    const day = verifiedDay(program, generatedAt);
    if (day && ymd(row.deadlineVerifiedAt) !== day) patch.deadlineVerifiedAt = day;
  }
  if (!row.link && program.application_url) patch.link = program.application_url.slice(0, 500);
  return { patch, deadline };
}

/** The row for a funder the pipeline does not have yet. */
export function planFunderInsert(program: SeedProgram, today: string, generatedAt?: string | null) {
  const funder = funderFor(program);
  if (!funder) throw new Error(`${program.program_key}: no funder row known`);
  const deadline = programDeadline(program);
  return {
    name: funder.name,
    category: funder.category,
    priority: "P1" as const,
    track: isFundingTrack(program.track) ? program.track : null,
    cycle: program.cycle,
    deadline: (program.deadline_text ?? "").slice(0, 160) || null,
    deadlineAt: deadline.at,
    deadlineSource: deadline.at ? (program.deadline_source_url?.slice(0, 500) ?? null) : null,
    deadlineVerifiedAt: deadline.at ? verifiedDay(program, generatedAt) : null,
    link: program.application_url?.slice(0, 500) ?? null,
    notes: `Added by the application kit seed on ${today} for ${program.program}.`,
  };
}

/** app_questions rows for one program. The seed never writes answerDraft or answerId. */
export function planQuestionRows(program: SeedProgram, pipelineId: number) {
  return program.questions.map((q) => ({
    pipelineId,
    programKey: program.program_key,
    cycle: program.cycle,
    questionOrder: q.order,
    section: q.section?.slice(0, 160) ?? null,
    questionText: q.text.trim(),
    fieldType: (q.field_type ?? "long_text").slice(0, 40),
    isRequired: q.required ?? null,
    charLimit: q.char_limit ?? null,
    wordLimit: q.word_limit ?? null,
    verified: Boolean(q.verified),
    sourceUrl: q.source_url?.slice(0, 500) ?? null,
    notes: q.notes ?? null,
  }));
}

/**
 * The track a research category implies, only where it is unambiguous.
 * Natural capital, real estate, co-op lenders and the rest can be grants,
 * loans or investment depending on the program, so they stay unset for Rye.
 */
export function trackForCategory(category: string | null | undefined): FundingTrack | null {
  const c = (category ?? "").toLowerCase();
  if (/accelerator/.test(c)) return "accelerator";
  if (/^(government|philanthropy|fellowship|faith)/.test(c)) return "grant";
  if (/^refi \/ web3/.test(c)) return "public_goods";
  if (/^ally \/ field network/.test(c)) return "network";
  return null;
}

export interface BackfillRow {
  id: number;
  name: string;
  category: string;
  deadline: string | null;
  deadlineAt: Date | string | null;
  track: string | null;
}

/**
 * Which rows get a deadline and a track. A row that already has a deadlineAt
 * or a track keeps it: the backfill fills gaps and never overwrites.
 */
export function planBackfill(rows: BackfillRow[]) {
  const deadlines: Array<{ id: number; name: string; at: Date; text: string; note: string }> = [];
  const tracks: Array<{ id: number; name: string; track: FundingTrack; category: string }> = [];
  const unparsed: Record<string, Array<{ id: number; name: string; text: string; note: string }>> = {};
  const untracked: Record<string, number> = {};
  for (const r of rows) {
    if (!r.deadlineAt) {
      const p = parseDeadlineText(r.deadline);
      if (p.kind === "date" && p.at) deadlines.push({ id: r.id, name: r.name, at: p.at, text: r.deadline ?? "", note: p.note });
      else (unparsed[p.kind] ??= []).push({ id: r.id, name: r.name, text: r.deadline ?? "", note: p.note });
    }
    if (!r.track) {
      const t = trackForCategory(r.category);
      if (t) tracks.push({ id: r.id, name: r.name, track: t, category: r.category });
      else untracked[r.category] = (untracked[r.category] ?? 0) + 1;
    }
  }
  return { deadlines, tracks, unparsed, untracked };
}
