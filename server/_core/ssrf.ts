/**
 * SSRF guards for outbound HTTP from the server.
 *
 * Two modes:
 *
 * 1. assertSafeExternalUrl(url) — for routes that take a user-supplied URL
 *    and fetch it (link previews, transcript fetchers). Rejects loopback,
 *    private IP ranges, link-local (incl. cloud metadata 169.254.169.254),
 *    and IPv6 equivalents. Resolves DNS and validates every returned
 *    address. Not 100% rebinding-proof on its own (a malicious resolver
 *    could flip between this lookup and the actual fetch), but covers the
 *    bulk of the SSRF attack surface and is the minimum bar before any
 *    user-URL fetcher ships.
 *
 * 2. ALLOWED_PARTNER_IMG_DOMAINS / isAllowlistedHost — for routes where
 *    the domain itself is the gate (the /api/img proxy locks to known
 *    storage + partner CDNs; users never type these URLs directly).
 *
 * Use #1 for "user submitted a forum URL" surfaces. Use #2 for "the app
 * itself fetches from a small set of CDNs" surfaces.
 */

import { promises as dns } from 'node:dns';
import net from 'node:net';

/**
 * Hostnames that are always rejected regardless of DNS resolution.
 * These literals never resolve to public IPs in any reasonable network.
 */
const BANNED_HOSTNAMES = new Set([
  'localhost',
  'localhost.localdomain',
  'broadcasthost',
  'ip6-localhost',
  'ip6-loopback',
]);

/**
 * Test whether a literal IPv4 address falls inside an SSRF-banned range.
 * Bans: 0.0.0.0/8, 10.0.0.0/8, 100.64.0.0/10 (CGNAT), 127.0.0.0/8 (loopback),
 * 169.254.0.0/16 (link-local + cloud metadata), 172.16.0.0/12, 192.168.0.0/16,
 * 224.0.0.0/4 (multicast), 240.0.0.0/4 (reserved).
 */
function isPrivateIPv4(ip: string): boolean {
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4 || parts.some((n) => Number.isNaN(n) || n < 0 || n > 255)) return true;
  const [a, b] = parts;
  if (a === 0) return true; // "this network"
  if (a === 10) return true; // private
  if (a === 127) return true; // loopback
  if (a === 169 && b === 254) return true; // link-local + cloud metadata
  if (a === 172 && b >= 16 && b <= 31) return true; // private
  if (a === 192 && b === 168) return true; // private
  if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
  if (a >= 224) return true; // multicast + reserved
  return false;
}

/**
 * Test whether a literal IPv6 address falls inside an SSRF-banned range.
 * Bans: ::1 (loopback), fc00::/7 (unique local), fe80::/10 (link-local),
 * ::ffff:* (IPv4-mapped — also runs the IPv4 test on the embedded address),
 * :: (unspecified).
 */
function isPrivateIPv6(ip: string): boolean {
  const lower = ip.toLowerCase();
  if (lower === '::' || lower === '::1') return true;
  if (lower.startsWith('fe80:') || lower.startsWith('fe9') || lower.startsWith('fea') || lower.startsWith('feb')) return true; // link-local fe80::/10
  if (lower.startsWith('fc') || lower.startsWith('fd')) return true; // unique local fc00::/7
  if (lower.startsWith('ff')) return true; // multicast
  // IPv4-mapped IPv6 (::ffff:a.b.c.d) — also test the embedded v4
  const v4Mapped = lower.match(/^::ffff:([0-9.]+)$/);
  if (v4Mapped) return isPrivateIPv4(v4Mapped[1]);
  // IPv4-compat IPv6 (deprecated but still possible: ::a.b.c.d)
  const v4Compat = lower.match(/^::([0-9.]+)$/);
  if (v4Compat) return isPrivateIPv4(v4Compat[1]);
  return false;
}

/**
 * Validate a user-supplied URL is safe for the server to fetch.
 * Throws Error('SSRF: ...') if the URL fails any check. Returns the
 * resolved IP string on success (callers can use it for an IP-pinned
 * fetch if they need full rebinding resistance).
 *
 * Checks performed:
 *  - Protocol is http: or https:
 *  - Hostname is not on the BANNED_HOSTNAMES literal list
 *  - If hostname is a literal IPv4 / IPv6: the IP is not in a banned range
 *  - Otherwise: every DNS-resolved address (A and AAAA) is public
 */
export async function assertSafeExternalUrl(rawUrl: string): Promise<{ resolvedAddresses: string[] }> {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new Error('SSRF: invalid URL');
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error('SSRF: only http/https allowed');
  }
  const hostname = parsed.hostname.replace(/^\[|\]$/g, '').toLowerCase(); // strip [ipv6] brackets
  if (BANNED_HOSTNAMES.has(hostname)) {
    throw new Error('SSRF: banned hostname');
  }

  // If hostname is a literal IP, check it directly. If not, resolve DNS.
  const ipFamily = net.isIP(hostname);
  let addresses: string[] = [];
  if (ipFamily === 4) {
    if (isPrivateIPv4(hostname)) throw new Error('SSRF: private IPv4');
    addresses = [hostname];
  } else if (ipFamily === 6) {
    if (isPrivateIPv6(hostname)) throw new Error('SSRF: private IPv6');
    addresses = [hostname];
  } else {
    // Resolve A + AAAA. Either type returning a banned IP fails the check.
    try {
      const records = await dns.lookup(hostname, { all: true, verbatim: true });
      if (!records.length) throw new Error('SSRF: DNS returned no records');
      for (const r of records) {
        if (r.family === 4 && isPrivateIPv4(r.address)) {
          throw new Error('SSRF: hostname resolves to private IPv4');
        }
        if (r.family === 6 && isPrivateIPv6(r.address)) {
          throw new Error('SSRF: hostname resolves to private IPv6');
        }
        addresses.push(r.address);
      }
    } catch (err: any) {
      if (typeof err?.message === 'string' && err.message.startsWith('SSRF:')) throw err;
      throw new Error(`SSRF: DNS lookup failed: ${err?.code ?? 'unknown'}`);
    }
  }

  return { resolvedAddresses: addresses };
}

/**
 * Allowlist for the /api/img proxy. The proxy fetches by URL so the user
 * never types the host directly: we control which hosts are reachable.
 * Add a host here only if (a) we already serve images from it or (b) a
 * partner CDN we explicitly want to optimize through Sharp.
 */
export const ALLOWED_IMG_HOSTS = [
  'assets.regencivics.earth',
  'regencivics.earth',
  'regencivics.com',
];

/**
 * Test whether a URL's hostname is on the static allowlist (exact match
 * or any subdomain). Returns the parsed URL on success, or null if the
 * URL is invalid or the host is not allowlisted.
 */
export function checkAllowlistedHost(rawUrl: string, allowlist: string[]): URL | null {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return null;
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
  const host = parsed.hostname.toLowerCase();
  for (const allowed of allowlist) {
    if (host === allowed || host.endsWith(`.${allowed}`)) return parsed;
  }
  return null;
}
