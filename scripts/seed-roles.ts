/**
 * Seed the roles table from client/src/data/gameRoles.ts (idempotent upsert by slug).
 *
 * Usage:
 *   npx tsx scripts/seed-roles.ts
 *
 * Run once after migration 0152. gameRoles.ts stays as the seed-of-record until
 * the Team page + pipeline are confirmed reading the roles table; after that the
 * table is the source of truth and admin edits it directly.
 *
 * Requires DATABASE_URL. slug + aliases derivation matches coordinationFlywheel.ts
 * so roles.slug lines up with roleHolders.roleSlug.
 */
import * as dotenv from "dotenv";
dotenv.config();
import mysql from "mysql2/promise";
import { drizzle } from "drizzle-orm/mysql2";
import { eq } from "drizzle-orm";
import { roles } from "../drizzle/schema";
import { gameRoles } from "../client/src/data/gameRoles";

function toSlug(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

function buildAliases(r: { title: string; characterName?: string; circle?: string }): string[] {
  const out = new Set<string>();
  out.add(r.title);
  if (r.characterName) {
    out.add(r.characterName);
    const s = r.characterName.replace(/^The\s+/i, "").trim();
    if (s && s !== r.characterName) out.add(s);
  }
  if (r.circle) {
    out.add(r.circle);
    const s = r.circle.replace(/\s*Circle$/i, "").trim();
    if (s && s !== r.circle) out.add(s);
  }
  return Array.from(out);
}

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL not set");
  const conn = await mysql.createConnection(url);
  const db = drizzle(conn);

  let inserted = 0;
  let updated = 0;
  for (const g of gameRoles) {
    const slug = toSlug(g.title);
    const row = {
      slug,
      title: g.title,
      characterName: g.characterName ?? null,
      tagline: g.tagline ?? null,
      emoji: g.emoji ?? null,
      characterImage: g.characterImage ?? null,
      sceneImage: g.sceneImage ?? null,
      purpose: g.purpose ?? null,
      circle: g.circle ?? null,
      powers: g.powers ?? [],
      rights: g.rights ?? [],
      responsibilities: g.responsibilities ?? [],
      domains: g.domains ?? null,
      band: g.band ?? null,
      tokenAward: g.tokenAward ?? null,
      maxTokenAward: g.maxTokenAward ?? null,
      hoursPerWeek: g.hoursPerWeek ?? null,
      deliverables: g.deliverables ?? [],
      seed: g.seed ?? null,
      harvest: g.harvest ?? null,
      seasons: g.seasons ?? [],
      assignment: g.assignment ?? null,
      color: g.color ?? null,
      cardImagePosition: g.cardImagePosition ?? null,
      kind: (g.kind ?? "game") as "game" | "fund",
      specialContent: g.specialContent ?? null,
      aliases: buildAliases(g),
      active: 1,
    };
    const [existing] = await db.select({ id: roles.id }).from(roles).where(eq(roles.slug, slug)).limit(1);
    if (existing) {
      await db.update(roles).set(row).where(eq(roles.slug, slug));
      updated += 1;
    } else {
      await db.insert(roles).values(row);
      inserted += 1;
    }
  }

  console.log(`seed-roles: ${inserted} inserted, ${updated} updated, ${gameRoles.length} total`);
  await conn.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
