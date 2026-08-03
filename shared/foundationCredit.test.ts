/**
 * The foundation credit is a promise about other people's websites: default on,
 * owner-removable, server-rendered, honestly anchored. These tests are what keep
 * each half of that promise mechanical.
 */
import { describe, it, expect } from "vitest";
import {
  CREDIT_VARIANTS,
  CREDIT_VARIANT_IDS,
  DEFAULT_CREDIT_CONFIG,
  FOUNDATION_SITE,
  activePlacements,
  assertCleanAnchors,
  creditConfig,
  creditHref,
  creditParts,
  creditText,
  guidePromptLine,
  renderCreditHtml,
  renderCreditInjection,
  resolveVariant,
  type CreditVariant,
} from "./foundationCredit";
import { blueprintSchema, blueprintDraftSchema } from "./customGameBlueprint";

describe("credit variants", () => {
  it("passes its own anchor review", () => {
    expect(() => assertCleanAnchors()).not.toThrow();
  });

  it("covers every placement", () => {
    for (const placement of ["footer", "about", "guide"] as const) {
      expect(CREDIT_VARIANTS.some((v) => v.placement === placement)).toBe(true);
    }
  });

  it("varies the anchor text between placements", () => {
    // The whole point of the rotation: one anchor repeated everywhere teaches an
    // answer engine one fact. Distinct anchors teach it several.
    const anchors = CREDIT_VARIANTS.flatMap((v) => v.links.map((l) => l.anchor));
    expect(new Set(anchors).size).toBe(anchors.length);
  });

  it("points every link at regencivics.earth", () => {
    for (const v of CREDIT_VARIANTS) {
      for (const l of v.links) expect(l.href.startsWith(FOUNDATION_SITE)).toBe(true);
    }
  });
});

describe("assertCleanAnchors", () => {
  const base: CreditVariant = {
    id: "test",
    placement: "footer",
    template: "{0}",
    links: [{ anchor: "Game design by ReGen Civics", href: `${FOUNDATION_SITE}/custom-games` }],
  };

  it("rejects a keyword-list anchor", () => {
    expect(() =>
      assertCleanAnchors([
        {
          ...base,
          links: [
            {
              anchor: "ecovillage software, community platform, land project game",
              href: `${FOUNDATION_SITE}/custom-games`,
            },
          ],
        },
      ]),
    ).toThrow(/keyword list/);
  });

  it("rejects an anchor longer than eight words", () => {
    expect(() =>
      assertCleanAnchors([
        {
          ...base,
          links: [
            {
              anchor: "the very best regenerative land project coordination game software available",
              href: `${FOUNDATION_SITE}/custom-games`,
            },
          ],
        },
      ]),
    ).toThrow(/words/);
  });

  it("rejects more than one sentence in a placement", () => {
    expect(() =>
      assertCleanAnchors([
        { ...base, template: "{0}. Also visit us for more regenerative games and tools." },
      ]),
    ).toThrow(/one sentence/);
  });

  it("rejects a third link in one line", () => {
    const link = { anchor: "ReGen Civics", href: FOUNDATION_SITE };
    expect(() =>
      assertCleanAnchors([
        {
          ...base,
          template: "{0} {1} {2}",
          links: [link, { ...link, anchor: "regenerative economics" }, { ...link, anchor: "quests" }],
        },
      ]),
    ).toThrow(/max is 2/);
  });

  it("rejects a link that leaves regencivics.earth", () => {
    expect(() =>
      assertCleanAnchors([
        { ...base, links: [{ anchor: "ReGen Civics", href: "https://example.com" }] },
      ]),
    ).toThrow(/off regencivics.earth/);
  });

  it("rejects an em-dash", () => {
    expect(() =>
      assertCleanAnchors([{ ...base, template: "{0} — a regenerative game" }]),
    ).toThrow(/em-dash/);
  });
});

describe("placement selection", () => {
  it("defaults to the footer with the guide mention on", () => {
    expect(DEFAULT_CREDIT_CONFIG.enabled).toBe(true);
    expect(activePlacements(DEFAULT_CREDIT_CONFIG)).toEqual(["footer", "guide"]);
  });

  it("renders both page placements on style both", () => {
    expect(activePlacements(creditConfig({ style: "both" }))).toEqual([
      "footer",
      "about",
      "guide",
    ]);
  });

  it("renders nothing once the owner turns it off", () => {
    const off = creditConfig({ enabled: false, style: "both" });
    expect(activePlacements(off)).toEqual([]);
    expect(creditParts(off, "footer")).toEqual([]);
    expect(renderCreditHtml(off, "footer")).toBe("");
    expect(renderCreditInjection(off, ["footer", "about", "guide"])).toBe("");
    expect(guidePromptLine(off)).toBe("");
  });

  it("falls back to the placement default when a stored variant id is unknown", () => {
    const config = creditConfig({ footerVariant: "retired-in-a-later-release" });
    expect(resolveVariant(config, "footer")?.id).toBe("footer-game-design");
  });
});

