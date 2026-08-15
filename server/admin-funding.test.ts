import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import { _adminFundingInternals, PRIORITIES, APP_STATUSES } from "./routes/adminFunding";
import {
  buildCoworkPrompt,
  buildFunderContext,
  buildPositioningUserMessage,
  funderSlug,
  COWORK_PROMPT_TEMPLATE,
  POSITIONING_SYSTEM_PROMPT,
  POSITIONING_OUTPUT_SCHEMA,
  stripBannedDashes,
  type FunderRowForPrompt,
} from "./funding/positioning-kernel";

/**
 * Funding pipeline portal + application engine tests.
 *
 * The vitest env has no DATABASE_URL, so this covers the deterministic pieces:
 * the admin gate on every procedure (they reject before any DB call), the input
 * guards, the positioning parser's accept/reject boundary, and the Cowork prompt
 * builder. The DB-backed list/update/generate paths are verified live after the
 * deploy.
 */
const { parsePositioning, asStringArray, AUTO_ADVANCE_FROM } = _adminFundingInternals;

function makeCtx(user: TrpcContext["user"] | null): TrpcContext {
  return {
    user,
    req: {
      protocol: "https",
      method: "POST",
      headers: { origin: "https://regencivics.earth", host: "regencivics.earth" },
      cookies: {},
      socket: { remoteAddress: "127.0.0.1" },
    } as unknown as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  } as TrpcContext;
}

const ADMIN = { id: 1, role: "admin" } as unknown as TrpcContext["user"];
const PLAYER = { id: 2, role: "user" } as unknown as TrpcContext["user"];

const ROW: FunderRowForPrompt = {
  name: "Draper Richards Kaplan Foundation (DRK)",
  category: "Philanthropy",
  capitalType: "Unrestricted grant or investment capital",
  whatItFunds: "Early-stage social entrepreneurs with a systemic model",
  typicalSize: "Up to $300K over 3 years",
  geography: "Global",
  eligibility:
    "501(c)(3), C-corp, B-corp, hybrid, or fiscally sponsored with a spin-out plan. NOT 501(c)(4)s, S-corps, LLCs, LPs, LLPs, or investment funds. Religious programming excluded.",
  accessStatus: "Rolling, online form only",
  deadline: "Rolling",
  fit: "Strong",
  regenEntity: "501(c)(3) or C-corp/PBC, never the Fund",
  link: "https://www.drkfoundation.org/apply/",
  notes: "Roughly 0.7% selectivity. CV mandatory. Initial review 8 to 10 weeks.",
  priority: "P1",
};

// ── Access control ──────────────────────────────────────────────────────────
describe("adminFunding: every procedure is admin-gated", () => {
  it("rejects an anonymous caller on reads", async () => {
    const caller = appRouter.createCaller(makeCtx(null));
    await expect(caller.adminFunding.list({})).rejects.toThrow();
    await expect(caller.adminFunding.stats()).rejects.toThrow();
    await expect(caller.adminFunding.categories()).rejects.toThrow();
    await expect(caller.adminFunding.getApplications({ pipelineId: 1 })).rejects.toThrow();
  });

  it("rejects a signed-in non-admin on reads", async () => {
    const caller = appRouter.createCaller(makeCtx(PLAYER));
    await expect(caller.adminFunding.list({})).rejects.toThrow();
    await expect(caller.adminFunding.stats()).rejects.toThrow();
  });

  it("rejects a signed-in non-admin on writes, including generation", async () => {
    const caller = appRouter.createCaller(makeCtx(PLAYER));
    await expect(caller.adminFunding.update({ id: 1, appStatus: "submitted" })).rejects.toThrow();
    await expect(caller.adminFunding.remove({ id: 1 })).rejects.toThrow();
    await expect(caller.adminFunding.generateApplication({ pipelineId: 1 })).rejects.toThrow();
    await expect(
      caller.adminFunding.create({ name: "X", category: "Y", priority: "P2" })
    ).rejects.toThrow();
  });
});

