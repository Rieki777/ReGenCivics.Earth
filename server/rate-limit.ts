/**
 * Rate Limiting for Form Submissions
 * Sliding-window rate limiter backed by Redis when available.
 * Falls back to an in-memory Map when Redis is not connected.
 * Limits form submissions per IP address to prevent spam.
 */
import { TRPCError } from "@trpc/server";
import type { TrpcContext } from "./_core/context";
import { redisRateLimit, isCacheAvailable } from "./cache";

// Configuration
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15-minute sliding window
const MAX_SUBMISSIONS_PER_WINDOW = 7;

/**
 * Per-action limits. The default of 7 per 15 minutes fits one-shot form
 * submissions, but a conversation is many small turns: the Gardener's land
 * application runs 15 to 30 turns, the First Mate's intake about 10, and a
 * talk with an Elder has no fixed length. Without these overrides every
 * conversational character died mid-sentence at turn 8. Caps stay tight
 * enough to stop scripted abuse (a human turn takes 10+ seconds anyway).
 */
const ACTION_LIMITS: Record<string, number> = {
  companion_turn: 60,        // one full application conversation, with room to wander
  companion_transcribe: 60,  // one STT call per spoken answer tracks turn volume
  companion_tts: 120,        // one hosted synthesis per spoken reply; capped text + server cache bound the spend
  design_companion: 60,      // crowdpool campaign design coaching is many small turns

  elder_chat: 40,
  ship_concierge_chat: 40,
  ship_shipwright: 20,
  // The Galley remixer is high-frequency: a market haul is many items logged in a
  // row, and remixing, rolling, and asking the Cook are the whole point. The
  // one-shot default of 7 would block a crew mid-haul. Caps stay tight enough to
  // stop scripted abuse.
  ship_galley_item: 60,   // logging a full market haul, one item at a time
  ship_galley_remix: 60,  // remix + Roll the Tide, tapped repeatedly
  ship_galley_cook: 30,   // LLM-backed, so a touch tighter
  ship_galley_haul: 15,
  ship_galley_publish: 15,

  // Free Voyage Giveaway public entry layer. Entry is idempotent (one email = one
  // entry), so a slightly higher cap tolerates shared networks without letting a
  // script farm the list. verify/tag/bonus act on an existing entry via its token.
  ship_giveaway_enter: 12,
  ship_giveaway_verify: 20,
  ship_giveaway_tag: 20,
  ship_giveaway_bonus: 20,

  // Funding application engine. Each run is one complex-tier LLM call, so the
  // cap bounds spend and stops an accidental regenerate loop. Admin-only and
  // deliberate work, so 10 per 15 minutes is well above a real working session.
  funding_generate: 10,

  // Cooperative interest form (public, no account). One submission per
  // person is the norm; a few retries cover typos without letting a script
  // fill the table.
  coop_interest: 5,

  // Offer status links (build spec 2026-09-27, section 10.2). Anyone holding
  // a link can open it, so reads get room for a few reloads across devices
  // and writes (withdraw, a note to the stewards) stay tight. A note is also
  // capped at 5 per offer per 24 hours, counted in the database.
  offer_status_view: 60,
  offer_status_write: 10,
};

function maxForAction(action: string): number {
  return ACTION_LIMITS[action] ?? MAX_SUBMISSIONS_PER_WINDOW;
}

// ── In-memory fallback (single-process only) ─────────────────────────────────
interface RateLimitEntry {
  timestamps: number[];
  /** The window this entry counts over, so the sweep keeps longer windows whole. */
  windowMs: number;
}
const memoryStore = new Map<string, RateLimitEntry>();
/** checkKeyedLimit's entries: any key (an email hash, say), any window. */
const keyedStore = new Map<string, RateLimitEntry>();

// Clean up the in-memory stores every 10 minutes
const sweep = setInterval(() => {
  const now = Date.now();
  for (const store of [memoryStore, keyedStore]) {
    Array.from(store.entries()).forEach(([key, entry]) => {
      entry.timestamps = entry.timestamps.filter(
        (ts: number) => now - ts < entry.windowMs
      );
      if (entry.timestamps.length === 0) {
        store.delete(key);
      }
    });
  }
}, 10 * 60 * 1000);
sweep.unref?.();

