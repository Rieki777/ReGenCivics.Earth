import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import { inBbox, inCascadiaPolygon, importSlug } from "../scripts/ship-import-lib";
import { voyageToGpx, voyageToGoogleMapsUrl, type VoyagePin } from "../client/src/pages/ship/shipVoyage";

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
