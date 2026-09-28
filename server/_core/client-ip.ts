/**
 * The visitor's address, for rate limits and failure blockers.
 *
 * Production runs Cloudflare in front of Railway. Under `trust proxy` 1
 * (server/_core/index.ts) Express resolves req.ip to the last
 * X-Forwarded-For entry, and on regencivics.earth that entry is one of a few
 * shared proxy addresses: measured 2026-09-28, a request from 179.64.117.159
 * logged as 84.17.44.226, and so did every other caller. Keying a limit or a
 * failure blocker on req.ip there puts every visitor on one counter, so one
 * person's failed attempts can lock everyone out.
 *
 * Cloudflare sets CF-Connecting-IP to the address that connected to it and
 * replaces any value a client sends, so on a request that came through
 * Cloudflare it is the visitor. Off Cloudflare (local dev, tests, a direct
 * hit on the Railway domain) the header is absent and req.ip is used.
 *
 * Open: a request sent straight to the Railway domain can carry its own
 * CF-Connecting-IP. Locking the origin to Cloudflare closes that (OWASP A05).
 */
import { isIP } from "node:net";
import type { Request } from "express";

type IpSource = Pick<Request, "headers" | "ip"> & { socket?: { remoteAddress?: string } };

export function clientIp(req: IpSource): string {
  const raw = req.headers?.["cf-connecting-ip"];
  const value = (Array.isArray(raw) ? raw[0] : raw)?.trim();
  if (value && isIP(value)) return value;
  return req.ip || req.socket?.remoteAddress || "unknown";
}
