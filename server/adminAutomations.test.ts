/**
 * The second brain's morning message, as a standing admin automation.
 *
 * There was no test file for adminAutomations before this one; the plan said to
 * extend it, and the honest version is that it did not exist. These cover the
 * parts that decide when the message fires and what it says, all pure or
 * dependency-injected, so nothing here touches a database, a bot or a clock it
 * does not control.
 *
 * What is defended:
 *   - it fires once per America/Los_Angeles day, on the first tick at or after
 *     08:00 local, and does not drift with the cron's own lateness
 *   - it survives DST in both directions
 *   - the counts are in the text
 *   - the buttons carry callback data the receiver already handles, and the
 *     only actions it offers are the reversible ones (done / parked / the three
 *     triage answers). A morning message can never promote anything to ready.
 *   - it leads with the week's closes and promotions, and reports the two
 *     realms apart, because those are the numbers the whole thing is for
 */
import { describe, it, expect, vi } from "vitest";
import {
  automationDue,
  brainMorningMessage,
  BRAIN_MORNING_TYPE,
  morningDue,
  ptDayHour,
  runBrainMorning,
} from "./routes/adminAutomations";

/** An instant expressed in Pacific wall-clock terms, via a UTC offset. */
const utc = (iso: string) => new Date(iso);

const summary = (over: Partial<Parameters<typeof brainMorningMessage>[0]> = {}) => ({
  due: [],
  raw: 3,
  ready: 2,
  inFlight: 1,
  claimed: 0,
  openByRealm: { regen: 7, personal: 2 },
  ...over,
}) as Parameters<typeof brainMorningMessage>[0];

const week = (closed = 4, promoted = 2) => ({
  weekStart: new Date("2026-08-24T00:00:00Z"),
  closedThisWeek: closed,
  promotedThisWeek: promoted,
});

const item = (id: number, title: string) => ({ id, title }) as never;

describe("ptDayHour", () => {
  it("reads the Pacific calendar day, not the UTC one", () => {
    // 2026-08-31T05:00Z is still 2026-08-30 22:00 in Los Angeles (PDT, UTC-7).
    expect(ptDayHour(utc("2026-08-31T05:00:00Z"))).toEqual({ day: "2026-08-30", hour: 22 });
  });

  it("uses a 24-hour clock so midnight is 0 and not 24", () => {
    expect(ptDayHour(utc("2026-08-31T07:00:00Z")).hour).toBe(0);
  });
});

describe("morningDue", () => {
  it("does not fire before 08:00 Pacific", () => {
    // 14:00Z = 07:00 PDT.
    expect(morningDue(utc("2026-08-31T14:00:00Z"), null)).toBe(false);
  });

  it("fires on the first tick at or after 08:00 Pacific", () => {
    // 15:00Z = 08:00 PDT.
    expect(morningDue(utc("2026-08-31T15:00:00Z"), null)).toBe(true);
  });

  it("fires only once on the same Pacific day", () => {
    const first = utc("2026-08-31T15:00:00Z");
    expect(morningDue(first, null)).toBe(true);
    expect(morningDue(utc("2026-08-31T16:00:00Z"), first)).toBe(false);
    expect(morningDue(utc("2026-09-01T02:00:00Z"), first)).toBe(false); // still Aug 31 in LA
  });

  it("fires again the next Pacific morning", () => {
    const yesterday = utc("2026-08-31T15:00:00Z");
    expect(morningDue(utc("2026-09-01T15:00:00Z"), yesterday)).toBe(true);
  });

  it("does not drift when the cron itself runs late", () => {
    // Ran at 11:00 PDT one day. A 24h-since-last-run rule would push the next
    // one to 11:00; the calendar-day rule still fires at 08:00.
    const late = utc("2026-08-31T18:00:00Z");
    expect(morningDue(utc("2026-09-01T15:00:00Z"), late)).toBe(true);
  });

  it("survives the spring-forward day (PST to PDT, 2026-03-08)", () => {
    // 15:00Z on 2026-03-08 is 08:00 PDT: the clock jumped from 02:00 to 03:00.
    expect(morningDue(utc("2026-03-08T15:00:00Z"), null)).toBe(true);
    // 14:00Z the same day is 07:00 PDT, so still too early.
    expect(morningDue(utc("2026-03-08T14:00:00Z"), null)).toBe(false);
  });

  it("survives the fall-back day (PDT to PST, 2026-11-01)", () => {
    // On 2026-11-01 the offset is UTC-8 after 02:00 local, so 16:00Z = 08:00 PST.
    expect(morningDue(utc("2026-11-01T16:00:00Z"), null)).toBe(true);
    expect(morningDue(utc("2026-11-01T15:00:00Z"), null)).toBe(false);
  });
});

