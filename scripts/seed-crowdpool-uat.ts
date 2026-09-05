/**
 * Seed a full crowdpooling scenario for a manual UI pass, and tear it down again.
 *
 * REFUSES TO RUN AGAINST PRODUCTION. Everything it writes is tagged with a marker
 * so teardown can find it, and teardown deletes by marker rather than by id range,
 * so it cannot take anything it did not create.
 *
 *   DATABASE_URL=mysql://root:pw@127.0.0.1:3307/rc_qa_crowdpool \
 *     npx tsx scripts/seed-crowdpool-uat.ts            # seed
 *   ... npx tsx scripts/seed-crowdpool-uat.ts --down   # remove everything it made
 *   ... npx tsx scripts/seed-crowdpool-uat.ts --status # what exists right now
 *
 * The scenarios are chosen to cover the states a person actually meets, including
 * the empty and the extreme, not just the happy one.
 */

import mysql from "mysql2/promise";
import * as dotenv from "dotenv";

dotenv.config({ quiet: true });

const MARKER = "UAT-CROWDPOOL";
const UAT_USER_ID = 990501;
const UAT_CLAIMANT_ID = 990502;

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL is not set.");
  process.exit(1);
}

// Refuse anything that is not clearly a local scratch database. The live
// DATABASE_URL in .env points at Railway production, and this script writes
// campaigns and contributions.
const url = new URL(DATABASE_URL);
const isLocal = ["127.0.0.1", "localhost", "::1"].includes(url.hostname);
const looksLikeScratch = /qa|scratch|test|uat/i.test(url.pathname);
if (!isLocal || !looksLikeScratch) {
  console.error(
    `REFUSING TO RUN.\n` +
    `  host: ${url.hostname} (must be local)\n` +
    `  database: ${url.pathname.slice(1)} (name must contain qa, scratch, test or uat)\n` +
    `This script writes campaigns and contributions. Point it at a scratch database.`,
  );
  process.exit(1);
}

const conn = await mysql.createConnection({
  host: url.hostname,
  port: Number(url.port || 3306),
  user: url.username,
  password: decodeURIComponent(url.password),
  database: url.pathname.slice(1),
  decimalNumbers: true,
});

const mode = process.argv.includes("--down")
  ? "down"
  : process.argv.includes("--status")
    ? "status"
    : "up";

async function status() {
  const [rows]: any = await conn.query(
    `SELECT id, title, status, financialTarget, totalValue, pledgedTotal
       FROM campaigns WHERE description LIKE ? ORDER BY id`,
    [`%${MARKER}%`],
  );
  if (!rows.length) {
    console.log("No UAT campaigns present.");
    return;
  }
  console.log(`${rows.length} UAT campaign(s):`);
  for (const r of rows) {
    const [items]: any = await conn.query(
      `SELECT COUNT(*) n FROM campaign_items WHERE campaignId = ?`, [r.id]);
    const [contribs]: any = await conn.query(
      `SELECT status, COUNT(*) n FROM campaign_contributions WHERE campaignId = ? GROUP BY status`, [r.id]);
    console.log(
      `  #${r.id} [${r.status}] ${r.title}\n` +
      `      target ${r.financialTarget} | in-kind ${r.totalValue} | pledged ${r.pledgedTotal} | ` +
      `${items[0].n} needs | ${contribs.map((c: any) => c.status + ":" + c.n).join(" ") || "no claims"}`,
    );
  }
}

async function down() {
  const [rows]: any = await conn.query(
    `SELECT id FROM campaigns WHERE description LIKE ?`, [`%${MARKER}%`]);
  const ids = rows.map((r: any) => r.id);
  if (ids.length) {
    // Children first. No foreign keys exist, so order is ours to get right.
    for (const table of [
      "campaign_contributions", "campaign_items", "campaign_partner_links",
      "campaign_updates", "campaign_followers", "campaign_images", "campaign_analytics",
    ]) {
      try {
        const [res]: any = await conn.query(
          `DELETE FROM \`${table}\` WHERE campaignId IN (${ids.map(() => "?").join(",")})`, ids);
        if (res.affectedRows) console.log(`  removed ${res.affectedRows} from ${table}`);
      } catch {
        /* table may not exist on an older schema; skip */
      }
    }
    const [res]: any = await conn.query(
      `DELETE FROM campaigns WHERE id IN (${ids.map(() => "?").join(",")})`, ids);
    console.log(`  removed ${res.affectedRows} campaigns`);
  }
  for (const uid of [UAT_USER_ID, UAT_CLAIMANT_ID]) {
    await conn.query(`DELETE FROM user_token_ledger WHERE userId = ?`, [uid]);
    await conn.query(`DELETE FROM player_contributions WHERE userId = ?`, [uid]);
    await conn.query(`DELETE FROM player_profiles WHERE userId = ?`, [uid]);
    await conn.query(`DELETE FROM users WHERE id = ?`, [uid]);
  }
  console.log("UAT data removed.");
}

