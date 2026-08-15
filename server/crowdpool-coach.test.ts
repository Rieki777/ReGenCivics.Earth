/**
 * Tests for the Design Companion (server/lib/crowdpool-coach.ts).
 *
 * Two layers, both without a live LLM:
 *  1. sanitizeSuggestion: the output-validation gate. The model output is
 *     untrusted, so invalid capitals/kinds are dropped, values are clamped, and
 *     a role with hours + weeks but no value is backfilled from valuationForRole.
 *  2. designCompanionTurn's deterministic fallback: when the LLM is unconfigured
 *     the turn still returns real coverage, gaps, and role-valued suggestions.
 *     Gated with it.skipIf so a dev with an API key set does not fire a live call.
 */

import { describe, expect, it } from "vitest";
import { designCompanionTurn, sanitizeSuggestion, deEmDash } from "./lib/crowdpool-coach";
import { isLLMConfigured } from "./_core/llm";
import { CAPITAL_TYPES } from "../shared/capitals";
import { NEED_KINDS } from "../shared/crowdpoolingTaxonomy";

describe("Design Companion", () => {
  describe("sanitizeSuggestion (output validation)", () => {
    it("drops a suggestion whose capitalType is not one of the nine", () => {
      const out = sanitizeSuggestion({
        title: "Made-up need",
        capitalType: "not-a-capital",
        kind: "role",
        estimatedValue: 1000,
        rationale: "should be dropped",
      });
      expect(out).toBeNull();
    });

    it("drops a suggestion whose kind is not a NeedKind", () => {
      const out = sanitizeSuggestion({
        title: "Made-up need",
        capitalType: "social",
        kind: "banana",
        estimatedValue: 1000,
        rationale: "should be dropped",
      });
      expect(out).toBeNull();
    });

    it("drops a suggestion with no title after sanitizing", () => {
      const out = sanitizeSuggestion({
        title: "<script>alert(1)</script>",
        capitalType: "social",
        kind: "role",
        estimatedValue: 1000,
        rationale: "no title survives",
      });
      expect(out).toBeNull();
    });

    it("backfills a role value from hours and weeks when the value is zero", () => {
      // social role, skilled tier, no region -> default $25/hr. 10 * 12 * 25 = 3000.
      const out = sanitizeSuggestion({
        title: "Community Organizer",
        capitalType: "social",
        kind: "role",
        hoursPerWeek: 10,
        weeks: 12,
        estimatedValue: 0,
        rationale: "value was missing",
      });
      expect(out).not.toBeNull();
      expect(out!.estimatedValue).toBe(3000);
      expect(out!.hoursPerWeek).toBe(10);
      expect(out!.weeks).toBe(12);
    });

    it("does not backfill when the value is already set", () => {
      const out = sanitizeSuggestion({
        title: "Community Organizer",
        capitalType: "social",
        kind: "role",
        hoursPerWeek: 10,
        weeks: 12,
        estimatedValue: 5000,
        rationale: "keep the given value",
      });
      expect(out!.estimatedValue).toBe(5000);
    });

    it("clamps a negative value to zero and keeps it when there is nothing to backfill from", () => {
      const out = sanitizeSuggestion({
        title: "Loaned tractor",
        capitalType: "material",
        kind: "item",
        estimatedValue: -500,
        rationale: "no hours to value from",
      });
      expect(out!.estimatedValue).toBe(0);
    });

    it("strips HTML from title and rationale and keeps a valid suggestion", () => {
      const out = sanitizeSuggestion({
        title: "Farm Steward<script>alert(1)</script>",
        capitalType: "living",
        kind: "role",
        estimatedValue: 20000,
        rationale: "<b>Tends the land</b>",
      });
      expect(out).not.toBeNull();
      expect(out!.title).toContain("Farm Steward");
      expect(out!.title).not.toContain("<script");
      expect(out!.rationale).not.toContain("<b>");
      expect(out!.capitalType).toBe("living");
      expect(out!.kind).toBe("role");
    });

    it("returns null for non-object input", () => {
      expect(sanitizeSuggestion(null)).toBeNull();
      expect(sanitizeSuggestion("nope")).toBeNull();
      expect(sanitizeSuggestion(42)).toBeNull();
    });
  });

  describe("designCompanionTurn deterministic fallback (LLM off)", () => {
    it.skipIf(isLLMConfigured())("grounds coverage in the draft and ignores invalid capitals", async () => {
      const result = await designCompanionTurn({
        history: [],
        message: "",
        draft: {
          projectName: "Cedar Hollow",
          region: "North America",
          needs: [
            { title: "Land parcel", capitalType: "living", estimatedValue: 150000 },
            { title: "Permaculture design", capitalType: "intellectual", estimatedValue: 5000 },
            { title: "junk row", capitalType: "not-a-capital" },
          ],
        },
      });

      // The junk capital is ignored; only the two valid needs count.
      expect(result.coverage.totalNeeds).toBe(2);
      expect(result.coverage.coveredCount).toBe(2);
      const living = result.coverage.entries.find((e) => e.capital === "living");
      expect(living?.covered).toBe(true);
    });

    it.skipIf(isLLMConfigured())("returns valued role suggestions from the top gap", async () => {
      const result = await designCompanionTurn({
        history: [],
        message: "where should I start?",
        draft: {
          projectName: "Cedar Hollow",
          region: "North America",
          needs: [{ title: "Land parcel", capitalType: "living", estimatedValue: 150000 }],
        },
      });

      expect(typeof result.reply).toBe("string");
      expect(result.reply.length).toBeGreaterThan(0);
      expect(result.gaps.length).toBeGreaterThan(0);
      expect(result.suggestions.length).toBeGreaterThan(0);
      expect(result.coverageNote).toBeTruthy();

      for (const s of result.suggestions) {
        expect(CAPITAL_TYPES).toContain(s.capitalType);
        expect(NEED_KINDS).toContain(s.kind);
        expect(s.estimatedValue).toBeGreaterThanOrEqual(0);
        // Fallback suggestions are role templates, valued from hours and weeks.
        expect(s.kind).toBe("role");
        expect(s.estimatedValue).toBeGreaterThan(0);
      }
    });

    it.skipIf(isLLMConfigured())("handles an empty draft without throwing", async () => {
      const result = await designCompanionTurn({
        history: [],
        message: "",
        draft: { needs: [] },
      });
      expect(result.coverage.coveredCount).toBe(0);
      // All nine capitals are missing, so there are gaps to recommend.
      expect(result.gaps.length).toBeGreaterThan(0);
      expect(result.suggestions.length).toBeGreaterThan(0);
    });
  });

  describe("deEmDash (writing-rule backstop)", () => {
    it("replaces em-dashes with a comma, keeping hyphens and ranges", () => {
      // The live coach was observed emitting these em-dashes.
      expect(deEmDash("What a gift—a 400-year-old valley coming back to life")).toBe(
        "What a gift, a 400-year-old valley coming back to life",
      );
      expect(deEmDash("up at night right now—what's blocking you?")).toBe(
        "up at night right now, what's blocking you?",
      );
      // Real hyphens and en-dash ranges are untouched.
      expect(deEmDash("a 12-week, 2024–2025 role")).toBe("a 12-week, 2024–2025 role");
      expect(deEmDash("no dashes here")).toBe("no dashes here");
    });

    it("strips em-dashes from sanitized suggestion text", () => {
      const s = sanitizeSuggestion({
        title: "Dance Coordinator—weekly circle",
        capitalType: "cultural",
        kind: "role",
        rationale: "Your community gathers already—this holds the rhythm.",
        estimatedValue: 1200,
      });
      expect(s).not.toBeNull();
      expect(s!.title).not.toContain("—");
      expect(s!.rationale).not.toContain("—");
      expect(s!.title).toBe("Dance Coordinator, weekly circle");
    });
  });
});