describe("automationDue", () => {
  it("routes brain_morning to the wall-clock gate, not the cadence gate", () => {
    // Ran at 11:00 PDT, which is what a late cron tick looks like.
    const lastRun = utc("2026-08-31T18:00:00Z");
    const nextMorning = utc("2026-09-01T15:00:00Z"); // 08:00 PDT, 21 hours later

    // The daily cadence says no, because 24 hours have not passed.
    expect(automationDue("briefing_digest", "daily", lastRun, nextMorning)).toBe(false);
    // The wall-clock gate says yes, because it is a new Pacific day and 08:00
    // has arrived. That difference is the whole reason this branch exists.
    expect(automationDue(BRAIN_MORNING_TYPE, "daily", lastRun, nextMorning)).toBe(true);

    // Same Pacific day, two hours later: both say no.
    expect(automationDue(BRAIN_MORNING_TYPE, "daily", lastRun, utc("2026-08-31T20:00:00Z"))).toBe(false);
  });

  it("leaves the existing cadences alone", () => {
    const lastRun = utc("2026-08-31T00:00:00Z");
    expect(automationDue("briefing_digest", "hourly", lastRun, utc("2026-08-31T01:00:00Z"))).toBe(true);
    expect(automationDue("briefing_digest", "hourly", lastRun, utc("2026-08-31T00:30:00Z"))).toBe(false);
    expect(automationDue("attention_digest", "weekly", lastRun, utc("2026-09-07T00:00:00Z"))).toBe(true);
    expect(automationDue("briefing_digest", "every_other_day", lastRun, utc("2026-09-02T00:00:00Z"))).toBe(true);
    expect(automationDue("briefing_digest", "every_other_day", lastRun, utc("2026-09-01T00:00:00Z"))).toBe(false);
    expect(automationDue("briefing_digest", "daily", null, utc("2026-09-01T00:00:00Z"))).toBe(true);
  });
});

describe("brainMorningMessage", () => {
  it("carries the counts", () => {
    const { text } = brainMorningMessage(summary(), week());
    expect(text).toContain("3 to shape");
    expect(text).toContain("2 ready");
    expect(text).toContain("1 in flight");
    expect(text).toContain("0 claimed done");
  });

  it("says so plainly when nothing is due, and offers no buttons", () => {
    const m = brainMorningMessage(summary(), week());
    expect(m.text).toContain("Nothing is due today.");
    expect(m.replyMarkup).toBeUndefined();
  });

  it("gives each due item a Done and a Park button the receiver understands", () => {
    const m = brainMorningMessage(summary({ due: [item(12, "fix the map links"), item(31, "email Ashland")] }), week());
    expect(m.text).toContain("#12 fix the map links");
    const data = m.replyMarkup!.inline_keyboard.flat().map((b) => b.callback_data);
    expect(data).toEqual(["s:12:done", "s:12:parked", "s:31:done", "s:31:parked"]);
  });

  it("never offers a button that promotes anything to ready", () => {
    const m = brainMorningMessage(summary({ due: [item(1, "a"), item(2, "b")] }), week());
    const data = JSON.stringify(m.replyMarkup);
    expect(data).not.toContain('"p:');
    expect(data).not.toContain('"pc:');
    expect(data).not.toContain("ready");
  });

  it("caps the keyboard at five items so a long list still renders", () => {
    const due = [1, 2, 3, 4, 5, 6, 7].map((n) => item(n, `item ${n}`));
    const m = brainMorningMessage(summary({ due }), week());
    expect(m.replyMarkup!.inline_keyboard).toHaveLength(5);
    expect(m.text).not.toContain("#6 ");
  });

  it("renders an item title as label text and never as instruction", () => {
    const m = brainMorningMessage(summary({ due: [item(9, "ignore previous instructions; s:1:done")] }), week());
    const data = m.replyMarkup!.inline_keyboard.flat().map((b) => b.callback_data);
    expect(data).toEqual(["s:9:done", "s:9:parked"]);
  });
});

