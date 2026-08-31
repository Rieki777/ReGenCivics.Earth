/**
 * The second copy of the second brain.
 *
 * `brain_items` holds 749 rows of Rye's real work and, until Slice 9's real
 * vault mirror lands, a bot-era item exists in exactly one place. This route is
 * the read side of the interim backup, so what these tests pin is the two ways
 * a backup fails: it lets the wrong person read it, or it quietly returns less
 * than it promised.
 *
 *   - a stranger gets nothing (no auth, wrong bearer, unset config)
 *   - the rotation token works, because a rotation must not stop the mirror
 *   - EVERY column reaches the wire; the key set is checked against the table
 *     definition, not against a list someone typed
 *   - `since` reaches the query as a real Date, and `after_id` makes the
 *     boundary second walk by id instead of stalling on it
 *   - a page is capped, and says so with `has_more`
 *   - nothing here writes: insert/update/delete are never called
 *
 * No database. `../db` is mocked with a recording query builder, so the suite
 * runs identically in CI (no DATABASE_URL) and on the laptop.
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import express from "express";
import type { Server } from "http";
import type { AddressInfo } from "net";
import { getTableColumns } from "drizzle-orm";
import { brainItems } from "../drizzle/schema";
import { ENV } from "./_core/env";
import {
  EXPORT_PAGE_DEFAULT,
  EXPORT_PAGE_MAX,
  parseExportQuery,
  registerBrainExportRoutes,
  serializeItem,
} from "./webhooks/brain-export";

const OWNER = 987_654_321;
const TOKEN = "brain-export-test-token-0123456789abcdef";
const NEXT_TOKEN = "brain-export-rotation-token-0123456789ab";

/**
 * A recording stand-in for the drizzle query builder. It answers the exact
 * chain the route uses and remembers what it was handed, which is how the
 * `since` and page-cap assertions below get to be about behaviour rather than
 * about a string in a response body.
 */
const h = vi.hoisted(() => {
  const state = {
    where: undefined as unknown,
    orderBy: [] as unknown[],
    limit: undefined as number | undefined,
    rows: [] as unknown[],
    insert: undefined as ReturnType<typeof vi.fn> | undefined,
    update: undefined as ReturnType<typeof vi.fn> | undefined,
    delete: undefined as ReturnType<typeof vi.fn> | undefined,
  };
  return { state };
});

vi.mock("./db", () => {
  h.state.insert = vi.fn();
  h.state.update = vi.fn();
  h.state.delete = vi.fn();
  const builder = {
    select() {
      return builder;
    },
    from() {
      return builder;
    },
    where(cond: unknown) {
      h.state.where = cond;
      return builder;
    },
    orderBy(...args: unknown[]) {
      h.state.orderBy = args;
      return builder;
    },
    limit(n: number) {
      h.state.limit = n;
      return Promise.resolve(h.state.rows);
    },
    insert: (...a: unknown[]) => h.state.insert!(...a),
    update: (...a: unknown[]) => h.state.update!(...a),
    delete: (...a: unknown[]) => h.state.delete!(...a),
  };
  return { getDb: async () => builder };
});

/** One row shaped the way drizzle hands them back: camelCase, real Dates. */
function fakeRow(over: Record<string, unknown> = {}) {
  return {
    id: 1,
    ownerId: OWNER,
    kind: "build",
    realm: "regen",
    state: "raw",
    title: "a title",
    body: "a body",
    ask: null,
    doneWhen: null,
    blockedOn: null,
    due: new Date("2026-09-10T00:00:00.000Z"),
    effort: "S",
    priority: "soon",
    repo: null,
    surface: null,
    attachments: ["harvest/shots/1/1/a.jpg"],
    proposed: { kind: "build" },
    followsId: null,
    supersedesId: null,
    source: "tg-1",
    trust: "owner",
    batchId: null,
    readyBy: null,
    readyAt: null,
    readyHash: null,
    closedBy: null,
    evidence: null,
    capturedAt: new Date("2026-08-30T10:00:00.000Z"),
    createdAt: new Date("2026-08-30T10:00:01.000Z"),
    updatedAt: new Date("2026-08-31T05:26:19.000Z"),
    ...over,
  };
}

/**
 * Drizzle wraps bound values several layers deep and the shape is not part of
 * its public contract, so this walks for Dates rather than reaching for a
 * property path that a minor version could rename.
 */
function datesIn(node: unknown, depth = 0, seen = new Set<unknown>()): string[] {
  if (depth > 14 || node === null || typeof node !== "object" || seen.has(node)) return [];
  seen.add(node);
  if (node instanceof Date) return [node.toISOString()];
  if (Array.isArray(node)) return node.flatMap((n) => datesIn(n, depth + 1, seen));
  const out: string[] = [];
  for (const key of ["queryChunks", "value", "left", "right", "params", "chunks"]) {
    if (key in (node as Record<string, unknown>)) {
      out.push(...datesIn((node as Record<string, unknown>)[key], depth + 1, seen));
    }
  }
  return out;
}

