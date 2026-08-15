/**
 * The one shared path for recording a Hypha ratification outcome and running
 * the Evolution Engine dispatcher (ASSEMBLY_PAGE_SPEC.md section 7).
 *
 * Two callers, same rules:
 *  - assembly.confirmRatification: the admin relay (human records the outcome)
 *  - the Alchemy webhook cascade: ProposalExecuted arrives machine-to-machine
 *
 * Both funnel here so status transitions, execution dispatch, provenance
 * stamping, and the governance notification cannot drift apart. Idempotent
 * end to end: the proposal status guard rejects re-confirmation, and
 * dispatchExecution enforces one applied execution per proposal at the DB
 * level (0172).
 */
import { sql, eq } from "drizzle-orm";
import { getDb } from "../db";
import { proposals, governanceExecutions } from "../../drizzle/schema";
import { logger } from "../_core/logger";

const log = logger("ratification");

export interface RatificationProvenance {
  /** users.id of whoever/whatever relayed the outcome (admin or the bot). */
  confirmedBy: number;
  /** "admin" for the manual relay, "alchemy-webhook" for the machine path. */
  relay: "admin" | "alchemy-webhook";
  hyphaAgreementUrl?: string;
  txHash?: string;
}

export interface RatificationResult {
  ok: boolean;
  outcome?: "ratified" | "declined";
  execution?: { status: string; detail?: string } | null;
  error?: string;
}

/** Apply a confirmed Hypha outcome to an Assembly proposal. The proposal must
 * be at the binding-vote stage (in_governance); anything else is a no-op with
 * an explanation, so webhook redeliveries and admin/webhook races are safe. */
export async function applyRatificationOutcome(
  proposalId: number,
  outcome: "ratified" | "declined",
  provenance: RatificationProvenance
): Promise<RatificationResult> {
  const db = await getDb();
  if (!db) return { ok: false, error: "DB unavailable" };

  const props = await db
    .select({ status: proposals.status, isExample: proposals.isExample })
    .from(proposals)
    .where(eq(proposals.id, proposalId))
    .limit(1);
  if (props.length === 0) return { ok: false, error: "Proposal not found" };
  // A demonstration proposal is seeded at in_governance, the one status this
  // function accepts. Refuse it here so the single shared path covers both
  // callers: the admin relay and the on-chain webhook cascade.
  if (props[0].isExample) {
    return { ok: false, error: "This is a demonstration proposal. It carries no binding vote to confirm." };
  }
  if (props[0].status !== "in_governance") {
    return { ok: false, error: `This proposal is ${props[0].status}; only a proposal at a binding vote can be confirmed.` };
  }

  if (outcome === "declined") {
    await db.execute(sql`UPDATE proposals SET status = 'declined' WHERE id = ${proposalId}`);
    log.info(`proposal ${proposalId} declined via ${provenance.relay}`);
    return { ok: true, outcome: "declined", execution: null };
  }

  await db.execute(sql`UPDATE proposals SET status = 'passed' WHERE id = ${proposalId}`);
  const { dispatchExecution } = await import("./evolution");
  const execution = await dispatchExecution(proposalId);
  if (execution.status === "applied") {
    await db.execute(sql`UPDATE proposals SET status = 'implemented' WHERE id = ${proposalId}`);
  }

  // Stamp provenance onto the execution row so the Record's audit trail
  // covers the relay (human or machine), not just the machine's part.
  try {
    const [rows] = await db.execute(
      sql`SELECT id, detail FROM governance_executions WHERE proposalId = ${proposalId} LIMIT 1`
    );
    const row = (rows as unknown as any[])?.[0];
    if (row) {
      let detail: Record<string, unknown> = {};
      try {
        detail = row.detail ? (typeof row.detail === "string" ? JSON.parse(row.detail) : row.detail) : {};
      } catch { detail = {}; }
      const merged = JSON.stringify({
        ...detail,
        confirmedBy: provenance.confirmedBy,
        relay: provenance.relay,
        ...(provenance.hyphaAgreementUrl ? { hyphaAgreementUrl: provenance.hyphaAgreementUrl } : {}),
        ...(provenance.txHash ? { ratificationTxHash: provenance.txHash } : {}),
      });
      await db.execute(sql`UPDATE governance_executions SET detail = ${merged} WHERE id = ${row.id}`);
    }
  } catch (err) {
    log.error("provenance stamping failed (never blocks the ratification)", err);
  }

  if (execution.status === "applied") {
    try {
      const { notifyGovernanceSubscribers } = await import("../jobs/assemblyNotify");
      void notifyGovernanceSubscribers(
        "The game just evolved",
        `<p>A ratified proposal executed automatically: <strong>${execution.detail ?? ""}</strong></p>
         <p><a href="https://regencivics.earth/assembly">See the full trail in the Record</a></p>`
      );
    } catch (err) {
      log.error("governance notification failed", err);
    }
  }

  log.info(`proposal ${proposalId} ratified via ${provenance.relay}: execution ${execution.status}`);
  return { ok: true, outcome: "ratified", execution };
}
