/**
 * A crowdpool delivery's score points count once (bundle 1, item 5).
 *
 * deliveryPayoff scores a delivery for an account holder before it checks for
 * a player profile. linkAnonymousContributions, which runs on every sign-in,
 * used to score again for every delivered row with no playerContributionId,
 * so an account holder who had no profile at delivery was counted twice.
 * Both now go through recordCrowdpoolScoreOnce, and migration 0294 puts a
 * unique key behind it.
 *
 * Runs against the SCRATCH database only (a local host, or one listed in
 * TEST_DB_HOSTS), with 0294 applied. Skips everywhere else. Fixture users sit
 * in 986500 to 986599, emails end in @b1-lane.invalid, and afterAll removes
 * every row this file wrote, score rows included.
 */
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { inArray, sql } from "drizzle-orm";

vi.mock("./_core/notification", () => ({
  notifyOwner: vi.fn().mockResolvedValue(true),
  notifyIfEnabled: vi.fn().mockResolvedValue(true),
}));
vi.mock("./notify-with-prefs", () => ({
  notifyIfEnabled: vi.fn().mockResolvedValue(true),
}));
vi.mock("./_core/email", async (orig) => ({
  ...(await orig<typeof import("./_core/email")>()),
  sendEmail: vi.fn().mockResolvedValue({ id: "test-email-id" }),
}));
vi.mock("./_core/imageGeneration", () => ({
  generateImage: vi.fn().mockRejectedValue(new Error("image generation off in tests")),
}));

import * as dbHelpers from "./db";
import { campaigns, campaignContributions, campaignItems } from "../drizzle/schema";
import { linkAnonymousContributions } from "./routes/campaigns";
import { recordCrowdpoolScoreOnce } from "./game";
import { isTestDbUrl } from "./test-db-guard";
import {
  adminCaller,
  cleanupFixtureApplications,
  createApprovedApplication,
  realOffer,
  stewardCaller,
} from "./test-fixtures/crowdpool";

const skipUnlessScratch = !isTestDbUrl(process.env.DATABASE_URL);

const STEWARD = 986501;
const CONTRIBUTOR = 986502;
const ENDORSED = 986503;
const CONTRIBUTOR_EMAIL = "giver.986502@b1-lane.invalid";
const FIRST_USER = 986500;
const LAST_USER = 986599;
const createdCampaignIds: number[] = [];

type Db = NonNullable<Awaited<ReturnType<typeof dbHelpers.getDb>>>;

async function rowsOf(database: Db, query: ReturnType<typeof sql>): Promise<any[]> {
  const res: any = await database.execute(query);
  return (res?.[0] ?? res) as any[];
}

async function scoreRows(database: Db, contributionId: number): Promise<number> {
  const rows = await rowsOf(database, sql`
    SELECT COUNT(*) AS n FROM contribution_score_events
    WHERE action = 'crowdpool_contribution' AND referenceType = 'crowdpool' AND referenceId = ${contributionId}
  `);
  return Number(rows[0]?.n ?? 0);
}

async function feedRows(database: Db, userId: number, contributionId: number): Promise<number> {
  const rows = await rowsOf(database, sql`
    SELECT COUNT(*) AS n FROM activity_feed_events
    WHERE eventType = 'score_event' AND actorId = ${userId} AND targetId = ${contributionId}
  `);
  return Number(rows[0]?.n ?? 0);
}

/**
 * recordCrowdpoolScoreOnce reads this game variable and throws without it.
 * Idempotent: on a database that has it, this only re-affirms it is active
 * and never changes its value (same as contributions.test.ts).
 */
async function ensureCrowdpoolScoreVariable(database: Db) {
  await database.execute(sql`
    INSERT INTO game_variables (category, subcategory, \`key\`, displayName, description, value, valueType, defaultValue, isActive)
    VALUES ('scoring', 'weights', 'scoring.weights.crowdpool_contribution', 'Crowd-pooling contribution', 'Points per crowd-pooling pledge', 20, 'integer', 20, 1)
    ON DUPLICATE KEY UPDATE isActive = 1
  `);
}

let database: Db;
let contributionId = 0;

