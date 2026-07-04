/**
 * Evolution Engine Rung 1 — integration tests (hits the configured DB).
 *
 * Covers the whole ratified-variable-change path: raise-time bounds
 * validation, the shared applyVariableChange write path (bounds + history +
 * value), the dispatcher's idempotency, and the Rung 3 tier gate (a ratified
 * feature at tier < 3 parks in 'paused' and touches nothing on GitHub).
 * Creates its own test variable, user, and proposals; self-cleans in afterAll.
 */
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { eq, sql } from "drizzle-orm";
import * as db from "./db";
import { getDb } from "./db";
import { proposals, governanceExecutions, users } from "../drizzle/schema";
import {
  applyBoundsChange,
  applyVariableChange,
  dispatchExecution,
  getAutonomyTier,
  getOrCreateGovernanceActor,
  validateExecutionPayload,
} from "./lib/evolution";

vi.setConfig({ testTimeout: 30_000, hookTimeout: 60_000 });

const skipIfNoDb = !process.env.DATABASE_URL;

const TEST_VAR_KEY = "test.evolution_suite";
const TEST_OPEN_ID = "evolution-suite-test-user";

let testUserId: number;
let testVarId: number;
let varProposalId: number;
let featureProposalId: number;
let boundsProposalId: number;

async function fetchTestVar() {
  const database = await getDb();
  const [rows] = await database!.execute(
    sql`SELECT id, value FROM game_variables WHERE \`key\` = ${TEST_VAR_KEY} LIMIT 1`
  );
  return (rows as unknown as any[])[0];
}

beforeAll(async () => {
  if (skipIfNoDb) return;
  const database = await getDb();
  if (!database) return;

  await db.upsertUser({
    openId: TEST_OPEN_ID,
    email: "evolution-suite-test@example.com",
    name: "Evolution Suite Test User",
    loginMethod: "google",
  });
  const user = await db.getUserByOpenId(TEST_OPEN_ID);
  if (!user) throw new Error("test user not created");
  testUserId = user.id;

  // A sandbox variable with tight bounds; recreate from scratch each run.
  await database.execute(sql`DELETE FROM game_variable_history WHERE variableId IN (SELECT id FROM game_variables WHERE \`key\` = ${TEST_VAR_KEY})`);
  await database.execute(sql`DELETE FROM game_variables WHERE \`key\` = ${TEST_VAR_KEY}`);
  await database.execute(
    sql`INSERT INTO game_variables (category, subcategory, \`key\`, displayName, description, value, valueType, defaultValue, \`minValue\`, \`maxValue\`, isActive)
        VALUES ('test', 'suite', ${TEST_VAR_KEY}, 'Evolution suite test variable', 'Sandbox row created by evolution.test.ts', 5, 'integer', 5, 0, 10, 1)`
  );
  testVarId = Number((await fetchTestVar()).id);

  const [varIns] = await database.execute(
    sql`INSERT INTO proposals (authorId, title, category, status, aim, executionPayload)
        VALUES (${testUserId}, 'Evolution suite test: variable change', 'game_variable', 'passed',
                'Prove the dispatcher applies ratified variable changes',
                ${JSON.stringify({ kind: "variable_change", variableKey: TEST_VAR_KEY, newValue: 7 })})`
  );
  varProposalId = Number((varIns as any).insertId);

  const [featIns] = await database.execute(
    sql`INSERT INTO proposals (authorId, title, category, status, aim, executionPayload)
        VALUES (${testUserId}, 'Evolution suite test: feature', 'platform_feature', 'passed',
                'Prove Rung 3 stays dark below tier 3',
                ${JSON.stringify({ kind: "feature", specMarkdown: "toy spec", acceptanceCriteria: ["it parks"], scopePaths: ["client/src/pages/Assembly*"] })})`
  );
  featureProposalId = Number((featIns as any).insertId);

  const [boundsIns] = await database.execute(
    sql`INSERT INTO proposals (authorId, title, category, status, aim, executionPayload)
        VALUES (${testUserId}, 'Evolution suite test: bounds change', 'game_variable', 'passed',
                'Prove the community can widen its own sandbox',
                ${JSON.stringify({ kind: "bounds_change", variableKey: TEST_VAR_KEY, newMin: 3, newMax: 12 })})`
  );
  boundsProposalId = Number((boundsIns as any).insertId);
});

