import { describe, expect, it } from "vitest";
import { JOIN_URL, RIVERSIDE_ROOM_URL } from "@shared/sessionLinks";
import { ALWAYS_INCLUDED_FOOTER_TEXT, CALL_START_OFFSET_MINUTES } from "@shared/eventAutoReminders";
import { APP_BASE_URL } from "../_core/email";
import {
  buildAutoReminderHtml,
  buildSignupReminderHtml,
  reminderJoinLabel,
  reminderJoinUrl,
  reminderMuteTopic,
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
    expect(html).toContain(`href="${JOIN_URL}"`);
    expect(html).not.toContain("https://riverside.fm/studio/regen");
    expect(html).toContain("Join the call");
    expect(html).not.toMatch(/Riverside/i);
    expect(html).not.toMatch(/Zoom/i);
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
    expect(html).toContain("Your local time");
    expect(html).toContain("timeanddate.com/worldclock/fixedtime.html");
    expect(html).toContain("iso=20260926T1800");
    expect(html).toContain("p1=1440");
    expect(html).toContain(JOIN_URL);
    expect(html).toContain("Join the call");
    expect(html).toContain("Manage email preferences");
    expect(html).not.toContain("—");
  });

  it("uses /join?e=<id> when eventId is set (still never a raw platform URL)", () => {
    const html = buildAutoReminderHtml({
      title: "Custom room night",
      startTime: new Date("2026-09-26T18:00:00Z"),
      eventId: 77,
      joinUrl: "https://zoom.us/j/should-not-appear",
      offsetMinutes: 60,
      preferencesUrl: "https://regencivics.earth/email-preferences?token=abc",
    });
    expect(html).toContain(`href="${JOIN_URL}?e=77"`);
    expect(html).toContain("Join the call");
    expect(html).not.toContain("https://zoom.us/j/should-not-appear");
    expect(html).not.toMatch(/Zoom/i);
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

describe("buildSignupReminderHtml (cron tomorrow / scheduled-custom path)", () => {
  const prefs = "https://regencivics.earth/email-preferences?token=signup&mute=open_access";

  it("uses the Manage email preferences footer and omits the old signup-only footer", () => {
    const html = buildSignupReminderHtml({
      title: "Open Access Session",
      startTime: new Date("2026-09-26T18:00:00Z"),
      description: "Come say hello.",
      riversideRoomUrl: RIVERSIDE_ROOM_URL,
      zoomUrl: null,
      offsetMinutes: 24 * 60,
      preferencesUrl: prefs,
    });
    expect(html).toContain("Manage email preferences");
    expect(html).toContain("email-preferences?token=signup&amp;mute=open_access");
    expect(html).toContain("You are receiving this as a reminder for this event.");
    expect(html).not.toContain("You signed up for a reminder for this event.");
    expect(html).not.toMatch(/>Unsubscribe</);
    expect(html).not.toContain("Unsubscribe from this event");
  });

  it("labels the join button Join the call and href is /join?e=<id> (no platform names)", () => {
    const html = buildSignupReminderHtml({
      title: "Week 2",
      startTime: new Date("2026-09-26T18:00:00Z"),
      eventId: 12,
      riversideRoomUrl:
        "https://riverside.com/studio/rieki-cordon-riekis-studio?t=243a36b4d9fdbc785c4b",
      zoomUrl: null,
      offsetMinutes: 0,
      preferencesUrl: prefs,
    });
    expect(html).toContain("Join the call");
    expect(html).toContain(`href="${JOIN_URL}?e=12"`);
    expect(html).toContain("/join?e=12");
    expect(html).not.toContain("Join on Riverside");
    expect(html).not.toMatch(/Riverside/i);
    expect(html).not.toMatch(/Zoom/i);
    expect(html).toContain("Upcoming session");
  });

  it("still uses /join?e= and Join the call even when a Zoom URL is stored on the event", () => {
    const html = buildSignupReminderHtml({
      title: "Special call",
      startTime: new Date("2026-09-26T18:00:00Z"),
      eventId: 99,
      riversideRoomUrl: null,
      zoomUrl: "https://zoom.us/j/999",
      offsetMinutes: 0,
      preferencesUrl: prefs,
    });
    expect(html).toContain("Join the call");
    expect(html).toContain(`href="${JOIN_URL}?e=99"`);
    expect(html).not.toContain("Join on Zoom");
    expect(html).not.toContain("https://zoom.us/j/999");
    expect(html).not.toMatch(/Riverside/i);
    expect(html).not.toMatch(/Zoom/i);
  });
});

describe("reminderMuteTopic", () => {
  it("maps OA / Season 2 / custom the way the auto-reminder sweep does", () => {
    expect(reminderMuteTopic({ type: "open" })).toBe("open_access");
    expect(reminderMuteTopic({ type: "episode", season: "Season 2" })).toBe("season2");
    expect(reminderMuteTopic({ type: "special" })).toBe("events");
  });
});

describe("reminderJoinUrl / reminderJoinLabel", () => {
  it("returns plain /join when there is no event id", () => {
    expect(reminderJoinUrl({ riversideRoomUrl: "https://riverside.com/studio/custom" })).toBe(JOIN_URL);
    expect(reminderJoinUrl({ riversideRoomUrl: null, zoomUrl: "https://zoom.us/j/123" })).toBe(JOIN_URL);
    expect(reminderJoinUrl({ riversideRoomUrl: null, zoomUrl: null })).toBe(JOIN_URL);
    expect(reminderJoinUrl({ riversideRoomUrl: RIVERSIDE_ROOM_URL })).toBe(JOIN_URL);
    expect(reminderJoinUrl()).toBe(JOIN_URL);
    expect(JOIN_URL).toContain("/join");
  });

  it("returns /join?e=<id> when eventId is a positive integer (never a raw room URL)", () => {
    expect(
      reminderJoinUrl({
        eventId: 42,
        riversideRoomUrl: "https://riverside.com/studio/custom",
        zoomUrl: "https://zoom.us/j/123",
      }),
    ).toBe(`${JOIN_URL}?e=42`);
    expect(reminderJoinUrl({ eventId: 1 })).toBe(`${JOIN_URL}?e=1`);
  });

  it("ignores non-positive eventId", () => {
    expect(reminderJoinUrl({ eventId: 0 })).toBe(JOIN_URL);
    expect(reminderJoinUrl({ eventId: -3 })).toBe(JOIN_URL);
    expect(reminderJoinUrl({ eventId: null })).toBe(JOIN_URL);
  });

  it("always labels the CTA Join the call (never Riverside or Zoom)", () => {
    expect(reminderJoinLabel("https://zoom.us/j/123")).toBe("Join the call");
    expect(reminderJoinLabel(JOIN_URL)).toBe("Join the call");
    expect(reminderJoinLabel()).toBe("Join the call");
  });
});

describe("buildAutoReminderHtml for someone on the always-include list", () => {
  const html = buildAutoReminderHtml({
    title: "Week 3: Game & Organisation Co-Creation Part 1",
    startTime: new Date("2026-10-10T18:00:00Z"),
    joinUrl: JOIN_URL,
    offsetMinutes: 60,
    alwaysIncluded: true,
  });

  it("says why they get it and gives a way to stop that works", () => {
    expect(html).toContain(ALWAYS_INCLUDED_FOOTER_TEXT);
    expect(html).toContain(`href="${APP_BASE_URL}/connect"`);
  });

  it("leaves out the preferences link, which does nothing without a subscriber row", () => {
    expect(html).not.toContain("Manage email preferences");
    expect(html).not.toContain("You are receiving this as a reminder for this event.");
  });

  it("still carries the session and the join link", () => {
    expect(html).toContain("Week 3: Game &amp; Organisation Co-Creation Part 1");
    expect(html).toContain(`href="${JOIN_URL}"`);
    expect(html).toContain("Starting in about an hour");
    expect(html).not.toContain("—");
  });

  it("reads 'Upcoming session' for a send that is not at a standard offset", () => {
    const manual = buildAutoReminderHtml({
      title: "Week 3",
      startTime: new Date("2026-10-10T18:00:00Z"),
      joinUrl: JOIN_URL,
      offsetMinutes: 0,
      alwaysIncluded: true,
    });
    expect(manual).toContain("Upcoming session");
  });
});

describe("reminderUnsubscribeUrl", () => {
  it("uses the schedule cancel link for event signups and the prefs page for lists", () => {
    expect(reminderUnsubscribeUrl("ada@farm.example", 9, "event_signup")).toContain(
      "/schedule?unsubscribe=9&email=ada%40farm.example",
    );
    expect(reminderUnsubscribeUrl("ada@farm.example", 9, "list")).toContain("/email-preferences");
  });

  it("carries a token instead of the address when one is given", () => {
    // New mail is tokenised: the address stops travelling in a query string,
    // where it reached browser history, referrers and every log on the way.
    const url = reminderUnsubscribeUrl("ada@farm.example", 9, "event_signup", "signed.token.value");
    expect(url).toContain("/schedule?unsubscribe=9&token=signed.token.value");
    expect(url).not.toContain("ada%40farm.example");
    expect(url).not.toContain("ada@farm.example");
  });

  it("still falls back to the address, so links already in inboxes keep working", () => {
    // An opt-out that fails is worse than one that can be abused.
    expect(reminderUnsubscribeUrl("ada@farm.example", 9, "event_signup", undefined)).toContain(
      "email=ada%40farm.example",
    );
  });

  it("escapes a token that contains URL-significant characters", () => {
    const url = reminderUnsubscribeUrl("ada@farm.example", 9, "event_signup", "a+b/c=d&e");
    expect(url).toContain("token=a%2Bb%2Fc%3Dd%26e");
  });
});
