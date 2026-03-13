/**
 * seed-land-project-threads.ts -- Create forum spaces for all active land projects.
 *
 * For each accepted/active land project:
 * 1. Ensures the "active-projects" category exists (slug: active-projects, name: Land Project Spaces)
 * 2. Checks if a thread already exists for the project (title match)
 * 3. If not, creates a thread with a templated opening post
 * 4. Logs created vs skipped
 *
 * Usage:
 *   npx tsx scripts/seed-land-project-threads.ts [--dry-run]
 *
 * Requires DATABASE_URL env var pointing to your MySQL connection string.
 */

import * as mysql from "mysql2/promise";

const DRY_RUN = process.argv.includes("--dry-run");

async function main() {
  if (DRY_RUN) {
    console.log("[DRY RUN] No changes will be written.");
  }

  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) throw new Error("DATABASE_URL env var is required");

  const conn = await mysql.createConnection(dbUrl);

  // Get admin user
  const [admins] = await conn.execute(
    "SELECT id FROM users WHERE role = 'admin' LIMIT 1"
  ) as any;
  const adminId: number = admins[0]?.id ?? 1;
  console.log(`Using admin user id=${adminId}`);

  // Ensure active-projects category exists
  const [cats] = await conn.execute(
    "SELECT id FROM forumCategories WHERE slug = 'active-projects' LIMIT 1"
  ) as any;

  let categoryId: number;
  if (cats.length > 0) {
    categoryId = cats[0].id;
    console.log(`Category 'active-projects' exists: id=${categoryId}`);
  } else {
    if (!DRY_RUN) {
      const [res] = await conn.execute(
        "INSERT INTO forumCategories (slug, name, description, `order`) VALUES ('active-projects', 'Land Project Spaces', 'Forum spaces for each active land project in the ReGen Civics network.', 99)"
      ) as any;
      categoryId = res.insertId;
      console.log(`Created category 'active-projects': id=${categoryId}`);
    } else {
      categoryId = 0;
      console.log("[DRY RUN] Would create category 'active-projects'");
    }
  }

  // Fetch all accepted/active land projects
  const [projects] = await conn.execute(
    "SELECT id, projectName FROM applications WHERE status IN ('accepted', 'active') ORDER BY id ASC"
  ) as any;

  console.log(`\nFound ${projects.length} accepted/active land projects.\n`);

  let created = 0;
  let skipped = 0;

  for (const project of projects) {
    const title = `${project.projectName} - Land Project Forum`;
    const body = `This is the official forum space for **${project.projectName}**. Share updates, ask questions, and connect with this project's team and supporters.

If you are a member or supporter of ${project.projectName}, introduce yourself below and let the community know what you are building.`;

    // Check if thread already exists
    const [existing] = await conn.execute(
      "SELECT id FROM forumPosts WHERE title = ? LIMIT 1",
      [title]
    ) as any;

    if (existing.length > 0) {
      console.log(`Skipped (exists): ${title}`);
      skipped++;
      continue;
    }

    if (!DRY_RUN) {
      const [res] = await conn.execute(
        "INSERT INTO forumPosts (categoryId, authorId, title, content, isPinned) VALUES (?, ?, ?, ?, 0)",
        [categoryId, adminId, title, body]
      ) as any;
      const postId = res.insertId;
      console.log(`Created post #${postId}: ${title}`);
      created++;
    } else {
      console.log(`[DRY RUN] Would create: ${title}`);
      created++;
    }
  }

  console.log(`\nDone. Created: ${created}, Skipped: ${skipped}.`);
  await conn.end();
}

main().catch(err => { console.error(err); process.exit(1); });