afterAll(async () => {
  if (skipIfNoDb || !testUserId) return;
  const database = await getDb();
  if (!database) return;
  for (const pid of [varProposalId, featureProposalId, boundsProposalId]) {
    if (!pid) continue;
    await database.delete(governanceExecutions).where(eq(governanceExecutions.proposalId, pid));
    await database.delete(proposals).where(eq(proposals.id, pid));
  }
  await database.execute(sql`DELETE FROM game_variable_history WHERE variableId = ${testVarId}`);
  await database.execute(sql`DELETE FROM game_variables WHERE \`key\` = ${TEST_VAR_KEY}`);
  await database.delete(users).where(eq(users.id, testUserId));
});

describe("validateExecutionPayload (raise-time gate)", () => {
  it.skipIf(skipIfNoDb)("accepts an in-bounds variable change", async () => {
    const r = await validateExecutionPayload({ kind: "variable_change", variableKey: TEST_VAR_KEY, newValue: 8 } as any);
    expect(r.ok).toBe(true);
  });

  it.skipIf(skipIfNoDb)("rejects out-of-bounds with the bounds-change nudge", async () => {
    const r = await validateExecutionPayload({ kind: "variable_change", variableKey: TEST_VAR_KEY, newValue: 99 } as any);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/Propose a bounds change first/);
  });

  it.skipIf(skipIfNoDb)("rejects an unknown variable key", async () => {
    const r = await validateExecutionPayload({ kind: "variable_change", variableKey: "test.does_not_exist_xyz", newValue: 1 } as any);
    expect(r.ok).toBe(false);
  });

  it.skipIf(skipIfNoDb)("rejects a feature with no scopePaths", async () => {
    const r = await validateExecutionPayload({ kind: "feature", specMarkdown: "x", acceptanceCriteria: ["y"], scopePaths: [] } as any);
    expect(r.ok).toBe(false);
  });

  it.skipIf(skipIfNoDb)("rejects a feature whose scope names a protected path", async () => {
    const r = await validateExecutionPayload({
      kind: "feature", specMarkdown: "x", acceptanceCriteria: ["y"], scopePaths: ["server/lib/evolution.ts"],
    } as any);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/protected path/);
  });
});

describe("applyVariableChange (the one shared write path)", () => {
  it.skipIf(skipIfNoDb)("applies in-bounds, records history, updates the value", async () => {
    const actor = await getOrCreateGovernanceActor();
    expect(actor).toBeTruthy();
    const r = await applyVariableChange({ variableKey: TEST_VAR_KEY, newValue: 6, changedBy: actor!, reason: "evolution suite test" });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.previousValue).toBe(5);

    const row = await fetchTestVar();
    expect(Number(row.value)).toBe(6);

    const database = await getDb();
    const [hist] = await database!.execute(
      sql`SELECT previousValue, newValue, changedBy FROM game_variable_history WHERE variableId = ${testVarId} ORDER BY id DESC LIMIT 1`
    );
    const h = (hist as unknown as any[])[0];
    expect(Number(h.previousValue)).toBe(5);
    expect(Number(h.newValue)).toBe(6);
    expect(Number(h.changedBy)).toBe(actor);
  });

  it.skipIf(skipIfNoDb)("refuses out-of-bounds and leaves the value alone", async () => {
    const r = await applyVariableChange({ variableKey: TEST_VAR_KEY, newValue: 42, changedBy: testUserId, reason: "should fail" });
    expect(r.ok).toBe(false);
    expect(Number((await fetchTestVar()).value)).toBe(6);
  });
});

describe("dispatchExecution (ratification dispatcher, Rung 1)", () => {
  it.skipIf(skipIfNoDb)("applies a ratified variable change end to end", async () => {
    const r = await dispatchExecution(varProposalId);
    expect(r.status).toBe("applied");
    expect(r.detail).toMatch(/-> 7/);
    expect(Number((await fetchTestVar()).value)).toBe(7);

    const database = await getDb();
    const execs = await database!
      .select()
      .from(governanceExecutions)
      .where(eq(governanceExecutions.proposalId, varProposalId));
    expect(execs.length).toBe(1);
    expect(execs[0].status).toBe("applied");
  });

  it.skipIf(skipIfNoDb)("is idempotent: a second dispatch does not re-apply", async () => {
    const r = await dispatchExecution(varProposalId);
    expect(r.status).toBe("applied");
    expect(r.detail).toBe("Already executed");

    const database = await getDb();
    const execs = await database!
      .select()
      .from(governanceExecutions)
      .where(eq(governanceExecutions.proposalId, varProposalId));
    expect(execs.length).toBe(1); // no second execution row
    expect(Number((await fetchTestVar()).value)).toBe(7); // unchanged

    const [hist] = await database!.execute(
      sql`SELECT COUNT(*) AS n FROM game_variable_history WHERE variableId = ${testVarId}`
    );
    expect(Number((hist as unknown as any[])[0].n)).toBe(2); // 5->6 (applyVariableChange test) + 6->7 (dispatch); the re-dispatch added none
  });

  it.skipIf(skipIfNoDb)("skips a proposal with no payload", async () => {
    const database = await getDb();
    const [ins] = await database!.execute(
      sql`INSERT INTO proposals (authorId, title, category, status) VALUES (${testUserId}, 'Evolution suite test: no payload', 'other', 'passed')`
    );
    const pid = Number((ins as any).insertId);
    const r = await dispatchExecution(pid);
    expect(r.status).toBe("skipped");
    await database!.delete(proposals).where(eq(proposals.id, pid));
  });
});

