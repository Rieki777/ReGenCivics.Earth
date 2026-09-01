import { describe, it, expect } from "vitest";
import { isCoreHost, getCorePageContent, CORE_PAGES, CHURCH_JSONLD } from "./_core/core-crawler";

describe("core-crawler: which institution the server thinks it is serving", () => {
  it("recognises the church host, including a port and odd casing", () => {
    expect(isCoreHost("core.regencivics.earth")).toBe(true);
    expect(isCoreHost("core.regencivics.earth:443")).toBe(true);
    expect(isCoreHost("CORE.RegenCivics.Earth")).toBe(true);
  });

  it("does NOT mistake the platform for the church", () => {
    // The whole defect was one host answering as the other.
    expect(isCoreHost("regencivics.earth")).toBe(false);
    expect(isCoreHost("www.regencivics.earth")).toBe(false);
    expect(isCoreHost("gov.regencivics.earth")).toBe(false);
    expect(isCoreHost(undefined)).toBe(false);
    expect(isCoreHost("")).toBe(false);
  });

  it("declares Church, not Organization", () => {
    // Organization is true of every incorporated body on earth and so says
    // nothing. Production served Organization on a church until 2026-08-30.
    expect(CHURCH_JSONLD["@type"]).toBe("Church");
    expect(CHURCH_JSONLD.name).toBe("Church of the Regenerative Earth");
  });

  it("puts the church's full name in the body of every page", () => {
    // "Done" for this defect is a JS-disabled fetch containing the full name.
    // Titles carry it; at least the home page must carry it in prose too.
    for (const [path, page] of Object.entries(CORE_PAGES)) {
      expect(page.title, `${path} title`).toContain("Church of the Regenerative Earth");
      expect(page.bodyHtml.length, `${path} body`).toBeGreaterThan(80);
    }
    expect(CORE_PAGES["/"]!.bodyHtml).toContain("Church of the Regenerative Earth");
  });

  it("never doubles the church's name in a title", () => {
    // Shipped to production once: "Church of the Regenerative Earth | Church of
    // the Regenerative Earth". A title is what a search result shows.
    for (const [path, p] of Object.entries(CORE_PAGES)) {
      const doubled = p.title.split("Church of the Regenerative Earth").length - 1;
      expect(doubled, `${path} title: "${p.title}"`).toBe(1);
    }
  });

  it("returns a page for a real church route and null for anything else", () => {
    const home = getCorePageContent("/");
    expect(home).not.toBeNull();
    expect(home!.jsonld["@type"]).toBe("Church");
    expect(getCorePageContent("/faith")).not.toBeNull();
    // An invented entry for a route that does not exist is worse than none.
    expect(getCorePageContent("/not-a-church-page")).toBeNull();
  });

  it("tolerates a trailing slash and a query string", () => {
    expect(getCorePageContent("/faith/")).not.toBeNull();
    expect(getCorePageContent("/faith?utm_source=x")).not.toBeNull();
  });

  it("every church route is one the hub route table does NOT know", async () => {
    // This is why the 404 happened. matchesAppRoute reads the HUB's table, so
    // six of seven church pages answered 404 while serving correct church
    // content. A soft 404 is worse than a wrong page: search engines drop 404s
    // from the index, which defeated the whole point of rendering the church.
    // The status now consults getCorePageContent as well, and this test pins
    // the premise: these paths are real on the church host and absent from the
    // hub's table, so BOTH checks are required.
    const { matchesAppRoute } = await import("@shared/appRoutes");
    for (const path of Object.keys(CORE_PAGES)) {
      expect(getCorePageContent(path), path + " must be a real church route").not.toBeNull();
      if (path !== "/") {
        expect(matchesAppRoute(path), path + " is not a hub route, which is the trap").toBe(false);
      }
    }
  });

  it("gives the Fund no structured data and no mention", () => {
    // Rye's entity model, 2026-08-30: the Fund has no legal entity, so it gets
    // no schema. An unformed entity has no schema. The church is not the fund
    // and must never carry its claims.
    const blob = JSON.stringify(CHURCH_JSONLD) + Object.values(CORE_PAGES).map(p => p.bodyHtml + p.title).join(" ");
    // This list is an ASSERTION THAT THESE STRINGS ARE ABSENT from church content.
    // The gate is right to notice them and right to demand a reason. The marker has
    // to be the line IMMEDIATELY above; two lines up is not read.
    // fund-claims-allow: asserting absence, not making the claim
    for (const banned of ["ReGen Civics Fund", "accredited", "506(c)", "Reg D", "investor", "LOI"]) {
      expect(blob, `church content must not mention "${banned}"`).not.toContain(banned);
    }
  });
});
