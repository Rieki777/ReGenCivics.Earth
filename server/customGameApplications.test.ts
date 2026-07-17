/**
 * Custom Games intake: blueprint.json v0.3 schema + qualification score.
 * Pure unit coverage, no DB needed: the draft schema is the boundary every
 * /custom-games/apply submission crosses, and the score orders the admin queue.
 */
import { describe, it, expect, vi } from "vitest";

vi.mock("./_core/notification", () => ({
  notifyOwner: vi.fn().mockResolvedValue(true),
}));

import { blueprintSchema, blueprintDraftSchema, BLUEPRINT_VERSION } from "../shared/customGameBlueprint";
import { computeQualificationScore } from "./routes/customGameApplications";

describe("blueprintDraftSchema (intake)", () => {
  it("accepts a partial draft shaped like the intake page builds", () => {
    const res = blueprintDraftSchema.safeParse({
      blueprintVersion: BLUEPRINT_VERSION,
      applicant: { role: "founder", name: "Rio", email: "rio@example.org" },
      identity: { projectName: "Cedar Hollow", location: "Oregon, USA", landStatus: "owned", acreage: 40 },
      language: { guideName: "Bramble", currencyName: "Acorns" },
      personas: [{ id: "resident", label: "Residents", enabled: true }],
      content: { vision: "A village that feeds itself.", problems: ["Biggest pain: decisions drag on"] },
      economy: { rewardInstincts: "recognition first", exchangeTypes: ["cash", "work trade"] },
      deployment: { hosting: "self-hosted", budgetConfirmed: true, referralSource: "a friend" },
      integrations: { llmProvider: "Anthropic" },
      generationInputs: { uploads: ["https://example.org/vision.pdf"] },
    });
    expect(res.success).toBe(true);
  });

  it("accepts an empty draft (gaps are data)", () => {
    expect(blueprintDraftSchema.safeParse({}).success).toBe(true);
  });

  it("rejects unknown keys (strict)", () => {
    expect(blueprintDraftSchema.safeParse({ mystery: true }).success).toBe(false);
  });

  it("refuses credential-shaped provider values", () => {
    const withKey = blueprintDraftSchema.safeParse({
      integrations: { llmProvider: "sk-ant-abc123def456" },
    });
    expect(withKey.success).toBe(false);
    const longToken = blueprintDraftSchema.safeParse({
      integrations: { emailProvider: "re_AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" },
    });
    expect(longToken.success).toBe(false);
  });
});

describe("blueprintSchema (generation gate)", () => {
  it("accepts a complete blueprint and fills defaults", () => {
    const res = blueprintSchema.safeParse({
      blueprintVersion: BLUEPRINT_VERSION,
      foundationVersion: "1.0.0",
      applicant: { role: "founder", name: "Rio", email: "rio@example.org" },
      identity: { projectName: "Cedar Hollow", location: "Oregon, USA", landStatus: "owned" },
      team: {},
      language: {},
      theme: { colors: {}, fonts: {}, assets: {} },
      personas: [{ id: "resident" }],
      economy: { investor: {} },
      content: { vision: "A village that feeds itself." },
      season: {},
      integrations: {},
      deployment: { hosting: "regen-full-service" },
      generationInputs: {},
    });
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data.quests).toEqual([]);
      expect(res.data.personas[0].enabled).toBe(true);
    }
  });

  it("rejects a blueprint missing its vision", () => {
    const res = blueprintSchema.safeParse({
      blueprintVersion: BLUEPRINT_VERSION,
      foundationVersion: "1.0.0",
      applicant: { role: "founder", name: "Rio", email: "rio@example.org" },
      identity: { projectName: "Cedar Hollow", location: "Oregon, USA", landStatus: "owned" },
      team: {},
      language: {},
      theme: { colors: {}, fonts: {}, assets: {} },
      personas: [{ id: "resident" }],
      economy: { investor: {} },
      content: {},
      season: {},
      integrations: {},
      deployment: { hosting: "self-hosted" },
      generationInputs: {},
    });
    expect(res.success).toBe(false);
  });
});

describe("computeQualificationScore", () => {
  it("scores a strong application at 100", () => {
    const score = computeQualificationScore(
      {
        identity: { landStatus: "owned" },
        team: { hoursPerWeek: 12 },
        deployment: { timelineEstimate: "this year, ideally by summer" },
      },
      true,
    );
    expect(score).toBe(100);
  });

  it("scores an empty draft with no budget at 0", () => {
    expect(computeQualificationScore({}, false)).toBe(0);
  });

  it("weights land, budget, hours, and timeline independently", () => {
    expect(computeQualificationScore({ identity: { landStatus: "leased" } }, false)).toBe(25);
    expect(computeQualificationScore({}, true)).toBe(30);
    expect(computeQualificationScore({ team: { hoursPerWeek: 5 } }, false)).toBe(12);
    expect(computeQualificationScore({ deployment: { timelineEstimate: "someday" } }, false)).toBe(10);
    expect(
      computeQualificationScore(
        { identity: { landStatus: "seeking" }, team: { hoursPerWeek: 1 }, deployment: { timelineEstimate: "asap" } },
        false,
      ),
    ).toBe(30);
  });
});
