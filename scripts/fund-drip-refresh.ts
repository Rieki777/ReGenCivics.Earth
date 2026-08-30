/**
 * Re-render the pending investor drip emails against the current templates.
 *
 * Why this has to exist. `scheduled_emails` stores the FULLY RENDERED body at
 * scheduling time (drizzle/schema.ts, `body: text("body").notNull()`;
 * server/routes/investors.ts schedules all four drips the moment someone
 * submits the investor form). Fixing the template in code does nothing to a
 * row that was written weeks ago. Every pending row still carries the text it
 * was rendered with, and the sender (server/_core/index.ts, on a 60-second
 * tick) will send exactly that.
 *
 * As of 2026-08-30 that old text includes a full term sheet: 12 to 18% net IRR,
 * 8% preferred return, 20% carry, 1.5% management fee, $250,000 minimum,
 * quarterly distributions from Year 3, all stated as fact about a fund that is
 * not yet a legal entity. Those rows will keep going out on schedule until this
 * script is run against production.
 *
 * What it does. For every row with `status = 'pending'` and
 * `inquiryType = 'investor'`, match the stored subject back to the template
 * that produced it, re-render with the recipient's name, and update `subject`
 * and `body` in place. `scheduledFor` is never touched: someone who signed up
 * 25 days ago still gets their Day 30 email on day 30, with the current text.
 *
 * Safe to run twice. After the first pass the rows match the NEW subjects,
 * which are also in the matcher, so a second run re-renders to the same bytes.
 *
 *   npx tsx scripts/fund-drip-refresh.ts            # dry run, prints counts
 *   npx tsx scripts/fund-drip-refresh.ts --apply    # writes
 *   npx tsx scripts/fund-drip-refresh.ts --apply --verbose
 *
 * Needs DATABASE_URL. This is Rye's to run against Railway; a session has no
 * database.
 */
import "dotenv/config";
import { and, eq } from "drizzle-orm";
import { getDb } from "../server/db";
import { scheduledEmails } from "../drizzle/schema";
import { emailTemplates } from "../server/_core/email";

const APPLY = process.argv.includes("--apply");
const VERBOSE = process.argv.includes("--verbose");

type TemplateFn = (name: string) => { subject: string; html: string };

/**
 * Map a stored subject back to the template that rendered it.
 *
 * Both the old subject and the current one are listed for each template. The
 * old ones are how existing rows are found; the new ones are what makes a
 * second run a no-op instead of a miss. When a subject changes again, add the
 * old string here rather than replacing it, or the rows carrying it become
 * unreachable.
 */
const BY_SUBJECT: Array<{ subjects: string[]; name: string; render: TemplateFn }> = [
  {
    name: "investorWelcome",
    // Unchanged so far, but listed so a future subject edit has a home.
    subjects: ["Your ReGen Civics Investor Deck is Ready"],
    render: (n) => emailTemplates.investorWelcome(n, ""),
  },
  {
    name: "investorDripDay3",
    subjects: [
      "The ReGen Civics Fund: How the Economics Work", // pre-2026-08-30
      "The ReGen Civics Fund: how the economics are meant to work",
    ],
    render: (n) => emailTemplates.investorDripDay3(n),
  },
  {
    name: "investorDripDay7",
    subjects: ["Inside a ReGen Civics Land Project"],
    render: (n) => emailTemplates.investorDripDay7(n),
  },
  {
    name: "investorDripDay14",
    subjects: ["Common questions from investors  -  and an invitation"],
    render: (n) => emailTemplates.investorDripDay14(n),
  },
  {
    name: "investorDripDay30",
    subjects: ["One month on  -  have you signed your Letter of Intent?"],
    render: (n) => emailTemplates.investorDripDay30(n),
  },
];

function matchTemplate(subject: string) {
  const norm = subject.trim();
  return BY_SUBJECT.find((t) => t.subjects.some((s) => s.trim() === norm)) ?? null;
}

/**
 * The strings that must not survive in a queued body. If one is still present
 * after a re-render, the template did not actually get fixed and this script
 * would be papering over it, so it is reported rather than written.
 */
const MUST_NOT_APPEAR = [
  "506(c)",
  "Reg D",
  "Alliance Fund",
  "fund is open",
  "first in line when the fund opens",
  "Minimum commitment:",
  "Carried interest:",
  "Management fee:",
];

async function main() {
  console.log(
    `\nfund-drip-refresh  ${APPLY ? "APPLY (writes)" : "DRY RUN (no writes)"}\n` +
      "  target: scheduled_emails where status='pending' and inquiryType='investor'\n",
  );

  const db = await getDb();
  if (!db) {
    console.error("  DATABASE_URL is not set, or the connection failed. Nothing was read.\n");
    process.exit(1);
  }

  const rows = await db
    .select()
    .from(scheduledEmails)
    .where(and(eq(scheduledEmails.status, "pending"), eq(scheduledEmails.inquiryType, "investor")));

  console.log(`  found ${rows.length} pending investor row(s)\n`);
  if (rows.length === 0) {
    console.log("  nothing to do.\n");
    return;
  }

  let updated = 0;
  let unchanged = 0;
  const unmatched: Array<{ id: number; subject: string }> = [];
  const dirty: Array<{ id: number; found: string }> = [];

  for (const row of rows) {
    const tpl = matchTemplate(row.subject);
    if (!tpl) {
      unmatched.push({ id: row.id, subject: row.subject });
      continue;
    }

    const name = row.recipientName || "there";
    const fresh = tpl.render(name);

    for (const bad of MUST_NOT_APPEAR) {
      if (fresh.html.includes(bad)) dirty.push({ id: row.id, found: bad });
    }

    if (fresh.subject === row.subject && fresh.html === row.body) {
      unchanged++;
      if (VERBOSE) console.log(`  = #${row.id}  ${tpl.name}  already current`);
      continue;
    }

    if (VERBOSE) {
      console.log(
        `  ~ #${row.id}  ${tpl.name}  ${row.recipientEmail}  due ${row.scheduledFor.toISOString().slice(0, 10)}`,
      );
      if (fresh.subject !== row.subject) {
        console.log(`      subject: "${row.subject}"\n            -> "${fresh.subject}"`);
      }
      console.log(`      body: ${row.body.length} -> ${fresh.html.length} chars`);
    }

    if (APPLY) {
      await db
        .update(scheduledEmails)
        .set({ subject: fresh.subject, body: fresh.html })
        .where(eq(scheduledEmails.id, row.id));
    }
    updated++;
  }

  console.log(
    `\n  ${APPLY ? "updated" : "would update"}: ${updated}` +
      `\n  already current:  ${unchanged}` +
      `\n  unmatched:        ${unmatched.length}\n`,
  );

  if (unmatched.length) {
    console.log("  ⚠ rows whose subject matched no template. These keep their old body:");
    for (const u of unmatched) console.log(`      #${u.id}  "${u.subject}"`);
    console.log(
      "\n    Add the subject to BY_SUBJECT in this script and run again. Do not\n" +
        "    delete these rows: someone is waiting for that email.\n",
    );
  }

  if (dirty.length) {
    console.log("  ✗ a freshly rendered template still contains a retired claim:");
    for (const d of dirty) console.log(`      #${d.id}  "${d.found}"`);
    console.log("\n    Fix server/_core/email.ts before applying.\n");
    process.exitCode = 1;
  }

  if (!APPLY && updated > 0) {
    console.log("  Re-run with --apply to write these changes.\n");
  }
}

main()
  .then(() => process.exit(process.exitCode ?? 0))
  .catch((err) => {
    console.error("\nfund-drip-refresh failed:", err);
    process.exit(1);
  });
