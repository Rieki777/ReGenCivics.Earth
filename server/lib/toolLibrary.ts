/**
 * The ReGen Tools Library on the server (ADR-73): finding a tool by its link,
 * giving a new one a slug that cannot collide, carrying an Alliance Partner
 * application's tools into the library, and fetching a page to prefill a
 * submission without letting a caller point the server at its own network.
 */
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { and, eq, inArray, like, or } from "drizzle-orm";
import { allianceApplicationTools, regenTools } from "../../drizzle/schema";
import { getDb } from "../db";
import { cleanRepoUrl } from "@shared/interopTools";
import { cleanDraftTools, nameFromUrl, toolSlugBase, toolUrlKey, type DraftTool, type ToolKind } from "@shared/toolLibrary";

type Db = NonNullable<Awaited<ReturnType<typeof getDb>>>;

// ─── Finding and creating library entries ────────────────────────────────────

/** The library entry whose link is the same tool as this one (any status), or null. */
export async function findToolByUrl(database: Db, url: string): Promise<{ id: number; status: string | null; slug: string } | null> {
  const key = toolUrlKey(url);
  if (!key) return null;
  const host = key.split("/")[0];
  // Narrow by host in SQL, then compare the full key here: the library is
  // small, and the key's normalisation is easier to keep right in one place.
  const rows = await database
    .select({ id: regenTools.id, status: regenTools.status, slug: regenTools.slug, websiteUrl: regenTools.websiteUrl })
    .from(regenTools)
    .where(like(regenTools.websiteUrl, `%${host.replace(/[%_\\]/g, (c) => `\\${c}`)}%`))
    .limit(50);
  const hit = rows.find((r) => toolUrlKey(r.websiteUrl) === key);
  return hit ? { id: hit.id, status: hit.status, slug: hit.slug } : null;
}

/** A slug no other tool has: "seed-commons", then "seed-commons-2", and so on. */
export async function uniqueToolSlug(database: Db, name: string): Promise<string> {
  const base = toolSlugBase(name);
  const rows = await database
    .select({ slug: regenTools.slug })
    .from(regenTools)
    .where(or(eq(regenTools.slug, base), like(regenTools.slug, `${base}-%`)));
  const taken = new Set(rows.map((r) => r.slug));
  if (!taken.has(base)) return base;
  for (let n = 2; n < 1000; n++) {
    if (!taken.has(`${base}-${n}`)) return `${base}-${n}`;
  }
  return `${base}-${Date.now()}`;
}

export type NewToolInput = {
  name: string;
  websiteUrl: string;
  shortSummary: string | null;
  longDescription?: string | null;
  kind?: ToolKind | null;
  isOpenSource?: boolean;
  pricingModel?: "free" | "freemium" | "paid" | "open_source";
  regions?: string[];
  problemStatements?: string[];
  logoUrl?: string | null;
  cardImageUrl?: string | null;
  gettingStartedUrl?: string | null;
  contactEmail?: string | null;
  submittedBy: number | null;
};

/** Insert a pending library entry. Every link is cleaned to http or https first. */
export async function createPendingTool(database: Db, input: NewToolInput): Promise<number> {
  const websiteUrl = cleanRepoUrl(input.websiteUrl);
  if (!websiteUrl) throw new Error("A tool needs an http or https link.");
  const name = (input.name.trim() || nameFromUrl(websiteUrl)).slice(0, 255);
  const res = await database.insert(regenTools).values({
    name,
    slug: await uniqueToolSlug(database, name),
    websiteUrl,
    shortSummary: input.shortSummary,
    longDescription: input.longDescription ?? null,
    pricingModel: input.pricingModel ?? (input.isOpenSource ? "open_source" : "free"),
    isOpenSource: input.isOpenSource ?? false,
    isPhysical: input.kind === "physical",
    toolKind: input.kind ?? null,
    regions: input.regions ?? [],
    problemStatements: input.problemStatements ?? [],
    logoUrl: cleanRepoUrl(input.logoUrl) ?? null,
    cardImageUrl: cleanRepoUrl(input.cardImageUrl) ?? null,
    gettingStartedUrl: cleanRepoUrl(input.gettingStartedUrl) ?? null,
    contactEmail: input.contactEmail ?? null,
    submittedBy: input.submittedBy,
    status: "pending",
  });
  const id = (Array.isArray(res) ? (res[0] as { insertId?: number }) : (res as { insertId?: number }))?.insertId;
  if (!id) throw new Error("Could not add the tool.");
  return id;
}