// ── Input validation ────────────────────────────────────────────────────────
describe("adminFunding: server-side enum + input validation", () => {
  const caller = appRouter.createCaller(makeCtx(ADMIN));

  it("rejects a priority outside the enum", async () => {
    await expect(caller.adminFunding.list({ priority: "P9" as never })).rejects.toThrow();
    await expect(caller.adminFunding.update({ id: 1, priority: "URGENT" as never })).rejects.toThrow();
  });

  it("rejects an app status outside the enum", async () => {
    await expect(caller.adminFunding.list({ appStatus: "won" as never })).rejects.toThrow();
    await expect(caller.adminFunding.update({ id: 1, appStatus: "maybe" as never })).rejects.toThrow();
  });

  it("rejects a next-action date that is not YYYY-MM-DD", async () => {
    await expect(
      caller.adminFunding.update({ id: 1, nextActionDate: "24/08/2026" })
    ).rejects.toThrow();
    await expect(caller.adminFunding.update({ id: 1, nextActionDate: "August 24" })).rejects.toThrow();
  });

  it("rejects a non-positive id", async () => {
    await expect(caller.adminFunding.update({ id: 0 })).rejects.toThrow();
    await expect(caller.adminFunding.remove({ id: -3 })).rejects.toThrow();
    await expect(caller.adminFunding.generateApplication({ pipelineId: 0 })).rejects.toThrow();
  });

  it("rejects a create with no name or no category", async () => {
    await expect(caller.adminFunding.create({ name: "", category: "Philanthropy" })).rejects.toThrow();
    await expect(caller.adminFunding.create({ name: "Some Fund", category: "" })).rejects.toThrow();
  });

  it("keeps the enum lists in sync with the migration", () => {
    expect([...PRIORITIES]).toEqual(["P1", "P2", "P3", "ADV", "ALLY"]);
    expect([...APP_STATUSES]).toEqual([
      "not_started",
      "researching",
      "preparing",
      "cultivating",
      "submitted",
      "in_review",
      "awarded",
      "declined",
      "parked",
    ]);
  });
});

// ── Status advancement ──────────────────────────────────────────────────────
describe("adminFunding: generation only advances an untouched row", () => {
  it("advances from not_started and researching", () => {
    expect(AUTO_ADVANCE_FROM.has("not_started")).toBe(true);
    expect(AUTO_ADVANCE_FROM.has("researching")).toBe(true);
  });

  it("never walks a worked row backwards", () => {
    for (const s of ["preparing", "cultivating", "submitted", "in_review", "awarded", "declined", "parked"]) {
      expect(AUTO_ADVANCE_FROM.has(s)).toBe(false);
    }
  });
});

// ── Positioning parser ──────────────────────────────────────────────────────
const GOOD = {
  positioningSummary: "S".repeat(400),
  keyPoints: ["one", "two", "three", "four", "five"],
  entityToUse: "501(c)(3)",
  flags: ["Deadline is rolling, so no urgency"],
  coworkPrompt: "prompt text",
};

describe("adminFunding: positioning parser accepts only a usable generation", () => {
  it("accepts a complete response", () => {
    const parsed = parsePositioning(JSON.stringify(GOOD));
    expect(parsed?.entityToUse).toBe("501(c)(3)");
    expect(parsed?.keyPoints).toHaveLength(5);
    expect(parsed?.flags).toHaveLength(1);
  });

  it("accepts JSON wrapped in a fenced code block", () => {
    const parsed = parsePositioning("Here you go:\n```json\n" + JSON.stringify(GOOD) + "\n```\n");
    expect(parsed).not.toBeNull();
  });

  it("rejects a summary too short to be real positioning", () => {
    expect(parsePositioning(JSON.stringify({ ...GOOD, positioningSummary: "Apply as the nonprofit." }))).toBeNull();
  });

  it("rejects a response with too few key points", () => {
    expect(parsePositioning(JSON.stringify({ ...GOOD, keyPoints: ["one", "two"] }))).toBeNull();
  });

  it("rejects a missing entity", () => {
    expect(parsePositioning(JSON.stringify({ ...GOOD, entityToUse: "  " }))).toBeNull();
    expect(parsePositioning(JSON.stringify({ ...GOOD, entityToUse: undefined }))).toBeNull();
  });

  it("rejects non-JSON and empty output", () => {
    expect(parsePositioning("The funder looks like a strong fit.")).toBeNull();
    expect(parsePositioning("")).toBeNull();
  });

  it("tolerates an empty flags array, which is a real answer", () => {
    const parsed = parsePositioning(JSON.stringify({ ...GOOD, flags: [] }));
    expect(parsed?.flags).toEqual([]);
  });

  it("drops junk entries out of string arrays and bounds the length", () => {
    expect(asStringArray(["a", "", "  ", 7, null, "b"])).toEqual(["a", "b"]);
    expect(asStringArray("not an array")).toEqual([]);
    expect(asStringArray(Array.from({ length: 50 }, (_, i) => `p${i}`))).toHaveLength(20);
  });
});