beforeAll(async () => {
  if (skipUnlessScratch) return;
  database = (await dbHelpers.getDb())!;
  expect(database).toBeTruthy();
  const key = await rowsOf(database, sql`
    SELECT COUNT(*) AS n FROM information_schema.statistics
    WHERE table_schema = DATABASE() AND table_name = 'contribution_score_events'
      AND index_name = 'contribution_score_events_crowdpool_once'
  `);
  if (Number(key[0]?.n ?? 0) === 0) {
    throw new Error("Apply drizzle/0294_score_events_once.sql to the scratch database first.");
  }
  await ensureCrowdpoolScoreVariable(database);
  // A clean slate for this file's users, in case an earlier run died.
  await database.execute(sql`DELETE FROM contribution_score_events WHERE userId BETWEEN ${FIRST_USER} AND ${LAST_USER}`);
  await database.execute(sql`DELETE FROM player_contributions WHERE userId BETWEEN ${FIRST_USER} AND ${LAST_USER}`);
  await database.execute(sql`DELETE FROM player_profiles WHERE userId BETWEEN ${FIRST_USER} AND ${LAST_USER}`);
});

afterAll(async () => {
  if (skipUnlessScratch) return;
  if (createdCampaignIds.length) {
    await database.delete(campaignContributions).where(inArray(campaignContributions.campaignId, createdCampaignIds));
    await database.delete(campaignItems).where(inArray(campaignItems.campaignId, createdCampaignIds));
    await database.delete(campaigns).where(inArray(campaigns.id, createdCampaignIds));
  }
  await database.execute(sql`DELETE FROM contribution_score_events WHERE userId BETWEEN ${FIRST_USER} AND ${LAST_USER}`);
  await database.execute(sql`DELETE FROM activity_feed_events WHERE actorId BETWEEN ${FIRST_USER} AND ${LAST_USER}`);
  await database.execute(sql`DELETE FROM player_contributions WHERE userId BETWEEN ${FIRST_USER} AND ${LAST_USER}`);
  await database.execute(sql`DELETE FROM player_profiles WHERE userId BETWEEN ${FIRST_USER} AND ${LAST_USER}`);
  await database.execute(sql`DELETE FROM notifications WHERE userId BETWEEN ${FIRST_USER} AND ${LAST_USER}`);
  await cleanupFixtureApplications();
});

describe("a delivery by someone with no player profile yet", () => {
  it.skipIf(skipUnlessScratch)("scores exactly once at delivery", async () => {
    expect(await dbHelpers.getPlayerProfileByUserId(CONTRIBUTOR)).toBeFalsy();

    const applicationId = await createApprovedApplication(STEWARD);
    const { id: campaignId } = await stewardCaller(STEWARD).campaigns.create({
      applicationId,
      title: "Lane one orchard",
      description: "Fruit trees for the lower field.",
      projectName: "Lane one orchard",
      currency: "USD",
      financialTarget: 0,
      items: [
        { category: "equipment", kind: "item", equipmentName: "Pruning saws", quantityWanted: 3, estimatedValue: 300, acceptsGift: true, acceptsLoan: false },
      ],
    });
    createdCampaignIds.push(campaignId);
    await adminCaller().campaigns.updateStatus({ id: campaignId, status: "active" });

    const offer = await realOffer(stewardCaller(CONTRIBUTOR).campaigns.submitContribution({
      campaignId,
      contributionType: "equipment",
      title: "Two pruning saws",
      estimatedValue: 200,
      contributorName: "Lane One Giver",
      contributorEmail: CONTRIBUTOR_EMAIL,
      equipmentName: "Pruning saws",
      equipmentQuantity: 2,
    }));
    contributionId = offer.id;
    expect((await dbHelpers.getContributionById(contributionId))?.userId).toBe(CONTRIBUTOR);

    const steward = stewardCaller(STEWARD);
    await steward.campaigns.updateContributionStatus({ contributionId, status: "accepted" });
    await steward.campaigns.updateContributionStatus({ contributionId, status: "fulfilled" });

    const row = await dbHelpers.getContributionById(contributionId);
    expect(row?.status).toBe("fulfilled");
    // No profile: no Living Tree row yet, but the score is recorded.
    expect(row?.playerContributionId ?? null).toBeNull();
    expect(await scoreRows(database, contributionId)).toBe(1);
    expect(await feedRows(database, CONTRIBUTOR, contributionId)).toBe(1);
  });

  it.skipIf(skipUnlessScratch)("gets its Living Tree row at the next sign-in, and still scores once, however often it links", async () => {
    expect(contributionId).toBeGreaterThan(0);
    await dbHelpers.createPlayerProfile({ userId: CONTRIBUTOR, displayName: "Lane One Giver" });

    const first = await linkAnonymousContributions(database, CONTRIBUTOR, CONTRIBUTOR_EMAIL);
    expect(first.livingTreeAdded).toBe(1);
    const second = await linkAnonymousContributions(database, CONTRIBUTOR, CONTRIBUTOR_EMAIL);
    expect(second.livingTreeAdded).toBe(0);

    const row = await dbHelpers.getContributionById(contributionId);
    expect(row?.playerContributionId).toBeTruthy();
    const tree = await rowsOf(database, sql`
      SELECT COUNT(*) AS n FROM player_contributions WHERE userId = ${CONTRIBUTOR} AND id = ${row!.playerContributionId}
    `);
    expect(Number(tree[0]?.n ?? 0)).toBe(1);
    expect(await scoreRows(database, contributionId)).toBe(1);
    expect(await feedRows(database, CONTRIBUTOR, contributionId)).toBe(1);
  });

  it.skipIf(skipUnlessScratch)("recordCrowdpoolScoreOnce called again records nothing and writes no feed line", async () => {
    expect(contributionId).toBeGreaterThan(0);
    expect(await recordCrowdpoolScoreOnce(CONTRIBUTOR, contributionId)).toBe(false);
    expect(await scoreRows(database, contributionId)).toBe(1);
    expect(await feedRows(database, CONTRIBUTOR, contributionId)).toBe(1);
  });
});

