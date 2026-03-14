/**
 * seed-active-entities.ts
 *
 * Seeds canonical land projects and alliance organisations into the database.
 * Replaces: set-project-statuses.ts and the data-seeding portion of seed-organisations.ts
 *
 * What it does:
 *   1. Inserts all 13 land projects into `applications` with status = active
 *   2. Inserts all 15 alliance orgs into `organisations` with status = active
 *   3. Creates the `active-organisations` forum category (if missing)
 *   4. Creates one pinned forum thread per org in that category
 *   5. Links forumPostId back to each org row
 *
 * Land project forum threads are handled separately by seed-land-project-threads.ts
 * (run it after this script completes).
 *
 * Prerequisites:
 *   - pnpm db:push run (organisations table must exist)
 *   - DATABASE_URL loaded in env
 *   - RYE_USER_ID set to admin user's DB id
 *
 * Usage:
 *   npx tsx scripts/seed-active-entities.ts [--dry-run]
 *   $Env:RYE_USER_ID=1; npx tsx scripts/seed-active-entities.ts --dry-run
 *   $Env:RYE_USER_ID=1; npx tsx scripts/seed-active-entities.ts
 */

import mysql from "mysql2/promise";
import * as dotenv from "dotenv";
dotenv.config();

const DRY_RUN = process.argv.includes("--dry-run");
const RYE_USER_ID = parseInt(process.env.RYE_USER_ID ?? "1", 10);

// ── Land Projects ─────────────────────────────────────────────────────────────
// Source: client/src/pages/Connect.tsx landProjects array
const LAND_PROJECTS = [
  {
    id: "la_tierra",
    name: "La Tierra",
    location: "Costa Rica",
    country: "Costa Rica",
    focus: "Blue Zone regenerative village",
    websiteUrl: null,
    status: "inactive" as const,
  },
  {
    id: "starseed",
    name: "StarSeed Village",
    location: "Guatemala",
    country: "Guatemala",
    focus: "Regenerative community anchored in Indigenous land wisdom",
    websiteUrl: null,
    status: "active" as const,
  },
  {
    id: "nyx",
    name: "The Nyx",
    location: "Bali, Indonesia",
    country: "Indonesia",
    focus: "Co-living and creative residency on 5 acres",
    websiteUrl: null,
    status: "active" as const,
  },
  {
    id: "neighbourgood",
    name: "Our NeighbourGood",
    location: "New Zealand",
    country: "New Zealand",
    focus: "Ecovillage on 100+ acres",
    websiteUrl: null,
    status: "active" as const,
  },
  {
    id: "highland_lake",
    name: "Highland Lake CampUS",
    location: "NC, USA",
    country: "United States",
    focus: "ReFi and ReGov incubator on 100 to 120 acres",
    websiteUrl: null,
    status: "active" as const,
  },
  {
    id: "liminal",
    name: "Liminal Village",
    location: "Italy",
    country: "Italy",
    focus: "Regenerative eco-village in rural Italy",
    websiteUrl: null,
    status: "active" as const,
  },
  {
    id: "heartland",
    name: "Heartland Retreat",
    location: "California, USA",
    country: "United States",
    focus: "Eco-healing sanctuary in California",
    websiteUrl: null,
    status: "active" as const,
  },
  {
    id: "tdf",
    name: "Traditional Dream Factory",
    location: "Portugal",
    country: "Portugal",
    focus: "Web3 regenerative village in Portugal",
    websiteUrl: "traditionaldreamfactory.com",
    status: "active" as const,
  },
  {
    id: "ubuntu",
    name: "Ubuntu",
    location: "Various",
    country: null,
    focus: "Community-led regeneration",
    websiteUrl: null,
    status: "active" as const,
  },
  {
    id: "finca_sagrada",
    name: "Finca Sagrada",
    location: "Latin America",
    country: null,
    focus: "Biodynamic community farm",
    websiteUrl: null,
    status: "active" as const,
  },
  {
    id: "tabi",
    name: "Tabi",
    location: "Various",
    country: null,
    focus: "Regenerative land project",
    websiteUrl: null,
    status: "active" as const,
  },
  {
    id: "tioga",
    name: "Tioga",
    location: "Various",
    country: null,
    focus: "Ecological restoration",
    websiteUrl: null,
    status: "active" as const,
  },
  {
    id: "lala_gardens",
    name: "LaLa Gardens Cooperative",
    location: "Various",
    country: null,
    focus: "Cooperative garden community",
    websiteUrl: null,
    status: "active" as const,
  },
];

