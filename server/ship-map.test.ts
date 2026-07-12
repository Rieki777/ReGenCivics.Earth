import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import { inBbox, inCascadiaPolygon, importSlug, classifyCommercial, commercialAccessNote, classifyIoverlander } from "../scripts/ship-import-lib";
import { isLocationVisible, isCrewOnlySource } from "@shared/shipVisibility";
import { voyageToGpx, voyageToGoogleMapsUrl, type VoyagePin } from "../client/src/pages/ship/shipVoyage";
import {
  ANCHORAGE, VOYAGE_RADIUS_MILES, haversineMiles, withinVoyageRange, rangeRing,
} from "../client/src/pages/ship/shipMapConfig";

/**
 * Ship treasure-map v2 tests. No DATABASE_URL in the vitest env, so we cover the
 * pure importer helpers (bbox + bioregion clipping, idempotent slugs), the
 * client voyage/GPX export, and the tRPC input guards for the add-to-map flow
 * and field verification (all reject before any DB call).
 */
function makeCtx(user: TrpcContext["user"] | null): TrpcContext {
  return {
    user,
    req: { protocol: "https", headers: {}, cookies: {}, socket: { remoteAddress: "127.0.0.1" } } as unknown as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  } as TrpcContext;
}
function user(id = 7): NonNullable<TrpcContext["user"]> {
  return {
    id, openId: `open-${id}`, email: `u${id}@example.com`, name: `User ${id}`,
    loginMethod: "google", role: "user", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date(),
  } as NonNullable<TrpcContext["user"]>;
}

describe("ship-map importer: bbox + bioregion clipping", () => {
  it("keeps points inside the US-Cascadia bbox and drops those outside", () => {
    expect(inBbox(-122.71, 42.19)).toBe(true); // Ashland
    expect(inBbox(-122.68, 45.52)).toBe(true); // Portland
    expect(inBbox(-98.5, 39.0)).toBe(false); // Kansas
    expect(inBbox(-122.42, 37.77)).toBe(false); // San Francisco (south of bbox)
  });

  it("clips Great Basin points that are in the bbox but outside the bioregion", () => {
    expect(inCascadiaPolygon(-122.71, 42.19)).toBe(true); // Ashland
    expect(inCascadiaPolygon(-122.68, 45.52)).toBe(true); // Portland
    expect(inCascadiaPolygon(-122.33, 47.61)).toBe(true); // Seattle
    expect(inCascadiaPolygon(-111.89, 40.76)).toBe(false); // Salt Lake City (Great Basin)
    expect(inCascadiaPolygon(-115.14, 36.17)).toBe(false); // Las Vegas
  });
});

describe("ship-map: voyage range (the game board, ADR-36)", () => {
  it("measures great-circle distance sanely (Portland to Seattle ~145 mi)", () => {
    const d = haversineMiles(45.5152, -122.6784, 47.6062, -122.3321);
    expect(d).toBeGreaterThan(135);
    expect(d).toBeLessThan(155);
  });

  it("keeps the near board in range and pushes the far world into fog", () => {
    // The range is a gentle 3-day sail at 125 road-mi/day (~288 mi horizon).
    expect(withinVoyageRange(ANCHORAGE[0], ANCHORAGE[1])).toBe(true); // the anchorage itself
    expect(withinVoyageRange(45.5152, -122.6784)).toBe(true); // Portland — a day and change north
    expect(withinVoyageRange(47.6062, -122.3321)).toBe(false); // Seattle — beyond the tighter horizon
    expect(withinVoyageRange(43.6187, -116.2146)).toBe(false); // Boise — beyond the tighter horizon
    expect(withinVoyageRange(51.0447, -114.0719)).toBe(false); // Calgary
    expect(withinVoyageRange(39.7392, -104.9903)).toBe(false); // Denver
  });

  it("draws the horizon as a closed ring of points at the range radius", () => {
    const ring = rangeRing(ANCHORAGE, VOYAGE_RADIUS_MILES, 90);
    expect(ring.length).toBe(91); // closed: first point repeated
    expect(ring[0][0]).toBeCloseTo(ring[ring.length - 1][0], 6);
    expect(ring[0][1]).toBeCloseTo(ring[ring.length - 1][1], 6);
    for (const [lat, lng] of ring) {
      const d = haversineMiles(ANCHORAGE[0], ANCHORAGE[1], lat, lng);
      expect(Math.abs(d - VOYAGE_RADIUS_MILES)).toBeLessThan(1);
    }
  });
});

