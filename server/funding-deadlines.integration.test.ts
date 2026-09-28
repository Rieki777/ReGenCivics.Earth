/**
 * Funding deadline pings against a real database (funding engine Phase 2,
 * drizzle/0278): each ping goes out exactly once, a failed send releases its
 * claim so the next tick retries, and settled rows are never pinged.
 *
 * Runs in CI's integration job and only against a database on this machine:
 * it writes rows, and the regen-civics .env points at production.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq, inArray } from "drizzle-orm";
import { getDb } from "./db";
import { fundingDeadlinePings, fundingPipeline } from "../drizzle/schema";
import { runFundingDeadlines } from "./funding/deadlines";

const url = process.env.DATABASE_URL ?? "";
const LOCAL = /@(127\.0\.0\.1|localhost)(:\d+)?\//.test(url);
const RUN = Date.now().toString(36);
const DAY = 86_400_000;

type Db = NonNullable<Awaited<ReturnType<typeof getDb>>>;

describe.skipIf(!LOCAL)("funding deadline pings (integration)", () => {
  let db: Db;
  const ids: number[] = [];
  // Pinned clock, so the rows' windows are exact whatever else is in the table.
  const now = new Date(Math.floor(Date.now() / 1000) * 1000);

  beforeAll(async () => {
    const got = await getDb();
    if (!got) throw new Error("no database");
    db = got;
    const rows = [
      { name: `Ping soon ${RUN}`, cycle: "B1", deadlineAt: new Date(now.getTime() + 1.5 * DAY), appStatus: "preparing" as const },
      { name: `Ping week ${RUN}`, cycle: "W1", deadlineAt: new Date(now.getTime() + 6 * DAY), appStatus: "not_started" as const },
      { name: `Ping far ${RUN}`, cycle: null, deadlineAt: new Date(now.getTime() + 40 * DAY), appStatus: "preparing" as const },
      { name: `Ping done ${RUN}`, cycle: null, deadlineAt: new Date(now.getTime() + 1 * DAY), appStatus: "submitted" as const },
    ];
    for (const r of rows) {
      const [created] = await db.insert(fundingPipeline).values({ ...r, category: "Accelerator (tech wedge)" }).$returningId();
      ids.push(created.id);
    }
  });

  afterAll(async () => {
    if (db && ids.length) await db.delete(fundingPipeline).where(inArray(fundingPipeline.id, ids));
  });

  const mine = (text: string) => text.split("\n").filter((l) => l.includes(RUN));

  it("releases its claims when the send fails, so nothing is recorded", async () => {
    const summary = await runFundingDeadlines({ now: () => now, send: async () => false });
    expect(summary).toContain("Not sent");
    const pings = await db.select().from(fundingDeadlinePings).where(inArray(fundingDeadlinePings.pipelineId, ids));
    expect(pings).toEqual([]);
  });

  it("sends each due ping once, in one message, and never the settled or distant rows", async () => {
    const sent: string[] = [];
    await runFundingDeadlines({ now: () => now, send: async (t) => (sent.push(t), true) });
    const lines = mine(sent.join("\n"));
    expect(lines).toHaveLength(2);
    expect(lines[0]).toMatch(new RegExp(`^2 days: Ping soon ${RUN} B1, due `));
    expect(lines[1]).toMatch(new RegExp(`^6 days: Ping week ${RUN} W1, due `));
    const pings = await db.select().from(fundingDeadlinePings).where(inArray(fundingDeadlinePings.pipelineId, ids));
    expect(pings.map((p) => p.threshold).sort((a, b) => a - b)).toEqual([2, 7]);
  });

  it("sends nothing new on the next tick", async () => {
    const sent: string[] = [];
    await runFundingDeadlines({ now: () => new Date(now.getTime() + 3_600_000), send: async (t) => (sent.push(t), true) });
    expect(mine(sent.join("\n"))).toEqual([]);
  });

  it("pings again when a deadline moves", async () => {
    await db
      .update(fundingPipeline)
      .set({ deadlineAt: new Date(now.getTime() + 5 * DAY) })
      .where(eq(fundingPipeline.id, ids[1]));
    const sent: string[] = [];
    await runFundingDeadlines({ now: () => now, send: async (t) => (sent.push(t), true) });
    expect(mine(sent.join("\n"))).toEqual([expect.stringMatching(new RegExp(`^5 days: Ping week ${RUN} W1, due `))]);
  });
});