async function up() {
  await conn.query(
    `INSERT IGNORE INTO users (id, openId, email, name, loginMethod, role)
     VALUES (?, 'uat-steward', 'uat-steward@example.com', 'UAT Steward', 'google', 'user'),
            (?, 'uat-claimant', 'uat-claimant@example.com', 'UAT Claimant', 'google', 'user')`,
    [UAT_USER_ID, UAT_CLAIMANT_ID],
  );
  for (const [uid, name] of [[UAT_USER_ID, "UAT Steward"], [UAT_CLAIMANT_ID, "UAT Claimant"]] as const) {
    await conn.query(
      `INSERT IGNORE INTO player_profiles (userId, displayName) VALUES (?, ?)`, [uid, name]);
  }

  async function campaign(o: {
    title: string; status: string; financialTarget: number; currency: string;
    landValue?: number; equipmentValue?: number; rolesValue?: number; resourcesValue?: number;
    durationDays?: number; started?: boolean;
  }) {
    const land = o.landValue ?? 0, equip = o.equipmentValue ?? 0;
    const roles = o.rolesValue ?? 0, res = o.resourcesValue ?? 0;
    const total = land + equip + roles + res;
    const [r]: any = await conn.query(
      `INSERT INTO campaigns
        (userId, status, title, description, projectName, location, financialTarget, currency,
         totalValue, landValue, equipmentValue, rolesValue, resourcesValue,
         pledgedTotal, pledgedLand, pledgedEquipment, pledgedRoles, pledgedResources, pledgedFinancial,
         durationDays, startedAt, publishedAt, isDemo)
       VALUES (?, ?, ?, ?, ?, 'Cascadia', ?, ?, ?, ?, ?, ?, ?, 0,0,0,0,0,0, ?, ${o.started === false ? "NULL" : "NOW()"}, ${o.started === false ? "NULL" : "NOW()"}, 0)`,
      [UAT_USER_ID, o.status, o.title,
       `${MARKER}. A seeded scenario for the manual UI pass. Safe to delete.`,
       o.title.replace(/^UAT \d+: /, ""), o.financialTarget, o.currency,
       total, land, equip, roles, res, o.durationDays ?? 90],
    );
    return r.insertId as number;
  }

  async function need(campaignId: number, o: {
    category: string; kind: string; capital: string; name: string; desc: string;
    value: number; wanted: number;
  }) {
    const [r]: any = await conn.query(
      `INSERT INTO campaign_items
        (campaignId, category, kind, capitalType, resourceName, resourceDescription,
         estimatedValue, pledgedValue, quantityWanted, quantityClaimed, quantityDelivered,
         groupClaimable, priorityPinned)
       VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, 0, 0, 0, 0)`,
      [campaignId, o.category, o.kind, o.capital, o.name, o.desc, o.value, o.wanted],
    );
    return r.insertId as number;
  }

  async function claim(campaignId: number, itemId: number, o: {
    name: string; email: string; value: number; status: string; type?: string; userId?: number | null;
  }) {
    const [r]: any = await conn.query(
      `INSERT INTO campaign_contributions
        (campaignId, campaignItemId, userId, contributorName, contributorEmail, contributionType,
         title, description, estimatedValue, status, quantityPledged, isAnonymous, submittedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 0, NOW())`,
      [campaignId, itemId, o.userId ?? null, o.name, o.email, o.type ?? "resource",
       `${o.name}'s pledge`, `${MARKER} seeded claim`, o.value, o.status],
    );
    return r.insertId as number;
  }

  const made: string[] = [];

  // 1. The ordinary case, mid-flight, with money that has centimes. This is the
  //    one that would have been impossible before the DECIMAL migration.
  const a = await campaign({
    title: "UAT 1: Fractional money and a live campaign", status: "active", currency: "CHF",
    financialTarget: 50000.5, landValue: 12000.25, equipmentValue: 3000.75, rolesValue: 8000, resourcesValue: 1999.99,
  });
  const a1 = await need(a, { category: "resource", kind: "item", capital: "material",
    name: "Timber for the barn", desc: "Rough sawn, any length", value: 1250.75, wanted: 4 });
  const a2 = await need(a, { category: "role", kind: "role", capital: "social",
    name: "Community organiser", desc: "Two days a week through the season", value: 8000, wanted: 1 });
  await need(a, { category: "equipment", kind: "loan", capital: "material",
    name: "Tractor, on loan", desc: "Three weeks in spring", value: 3000.75, wanted: 1 });
  await claim(a, a1, { name: "Ada", email: "ada@example.com", value: 1250.75, status: "accepted", userId: UAT_CLAIMANT_ID });
  await claim(a, a1, { name: "Bo", email: "bo@example.com", value: 1250.75, status: "fulfilled" });
  await claim(a, a1, { name: "Cy", email: "cy@example.com", value: 1250.75, status: "thanked" });
  await claim(a, a2, { name: "Di", email: "di@example.com", value: 8000, status: "pending", type: "role" });
  made.push(`#${a} active, fractional money, claims in every state`);

  // 2. Nothing has happened yet. The empty state is where UIs usually break.
  const b = await campaign({
    title: "UAT 2: Empty, nothing pledged", status: "active", currency: "CHF",
    financialTarget: 25000, landValue: 5000,
  });
  await need(b, { category: "resource", kind: "item", capital: "living",
    name: "Fruit trees", desc: "Bare root, any variety", value: 40, wanted: 100 });
  made.push(`#${b} active, zero contributions`);

  // 3. A need already full, so the Claim button state can be seen.
  const c = await campaign({
    title: "UAT 3: A need already filled", status: "active", currency: "CHF", financialTarget: 1000, resourcesValue: 500,
  });
  const c1 = await need(c, { category: "resource", kind: "item", capital: "material",
    name: "One and only slot", desc: "Single slot, already taken", value: 500, wanted: 1 });
  await claim(c, c1, { name: "Eve", email: "eve@example.com", value: 500, status: "accepted" });
  await conn.query(`UPDATE campaign_items SET quantityClaimed = 1 WHERE id = ?`, [c1]);
  made.push(`#${c} active, one need at capacity`);

  // 4. A zero-target campaign. Percentage maths divides by this.
  const d = await campaign({
    title: "UAT 4: Nothing asked for in money", status: "active", currency: "CHF",
    financialTarget: 0, rolesValue: 12000,
  });
  await need(d, { category: "role", kind: "shift", capital: "experiential",
    name: "Saturday work party", desc: "Eight Saturdays", value: 1500, wanted: 8 });
  made.push(`#${d} active, financialTarget 0`);

  // 5. Draft, so an unpublished campaign can be seen from the steward side.
  const e = await campaign({
    title: "UAT 5: Draft, never published", status: "draft", currency: "CHF",
    financialTarget: 9000, landValue: 4000, started: false,
  });
  made.push(`#${e} draft, never started`);

  // 6. A partner link on one campaign only, so both branches of the conditional
  //    panel are visible side by side.
  await conn.query(
    `INSERT INTO campaign_partner_links (campaignId, partner, label, url, cachedRaised, cachedContributorCount, cachedPercent, lastFetchedAt)
     VALUES (?, 'maearth', 'Ma Earth', 'https://maearth.com/projects/uat', 12345.67, 41, 35, NOW())`,
    [a],
  );
  made.push(`#${a} has a Ma Earth link; the others have none`);

  // Recompute the cached totals the same way the server does, so the seeded state
  // is one the application could actually have produced.
  //
  // THE CONVENTION, which the first version of this script got wrong: a need's
  // `estimatedValue` is the WHOLE value of that need, and `quantityWanted` is the
  // number of slots it is divided into. Production bears this out ("Cedar fence
  // posts, estimatedValue 3000, quantityWanted 200") and ContributionModal.tsx:87
  // divides estimatedValue by quantityWanted to get a per-slot figure. So a
  // campaign's totalValue is the plain SUM of its needs, never the sum of
  // value * quantity. Seeding it the other way produced a fixture whose campaign
  // row disagreed with its own needs, and made the page look like it was
  // understating the goal when it was reporting it correctly.
  for (const id of [a, b, c, d, e]) {
    await conn.query(
      `UPDATE campaigns c SET
         landValue      = COALESCE((SELECT SUM(estimatedValue) FROM campaign_items WHERE campaignId = c.id AND category = 'land'), 0),
         equipmentValue = COALESCE((SELECT SUM(estimatedValue) FROM campaign_items WHERE campaignId = c.id AND category = 'equipment'), 0),
         rolesValue     = COALESCE((SELECT SUM(estimatedValue) FROM campaign_items WHERE campaignId = c.id AND category = 'role'), 0),
         resourcesValue = COALESCE((SELECT SUM(estimatedValue) FROM campaign_items WHERE campaignId = c.id AND category = 'resource'), 0),
         totalValue     = COALESCE((SELECT SUM(estimatedValue) FROM campaign_items WHERE campaignId = c.id), 0),
         pledgedTotal   = COALESCE((SELECT SUM(estimatedValue) FROM campaign_contributions
                                     WHERE campaignId = c.id AND status IN ('accepted','fulfilled','thanked')), 0)
       WHERE c.id = ?`, [id]);
  }

  console.log("Seeded:");
  for (const m of made) console.log("  " + m);
  console.log("\nOpen these:");
  console.log(`  /campaigns`);
  for (const id of [a, b, c, d]) console.log(`  /campaign/${id}`);
  console.log(`  /campaign/${a}/manage`);
  console.log(`\nRemove it all with: npx tsx scripts/seed-crowdpool-uat.ts --down`);
}

if (mode === "up") await up();
else if (mode === "down") await down();
else await status();

await conn.end();
