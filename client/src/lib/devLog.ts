/**
 * devLog, gated console logging utility
 *
 * Strips diagnostic logs from production builds. In dev/preview, logs flow as
 * usual. In production, log/info/debug become no-ops while warn/error still
 * pass through (you typically still want those visible to users with devtools
 * open and to be picked up by Sentry once wired).
 *
 * Usage:
 *   import { devLog } from "@/lib/devLog";
 *   devLog.log("[forum] loaded posts", count);
 *   devLog.warn("user fallback applied");
 *   devLog.error("write failed", err);
 */

const isDev = typeof import.meta !== "undefined" && Boolean(import.meta.env?.DEV);

const noop = (..._args: unknown[]): void => {};

export const devLog = {
  log: isDev ? console.log.bind(console) : noop,
  info: isDev ? console.info.bind(console) : noop,
  debug: isDev ? console.debug.bind(console) : noop,
  // warn/error always pass through so genuine problems remain visible / Sentry-shippable.
  warn: console.warn.bind(console),
  error: console.error.bind(console),
};
