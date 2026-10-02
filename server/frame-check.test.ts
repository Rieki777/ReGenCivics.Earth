import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("./_core/ssrf", () => ({ assertSafeExternalUrl: vi.fn(async () => ({ resolvedAddresses: [] })) }));

import { BOARD_ORIGINS, frameOriginsFor, framingAllows, resetFrameCheckCache } from "./lib/frame-check";

const APEX = "https://regencivics.earth";
const WWW = "https://www.regencivics.earth";

describe("framingAllows", () => {
  it("refuses what Amora sends today", () => {
    expect(framingAllows({ csp: "frame-ancestors 'self'", xfo: "SAMEORIGIN" }, APEX)).toBe(false);
  });

  it("allows a frame-ancestors list that names the board, whatever X-Frame-Options says", () => {
    const csp = "default-src 'self'; frame-ancestors 'self' https://regencivics.earth https://*.regencivics.earth";
    expect(framingAllows({ csp, xfo: "SAMEORIGIN" }, APEX)).toBe(true);
    expect(framingAllows({ csp, xfo: null }, WWW)).toBe(true);
  });

  it("reads a subdomain wildcard as subdomains only, never the apex", () => {
    const csp = "frame-ancestors https://*.regencivics.earth";
    expect(framingAllows({ csp, xfo: null }, APEX)).toBe(false);
    expect(framingAllows({ csp, xfo: null }, WWW)).toBe(true);
  });

  it("matches scheme-less hosts, the default port, a trailing slash, * and https:", () => {
    for (const src of ["regencivics.earth", "https://regencivics.earth:443", "https://regencivics.earth/", "http://regencivics.earth", "*", "https:", "HTTPS://RegenCivics.Earth"]) {
      expect(framingAllows({ csp: `frame-ancestors ${src}`, xfo: null }, APEX), src).toBe(true);
    }
  });

  it("refuses other hosts, other ports, look-alikes and keywords", () => {
    for (const src of ["'none'", "'self'", "https://evil-regencivics.earth", "https://regencivics.earth.evil.com", "https://regencivics.earth:8443", "https://example.com", "'unsafe-inline'", "data:", ""]) {
      expect(framingAllows({ csp: `frame-ancestors ${src}`, xfo: null }, APEX), src || "(empty)").toBe(false);
    }
  });

  it("needs every policy that names frame-ancestors to allow it", () => {
    const csp = "frame-ancestors https://regencivics.earth, frame-ancestors 'self'";
    expect(framingAllows({ csp, xfo: null }, APEX)).toBe(false);
    expect(framingAllows({ csp: "default-src 'self', frame-ancestors https://regencivics.earth", xfo: null }, APEX)).toBe(true);
  });

  it("falls back to X-Frame-Options when no policy names frame-ancestors", () => {
    expect(framingAllows({ csp: "default-src 'self'", xfo: "DENY" }, APEX)).toBe(false);
    expect(framingAllows({ csp: null, xfo: "SAMEORIGIN" }, APEX)).toBe(false);
    expect(framingAllows({ csp: null, xfo: "ALLOW-FROM https://regencivics.earth" }, APEX)).toBe(false);
    expect(framingAllows({ csp: null, xfo: null }, APEX)).toBe(true);
    expect(framingAllows({ csp: "", xfo: "  " }, APEX)).toBe(true);
  });

  it("splits on ASCII whitespace only, the way browsers read CSP", () => {
    const nbsp = String.fromCharCode(0xa0);
    expect(framingAllows({ csp: `frame-ancestors https://regencivics.earth${nbsp}`, xfo: null }, APEX)).toBe(false);
    expect(framingAllows({ csp: `frame-ancestors${nbsp}https://regencivics.earth`, xfo: "SAMEORIGIN" }, APEX)).toBe(false);
    expect(framingAllows({ csp: "frame-ancestors\thttps://regencivics.earth", xfo: null }, APEX)).toBe(true);
  });

  it("refuses an origin it cannot parse", () => {
    expect(framingAllows({ csp: "frame-ancestors *", xfo: null }, "not a url")).toBe(false);
  });
});

describe("frameOriginsFor", () => {
  const URL_ = "https://amora.regencivics.earth/map/circles";
  afterEach(() => {
    vi.unstubAllGlobals();
    resetFrameCheckCache();
  });

  function stubFetch(headers: Record<string, string>, status = 200) {
    const fetchMock = vi.fn(async () => new Response("<html></html>", { status, headers }));
    vi.stubGlobal("fetch", fetchMock);
    return fetchMock;
  }

  it("returns the board origins the headers allow, and caches the answer", async () => {
    const fetchMock = stubFetch({ "content-security-policy": "frame-ancestors 'self' https://regencivics.earth" });
    expect(await frameOriginsFor(URL_, 1_000)).toEqual([APEX]);
    expect(await frameOriginsFor(URL_, 2_000)).toEqual([APEX]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const init = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(init[1].redirect).toBe("error");
  });

  it("asks again once the cache runs out", async () => {
    const fetchMock = stubFetch({ "content-security-policy": "frame-ancestors 'self'" });
    expect(await frameOriginsFor(URL_, 0)).toEqual([]);
    expect(await frameOriginsFor(URL_, 10 * 60 * 1000 + 1)).toEqual([]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("shares one fetch between callers who arrive together", async () => {
    const fetchMock = stubFetch({});
    const [a, b] = await Promise.all([frameOriginsFor(URL_, 0), frameOriginsFor(URL_, 0)]);
    expect(a).toEqual([...BOARD_ORIGINS]);
    expect(b).toEqual([...BOARD_ORIGINS]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("reads an error page or a network failure as no origins, and retries after a minute", async () => {
    stubFetch({}, 503);
    expect(await frameOriginsFor(URL_, 0)).toEqual([]);
    const failing = vi.fn(async () => { throw new Error("connect ECONNREFUSED"); });
    vi.stubGlobal("fetch", failing);
    expect(await frameOriginsFor(URL_, 30_000)).toEqual([]);
    expect(failing).not.toHaveBeenCalled();
    expect(await frameOriginsFor(URL_, 60_001)).toEqual([]);
    expect(failing).toHaveBeenCalledTimes(1);
  });
});
