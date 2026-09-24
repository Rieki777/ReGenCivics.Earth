/**
 * The client and server redirect maps must name the same routes.
 *
 * `shared/redirects.ts` exists because fourteen routes redirected only in the
 * browser, which made them blank pages to every agent that does not run
 * JavaScript. Twelve of them showed up in the phase -2 baseline's 94 blank
 * urls.
 *
 * The hazard now is drift. A route added to App.tsx and not here goes back to
 * being invisible; a route removed from App.tsx and left here sends humans and
 * agents to different places, which is worse than the original bug because it
 * is silent. So this reads App.tsx and compares, rather than trusting anyone
 * to remember.
 *
 * This is a parity check, not a redirect test. redirects.test.ts checks the
 * behaviour.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { ROUTE_REDIRECTS } from "@shared/redirects";

const appTsx = readFileSync(
  resolve(__dirname, "..", "client", "src", "App.tsx"),
  "utf8",
);

/**
 * Every route in App.tsx whose body is a redirect and nothing else.
 *
 * Two forms are in use and both are matched:
 *   <Route path={"/x"}><Redirect to="/y" /></Route>
 *   <Route path={"/x"}>{() => { window.location.replace('/y'); return null; }}</Route>
 */
function clientRedirectRoutes(): { from: string; to: string }[] {
  const out: { from: string; to: string }[] = [];
  const routeLine =
    /<Route\s+path=\{?["'`]([^"'`]+)["'`]\}?>([\s\S]*?)<\/Route>/g;
  for (const m of appTsx.matchAll(routeLine)) {
    const [, from, body] = m;
    const declarative = body.match(/<Redirect\s+to=["']([^"']+)["']/);
    const imperative = body.match(/window\.location\.replace\(\s*['"]([^'"]+)['"]/);
    const to = declarative?.[1] ?? imperative?.[1];
    if (to) out.push({ from, to });
  }
  return out;
}

describe("redirect parity between App.tsx and shared/redirects.ts", () => {
  const client = clientRedirectRoutes();

  it("finds the client redirects at all, so an empty match cannot pass", () => {
    // Without this, a regex that silently stopped matching would make every
    // assertion below vacuously true and the gate would report all clear while
    // checking nothing.
    expect(client.length).toBeGreaterThanOrEqual(10);
  });

  it("has a server entry for every client redirect", () => {
    const server = new Set(ROUTE_REDIRECTS.map((r) => r.from));
    const missing = client.filter((c) => !server.has(c.from)).map((c) => c.from);
    expect(
      missing,
      `client-only redirects. Each is a blank page to an agent. Add to shared/redirects.ts: ${missing.join(", ")}`,
    ).toEqual([]);
  });

  it("has a client route for every server entry", () => {
    const clientPaths = new Set(client.map((c) => c.from));
    const orphaned = ROUTE_REDIRECTS.filter((r) => !clientPaths.has(r.from)).map(
      (r) => r.from,
    );
    expect(
      orphaned,
      `server-only redirects. Humans and agents would be sent to different places: ${orphaned.join(", ")}`,
    ).toEqual([]);
  });

  it("sends both to the same destination", () => {
    const server = new Map(ROUTE_REDIRECTS.map((r) => [r.from, r.to]));
    const mismatched = client
      .filter((c) => server.has(c.from) && server.get(c.from) !== c.to)
      .map((c) => `${c.from}: client -> ${c.to}, server -> ${server.get(c.from)}`);
    expect(mismatched, mismatched.join("; ")).toEqual([]);
  });
});
