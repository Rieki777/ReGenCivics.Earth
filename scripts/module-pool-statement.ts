/**
 * Write (or dry-run) a $ReGen builders' pool cycle statement (ADR-50).
 *
 * The cron endpoint POST /api/cron/module-pool-statement does this daily. This
 * script is the hand-run counterpart, for settling a cycle a cron missed and
 * for looking at what a cycle WOULD say before it says it.
 *
 *   npx tsx scripts/module-pool-statement.ts --dry-run
 *   npx tsx scripts/module-pool-statement.ts --cycle 329 --dry-run
 *   npx tsx scripts/module-pool-statement.ts --cycle 329
 *
 * A dry run reaches the roster and the profiles but writes nothing at all: no
 * statement row, no share rows, and no snapshot carry, so running one can never
 * spend a village's carry-forward.
 *
 * It moves no money in either mode. The statement is a document; a human
 * executes the transfers through Hypha from the treasury.
 */
import "dotenv/config";
import { lastClosedCycle, cycleBoundsByNumber } from "../shared/lunar";
import { settleCycle } from "../server/jobs/moduleBuildersPool";

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const explicit = arg("cycle");
  const cycleNumber = explicit ? Number(explicit) : lastClosedCycle().cycleNumber;

  if (!Number.isInteger(cycleNumber)) {
    console.error(`Not a cycle number: ${explicit}`);
    process.exit(1);
  }

  const bounds = cycleBoundsByNumber(cycleNumber);
  console.log(`Cycle ${cycleNumber}: ${bounds.startsAt.toISOString()} to ${bounds.endsAt.toISOString()}`);
  if (bounds.endsAt.getTime() > Date.now()) {
    console.error("That cycle has not closed yet. A statement is written after a cycle ends, never during.");
    process.exit(1);
  }
  console.log(dryRun ? "Dry run: nothing will be written.\n" : "Writing the statement.\n");

  const report = await settleCycle(cycleNumber, { dryRun });
  console.log(JSON.stringify(report, null, 2));
  process.exit(report.ok ? 0 : 1);
}

main().catch((err) => {
  console.error("Statement failed:", err);
  process.exit(1);
});