// ── The kernel and the Cowork prompt ────────────────────────────────────────
describe("positioning kernel: grounding and the schema", () => {
  it("carries the entity rule that shapes every application", () => {
    expect(POSITIONING_SYSTEM_PROMPT).toContain("NEVER position the Fund vehicle as the applicant");
    expect(POSITIONING_SYSTEM_PROMPT).toContain("Game DAO on Base");
    expect(POSITIONING_SYSTEM_PROMPT).toContain("the first check determines the wrapper");
  });

  it("frames survival as commitment and structure, never a doom percentage", () => {
    expect(POSITIONING_SYSTEM_PROMPT).toContain("Sosis and Bressler");
    expect(POSITIONING_SYSTEM_PROMPT).toContain("median of 25 years versus 5");
    // The doom statistic appears exactly once, inside the instruction banning it.
    expect(POSITIONING_SYSTEM_PROMPT).toContain('Do not write "80% of communities fail"');
    expect(POSITIONING_SYSTEM_PROMPT.match(/80%/g)).toHaveLength(1);
  });

  it("obeys the writing rules it is asking the model to obey", () => {
    expect(POSITIONING_SYSTEM_PROMPT).not.toContain("—");
    expect(COWORK_PROMPT_TEMPLATE).not.toContain("—");
  });

  it("requires every field the router reads", () => {
    expect(POSITIONING_OUTPUT_SCHEMA.schema.required).toEqual([
      "positioningSummary",
      "keyPoints",
      "entityToUse",
      "flags",
      "coworkPrompt",
    ]);
  });
});

// ── Dash scrubbing ──────────────────────────────────────────────────────────
// The model reaches for em-dashes and en-dashes even when told not to. These
// two cases came out of the first live generation (Z Fellows, 2026-07-24).
describe("positioning kernel: banned dashes never survive a generation", () => {
  it("turns a numeric en-dash range into a written range", () => {
    expect(stripBannedDashes("soil-health practices return 7–345% ROI")).toBe(
      "soil-health practices return 7 to 345% ROI"
    );
    expect(stripBannedDashes("$250K–$5M+")).toBe("$250K to $5M+");
    expect(stripBannedDashes("15–25% annual appreciation")).toBe("15 to 25% annual appreciation");
  });

  it("turns a tight em-dash between words into a comma", () => {
    expect(stripBannedDashes("in weeks instead of months—each custom Game costs $20K")).toBe(
      "in weeks instead of months, each custom Game costs $20K"
    );
  });

  it("turns a spaced dash break into a comma", () => {
    expect(stripBannedDashes("weeks — not years")).toBe("weeks, not years");
    expect(stripBannedDashes("weeks – not years")).toBe("weeks, not years");
  });

  it("leaves ordinary hyphens and clean copy alone", () => {
    expect(stripBannedDashes("soil-health, land-backed, 501(c)(3)")).toBe(
      "soil-health, land-backed, 501(c)(3)"
    );
    expect(stripBannedDashes("Apply as the nonprofit.")).toBe("Apply as the nonprofit.");
  });

  it("leaves no banned dash behind, whatever the shape", () => {
    const messy = "a—b – c 1–2 d—e—f";
    const cleaned = stripBannedDashes(messy);
    expect(cleaned).not.toMatch(/[–—]/);
    expect(cleaned).not.toMatch(/,\s*,/);
  });

  it("scrubs the parsed generation, not just the display", () => {
    const parsed = parsePositioning(
      JSON.stringify({
        ...GOOD,
        positioningSummary: "S".repeat(300) + " built in weeks—not years",
        keyPoints: ["7–345% ROI across 22 of 23 cases", "one", "two", "three"],
        entityToUse: "Tech PBC — wrapping the Game DAO",
      })
    );
    expect(parsed?.positioningSummary).toContain("weeks, not years");
    expect(parsed?.keyPoints[0]).toBe("7 to 345% ROI across 22 of 23 cases");
    expect(parsed?.entityToUse).toBe("Tech PBC, wrapping the Game DAO");
    expect(JSON.stringify(parsed)).not.toMatch(/[–—]/);
  });

  it("keeps the built Cowork prompt clean even when the research text has dashes", () => {
    const built = buildCoworkPrompt(
      { ...ROW, typicalSize: "$250K–$5M+" },
      { positioningSummary: "x", keyPoints: [], entityToUse: "501(c)(3)", flags: [] },
      "2026-07-24"
    );
    expect(built).not.toMatch(/[–—]/);
    expect(built).toContain("$250K to $5M+");
  });
});

