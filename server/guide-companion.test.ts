/**
 * Personal ReGen Guide tests.
 *
 * The Guide is the general companion each member designs. These cover the two
 * guarantees the product leans on: the persona reflects the member's own choices
 * (name + tone), and the "who you're talking to" context describes only the one
 * member it is built for and always refuses cross-user requests. The forum /
 * governance Guide (ADR-23, regenGuide.ts) is a separate system and is not
 * imported or touched here.
 */
import { describe, it, expect } from "vitest";
import { buildGuidePersona, renderGuideContext } from "./lib/guide-companion";
import { GUIDE_TONE_PROMPT } from "../shared/guide";

describe("buildGuidePersona", () => {
  it("renames the Guide and applies the chosen tone", () => {
    const p = buildGuidePersona({ guideName: "Sage", portraitKey: "guide-archetype-1", tone: "playful", voiceEnabled: false });
    expect(p).toContain('"Sage"');
    expect(p).toContain(GUIDE_TONE_PROMPT.playful);
  });

  it("falls back to a neutral, name-free preamble when no Guide is designed", () => {
    const p = buildGuidePersona(null);
    expect(p).not.toContain('"');
    expect(p).toContain(GUIDE_TONE_PROMPT.gentle);
  });

  it("guards an unknown tone back to gentle", () => {
    const p = buildGuidePersona({ guideName: "X", portraitKey: "guide-archetype-1", tone: "spicy" as any, voiceEnabled: false });
    expect(p).toContain(GUIDE_TONE_PROMPT.gentle);
  });
});

describe("renderGuideContext (own data only)", () => {
  const alice = {
    name: "Alice",
    tokens: { regen: 210, rgvoice: 12, rcivics: 3 },
    bookings: [{ startDate: "2026-07-25", endDate: "2026-08-01", status: "confirmed" }],
  };
  const bob = {
    name: "Bob Secret",
    tokens: { regen: 99999, rgvoice: 500, rcivics: 42 },
    bookings: [{ startDate: "2026-09-05", endDate: "2026-09-12", status: "active" }],
  };

  it("includes only the member's own data", () => {
    const ctx = renderGuideContext(alice);
    expect(ctx).toContain("Alice");
    expect(ctx).toContain("210 ReGen");
    expect(ctx).toContain("2026-07-25");
  });

  it("never leaks another member's data into a member's context", () => {
    const ctx = renderGuideContext(alice);
    // Nothing from Bob's record can appear when rendering Alice's context.
    expect(ctx).not.toContain("Bob");
    expect(ctx).not.toContain("99999");
    expect(ctx).not.toContain("2026-09-05");
  });

  it("always tells the model to refuse cross-user requests", () => {
    for (const member of [alice, bob]) {
      const ctx = renderGuideContext(member);
      expect(ctx.toLowerCase()).toContain("only member you can see");
      expect(ctx.toLowerCase()).toContain("never reference or reveal anyone else");
    }
  });

  it("handles a member with no profile or bookings without inventing data", () => {
    const ctx = renderGuideContext({ name: null, tokens: null, bookings: [] });
    expect(ctx).toContain("no voyage requests yet");
    expect(ctx).not.toContain("ReGen,"); // no token line fabricated
  });
});
