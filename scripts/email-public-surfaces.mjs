#!/usr/bin/env node
/**
 * Read-only check of public email surfaces on the live site.
 *
 * GETs a few pages and prints the status. It does not POST, it does not
 * follow redirects, and it does not send mail.
 *
 * /join may answer 200 on this site, or 302 somewhere else. A Location
 * header that contains "riverside" fails the check. The page itself may
 * link the studio. It must not redirect there.
 *
 * /checkin is not asserted.
 *
 * Usage: node scripts/email-public-surfaces.mjs [baseUrl]
 * Default base: https://regencivics.earth
 * Exit: 0 when every check matches, 1 otherwise.
 */

const base = (process.argv[2] || "https://regencivics.earth").replace(/\/$/, "");

/** @type {{ path: string, expect: number }[]} */
const checks = [
  { path: "/email-preferences", expect: 200 },
  { path: "/unsubscribe", expect: 200 },
  { path: "/schedule", expect: 200 },
];

/**
 * @param {number} status
 * @param {string | null} location
 * @param {string} body
 * @returns {string | null} failure reason, or null when the join response is allowed
 */
export function joinSurfaceFailure(status, location, _body) {
  const loc = location ?? "";
  if (/riverside/i.test(loc)) return "Location contains riverside";
  if (status === 200 && !loc) return null;
  if (status >= 300 && status < 400 && loc) return null;
  return `status ${status} is not an on-site page or a non-riverside redirect`;
}

function selfTest() {
  const problems = [];
  const studio = "https://riverside.com/studio/example";
  if (joinSurfaceFailure(302, studio, "") == null) problems.push("studio redirect was allowed");
  if (joinSurfaceFailure(200, null, "<h1>Join the call</h1>") != null) problems.push("on-site page was rejected");
  if (joinSurfaceFailure(302, "https://enterholos.com/holon?h=regen-civics-seeds", "") != null) {
    problems.push("non-studio redirect was rejected");
  }
  if (joinSurfaceFailure(200, null, `<a href="${studio}">Join the call</a>`) != null) {
    problems.push("studio link on the join page was rejected");
  }
  if (problems.length > 0) {
    console.error(problems.join("\n"));
    process.exit(1);
  }
  console.log("self-test ok");
}

let failed = 0;

selfTest();

for (const check of checks) {
  const url = `${base}${check.path}`;
  try {
    const res = await fetch(url, {
      method: "GET",
      redirect: "manual",
      signal: AbortSignal.timeout(20000),
      headers: { accept: "text/html" },
    });
    const loc = res.headers.get("location");
    const ok = res.status === check.expect;
    if (!ok) failed += 1;
    const where = loc ? ` location=${loc}` : "";
    console.log(`${ok ? "ok" : "FAIL"} ${res.status} (expected ${check.expect}) ${url}${where}`);
  } catch (err) {
    failed += 1;
    const message = err instanceof Error ? err.message : String(err);
    console.log(`FAIL request ${url} ${message}`);
  }
}

{
  const url = `${base}/join`;
  try {
    const res = await fetch(url, {
      method: "GET",
      redirect: "manual",
      signal: AbortSignal.timeout(20000),
      headers: { accept: "text/html" },
    });
    const loc = res.headers.get("location");
    const body = res.status === 200 ? await res.text() : "";
    const reason = joinSurfaceFailure(res.status, loc, body);
    if (reason) failed += 1;
    const where = loc ? ` location=${loc}` : "";
    console.log(`${reason ? "FAIL" : "ok"} ${res.status} ${url}${where}${reason ? ` (${reason})` : ""}`);
  } catch (err) {
    failed += 1;
    const message = err instanceof Error ? err.message : String(err);
    console.log(`FAIL request ${url} ${message}`);
  }
}

if (failed > 0) {
  console.log(`${failed} check(s) failed`);
  process.exit(1);
}

console.log("public email surfaces ok");
