/**
 * The crew's door (SHIP_UNIFIED_GAME_PLAN.md, lane U1): /ship links to the
 * ReGen Pirates village only through a clean https origin, the public map is
 * the Sea Chart, and the nav carries the door and the Shipwright.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { cleanCrewDoorUrl, crewDoorLink } from "@shared/shipCrew";
import { matchesAppRoute } from "@shared/appRoutes";
import { shipFeatureFlags } from "./lib/ship-config";

describe("cleanCrewDoorUrl", () => {
  it("keeps the door shut when nothing is set", () => {
    expect(cleanCrewDoorUrl("")).toBeNull();
    expect(cleanCrewDoorUrl("   ")).toBeNull();
    expect(cleanCrewDoorUrl(undefined)).toBeNull();
    expect(cleanCrewDoorUrl(null)).toBeNull();
  });

  it("accepts a bare https origin, with or without a trailing slash", () => {
    expect(cleanCrewDoorUrl("https://pirates.regencivics.earth")).toBe("https://pirates.regencivics.earth");
    expect(cleanCrewDoorUrl(" https://pirates.regencivics.earth/ ")).toBe("https://pirates.regencivics.earth");
  });

  it("refuses anything that is not a clean https origin", () => {
    expect(cleanCrewDoorUrl("http://pirates.regencivics.earth")).toBeNull();
    expect(cleanCrewDoorUrl("javascript:alert(1)")).toBeNull();
    expect(cleanCrewDoorUrl("https://user:pw@pirates.regencivics.earth")).toBeNull();
    expect(cleanCrewDoorUrl("https://pirates.regencivics.earth/join")).toBeNull();
    expect(cleanCrewDoorUrl("https://pirates.regencivics.earth/?ref=x")).toBeNull();
    expect(cleanCrewDoorUrl("https://pirates.regencivics.earth/#top")).toBeNull();
    expect(cleanCrewDoorUrl("pirates.regencivics.earth")).toBeNull();
  });
});

describe("crewDoorLink", () => {
  it("links nowhere while the door is shut", () => {
    expect(crewDoorLink(null, "welcome")).toBeNull();
    expect(crewDoorLink(null, "hail")).toBeNull();
  });

  it("builds the welcome and hail links from the origin", () => {
    expect(crewDoorLink("https://pirates.regencivics.earth", "welcome")).toBe("https://pirates.regencivics.earth/welcome");
    expect(crewDoorLink("https://pirates.regencivics.earth", "hail")).toBe("https://pirates.regencivics.earth/request-membership");
  });
});

describe("the crew's door on /ship", () => {
  const root = join(__dirname, "..");
  const read = (p: string) => readFileSync(join(root, p), "utf8");

  it("feature flags carry a shut door when PIRATES_VILLAGE_URL is unset", () => {
    expect(shipFeatureFlags().crewDoorUrl).toBeNull();
  });

  it("the new pages are real routes", () => {
    expect(matchesAppRoute("/ship/crew")).toBe(true);
    expect(matchesAppRoute("/ship/shipwright")).toBe(true);
  });

  it("the nav carries Join the crew, the Sea Chart and the Shipwright", () => {
    const nav = read("client/src/pages/ship/shipShared.tsx");
    expect(nav).toContain('href: "/ship/crew"');
    expect(nav).toContain('label: "Join the crew"');
    expect(nav).toContain('label: "Sea Chart"');
    expect(nav).toContain('href="/ship/shipwright"');
    expect(nav).not.toContain('label: "Treasure Map"');
  });

  it("no public ship page calls the place map the treasure map", () => {
    // The secret Treasure Map belongs to the crew's village. The Galley's Food
    // Treasure Map PDF and the Inner Compass poster are other things and stay.
    const pages = [
      "client/src/pages/ship/Ship.tsx",
      "client/src/pages/ship/ShipMap.tsx",
      "client/src/pages/ship/FeaturedVoyage.tsx",
      "client/src/pages/ship/ShipFirstMate.tsx",
      "client/src/pages/ship/ShipBook.tsx",
      "client/src/pages/ship/ShipGuide.tsx",
      "client/src/pages/ship/ShipTheme.tsx",
      "client/src/pages/ship/CaptainsBook.tsx",
      "server/lib/ship-emails.ts",
      "server/lib/ship-concierge.ts",
      "server/lib/ship-personas.ts",
    ];
    for (const p of pages) {
      // Ignore code comments; only shipped words count.
      const words = read(p).replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
      expect(words, p).not.toMatch(/treasure map/i);
    }
  });

  it("the crew page makes no token, ownership or planting-place promise", () => {
    const page = read("client/src/pages/ship/ShipCrew.tsx").replace(/\/\*[\s\S]*?\*\//g, "");
    for (const banned of [/without permission/i, /\bshares?\b/i, /\bownership\b/i, /\bco-own/i, /\bowned by\b/i, /\binvest/i, /\bworth\b/i, /\bprofit/i, /national park/i]) {
      expect(page, String(banned)).not.toMatch(banned);
    }
  });

  it("the treasure chest says seed bank, with no numbers or collapse promise yet", () => {
    const ship = read("client/src/pages/ship/Ship.tsx");
    const start = ship.indexOf("{/* The seeds */}");
    const card = ship.slice(start, ship.indexOf("{/* The table", start));
    const crew = read("client/src/pages/ship/ShipCrew.tsx");
    expect(card).toContain("Every ship is a seed bank");
    expect(crew).toContain("The ship's seed bank, kept whole and grown out again.");
    for (const words of [card, crew]) {
      expect(words).not.toMatch(/seed library/i);
      expect(words).not.toMatch(/chest of seeds, saved and shared/i);
      expect(words).not.toMatch(/calorie|systems? (we rely on )?fail/i);
      expect(words).not.toMatch(/[\u2013\u2014]/);
    }
    expect(card).not.toMatch(/\bpeople\b/i);
  });

  it("the Sea Chart names no tokens and no planting, and renters find the crew", () => {
    const map = read("client/src/pages/ship/ShipMap.tsx");
    expect(map).not.toMatch(/every token/i);
    expect(map).not.toMatch(/verified treasure/i);
    expect(map).not.toMatch(/plant seeds/i);
    expect(read("client/src/data/blogPosts.ts")).not.toMatch(/past crews planted/i);
    expect(read("client/src/pages/ship/ShipBook.tsx")).toContain('href="/ship/crew"');
    expect(read("client/src/pages/ship/ShipHomecoming.tsx")).toContain('href="/ship/crew"');
  });
});