describe("ship-map importer: commercial boondocks", () => {
  it("classifies rest areas, Walmarts, and Home Depots", () => {
    expect(classifyCommercial({ highway: "rest_area" })?.kind).toBe("rest_area");
    expect(classifyCommercial({ shop: "supermarket", "brand:wikidata": "Q483551" })?.kind).toBe("walmart");
    expect(classifyCommercial({ shop: "department_store", name: "Walmart Supercenter" })?.kind).toBe("walmart");
    expect(classifyCommercial({ shop: "doityourself", "brand:wikidata": "Q864407" })?.kind).toBe("home_depot");
    expect(classifyCommercial({ shop: "doityourself", name: "The Home Depot" })?.kind).toBe("home_depot");
  });

  it("refuses non-stores, in-store departments, and dead features", () => {
    expect(classifyCommercial({ amenity: "fuel", "brand:wikidata": "Q483551" })).toBeNull(); // Walmart gas, no shop tag
    expect(classifyCommercial({ shop: "garden_centre", name: "Walmart Garden Center" })).toBeNull(); // department inside the store
    expect(classifyCommercial({ shop: "car_repair", name: "Walmart Auto Care Center" })).toBeNull();
    expect(classifyCommercial({ highway: "rest_area", name: "(historical)Cow Creek Safety Rest Area SB" })).toBeNull();
    expect(classifyCommercial({ highway: "rest_area", "disused:highway": "rest_area" })).toBeNull();
    expect(classifyCommercial({ shop: "supermarket", name: "Safeway" })).toBeNull();
    expect(classifyCommercial({ natural: "spring" })).toBeNull();
    expect(classifyCommercial({})).toBeNull();
  });

  it("stamps field-honest access notes", () => {
    expect(commercialAccessNote("rest_area")).toContain("Oregon allows up to 12 hours");
    expect(commercialAccessNote("walmart")).toContain("Check posted signs");
    expect(commercialAccessNote("home_depot")).toContain("ask inside");
  });
});

describe("ship-map importer: iOverlander category mapping", () => {
  it("maps camping categories to boondock", () => {
    expect(classifyIoverlander("Wild Camping")?.type).toBe("boondock");
    expect(classifyIoverlander("Informal Campsite")?.type).toBe("boondock");
    const est = classifyIoverlander("Established Campground");
    expect(est?.type).toBe("boondock");
    expect(est?.accessNote).toContain("may charge a fee");
  });

  it("maps big-lot overnights to commercial_boondock", () => {
    expect(classifyIoverlander("Walmart")?.type).toBe("commercial_boondock");
    expect(classifyIoverlander("Casino")?.type).toBe("commercial_boondock");
    expect(classifyIoverlander("Walmart")?.accessNote).toContain("Check posted signs");
  });

  it("maps water and hot springs to spring", () => {
    expect(classifyIoverlander("Water")?.type).toBe("spring");
    expect(classifyIoverlander("Drinking Water")?.type).toBe("spring");
    const hot = classifyIoverlander("Hot Springs");
    expect(hot?.type).toBe("spring");
    expect(hot?.hotSpring).toBe(true);
  });

  it("skips services and empty categories", () => {
    for (const svc of ["Fuel Station", "Propane", "Dump Station", "Laundromat", "Mechanic", "Medical", "Restaurant", "Wifi", "Showers", "Shopping", "Tourist Attraction", "Hotel", ""]) {
      expect(classifyIoverlander(svc)).toBeNull();
    }
    expect(classifyIoverlander(null)).toBeNull();
  });
});

