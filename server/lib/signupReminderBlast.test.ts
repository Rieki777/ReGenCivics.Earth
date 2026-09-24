import { describe, expect, it, vi, beforeEach } from "vitest";
import type { Event } from "../../drizzle/schema";

const sendEmailMock = vi.fn().mockResolvedValue({ id: "msg_test" });
vi.mock("../_core/email", () => ({
  sendEmail: (...args: unknown[]) => sendEmailMock(...args),
  APP_BASE_URL: "https://regencivics.earth",
}));

const managePreferencesUrlMock = vi
  .fn()
  .mockImplementation(async (email: string, opts?: { mute?: string }) => {
    const mute = opts?.mute ? `&mute=${opts.mute}` : "";
    return `https://regencivics.earth/email-preferences?token=t&e=${encodeURIComponent(email)}${mute}`;
  });
vi.mock("./emailPrefs", () => ({
  managePreferencesUrl: (...args: unknown[]) => managePreferencesUrlMock(...args),
}));

const sendToAlwaysIncludedMock = vi.fn().mockResolvedValue(1);
vi.mock("../jobs/eventReminders", () => ({
  sendToAlwaysIncluded: (...args: unknown[]) => sendToAlwaysIncludedMock(...args),
}));

import { sendSignupReminderBlast } from "./signupReminderBlast";

function fakeEvent(over: Partial<Event> = {}): Event {
  return {
    id: 42,
    title: "Open Access Session",
    startTime: new Date("2026-09-26T18:00:00Z"),
    endTime: null,
    timezone: "America/Los_Angeles",
    description: "Come say hello.",
    riversideRoomUrl: "https://riverside.com/studio/rieki-cordon-riekis-studio?t=abc",
    zoomUrl: null,
    type: "open",
    season: null,
    ...over,
  } as Event;
}

describe("sendSignupReminderBlast", () => {
  beforeEach(() => {
    sendEmailMock.mockClear();
    managePreferencesUrlMock.mockClear();
    sendToAlwaysIncludedMock.mockClear();
  });

  it("sends nothing when there are zero signups (always-include stays out, matching main cron)", async () => {
    const sent = await sendSignupReminderBlast(fakeEvent(), {
      subject: "Tomorrow: Open Access Session",
      bodyText: null,
      offsetMinutes: 24 * 60,
      signups: [],
    });
    expect(sent).toBe(0);
    expect(sendEmailMock).not.toHaveBeenCalled();
    expect(managePreferencesUrlMock).not.toHaveBeenCalled();
    expect(sendToAlwaysIncludedMock).not.toHaveBeenCalled();
  });

  it("also skips phone-only signups and still does not reach always-include", async () => {
    const sent = await sendSignupReminderBlast(fakeEvent(), {
      subject: "Tomorrow: Open Access Session",
      offsetMinutes: 24 * 60,
      signups: [{ email: null, name: "Phone only" }, { email: "  ", name: "Blank" }],
    });
    expect(sent).toBe(0);
    expect(sendEmailMock).not.toHaveBeenCalled();
    expect(sendToAlwaysIncludedMock).not.toHaveBeenCalled();
  });

  it("emails each signup 1:1 with a Manage email preferences footer", async () => {
    const sent = await sendSignupReminderBlast(fakeEvent(), {
      subject: "Tomorrow: Open Access Session",
      bodyText: "See you there.",
      offsetMinutes: 24 * 60,
      signups: [
        { email: "ada@farm.example", name: "Ada" },
        { email: "bob@land.example", name: "Bob" },
      ],
    });
    expect(sent).toBe(2);
    expect(sendEmailMock).toHaveBeenCalledTimes(2);
    expect(sendToAlwaysIncludedMock).not.toHaveBeenCalled();
    const html = String(sendEmailMock.mock.calls[0]![0].html);
    expect(html).toContain("Manage email preferences");
    expect(html).not.toContain("You signed up for a reminder for this event.");
    expect(html).toContain("Join the call");
    expect(html).toContain("https://regencivics.earth/join?e=42");
    expect(html).not.toContain("Join on Riverside");
    expect(html).not.toMatch(/Riverside/i);
    expect(html).not.toMatch(/Zoom/i);
  });
});
