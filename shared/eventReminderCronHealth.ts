/**
 * Event-reminder cron health — pure helpers for Admin Events / Overview.
 * Schedule is known from code (Railway hourly + in-process sweep).
 * Last cron OK is persisted cheaply via site_settings (no new table).
 * Last delivery comes from real event_auto_reminder_sends rows — never invent.
 */

import { AUTO_REMINDER_SWEEP_MINUTES } from "./eventAutoReminders";

/** Railway cron: POST /api/cron/event-reminders every hour at minute 0 (UTC). */
export const EVENT_REMINDER_CRON_EXPR = "0 * * * *";
export const EVENT_REMINDER_CRON_PATH = "/api/cron/event-reminders";
/** site_settings key: ISO timestamp of last successful HTTP cron completion. */
export const EVENT_REMINDER_CRON_LAST_OK_KEY = "event_reminders.last_cron_ok_at";

/** Stale if last HTTP cron success is older than this (2 missed hours + slack). */
export const EVENT_REMINDER_CRON_STALE_MS = 2.5 * 60 * 60 * 1000;

export type EventReminderCronStatus =
  | "unconfigured"
  | "not_tracked_yet"
  | "ok"
  | "stale";

export type EventReminderCronHealthInput = {
  cronSecretConfigured: boolean;
  lastCronOkAt: string | null;
  lastDeliveryAt: string | null;
  enabledAutoReminderEvents: number;
  nowMs?: number;
};

export type EventReminderCronHealth = {
  cronSecretConfigured: boolean;
  status: EventReminderCronStatus;
  scheduleCron: string;
  scheduleNote: string;
  inProcessSweepMinutes: number;
  endpoint: string;
  nextCronAt: string;
  lastCronOkAt: string | null;
  lastDeliveryAt: string | null;
  enabledAutoReminderEvents: number;
};

/** Next top-of-hour UTC (Railway cron minute-0). */
export function nextHourlyCronAt(now: Date = new Date()): Date {
  const next = new Date(now.getTime());
  next.setUTCSeconds(0, 0);
  next.setUTCMilliseconds(0);
  next.setUTCMinutes(0);
  if (next.getTime() <= now.getTime()) {
    next.setUTCHours(next.getUTCHours() + 1);
  }
  return next;
}

export function parseIsoTimestamp(value: string | null | undefined): string | null {
  if (!value || !value.trim()) return null;
  const ms = Date.parse(value.trim());
  if (!Number.isFinite(ms)) return null;
  return new Date(ms).toISOString();
}

export function classifyEventReminderCronStatus(
  cronSecretConfigured: boolean,
  lastCronOkAt: string | null,
  nowMs: number = Date.now(),
): EventReminderCronStatus {
  if (!cronSecretConfigured) return "unconfigured";
  if (!lastCronOkAt) return "not_tracked_yet";
  const ms = Date.parse(lastCronOkAt);
  if (!Number.isFinite(ms)) return "not_tracked_yet";
  if (nowMs - ms > EVENT_REMINDER_CRON_STALE_MS) return "stale";
  return "ok";
}

export function buildEventReminderCronHealth(
  input: EventReminderCronHealthInput,
): EventReminderCronHealth {
  const nowMs = input.nowMs ?? Date.now();
  const lastCronOkAt = parseIsoTimestamp(input.lastCronOkAt);
  const lastDeliveryAt = parseIsoTimestamp(input.lastDeliveryAt);
  return {
    cronSecretConfigured: input.cronSecretConfigured,
    status: classifyEventReminderCronStatus(
      input.cronSecretConfigured,
      lastCronOkAt,
      nowMs,
    ),
    scheduleCron: EVENT_REMINDER_CRON_EXPR,
    scheduleNote:
      "Railway cron runs hourly at minute 0 (UTC). An in-process sweep also runs for short offsets.",
    inProcessSweepMinutes: AUTO_REMINDER_SWEEP_MINUTES,
    endpoint: EVENT_REMINDER_CRON_PATH,
    nextCronAt: nextHourlyCronAt(new Date(nowMs)).toISOString(),
    lastCronOkAt,
    lastDeliveryAt,
    enabledAutoReminderEvents: Math.max(0, Math.floor(input.enabledAutoReminderEvents || 0)),
  };
}
