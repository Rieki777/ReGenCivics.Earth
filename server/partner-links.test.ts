/**
 * Money route URLs (server/lib/partner-links.ts). No database, no network.
 * A creator now supplies a URL the server fetches (OWASP A10), so these pin
 * the allowlist: https only, exact hosts per partner, no credentials, no IP
 * literals, no look-alike hosts, and redirects only to the same allowlist.
 */
import { describe, expect, it } from "vitest";
import {
  routePageKey,
  PARTNER_HOSTS,
  ROUTE_PARTNERS,
  isAllowedHop,
  validateProofUrl,
  validateRouteUrl,
} from "./lib/partner-links";

describe("validateRouteUrl", () => {
  it("accepts the project's page on each partner, https only", () => {
    expect(validateRouteUrl("maearth", "https://maearth.com/projects/harmony-valley")).toEqual({
      ok: true,
      url: "https://maearth.com/projects/harmony-valley",
    });
    expect(validateRouteUrl("maearth", "https://www.maearth.com/p/abc?ref=1")).toMatchObject({ ok: true });
    expect(validateRouteUrl("gosteward", "https://gosteward.com/projects/green-acres")).toMatchObject({ ok: true });
    expect(validateRouteUrl("gosteward", "  https://www.gosteward.com/projects/x  ")).toMatchObject({
      ok: true,
      url: "https://www.gosteward.com/projects/x",
    });
    // Host case is normalised by the URL parser.
    expect(validateRouteUrl("maearth", "https://MAEARTH.com/projects/x")).toMatchObject({
      ok: true,
      url: "https://maearth.com/projects/x",
    });
  });

  it("holds each partner to its own hosts", () => {
    expect(validateRouteUrl("maearth", "https://gosteward.com/projects/x")).toMatchObject({ ok: false });
    expect(validateRouteUrl("gosteward", "https://maearth.com/projects/x")).toMatchObject({ ok: false });
    for (const p of ROUTE_PARTNERS) expect(PARTNER_HOSTS[p].length).toBeGreaterThan(0);
  });

  it("refuses http, other schemes and credentials", () => {
    for (const raw of [
      "http://maearth.com/projects/x",
      "ftp://maearth.com/projects/x",
      "javascript:alert(1)//maearth.com/projects/x",
      "data:text/html,<b>x</b>",
      "https://user:pass@maearth.com/projects/x",
      "https://user@maearth.com/projects/x",
      "//maearth.com/projects/x",
      "maearth.com/projects/x",
    ]) {
      expect({ raw, r: validateRouteUrl("maearth", raw) }).toMatchObject({ raw, r: { ok: false } });
    }
  });

  it("refuses IP literals, localhost, look-alikes and other ports", () => {
    for (const raw of [
      "https://127.0.0.1/projects/x",
      "https://169.254.169.254/latest/meta-data",
      "https://[::1]/projects/x",
      "https://localhost/projects/x",
      "https://maearth.com.evil.test/projects/x",
      "https://evil.test/maearth.com/projects/x",
      "https://maearth.com.@evil.test/projects/x",
      "https://evilmaearth.com/projects/x",
      "https://api.maearth.com/projects/x",
      "https://maearth.com./projects/x",
      "https://maearth.com:8443/projects/x",
      "https://xn--mearth-bua.com/projects/x",
    ]) {
      expect({ raw, r: validateRouteUrl("maearth", raw) }).toMatchObject({ raw, r: { ok: false } });
    }
  });

  it("refuses the front page, empty input and anything over 512 characters", () => {
    expect(validateRouteUrl("maearth", "https://maearth.com")).toMatchObject({ ok: false });
    expect(validateRouteUrl("maearth", "https://maearth.com/")).toMatchObject({ ok: false });
    expect(validateRouteUrl("maearth", "")).toMatchObject({ ok: false });
    expect(validateRouteUrl("maearth", "https://maearth.com/p/" + "a".repeat(600))).toMatchObject({ ok: false });
    expect(validateRouteUrl("maearth", "https://maearth.com/p/a b")).toMatchObject({ ok: false });
  });

  it("words the refusal with the partner's name and first host", () => {
    expect(validateRouteUrl("maearth", "http://maearth.com/x")).toEqual({
      ok: false,
      message: "Use your project's page on Ma Earth. The link has to start with https://maearth.com.",
    });
    expect(validateRouteUrl("gosteward", "https://evil.test/x")).toEqual({
      ok: false,
      message: "Use your project's page on Steward. The link has to start with https://gosteward.com.",
    });
  });
});

describe("validateProofUrl", () => {
  it("takes any https host and refuses the rest", () => {
    expect(validateProofUrl("https://harmonyvalley.example/about")).toMatchObject({ ok: true });
    expect(validateProofUrl("http://harmonyvalley.example/about")).toMatchObject({ ok: false });
    expect(validateProofUrl("https://u:p@harmonyvalley.example/")).toMatchObject({ ok: false });
    expect(validateProofUrl("javascript:alert(1)")).toMatchObject({ ok: false });
    expect(validateProofUrl("https://x.example/" + "a".repeat(600))).toMatchObject({ ok: false });
  });
});

describe("isAllowedHop", () => {
  const from = new URL("https://maearth.com/projects/harmony");

  it("follows a redirect that stays on the partner's hosts", () => {
    expect(isAllowedHop("maearth", from, "https://www.maearth.com/projects/harmony")).toBe(true);
    expect(isAllowedHop("maearth", from, "/p/harmony-valley")).toBe(true);
  });

  it("refuses an off-host, downgraded, credentialed or cross-partner hop", () => {
    for (const loc of [
      "https://evil.test/projects/harmony",
      "http://maearth.com/projects/harmony",
      "https://169.254.169.254/latest/meta-data",
      "https://localhost/",
      "https://maearth.com.evil.test/",
      "https://u:p@maearth.com/p",
      "https://gosteward.com/projects/harmony",
      "//evil.test/x",
      "",
    ]) {
      expect({ loc, allowed: isAllowedHop("maearth", from, loc) }).toEqual({ loc, allowed: false });
    }
  });
});

describe("routePageKey", () => {
  it("reads one page the same way however it is spelled", () => {
    const key = routePageKey("https://maearth.com/projects/farm");
    expect(key).toBe("maearth.com/projects/farm");
    for (const same of [
      "https://www.maearth.com/projects/farm",
      "https://maearth.com/projects/farm/",
      "https://MAEARTH.com/Projects/Farm",
      "https://maearth.com/projects/farm#give",
      "  https://maearth.com/projects/farm  ",
    ]) {
      expect(routePageKey(same)).toBe(key);
    }
  });

  it("keeps different pages apart", () => {
    expect(routePageKey("https://maearth.com/projects/farm-2")).not.toBe(routePageKey("https://maearth.com/projects/farm"));
    expect(routePageKey("https://maearth.com/projects?id=2")).not.toBe(routePageKey("https://maearth.com/projects?id=3"));
  });

  it("returns null for text that is not a URL", () => {
    expect(routePageKey("")).toBeNull();
    expect(routePageKey("not a url")).toBeNull();
  });
});
