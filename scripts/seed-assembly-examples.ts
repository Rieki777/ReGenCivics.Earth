/**
 * Seed script: Assembly demonstration proposals.
 *
 * Plants one clearly-labelled example proposal at each lifecycle stage of the
 * Assembly page so a first-time visitor can see the whole flow at work:
 *
 *   - Forming     a proposal gathering signals, with a synthesized pros/cons
 *                 picture, a strongest-objection, and example forum comments.
 *   - Deciding    a proposal at its binding vote, mirrored from Hypha.
 *   - Record      a finished decision the machine executed automatically.
 *   - Evolution   a stand-in feature the machine is "building", shown in the
 *                 Evolution Engine's in-flight panel.
 *
 * Every row is created with proposals.isExample = 1. The governance pipeline
 * refuses to advance or execute an example (see the isExample guards in
 * server/routes/assembly.ts, server/jobs/assemblyLifecycleJob.ts, and
 * server/lib/evolution.ts), so these never move stage, never bridge to Hypha,
 * never touch a game variable, and never open a builder issue. They are pure
 * demonstration and safe to leave in place.
 *
 * Idempotent. Seeding removes any prior demo rows first, then inserts fresh,
 * so re-running never duplicates. Removal deletes every demo artifact.
 *
 *   npx tsx scripts/seed-assembly-examples.ts            # seed (or re-seed)
 *   npx tsx scripts/seed-assembly-examples.ts --remove   # remove all demos
 *   npx tsx scripts/seed-assembly-examples.ts --dry-run  # show, write nothing
 *
 * Requires DATABASE_URL. Requires migration 0175 (proposals.isExample) applied.
 */

import * as mysql from "mysql2/promise";
import * as dotenv from "dotenv";

dotenv.config();

const REMOVE = process.argv.includes("--remove");
const DRY_RUN = process.argv.includes("--dry-run");

/** Reserved .invalid TLD so these demo accounts can never collide with, or be
 * mistaken for, a real member. Removal keys off this exact domain. */
const DEMO_EMAIL_DOMAIN = "assembly-example.invalid";
const OPENID_PREFIX = "assembly-example:";

/** The demonstration author, plus a handful of personas whose signals and
 * comments make the example read like a real conversation. */
const DEMO_USERS = [
  { key: "guide", name: "ReGen Guide (example)", openId: `${OPENID_PREFIX}guide` },
  { key: "p1", name: "Maya Okonkwo (example)", openId: `${OPENID_PREFIX}p1` },
  { key: "p2", name: "Tomas Reyes (example)", openId: `${OPENID_PREFIX}p2` },
  { key: "p3", name: "Aoife Byrne (example)", openId: `${OPENID_PREFIX}p3` },
  { key: "p4", name: "Ravi Nair (example)", openId: `${OPENID_PREFIX}p4` },
  { key: "p5", name: "Lena Fischer (example)", openId: `${OPENID_PREFIX}p5` },
] as const;

type UserKey = (typeof DEMO_USERS)[number]["key"];

// ── Content for each stage ──────────────────────────────────────────────────