// ─── An Alliance Partner application's tools ─────────────────────────────────

export type ApplicationToolRow = {
  toolId: number;
  createdByApplication: boolean;
  name: string;
  slug: string;
  websiteUrl: string;
  shortSummary: string | null;
  status: string | null;
  toolKind: string | null;
};

/** The library entries an application brought, with their status. */
export async function applicationTools(database: Db, allianceApplicationId: number): Promise<ApplicationToolRow[]> {
  const links = await database
    .select({ toolId: allianceApplicationTools.toolId, created: allianceApplicationTools.createdByApplication })
    .from(allianceApplicationTools)
    .where(eq(allianceApplicationTools.allianceApplicationId, allianceApplicationId));
  if (!links.length) return [];
  const rows = await database
    .select({
      id: regenTools.id,
      name: regenTools.name,
      slug: regenTools.slug,
      websiteUrl: regenTools.websiteUrl,
      shortSummary: regenTools.shortSummary,
      status: regenTools.status,
      toolKind: regenTools.toolKind,
    })
    .from(regenTools)
    .where(inArray(regenTools.id, links.map((l) => l.toolId)));
  const created = new Map(links.map((l) => [l.toolId, l.created === 1]));
  return rows.map((r) => ({
    toolId: r.id,
    createdByApplication: created.get(r.id) ?? false,
    name: r.name,
    slug: r.slug,
    websiteUrl: r.websiteUrl,
    shortSummary: r.shortSummary,
    status: r.status,
    toolKind: r.toolKind,
  }));
}

/**
 * Carry the application's draft tools into the library, idempotently. Called
 * when the application is sent, and again when a sent application is edited.
 *
 * A tool whose link the library already has is linked, never duplicated. A
 * new one becomes a pending entry. A pending entry this application made that
 * is no longer on its list is removed; an approved one stays, since it is
 * already public and may have endorsements and clicks.
 */
export async function syncApplicationTools(
  database: Db,
  app: { id: number; userId: number | null; contactEmail: string; tools: string | null },
): Promise<ApplicationToolRow[]> {
  const draft = cleanDraftTools(app.tools).filter((t) => cleanRepoUrl(t.url));
  const current = await applicationTools(database, app.id);
  const keep = new Set<number>();

  for (const tool of draft) {
    const url = cleanRepoUrl(tool.url)!;
    const already = current.find((c) => toolUrlKey(c.websiteUrl) === toolUrlKey(url));
    if (already) {
      keep.add(already.toolId);
      // The applicant's words win while the entry is still theirs and pending.
      if (already.createdByApplication && already.status === "pending") {
        await database
          .update(regenTools)
          .set({
            name: (tool.name || nameFromUrl(url)).slice(0, 255),
            websiteUrl: url,
            shortSummary: tool.description || null,
            toolKind: tool.kind,
            isPhysical: tool.kind === "physical",
            isOpenSource: tool.isOpenSource,
          })
          .where(eq(regenTools.id, already.toolId));
      }
      continue;
    }
    const existing = await findToolByUrl(database, url);
    if (existing && existing.status !== "rejected") {
      await database
        .insert(allianceApplicationTools)
        .values({ allianceApplicationId: app.id, toolId: existing.id, createdByApplication: 0 })
        .onDuplicateKeyUpdate({ set: { toolId: existing.id } });
      keep.add(existing.id);
      continue;
    }
    const id = await createPendingTool(database, toolInputFromDraft(tool, url, app));
    await database.insert(allianceApplicationTools).values({ allianceApplicationId: app.id, toolId: id, createdByApplication: 1 });
    keep.add(id);
  }

  for (const c of current) {
    if (keep.has(c.toolId)) continue;
    await database
      .delete(allianceApplicationTools)
      .where(and(eq(allianceApplicationTools.allianceApplicationId, app.id), eq(allianceApplicationTools.toolId, c.toolId)));
    if (c.createdByApplication && c.status === "pending") {
      await database.delete(regenTools).where(and(eq(regenTools.id, c.toolId), eq(regenTools.status, "pending")));
    }
  }
  return applicationTools(database, app.id);
}

