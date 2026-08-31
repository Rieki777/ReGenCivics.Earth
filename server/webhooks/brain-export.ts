/**
 * Second copy of the second brain (ADDENDUM-2 item 9).
 *
 *   GET /api/brain/export?since=<iso>[&after_id=<n>][&limit=<n>][&realm=<r>]
 *
 * Why this exists: between the first bot capture and Slice 9's real vault
 * mirror, every item Rye speaks into Telegram lives in exactly one place, a
 * Railway MySQL row. This route is the read side of the cheap insurance. The
 * hourly `harvest_bridge_pull.py` appends what it returns to
 * `second-brain/_pipeline/_brain_items_mirror.jsonl`, so the day the database
 * is gone the words are not.
 *
 * READ-ONLY, on purpose. It selects and it responds. Nothing here writes to
 * `brain_items`, which holds 749 rows of Rye's real work.
 *
 * Auth: `Authorization: Bearer <HARVEST_BRIDGE_TOKEN>` (or
 * HARVEST_BRIDGE_TOKEN_NEXT during a rotation), the same shape
 * `harvest-bridge.ts` uses, compared with timingSafeEqualStr. No cookies. Fails
 * closed when the token or OWNER_USER_ID is unset. Failures are recorded under
 * the SHARED "harvest-bridge" scope, not a scope of this route's own: the two
 * routes guard the same secret, so brute force across both should trip one
 * counter rather than buy the attacker a second budget.
 *
 * Every column is exported. `serializeItem` walks the table definition itself
 * rather than a hand-written field list, so a column added to `brain_items`
 * next week is mirrored without anyone remembering to come back here. That is
 * deliberate: a backup that silently drops a field is worse than no backup,
 * because it looks like one.
 *
 * Paging is keyset, over (updated_at, id):
 *   - `since` alone is INCLUSIVE (`updated_at >= since`). Re-delivering the
 *     boundary row is free (the mirror is idempotent on id + updated_at);
 *     skipping it would be data loss, which is the one thing this route exists
 *     to prevent.
 *   - `since` + `after_id` is strictly-after within that second, so a page
 *     that fills up mid-second still makes progress. MySQL TIMESTAMP here has
 *     second precision, so without this a cursor could stall forever on a
 *     second holding more rows than the page cap.
 *
 * Logging: path, ip, row count, cursor. Never the token, never item bodies.
 */
import type { Express, Request, Response } from "express";
import { and, asc, eq, getTableColumns, gt, gte, or } from "drizzle-orm";
import { getDb } from "../db";
import { brainItems } from "../../drizzle/schema";
import { ENV } from "../_core/env";
import { timingSafeEqualStr, recordWebhookFailure, isWebhookFailureBlocked } from "../_core/security";
import { logger } from "../_core/logger";

const log = logger("brain-export");

/** Shared with harvest-bridge on purpose: one secret, one failure budget. */
const SCOPE = "harvest-bridge";

export const EXPORT_PAGE_DEFAULT = 500;
export const EXPORT_PAGE_MAX = 1000;

const REALMS = ["regen", "personal"] as const;
type Realm = (typeof REALMS)[number];

function isMissingTableError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return /ER_NO_SUCH_TABLE|doesn't exist|no such table/i.test(msg);
}

/**
 * Returns true when the request may proceed. Writes the failure response
 * itself otherwise. Same contract as harvest-bridge's checkBridgeAuth.
 */
async function checkBridgeAuth(req: Request, res: Response): Promise<boolean> {
  const ip = req.ip || "unknown";
  if (await isWebhookFailureBlocked(ip, SCOPE)) {
    res.status(429).json({ error: "too_many_failures" });
    return false;
  }
  if (!ENV.harvestBridgeToken || !ENV.ownerUserId) {
    // Not configured: fail closed in every environment. Generic body so a
    // prober cannot distinguish "unset" from "wrong token".
    res.status(503).json({ error: "unavailable" });
    return false;
  }
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  const ok =
    timingSafeEqualStr(token, ENV.harvestBridgeToken) ||
    (Boolean(ENV.harvestBridgeTokenNext) && timingSafeEqualStr(token, ENV.harvestBridgeTokenNext));
  if (!ok) {
    await recordWebhookFailure(ip, SCOPE);
    log.warn(`auth failure path=${req.path} ip=${ip}`);
    res.status(401).json({ error: "unauthorized" });
    return false;
  }
  return true;
}

function firstValue(raw: unknown): string | undefined {
  const v = Array.isArray(raw) ? raw[0] : raw;
  return typeof v === "string" ? v : undefined;
}

export type ExportQuery = {
  since: Date | null;
  afterId: number | null;
  limit: number;
  realm: Realm | null;
};

/**
 * Parse and clamp the query string. Returns an error string instead of
 * throwing so the handler can answer 400 with it. Rejects rather than
 * silently coercing: a caller that mistypes `since` should hear about it, not
 * receive the whole table and believe it asked for a slice.
 */
