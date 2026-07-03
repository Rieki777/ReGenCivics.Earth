/**
 * The Evolution Engine, Rung 1 (ASSEMBLY_PAGE_SPEC.md section 7).
 *
 * Ratified variable changes apply themselves. The community votes on Hypha
 * (the human confirmation lives there, per ADR-8 and AI-AUTOMATION-RISKS
 * Risk 7); once the outcome is confirmed, the dispatcher applies the change
 * through the SAME code path as game.updateVariable: bounds re-checked,
 * game_variable_history written, cache busted. Every execution lands in the
 * append-only governance_executions table and surfaces in Record.
 *
 * Payloads are validated twice: at raise time (a change outside the
 * variable's bounds is rejected with "propose a bounds change first") and
 * again at execution (bounds may have moved since the raise). Failure marks
 * the execution failed with the reason; nothing partially applies.
 *
 * The system governance actor is a provisioned bot user (openId
 * "bot:governance-engine"), same pattern as the elder bots, so history rows
 * and updatedBy always point at a real user id.
 */
import { sql, eq } from "drizzle-orm";
import { getDb } from "../db";
import * as db from "../db";
import { users, proposals, governanceExecutions } from "../../drizzle/schema";
import { invalidateGameVariable } from "../game";

const GOVERNANCE_ACTOR_OPEN_ID = "bot:governance-engine";

export interface VariableChangePayload {
  kind: "variable_change";
  variableKey: string;
  newValue: number;
}

export type ExecutionPayload = VariableChangePayload; // feature/content kinds land with Rungs 2-3

export async function getOrCreateGovernanceActor(): Promise<number | null> {
  const database = await getDb();
  if (!database) return null;
  const existing = await db.getUserByOpenId(GOVERNANCE_ACTOR_OPEN_ID);
  if (existing) return existing.id;
  try {
    await database.insert(users).values({
      openId: GOVERNANCE_ACTOR_OPEN_ID,
      name: "The Evolution Engine",
      handle: "evolution-engine",
      loginMethod: "system",
      role: "user",
    } as any);
  } catch {
    // Unique-constraint race: another run created it first. Fall through.
  }
  const created = await db.getUserByOpenId(GOVERNANCE_ACTOR_OPEN_ID);
  return created?.id ?? null;
}

/** The one shared write path for a game variable change: bounds enforced,
 * history written, cache busted. game.updateVariable and the ratification
 * dispatcher both go through here. */
export async function applyVariableChange(input: {
  variableId?: number;
  variableKey?: string;
  newValue: number;
  changedBy: number;
  reason: string;
}): Promise<{ ok: true; key: string; previousValue: number } | { ok: false; error: string }> {
  const database = await getDb();
  if (!database) return { ok: false, error: "Database unavailable" };

  const [rows] = await database.execute(
    input.variableId != null
      ? sql`SELECT id, value, \`key\`, \`minValue\`, \`maxValue\` FROM game_variables WHERE id = ${input.variableId} LIMIT 1`
      : sql`SELECT id, value, \`key\`, \`minValue\`, \`maxValue\` FROM game_variables WHERE \`key\` = ${input.variableKey ?? ""} AND isActive = 1 LIMIT 1`
  );
  const current = (rows as unknown as any[])?.[0];
  if (!current) return { ok: false, error: `Game variable not found (${input.variableKey ?? input.variableId})` };

  const minV = current.minValue == null ? null : Number(current.minValue);
  const maxV = current.maxValue == null ? null : Number(current.maxValue);
  if ((minV != null && input.newValue < minV) || (maxV != null && input.newValue > maxV)) {
    return {
      ok: false,
      error: `Value ${input.newValue} is outside the allowed range for ${current.key} (${minV ?? "-∞"} to ${maxV ?? "∞"}).`,
    };
  }

  await database.execute(
    sql`INSERT INTO game_variable_history (variableId, previousValue, newValue, changedBy, reason)
        VALUES (${current.id}, ${current.value}, ${input.newValue}, ${input.changedBy}, ${input.reason})`
  );
  await database.execute(
    sql`UPDATE game_variables SET value = ${input.newValue}, updatedBy = ${input.changedBy} WHERE id = ${current.id}`
  );
  await invalidateGameVariable(current.key);
  return { ok: true, key: current.key, previousValue: Number(current.value) };
}

