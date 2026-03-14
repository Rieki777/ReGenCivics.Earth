/**
 * seed-organisations.ts
 *
 * Populates the `organisations` table with all alliance partner orgs,
 * then creates a forum category `active-organisations` and one forum
 * thread per org (idempotent via INSERT IGNORE / ON DUPLICATE KEY UPDATE).
 *
 * PREREQUISITE: Run `pnpm db:push` first to create the `organisations` table.
 *
 * Usage:
 *   npx tsx scripts/seed-organisations.ts [--dry-run]
 *
 * Set RYE_USER_ID env var to the admin user's DB id (get from check-db.ts output).
 *   $Env:RYE_USER_ID=1; npx tsx scripts/seed-organisations.ts
 */

import mysql from "mysql2/promise";
import * as dotenv from "dotenv";
dotenv.config();

const DRY_RUN = process.argv.includes("--dry-run");
const RYE_USER_ID = parseInt(process.env.RYE_USER_ID ?? "1", 10);

const ORGS = [
  { orgId: "hypha",           name: "Hypha DAO",                  url: "hypha.earth",                         description: "Decentralised governance and treasury management tools for regenerative organisations." },
  { orgId: "seeds",           name: "SEEDS",                      url: "joinseeds.earth",                     description: "A regenerative cryptocurrency ecosystem backing a new economy rooted in abundance, cooperation, and ecological healing." },
  { orgId: "nestr",           name: "Nestr.io",                   url: "nestr.io",                            description: "A decentralised collaboration platform for purpose-driven teams." },
  { orgId: "kinship_earth",   name: "Kinship Earth",              url: "kinshipearth.org",                    description: "Flow Funding for grassroots leaders building regenerative futures." },
  { orgId: "open_future",     name: "Open Future Coalition",      url: "openfuturecoalition.org",             description: "Technical, social, and financial tools to accelerate the regenerative transition." },
  { orgId: "united_planet",   name: "UP.Game (United Planet)",    url: "up.game",                             description: "An immersive redesign game for regenerative solutions and collective intelligence." },
  { orgId: "gaia_biolab",     name: "Gaia Union BioLab",          url: "gaia-union.com/biolab",               description: "Bio-integral regenerative initiatives bridging science and earth-based practice." },
  { orgId: "closer",          name: "Closer.earth",               url: "closer.earth",                        description: "Operating system for regenerative communities and intentional living." },
  { orgId: "oasa",            name: "OASA.earth",                 url: "oasa.earth",                          description: "Operating system for regenerative civilisation: tools, governance, and community design." },
  { orgId: "planetary_party", name: "Planetary Party",            url: "planetaryparty.co",                   description: "Bioregional gatherings weaving culture, ecology, and community." },
  { orgId: "dao_universe",    name: "DAO Universe Club",          url: "daouniverse.club",                    description: "Community for visionary DAO founders building decentralised futures." },
  { orgId: "desa",            name: "DESA",                       url: "desa.earth",                          description: "Land discovery, acquisition, and legal support for regenerative projects." },
  { orgId: "permatours",      name: "Permatours",                 url: "permatours.org",                      description: "Festivals, events, and project activation that regenerate people and place." },
  { orgId: "maptio",          name: "Maptio",                     url: "maptio.com",                          description: "Organisation mapping and coordination tools for non-hierarchical teams." },
  { orgId: "local_scale",     name: "LocalScale",                 url: "localscale.org",                      description: "Bioregional economic tools building thriving local economies." },
];

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

