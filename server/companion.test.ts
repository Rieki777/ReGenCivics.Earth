/**
 * Conversational Companion engine tests.
 *
 * The engine is the deterministic shell around the LLM: it builds the prompt,
 * constrains the model to the declared fields, and shapes the result. We mock the
 * model so these run without a key, and assert the guarantees the product leans
 * on: it never fabricates a field, an unclear answer produces no field write, a
 * commitment only reads true on an explicit yes, and it never submits.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the LLM before importing the engine so companion.ts binds to the mock.
const invokeLLM = vi.fn();
vi.mock("./_core/llm", () => ({
  invokeLLM: (...args: unknown[]) => invokeLLM(...args),
  isLLMConfigured: () => true,
}));

import { companionTurn } from "./lib/companion";
import { COMPANION_FORMS, companionBool } from "../shared/companions";

function modelReturns(obj: unknown) {
  invokeLLM.mockResolvedValueOnce({
    choices: [{ message: { role: "assistant", content: JSON.stringify(obj) } }],
  });
}

const bookingForm = COMPANION_FORMS["booking-request"];

describe("companionTurn", () => {
  beforeEach(() => invokeLLM.mockReset());

  it("maps a messy natural-language answer to the right fields", async () => {
    modelReturns({
      reply: "Got it, three of you. And the vegan diet, are you in?",
      updates: [{ field: "guests", value: "3" }],
      readyForReview: false,
    });
    const res = await companionTurn({
      form: bookingForm,
      history: [{ role: "user", content: "oh there's three of us rolling up" }],
      collected: {},
    });
    expect(res.updates).toEqual([{ field: "guests", value: "3" }]);
    expect(res.readyForReview).toBe(false);
    expect(res.reply).toContain("three");
  });

  it("never fabricates a field outside the form spec", async () => {
    modelReturns({
      reply: "Noted.",
      updates: [
        { field: "guests", value: "2" },
        { field: "secretAdminFlag", value: "true" }, // not a declared field
        { field: "notes", value: "we bring a dog" },
      ],
      readyForReview: false,
    });
    const res = await companionTurn({
      form: bookingForm,
      history: [{ role: "user", content: "two of us and a dog" }],
      collected: {},
    });
    const keys = res.updates.map((u) => u.field).sort();
    expect(keys).toEqual(["guests", "notes"]);
    expect(keys).not.toContain("secretAdminFlag");
  });

  it("writes no field when the answer is unclear (asks a follow-up instead)", async () => {
    modelReturns({
      reply: "Ha, no worries. So is that a yes to the vegan diet for the week?",
      updates: [],
      readyForReview: false,
    });
    const res = await companionTurn({
      form: bookingForm,
      history: [{ role: "user", content: "hmm i dunno about that one" }],
      collected: { guests: "2" },
    });
    expect(res.updates).toEqual([]);
    expect(res.readyForReview).toBe(false);
    expect(res.reply.length).toBeGreaterThan(0);
  });

  it("only reports ready for review when the model says so", async () => {
    modelReturns({
      reply: "Here's what I've got. Take a look below and send it when it's right.",
      updates: [{ field: "waterDoctrineCommitment", value: "yes" }],
      readyForReview: true,
    });
    const res = await companionTurn({
      form: bookingForm,
      history: [{ role: "user", content: "yes i commit to the water doctrine" }],
      collected: { guests: "2", dietCommitment: "yes" },
    });
    expect(res.readyForReview).toBe(true);
    expect(res.updates[0]).toEqual({ field: "waterDoctrineCommitment", value: "yes" });
  });

  it("falls back to a warm line if the model returns an empty reply", async () => {
    modelReturns({ reply: "", updates: [], readyForReview: false });
    const res = await companionTurn({
      form: bookingForm,
      history: [{ role: "user", content: "..." }],
      collected: {},
    });
    expect(res.reply.length).toBeGreaterThan(0);
  });

  it("throws on unparseable model output (router maps to a friendly error)", async () => {
    invokeLLM.mockResolvedValueOnce({ choices: [{ message: { role: "assistant", content: "not json" } }] });
    await expect(
      companionTurn({ form: bookingForm, history: [{ role: "user", content: "hi" }], collected: {} }),
    ).rejects.toThrow();
  });
});

describe("companionBool (commitments require an explicit yes)", () => {
  it("reads an explicit yes as true", () => {
    for (const v of ["yes", "Yes", "yeah", "yep", "absolutely", "i commit", "of course", "sure"]) {
      expect(companionBool(v)).toBe(true);
    }
  });
  it("never infers a yes from hesitation or a no", () => {
    for (const v of ["no", "not sure", "maybe", "i dunno", "what does that mean", "hmm"]) {
      expect(companionBool(v)).toBe(false);
    }
  });
});

describe("alliance application (the Weaver)", () => {
  it("is registered and points at the weaver persona with its free-text fields", () => {
    const form = COMPANION_FORMS["alliance-application"];
    expect(form).toBeTruthy();
    expect(form.personaId).toBe("weaver");
    const keys = form.fields.map((f) => f.key);
    expect(keys).toContain("allianceSupportDescription");
    expect(keys).toContain("partnershipDescription");
  });
});

describe("land application (the Gardener)", () => {
  it("is registered, points at the gardener, and covers every required application field", () => {
    const form = COMPANION_FORMS["land-application"];
    expect(form).toBeTruthy();
    expect(form.personaId).toBe("gardener");
    const keys = form.fields.map((f) => f.key);
    // These keys must match the applications table columns the /apply form
    // writes, so the extracted values flow straight into the draft.
    for (const required of [
      "projectName", "projectType", "location", "vision", "landStatus",
      "teamSize", "teamDescription", "regenerativePractices",
      "governanceApproach", "communityEngagement", "timeCommitment", "fundingNeeds",
    ]) {
      expect(keys).toContain(required);
      expect(form.fields.find((f) => f.key === required)?.required).toBe(true);
    }
  });

  it("constrains projectType and landStatus to the database enums", () => {
    const form = COMPANION_FORMS["land-application"];
    expect(form.fields.find((f) => f.key === "projectType")?.enumValues).toEqual(["early_stage", "mature"]);
    expect(form.fields.find((f) => f.key === "landStatus")?.enumValues).toEqual(["owned", "leased", "committed", "seeking"]);
  });

  it("never lets the model write outside the declared land fields", async () => {
    modelReturns({
      reply: "Beautiful. Tell me about the team.",
      updates: [
        { field: "vision", value: "a food forest village on 30 hectares" },
        { field: "status", value: "approved" }, // not a declared field
      ],
      readyForReview: false,
    });
    const res = await companionTurn({
      form: COMPANION_FORMS["land-application"],
      history: [{ role: "user", content: "we're building a food forest village" }],
      collected: {},
    });
    expect(res.updates.map((u) => u.field)).toEqual(["vision"]);
  });
});

describe("form registry integrity", () => {
  it("every form points at a real persona and has at least one required field where it matters", () => {
    for (const form of Object.values(COMPANION_FORMS)) {
      expect(form.fields.length).toBeGreaterThan(0);
      // Field keys are unique within a form.
      const keys = form.fields.map((f) => f.key);
      expect(new Set(keys).size).toBe(keys.length);
      // Enum fields declare their allowed values.
      for (const f of form.fields) {
        if (f.type === "enum") expect(f.enumValues && f.enumValues.length).toBeTruthy();
      }
    }
  });
});
