import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { CalendarCta, CalendarSubscribeButton } from "./CalendarCta";
import { CALENDAR_SUBSCRIBE_WEBCAL } from "@/lib/seasonEvents";

describe("CalendarCta", () => {
  it("renders Subscribe as the primary live-feed CTA", () => {
    render(
      <CalendarCta
        googleUrl="https://calendar.google.com/calendar/render?action=TEMPLATE&dates=20260926T180000Z/20260926T200000Z"
        appleUrl="data:text/calendar;charset=utf8,BEGIN:VCALENDAR"
        appleDownload="week-1.ics"
      />,
    );

    const subscribe = screen.getByRole("link", { name: "Subscribe" });
    expect(subscribe).toHaveAttribute("href", CALENDAR_SUBSCRIBE_WEBCAL);
    expect(subscribe.className).toMatch(/bg-\[#7dd87d\]/);
    expect(subscribe.className).toMatch(/font-bold/);
    expect(subscribe.className).toMatch(/text-base/);
  });

  it("keeps Google Calendar and Apple/Outlook as quieter add-once actions", () => {
    render(
      <CalendarCta
        googleUrl="https://calendar.google.com/example"
        appleUrl="data:text/calendar;charset=utf8,TEST"
      />,
    );

    const subscribe = screen.getByRole("link", { name: "Subscribe" });
    const google = screen.getByRole("link", { name: "Google Calendar" });
    const apple = screen.getByRole("link", { name: "Apple/Outlook" });

    expect(google).toHaveAttribute("href", "https://calendar.google.com/example");
    expect(apple).toHaveAttribute("href", "data:text/calendar;charset=utf8,TEST");

    expect(google.className).toMatch(/text-xs/);
    expect(apple.className).toMatch(/text-xs/);
    expect(google.className).not.toMatch(/bg-\[#7dd87d\]/);
    expect(apple.className).not.toMatch(/bg-\[#7dd87d\]/);

    expect(subscribe.compareDocumentPosition(google) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getByText("Add once")).toBeInTheDocument();
  });
});

describe("CalendarSubscribeButton", () => {
  it("is a single prominent Subscribe control on the live ICS feed", () => {
    render(<CalendarSubscribeButton />);
    const subscribe = screen.getByRole("link", { name: "Subscribe" });
    expect(subscribe).toHaveAttribute("href", CALENDAR_SUBSCRIBE_WEBCAL);
    expect(subscribe.className).toMatch(/bg-\[#7dd87d\]/);
    expect(subscribe.className).toMatch(/font-bold/);
  });
});
