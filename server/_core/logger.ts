/**
 * Structured logger for the server.
 *
 * Why this exists: 313+ raw console.log("[Module] ...") calls are scattered
 * across server/. Hard to grep, no consistent format, no leveling, no
 * Sentry breadcrumb integration.
 *
 * This module is the migration target. New code should use it. Existing
 * `console.log("[Tag] message")` patterns should be migrated incrementally
 * (see the audit's item 25 in FIXES_TO_MAKE_2026-04-25_world-class.md);
 * we don't sweep them all in one PR because the risk surface (logging
 * sensitive data, accidentally suppressing critical signals) is wide.
 *
 * Usage:
 *   import { logger } from "server/_core/logger";
 *   const log = logger("auth");
 *   log.info("user signed in", { userId: 42 });
 *   log.warn("OAuth token nearing expiry", { provider: "google" });
 *   log.error("DB connection failed", err);
 *
 * Conventions:
 *   - First arg is a static message string (greppable). Variable data
 *     goes in the second arg, an object.
 *   - Don't log secrets, tokens, full request bodies, or raw cookie
 *     values (per .ai/docs/security/BUILD-PLAYBOOK.md section 10).
 *   - Use redacted user identifiers: { userId: 42 } not { email: "..." }.
 */

type LogLevel = "debug" | "info" | "warn" | "error";
type LogPayload = Record<string, unknown> | undefined;

const LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

// Default to "info" in production, "debug" in dev. LOG_LEVEL env var
// overrides for both. Unknown values fall back to "info".
function activeMinLevel(): number {
  const raw = process.env.LOG_LEVEL?.toLowerCase() as LogLevel | undefined;
  if (raw && raw in LEVEL_PRIORITY) return LEVEL_PRIORITY[raw];
  return process.env.NODE_ENV === "production"
    ? LEVEL_PRIORITY.info
    : LEVEL_PRIORITY.debug;
}

function format(module: string, level: LogLevel, msg: string, payload?: LogPayload) {
  const ts = new Date().toISOString();
  const base = `[${ts}] [${level.toUpperCase()}] [${module}] ${msg}`;
  if (!payload) return base;
  // Stringify safely — drop circular references and Buffer / Function-like
  // values that don't serialize cleanly.
  try {
    return `${base} ${JSON.stringify(payload, (_, v) => {
      if (typeof v === "function") return "[fn]";
      if (typeof v === "bigint") return v.toString();
      return v;
    })}`;
  } catch {
    return `${base} [unserializable payload]`;
  }
}

function emit(level: LogLevel, line: string, err?: unknown) {
  switch (level) {
    case "debug":
    case "info":
      console.log(line);
      return;
    case "warn":
      console.warn(line);
      return;
    case "error":
      // Pass the actual Error through so Sentry's console hook can attach
      // the stack trace. Without this, we'd lose the original error
      // object in the JSON-formatted string.
      if (err instanceof Error) {
        console.error(line, err);
      } else {
        console.error(line);
      }
      return;
  }
}

export type Logger = {
  debug: (msg: string, payload?: LogPayload) => void;
  info: (msg: string, payload?: LogPayload) => void;
  warn: (msg: string, payload?: LogPayload) => void;
  error: (msg: string, err?: unknown, payload?: LogPayload) => void;
  child: (subModule: string) => Logger;
};

export function logger(module: string): Logger {
  const make = (level: LogLevel) => (msg: string, payload?: LogPayload) => {
    if (LEVEL_PRIORITY[level] < activeMinLevel()) return;
    emit(level, format(module, level, msg, payload));
  };
  return {
    debug: make("debug"),
    info: make("info"),
    warn: make("warn"),
    error: (msg, err, payload) => {
      if (LEVEL_PRIORITY.error < activeMinLevel()) return;
      const errMeta = err
        ? {
            ...(payload ?? {}),
            err: err instanceof Error ? { name: err.name, message: err.message } : err,
          }
        : payload;
      emit("error", format(module, "error", msg, errMeta), err);
    },
    child: (sub) => logger(`${module}:${sub}`),
  };
}