/** Raise-time validation. Rejects payloads that could never execute. */
export async function validateExecutionPayload(payload: ExecutionPayload): Promise<{ ok: true } | { ok: false; error: string }> {
  if (payload.kind !== "variable_change") {
    return { ok: false, error: "Only variable_change payloads execute at Rung 1." };
  }
  const database = await getDb();
  if (!database) return { ok: false, error: "Database unavailable" };
  const [rows] = await database.execute(
    sql`SELECT value, \`minValue\`, \`maxValue\`, displayName FROM game_variables WHERE \`key\` = ${payload.variableKey} AND isActive = 1 LIMIT 1`
  );
  const v = (rows as unknown as any[])?.[0];
  if (!v) return { ok: false, error: `No game variable named ${payload.variableKey}.` };
  const minV = v.minValue == null ? null : Number(v.minValue);
  const maxV = v.maxValue == null ? null : Number(v.maxValue);
  if ((minV != null && payload.newValue < minV) || (maxV != null && payload.newValue > maxV)) {
    return {
      ok: false,
      error: `${payload.newValue} is outside the bounds for ${payload.variableKey} (${minV ?? "-∞"} to ${maxV ?? "∞"}). Propose a bounds change first.`,
    };
  }
  return { ok: true };
}

/** Ratification dispatcher: run a proposal's execution payload. Called on a
 * confirmed Hypha outcome (webhook when it carries ratification, the admin
 * confirm action until then). Idempotent per proposal. */
export async function dispatchExecution(proposalId: number): Promise<{ status: string; detail?: string }> {
  const database = await getDb();
  if (!database) return { status: "failed", detail: "Database unavailable" };

  const props = await database.select().from(proposals).where(eq(proposals.id, proposalId)).limit(1);
  if (props.length === 0) return { status: "failed", detail: "Proposal not found" };
  const proposal = props[0];

  const payload = proposal.executionPayload as ExecutionPayload | null;
  if (!payload) return { status: "skipped", detail: "No execution payload on this proposal" };

  // Idempotency: one applied execution per proposal
  const existing = await database
    .select({ id: governanceExecutions.id, status: governanceExecutions.status })
    .from(governanceExecutions)
    .where(eq(governanceExecutions.proposalId, proposalId))
    .limit(1);
  if (existing.length && ["applied", "shipped"].includes(String(existing[0].status))) {
    return { status: String(existing[0].status), detail: "Already executed" };
  }

  const [ins] = existing.length
    ? [null]
    : await database.execute(
        sql`INSERT INTO governance_executions (proposalId, kind, payload, status)
            VALUES (${proposalId}, ${payload.kind}, ${JSON.stringify(payload)}, 'pending')`
      );
  const executionId = existing.length ? existing[0].id : Number((ins as any).insertId);

  if (payload.kind !== "variable_change") {
    await database.execute(
      sql`UPDATE governance_executions SET status = 'failed', detail = ${JSON.stringify({ error: "Rung for this kind is not enabled" })}, executedAt = NOW() WHERE id = ${executionId}`
    );
    return { status: "failed", detail: "Rung for this kind is not enabled" };
  }

  const actorId = await getOrCreateGovernanceActor();
  if (!actorId) {
    await database.execute(
      sql`UPDATE governance_executions SET status = 'failed', detail = ${JSON.stringify({ error: "Governance actor unavailable" })}, executedAt = NOW() WHERE id = ${executionId}`
    );
    return { status: "failed", detail: "Governance actor unavailable" };
  }

  const reason = `Ratified by the community: Assembly proposal #${proposalId} (${proposal.title}). https://regencivics.earth/assembly`;
  const result = await applyVariableChange({
    variableKey: payload.variableKey,
    newValue: payload.newValue,
    changedBy: actorId,
    reason,
  });

  if (!result.ok) {
    await database.execute(
      sql`UPDATE governance_executions SET status = 'failed', detail = ${JSON.stringify({ error: result.error })}, executedAt = NOW() WHERE id = ${executionId}`
    );
    return { status: "failed", detail: result.error };
  }

  await database.execute(
    sql`UPDATE governance_executions SET status = 'applied',
        detail = ${JSON.stringify({ variableKey: result.key, before: result.previousValue, after: payload.newValue })},
        executedAt = NOW() WHERE id = ${executionId}`
  );
  return { status: "applied", detail: `${result.key}: ${result.previousValue} -> ${payload.newValue}` };
}