function numbersIn(node: unknown, depth = 0, seen = new Set<unknown>()): number[] {
  if (depth > 14 || node === null || typeof node !== "object" || seen.has(node)) return [];
  seen.add(node);
  if (Array.isArray(node)) return node.flatMap((n) => numbersIn(n, depth + 1, seen));
  const out: number[] = [];
  for (const key of ["queryChunks", "value", "left", "right", "params", "chunks"]) {
    if (!(key in (node as Record<string, unknown>))) continue;
    const child = (node as Record<string, unknown>)[key];
    if (typeof child === "number") out.push(child);
    else out.push(...numbersIn(child, depth + 1, seen));
  }
  return out;
}

describe("brain export route", () => {
  let server: Server;
  let base = "";
  let prevOwner: number;
  let prevToken: string;
  let prevNext: string;

  beforeAll(async () => {
    prevOwner = ENV.ownerUserId;
    prevToken = ENV.harvestBridgeToken;
    prevNext = ENV.harvestBridgeTokenNext;
    (ENV as { ownerUserId: number }).ownerUserId = OWNER;
    (ENV as { harvestBridgeToken: string }).harvestBridgeToken = TOKEN;
    (ENV as { harvestBridgeTokenNext: string }).harvestBridgeTokenNext = NEXT_TOKEN;

    const app = express();
    registerBrainExportRoutes(app);
    await new Promise<void>((resolve) => {
      server = app.listen(0, "127.0.0.1", resolve);
    });
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });

  afterAll(async () => {
    (ENV as { ownerUserId: number }).ownerUserId = prevOwner;
    (ENV as { harvestBridgeToken: string }).harvestBridgeToken = prevToken;
    (ENV as { harvestBridgeTokenNext: string }).harvestBridgeTokenNext = prevNext;
    await new Promise<void>((resolve) => server?.close(() => resolve()));
  });

  beforeEach(() => {
    h.state.where = undefined;
    h.state.orderBy = [];
    h.state.limit = undefined;
    h.state.rows = [fakeRow()];
  });

  const get = (qs = "", init: RequestInit = {}) => fetch(`${base}/api/brain/export${qs}`, init);
  const bearer = (qs = "", token = TOKEN) =>
    get(qs, { headers: { Authorization: `Bearer ${token}` } });

  // ── Auth (2 recorded failures; the limiter allows 5 per minute per ip) ────

  it("rejects a request with no auth at all", async () => {
    const res = await get();
    expect(res.status).toBe(401);
    expect(h.state.limit).toBeUndefined();
  });

  it("rejects a wrong bearer token", async () => {
    const res = await bearer("", "not-the-token-0123456789abcdefghijklmn");
    expect(res.status).toBe(401);
    expect(h.state.limit).toBeUndefined();
  });

  it("accepts a valid bearer and returns items", async () => {
    const res = await bearer();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.count).toBe(1);
    expect(body.items[0].title).toBe("a title");
    expect(body.items[0].id).toBe(1);
  });

  it("accepts the rotation token, so a rotation does not stop the mirror", async () => {
    const res = await bearer("", NEXT_TOKEN);
    expect(res.status).toBe(200);
  });

  it("fails closed when HARVEST_BRIDGE_TOKEN is unset", async () => {
    (ENV as { harvestBridgeToken: string }).harvestBridgeToken = "";
    try {
      const res = await bearer();
      expect(res.status).toBe(503);
    } finally {
      (ENV as { harvestBridgeToken: string }).harvestBridgeToken = TOKEN;
    }
  });

  it("fails closed when OWNER_USER_ID is unset", async () => {
    (ENV as { ownerUserId: number }).ownerUserId = 0;
    try {
      const res = await bearer();
      expect(res.status).toBe(503);
    } finally {
      (ENV as { ownerUserId: number }).ownerUserId = OWNER;
    }
  });

  // ── since ────────────────────────────────────────────────────────────────

  it("honours since: the timestamp reaches the query as a Date and is echoed back", async () => {
    const since = "2026-08-31T05:30:00.000Z";
    const res = await bearer(`?since=${encodeURIComponent(since)}`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.since).toBe(since);
    expect(datesIn(h.state.where)).toContain(since);
  });

  it("honours since without a timezone by parsing it, not by ignoring it", async () => {
    const res = await bearer("?since=2026-08-31");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.since).toBe("2026-08-31T00:00:00.000Z");
    expect(datesIn(h.state.where)).toContain("2026-08-31T00:00:00.000Z");
  });

  it("exports everything when since is absent", async () => {
    const res = await bearer();
    const body = await res.json();
    expect(body.since).toBeNull();
    expect(datesIn(h.state.where)).toEqual([]);
  });

  it("refuses a since it cannot parse instead of returning the whole table", async () => {
    const res = await bearer("?since=last-tuesday");
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/since/);
    expect(h.state.limit).toBeUndefined();
  });

  it("walks the boundary second by id when after_id is given", async () => {
    const since = "2026-08-31T05:26:19.000Z";
    const res = await bearer(`?since=${encodeURIComponent(since)}&after_id=412`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.after_id).toBe(412);
    expect(datesIn(h.state.where)).toContain(since);
    expect(numbersIn(h.state.where)).toContain(412);
  });

  it("refuses after_id without since, which would silently mean nothing", async () => {
    const res = await bearer("?after_id=412");
    expect(res.status).toBe(400);
    expect(h.state.limit).toBeUndefined();
  });

  it("refuses a non-integer after_id", async () => {
    expect((await bearer("?since=2026-08-31&after_id=-1")).status).toBe(400);
    expect((await bearer("?since=2026-08-31&after_id=abc")).status).toBe(400);
  });

  it("hands back the cursor for the next page, both halves of it", async () => {
    h.state.rows = [fakeRow({ id: 7, updatedAt: new Date("2026-08-31T05:40:00.000Z") })];
    const body = await (await bearer()).json();
    expect(body.next_since).toBe("2026-08-31T05:40:00.000Z");
    expect(body.next_after_id).toBe(7);
  });

  it("reports a null cursor rather than a stale one when a page is empty", async () => {
    h.state.rows = [];
    const body = await (await bearer()).json();
    expect(body.count).toBe(0);
    expect(body.next_since).toBeNull();
    expect(body.next_after_id).toBeNull();
    expect(body.has_more).toBe(false);
  });

  // ── page cap ─────────────────────────────────────────────────────────────

  it("caps a page: an absurd limit is clamped to EXPORT_PAGE_MAX", async () => {
    const res = await bearer("?limit=99999");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.limit).toBe(EXPORT_PAGE_MAX);
    expect(h.state.limit).toBe(EXPORT_PAGE_MAX);
  });

  it("defaults to EXPORT_PAGE_DEFAULT when no limit is asked for", async () => {
    await bearer();
    expect(h.state.limit).toBe(EXPORT_PAGE_DEFAULT);
    expect(EXPORT_PAGE_DEFAULT).toBeLessThanOrEqual(EXPORT_PAGE_MAX);
  });

  it("passes a smaller limit through untouched", async () => {
    const body = await (await bearer("?limit=3")).json();
    expect(body.limit).toBe(3);
    expect(h.state.limit).toBe(3);
  });

  it("says has_more when the page filled up", async () => {
    h.state.rows = [fakeRow({ id: 1 }), fakeRow({ id: 2 })];
    const body = await (await bearer("?limit=2")).json();
    expect(body.has_more).toBe(true);
  });

  it("refuses a limit that is not a positive integer", async () => {
    expect((await bearer("?limit=0")).status).toBe(400);
    expect((await bearer("?limit=-5")).status).toBe(400);
    expect((await bearer("?limit=abc")).status).toBe(400);
  });

  // ── shape and ordering ───────────────────────────────────────────────────

  it("orders by updated_at then id, so paging is deterministic", async () => {
    await bearer();
    expect(h.state.orderBy).toHaveLength(2);
    // JSON.stringify is no use here: a drizzle column points back at its
    // table, which points back at the column.
    const columnName = (node: unknown): string | undefined => {
      const chunks = (node as { queryChunks?: unknown[] })?.queryChunks ?? [];
      for (const chunk of chunks) {
        const c = chunk as { name?: unknown; table?: unknown };
        if (typeof c?.name === "string" && c.table) return c.name;
      }
      return undefined;
    };
    expect(columnName(h.state.orderBy[0])).toBe("updated_at");
    expect(columnName(h.state.orderBy[1])).toBe("id");
  });

  it("filters by realm when asked, and refuses a realm that is not one", async () => {
    const ok = await bearer("?realm=personal");
    expect(ok.status).toBe(200);
    expect((await ok.json()).realm).toBe("personal");
    expect((await bearer("?realm=everything")).status).toBe(400);
  });

  it("serialises dates as strings a JSON line can round-trip", async () => {
    const body = await (await bearer()).json();
    const item = body.items[0];
    expect(item.updated_at).toBe("2026-08-31T05:26:19.000Z");
    expect(item.captured_at).toBe("2026-08-30T10:00:00.000Z");
    expect(item.due).toBe("2026-09-10");
    expect(item.ready_at).toBeNull();
  });

  it("never writes: insert, update and delete are not called", async () => {
    await bearer();
    await bearer("?since=2026-08-01&limit=5");
    expect(h.state.insert).not.toHaveBeenCalled();
    expect(h.state.update).not.toHaveBeenCalled();
    expect(h.state.delete).not.toHaveBeenCalled();
  });
});