export function parseExportQuery(query: Record<string, unknown>): { ok: true; value: ExportQuery } | { ok: false; error: string } {
  const sinceRaw = firstValue(query.since);
  let since: Date | null = null;
  if (sinceRaw !== undefined && sinceRaw !== "") {
    const parsed = new Date(sinceRaw);
    if (Number.isNaN(parsed.getTime())) {
      return { ok: false, error: "since must be an ISO 8601 timestamp" };
    }
    since = parsed;
  }

  const afterRaw = firstValue(query.after_id);
  let afterId: number | null = null;
  if (afterRaw !== undefined && afterRaw !== "") {
    const parsed = Number(afterRaw);
    if (!Number.isInteger(parsed) || parsed < 0) {
      return { ok: false, error: "after_id must be a non-negative integer" };
    }
    if (since === null) {
      return { ok: false, error: "after_id requires since" };
    }
    afterId = parsed;
  }

  const limitRaw = firstValue(query.limit);
  let limit = EXPORT_PAGE_DEFAULT;
  if (limitRaw !== undefined && limitRaw !== "") {
    const parsed = Number(limitRaw);
    if (!Number.isInteger(parsed) || parsed < 1) {
      return { ok: false, error: "limit must be a positive integer" };
    }
    // Clamp rather than reject: a caller asking for everything should get a
    // full page and `has_more`, not a 400 it has to learn to avoid.
    limit = Math.min(parsed, EXPORT_PAGE_MAX);
  }

  const realmRaw = firstValue(query.realm);
  let realm: Realm | null = null;
  if (realmRaw !== undefined && realmRaw !== "") {
    if (!(REALMS as readonly string[]).includes(realmRaw)) {
      return { ok: false, error: `realm must be one of ${REALMS.join(", ")}` };
    }
    realm = realmRaw as Realm;
  }

  return { ok: true, value: { since, afterId, limit, realm } };
}

/**
 * These ISO strings are the mirror's idempotency key (`id@updated_at`), so
 * they have to mean the same thing in every process that ever calls this
 * route. They do: drizzle's timestamp mapping reads the column as UTC
 * (`new Date(value + "+0000")`), so `toISOString()` returns the stored wall
 * clock whatever the server's timezone is.
 *
 * Worth stating because raw mysql2 does NOT behave this way. Its default
 * `timezone: "local"` builds the Date from the process's own offset, so a
 * hand-rolled query on a UTC-7 laptop reads row 1 as
 * `2026-08-31T05:26:19.000Z` where this route reads `2026-08-30T22:26:19Z`,
 * which is what the database actually stores. Measured both ways
 * 2026-08-30, and pinned in server/brain-export.test.ts. Do not "simplify"
 * the read path onto the raw driver; the keys would shift with the timezone
 * and a mirror seeded before the shift would duplicate wholesale after it.
 */
function toIso(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value.toISOString();
  // A driver configured with dateStrings would land here; pass the database's
  // own representation through rather than guessing a timezone onto it.
  return String(value);
}

function toDateOnly(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value.toISOString().slice(0, 10);
  }
  return String(value).slice(0, 10);
}

/**
 * One item, as the vault stores it: snake_case keys matching the DB columns,
 * every column present, dates as ISO strings so a JSON line round-trips.
 *
 * Driven by the table definition, not a literal, so nothing can be omitted by
 * forgetting. `server/brain-export.test.ts` pins the resulting key set against
 * `getTableColumns(brainItems)`, so a column added upstream fails the suite
 * only if this walk somehow stops covering it.
 */
export function serializeItem(row: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, column] of Object.entries(getTableColumns(brainItems))) {
    const value = row[key];
    const columnType = (column as { columnType?: string }).columnType;
    if (columnType === "MySqlDate") {
      out[column.name] = toDateOnly(value);
    } else if (columnType === "MySqlTimestamp") {
      out[column.name] = toIso(value);
    } else {
      out[column.name] = value === undefined ? null : value;
    }
  }
  return out;
}

export function registerBrainExportRoutes(app: Express) {
  app.get("/api/brain/export", async (req: Request, res: Response) => {
    if (!(await checkBridgeAuth(req, res))) return;

    const parsed = parseExportQuery(req.query as Record<string, unknown>);
    if (!parsed.ok) {
      res.status(400).json({ error: parsed.error });
      return;
    }
    const { since, afterId, limit, realm } = parsed.value;

    const db = await getDb();
    if (!db) {
      res.status(500).json({ error: "db_unavailable" });
      return;
    }

    try {
      // `since` is inclusive on its own; with `after_id` the boundary second
      // is walked by id instead, which is what keeps a full page moving.
      const cursor =
        since === null
          ? undefined
          : afterId === null
            ? gte(brainItems.updatedAt, since)
            : or(gt(brainItems.updatedAt, since), and(eq(brainItems.updatedAt, since), gt(brainItems.id, afterId)));

      const where = and(
        eq(brainItems.ownerId, ENV.ownerUserId),
        ...(realm ? [eq(brainItems.realm, realm)] : []),
        ...(cursor ? [cursor] : []),
      );

      const rows = await db
        .select()
        .from(brainItems)
        .where(where)
        .orderBy(asc(brainItems.updatedAt), asc(brainItems.id))
        .limit(limit);

      const items = rows.map((row) => serializeItem(row as unknown as Record<string, unknown>));
      const last = items.length > 0 ? items[items.length - 1] : null;

      log.info(
        `export ip=${req.ip} since=${since ? since.toISOString() : "all"} after_id=${afterId ?? "-"} realm=${realm ?? "all"} count=${items.length}`,
      );
      res.json({
        items,
        count: items.length,
        // Echoed so the caller can prove what it actually asked for after a
        // clamp, instead of assuming its own parameters survived.
        since: since ? since.toISOString() : null,
        after_id: afterId,
        limit,
        realm,
        // The cursor to send back. Both halves, because updated_at alone is
        // not unique at second precision.
        next_since: last ? (last.updated_at as string | null) : null,
        next_after_id: last ? (last.id as number) : null,
        has_more: items.length === limit,
      });
    } catch (err) {
      if (isMissingTableError(err)) {
        res.status(503).json({ error: "not_ready" });
        return;
      }
      log.error(`export failed: ${err instanceof Error ? err.message : String(err)}`);
      res.status(500).json({ error: "internal" });
    }
  });
}