describe("positioning kernel: Cowork prompt builder", () => {
  const built = buildCoworkPrompt(
    ROW,
    {
      positioningSummary: "Apply as the 501(c)(3) and lead with the coordination work.",
      keyPoints: ["Live platform in production", "40+ alliance organizations"],
      entityToUse: "501(c)(3)",
      flags: ["Investment funds are ineligible, so never the Fund vehicle"],
    },
    "2026-07-24"
  );

  it("leaves no unfilled placeholders", () => {
    expect(built).not.toContain("{{");
    expect(built).not.toContain("}}");
  });

  it("carries the funder record and the positioning", () => {
    expect(built).toContain("Draper Richards Kaplan Foundation (DRK)");
    expect(built).toContain("https://www.drkfoundation.org/apply/");
    expect(built).toContain("Apply through this ReGen entity: 501(c)(3)");
    expect(built).toContain("40+ alliance organizations");
    expect(built).toContain("Investment funds are ineligible");
  });

  it("keeps all five process steps and the never-submit boundary", () => {
    for (const step of ["1.", "2.", "3.", "4.", "5."]) expect(built).toContain(`\n${step} `);
    expect(built).toContain("Do not submit anything yourself");
    expect(built).toContain("APPLICATION_DRK_2026-07-24.md");
  });

  it("names the delivered file with the funder slug and today's date", () => {
    expect(built).toContain("APPLICATION_DRAPER_RICHARDS_KAPLAN_FOUNDATION_DRK_2026-07-24.md");
  });

  it("says something honest when a field is not recorded", () => {
    const sparse = buildCoworkPrompt(
      { name: "Nameless Trust", category: "Philanthropy" },
      { positioningSummary: "x", keyPoints: [], entityToUse: "", flags: [] },
      "2026-07-24"
    );
    expect(sparse).toContain("(not recorded)");
    expect(sparse).toContain("verify eligibility and deadline at source anyway");
    expect(sparse).not.toContain("{{");
  });

  it("falls back to the pipeline's recorded entity when the model gives none", () => {
    const noEntity = buildCoworkPrompt(
      ROW,
      { positioningSummary: "x", keyPoints: [], entityToUse: "", flags: [] },
      "2026-07-24"
    );
    expect(noEntity).toContain("Apply through this ReGen entity: 501(c)(3) or C-corp/PBC, never the Fund");
  });
});

describe("positioning kernel: funder context and slug", () => {
  it("drops empty fields instead of sending blank labels to the model", () => {
    const ctx = buildFunderContext({ name: "Nameless Trust", category: "Philanthropy", notes: "   " });
    expect(ctx).toContain("Name: Nameless Trust");
    expect(ctx).toContain("Category: Philanthropy");
    expect(ctx).not.toContain("Research notes:");
    expect(ctx).not.toContain("Deadline:");
  });

  it("sends the recorded entity so the model can confirm or override it", () => {
    expect(buildFunderContext(ROW)).toContain("ReGen entity recorded in the pipeline: 501(c)(3) or C-corp/PBC, never the Fund");
  });

  it("puts the template and the slug in the user message", () => {
    const msg = buildPositioningUserMessage(ROW, "2026-07-24");
    expect(msg).toContain("Do not submit anything yourself");
    expect(msg).toContain("DRAPER_RICHARDS_KAPLAN_FOUNDATION_DRK");
    expect(msg).toContain("2026-07-24");
  });

  it("makes a filename-safe slug out of any funder name", () => {
    expect(funderSlug("Z Fellows")).toBe("Z_FELLOWS");
    expect(funderSlug("Ceniarth")).toBe("CENIARTH");
    expect(funderSlug("NRCS RCPP (Classic)")).toBe("NRCS_RCPP_CLASSIC");
    expect(funderSlug("Base Builder Grants / Rewards")).toBe("BASE_BUILDER_GRANTS_REWARDS");
    expect(funderSlug("!!!")).toBe("FUNDER");
  });
});