describe("the database key behind it (0294)", () => {
  it.skipIf(skipUnlessScratch)("refuses a raw second crowdpool score row for the same contribution", async () => {
    expect(contributionId).toBeGreaterThan(0);
    let code: string | undefined;
    try {
      await database.execute(sql`
        INSERT INTO contribution_score_events (userId, action, points, variableKey, referenceType, referenceId, seasonId, createdAt)
        VALUES (${CONTRIBUTOR}, 'crowdpool_contribution', 20, 'scoring.weights.crowdpool_contribution', 'crowdpool', ${contributionId}, NULL, NOW())
      `);
    } catch (e: any) {
      code = e?.code ?? e?.cause?.code;
    }
    expect(code).toBe("ER_DUP_ENTRY");
    expect(await scoreRows(database, contributionId)).toBe(1);
  });

  it.skipIf(skipUnlessScratch)("leaves other actions alone: an endorsement pair can still be recorded twice", async () => {
    for (let i = 0; i < 2; i++) {
      await database.execute(sql`
        INSERT INTO contribution_score_events (userId, action, points, variableKey, referenceType, referenceId, seasonId, createdAt)
        VALUES (${ENDORSED}, 'endorsement_received', 5, 'scoring.weights.endorsement_received', 'endorsement', ${STEWARD}, NULL, NOW())
      `);
    }
    const rows = await rowsOf(database, sql`
      SELECT COUNT(*) AS n FROM contribution_score_events
      WHERE userId = ${ENDORSED} AND action = 'endorsement_received' AND referenceId = ${STEWARD}
    `);
    expect(Number(rows[0]?.n ?? 0)).toBe(2);
  });

  it.skipIf(skipUnlessScratch)("records a first crowdpool score for a new contribution and returns true", async () => {
    // A reference no contribution uses, cleaned up with this file's users.
    const freshRef = 2_000_000_000 - CONTRIBUTOR;
    await database.execute(sql`DELETE FROM contribution_score_events WHERE action = 'crowdpool_contribution' AND referenceId = ${freshRef}`);
    expect(await recordCrowdpoolScoreOnce(CONTRIBUTOR, freshRef)).toBe(true);
    expect(await scoreRows(database, freshRef)).toBe(1);
    expect(await feedRows(database, CONTRIBUTOR, freshRef)).toBe(1);
    expect(await recordCrowdpoolScoreOnce(CONTRIBUTOR, freshRef)).toBe(false);
    expect(await scoreRows(database, freshRef)).toBe(1);
  });
});