// ── Alliance Organisations ────────────────────────────────────────────────────
// Source: client/src/pages/Connect.tsx allianceOrganizations array
// Forum content written to sound like a real regen person, no AI patterns
const ORGS = [
  {
    orgId: "hypha",
    name: "Hypha DAO",
    url: "hypha.earth",
    description: "Decentralised governance and treasury tools for regenerative organisations.",
    forumBody: `Hypha builds the governance and treasury infrastructure for organisations that run without a traditional hierarchy. If you are working on land stewardship, cooperatives, or collective projects and want to understand what non-hierarchical governance looks like in practice, this is a good place to ask questions and compare notes.\n\nWhat governance structures are you running, or trying to figure out?`,
  },
  {
    orgId: "seeds",
    name: "SEEDS",
    url: "joinseeds.earth",
    description: "A regenerative currency and economic system backing a new economy.",
    forumBody: `SEEDS is exploring a foundational question: can a currency be designed to reward regeneration rather than extraction? The network backs a new economy rooted in ecological health and community reciprocity.\n\nIf you are curious about regenerative finance, complementary currencies, or what a post-extractive economy actually looks like in practice, bring your questions here.`,
  },
  {
    orgId: "nestr",
    name: "Nestr.io",
    url: "nestr.io",
    description: "A decentralised collaboration platform for purpose-driven teams.",
    forumBody: `Nestr is a collaboration platform built for teams that care about purpose as much as output. It is designed for distributed, non-hierarchical groups, which makes it a natural fit for the kinds of projects and communities in the ReGen network.\n\nWhat coordination and collaboration tools are you using? What is breaking down?`,
  },
  {
    orgId: "kinship_earth",
    name: "Kinship Earth",
    url: "kinshipearth.org",
    description: "Flow Funding for grassroots leaders working on regenerative futures.",
    forumBody: `Kinship Earth runs Flow Funding: a model for getting resources to grassroots leaders without the usual gatekeeping and proposal overhead. If you are building something real on the ground and need to understand how funding can actually reach you, this is a useful connection to explore.\n\nWhat does funding access look like from where you are sitting?`,
  },
  {
    orgId: "open_future",
    name: "Open Future Coalition",
    url: "openfuturecoalition.org",
    description: "Technical, social, and financial tools to move the regenerative transition forward.",
    forumBody: `Open Future Coalition works at the intersection of technology, social change, and finance to move the transition to regenerative systems forward. They are interested in the structural conditions that make change possible, not just the projects.\n\nWhat systems-level shifts do you think would make the most difference right now?`,
  },
  {
    orgId: "united_planet",
    name: "UP.Game (United Planet)",
    url: "up.game",
    description: "An immersive redesign game for regenerative solutions and collective intelligence.",
    forumBody: `United Planet runs an immersive game format for redesigning systems. Players work through real challenges using collective intelligence, which means it is both a game and a serious design methodology.\n\nWhat broken systems would you most want to redesign if you had a room full of sharp people and good tools?`,
  },
  {
    orgId: "gaia_biolab",
    name: "Gaia Union BioLab",
    url: "gaia-union.com/biolab",
    description: "Bio-integral regenerative work bridging science and earth-based practice.",
    forumBody: `Gaia Union BioLab is working where ecology meets lived practice, bringing rigorous science together with earth-based ways of knowing. If you are curious about regenerative agriculture, soil biology, or what bio-integral design actually means on the ground, this is a good place to dig in.\n\nWhat biological systems are you watching, tending, or trying to understand?`,
  },
  {
    orgId: "closer",
    name: "Closer.earth",
    url: "closer.earth",
    description: "An operating system for regenerative communities and intentional living.",
    forumBody: `Closer is building operating infrastructure for intentional communities. The hard parts of community life, coordination, finances, decision making, conflict, are where they focus. If you are running or building a community and hitting those walls, this is a relevant conversation.\n\nWhat part of running community is the hardest to get right?`,
  },
  {
    orgId: "oasa",
    name: "OASA.earth",
    url: "oasa.earth",
    description: "An operating system for regenerative civilisation, from tools to governance to design.",
    forumBody: `OASA is working at civilisation scale. Their operating system covers governance, legal structures, economic design, and community architecture for regenerative settlements. They are building the underlying layer that makes distributed regenerative living possible at scale.\n\nWhat does civilisation design mean to you? Where does the current model break down most visibly?`,
  },
  {
    orgId: "planetary_party",
    name: "Planetary Party",
    url: "planetaryparty.co",
    description: "Bioregional gatherings weaving culture, ecology, and community.",
    forumBody: `Planetary Party creates gatherings rooted in place. The idea is that culture and ecology belong together, and that celebrations and festivals can do real community-building work when they are designed with intention.\n\nWhat makes a gathering feel like it actually matters? What kills the magic?`,
  },
  {
    orgId: "dao_universe",
    name: "DAO Universe Club",
    url: "daouniverse.club",
    description: "A community for people building decentralised organisations.",
    forumBody: `DAO Universe Club connects people who are building or thinking seriously about decentralised organisations. Not just the theory but the real work of figuring out what DAOs can do and where they fall short.\n\nWhat has actually worked in the DAOs or distributed organisations you have been part of? What has been a mess?`,
  },
  {
    orgId: "desa",
    name: "DESA",
    url: "desa.earth",
    description: "Land discovery, acquisition, and legal support for regenerative projects.",
    forumBody: `DESA works on one of the hardest parts of land projects: finding land, acquiring it, and getting the legal structure right. If you are at that stage, or thinking about it, this is a direct and useful connection.\n\nWhat is the biggest obstacle you face when it comes to land access or ownership structures?`,
  },
  {
    orgId: "permatours",
    name: "Permatours",
    url: "permatours.org",
    description: "Festivals, events, and project activation that regenerate people and place.",
    forumBody: `Permatours runs events and activations that are designed to regenerate both the people attending and the places they happen in. If you are organising gatherings for the regen community or want to connect your land project with the wider network through events, this is worth exploring.\n\nWhat does an event that actually regenerates a place look like to you?`,
  },
  {
    orgId: "maptio",
    name: "Maptio",
    url: "maptio.com",
    description: "Organisation mapping and coordination tools for non-hierarchical teams.",
    forumBody: `Maptio builds visual mapping tools for organisations that do not run on org charts. If you are trying to make roles, responsibilities, and relationships legible in a flat or self-organising structure, this is worth a look.\n\nHow does your project or organisation make its structure visible to new people?`,
  },
  {
    orgId: "local_scale",
    name: "LocalScale",
    url: "localscale.org",
    description: "Bioregional economic tools for thriving local economies.",
    forumBody: `LocalScale is building economic infrastructure at the bioregional level, the tools and systems that let local economies work for the people and places in them rather than draining resources out. If you are thinking about local currencies, community investment, or bioregional trade, this is a relevant conversation.\n\nWhat would a thriving local economy look like in your bioregion?`,
  },
];

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error("DATABASE_URL not set. Load .env first.");
    process.exit(1);
  }

  const conn = await mysql.createConnection(dbUrl);
  console.log(DRY_RUN ? "DRY RUN — no writes\n" : "LIVE RUN — writing to DB\n");
  console.log(`Using RYE_USER_ID = ${RYE_USER_ID} for authorship\n`);

  try {
    await seedLandProjects(conn);
    await seedOrganisations(conn);
    await seedOrgForumThreads(conn);
    console.log("\nAll done. Next step: run seed-land-project-threads.ts to create land project forum threads.");
  } finally {
    await conn.end();
  }
}

