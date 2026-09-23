import { describe, expect, it } from "vitest";
import {
  EVENT_REMINDER_CRON_EXPR,
  EVENT_REMINDER_CRON_STALE_MS,
  buildEventReminderCronHealth,
  classifyEventReminderCronStatus,
  nextHourlyCronAt,
  parseIsoTimestamp,
} from "./eventReminderCronHealth";

describe("eventReminderCronHealth", () => {
  it("computes next hourly UTC boundary", () => {
    const now = new Date("2026-09-23T14:17:30.000Z");
    expect(nextHourlyCronAt(now).toISOString()).toBe("2026-09-23T15:00:00.000Z");
    const onHour = new Date("2026-09-23T15:00:00.000Z");
    expect(nextHourlyCronAt(onHour).toISOString()).toBe("2026-09-23T16:00:00.000Z");
  });

  it("parses ISO timestamps and rejects junk", () => {
    expect(parseIsoTimestamp("2026-09-23T12:00:00.000Z")).toBe("2026-09-23T12:00:00.000Z");
    expect(parseIsoTimestamp("  ")).toBeNull();
    expect(parseIsoTimestamp("not-a-date")).toBeNull();
  });

  it("classifies configured / not tracked / ok / stale honestly", () => {
    const now = Date.parse("2026-09-23T12:00:00.000Z");
    expect(classifyEventReminderCronStatus(false, null, now)).toBe("unconfigured");
    expect(classifyEventReminderCronStatus(true, null, now)).toBe("not_tracked_yet");
    expect(
      classifyEventReminderCronStatus(true, "2026-09-23T11:00:00.000Z", now),
    ).toBe("ok");
    expect(
      classifyEventReminderCronStatus(
        true,
        new Date(now - EVENT_REMINDER_CRON_STALE_MS - 1).toISOString(),
        now,
      ),
    ).toBe("stale");
  });

  it("builds a full health payload without inventing deliveries", () => {
    const nowMs = Date.parse("2026-09-23T14:30:00.000Z");
    const health = buildEventReminderCronHealth({
      cronSecretConfigured: true,
      lastCronOkAt: null,
      lastDeliveryAt: "2026-09-22T18:00:00.000Z",
      enabledAutoReminderEvents: 3,
      nowMs,
    });
    expect(health.scheduleCron).toBe(EVENT_REMINDER_CRON_EXPR);
    expect(health.status).toBe("not_tracked_yet");
    expect(health.lastCronOkAt).toBeNull();
    expect(health.lastDeliveryAt).toBe("2026-09-22T18:00:00.000Z");
    expect(health.nextCronAt).toBe("2026-09-23T15:00:00.000Z");
    expect(health.enabledAutoReminderEvents).toBe(3);
    expect(health.inProcessSweepMinutes).toBe(5);
  });
});
