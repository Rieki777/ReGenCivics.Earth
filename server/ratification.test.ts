/**
 * The ratification webhook path (Evolution Engine Rung 1, machine relay).
 *
 * Proves the full machine loop against the live DB: a ProposalExecuted event
 * from Hypha's DAO proposals contract, matched by hyphaProposalId, ratifies
 * the Assembly proposal, dispatches the execution, and stamps webhook
 * provenance — with redelivery safe and declines handled. Plus a pure
 * round-trip test of the viem log decoder using logs encoded with the same
 * ABI (no hand-rolled hex).
 */
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { eq, sql } from "drizzle-orm";
import { encodeEventTopics, encodeAbiParameters, parseAbi } from "viem";
import * as db from "./db";
import { getDb } from "./db";
import { proposals, governanceExecutions, hyphaBridges, users } from "../drizzle/schema";
import { handleHyphaEvent, decodeHyphaProposalLog } from "./lib/hypha-bridge/webhook-receiver";

vi.setConfig({ testTimeout: 30_000, hookTimeout: 60_000 });

const skipIfNoDb = !process.env.DATABASE_URL;

const TEST_VAR_KEY = "test.ratification_suite";
const TEST_OPEN_ID = "ratification-suite-test-user";
const BRIDGE_KEY_A = "rttesta1"; // 8 chars, fits varchar(16)
const BRIDGE_KEY_B = "rttestb2";
const HYPHA_PID_A = "98700001";
const HYPHA_PID_B = "98700002";

let testUserId: number;
let ratifyProposalId: number;
let declineProposalId: number;

async function insertBridge(bridgeKey: string, hyphaProposalId: string, sourceId: string) {
  const database = await getDb();
  await database!.execute(
    sql`INSERT INTO hyphaBridges (bridgeKey, source, sourceId, targetDhoSlug, formKind, initiatorUserId, payload, status, hyphaProposalId)
        VALUES (${bridgeKey}, 'other', ${sourceId}, 'regen-games', 'propose_contribution', ${testUserId}, ${JSON.stringify({ test: true })}, 'handoff_sent', ${hyphaProposalId})`
  );
}

beforeAll(async () => {
  if (skipIfNoDb) return;
  const database = await getDb();
  if (!database) return;

  await db.upsertUser({ openId: TEST_OPEN_ID, email: "ratification-test@example.com", name: "Ratification Test User", loginMethod: "google" });
  const user = await db.getUserByOpenId(TEST_OPEN_ID);
  if (!user) throw new Error("test user not created");
  testUserId = user.id;

  // Sandbox variable the ratified change will move.
  await database.execute(sql`DELETE FROM game_variable_history WHERE variableId IN (SELECT id FROM game_variables WHERE \`key\` = ${TEST_VAR_KEY})`);
  await database.execute(sql`DELETE FROM game_variables WHERE \`key\` = ${TEST_VAR_KEY}`);
  await database.execute(
    sql`INSERT INTO game_variables (category, subcategory, \`key\`, displayName, description, value, valueType, defaultValue, \`minValue\`, \`maxValue\`, isActive)
        VALUES ('test', 'suite', ${TEST_VAR_KEY}, 'Ratification suite variable', 'Sandbox row created by ratification.test.ts', 5, 'integer', 5, 0, 10, 1)`
  );

  // Clean any leftovers from a crashed prior run, then two proposals at the
  // binding-vote stage, each launched through a bridge.
  await database.execute(sql`DELETE FROM hyphaBridges WHERE bridgeKey IN (${BRIDGE_KEY_A}, ${BRIDGE_KEY_B})`);
  const [insA] = await database.execute(
    sql`INSERT INTO proposals (authorId, title, category, status, aim, hyphaBridgeKey, executionPayload)
        VALUES (${testUserId}, 'Ratification suite test: webhook ratifies', 'game_variable', 'in_governance',
                'Prove the machine relay', ${BRIDGE_KEY_A},
                ${JSON.stringify({ kind: "variable_change", variableKey: TEST_VAR_KEY, newValue: 9 })})`
  );
  ratifyProposalId = Number((insA as any).insertId);
  const [insB] = await database.execute(
    sql`INSERT INTO proposals (authorId, title, category, status, aim, hyphaBridgeKey)
        VALUES (${testUserId}, 'Ratification suite test: webhook declines', 'game_variable', 'in_governance',
                'Prove the decline path', ${BRIDGE_KEY_B})`
  );
  declineProposalId = Number((insB as any).insertId);
  await insertBridge(BRIDGE_KEY_A, HYPHA_PID_A, String(ratifyProposalId));
  await insertBridge(BRIDGE_KEY_B, HYPHA_PID_B, String(declineProposalId));
});

afterAll(async () => {
  if (skipIfNoDb || !testUserId) return;
  const database = await getDb();
  if (!database) return;
  for (const pid of [ratifyProposalId, declineProposalId]) {
    if (!pid) continue;
    await database.delete(governanceExecutions).where(eq(governanceExecutions.proposalId, pid));
    await database.delete(proposals).where(eq(proposals.id, pid));
  }
  await database.execute(sql`DELETE FROM hyphaBridges WHERE bridgeKey IN (${BRIDGE_KEY_A}, ${BRIDGE_KEY_B})`);
  await database.execute(sql`DELETE FROM game_variable_history WHERE variableId IN (SELECT id FROM game_variables WHERE \`key\` = ${TEST_VAR_KEY})`);
  await database.execute(sql`DELETE FROM game_variables WHERE \`key\` = ${TEST_VAR_KEY}`);
  await database.delete(users).where(eq(users.id, testUserId));
});