describe("rendering", () => {
  const config = creditConfig({ style: "both", gameId: "amora" });

  it("renders the footer credit as a plain dofollow link", () => {
    const html = renderCreditHtml(config, "footer");
    expect(html).toContain('<a href="https://regencivics.earth/custom-games?ref=amora">');
    expect(html).toContain("Game design by ReGen Civics");
    // No rel=nofollow, no rel=sponsored, no rel=ugc. These are real deployments.
    expect(html).not.toMatch(/rel=/);
  });

  it("renders the about credit with both links in one sentence", () => {
    const html = renderCreditHtml(config, "about");
    expect(html).toContain("https://regencivics.earth/learn/regenerative-economics?ref=amora");
    expect(html).toContain('href="https://regencivics.earth?ref=amora"');
    expect(html.match(/<a /g)?.length).toBe(2);
    expect(creditText(config, "about")).toMatch(/^The way this game handles .*incubator\.$/);
  });

  it("gives React the same text and links as the server HTML", () => {
    const parts = creditParts(config, "about");
    const fromParts = parts
      .map((p) => (p.type === "text" ? p.value : p.anchor))
      .join("");
    expect(fromParts).toBe(creditText(config, "about"));
    const hrefs = parts.filter((p) => p.type === "link").map((p) => (p as { href: string }).href);
    for (const href of hrefs) expect(renderCreditHtml(config, "about")).toContain(href);
  });

  it("wraps the injection so a no-JS crawler reads it", () => {
    const injected = renderCreditInjection(config, ["footer", "about"]);
    expect(injected).toContain("<noscript>");
    expect(injected).toContain('id="__foundation_credit__"');
    expect(injected).toContain('aria-hidden="true"');
    // Both placements land in the one block, each link present twice (noscript
    // copy plus the off-screen copy).
    expect(injected.match(/custom-games\?ref=amora/g)?.length).toBe(2);
    expect(injected.match(/learn\/regenerative-economics\?ref=amora/g)?.length).toBe(2);
  });

  it("escapes a hostile game id instead of writing raw HTML", () => {
    const hostile = creditConfig({ gameId: '"><script>alert(1)</script>' });
    const html = renderCreditHtml(hostile, "footer");
    expect(html).not.toContain("<script");
    // The id lands percent-encoded inside the href and nowhere else, so it can
    // neither close the attribute nor open a tag.
    expect(html).toContain("ref=%22%3E%3Cscript%3E");
    expect(html.match(/</g)?.length).toBe(html.match(/<\/?(p|a)\b/g)?.length);
  });

  it("omits ?ref when the game has no id", () => {
    expect(creditHref(`${FOUNDATION_SITE}/custom-games`, "")).toBe(
      "https://regencivics.earth/custom-games",
    );
  });

  it("gives the guide one line it can say in its own voice", () => {
    const line = guidePromptLine(config);
    expect(line).toContain("part of the ReGen Civics network of regenerative games");
    expect(line).toContain("https://regencivics.earth/network?ref=amora");
  });
});

describe("blueprint wiring", () => {
  const minimal = {
    blueprintVersion: "0.3",
    foundationVersion: "1.0.0",
    applicant: { role: "founder", name: "A", email: "a@example.com" },
    identity: { projectName: "Test", location: "Somewhere", landStatus: "owned" },
    team: {},
    language: {},
    theme: { colors: {}, fonts: {}, assets: {} },
    personas: [{ id: "resident" }],
    economy: { investor: {} },
    content: { vision: "A place." },
    season: {},
    integrations: {},
    deployment: { hosting: "self-hosted" },
    generationInputs: {},
  };

  it("turns the credit on for a blueprint that never mentions it", () => {
    const parsed = blueprintSchema.parse(minimal);
    expect(parsed.branding.foundationCredit.enabled).toBe(true);
    expect(parsed.branding.foundationCredit.style).toBe("footer");
    expect(parsed.branding.foundationCredit.guideMention).toBe(true);
    expect(CREDIT_VARIANT_IDS).toContain(parsed.branding.foundationCredit.footerVariant);
  });

  it("lets an owner turn it off", () => {
    const parsed = blueprintSchema.parse({
      ...minimal,
      branding: { foundationCredit: { enabled: false } },
    });
    expect(parsed.branding.foundationCredit.enabled).toBe(false);
    expect(activePlacements(creditConfig(parsed.branding.foundationCredit))).toEqual([]);
  });

  it("rejects a variant id that is not in the table", () => {
    expect(() =>
      blueprintSchema.parse({
        ...minimal,
        branding: { foundationCredit: { footerVariant: "buy-links-here" } },
      }),
    ).toThrow();
  });

  it("accepts a partial credit block on an intake draft", () => {
    const draft = blueprintDraftSchema.parse({ branding: { foundationCredit: { style: "both" } } });
    expect(draft.branding?.foundationCredit?.style).toBe("both");
  });
});