async function main() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error("DATABASE_URL not set. Load .env first.");
    process.exit(1);
  }

  const conn = await mysql.createConnection(dbUrl);
  console.log(DRY_RUN ? "DRY RUN — no writes\n" : "LIVE RUN — writing to DB\n");
  console.log(`Using RYE_USER_ID = ${RYE_USER_ID} for forum post authorship\n`);

  try {
    // 1. Ensure forum category exists
    const categorySlug = "active-organisations";
    const categoryName = "Alliance Organisations";
    const categoryDescription = "Meet the alliance partner organisations. Ask questions, explore collaboration, and follow their updates.";

    let categoryId: number;
    const [catRows] = await conn.execute<any[]>(
      "SELECT id FROM forumCategories WHERE slug = ? LIMIT 1",
      [categorySlug],
    );

    if (catRows.length > 0) {
      categoryId = catRows[0].id;
      console.log(`Forum category already exists: id=${categoryId} slug=${categorySlug}`);
    } else {
      console.log(`Creating forum category: ${categoryName}`);
      if (!DRY_RUN) {
        const [result] = await conn.execute<any>(
          "INSERT INTO forumCategories (name, slug, description) VALUES (?, ?, ?)",
          [categoryName, categorySlug, categoryDescription],
        );
        categoryId = result.insertId;
        console.log(`  Created category id=${categoryId}`);
      } else {
        categoryId = -1;
        console.log("  (dry run — category not created)");
      }
    }

    // 2. Seed each org into the organisations table + create forum thread
    for (const org of ORGS) {
      // Upsert into organisations table
      const [existing] = await conn.execute<any[]>(
        "SELECT id, forumPostId FROM organisations WHERE orgId = ? LIMIT 1",
        [org.orgId],
      );

      let orgDbId: number;
      let existingForumPostId: number | null = null;

      if (existing.length > 0) {
        orgDbId = existing[0].id;
        existingForumPostId = existing[0].forumPostId;
        console.log(`  [ORG EXISTS] ${org.name} (id=${orgDbId})`);
        // Update description/url in case they changed
        if (!DRY_RUN) {
          await conn.execute(
            "UPDATE organisations SET name=?, url=?, description=?, status='active' WHERE id=?",
            [org.name, org.url, org.description, orgDbId],
          );
        }
      } else {
        console.log(`  [ORG NEW] ${org.name}`);
        if (!DRY_RUN) {
          const [result] = await conn.execute<any>(
            "INSERT INTO organisations (orgId, name, url, description, status) VALUES (?, ?, ?, ?, 'active')",
            [org.orgId, org.name, org.url, org.description],
          );
          orgDbId = result.insertId;
        } else {
          orgDbId = -1;
        }
      }

      // Create forum thread if not already linked
      if (existingForumPostId) {
        console.log(`  [FORUM EXISTS] ${org.name} -> forumPostId=${existingForumPostId}`);
        continue;
      }

      const postTitle = org.name;
      const postSlug = slugify(org.name);
      const postBody = `## ${org.name}\n\n**Website:** [${org.url}](https://${org.url})\n\n${org.description}\n\n---\n\nThis thread is the home for everything related to ${org.name} in the ReGen Civics community. Use it to:\n\n- Ask questions about this organisation\n- Share collaboration ideas\n- Post updates if you work with them\n- Connect with other community members who are involved\n\nIf you are part of the ${org.name} team, introduce yourself below.`;

      console.log(`  [FORUM NEW] Creating thread for ${org.name} (slug: ${postSlug})`);

      if (!DRY_RUN && categoryId !== -1) {
        const [postResult] = await conn.execute<any>(
          `INSERT INTO forumPosts (categoryId, authorId, title, slug, body, isPinned, isLocked, views)
           VALUES (?, ?, ?, ?, ?, 1, 0, 0)
           ON DUPLICATE KEY UPDATE title=VALUES(title), body=VALUES(body)`,
          [categoryId, RYE_USER_ID, postTitle, postSlug, postBody],
        );
        const forumPostId = postResult.insertId || (
          // ON DUPLICATE KEY UPDATE returns 0 for insertId — fetch existing
          await conn.execute<any[]>(
            "SELECT id FROM forumPosts WHERE slug = ? LIMIT 1",
            [postSlug],
          ).then(([rows]) => rows[0]?.id)
        );

        if (orgDbId !== -1) {
          await conn.execute(
            "UPDATE organisations SET forumPostId = ? WHERE id = ?",
            [forumPostId, orgDbId],
          );
        }
        console.log(`  -> forumPostId=${forumPostId}`);
      }
    }

    console.log(DRY_RUN ? "\nDRY RUN complete." : "\nDone. All organisations seeded.");
  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
