/**
 * Seed the Shipwright knowledge base (SHIP_MAINTAINER_INVENTORY Section 1.2).
 *
 * Idempotent by title. This is the honest, conservative seed: general operation
 * and safety guidance that is universally true for a class A diesel pusher is
 * marked isApproved=true; anything model-specific to the 2006 Fleetwood
 * Revolution LE or the Spartan chassis is seeded as forum_wisdom with
 * isApproved=false, pending Rye or the Keeper's review, so nothing unverified is
 * ever served as fact. Do a fuller research pass and approve chunks in admin.
 *
 * NOTE: the Shipwright NEVER coaches DIY on propane, brakes, steering, chassis
 * air, electrical burning smells, fire, or CO. Those chunks are make-safe only.
 *
 * Usage:
 *   npx tsx scripts/seed-ship-knowledge.ts --dry-run
 *   npx tsx scripts/seed-ship-knowledge.ts
 */
import mysql from "mysql2/promise";
import * as dotenv from "dotenv";

dotenv.config();

const DRY_RUN = process.argv.includes("--dry-run");

type Chunk = {
  title: string;
  content: string;
  system: string;
  sourceType: "manual" | "service_bulletin" | "forum_wisdom" | "resolved_case";
  sourceRef: string;
  isApproved: boolean;
};

const CHUNKS: Chunk[] = [
  // ── General operation + safety (approved: universally true for a class A DP) ──
  {
    title: "Propane smell or leak: make safe, do not troubleshoot",
    content: "If you smell propane (a rotten-egg odor) or hear hissing: do not light anything or touch electrical switches. Turn off the propane at the tank, open windows and roof vents, get everyone out, and move away. Then call the Keeper and professional service. Never chase a gas leak yourself.",
    system: "propane", sourceType: "manual", sourceRef: "General LP-gas safety guidance (RVIA / propane safety standards)", isApproved: true,
  },
  {
    title: "Slide-outs: fully retract before every drive",
    content: "Always bring the slide-outs fully in before moving the coach, and confirm nothing blocks their travel inside. Clear the counters and secure loose items, because a slide can catch them. If a slide will not move, stop and note it in the maintenance log rather than forcing it.",
    system: "slides", sourceType: "manual", sourceRef: "General class A slide-out operation guidance", isApproved: true,
  },
  {
    title: "Leveling jacks: they are optional, and one is manual",
    content: "You do not strictly need the jacks; they are a nice touch for a level night. On this ship one leveling jack currently needs manual operation, which is one of her honest quirks. Retract all jacks fully before driving, and confirm they are up in the pre-sail checklist.",
    system: "chassis", sourceType: "manual", sourceRef: "Ship quirk log (SHIP_MAINTAINER_INVENTORY 1.6)", isApproved: true,
  },
  {
    title: "Tires: check pressure cold, and mind their age",
    content: "Check tire pressure when the tires are cold, before driving, to the coach's rated pressure on the placard. On a coach this age, tire age matters as much as tread; look at the date codes and watch for sidewall cracking. If a tire looks low or damaged, do not drive on it; call the Keeper.",
    system: "tires_brakes", sourceType: "manual", sourceRef: "General motorhome tire-care guidance", isApproved: true,
  },
  {
    title: "Generator: included, fair use, keep the bay clear",
    content: "The onboard generator plus the electrical system meet the ship's energy needs. Run it with the exhaust clear and never while parked somewhere the exhaust can pool. If a CO alarm sounds, treat it as an emergency: ventilate, get out, and call for help. Log any generator trouble rather than opening it up.",
    system: "generator", sourceType: "manual", sourceRef: "General onboard-generator safety guidance", isApproved: true,
  },
  {
    title: "Fresh water and filtration: the ship's water doctrine",
    content: "She has whole-RV chlorine filtration plus filtered showers and an in-line drinking-water filter, and a spring-water intake pump that draws from springs up to about 50 feet away. Use only the soaps and cleaning materials aboard. Sanitize the fresh tank periodically and keep the drinking filter clean.",
    system: "water_filtration", sourceType: "manual", sourceRef: "Ship water doctrine (REGEN_SHIP Section 9)", isApproved: true,
  },
  {
    title: "Plumbing and tanks: dump and reset between voyage weeks",
    content: "One voyage is a single tank cycle. On a multi-week sail she resets her tanks at each Sunday-to-Monday turnover: dump the black then the grey, rinse, and refill fresh. Watch tank levels through the week; the Quartermaster keeps an eye on water and tanks.",
    system: "plumbing", sourceType: "manual", sourceRef: "General RV tank-management guidance", isApproved: true,
  },
  {
    title: "Starlink: fair-use internet from anywhere she anchors",
    content: "The roof Starlink gives internet wherever she has a clear view of the sky. If it drops, check for obstructions overhead and give it a minute to reacquire. It is fair-use; heavy continuous loads are fine within reason.",
    system: "starlink", sourceType: "manual", sourceRef: "General satellite-internet operation", isApproved: true,
  },
  // ── Model-specific (unapproved: pending Rye/Keeper review before it is served) ─
  {
    title: "Fleetwood Revolution LE slide-out motors (pending review)",
    content: "Owners of the 2006 Fleetwood Revolution LE family discuss slide-out motor and controller quirks on forums like iRV2. Treat any specific fix here as unverified until the Keeper confirms it on this actual coach.",
    system: "slides", sourceType: "forum_wisdom", sourceRef: "iRV2 Fleetwood owners forum (to verify)", isApproved: false,
  },
  {
    title: "Spartan Mountain Master chassis air system (pending review)",
    content: "The Spartan chassis uses an air system for brakes and suspension. Any loss of air is a stop-and-call-service situation, never a DIY fix. Model-specific air-system notes should be verified against Spartan chassis documentation and the Keeper before use.",
    system: "chassis", sourceType: "forum_wisdom", sourceRef: "Spartan RV chassis owner resources (to verify)", isApproved: false,
  },
];

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) { console.error("ERROR: DATABASE_URL not set. Check your .env."); process.exit(1); }
  console.log(`Seeding ${CHUNKS.length} knowledge chunks${DRY_RUN ? " (dry run)" : ""}...`);
  if (DRY_RUN) {
    for (const c of CHUNKS) console.log(`  would upsert: ${c.title} (${c.system}, approved=${c.isApproved})`);
    return;
  }
  const conn = await mysql.createConnection(url);
  let inserted = 0, updated = 0;
  try {
    for (const c of CHUNKS) {
      const tags = JSON.stringify([]);
      const [existing] = await conn.execute("SELECT id FROM ship_knowledge_chunks WHERE title = ? LIMIT 1", [c.title]);
      if (Array.isArray(existing) && existing.length > 0) {
        await conn.execute(
          "UPDATE ship_knowledge_chunks SET `content` = ?, `system` = ?, `sourceType` = ?, `sourceRef` = ?, `isApproved` = ? WHERE `title` = ?",
          [c.content, c.system, c.sourceType, c.sourceRef, c.isApproved ? 1 : 0, c.title],
        );
        updated++;
      } else {
        await conn.execute(
          "INSERT INTO ship_knowledge_chunks (`title`, `content`, `system`, `sourceType`, `sourceRef`, `tags`, `isApproved`, `createdAt`) VALUES (?, ?, ?, ?, ?, CAST(? AS JSON), ?, NOW())",
          [c.title, c.content, c.system, c.sourceType, c.sourceRef, tags, c.isApproved ? 1 : 0],
        );
        inserted++;
      }
    }
    console.log(`Done. Inserted: ${inserted}, Updated: ${updated}`);
  } finally {
    await conn.end();
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
