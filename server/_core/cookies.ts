import type { CookieOptions, Request, Response } from "express";
import { COOKIE_NAME } from "@shared/const";

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

function isIpAddress(host: string | undefined) {
  if (!host) return false;
  // Basic IPv4 check and IPv6 presence detection.
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) return true;
  return host.includes(":");
}

function isSecureRequest(req: Request) {
  if (req.protocol === "https") return true;

  const forwardedProto = req.headers["x-forwarded-proto"];
  if (forwardedProto) {
    const protoList = Array.isArray(forwardedProto)
      ? forwardedProto
      : forwardedProto.split(",");
    if (protoList.some(proto => proto.trim().toLowerCase() === "https")) {
      return true;
    }
  }

  // Production-HTTPS fallback. On Railway behind Cloudflare, every external
  // request reaches us over HTTPS, but x-forwarded-proto can occasionally
  // arrive missing or stripped (Apple OAuth form_post POSTs, certain
  // health-check probes, redirect chains via 3rd-party SSO). If we see this
  // process running in production, default to secure=true rather than
  // emitting a Set-Cookie without the Secure flag, which iPhone Safari
  // silently drops on an HTTPS page. This was the lingering sign-in bug
  // after the multi-cookie fix landed.
  if (process.env.NODE_ENV === "production") return true;

  return false;
}

export function getSessionCookieOptions(
  req: Request
): Pick<CookieOptions, "domain" | "httpOnly" | "path" | "sameSite" | "secure"> {
  const hostname = req.hostname;
  const isLocal =
    !hostname ||
    LOCAL_HOSTS.has(hostname) ||
    isIpAddress(hostname);

  // In production, set domain to .regencivics.earth so the session cookie is
  // shared across all subdomains (e.g. gov.regencivics.earth). Locally we
  // skip the domain attribute so cookies still work on localhost.
  const domain = isLocal ? undefined : ".regencivics.earth";

  // SameSite=lax is the correct setting for the OAuth top-level redirect flow
  // and works on every browser including iPhone Safari (which silently drops
  // SameSite=none cookies when Secure is not accurately true. Common on
  // Railway behind its proxy if x-forwarded-proto is not set).
  return {
    domain,
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secure: isSecureRequest(req),
  };
}

/**
 * Clear ALL variants of the session cookie. Browsers identify cookies by
 * (name, path, domain). Over the lifetime of this app, sessions have been
 * set with at least three different domain attributes:
 *
 *   1. host-only       (no Domain attribute, before fa79801)
 *   2. ".regencivics.earth"  (current default, since fa79801)
 *   3. "regencivics.earth"   (no leading dot, theoretically equivalent but
 *                              treated as a separate cookie by browsers)
 *
 * iPhone Safari accumulates these across deploys and sends them all on the
 * next request. Server reads only the first matching value; logout clears
 * only the variant that getSessionCookieOptions currently returns; the
 * stale duplicates persist and re-authenticate the next request as the same
 * user. This was the root cause of "I clicked Sign Out but I'm still logged
 * in" reported on 2026-04-25.
 *
 * Calling this on logout AND before every fresh sign-in flushes all the
 * variants so we always start clean.
 */
export function clearAllSessionCookies(req: Request, res: Response) {
  const opts = getSessionCookieOptions(req);
  // 1. Clear with current domain attribute (most likely active variant)
  res.clearCookie(COOKIE_NAME, opts);
  // 2. Clear without domain (host-only cookies set by older deploys)
  res.clearCookie(COOKIE_NAME, { ...opts, domain: undefined });
  // 3. Clear with no-leading-dot variant if we're behind the apex domain
  if (opts.domain && opts.domain.startsWith(".")) {
    res.clearCookie(COOKIE_NAME, { ...opts, domain: opts.domain.slice(1) });
  }
}