const FORMING = {
  title: "Add a small welcome when someone finishes their first quest",
  aim: "welcoming new players the moment they finish their first quest",
  category: "platform_feature",
  description:
    "Right now finishing your first quest is quiet. Nothing marks the moment. This proposal adds a short, warm welcome on the screen right after a new player completes their first quest, so the first win actually feels like one.",
  threadBody:
    "Finishing your first quest should feel like something. Right now it is silent. What if the moment a new player completes their first quest, they get a small warm note welcoming them in? Keen to hear what people think, and what it should say.",
  replies: [
    { by: "p1" as UserKey, body: "Yes. The first win is the moment people decide whether to stay. A little warmth here would go a long way." },
    { by: "p2" as UserKey, body: "Love it. Please keep it short and honest though. A wall of confetti would feel off for this community." },
    { by: "p3" as UserKey, body: "One worry: let's make sure it does not slow the page down or get in the way of the next quest. A quiet note that fades is plenty." },
  ],
  signals: [
    { by: "p1" as UserKey, score: 3 },
    { by: "p2" as UserKey, score: 2 },
    { by: "p3" as UserKey, score: 1, moveNote: "I would move to full support if it stays lightweight and does not block the next action." },
    { by: "p4" as UserKey, score: 2 },
    { by: "p5" as UserKey, score: -1, moveNote: "Small thing, but I would rather we spent the effort on the quests themselves first." },
  ],
  synthesis: {
    summary:
      "A small, warm welcome shown right after a new player finishes their first quest. Broad support, with a shared ask to keep it lightweight and out of the way of the next action.",
    pros: [
      { point: "The first completed quest is the moment people decide to stay, so warmth here matters most", voiceCount: 3 },
      { point: "Low effort, easy to ship, and easy to change later", voiceCount: 2 },
    ],
    cons: [
      { point: "Should not slow the page down or block the next quest", voiceCount: 2 },
    ],
    steelman:
      "The strongest objection: effort here might be better spent improving the quests themselves before we polish the moment after them.",
    changelog: { text: "2 new voices since the last look. The keep-it-lightweight point gathered support." },
  },
};

const DECIDING = {
  title: "Give every bioregion its own gathering page",
  aim: "helping people find the others working near them",
  category: "community",
  description:
    "A simple page per bioregion where members in the same landscape can find each other, see local land projects, and start working together. Now at a binding vote.",
  threadBody:
    "People keep asking how to find others near them. What if every bioregion had its own gathering page: who is here, what land projects are nearby, what is happening locally? This has had strong support in Forming and is ready for the binding vote.",
  replies: [
    { by: "p4" as UserKey, body: "This is the thing I have wanted most. Finding my neighbours in this work is hard right now." },
    { by: "p2" as UserKey, body: "Strong yes from me. Start simple, let each bioregion shape its own page over time." },
  ],
};

const RECORD = {
  title: "Lengthen the last-call window to two days",
  aim: "giving quieter members time to weigh in before a vote",
  category: "game_variable",
  description:
    "The last-call window was one day, which was tight for people who check in less often. This proposal doubled it to two days. Ratified and applied automatically by the Evolution Engine.",
  threadBody:
    "One day of last call is tight for anyone who does not check in daily. Proposing we move it to two days so quieter voices still get a chance before the binding vote opens.",
  replies: [
    { by: "p5" as UserKey, body: "Thank you. As someone who checks in on weekends, one day meant I kept missing the window." },
  ],
  execution: {
    variableKey: "governance.last_call_hours",
    before: 24,
    after: 48,
  },
};