describe("ship-map: crew-gating (iOverlander, people-we-know scope)", () => {
  it("hides crew-only sources from anonymous viewers and shows them to signed-in crew", () => {
    expect(isCrewOnlySource("ioverlander")).toBe(true);
    expect(isCrewOnlySource("osm_overpass")).toBe(false);
    expect(isCrewOnlySource(null)).toBe(false);
    // anonymous
    expect(isLocationVisible("ioverlander", false)).toBe(false);
    expect(isLocationVisible("osm_overpass", false)).toBe(true);
    expect(isLocationVisible(null, false)).toBe(true); // base seeds / crew pins
    // signed in
    expect(isLocationVisible("ioverlander", true)).toBe(true);
    expect(isLocationVisible("osm_overpass", true)).toBe(true);
  });
});

describe("ship-map importer: idempotent slugs", () => {
  it("is deterministic for the same origin (safe re-import key)", () => {
    const row = { name: "Cold Spring", source: "osm_overpass", externalId: "node/12345" };
    expect(importSlug(row)).toBe(importSlug({ ...row }));
  });

  it("distinguishes different origin ids and stays within the column width", () => {
    const a = importSlug({ name: "Spring", source: "osm_overpass", externalId: "node/1" });
    const b = importSlug({ name: "Spring", source: "osm_overpass", externalId: "node/2" });
    expect(a).not.toBe(b);
    expect(a.length).toBeLessThanOrEqual(195);
  });
});

describe("ship-map: voyage GPX + Google Maps export", () => {
  const voyage: VoyagePin[] = [
    { id: 1, slug: "a", name: "Spring A", type: "spring", lat: 42.19, lng: -122.71 },
    { id: 2, slug: "b", name: "Boondock B", type: "boondock", lat: 43.16, lng: -122.14 },
  ];
  it("emits a waypoint + route point per stop", () => {
    const gpx = voyageToGpx(voyage);
    expect(gpx).toContain('<wpt lat="42.19" lon="-122.71">');
    expect(gpx).toContain("Boondock B");
    expect((gpx.match(/<rtept /g) ?? []).length).toBe(2);
  });
  it("builds a Google Maps directions URL with the last stop as the destination", () => {
    const url = voyageToGoogleMapsUrl(voyage);
    expect(url).toContain("destination=43.16%2C-122.14");
    expect(url).toContain("waypoints=");
  });
});

describe("ship-map router guards (reject before any DB call)", () => {
  it("map.suggest requires sign-in", async () => {
    const caller = appRouter.createCaller(makeCtx(null));
    await expect(
      caller.ship.map.suggest({ name: "A spring", type: "spring", lat: 42.19, lng: -122.71 }),
    ).rejects.toBeTruthy();
  });

  it("map.suggest rejects out-of-range coordinates", async () => {
    const caller = appRouter.createCaller(makeCtx(user()));
    await expect(
      caller.ship.map.suggest({ name: "Bad", type: "spring", lat: 200, lng: -122.71 }),
    ).rejects.toBeTruthy();
  });

  it("map.suggest rejects an absurd rig length", async () => {
    const caller = appRouter.createCaller(makeCtx(user()));
    await expect(
      caller.ship.map.suggest({ name: "Big rig", type: "boondock", lat: 42.19, lng: -122.71, maxRigLengthFt: 500 }),
    ).rejects.toBeTruthy();
  });

  it("map.confirm and map.flag require sign-in", async () => {
    const caller = appRouter.createCaller(makeCtx(null));
    await expect(caller.ship.map.confirm({ id: 1 })).rejects.toBeTruthy();
    await expect(caller.ship.map.flag({ id: 1, reason: "gate locked" })).rejects.toBeTruthy();
  });

  it("map.flag rejects an empty reason", async () => {
    const caller = appRouter.createCaller(makeCtx(user()));
    await expect(caller.ship.map.flag({ id: 1, reason: "" })).rejects.toBeTruthy();
  });
});