function memoryRateLimit(
  key: string,
  max: number = MAX_SUBMISSIONS_PER_WINDOW,
  windowMs: number = RATE_LIMIT_WINDOW_MS,
  store: Map<string, RateLimitEntry> = memoryStore
): { allowed: boolean; count: number; resetAt: number } {
  const now = Date.now();
  let entry = store.get(key);
  if (!entry) {
    entry = { timestamps: [], windowMs };
    store.set(key, entry);
  }
  entry.windowMs = windowMs;

  entry.timestamps = entry.timestamps.filter(
    (ts) => now - ts < windowMs
  );

  const count = entry.timestamps.length;
  const allowed = count < max;
  const oldestTs = entry.timestamps[0] ?? now;
  const resetAt = oldestTs + windowMs;

  if (allowed) {
    entry.timestamps.push(now);
  }

  return { allowed, count: allowed ? count + 1 : count, resetAt };
}

// ── IP extraction ─────────────────────────────────────────────────────────────
function getClientIp(req: TrpcContext["req"]): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string") {
    return forwarded.split(",")[0].trim();
  }
  if (Array.isArray(forwarded)) {
    return forwarded[0].trim();
  }
  return req.socket?.remoteAddress || "unknown";
}

// ── Public API ────────────────────────────────────────────────────────────────
/**
 * Check rate limit for this IP + action combination.
 * Throws TRPCError(TOO_MANY_REQUESTS) when the limit is exceeded.
 * Uses Redis when available, in-memory Map otherwise.
 */
export async function checkRateLimit(
  ctx: TrpcContext,
  action: string = "form_submission"
): Promise<void> {
  const ip = getClientIp(ctx.req);
  const key = `ratelimit:${ip}:${action}`;
  const max = maxForAction(action);

  let allowed: boolean;
  let resetAt: number;

  if (isCacheAvailable()) {
    ({ allowed, resetAt } = await redisRateLimit(
      key,
      max,
      RATE_LIMIT_WINDOW_MS
    ));
  } else {
    ({ allowed, resetAt } = memoryRateLimit(key, max, RATE_LIMIT_WINDOW_MS));
  }

  if (!allowed) {
    const minutesRemaining = Math.max(
      1,
      Math.ceil((resetAt - Date.now()) / 60_000)
    );
    throw new TRPCError({
      code: "TOO_MANY_REQUESTS",
      message: `You've reached the maximum number of submissions (${max} per 15 minutes). Please try again in about ${minutesRemaining} minute${minutesRemaining !== 1 ? "s" : ""}. If you believe this is an error, please contact us directly.`,
    });
  }
}

/**
 * A sliding-window limit on any key (Redis when connected, else this process).
 *
 * For limits that are not per IP: the sign-in link counts per email address
 * (server/_core/oauth.ts, 3 per 15 minutes), because one address can be asked
 * for from many networks. Callers pass a key that holds no personal data (a
 * SHA-256 of the address, never the address), since it lands in Redis.
 *
 * retryAfterMs is how long until one more request would pass: in this process,
 * until the oldest counted request leaves the window. Redis (redisRateLimit)
 * also counts refused requests, so there it is the whole window, which is how
 * long a caller has to wait without trying. Never throws: a Redis error fails
 * open, the same as checkRateLimit.
 */
export async function checkKeyedLimit(
  key: string,
  max: number,
  windowMs: number
): Promise<{ allowed: boolean; retryAfterMs: number }> {
  const { allowed, resetAt } = isCacheAvailable()
    ? await redisRateLimit(key, max, windowMs)
    : memoryRateLimit(key, max, windowMs, keyedStore);
  return { allowed, retryAfterMs: allowed ? 0 : Math.max(0, resetAt - Date.now()) };
}

/** Tests only: forget every in-process keyed limit. */
export function __resetKeyedLimitsForTests(): void {
  keyedStore.clear();
}

/**
 * Get rate limit stats for monitoring (admin use).
 * Returns in-memory stats only. Redis stats should be read from Redis directly.
 */
export function getRateLimitStats(): {
  backend: "redis" | "memory";
  totalTrackedIPs: number;
  entries: Array<{ key: string; count: number; oldestSubmission: Date }>;
} {
  const now = Date.now();
  const entries: Array<{
    key: string;
    count: number;
    oldestSubmission: Date;
  }> = [];

  for (const [key, entry] of Array.from(memoryStore.entries())) {
    const active = entry.timestamps.filter(
      (ts: number) => now - ts < RATE_LIMIT_WINDOW_MS
    );
    if (active.length > 0) {
      entries.push({
        key,
        count: active.length,
        oldestSubmission: new Date(active[0]),
      });
    }
  }

  return {
    backend: isCacheAvailable() ? "redis" : "memory",
    totalTrackedIPs: entries.length,
    entries,
  };
}
