/**
 * Metrics: the one source for every number ReGen Civics states about itself.
 *
 * Why. The site said "847 active players" while the database held 102
 * accounts, and three pages disagreed on the alliance count, because each
 * number was typed into the page that showed it (funding engine gap analysis,
 * 2026-09-27). The metrics table (drizzle/0275) holds each number once, with a
 * definition, a source and an as-of date.
 *
 * Two kinds of row:
 *  - computed: computedFrom names a live count in COMPUTED below. refresh()
 *    recomputes them. Deterministic, no LLM (STEERING 11).
 *  - entered: Rye types the value, its source and its as-of date in admin.
 *
 * Public reads are closed by default. Rye's ruling of 2026-09-27: live counts
 * show in admin only until they are meaningful. publicMetrics() returns a row
 * only when it is marked public AND confirmed, so a count can never reach a
 * page just because it exists.
 */
import { and, eq, isNotNull, ne, sql } from "drizzle-orm";
import { getDb } from "../db";
import {
  applications,
  campaigns,
  coopInterest,
  metrics,
  playerProfiles,
  questCompletions,
  users,
  type MetricRow,
} from "../../drizzle/schema";
import { SEASON_ONE } from "@shared/regenYear";

type Db = NonNullable<Awaited<ReturnType<typeof getDb>>>;

async function count(q: Promise<Array<{ c: number | string | null }>>): Promise<number> {
  const rows = await q;
  return Number(rows[0]?.c ?? 0);
}

/**
 * The live counts. Keys match metrics.computedFrom. Each returns one number.
 * Adding a key here and a row in a migration is the whole workflow.
 */
export const COMPUTED: Record<string, (db: Db) => Promise<number>> = {
  applications_non_draft: (db) =>
    count(db.select({ c: sql<number>`COUNT(*)` }).from(applications).where(ne(applications.status, "draft"))),
  land_projects_applied: async (db) =>
    SEASON_ONE.applied +
    (await count(db.select({ c: sql<number>`COUNT(*)` }).from(applications).where(ne(applications.status, "draft")))),
  users_total: (db) => count(db.select({ c: sql<number>`COUNT(*)` }).from(users)),
  player_profiles_total: (db) => count(db.select({ c: sql<number>`COUNT(*)` }).from(playerProfiles)),
  quests_completed: (db) => count(db.select({ c: sql<number>`COUNT(*)` }).from(questCompletions)),
  applications_hectares: (db) =>
    count(
      db
        .select({ c: sql<number>`COALESCE(SUM(${applications.projectSizeHectares}), 0)` })
        .from(applications)
        .where(ne(applications.status, "draft")),
    ),
  campaigns_real: (db) => count(db.select({ c: sql<number>`COUNT(*)` }).from(campaigns).where(eq(campaigns.isDemo, 0))),
  coop_interest_open: (db) =>
    count(db.select({ c: sql<number>`COUNT(*)` }).from(coopInterest).where(ne(coopInterest.status, "archived"))),
};

function todayYmd(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Recompute every row whose computedFrom names a live count. A count that
 * throws (a table missing in a fresh database) is reported and skipped, never
 * written as zero: a false zero is the same lie as a false 847.
 */
export async function refreshComputedMetrics(db: Db): Promise<{ updated: string[]; failed: string[] }> {
  const rows = await db.select().from(metrics).where(isNotNull(metrics.computedFrom));
  const updated: string[] = [];
  const failed: string[] = [];
  for (const row of rows) {
    const fn = row.computedFrom ? COMPUTED[row.computedFrom] : undefined;
    if (!fn) {
      failed.push(row.metricKey);
      continue;
    }
    try {
      const value = await fn(db);
      await db
        .update(metrics)
        .set({
          valueNumeric: value,
          displayValue: formatMetricValue(value, row.unit),
          computedAt: new Date(),
          asOf: new Date(`${todayYmd()}T00:00:00Z`),
          source: `Live count (${row.computedFrom})`,
        })
        .where(eq(metrics.id, row.id));
      updated.push(row.metricKey);
    } catch (err) {
      console.warn(`[metrics] live count ${row.computedFrom} failed:`, err);
      failed.push(row.metricKey);
    }
  }
  return { updated, failed };
}

/** Plain display: 1,234 for counts and hectares, $10,000 for dollars. */
export function formatMetricValue(value: number | null | undefined, unit: string): string | null {
  if (value === null || value === undefined || !Number.isFinite(value)) return null;
  const n = Math.round(value);
  const grouped = n.toLocaleString("en-US");
  if (unit === "usd") return `$${grouped}`;
  return grouped;
}

export interface PublicMetric {
  key: string;
  label: string;
  value: number | null;
  display: string | null;
  asOf: string | null;
}

/** The public shape of one row: only what a page may render. */
export function toPublicMetric(row: MetricRow): PublicMetric {
  const asOf = row.asOf ? new Date(row.asOf as unknown as string).toISOString().slice(0, 10) : null;
  return {
    key: row.metricKey,
    label: row.label,
    value: row.valueNumeric ?? null,
    display: row.displayValue ?? formatMetricValue(row.valueNumeric, row.unit),
    asOf,
  };
}

let cache: { at: number; value: Record<string, PublicMetric> } | null = null;
const PUBLIC_TTL_MS = 5 * 60 * 1000;

/**
 * Metrics a public surface may render: marked public AND confirmed by Rye.
 * Cached five minutes. Returns {} when the table is missing or empty, so a
 * page that asks for a number it cannot have simply shows none.
 */
export async function publicMetrics(): Promise<Record<string, PublicMetric>> {
  if (cache && Date.now() - cache.at < PUBLIC_TTL_MS) return cache.value;
  const db = await getDb();
  if (!db) return {};
  try {
    const rows = await db
      .select()
      .from(metrics)
      .where(and(eq(metrics.isPublic, true), isNotNull(metrics.confirmedAt)));
    const value: Record<string, PublicMetric> = {};
    for (const row of rows) value[row.metricKey] = toPublicMetric(row);
    cache = { at: Date.now(), value };
    return value;
  } catch (err) {
    console.warn("[metrics] public read failed:", err);
    return {};
  }
}

/** Drop the public cache after an admin edit, so a change shows at once. */
export function clearPublicMetricsCache(): void {
  cache = null;
}

/**
 * The confirmed numbers, as a block appended to the positioning kernel (gate
 * G4: every number in a draft must come from here). Confirmation is what
 * counts for applications; the public flag only governs the site. With none
 * confirmed, the block says so, and the model is told to use no numbers.
 */
export async function confirmedMetricsForPrompt(db: Db): Promise<string> {
  let rows: MetricRow[] = [];
  try {
    rows = await db.select().from(metrics).where(isNotNull(metrics.confirmedAt));
  } catch (err) {
    console.warn("[metrics] confirmed read failed:", err);
  }
  const lines = rows
    .filter((r) => r.displayValue || r.valueNumeric !== null)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((r) => {
      const pm = toPublicMetric(r);
      const bits = [pm.asOf ? `as of ${pm.asOf}` : null, r.source ? `source: ${r.source}` : null].filter(Boolean);
      return `- ${r.label}: ${pm.display ?? pm.value}${bits.length ? ` (${bits.join("; ")})` : ""}`;
    });
  if (lines.length === 0) {
    return "## Confirmed numbers\n\nNone are confirmed yet. Use no numbers about ReGen Civics; describe traction without figures and flag every claim that needs one.";
  }
  return `## Confirmed numbers (the only numbers you may use)\n\n${lines.join("\n")}`;
}
