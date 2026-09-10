import { describe, expect, it } from "vitest";
import { buildAutoReminderHtml, reminderUnsubscribeUrl } from "./eventReminderEmail";

describe("buildAutoReminderHtml", () => {
  it("includes the lead, title, join path, and unsubscribe footer", () => {
    const html = buildAutoReminderHtml({
      title: "Week 1: Selection Day",
      startTime: new Date("2026-09-26T18:00:00Z"),
      description: "Meet the cohort.",
      joinUrl: "https://riverside.fm/studio/regen",
      offsetMinutes: 24 * 60,
      unsubscribeUrl: "https://regencivics.earth/unsubscribe",
    });
    expect(html).toContain("Week 1: Selection Day");
    expect(html).toContain("Starting in about 24 hours");
    expect(html).toContain("https://riverside.fm/studio/regen");
    expect(html).toContain("https://regencivics.earth/unsubscribe");
    expect(html).toContain("You are receiving this as a reminder for this event.");
    expect(html).not.toContain("—");
  });

  it("escapes HTML in the title and body", () => {
    const html = buildAutoReminderHtml({
      title: "<script>alert(1)</script>",
      startTime: new Date("2026-09-26T18:00:00Z"),
      bodyText: "<b>hi</b>",
      joinUrl: "",
      offsetMinutes: 60,
      unsubscribeUrl: "https://regencivics.earth/unsubscribe",
    });
    expect(html).toContain("&lt;script&gt;");
    expect(html).not.toContain("<script>alert(1)</script>");
    expect(html).toContain("&lt;b&gt;hi&lt;/b&gt;");
  });
});

describe("reminderUnsubscribeUrl", () => {
  it("uses the schedule unsubscribe for event signups and /unsubscribe for lists", () => {
    expect(reminderUnsubscribeUrl("ada@farm.example", 9, "event_signup")).toContain(
      "/schedule?unsubscribe=9&email=ada%40farm.example",
    );
    expect(reminderUnsubscribeUrl("ada@farm.example", 9, "list")).toContain("/unsubscribe");
  });
});