const EVOLUTION = {
  title: "Show a live map of all land projects on the home page",
  aim: "letting a visitor see the whole movement at a glance",
  category: "platform_feature",
  description:
    "A map on the home page showing every land project in the network, so a first-time visitor can see the movement is real and spread across many places.",
  spec: {
    specMarkdown:
      "Add a map to the home page that plots every land project with its location, name, and a link to its page. Read-only, server-rendered coordinates, no new write paths.",
    acceptanceCriteria: [
      "The home page shows a map with a marker for every active land project",
      "Each marker links to that project's page",
      "The map does not slow first paint on the home page",
    ],
    scopePaths: ["client/src/pages/Home.tsx", "client/src/components/LandProjectMap.tsx"],
  },
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function log(...args: any[]) {
  console.log(...args);
}

async function getDemoUserIds(conn: mysql.Connection): Promise<Record<string, number>> {
  const [rows] = (await conn.execute(
    `SELECT id, openId FROM users WHERE openId LIKE ?`,
    [`${OPENID_PREFIX}%`],
  )) as any;
  const map: Record<string, number> = {};
  for (const r of rows) {
    const key = String(r.openId).slice(OPENID_PREFIX.length);
    map[key] = r.id;
  }
  return map;
}

async function remove(conn: mysql.Connection) {
  log("Removing existing Assembly demonstration rows...");

  // Proposal-scoped children first, keyed off the isExample flag.
  const [exProps] = (await conn.execute(`SELECT id FROM proposals WHERE isExample = 1`)) as any;
  const exIds: number[] = exProps.map((r: any) => r.id);
  if (exIds.length) {
    const placeholders = exIds.map(() => "?").join(",");
    await conn.execute(`DELETE FROM proposal_signals WHERE proposalId IN (${placeholders})`, exIds);
    await conn.execute(`DELETE FROM proposal_synthesis WHERE proposalId IN (${placeholders})`, exIds);
    await conn.execute(`DELETE FROM governance_executions WHERE proposalId IN (${placeholders})`, exIds);
    // Hypha bridge stand-ins are stored with sourceId = the proposal id.
    await conn.execute(
      `DELETE FROM hyphaBridges WHERE source = 'other' AND sourceId IN (${placeholders})`,
      exIds.map((id) => String(id)),
    );
    await conn.execute(`DELETE FROM proposals WHERE id IN (${placeholders})`, exIds);
    log(`  removed ${exIds.length} example proposals and their signals, synthesis, executions, and bridges`);
  }

  // Forum threads + replies authored by the demo accounts.
  const userIds = Object.values(await getDemoUserIds(conn));
  if (userIds.length) {
    const ph = userIds.map(() => "?").join(",");
    const [demoPosts] = (await conn.execute(`SELECT id FROM forumPosts WHERE authorId IN (${ph})`, userIds)) as any;
    const postIds: number[] = demoPosts.map((r: any) => r.id);
    if (postIds.length) {
      const pph = postIds.map(() => "?").join(",");
      await conn.execute(`DELETE FROM forumReplies WHERE postId IN (${pph})`, postIds);
    }
    // Any stray replies the personas left on other posts (defensive).
    await conn.execute(`DELETE FROM forumReplies WHERE authorId IN (${ph})`, userIds);
    await conn.execute(`DELETE FROM forumPosts WHERE authorId IN (${ph})`, userIds);
    await conn.execute(`DELETE FROM users WHERE id IN (${ph})`, userIds);
    log(`  removed ${postIds.length} demo forum threads and ${userIds.length} demo accounts`);
  }
  log("Removal complete.");
}

async function ensureUsers(conn: mysql.Connection): Promise<Record<string, number>> {
  for (const u of DEMO_USERS) {
    await conn.execute(
      `INSERT INTO users (openId, name, email, role) VALUES (?, ?, ?, 'user')`,
      [u.openId, u.name, `${u.key}@${DEMO_EMAIL_DOMAIN}`],
    );
  }
  return getDemoUserIds(conn);
}

async function findCategoryId(conn: mysql.Connection): Promise<number> {
  const [gov] = (await conn.execute(`SELECT id FROM forumCategories WHERE slug = 'governance-dao' LIMIT 1`)) as any;
  if (gov.length) return gov[0].id;
  const [any] = (await conn.execute(`SELECT id FROM forumCategories ORDER BY id ASC LIMIT 1`)) as any;
  if (!any.length) throw new Error("No forum categories exist; cannot seed demo threads.");
  return any[0].id;
}

/** Insert a forum thread authored by the guide plus its example replies. The
 * bodies carry the same "[EXAMPLE ...]" marker the rest of the seed data uses.
 * agedDays backdates the thread so the demo reads as an established one. */
async function insertThread(
  conn: mysql.Connection,
  categoryId: number,
  users: Record<string, number>,
  title: string,
  body: string,
  replies: { by: UserKey; body: string }[],
  agedDays: number,
): Promise<number> {
  const [res] = (await conn.execute(
    `INSERT INTO forumPosts (categoryId, authorId, title, content, createdAt)
     VALUES (?, ?, ?, ?, DATE_SUB(NOW(), INTERVAL ? DAY))`,
    [categoryId, users.guide, title, `[EXAMPLE thread — a demonstration for the Assembly page]\n\n${body}`, agedDays],
  )) as any;
  const postId = res.insertId as number;
  for (const r of replies) {
    await conn.execute(
      `INSERT INTO forumReplies (postId, authorId, content, createdAt)
       VALUES (?, ?, ?, DATE_SUB(NOW(), INTERVAL ? DAY))`,
      [postId, users[r.by], `[EXAMPLE comment — fictional]\n\n${r.body}`, Math.max(0, agedDays - 1)],
    );
  }
  return postId;
}

async function seed(conn: mysql.Connection) {
  await remove(conn); // idempotent: clear any prior demo before re-inserting
  log("\nSeeding Assembly demonstration proposals...");

  const users = await ensureUsers(conn);
  const categoryId = await findCategoryId(conn);

  // ── Forming ────────────────────────────────────────────────────────────────
  const formingThread = await insertThread(
    conn, categoryId, users, FORMING.title, FORMING.threadBody, FORMING.replies, 5,
  );
  const [formingRes] = (await conn.execute(
    `INSERT INTO proposals (authorId, title, description, category, status, aim, lane, forumThreadId, isExample, createdAt)
     VALUES (?, ?, ?, ?, 'signaling', ?, 'full', ?, 1, DATE_SUB(NOW(), INTERVAL 5 DAY))`,
    [users.guide, FORMING.title, FORMING.description, FORMING.category, FORMING.aim, formingThread],
  )) as any;
  const formingId = formingRes.insertId as number;
  for (const s of FORMING.signals) {
    await conn.execute(
      `INSERT INTO proposal_signals (proposalId, userId, score, moveNote) VALUES (?, ?, ?, ?)`,
      [formingId, users[s.by], s.score, (s as any).moveNote ?? null],
    );
  }
  await conn.execute(
    `INSERT INTO proposal_synthesis (proposalId, pros, cons, steelman, summary, sourceReplyCount, changelog, lastSyncedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, DATE_SUB(NOW(), INTERVAL 6 HOUR))`,
    [
      formingId,
      JSON.stringify(FORMING.synthesis.pros),
      JSON.stringify(FORMING.synthesis.cons),
      FORMING.synthesis.steelman,
      FORMING.synthesis.summary,
      FORMING.replies.length,
      JSON.stringify({ at: new Date(Date.now() - 6 * 3600_000).toISOString(), text: FORMING.synthesis.changelog.text }),
    ],
  );
  log(`  Forming:   proposal #${formingId} (${FORMING.signals.length} signals, synthesis, thread #${formingThread})`);

  // ── Deciding ───────────────────────────────────────────────────────────────
  const decidingThread = await insertThread(
    conn, categoryId, users, DECIDING.title, DECIDING.threadBody, DECIDING.replies, 9,
  );
  const [decidingRes] = (await conn.execute(
    `INSERT INTO proposals (authorId, title, description, category, status, aim, lane, forumThreadId, isExample, createdAt)
     VALUES (?, ?, ?, ?, 'in_governance', ?, 'full', ?, 1, DATE_SUB(NOW(), INTERVAL 9 DAY))`,
    [users.guide, DECIDING.title, DECIDING.description, DECIDING.category, DECIDING.aim, decidingThread],
  )) as any;
  const decidingId = decidingRes.insertId as number;
  const bridgeKey = `demo-dec-${decidingId}`.slice(0, 16);
  await conn.execute(
    `INSERT INTO hyphaBridges (bridgeKey, source, sourceId, targetDhoSlug, formKind, initiatorUserId, payload, status)
     VALUES (?, 'other', ?, 'regen-games', 'propose_contribution', ?, ?, 'handoff_sent')`,
    [bridgeKey, String(decidingId), users.guide, JSON.stringify({ example: true, title: DECIDING.title })],
  );
  await conn.execute(`UPDATE proposals SET hyphaBridgeKey = ? WHERE id = ?`, [bridgeKey, decidingId]);
  log(`  Deciding:  proposal #${decidingId} (Hypha stand-in bridge ${bridgeKey}, thread #${decidingThread})`);

  // ── Record ─────────────────────────────────────────────────────────────────
  const recordThread = await insertThread(
    conn, categoryId, users, RECORD.title, RECORD.threadBody, RECORD.replies, 20,
  );
  const [recordRes] = (await conn.execute(
    `INSERT INTO proposals (authorId, title, description, category, status, aim, lane, forumThreadId, isExample, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, 'implemented', ?, 'full', ?, 1, DATE_SUB(NOW(), INTERVAL 20 DAY), DATE_SUB(NOW(), INTERVAL 12 DAY))`,
    [users.guide, RECORD.title, RECORD.description, RECORD.category, RECORD.aim, recordThread],
  )) as any;
  const recordId = recordRes.insertId as number;
  await conn.execute(
    `INSERT INTO governance_executions (proposalId, kind, payload, status, detail, executedAt)
     VALUES (?, 'variable_change', ?, 'applied', ?, DATE_SUB(NOW(), INTERVAL 12 DAY))`,
    [
      recordId,
      JSON.stringify({ kind: "variable_change", variableKey: RECORD.execution.variableKey, newValue: RECORD.execution.after, example: true }),
      JSON.stringify({ variableKey: RECORD.execution.variableKey, before: RECORD.execution.before, after: RECORD.execution.after, example: true }),
    ],
  );
  log(`  Record:    proposal #${recordId} (variable_change applied, thread #${recordThread})`);

  // ── Evolution Engine (in-flight feature) ─────────────────────────────────────
  // status 'draft' keeps this proposal out of Forming/Deciding/Record; only its
  // feature execution surfaces, in the Evolution Engine's in-flight panel.
  const [evoRes] = (await conn.execute(
    `INSERT INTO proposals (authorId, title, description, category, status, aim, lane, executionPayload, isExample, createdAt)
     VALUES (?, ?, ?, ?, 'draft', ?, 'full', ?, 1, DATE_SUB(NOW(), INTERVAL 3 DAY))`,
    [
      users.guide, EVOLUTION.title, EVOLUTION.description, EVOLUTION.category, EVOLUTION.aim,
      JSON.stringify({ kind: "feature", ...EVOLUTION.spec, example: true }),
    ],
  )) as any;
  const evoId = evoRes.insertId as number;
  await conn.execute(
    `INSERT INTO governance_executions (proposalId, kind, payload, status, detail)
     VALUES (?, 'feature', ?, 'shipping', ?)`,
    [
      evoId,
      JSON.stringify({ kind: "feature", ...EVOLUTION.spec, example: true }),
      JSON.stringify({
        example: true,
        prUrl: "https://github.com/Rieki777/regen-civics/pull/0",
        prNumber: 0,
        launchWindowStartedAt: new Date(Date.now() - 8 * 3600_000).toISOString(),
      }),
    ],
  );
  log(`  Evolution: proposal #${evoId} (feature 'shipping' in the in-flight panel)`);

  log("\nSeed complete. Four demonstrations are live on /assembly, each marked Example.");
}

async function main() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) throw new Error("DATABASE_URL env var is required");

  if (DRY_RUN) {
    log("=== DRY RUN: no changes will be written ===");
    log(REMOVE ? "Would remove all Assembly demonstration rows." : "Would seed 4 demonstration proposals:");
    if (!REMOVE) {
      log(`  Forming:   ${FORMING.title}`);
      log(`  Deciding:  ${DECIDING.title}`);
      log(`  Record:    ${RECORD.title}`);
      log(`  Evolution: ${EVOLUTION.title}`);
      log(`  Demo accounts: ${DEMO_USERS.map((u) => u.name).join(", ")}`);
    }
    return;
  }

  const conn = await mysql.createConnection(dbUrl);
  try {
    if (REMOVE) {
      await remove(conn);
    } else {
      await seed(conn);
    }
  } finally {
    await conn.end();
  }
}

main().then(() => process.exit(0)).catch((err) => {
  console.error(err);
  process.exit(1);
});
