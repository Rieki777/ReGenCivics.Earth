/**
 * rateLimited keys anonymous callers on the visitor, not the proxy.
 *
 * Behind Cloudflare, req.ip is one of a few shared proxy addresses, so keying
 * on it put every anonymous visitor on one counter per procedure. The public
 * votes (/season-schedule, /interop-sessions) would have locked each other out
 * the first minute a few people used them together.
 */
import { describe, expect, it } from "vitest";
import { publicProcedure, rateLimited, router } from "./_core/trpc";
import type { TrpcContext } from "./_core/context";

const limited = router({
  ping: publicProcedure.use(rateLimited({ windowMs: 60_000, max: 2 })).mutation(() => "pong"),
});

/** A request that came through the shared proxy, from one visitor. */
function ctxFrom(visitor: string): TrpcContext {
  return {
    req: {
      ip: "84.17.44.226",
      headers: { "cf-connecting-ip": visitor },
      cookies: {},
      socket: { remoteAddress: "84.17.44.226" },
    },
    res: {},
    user: null,
  } as unknown as TrpcContext;
}

describe("rateLimited", () => {
  it("gives each visitor behind the same proxy their own counter", async () => {
    const a = limited.createCaller(ctxFrom("203.0.113.10"));
    const b = limited.createCaller(ctxFrom("203.0.113.20"));
    await a.ping();
    await a.ping();
    await expect(a.ping()).rejects.toThrow(/Too many requests/);
    // Same proxy address, different visitor: not locked out by the first one.
    await expect(b.ping()).resolves.toBe("pong");
  });
});