// ── Land Projects ─────────────────────────────────────────────────────────────

async function seedLandProjects(conn: mysql.Connection) {
  console.log("=== Land Projects ===\n");
  let created = 0;
  let skipped = 0;

  for (const project of LAND_PROJECTS) {
    // Check if a canonical record already exists (projectName exact match with our slug as additionalNotes marker)
    const [existing] = await conn.execute(
      "SELECT id, status FROM applications WHERE projectName = ? AND additionalNotes LIKE '%[canonical]%' LIMIT 1",
      [project.name]
    ) as any;

    if (existing.length > 0) {
      const row = existing[0];
      // If status differs, update it
      if (row.status !== project.status) {
        console.log(`  UPDATE status: ${project.name} (${row.status} -> ${project.status})`);
        if (!DRY_RUN) {
          await conn.execute(
            "UPDATE applications SET status = ? WHERE id = ?",
            [project.status, row.id]
          );
        }
        skipped++;
      } else {
        console.log(`  SKIP (already exists, status=${row.status}): ${project.name}`);
        skipped++;
      }
      continue;
    }

    console.log(`  CREATE: ${project.name} (${project.location}) — status: ${project.status}`);
    if (!DRY_RUN) {
      await conn.execute(
        `INSERT INTO applications (
          userId, status, projectName, projectType, location, country,
          vision, landStatus, teamSize, teamDescription,
          regenerativePractices, governanceApproach, communityEngagement,
          timeCommitment, fundingNeeds, websiteUrl, additionalNotes, submittedAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [
          RYE_USER_ID,
          project.status,
          project.name,
          "early_stage",
          project.location,
          project.country,
          project.focus,
          "seeking",
          1,
          "Team details not yet provided.",
          "Regenerative land stewardship and community building.",
          "Community-led governance.",
          "Open to the wider regen community.",
          "Full-time",
          "Seeking investment through the ReGen Civics Fund.",
          project.websiteUrl,
          "[canonical] Seeded from Connect.tsx. Awaiting claim by project steward.",
        ]
      );
      created++;
    } else {
      created++;
    }
  }

  console.log(`\nLand projects: ${created} created, ${skipped} skipped.\n`);
}

// ── Organisations ─────────────────────────────────────────────────────────────

async function seedOrganisations(conn: mysql.Connection) {
  console.log("=== Alliance Organisations ===\n");
  let created = 0;
  let skipped = 0;

  for (const org of ORGS) {
    const [existing] = await conn.execute(
      "SELECT id FROM organisations WHERE orgId = ? LIMIT 1",
      [org.orgId]
    ) as any;

    if (existing.length > 0) {
      console.log(`  SKIP (exists): ${org.name}`);
      skipped++;
      continue;
    }

    console.log(`  CREATE org: ${org.name}`);
    if (!DRY_RUN) {
      await conn.execute(
        `INSERT INTO organisations (orgId, name, url, description, status) VALUES (?, ?, ?, ?, 'active')`,
        [org.orgId, org.name, org.url, org.description]
      );
      created++;
    } else {
      created++;
    }
  }

  console.log(`\nOrganisations: ${created} created, ${skipped} skipped.\n`);
}

// ── Org Forum Threads ─────────────────────────────────────────────────────────

async function seedOrgForumThreads(conn: mysql.Connection) {
  console.log("=== Alliance Organisation Forum Threads ===\n");

  // Ensure active-organisations category exists
  const [cats] = await conn.execute(
    "SELECT id FROM forumCategories WHERE slug = 'active-organisations' LIMIT 1"
  ) as any;

  let categoryId: number;
  if (cats.length > 0) {
    categoryId = cats[0].id;
    console.log(`Category 'active-organisations' exists: id=${categoryId}`);
  } else {
    console.log("Creating category 'active-organisations'...");
    if (!DRY_RUN) {
      const [res] = await conn.execute(
        `INSERT INTO forumCategories (slug, name, description, sortOrder) VALUES ('active-organisations', 'Alliance Organisations', 'Forum spaces for each alliance partner in the ReGen Civics network.', 98)`
      ) as any;
      categoryId = res.insertId;
      console.log(`Created category id=${categoryId}`);
    } else {
      categoryId = 0;
    }
  }

  let created = 0;
  let skipped = 0;

  for (const org of ORGS) {
    const title = `${org.name}`;

    const [existing] = await conn.execute(
      "SELECT id FROM forumPosts WHERE title = ? AND categoryId = ? LIMIT 1",
      [title, categoryId]
    ) as any;

    if (existing.length > 0) {
      const postId = existing[0].id;
      // Make sure org row has this forumPostId linked
      if (!DRY_RUN) {
        await conn.execute(
          "UPDATE organisations SET forumPostId = ? WHERE orgId = ? AND (forumPostId IS NULL OR forumPostId != ?)",
          [postId, org.orgId, postId]
        );
      }
      console.log(`  SKIP (thread exists): ${title}`);
      skipped++;
      continue;
    }

    console.log(`  CREATE thread: ${title}`);
    if (!DRY_RUN) {
      const [res] = await conn.execute(
        "INSERT INTO forumPosts (categoryId, authorId, title, content, isPinned) VALUES (?, ?, ?, ?, 1)",
        [categoryId, RYE_USER_ID, title, org.forumBody]
      ) as any;
      const postId = res.insertId;

      // Link forumPostId back to org row
      await conn.execute(
        "UPDATE organisations SET forumPostId = ? WHERE orgId = ?",
        [postId, org.orgId]
      );

      console.log(`  Linked post #${postId} -> organisations.orgId = ${org.orgId}`);
      created++;
    } else {
      created++;
    }
  }

  console.log(`\nOrg forum threads: ${created} created, ${skipped} skipped.\n`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
