/**
 * Lane R: mint a short-lived session token for the standing test account and
 * verify it against the live server.
 *
 * The secret arrives on STDIN inside the `railway variables --json` blob for
 * the "Amora Game" service. Neither the secret nor the token is printed or
 * written to disk; the token exists only in this process.
 *
 * TOKEN SHAPE (server/index.ts encodeToken):
 *   base64url(JSON.stringify({userId, email, timestamp, v})) + "." +
 *   base64url(HMAC-SHA256(payload, AUTH_TOKEN_SECRET))
 *
 * LIFETIME: decodeToken rejects when Date.now() - timestamp > session_days.
 * `auth.session_days` has no override on this deployment, so it is the platform
 * default of 30 days. Backdating the timestamp by 29 days caps this token's
 * remaining life at 24 hours, which is the ceiling this lane was given.
 */
import crypto from "node:crypto";

export const BASE = "https://amora.regencivics.earth";
export const QA_USER_ID = "user-1786809208124-iuzo2";
export const QA_EMAIL = "integration-qa@amora.invalid";

const SESSION_DAYS = 30;
const WANT_HOURS = 24;

export async function readVars() {
  let raw = "";
  process.stdin.setEncoding("utf8");
  for await (const chunk of process.stdin) raw += chunk;
  return JSON.parse(raw);
}

export function mint(secret, { userId = QA_USER_ID, email = QA_EMAIL, v = 0 } = {}) {
  const backdateMs = (SESSION_DAYS * 24 - WANT_HOURS) * 60 * 60 * 1000;
  const payload = Buffer.from(
    JSON.stringify({ userId, email, timestamp: Date.now() - backdateMs, v }),
  ).toString("base64url");
  const sig = crypto.createHmac("sha256", secret).update(payload).digest("base64url");
  return `${payload}.${sig}`;
}

// Run directly = verify mode. (pathToFileURL, because on Windows argv[1] is a
// drive path and import.meta.url carries the three-slash file:/// form.)
import { pathToFileURL } from "node:url";
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const vars = await readVars();
  const token = mint(vars.AUTH_TOKEN_SECRET);
  const auth = { Authorization: `Bearer ${token}` };

  const checks = [
    ["GET /api/profile", `${BASE}/api/profile`],
    ["GET /api/admin/modules (admin gate)", `${BASE}/api/admin/modules`],
    ["GET /api/admin/audit (admin gate)", `${BASE}/api/admin/audit`],
  ];
  for (const [label, u] of checks) {
    const res = await fetch(u, { headers: auth });
    const body = await res.text();
    let shown;
    try {
      const j = JSON.parse(body);
      shown = label.startsWith("GET /api/profile")
        ? JSON.stringify({ id: j.id ?? j.user?.id, name: j.name ?? j.user?.name, email: j.email ?? j.user?.email, role: j.role ?? j.user?.role, handle: j.handle ?? j.user?.handle })
        : `${Array.isArray(j) ? j.length + " items" : Object.keys(j).slice(0, 6).join(",")}`;
    } catch { shown = body.slice(0, 120); }
    console.log(`${label} -> ${res.status} ${shown}`);
  }

  // Control: a token signed with the wrong secret must be refused.
  const bad = mint("not-the-secret");
  const badRes = await fetch(`${BASE}/api/profile`, { headers: { Authorization: `Bearer ${bad}` } });
  console.log(`CONTROL wrong-secret token -> ${badRes.status} (401 expected)`);
}