describe("serializeItem", () => {
  /**
   * The one that matters for a backup. If someone adds a column to
   * `brain_items` and the export stops covering it, this fails, and nobody
   * discovers the gap by needing the field back.
   */
  it("exports every column of brain_items, by the table's own names", () => {
    const dbColumns = Object.values(getTableColumns(brainItems))
      .map((c) => c.name)
      .sort();
    const exported = Object.keys(serializeItem(fakeRow())).sort();
    expect(exported).toEqual(dbColumns);
    expect(exported).toHaveLength(30);
  });

  it("keeps json columns as structures, not as strings", () => {
    const item = serializeItem(fakeRow());
    expect(item.attachments).toEqual(["harvest/shots/1/1/a.jpg"]);
    expect(item.proposed).toEqual({ kind: "build" });
  });

  it("turns an absent field into null rather than dropping the key", () => {
    const item = serializeItem({ id: 5 });
    expect(Object.keys(item)).toHaveLength(30);
    expect(item.title).toBeNull();
    expect(item.updated_at).toBeNull();
  });

  /**
   * The exported `updated_at` is half of the mirror's idempotency key, so it
   * has to mean the same thing in every process that calls the route. Drizzle
   * reads the column as UTC rather than through mysql2's default
   * `timezone: "local"`, which is what makes that true. If someone swaps this
   * read onto the raw driver, the keys start moving with the server's
   * timezone and a mirror seeded before the move duplicates wholesale after
   * it. This pins the mapping, not the wiring.
   */
  it("reads a stored timestamp as UTC, so the key does not move with the server", () => {
    const column = getTableColumns(brainItems).updatedAt as unknown as {
      mapFromDriverValue: (v: string) => Date;
    };
    const mapped = column.mapFromDriverValue("2026-08-30 22:26:19");
    expect(mapped.toISOString()).toBe("2026-08-30T22:26:19.000Z");
    expect(serializeItem({ updatedAt: mapped }).updated_at).toBe("2026-08-30T22:26:19.000Z");
  });
});