describe("machine ratification: ProposalExecuted -> Evolution Engine", () => {
  it.skipIf(skipIfNoDb)("ratifies, dispatches, and stamps webhook provenance", async () => {
    const result = await handleHyphaEvent({
      type: "ProposalExecuted",
      proposalId: HYPHA_PID_A,
      passed: true,
      txHash: "0xratificationtest",
    } as any);
    expect(result.matched).toBe(true);
    expect(result.bridgeKey).toBe(BRIDGE_KEY_A);

    const database = await getDb();
    // The cascade runs fire-and-forget; give it a beat to settle.
    await new Promise((r) => setTimeout(r, 4000));

    const [prop] = await database!.select({ status: proposals.status }).from(proposals).where(eq(proposals.id, ratifyProposalId));
    expect(prop.status).toBe("implemented");

    const execs = await database!.select().from(governanceExecutions).where(eq(governanceExecutions.proposalId, ratifyProposalId));
    expect(execs.length).toBe(1);
    expect(execs[0].status).toBe("applied");
    const detail = execs[0].detail as any;
    expect(detail.relay).toBe("alchemy-webhook");
    expect(detail.ratificationTxHash).toBe("0xratificationtest");

    const [rows] = await database!.execute(sql`SELECT value FROM game_variables WHERE \`key\` = ${TEST_VAR_KEY} LIMIT 1`);
    expect(Number((rows as unknown as any[])[0].value)).toBe(9);
  });

  it.skipIf(skipIfNoDb)("redelivery is a no-op: still one execution, still implemented", async () => {
    const result = await handleHyphaEvent({
      type: "ProposalExecuted",
      proposalId: HYPHA_PID_A,
      passed: true,
      txHash: "0xratificationtest-redelivered",
    } as any);
    expect(result.matched).toBe(true);
    await new Promise((r) => setTimeout(r, 3000));

    const database = await getDb();
    const [prop] = await database!.select({ status: proposals.status }).from(proposals).where(eq(proposals.id, ratifyProposalId));
    expect(prop.status).toBe("implemented");
    const execs = await database!.select().from(governanceExecutions).where(eq(governanceExecutions.proposalId, ratifyProposalId));
    expect(execs.length).toBe(1);
  });

  it.skipIf(skipIfNoDb)("passed=false declines the proposal, no execution dispatched", async () => {
    const result = await handleHyphaEvent({
      type: "ProposalExecuted",
      proposalId: HYPHA_PID_B,
      passed: false,
      txHash: "0xdeclinetest",
    } as any);
    expect(result.matched).toBe(true);
    await new Promise((r) => setTimeout(r, 3000));

    const database = await getDb();
    const [prop] = await database!.select({ status: proposals.status }).from(proposals).where(eq(proposals.id, declineProposalId));
    expect(prop.status).toBe("declined");
    const execs = await database!.select().from(governanceExecutions).where(eq(governanceExecutions.proposalId, declineProposalId));
    expect(execs.length).toBe(0);
  });
});

describe("decodeHyphaProposalLog (pure, viem round trip)", () => {
  const ABI = parseAbi([
    "event ProposalExecuted(uint256 indexed proposalId, bool passed, uint256 yesVotes, uint256 noVotes)",
  ]);
  const CONTRACT = "0x001bA7a00a259Fb12d7936455e292a60FC2bef14";

  function encodedLog(passed: boolean) {
    const topics = encodeEventTopics({ abi: ABI, eventName: "ProposalExecuted", args: { proposalId: 424242n } });
    const data = encodeAbiParameters(
      [{ type: "bool" }, { type: "uint256" }, { type: "uint256" }],
      [passed, 12n, 3n]
    );
    return { account: { address: CONTRACT }, topics: topics as string[], data, transaction: { hash: "0xabc" } };
  }

  it("decodes a passed ProposalExecuted from the Hypha contract", () => {
    const ev = decodeHyphaProposalLog(encodedLog(true));
    expect(ev).toEqual({ type: "ProposalExecuted", proposalId: "424242", passed: true, txHash: "0xabc" });
  });

  it("carries passed=false through (normalized to a rejection downstream)", () => {
    const ev = decodeHyphaProposalLog(encodedLog(false));
    expect(ev!.passed).toBe(false);
  });

  it("ignores logs from any other contract", () => {
    const log = { ...encodedLog(true), account: { address: "0x0000000000000000000000000000000000000001" } };
    expect(decodeHyphaProposalLog(log)).toBeNull();
  });

  it("never throws on malformed logs", () => {
    expect(decodeHyphaProposalLog({ account: { address: CONTRACT }, topics: ["0xdead"], data: "0x" })).toBeNull();
    expect(decodeHyphaProposalLog({} as any)).toBeNull();
  });
});
