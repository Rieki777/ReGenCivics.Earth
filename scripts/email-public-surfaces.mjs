#!/usr/bin/env node
/**
 * Read-only check of public email surfaces on the live site.
 *
 * GETs a few pages and prints the status. It does not POST, it does not
 * follow redirects, and it does not send mail.
 *
 * /join is expected to redirect. This script records the Location header
 * and stops. It does not treat that redirect as something to change.
 *
 * /checkin is not asserted. The signed check-in page is not required on
 * production until that change is deployed.
 *
 * Usage: node scripts/email-public-surfaces.mjs [baseUrl]
 * Default base: https://regencivics.earth
 * Exit: 0 when every asserted status matches, 1 otherwise.
 */

const base = (process.argv[2] || "https://regencivics.earth").replace(/\/$/, "");

/** @type {{ path: string, expect: number }[]} */
const checks = [
  { path: "/email-preferences", expect: 200 },
  { path: "/unsubscribe", expect: 200 },
  { path: "/schedule", expect: 200 },
  { path: "/join", expect: 302 },
];

let failed = 0;

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

if (failed > 0) {
  console.error(`${failed} check(s) failed`);
  process.exit(1);
}

console.log("public email surfaces ok");
