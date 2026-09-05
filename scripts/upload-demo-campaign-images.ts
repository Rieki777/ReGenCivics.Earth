/**
 * Put new hero images on the example campaigns.
 *
 * The four example campaigns carried images 400x225 and 229x300, stretched across
 * a full-width card, which is why the gallery looked soft. These are 2560x1440
 * WebP at quality 90.
 *
 * ONLY TOUCHES CAMPAIGNS FLAGGED isDemo = 1. A real project's photograph is
 * somebody's own and is never replaced by a generated one.
 *
 * The previous URL is printed before each write so a revert is a one-line UPDATE.
 *
 *   npx tsx scripts/upload-demo-campaign-images.ts <dir-with-webp-files>
 */

import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import mysql from "mysql2/promise";
import * as dotenv from "dotenv";
import { storagePut } from "../server/storage";

dotenv.config({ quiet: true });

const dir = process.argv[2];
if (!dir) { console.error("Usage: npx tsx scripts/upload-demo-campaign-images.ts <dir>"); process.exit(1); }

/** Campaign title fragment -> generated file. Title-matched so ids can move. */
const MAP: Array<[RegExp, string]> = [
  [/harmony valley/i,  "campaign-harmony-valley.webp"],
  [/terra nova/i,      "campaign-terra-nova.webp"],
  [/pachamama/i,       "campaign-pachamama.webp"],
  [/rewild britain/i,  "campaign-rewild-britain.webp"],
];

const url = new URL(process.env.DATABASE_URL!);
const conn = await mysql.createConnection({
  host: url.hostname, port: Number(url.port || 3306), user: url.username,
  password: decodeURIComponent(url.password), database: url.pathname.slice(1),
});

const [demos]: any = await conn.query(
  `SELECT id, title, projectImageUrl FROM campaigns WHERE isDemo = 1 ORDER BY id`);

for (const c of demos) {
  const hit = MAP.find(([re]) => re.test(c.title));
  if (!hit) { console.log(`#${c.id} ${c.title}: no image mapped, skipped`); continue; }
  const path = join(dir, hit[1]);
  if (!existsSync(path)) { console.log(`#${c.id}: ${hit[1]} not found, skipped`); continue; }

  const bytes = readFileSync(path);
  const key = `campaigns/demo/${hit[1].replace(/\.webp$/, "")}-${bytes.length}.webp`;
  const { url: publicUrl } = await storagePut(key, bytes, "image/webp");

  console.log(`#${c.id} ${c.title}`);
  console.log(`   was: ${c.projectImageUrl}`);
  console.log(`   now: ${publicUrl}  (${Math.round(bytes.length / 1024)} KB)`);

  await conn.query(`UPDATE campaigns SET projectImageUrl = ? WHERE id = ? AND isDemo = 1`,
    [publicUrl, c.id]);
}

await conn.end();
console.log("\nDone. To revert one: UPDATE campaigns SET projectImageUrl = '<the was: url>' WHERE id = <id>;");
