/**
 * Versioned prompts for the funding application engine, stored in
 * funding_prompts (drizzle/0275).
 *
 * Why this exists. The positioning kernel used to be a TypeScript constant in
 * server/funding/positioning-kernel.ts, in a public AGPL repo. It named
 * funders, described internal strategy, and carried return language the site
 * no longer uses. Rye approved moving it out (plan P0-7, 2026-09-27). The text
 * now lives in the database, edited in /admin/funding, and every version is
 * kept so a regeneration can be compared with what the kernel said before.
 *
 * The code keeps only a neutral fallback, used when no version has been saved
 * yet (a fresh database, a test run). The fallback names no funder and holds
 * no strategy; it produces thin positioning on purpose, so an unseeded
 * database is obvious rather than quietly wrong.
 */
import { and, desc, eq, sql } from "drizzle-orm";
import { getDb } from "../db";
import { fundingPrompts, type FundingPromptRow } from "../../drizzle/schema";

export const PROMPT_KEYS = ["positioning_kernel", "cowork_template"] as const;
export type PromptKey = (typeof PROMPT_KEYS)[number];

type Db = NonNullable<Awaited<ReturnType<typeof getDb>>>;

export interface ActivePrompt {
  key: PromptKey;
  body: string;
  version: number | null;
  /** True when no saved version exists and the neutral fallback is in use. */
  isFallback: boolean;
}

const CACHE_TTL_MS = 60 * 1000;
const cache = new Map<PromptKey, { at: number; value: ActivePrompt }>();

/** Drop cached prompts, e.g. after a save, so the next generation reads it. */
export function clearPromptCache(key?: PromptKey): void {
  if (key) cache.delete(key);
  else cache.clear();
}

/**
 * The active version of a prompt, or the caller's fallback when none is saved.
 * A database error falls back too, and says so in the log: the engine still
 * runs, and isFallback tells the admin page to warn.
 */
export async function getActivePrompt(key: PromptKey, fallback: string): Promise<ActivePrompt> {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.value;

  let value: ActivePrompt = { key, body: fallback, version: null, isFallback: true };
  try {
    const db = await getDb();
    if (db) {
      const [row] = await db
        .select()
        .from(fundingPrompts)
        .where(and(eq(fundingPrompts.promptKey, key), eq(fundingPrompts.isActive, true)))
        .orderBy(desc(fundingPrompts.version))
        .limit(1);
      if (row && row.body.trim()) value = { key, body: row.body, version: row.version, isFallback: false };
    }
  } catch (err) {
    console.warn(`[funding-prompts] could not read ${key}, using the fallback:`, err);
  }
  cache.set(key, { at: Date.now(), value });
  return value;
}

/** Every saved version of a prompt, newest first. */
export async function listPromptVersions(db: Db, key: PromptKey): Promise<FundingPromptRow[]> {
  return db
    .select()
    .from(fundingPrompts)
    .where(eq(fundingPrompts.promptKey, key))
    .orderBy(desc(fundingPrompts.version))
    .limit(50);
}

/**
 * Save a new version and make it the active one. Versions are never edited in
 * place and never deleted: the history is the point. Returns the new row, or
 * the current active row unchanged when the body is identical to it.
 */
export async function savePromptVersion(
  db: Db,
  key: PromptKey,
  body: string,
  opts: { note?: string | null; createdBy?: number | null } = {},
): Promise<{ row: FundingPromptRow; created: boolean }> {
  const text = body.replace(/\r\n/g, "\n").trim();
  if (!text) throw new Error("A prompt cannot be empty.");

  const [active] = await db
    .select()
    .from(fundingPrompts)
    .where(and(eq(fundingPrompts.promptKey, key), eq(fundingPrompts.isActive, true)))
    .orderBy(desc(fundingPrompts.version))
    .limit(1);
  if (active && active.body.trim() === text) return { row: active, created: false };

  const row = await db.transaction(async (tx) => {
    const [{ maxVersion }] = await tx
      .select({ maxVersion: sql<number>`COALESCE(MAX(${fundingPrompts.version}), 0)` })
      .from(fundingPrompts)
      .where(eq(fundingPrompts.promptKey, key));
    const version = Number(maxVersion) + 1;
    await tx
      .update(fundingPrompts)
      .set({ isActive: false })
      .where(and(eq(fundingPrompts.promptKey, key), eq(fundingPrompts.isActive, true)));
    await tx.insert(fundingPrompts).values({
      promptKey: key,
      version,
      body: text,
      isActive: true,
      note: opts.note ? opts.note.slice(0, 500) : null,
      createdBy: opts.createdBy ?? null,
    });
    const [inserted] = await tx
      .select()
      .from(fundingPrompts)
      .where(and(eq(fundingPrompts.promptKey, key), eq(fundingPrompts.version, version)))
      .limit(1);
    return inserted;
  });

  clearPromptCache(key);
  return { row, created: true };
}

/** Make an older version active again (a rollback), without a new row. */
export async function activatePromptVersion(db: Db, key: PromptKey, version: number): Promise<void> {
  await db.transaction(async (tx) => {
    const [target] = await tx
      .select({ id: fundingPrompts.id })
      .from(fundingPrompts)
      .where(and(eq(fundingPrompts.promptKey, key), eq(fundingPrompts.version, version)))
      .limit(1);
    if (!target) throw new Error(`No version ${version} of ${key}`);
    await tx
      .update(fundingPrompts)
      .set({ isActive: false })
      .where(and(eq(fundingPrompts.promptKey, key), eq(fundingPrompts.isActive, true)));
    await tx.update(fundingPrompts).set({ isActive: true }).where(eq(fundingPrompts.id, target.id));
  });
  clearPromptCache(key);
}
