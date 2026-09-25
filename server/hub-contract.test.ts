// The contract version and its documented history must not drift apart. The
// number is what a village keys its wording on; the table is what a person
// reads to learn what the number means. If someone bumps one without the other,
// this is the test that notices.
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { HUB_CONTRACT } from "../shared/hubContract";
import { metaRouter } from "./routes/meta";

const doc = readFileSync("docs/CROWDPOOL_HUB_CONTRACT.md", "utf8");

describe("hub contract version", () => {
  it("is a map of positive integers", () => {
    for (const [surface, version] of Object.entries(HUB_CONTRACT)) {
      expect(Number.isInteger(version), `${surface} must be an integer`).toBe(true);
      expect(version, `${surface} must be at least 1`).toBeGreaterThanOrEqual(1);
    }
  });

  it("has every current crowdpool version explained in the contract doc", () => {
    // The history table in section 6 has one row per version, `| 2 | ...`.
    for (let v = 1; v <= HUB_CONTRACT.crowdpool; v++) {
      expect(doc, `docs/CROWDPOOL_HUB_CONTRACT.md must carry a row for crowdpool version ${v}`)
        .toMatch(new RegExp(`^\\| ${v} \\|`, "m"));
    }
    // And no row promises a version the code does not serve yet.
    expect(doc).not.toMatch(new RegExp(`^\\| ${HUB_CONTRACT.crowdpool + 1} \\|`, "m"));
  });

  it("documents the need's capacityUnit field (version 3)", () => {
    expect(HUB_CONTRACT.crowdpool).toBeGreaterThanOrEqual(3);
    expect(doc).toMatch(/capacityUnit/);
    expect(doc).toMatch(/^\| 3 \|.*hours_per_week/m);
  });

  it("documents give or lend, the need window and verified routes (version 4)", () => {
    expect(HUB_CONTRACT.crowdpool).toBeGreaterThanOrEqual(4);
    expect(doc).toMatch(/^\| 4 \|.*acceptsLoan/m);
    for (const field of ["neededFrom", "neededUntil", "acceptsGift", "acceptsLoan", "workMode"]) {
      expect(doc, `the stable need fields must list ${field}`).toContain(field);
    }
    expect(doc).toMatch(/New needs never use kind `loan`/);
  });

  it("serves the constant, with or without an input object", async () => {
    const caller = metaRouter.createCaller({} as never);
    expect(await caller.contract()).toEqual(HUB_CONTRACT);
    expect(await caller.contract({})).toEqual(HUB_CONTRACT);
  });
});

describe("capacityUnit rides out on the village reads", () => {
  const skipIfNoDb = !process.env.DATABASE_URL;
  // The first test pays for importing the whole router (appRouter via the
  // fixtures), which can pass 5 seconds when other suites load in parallel.
  const DB_TEST_TIMEOUT = 30_000;

  it.skipIf(skipIfNoDb)("getItems and getById carry capacityUnit on a role need", async () => {
    const { adminCaller, anonCaller, cleanupFixtureApplications } = await import("./test-fixtures/crowdpool");
    const { getDb } = await import("./db");
    const { campaigns, campaignItems } = await import("../drizzle/schema");
    const { eq } = await import("drizzle-orm");
    const admin = adminCaller();
    const { id } = await admin.campaigns.create({
      title: "Test Contract Role",
      description: "Contract fixture",
      projectName: "Test Contract Role",
      financialTarget: 0,
      items: [{ category: "role", kind: "role", roleTitle: "Grower", hoursPerWeek: 40, estimatedValue: 8000 }],
    });
    try {
      await admin.campaigns.updateStatus({ id, status: "active" });
      const items = await anonCaller().campaigns.getItems({ campaignId: id });
      expect(items[0]).toMatchObject({ kind: "role", capacityUnit: "hours_per_week", quantityWanted: 40 });
      const view = await anonCaller().campaigns.getById({ id });
      expect(view!.items[0].capacityUnit).toBe("hours_per_week");
    } finally {
      const database = await getDb();
      await database!.delete(campaignItems).where(eq(campaignItems.campaignId, id));
      await database!.delete(campaigns).where(eq(campaigns.id, id));
      await cleanupFixtureApplications();
    }
  }, DB_TEST_TIMEOUT);

  it.skipIf(skipIfNoDb)("getItems carries the five version 4 fields on a thing need", async () => {
    const { adminCaller, anonCaller, cleanupFixtureApplications } = await import("./test-fixtures/crowdpool");
    const { getDb } = await import("./db");
    const { campaigns, campaignItems } = await import("../drizzle/schema");
    const { eq } = await import("drizzle-orm");
    const admin = adminCaller();
    const { id } = await admin.campaigns.create({
      title: "Test Contract Thing",
      description: "Contract fixture",
      projectName: "Test Contract Thing",
      financialTarget: 0,
      items: [{ category: "equipment", kind: "item", equipmentName: "Test trailer", estimatedValue: 3000 }],
    });
    try {
      await admin.campaigns.updateStatus({ id, status: "active" });
      const [need] = await anonCaller().campaigns.getItems({ campaignId: id });
      expect(need).toMatchObject({
        kind: "item",
        neededFrom: null,
        neededUntil: null,
        acceptsGift: 1,
        acceptsLoan: 0,
        workMode: null,
      });
      // Dates come back as YYYY-MM-DD strings, never shifted by a timezone.
      const database = await getDb();
      await database!.update(campaignItems)
        .set({ neededFrom: "2027-03-01", neededUntil: "2027-06-30", acceptsLoan: 1 })
        .where(eq(campaignItems.id, need.id));
      const [again] = await anonCaller().campaigns.getItems({ campaignId: id });
      expect(again).toMatchObject({ neededFrom: "2027-03-01", neededUntil: "2027-06-30", acceptsLoan: 1 });
      const view = await anonCaller().campaigns.getById({ id });
      expect(view!.items[0]).toMatchObject({ neededFrom: "2027-03-01", acceptsLoan: 1 });
    } finally {
      const database = await getDb();
      await database!.delete(campaignItems).where(eq(campaignItems.campaignId, id));
      await database!.delete(campaigns).where(eq(campaigns.id, id));
      await cleanupFixtureApplications();
    }
  }, DB_TEST_TIMEOUT);
});
