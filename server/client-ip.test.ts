/**
 * clientIp: the visitor's address for limits and failure blockers.
 *
 * On production req.ip is a shared proxy address (84.17.44.225 to .227 for
 * every caller, measured 2026-09-28), so a limit keyed on it is one counter
 * for the whole site. Cloudflare's CF-Connecting-IP is the visitor.
 */
import { describe, it, expect } from "vitest";
import { clientIp } from "./_core/client-ip";
import { getClientIp } from "./rate-limit";

const req = (headers: Record<string, string | string[] | undefined>, ip?: string) =>
  ({ headers, ip, socket: { remoteAddress: "10.0.0.9" } }) as never;

describe("clientIp", () => {
  it("prefers Cloudflare's CF-Connecting-IP over the shared proxy address", () => {
    expect(clientIp(req({ "cf-connecting-ip": "179.64.117.159" }, "84.17.44.226"))).toBe("179.64.117.159");
    expect(clientIp(req({ "cf-connecting-ip": "2605:59ca:3506:2e10:7cfb:2865:a935:76b3" }, "84.17.44.226"))).toBe(
      "2605:59ca:3506:2e10:7cfb:2865:a935:76b3",
    );
  });

  it("two visitors behind the same proxy get two different keys", () => {
    const a = clientIp(req({ "cf-connecting-ip": "203.0.113.5" }, "84.17.44.226"));
    const b = clientIp(req({ "cf-connecting-ip": "198.51.100.7" }, "84.17.44.226"));
    expect(a).not.toBe(b);
  });

  it("ignores a header that is not an address and falls back to req.ip", () => {
    expect(clientIp(req({ "cf-connecting-ip": "not-an-ip" }, "84.17.44.226"))).toBe("84.17.44.226");
    expect(clientIp(req({ "cf-connecting-ip": "1.2.3.4, 5.6.7.8" }, "84.17.44.226"))).toBe("84.17.44.226");
    expect(clientIp(req({ "cf-connecting-ip": "" }, "84.17.44.226"))).toBe("84.17.44.226");
  });

  it("trims whitespace and takes the first value of a repeated header", () => {
    expect(clientIp(req({ "cf-connecting-ip": "  203.0.113.5 " }, "84.17.44.226"))).toBe("203.0.113.5");
    expect(clientIp(req({ "cf-connecting-ip": ["203.0.113.5", "198.51.100.7"] }, "84.17.44.226"))).toBe("203.0.113.5");
  });

  it("never reads X-Forwarded-For, which the client controls", () => {
    expect(clientIp(req({ "x-forwarded-for": "9.9.9.9" }, "84.17.44.226"))).toBe("84.17.44.226");
  });

  it("falls back to the socket address, then to 'unknown'", () => {
    expect(clientIp(req({}, undefined))).toBe("10.0.0.9");
    expect(clientIp({ headers: {} } as never)).toBe("unknown");
  });

  it("the tRPC limiter reads the same helper", () => {
    expect(getClientIp(req({ "cf-connecting-ip": "203.0.113.5" }, "84.17.44.226") as never)).toBe("203.0.113.5");
  });
});