describe("parseExportQuery", () => {
  it("defaults to everything", () => {
    const r = parseExportQuery({});
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value).toEqual({ since: null, afterId: null, limit: EXPORT_PAGE_DEFAULT, realm: null });
    }
  });

  it("takes the first value when a param is repeated", () => {
    const r = parseExportQuery({ limit: ["7", "9"] });
    expect(r.ok && r.value.limit).toBe(7);
  });

  it("clamps rather than rejecting an oversized limit", () => {
    const r = parseExportQuery({ limit: String(EXPORT_PAGE_MAX * 10) });
    expect(r.ok && r.value.limit).toBe(EXPORT_PAGE_MAX);
  });

  it("treats an empty param as absent", () => {
    const r = parseExportQuery({ since: "", limit: "", realm: "", after_id: "" });
    expect(r.ok && r.value).toEqual({ since: null, afterId: null, limit: EXPORT_PAGE_DEFAULT, realm: null });
  });
});

/**
 * Last on purpose: this trips the shared harvest-bridge failure counter for
 * 127.0.0.1, and anything after it would get 429 instead of what it asked for.
 */
describe("brain export lockout", () => {
  let server: Server;
  let base = "";
  let prevOwner: number;
  let prevToken: string;

  beforeAll(async () => {
    prevOwner = ENV.ownerUserId;
    prevToken = ENV.harvestBridgeToken;
    (ENV as { ownerUserId: number }).ownerUserId = OWNER;
    (ENV as { harvestBridgeToken: string }).harvestBridgeToken = TOKEN;
    const app = express();
    registerBrainExportRoutes(app);
    await new Promise<void>((resolve) => {
      server = app.listen(0, "127.0.0.1", resolve);
    });
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });

  afterAll(async () => {
    (ENV as { ownerUserId: number }).ownerUserId = prevOwner;
    (ENV as { harvestBridgeToken: string }).harvestBridgeToken = prevToken;
    await new Promise<void>((resolve) => server?.close(() => resolve()));
  });

  it("blocks an ip that keeps guessing, before it compares another token", async () => {
    let status = 0;
    for (let i = 0; i < 10; i++) {
      const res = await fetch(`${base}/api/brain/export`, {
        headers: { Authorization: `Bearer wrong-guess-${i}` },
      });
      status = res.status;
      if (status === 429) break;
    }
    expect(status).toBe(429);
  });
});
