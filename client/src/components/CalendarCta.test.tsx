/**
 * These tests used to assert the opposite of what they now assert.
 *
 * They pinned "Subscribe" as a single prominent control pointing at
 * CALENDAR_SUBSCRIBE_WEBCAL, and they passed the whole time a reader was unable
 * to subscribe in Google Calendar, because `webcal://` is an OS protocol handler
 * that Google's web app never receives. The tests were describing the bug
 * faithfully. So the rule they encode now is the one that matters: no subscribe
 * control anywhere may offer only one destination.
 */
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { CalendarCta, CalendarSubscribeButton, SubscribeButtons } from "./CalendarCta";
import { CALENDAR_FEEDS } from "@/lib/calendarLinks";

describe("SubscribeButtons", () => {
  it("offers Google and Apple side by side, never one alone", () => {
    render(<SubscribeButtons feed={CALENDAR_FEEDS.all} />);

    const google = screen.getByRole("link", { name: /Google Calendar/ });
    const apple = screen.getByRole("link", { name: /Apple or Outlook/ });

    expect(google).toHaveAttribute("href", CALENDAR_FEEDS.all.googleUrl);
    expect(apple).toHaveAttribute("href", CALENDAR_FEEDS.all.webcalUrl);
  });

  it("sends Google to an https deep link, not to webcal://", () => {
    render(<SubscribeButtons feed={CALENDAR_FEEDS.openAccess} />);
    const google = screen.getByRole("link", { name: /Google Calendar/ });
    const href = google.getAttribute("href") ?? "";

    expect(href.startsWith("https://calendar.google.com/")).toBe(true);
    // The feed URL is carried as an encoded parameter. The href itself must
    // never begin with webcal:, which is what Chrome cannot resolve.
    expect(href.startsWith("webcal:")).toBe(false);
    expect(href).toContain("render?cid=");
    expect(decodeURIComponent(href)).toContain(CALENDAR_FEEDS.openAccess.webcalUrl);
  });

  it("points each of the three options at its own feed", () => {
    expect(CALENDAR_FEEDS.all.path).toBe("/calendar/all.ics");
    expect(CALENDAR_FEEDS.openAccess.path).toBe("/calendar/open-access.ics");
    expect(CALENDAR_FEEDS.season2.path).toBe("/calendar/season2.ics");
    const paths = new Set(Object.values(CALENDAR_FEEDS).map((f) => f.googleUrl));
    expect(paths.size).toBe(3);
  });
});

describe("CalendarSubscribeButton", () => {
  it("subscribes to everything, in both ecosystems", () => {
    render(<CalendarSubscribeButton />);
    expect(screen.getByRole("link", { name: /Google Calendar/ })).toHaveAttribute(
      "href",
      CALENDAR_FEEDS.all.googleUrl,
    );
    expect(screen.getByRole("link", { name: /Apple or Outlook/ })).toHaveAttribute(
      "href",
      CALENDAR_FEEDS.all.webcalUrl,
    );
  });
});

describe("CalendarCta", () => {
  it("is a one-shot add for a single session", () => {
    render(
      <CalendarCta
        googleUrl="https://calendar.google.com/example"
        appleUrl="https://regencivics.earth/calendar/event/20.ics"
        appleDownload="week-1.ics"
        note="A one-off add."
      />,
    );

    const google = screen.getByRole("link", { name: "Google Calendar" });
    const apple = screen.getByRole("link", { name: "Apple/Outlook" });

    expect(google).toHaveAttribute("href", "https://calendar.google.com/example");
    expect(apple).toHaveAttribute("href", "https://regencivics.earth/calendar/event/20.ics");
    expect(apple).toHaveAttribute("download", "week-1.ics");
    expect(screen.getByText("A one-off add.")).toBeInTheDocument();
  });
});
