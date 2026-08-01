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
import { readFileSync } from "node:fs";
import { sql, eq } from "drizzle-orm";
import { getDb } from "../db";
import * as db from "../db";
import { users, proposals, governanceExecutions } from "../../drizzle/schema";
import { invalidateGameVariable, getGameVariableOr } from "../game";
import { executionPayloadSchema } from "./evolution-payload";

const GOVERNANCE_ACTOR_OPEN_ID = "bot:governance-engine";

export interface VariableChangePayload {
  kind: "variable_change";
  variableKey: string;
  newValue: number;
}

export interface BoundsChangePayload {
  kind: "bounds_change";
  variableKey: string;
  newMin: number;
  newMax: number;
}

export interface FeaturePayload {
  kind: "feature";
  specMarkdown: string;
  acceptanceCriteria: string[];
  scopePaths: string[];
}

export type ExecutionPayload = VariableChangePayload | BoundsChangePayload | FeaturePayload;

// ─── Autonomy tiers (spec section 7) ───────────────────────────────────────
// 0 = humans apply by hand · 1 = variable changes auto-apply (default) ·
// 2 = content auto-applies · 3 = features auto-build and auto-ship.
// The tier is itself a community-governed game variable (Rung 1), so raising
// it is an act of meta-governance the community performs, not a deploy.
export async function getAutonomyTier(): Promise<number> {
  return Math.trunc(await getGameVariableOr("evolution.max_autonomy_tier", 1));
}

/** Minimal glob match (mirrors scripts/check-protected-paths.mjs) so raise-time
 * validation and the CI checker agree on what "protected" means. */
function globMatch(glob: string, file: string): boolean {
  const re = new RegExp(
    "^" +
      glob
        .replace(/[.+^${}()|[\]\\]/g, "\\$&")
        .replace(/\*\*/g, "\u0000")
        .replace(/\*/g, "[^/]*")
        .replace(/\u0000/g, ".*") +
      "$"
  );
  return re.test(file);
}

/** Read the protected + token-guarded globs from the CI-shared list. Returns
 * null if the file is missing or unreadable (callers fail closed). */
function loadProtectedGlobs(): string[] | null {
  try {
    const config = JSON.parse(readFileSync(".github/assembly-protected-paths.json", "utf8"));
    return [...(config.protectedGlobs ?? []), ...(config.tokenGuardedGlobs ?? [])];
  } catch {
    return null;
  }
}

async function readEvolutionVar(key: string, fallback: number): Promise<number> {
  return getGameVariableOr(key, fallback);
}

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
  proposalId?: number; // provenance: the ratified proposal that caused this change (0173)
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
    sql`INSERT INTO game_variable_history (variableId, previousValue, newValue, changedBy, reason, proposalId)
        VALUES (${current.id}, ${current.value}, ${input.newValue}, ${input.changedBy}, ${input.reason}, ${input.proposalId ?? null})`
  );
  await database.execute(
    sql`UPDATE game_variables SET value = ${input.newValue}, updatedBy = ${input.changedBy} WHERE id = ${current.id}`
  );
  await invalidateGameVariable(current.key);
  return { ok: true, key: current.key, previousValue: Number(current.value) };
}

/** The shared write path for a bounds change: same re-check discipline as
 * applyVariableChange. Never touches evolution.* (the leash geometry is
 * code-owned); requires the current value to sit inside the new bounds so a
 * ratified change can never leave the game in an inconsistent state. */
export async function applyBoundsChange(input: {
  variableKey: string;
  newMin: number;
  newMax: number;
  changedBy: number;
  reason: string;
}): Promise<{ ok: true; key: string; previousMin: number | null; previousMax: number | null } | { ok: false; error: string }> {
  const database = await getDb();
  if (!database) return { ok: false, error: "Database unavailable" };

  if (input.variableKey.startsWith("evolution.")) {
    return { ok: false, error: "evolution.* bounds are code-owned and never governed." };
  }
  if (!(Number.isFinite(input.newMin) && Number.isFinite(input.newMax)) || input.newMin >= input.newMax) {
    return { ok: false, error: "Bounds must be finite numbers with min below max." };
  }

  const [rows] = await database.execute(
    sql`SELECT id, value, \`key\`, \`minValue\`, \`maxValue\` FROM game_variables WHERE \`key\` = ${input.variableKey} AND isActive = 1 LIMIT 1`
  );
  const current = (rows as unknown as any[])?.[0];
  if (!current) return { ok: false, error: `Game variable not found (${input.variableKey})` };

  const cur = Number(current.value);
  if (cur < input.newMin || cur > input.newMax) {
    return { ok: false, error: `Current value ${cur} falls outside the new bounds (${input.newMin} to ${input.newMax}).` };
  }

  await database.execute(
    sql`UPDATE game_variables SET \`minValue\` = ${input.newMin}, \`maxValue\` = ${input.newMax}, updatedBy = ${input.changedBy} WHERE id = ${current.id}`
  );
  await invalidateGameVariable(current.key);
  return {
    ok: true,
    key: current.key,
    previousMin: current.minValue == null ? null : Number(current.minValue),
    previousMax: current.maxValue == null ? null : Number(current.maxValue),
  };
}

