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

// ── In-memory fallback (single-process only) ─────────────────────────────────
interface RateLimitEntry {
  timestamps: number[];
}
const memoryStore = new Map<string, RateLimitEntry>();

// Clean up the in-memory store every 10 minutes
setInterval(() => {
  const now = Date.now();
  Array.from(memoryStore.entries()).forEach(([key, entry]) => {
    entry.timestamps = entry.timestamps.filter(
      (ts: number) => now - ts < RATE_LIMIT_WINDOW_MS
    );
    if (entry.timestamps.length === 0) {
      memoryStore.delete(key);
    }
  });
}, 10 * 60 * 1000);

function memoryRateLimit(
  key: string
): { allowed: boolean; count: number; resetAt: number } {
  const now = Date.now();
  let entry = memoryStore.get(key);
  if (!entry) {
    entry = { timestamps: [] };
    memoryStore.set(key, entry);
  }

  entry.timestamps = entry.timestamps.filter(
    (ts) => now - ts < RATE_LIMIT_WINDOW_MS
  );

  const count = entry.timestamps.length;
  const allowed = count < MAX_SUBMISSIONS_PER_WINDOW;
  const oldestTs = entry.timestamps[0] ?? now;
  const resetAt = oldestTs + RATE_LIMIT_WINDOW_MS;

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

  let allowed: boolean;
  let resetAt: number;

  if (isCacheAvailable()) {
    ({ allowed, resetAt } = await redisRateLimit(
      key,
      MAX_SUBMISSIONS_PER_WINDOW,
      RATE_LIMIT_WINDOW_MS
    ));
  } else {
    ({ allowed, resetAt } = memoryRateLimit(key));
  }

  if (!allowed) {
    const minutesRemaining = Math.max(
      1,
      Math.ceil((resetAt - Date.now()) / 60_000)
    );
    throw new TRPCError({
      code: "TOO_MANY_REQUESTS",
      message: `You've reached the maximum number of submissions (${MAX_SUBMISSIONS_PER_WINDOW} per 15 minutes). Please try again in about ${minutesRemaining} minute${minutesRemaining !== 1 ? "s" : ""}. If you believe this is an error, please contact us directly.`,
    });
  }
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