describe("bounds_change (the community widens its own sandbox)", () => {
  it.skipIf(skipIfNoDb)("raise-time: rejects evolution.* bounds (leash geometry is code-owned)", async () => {
    const r = await validateExecutionPayload({ kind: "bounds_change", variableKey: "evolution.max_autonomy_tier", newMin: 0, newMax: 5 } as any);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/code-owned/);
  });

  it.skipIf(skipIfNoDb)("raise-time: rejects min at or above max", async () => {
    const r = await validateExecutionPayload({ kind: "bounds_change", variableKey: TEST_VAR_KEY, newMin: 8, newMax: 8 } as any);
    expect(r.ok).toBe(false);
  });

  it.skipIf(skipIfNoDb)("raise-time: rejects bounds that strand the current value", async () => {
    // value is 7 by this point in the suite
    const r = await validateExecutionPayload({ kind: "bounds_change", variableKey: TEST_VAR_KEY, newMin: 8, newMax: 20 } as any);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/falls outside the proposed bounds/);
  });

  it.skipIf(skipIfNoDb)("raise-time: accepts bounds containing the current value", async () => {
    const r = await validateExecutionPayload({ kind: "bounds_change", variableKey: TEST_VAR_KEY, newMin: 3, newMax: 12 } as any);
    expect(r.ok).toBe(true);
  });

  it.skipIf(skipIfNoDb)("dispatch applies ratified bounds end to end, and the new bounds govern", async () => {
    const r = await dispatchExecution(boundsProposalId);
    expect(r.status).toBe("applied");
    expect(r.detail).toMatch(/bounds: 0..10 -> 3..12/);

    const database = await getDb();
    const [rows] = await database!.execute(
      sql`SELECT \`minValue\`, \`maxValue\` FROM game_variables WHERE \`key\` = ${TEST_VAR_KEY} LIMIT 1`
    );
    const v = (rows as unknown as any[])[0];
    expect(Number(v.minValue)).toBe(3);
    expect(Number(v.maxValue)).toBe(12);

    // The widened ceiling is live for value changes; the old one is gone.
    const up = await applyVariableChange({ variableKey: TEST_VAR_KEY, newValue: 12, changedBy: testUserId, reason: "new max works" });
    expect(up.ok).toBe(true);
    const down = await applyVariableChange({ variableKey: TEST_VAR_KEY, newValue: 2, changedBy: testUserId, reason: "below new min" });
    expect(down.ok).toBe(false);
  });

  it.skipIf(skipIfNoDb)("applyBoundsChange refuses evolution.* directly too", async () => {
    const r = await applyBoundsChange({ variableKey: "evolution.circuit_breaker_failures", newMin: 0, newMax: 10, changedBy: testUserId, reason: "must fail" });
    expect(r.ok).toBe(false);
  });
});

describe("Rung 3 stays dark below tier 3", () => {
  it.skipIf(skipIfNoDb)("the live autonomy tier is 1", async () => {
    expect(await getAutonomyTier()).toBe(1);
  });

  it.skipIf(skipIfNoDb)("a ratified feature parks in paused, with no GitHub side effects", async () => {
    const r = await dispatchExecution(featureProposalId);
    expect(r.status).toBe("paused");
    expect(r.detail).toMatch(/nothing built/);

    const database = await getDb();
    const execs = await database!
      .select()
      .from(governanceExecutions)
      .where(eq(governanceExecutions.proposalId, featureProposalId));
    expect(execs.length).toBe(1);
    expect(execs[0].status).toBe("paused");
    const detail = execs[0].detail as any;
    expect(detail?.issueUrl).toBeUndefined(); // nothing opened on GitHub
    expect(detail?.blockedTier).toBe(1);
  });
});
