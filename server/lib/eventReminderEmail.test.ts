import { describe, expect, it } from "vitest";
import { JOIN_URL, RIVERSIDE_ROOM_URL } from "@shared/sessionLinks";
import { CALL_START_OFFSET_MINUTES } from "@shared/eventAutoReminders";
import {
  buildAutoReminderHtml,
  reminderJoinLabel,
  reminderJoinUrl,
  reminderUnsubscribeUrl,
} from "./eventReminderEmail";

describe("buildAutoReminderHtml", () => {
  it("includes the lead, title, join path, and manage-preferences footer", () => {
    const html = buildAutoReminderHtml({
      title: "Week 1: Selection Day",
      startTime: new Date("2026-09-26T18:00:00Z"),
      description: "Meet the cohort.",
      joinUrl: "https://riverside.fm/studio/regen",
      offsetMinutes: 24 * 60,
      preferencesUrl: "https://regencivics.earth/email-preferences?token=abc&mute=season2",
    });
    expect(html).toContain("Week 1: Selection Day");
    expect(html).toContain("Starting in about 24 hours");
    expect(html).toContain("https://riverside.fm/studio/regen");
    expect(html).toContain("Join the call");
    expect(html).toContain("https://regencivics.earth/email-preferences?token=abc&amp;mute=season2");
    expect(html).toContain("Manage email preferences");
    expect(html).not.toMatch(/>Unsubscribe</);
    expect(html).toContain("You are receiving this as a reminder for this event.");
    expect(html).not.toContain("—");
  });

  it("names the session, Pacific time, and join link on the 33-minute ping", () => {
    const html = buildAutoReminderHtml({
      title: "Open Access Session",
      startTime: new Date("2026-09-26T18:00:00Z"),
      joinUrl: JOIN_URL,
      offsetMinutes: CALL_START_OFFSET_MINUTES,
      preferencesUrl: "https://regencivics.earth/email-preferences?token=abc&mute=open_access",
    });
    expect(html).toContain("Open Access Session");
    expect(html).toContain("Starting in 33 minutes");
    expect(html).toContain("Saturday, September 26, 2026");
    expect(html).toContain("11:00 AM PDT");
    expect(html).toContain(JOIN_URL);
    expect(html).toContain("Join the call");
    expect(html).toContain("Manage email preferences");
    expect(html).not.toContain("—");
  });

  it("escapes HTML in the title and body", () => {
    const html = buildAutoReminderHtml({
      title: "<script>alert(1)</script>",
      startTime: new Date("2026-09-26T18:00:00Z"),
      bodyText: "<b>hi</b>",
      joinUrl: "",
      offsetMinutes: 60,
      preferencesUrl: "https://regencivics.earth/email-preferences?token=abc",
    });
    expect(html).toContain("&lt;script&gt;");
    expect(html).not.toContain("<script>alert(1)</script>");
    expect(html).toContain("&lt;b&gt;hi&lt;/b&gt;");
  });
});

describe("reminderJoinUrl", () => {
  it("keeps a custom room, uses Zoom when that is what is stored, and falls back to /join", () => {
    expect(reminderJoinUrl({ riversideRoomUrl: "https://riverside.com/studio/custom" })).toBe(
      "https://riverside.com/studio/custom",
    );
    expect(reminderJoinUrl({ riversideRoomUrl: null, zoomUrl: "https://zoom.us/j/123" })).toBe(
      "https://zoom.us/j/123",
    );
    expect(reminderJoinUrl({ riversideRoomUrl: null, zoomUrl: null })).toBe(JOIN_URL);
    expect(reminderJoinUrl({ riversideRoomUrl: RIVERSIDE_ROOM_URL })).toBe(JOIN_URL);
    expect(reminderJoinLabel("https://zoom.us/j/123")).toBe("Join on Zoom");
    expect(reminderJoinLabel(JOIN_URL)).toBe("Join the call");
  });
});

describe("reminderUnsubscribeUrl", () => {
  it("uses the schedule cancel link for event signups and the prefs page for lists", () => {
    expect(reminderUnsubscribeUrl("ada@farm.example", 9, "event_signup")).toContain(
      "/schedule?unsubscribe=9&email=ada%40farm.example",
    );
    expect(reminderUnsubscribeUrl("ada@farm.example", 9, "list")).toContain("/email-preferences");
  });
});