function toolInputFromDraft(tool: DraftTool, url: string, app: { userId: number | null; contactEmail: string }): NewToolInput {
  return {
    name: tool.name || nameFromUrl(url),
    websiteUrl: url,
    shortSummary: tool.description || null,
    kind: tool.kind,
    isOpenSource: tool.isOpenSource,
    contactEmail: app.contactEmail,
    submittedBy: app.userId,
  };
}

/**
 * On approval: approve the pending entries this application made, except any
 * the admin unticked. Linked entries made by someone else keep their status.
 * Returns the ids approved.
 */
export async function approveApplicationTools(
  database: Db,
  allianceApplicationId: number,
  adminUserId: number,
  only?: number[],
): Promise<number[]> {
  const rows = await applicationTools(database, allianceApplicationId);
  const allow = only ? new Set(only) : null;
  const ids = rows
    .filter((r) => r.createdByApplication && r.status === "pending" && (!allow || allow.has(r.toolId)))
    .map((r) => r.toolId);
  if (!ids.length) return [];
  await database
    .update(regenTools)
    .set({ status: "approved", approvedBy: adminUserId })
    .where(and(inArray(regenTools.id, ids), eq(regenTools.status, "pending")));
  return ids;
}

// ─── Fetching a page safely ──────────────────────────────────────────────────

/** True for an address the server must never fetch: loopback, private, link-local, metadata. */
export function isPrivateAddress(address: string): boolean {
  const v = isIP(address);
  if (v === 4) {
    const [a, b] = address.split(".").map(Number);
    return (
      a === 0 || a === 10 || a === 127 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 198 && (b === 18 || b === 19)) ||
      a >= 224
    );
  }
  if (v === 6) {
    const s = address.toLowerCase();
    if (s === "::" || s === "::1") return true;
    const mapped = s.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    if (mapped) return isPrivateAddress(mapped[1]);
    return /^(fc|fd|fe8|fe9|fea|feb|ff)/.test(s);
  }
  return true;
}

/** Resolve a link and refuse it unless it is http(s) on a standard port at a public address. */
export async function assertPublicHttpUrl(raw: string): Promise<URL> {
  const cleaned = cleanRepoUrl(raw);
  if (!cleaned) throw new Error("Only http and https links can be read.");
  const url = new URL(cleaned);
  if (url.username || url.password) throw new Error("Links with a password in them cannot be read.");
  if (url.port && url.port !== "80" && url.port !== "443") throw new Error("That link uses a port we do not read.");
  const host = url.hostname.replace(/^\[|\]$/g, "");
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".internal") || host.endsWith(".local")) {
    throw new Error("That address is not on the public internet.");
  }
  const addresses = isIP(host) ? [{ address: host }] : await lookup(host, { all: true, verbatim: true });
  if (!addresses.length || addresses.some((a) => isPrivateAddress(a.address))) {
    throw new Error("That address is not on the public internet.");
  }
  return url;
}

const FETCH_MAX_BYTES = 512 * 1024;
const FETCH_MAX_REDIRECTS = 3;

/**
 * Fetch a public page's HTML for the submit form's prefill. Every redirect hop
 * is checked again, the body is capped, and it gives up after ten seconds.
 */
export async function fetchPublicPage(raw: string): Promise<{ url: string; html: string }> {
  let url = await assertPublicHttpUrl(raw);
  for (let hop = 0; hop <= FETCH_MAX_REDIRECTS; hop++) {
    const res = await fetch(url, {
      headers: { "User-Agent": "ReGenCivicsBot/1.0 (+https://regencivics.earth/tools)" },
      redirect: "manual",
      signal: AbortSignal.timeout(10_000),
    });
    if (res.status >= 300 && res.status < 400) {
      const next = res.headers.get("location");
      if (!next) break;
      url = await assertPublicHttpUrl(new URL(next, url).href);
      continue;
    }
    const reader = res.body?.getReader();
    if (!reader) return { url: url.href, html: "" };
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (size < FETCH_MAX_BYTES) {
      const { done, value } = await reader.read();
      if (done || !value) break;
      chunks.push(value);
      size += value.byteLength;
    }
    await reader.cancel().catch(() => undefined);
    return { url: url.href, html: Buffer.concat(chunks).toString("utf8").slice(0, FETCH_MAX_BYTES) };
  }
  throw new Error("That link redirects too many times.");
}
