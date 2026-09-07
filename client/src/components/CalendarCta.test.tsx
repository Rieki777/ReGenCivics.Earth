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
import {
  CALENDAR_LABELS,
  CalendarCta,
  CalendarSubscribeButton,
  SubscribeButtons,
} from "./CalendarCta";
import { CALENDAR_FEEDS } from "@/lib/calendarLinks";

describe("SubscribeButtons", () => {
  it("offers Google and Apple side by side, never one alone", () => {
    render(<SubscribeButtons feed={CALENDAR_FEEDS.all} />);

    const google = screen.getByRole("link", { name: CALENDAR_LABELS.google });
    const apple = screen.getByRole("link", { name: CALENDAR_LABELS.apple });

    expect(google).toHaveAttribute("href", CALENDAR_FEEDS.all.googleUrl);
    expect(apple).toHaveAttribute("href", CALENDAR_FEEDS.all.webcalUrl);
  });

  it("sends Google to an https deep link, not to webcal://", () => {
    render(<SubscribeButtons feed={CALENDAR_FEEDS.openAccess} />);
    const google = screen.getByRole("link", { name: CALENDAR_LABELS.google });
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
    expect(screen.getByRole("link", { name: CALENDAR_LABELS.google })).toHaveAttribute(
      "href",
      CALENDAR_FEEDS.all.googleUrl,
    );
    expect(screen.getByRole("link", { name: CALENDAR_LABELS.apple })).toHaveAttribute(
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

    const google = screen.getByRole("link", { name: CALENDAR_LABELS.google });
    const apple = screen.getByRole("link", { name: CALENDAR_LABELS.apple });

    expect(google).toHaveAttribute("href", "https://calendar.google.com/example");
    expect(apple).toHaveAttribute("href", "https://regencivics.earth/calendar/event/20.ics");
    expect(apple).toHaveAttribute("download", "week-1.ics");
    expect(screen.getByText("A one-off add.")).toBeInTheDocument();
  });
});

describe("Button labels", () => {
  it("names the same two destinations in every block", () => {
    // They drifted the day they were written: "Apple or Outlook" in one block,
    // "Apple/Outlook" in another, bare "Google" in a third. Same component.
    // This is the control a stuck user is scanning, and the words you say to
    // them over a support channel, so it has to read the same everywhere.
    render(
      <>
        <SubscribeButtons feed={CALENDAR_FEEDS.all} />
        <CalendarCta googleUrl="https://example.com/g" appleUrl="https://example.com/a.ics" />
      </>,
    );
    expect(screen.getAllByRole("link", { name: CALENDAR_LABELS.google })).toHaveLength(2);
    expect(screen.getAllByRole("link", { name: CALENDAR_LABELS.apple })).toHaveLength(2);
    expect(screen.queryByRole("link", { name: "Apple or Outlook" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Google" })).toBeNull();
  });
});

describe("Tap targets", () => {
  it("gives every calendar control a 44px floor", () => {
    // These are all <a>, and the coarse-pointer hit expander in index.css only
    // covers button and [role="button"|"checkbox"|"radio"|"switch"], so an
    // anchor gets nothing from it. Measured live on a 375px viewport before
    // this was fixed: quiet buttons 34px, the inline Season 2 links 18px.
    // scripts/audit-touch-targets.py passed throughout, because it looks for a
    // height capped by a utility class, not one that comes out short from
    // padding, so gate 1c cannot be relied on to catch a regression here.
    render(
      <>
        <SubscribeButtons feed={CALENDAR_FEEDS.all} />
        <CalendarCta googleUrl="https://example.com/g" appleUrl="https://example.com/a.ics" />
      </>,
    );
    const links = screen.getAllByRole("link");
    expect(links.length).toBe(4);
    for (const link of links) {
      expect(link.className, link.textContent ?? "").toContain("min-h-[44px]");
    }
  });
});

