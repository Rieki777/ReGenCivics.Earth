/**
 * Rate Limiting for Form Submissions
 * In-memory rate limiter using a sliding window approach.
 * Limits form submissions per IP address to prevent spam.
 */
import { TRPCError } from "@trpc/server";
import type { TrpcContext } from "./_core/context";

interface RateLimitEntry {
  timestamps: number[];
}

// In-memory store for rate limiting (resets on server restart)
const rateLimitStore = new Map<string, RateLimitEntry>();

// Configuration
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour window
const MAX_SUBMISSIONS_PER_WINDOW = 33; // 33 submissions per hour per IP

// Cleanup old entries every 10 minutes
setInterval(() => {
  const now = Date.now();
  Array.from(rateLimitStore.entries()).forEach(([key, entry]) => {
    entry.timestamps = entry.timestamps.filter(
      (ts: number) => now - ts < RATE_LIMIT_WINDOW_MS
    );
    if (entry.timestamps.length === 0) {
      rateLimitStore.delete(key);
    }
  });
}, 10 * 60 * 1000);

/**
 * Get the client IP from the request, handling proxies
 */
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

/**
 * Check if a request is rate limited.
 * Returns true if the request should be allowed, throws if rate limited.
 */
export function checkRateLimit(
  ctx: TrpcContext,
  action: string = "form_submission"
): void {
  const ip = getClientIp(ctx.req);
  const key = `${ip}:${action}`;
  const now = Date.now();

  let entry = rateLimitStore.get(key);
  if (!entry) {
    entry = { timestamps: [] };
    rateLimitStore.set(key, entry);
  }

  // Remove timestamps outside the window
  entry.timestamps = entry.timestamps.filter(
    (ts) => now - ts < RATE_LIMIT_WINDOW_MS
  );

  // Check if over limit
  if (entry.timestamps.length >= MAX_SUBMISSIONS_PER_WINDOW) {
    const oldestTimestamp = entry.timestamps[0];
    const resetTime = new Date(oldestTimestamp + RATE_LIMIT_WINDOW_MS);
    const minutesRemaining = Math.ceil(
      (resetTime.getTime() - now) / (60 * 1000)
    );

    throw new TRPCError({
      code: "TOO_MANY_REQUESTS",
      message: `You've reached the maximum number of submissions (${MAX_SUBMISSIONS_PER_WINDOW} per hour). Please try again in about ${minutesRemaining} minute${minutesRemaining !== 1 ? "s" : ""}. If you believe this is an error, please contact us directly.`,
    });
  }

  // Record this submission
  entry.timestamps.push(now);
}

/**
 * Get rate limit stats for monitoring (admin use)
 */
export function getRateLimitStats(): {
  totalTrackedIPs: number;
  entries: Array<{ key: string; count: number; oldestSubmission: Date }>;
} {
  const now = Date.now();
  const entries: Array<{
    key: string;
    count: number;
    oldestSubmission: Date;
  }> = [];

  Array.from(rateLimitStore.entries()).forEach(([key, entry]) => {
    const activeTimestamps = entry.timestamps.filter(
      (ts: number) => now - ts < RATE_LIMIT_WINDOW_MS
    );
    if (activeTimestamps.length > 0) {
      entries.push({
        key,
        count: activeTimestamps.length,
        oldestSubmission: new Date(activeTimestamps[0]),
      });
    }
  });

  return {
    totalTrackedIPs: entries.length,
    entries,
  };
}