/** Raise-time validation. Rejects payloads that could never execute. */
export async function validateExecutionPayload(payload: ExecutionPayload): Promise<{ ok: true } | { ok: false; error: string }> {
  if (payload.kind === "feature") {
    if (!Array.isArray(payload.scopePaths) || payload.scopePaths.length === 0) {
      return { ok: false, error: "A feature proposal must declare the scopePaths it will touch." };
    }
    if (!Array.isArray(payload.acceptanceCriteria) || payload.acceptanceCriteria.length === 0) {
      return { ok: false, error: "A feature proposal must declare its acceptance criteria." };
    }
    // A scopePath that names a protected file could never pass the CI gate, so
    // reject it at raise time with a clear message instead of at build time.
    const guarded = loadProtectedGlobs();
    if (guarded === null) {
      return { ok: false, error: "The protected-paths list is unreadable; feature proposals are blocked until it is restored." };
    }
    for (const sp of payload.scopePaths) {
      const hit = guarded.find((g) => globMatch(g, sp) || globMatch(sp, g));
      if (hit) {
        return { ok: false, error: `scopePath "${sp}" is a protected path (${hit}). The machine may never modify it; this needs a human PR.` };
      }
    }
    return { ok: true };
  }
  if (payload.kind === "bounds_change") {
    if (payload.variableKey.startsWith("evolution.")) {
      return {
        ok: false,
        error: "The Evolution Engine's own leash geometry (evolution.* bounds) is code-owned and never governed. Propose a value change within the existing bounds instead.",
      };
    }
    if (!(Number.isFinite(payload.newMin) && Number.isFinite(payload.newMax)) || payload.newMin >= payload.newMax) {
      return { ok: false, error: "Bounds must be finite numbers with min below max." };
    }
    const database2 = await getDb();
    if (!database2) return { ok: false, error: "Database unavailable" };
    const [rows2] = await database2.execute(
      sql`SELECT value FROM game_variables WHERE \`key\` = ${payload.variableKey} AND isActive = 1 LIMIT 1`
    );
    const v2 = (rows2 as unknown as any[])?.[0];
    if (!v2) return { ok: false, error: `No game variable named ${payload.variableKey}.` };
    const cur = Number(v2.value);
    if (cur < payload.newMin || cur > payload.newMax) {
      return {
        ok: false,
        error: `The current value ${cur} falls outside the proposed bounds (${payload.newMin} to ${payload.newMax}). Ratify a value change into the new range first, then move the bounds.`,
      };
    }
    return { ok: true };
  }
  if (payload.kind !== "variable_change") {
    return { ok: false, error: "This payload kind cannot execute yet." };
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

  const rawPayload = proposal.executionPayload;
  if (!rawPayload) return { status: "skipped", detail: "No execution payload on this proposal" };

  // Execution-time shape gate. The payload was validated at raise time, but
  // it round-trips through the DB and could in principle be written by
  // another path. Re-check the structure before acting on it; the value-level
  // checks (bounds, protected paths) are re-run further down as before.
  const shapeCheck = executionPayloadSchema.safeParse(rawPayload);
  if (!shapeCheck.success) {
    const reason = shapeCheck.error.issues.map((i) => `${i.path.join(".") || "payload"}: ${i.message}`).join("; ");
    return { status: "failed", detail: `Stored execution payload failed shape validation: ${reason}` };
  }
  const payload: ExecutionPayload = shapeCheck.data;

  // Idempotency: one applied execution per proposal
  const existing = await database
    .select({ id: governanceExecutions.id, status: governanceExecutions.status })
    .from(governanceExecutions)
    .where(eq(governanceExecutions.proposalId, proposalId))
    .limit(1);
  if (existing.length && ["applied", "shipped"].includes(String(existing[0].status))) {
    return { status: String(existing[0].status), detail: "Already executed" };
  }

  let executionId: number;
  if (existing.length) {
    executionId = existing[0].id;
  } else {
    try {
      const [ins] = await database.execute(
        sql`INSERT INTO governance_executions (proposalId, kind, payload, status)
            VALUES (${proposalId}, ${payload.kind}, ${JSON.stringify(payload)}, 'pending')`
      );
      executionId = Number((ins as any).insertId);
    } catch (err: any) {
      // proposalId is UNIQUE (0172): a concurrent dispatch won the insert.
      // Defer to the winner instead of double-applying.
      if (err?.code === "ER_DUP_ENTRY" || err?.errno === 1062) {
        const winner = await database
          .select({ id: governanceExecutions.id, status: governanceExecutions.status })
          .from(governanceExecutions)
          .where(eq(governanceExecutions.proposalId, proposalId))
          .limit(1);
        return { status: String(winner[0]?.status ?? "pending"), detail: "A concurrent dispatch is handling this proposal." };
      }
      throw err;
    }
  }

  if (payload.kind === "feature") {
    return dispatchFeatureExecution(executionId, proposalId, proposal, payload);
  }

  if (payload.kind === "bounds_change") {
    const actorId2 = await getOrCreateGovernanceActor();
    if (!actorId2) {
      await database.execute(
        sql`UPDATE governance_executions SET status = 'failed', detail = ${JSON.stringify({ error: "Governance actor unavailable" })}, executedAt = NOW() WHERE id = ${executionId}`
      );
      return { status: "failed", detail: "Governance actor unavailable" };
    }
    const boundsResult = await applyBoundsChange({
      variableKey: payload.variableKey,
      newMin: payload.newMin,
      newMax: payload.newMax,
      changedBy: actorId2,
      reason: `Ratified by the community: Assembly proposal #${proposalId} (${proposal.title}). https://regencivics.earth/assembly`,
    });
    if (!boundsResult.ok) {
      await database.execute(
        sql`UPDATE governance_executions SET status = 'failed', detail = ${JSON.stringify({ error: boundsResult.error })}, executedAt = NOW() WHERE id = ${executionId}`
      );
      return { status: "failed", detail: boundsResult.error };
    }
    await database.execute(
      sql`UPDATE governance_executions SET status = 'applied',
          detail = ${JSON.stringify({ variableKey: boundsResult.key, beforeBounds: [boundsResult.previousMin, boundsResult.previousMax], afterBounds: [payload.newMin, payload.newMax] })},
          executedAt = NOW() WHERE id = ${executionId}`
    );
    return { status: "applied", detail: `${boundsResult.key} bounds: ${boundsResult.previousMin ?? "-∞"}..${boundsResult.previousMax ?? "∞"} -> ${payload.newMin}..${payload.newMax}` };
  }

  if (payload.kind !== "variable_change") {
    await database.execute(
      sql`UPDATE governance_executions SET status = 'failed', detail = ${JSON.stringify({ error: "This payload kind cannot execute yet." })}, executedAt = NOW() WHERE id = ${executionId}`
    );
    return { status: "failed", detail: "This payload kind cannot execute yet." };
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
    proposalId,
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

// ─── Rung 3: feature auto-ship (dark until the community votes tier to 3) ───

async function setExecutionDetail(executionId: number, patch: Record<string, unknown>, status?: string): Promise<void> {
  const database = await getDb();
  if (!database) return;
  const [rows] = await database.execute(sql`SELECT detail FROM governance_executions WHERE id = ${executionId} LIMIT 1`);
  let detail: Record<string, unknown> = {};
  try {
    const raw = (rows as unknown as any[])?.[0]?.detail;
    detail = raw ? (typeof raw === "string" ? JSON.parse(raw) : raw) : {};
  } catch {
    detail = {};
  }
  const merged = JSON.stringify({ ...detail, ...patch });
  if (status) {
    await database.execute(sql`UPDATE governance_executions SET status = ${status}, detail = ${merged} WHERE id = ${executionId}`);
  } else {
    await database.execute(sql`UPDATE governance_executions SET detail = ${merged} WHERE id = ${executionId}`);
  }
}

/** Route a ratified feature. Gated hard on the autonomy tier: below 3 the
 * execution parks in 'paused' and NOTHING is created on GitHub. At tier 3 it
 * opens the builder-agent issue and enters the shipping pipeline. */
async function dispatchFeatureExecution(
  executionId: number,
  proposalId: number,
  proposal: any,
  payload: FeaturePayload
): Promise<{ status: string; detail?: string }> {
  const database = await getDb();
  if (!database) return { status: "failed", detail: "Database unavailable" };

  const tier = await getAutonomyTier();
  if (tier < 3) {
    await setExecutionDetail(
      executionId,
      { reason: `Autonomy tier is ${tier}; Rung 3 (feature auto-ship) is off. The community raises the tier to enable it.`, blockedTier: tier },
      "paused"
    );
    return { status: "paused", detail: `Autonomy tier ${tier} < 3; feature parked, nothing built.` };
  }

  const { githubConfigured, createGovernanceIssue } = await import("./github-governance");
  if (!githubConfigured()) {
    await setExecutionDetail(executionId, { error: "GITHUB_GOVERNANCE_TOKEN not set; cannot open the builder issue." }, "failed");
    await checkCircuitBreaker();
    return { status: "failed", detail: "GitHub not configured" };
  }

  try {
    const issue = await createGovernanceIssue({
      proposalId,
      title: proposal.title,
      aim: proposal.aim ?? null,
      specMarkdown: payload.specMarkdown,
      acceptanceCriteria: payload.acceptanceCriteria,
      scopePaths: payload.scopePaths,
      hyphaAgreementUrl: proposal.hyphaBridgeKey ? `https://regencivics.earth/bridge/hypha/${proposal.hyphaBridgeKey}` : undefined,
    });
    await setExecutionDetail(executionId, { issueUrl: issue.url, issueNumber: issue.number, branch: `assembly/${proposalId}` }, "shipping");
    return { status: "shipping", detail: `Builder issue opened: ${issue.url}` };
  } catch (err: any) {
    await setExecutionDetail(executionId, { error: String(err?.message ?? err) }, "failed");
    await checkCircuitBreaker();
    return { status: "failed", detail: String(err?.message ?? err) };
  }
}

/** Advance shipping executions through the launch window and merge. Called by
 * the hourly lifecycle job. Deterministic: the LLM built the code upstream in
 * the GitHub Action; this only moves gated PRs through time-and-merge. */
export async function advanceLaunchWindows(): Promise<{ merged: number; waiting: number }> {
  const database = await getDb();
  if (!database) return { merged: 0, waiting: 0 };
  const tier = await getAutonomyTier();
  if (tier < 3) return { merged: 0, waiting: 0 }; // dark: never advances below tier 3

  const { githubConfigured, findAssemblyPr, mergeAssemblyPr } = await import("./github-governance");
  if (!githubConfigured()) return { merged: 0, waiting: 0 };

  const windowHours = await readEvolutionVar("evolution.launch_window_hours", 24);
  const [rows] = await database.execute(
    sql`SELECT id, proposalId, detail FROM governance_executions WHERE kind = 'feature' AND status = 'shipping' LIMIT 25`
  );
  let merged = 0;
  let waiting = 0;
  for (const row of rows as unknown as any[]) {
    const detail = typeof row.detail === "string" ? JSON.parse(row.detail) : (row.detail ?? {});
    if (detail.paused) { waiting++; continue; }
    const pr = await findAssemblyPr(row.proposalId);
    if (!pr || !pr.labels.includes("gates-passed")) { waiting++; continue; }

    // Human approval gate (0173): while launch_require_approval is on, a
    // Steward/admin must label the PR approved-for-launch before the window
    // can merge it. "Until AI can verify the code matches the vote, a human
    // does" — the community votes this requirement off when trust is earned.
    const requireApproval = (await readEvolutionVar("evolution.launch_require_approval", 1)) >= 1;
    if (requireApproval && !pr.labels.includes("approved-for-launch")) { waiting++; continue; }

    // Start the visible launch window when gates first pass.
    if (!detail.launchWindowStartedAt) {
      await setExecutionDetail(row.id, { launchWindowStartedAt: new Date().toISOString(), prUrl: pr.url, prNumber: pr.number });
      waiting++;
      continue;
    }
    const startedMs = new Date(detail.launchWindowStartedAt).getTime();
    if (Date.now() - startedMs < windowHours * 3_600_000) { waiting++; continue; }

    try {
      const { sha } = await mergeAssemblyPr(pr.number, `feat(evolution): ship ratified proposal #${row.proposalId}`);
      await setExecutionDetail(row.id, { commitSha: sha, mergedAt: new Date().toISOString() }, "shipped");
      merged++;
      void announceShip(row.proposalId);
    } catch (err: any) {
      await setExecutionDetail(row.id, { error: `merge failed: ${String(err?.message ?? err)}` }, "failed");
      await checkCircuitBreaker();
    }
  }
  return { merged, waiting };
}

/** A Steward+ pauses a shipping feature during its launch window. */
export async function pauseShip(executionId: number, userId: number, reason: string): Promise<{ ok: boolean; error?: string }> {
  const database = await getDb();
  if (!database) return { ok: false, error: "Database unavailable" };
  const [rows] = await database.execute(sql`SELECT status FROM governance_executions WHERE id = ${executionId} LIMIT 1`);
  const status = (rows as unknown as any[])?.[0]?.status;
  if (status !== "shipping") return { ok: false, error: `Execution is ${status}, not shipping.` };
  await setExecutionDetail(executionId, { paused: true, pausedBy: userId, pauseReason: reason, pausedAt: new Date().toISOString() }, "paused");
  return { ok: true };
}

/** A Steward+ rolls back a shipped feature. Opens a human-completed revert. */
export async function rollbackShip(executionId: number, userId: number, reason: string): Promise<{ ok: boolean; revertUrl?: string; error?: string }> {
  const database = await getDb();
  if (!database) return { ok: false, error: "Database unavailable" };
  const [rows] = await database.execute(sql`SELECT status, detail FROM governance_executions WHERE id = ${executionId} LIMIT 1`);
  const row = (rows as unknown as any[])?.[0];
  if (!row || row.status !== "shipped") return { ok: false, error: "Only a shipped execution can be rolled back." };
  const detail = typeof row.detail === "string" ? JSON.parse(row.detail) : (row.detail ?? {});
  if (!detail.commitSha) return { ok: false, error: "No commit SHA recorded for this execution." };

  const { githubConfigured, createRevert } = await import("./github-governance");
  if (!githubConfigured()) return { ok: false, error: "GitHub not configured." };
  try {
    const { url } = await createRevert(detail.commitSha, `Rollback by user ${userId}: ${reason}`);
    await setExecutionDetail(executionId, { rolledBackBy: userId, rollbackReason: reason, revertUrl: url, rolledBackAt: new Date().toISOString() }, "rolled_back");
    await checkCircuitBreaker();
    return { ok: true, revertUrl: url };
  } catch (err: any) {
    return { ok: false, error: String(err?.message ?? err) };
  }
}

/** Circuit breaker: N consecutive failed-or-rolled-back feature ships freeze
 * Rung 3 by dropping the autonomy tier to 1. Code-enforced, not tunable. */
export async function checkCircuitBreaker(): Promise<{ tripped: boolean; consecutive: number }> {
  const database = await getDb();
  if (!database) return { tripped: false, consecutive: 0 };
  const threshold = await readEvolutionVar("evolution.circuit_breaker_failures", 2);
  const [rows] = await database.execute(
    sql`SELECT status FROM governance_executions WHERE kind = 'feature' AND status IN ('shipped','failed','rolled_back') ORDER BY id DESC LIMIT ${threshold}`
  );
  const recent = (rows as unknown as any[]).map((r) => String(r.status));
  const consecutive = recent.length >= threshold && recent.every((s) => s === "failed" || s === "rolled_back") ? recent.length : 0;
  if (consecutive >= threshold) {
    const tier = await getAutonomyTier();
    if (tier > 1) {
      const actorId = await getOrCreateGovernanceActor();
      if (actorId) {
        await applyVariableChange({
          variableKey: "evolution.max_autonomy_tier",
          newValue: 1,
          changedBy: actorId,
          reason: `Circuit breaker: ${consecutive} consecutive feature ships failed or were rolled back. Rung 3 frozen until the community re-enables it.`,
        });
      }
    }
    return { tripped: true, consecutive };
  }
  return { tripped: false, consecutive };
}

async function announceShip(proposalId: number): Promise<void> {
  try {
    const database = await getDb();
    if (!database) return;
    const props = await database.select().from(proposals).where(eq(proposals.id, proposalId)).limit(1);
    if (props.length === 0) return;
    await database.execute(sql`UPDATE proposals SET status = 'implemented' WHERE id = ${proposalId}`);
    const { notifyGovernanceSubscribers } = await import("../jobs/assemblyNotify");
    void notifyGovernanceSubscribers(
      "The game just evolved",
      `<p>A ratified feature shipped automatically: <strong>${props[0].title}</strong>.</p>
       <p><a href="https://regencivics.earth/assembly">See the full trail in the Record</a></p>`
    );
  } catch (err) {
    console.error("[evolution] announceShip failed", err);
  }
}
