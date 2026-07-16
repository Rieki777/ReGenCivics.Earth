/**
 * Galley tRPC route contract tests: auth boundaries and input validation, the
 * guarantees that hold before any database work. A signed-out caller cannot touch
 * a crew's hauls, and malformed input is rejected at the edge. (DB-backed
 * ownership logic is exercised through the engine + Cook unit tests and manually;
 * these lock the contract that runs without a database.)
 */
import { describe, it, expect } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function makeCtx(user: TrpcContext["user"] | null): TrpcContext {
  return {
    user,
    req: { protocol: "https", headers: {}, cookies: {}, socket: { remoteAddress: "127.0.0.1" } } as unknown as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  } as TrpcContext;
}
function user(id = 7): NonNullable<TrpcContext["user"]> {
  return { id, email: `u${id}@example.com` } as NonNullable<TrpcContext["user"]>;
}

describe("galley route auth boundaries", () => {
  it("myHauls requires sign-in", async () => {
    const caller = appRouter.createCaller(makeCtx(null));
    await expect(caller.ship.galley.myHauls()).rejects.toBeTruthy();
  });
  it("createHaul requires sign-in", async () => {
    const caller = appRouter.createCaller(makeCtx(null));
    await expect(caller.ship.galley.createHaul({ visibility: "crew" })).rejects.toBeTruthy();
  });
  it("renameHaul requires sign-in", async () => {
    const caller = appRouter.createCaller(makeCtx(null));
    await expect(caller.ship.galley.renameHaul({ haulId: 1, title: "x" })).rejects.toBeTruthy();
  });
  it("cook requires sign-in", async () => {
    const caller = appRouter.createCaller(makeCtx(null));
    await expect(caller.ship.galley.cook({ message: "hi", track: "table" })).rejects.toBeTruthy();
  });
});

describe("galley route input validation", () => {
  it("addItem rejects an empty item name", async () => {
    const caller = appRouter.createCaller(makeCtx(user()));
    await expect(caller.ship.galley.addItem({ haulId: 1, name: "" })).rejects.toBeTruthy();
  });
  it("remix rejects an oversized item list", async () => {
    const caller = appRouter.createCaller(makeCtx(user()));
    const items = Array.from({ length: 61 }, (_, i) => ({ name: `item ${i}` }));
    await expect(caller.ship.galley.remix({ items, track: "table" })).rejects.toBeTruthy();
  });
  it("cook rejects an empty message", async () => {
    const caller = appRouter.createCaller(makeCtx(user()));
    await expect(caller.ship.galley.cook({ message: "", track: "table" })).rejects.toBeTruthy();
  });
  it("setHaulVisibility rejects an unknown visibility", async () => {
    const caller = appRouter.createCaller(makeCtx(user()));
    // @ts-expect-error invalid enum value is the point of the test
    await expect(caller.ship.galley.setHaulVisibility({ haulId: 1, visibility: "everyone" })).rejects.toBeTruthy();
  });
  it("publicFeed rejects an oversized limit", async () => {
    const caller = appRouter.createCaller(makeCtx(null));
    await expect(caller.ship.galley.publicFeed({ limit: 5000 })).rejects.toBeTruthy();
  });
});