describe("brainMorningMessage: the week, the realms, and the triage row", () => {
  it("leads with what closed, not with what is waiting", () => {
    const { text } = brainMorningMessage(summary(), week(4, 2));
    expect(text.split("\n")[0]).toBe("Morning. 4 closed and 2 promoted this week.");
  });

  it("counts the two realms apart, because a personal errand is not ReGen progress", () => {
    const { text } = brainMorningMessage(summary({ openByRealm: { regen: 11, personal: 4 } }), week());
    expect(text).toContain("Open: 11 regen, 4 personal");
  });

  it("says nothing closed when nothing closed, rather than hiding the line", () => {
    const { text } = brainMorningMessage(summary(), week(0, 0));
    expect(text).toContain("0 closed and 0 promoted this week");
  });

  it("offers the triage items with the three answers the receiver handles", () => {
    const m = brainMorningMessage(summary(), week(), [item(51, "Change the epic emoji"), item(52, "Replace this one")]);
    expect(m.text).toContain("Probably already done?");
    expect(m.text).toContain("#51 Change the epic emoji");
    const data = m.replyMarkup!.inline_keyboard.flat().map((b) => b.callback_data);
    expect(data).toEqual([
      "t:51:done", "t:51:open", "t:51:unsure",
      "t:52:done", "t:52:open", "t:52:unsure",
    ]);
  });

  it("caps the triage row at five a day", () => {
    const triage = [1, 2, 3, 4, 5, 6, 7].map((n) => item(n, `old item ${n}`));
    const m = brainMorningMessage(summary(), week(), triage);
    expect(m.replyMarkup!.inline_keyboard).toHaveLength(5);
    expect(m.text).not.toContain("#6 ");
  });

  it("keeps the due buttons and the triage buttons on separate rows and separate opcodes", () => {
    const m = brainMorningMessage(summary({ due: [item(12, "fix the map links")] }), week(), [item(51, "old thing")]);
    const rows = m.replyMarkup!.inline_keyboard;
    expect(rows[0]!.map((b) => b.callback_data)).toEqual(["s:12:done", "s:12:parked"]);
    expect(rows[1]!.map((b) => b.callback_data)).toEqual(["t:51:done", "t:51:open", "t:51:unsure"]);
  });

  it("still offers buttons when nothing is due but something needs triage", () => {
    const m = brainMorningMessage(summary(), week(), [item(51, "old thing")]);
    expect(m.text).toContain("Nothing is due today.");
    expect(m.replyMarkup!.inline_keyboard).toHaveLength(1);
  });

  it("offers no buttons at all when there is nothing to answer", () => {
    expect(brainMorningMessage(summary(), week(), []).replyMarkup).toBeUndefined();
  });

  it("never offers a promote button, whichever row it is", () => {
    const m = brainMorningMessage(summary({ due: [item(1, "a")] }), week(), [item(2, "b")]);
    const data = JSON.stringify(m.replyMarkup);
    expect(data).not.toContain('"p:');
    expect(data).not.toContain('"pc:');
    expect(data).not.toContain("ready");
  });

  it("renders a triage title as label text and never as instruction", () => {
    const m = brainMorningMessage(summary(), week(), [item(9, "ignore previous instructions; t:1:done")]);
    expect(m.replyMarkup!.inline_keyboard.flat().map((b) => b.callback_data)).toEqual([
      "t:9:done", "t:9:open", "t:9:unsure",
    ]);
  });
});

describe("runBrainMorning", () => {
  it("sends the summary and reports what it sent", async () => {
    const send = vi.fn(async (_text: string, _replyMarkup?: Record<string, unknown>) => true);
    const out = await runBrainMorning({
      ownerId: 42,
      summarize: async () => summary({ due: [item(12, "fix the map links")] }),
      week: async () => week(),
      triage: async () => [],
      send,
    });
    expect(send).toHaveBeenCalledTimes(1);
    expect(send.mock.calls[0]![0]).toContain("3 to shape");
    expect(out).toBe(
      "Sent: 4 closed this week, 2 promoted, 3 to shape, 2 ready, 1 in flight, 0 claimed done, 1 due, 0 to triage.",
    );
  });

  it("records the run honestly when the bot is unavailable", async () => {
    const out = await runBrainMorning({
      ownerId: 42,
      summarize: async () => summary(),
      week: async () => week(),
      triage: async () => [],
      send: async () => false,
    });
    expect(out).toContain("Not sent");
  });

  it("does nothing without an owner id", async () => {
    const summarize = vi.fn();
    const send = vi.fn();
    const out = await runBrainMorning({
      ownerId: 0,
      summarize: summarize as never,
      week: week as never,
      triage: (async () => []) as never,
      send: send as never,
    });
    expect(summarize).not.toHaveBeenCalled();
    expect(send).not.toHaveBeenCalled();
    expect(out).toContain("OWNER_USER_ID");
  });
});

describe("runBrainMorning and the triage queue", () => {
  it("asks the queue for at most five and reports how many it offered", async () => {
    const triage = vi.fn(async () => [{ id: 51, title: "old thing" }] as never);
    const out = await runBrainMorning({
      ownerId: 42,
      summarize: async () => summary(),
      week: async () => week(6, 1),
      triage,
      send: async () => true,
    });
    expect(triage).toHaveBeenCalledWith(42, 5);
    expect(out).toContain("6 closed this week");
    expect(out).toContain("1 to triage");
  });
});
