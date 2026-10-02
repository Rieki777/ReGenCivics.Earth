/**
 * Whether another site's page lets regencivics.earth show it in a frame.
 *
 * The Week 2 session board shows Amora's circles map inline (ADR-69). A browser
 * only draws that frame when Amora's response allows our origin, through
 * Content-Security-Policy frame-ancestors or, when there is none, by sending no
 * X-Frame-Options. A refused frame draws as a broken box with no event the page
 * can catch, so the server reads Amora's headers and the board draws the frame
 * only for an origin they allow, and a picture with a link otherwise.
 *
 * Bounded by construction: the only URL fetched is a constant, each fetch gets
 * a short timeout and no redirects, the body is never read, and the answer is
 * cached. Any doubt reads as "not allowed", which shows the picture.
 */
import { logger } from "../_core/logger";
import { assertSafeExternalUrl } from "../_core/ssrf";

const log = logger("frame-check");

/** The origins the session board is served from in production. */
export const BOARD_ORIGINS = ["https://regencivics.earth", "https://www.regencivics.earth"] as const;

const CACHE_TTL_MS = 10 * 60 * 1000;
/** A failed check is retried sooner, so a blip does not hide the frame for ten minutes. */
const FAILURE_TTL_MS = 60 * 1000;
const FETCH_TIMEOUT_MS = 4000;
/** CSP splits on ASCII whitespace only; JS \s and trim() would also eat a no-break space. */
const ASCII_SPACE = /[\t\n\f\r ]+/;

/**
 * Whether one frame-ancestors source expression matches an https ancestor.
 * Covers what a site realistically sends: *, https:, and host sources with an
 * optional scheme, *. subdomain wildcard, port and trailing slash. Keywords
 * ('self' is the framed site's own origin, 'none') and anything unusual match
 * nothing.
 */
function sourceMatches(source: string, ancestor: URL): boolean {
  const s = source.toLowerCase();
  if (s === "*") return true;
  if (s === "https:") return ancestor.protocol === "https:";
  if (!s || s.startsWith("'")) return false;
  const m = /^(?:(https?):\/\/)?(\*\.)?([a-z0-9.-]+)(?::(\d+|\*))?\/?$/.exec(s);
  if (!m) return false;
  const [, scheme, wildcard, host, port] = m;
  // An http source also matches its https upgrade; the board is only ever https.
  if (scheme && ancestor.protocol !== "https:") return false;
  const hostOk = wildcard
    ? ancestor.hostname.endsWith(`.${host}`)
    : ancestor.hostname === host;
  if (!hostOk) return false;
  if (!port) return ancestor.port === "";
  if (port === "*") return true;
  return ancestor.port === "" ? port === "443" : ancestor.port === port;
}

/**
 * Whether a response with these headers may be framed by `origin`. Every
 * enforced policy that names frame-ancestors must allow it; when none does,
 * any X-Frame-Options value is read as a refusal (DENY and SAMEORIGIN both
 * refuse a cross-site frame, and the rest are too old to trust).
 */
export function framingAllows(
  headers: { csp: string | null | undefined; xfo: string | null | undefined },
  origin: string,
): boolean {
  let ancestor: URL;
  try {
    ancestor = new URL(origin);
  } catch {
    return false;
  }
  let named = false;
  // Several CSP headers arrive joined with commas; each one is its own policy.
  // Browsers split on ASCII whitespace only, so a no-break space stays inside
  // a token here too, and that token then matches nothing.
  for (const policy of (headers.csp ?? "").split(",")) {
    const directive = policy
      .split(";")
      .map((d) => d.split(ASCII_SPACE).filter(Boolean))
      .find((parts) => parts[0]?.toLowerCase() === "frame-ancestors");
    if (!directive) continue;
    named = true;
    if (!directive.slice(1).some((src) => sourceMatches(src, ancestor))) return false;
  }
  if (named) return true;
  return (headers.xfo ?? "").split(ASCII_SPACE).filter(Boolean).length === 0;
}

let cache = new Map<string, { at: number; ttl: number; value: string[] }>();
const inFlight = new Map<string, Promise<string[]>>();

/** For tests: forget every cached answer. */
export function resetFrameCheckCache() {
  cache = new Map();
  inFlight.clear();
}

async function check(url: string): Promise<{ origins: string[]; ok: boolean }> {
  try {
    await assertSafeExternalUrl(url);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    let res: Response;
    try {
      res = await fetch(url, {
        signal: controller.signal,
        redirect: "error",
        headers: { accept: "text/html", "user-agent": "ReGenCivicsFrameCheck/1.0" },
      });
    } finally {
      clearTimeout(timer);
    }
    // Only the headers matter; let the body go.
    void res.body?.cancel().catch(() => {});
    if (!res.ok) return { origins: [], ok: false };
    const headers = {
      csp: res.headers.get("content-security-policy"),
      xfo: res.headers.get("x-frame-options"),
    };
    return { origins: BOARD_ORIGINS.filter((o) => framingAllows(headers, o)), ok: true };
  } catch (err) {
    log.warn(`frame check failed for ${url}: ${err instanceof Error ? err.message : String(err)}`);
    return { origins: [], ok: false };
  }
}

/**
 * Which of the board's origins `url` lets frame it, cached for ten minutes
 * (one minute after a failure). Never throws; a failure reads as none.
 */
export async function frameOriginsFor(url: string, now: number = Date.now()): Promise<string[]> {
  const hit = cache.get(url);
  if (hit && now - hit.at < hit.ttl) return hit.value;
  const pending = inFlight.get(url);
  if (pending) return pending;
  const run = check(url)
    .then(({ origins, ok }) => {
      cache.set(url, { at: now, ttl: ok ? CACHE_TTL_MS : FAILURE_TTL_MS, value: origins });
      return origins;
    })
    .finally(() => inFlight.delete(url));
  inFlight.set(url, run);
  return run;
}
