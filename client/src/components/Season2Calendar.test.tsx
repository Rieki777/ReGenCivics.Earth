import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { Season2Calendar } from "./Season2Calendar";
import { openAccessGoogleUrl, NEW_MOON_SESSIONS, CALENDAR_SUBSCRIBE_WEBCAL } from "@/lib/seasonEvents";

vi.mock("@/components/AnimatedSection", () => ({
  AnimatedSection: ({ children, as: Tag = "div", ...rest }: { children: React.ReactNode; as?: string } & Record<string, unknown>) => {
    const Comp = (Tag || "div") as "div";
    return <Comp {...rest}>{children}</Comp>;
  },
}));

vi.mock("wouter", () => ({
  Link: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a>,
}));

describe("Season2Calendar", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-02T15:00:00.000Z"));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders Subscribe as the primary CTA on Open Access and Season 2 cards", () => {
    render(<Season2Calendar />);

    const subscribe = screen.getAllByRole("link", { name: "Subscribe" });
    const google = screen.getAllByRole("link", { name: "Google Calendar" });
    const apple = screen.getAllByRole("link", { name: "Apple/Outlook" });

    expect(subscribe.length).toBeGreaterThanOrEqual(15);
    expect(google.length).toBe(apple.length);
    expect(subscribe.length).toBe(google.length);

    for (const link of subscribe) {
      expect(link).toHaveAttribute("href", CALENDAR_SUBSCRIBE_WEBCAL);
      expect(link.className).toMatch(/bg-\[#7dd87d\]/);
      expect(link.className).toMatch(/font-bold/);
    }
    for (const link of google) {
      expect(link.className).not.toMatch(/bg-\[#7dd87d\]/);
      expect(link.className).toMatch(/text-xs/);
    }
    expect(screen.getAllByText("Add once").length).toBe(subscribe.length);
  });

  it("points one-shot Google links at the 11:00 PT instants, not 8am PT or 1pm ET", () => {
    render(<Season2Calendar />);

    const google = screen.getAllByRole("link", { name: "Google Calendar" });
    const hrefs = google.map((a) => a.getAttribute("href") ?? "");

    const sep10 = NEW_MOON_SESSIONS.find((s) => s.date === "2026-09-10")!;
    expect(hrefs).toContain(openAccessGoogleUrl(sep10));
    expect(hrefs.some((h) => h.includes("dates=20261010T180000Z/20261010T200000Z"))).toBe(true);
    expect(hrefs.some((h) => h.includes("dates=20261011T180000Z/20261011T200000Z"))).toBe(true);
    expect(hrefs.some((h) => h.includes("dates=20260926T180000Z/20260926T200000Z"))).toBe(true);
    expect(hrefs.some((h) => h.includes("dates=20261219T190000Z/20261219T210000Z"))).toBe(true);

    expect(hrefs.some((h) => h.includes("T150000Z"))).toBe(false);
    expect(hrefs.some((h) => h.includes("20260910T170000Z"))).toBe(false);
    expect(hrefs.some((h) => h.includes("20261010T170000Z"))).toBe(false);

    expect(screen.getAllByText("Open Access Session").length).toBeGreaterThan(0);
    expect(screen.getByText("Week 1: Selection Day")).toBeInTheDocument();
    expect(screen.getByText("Week 13: Season Overview & Project Updates")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /See the full season schedule/i })).toHaveAttribute("href", "/schedule");
  });

  it("shows 11:00 AM Pacific / 2:00 PM Eastern on the next Open Access and Week 1 cards", () => {
    render(<Season2Calendar />);
    expect(screen.getAllByText(/11:00 AM PDT, 2:00 PM EDT/).length).toBeGreaterThan(0);
    expect(screen.queryByText(/8:00 AM/)).toBeNull();
    expect(screen.queryByText(/1:00 to 3:00 PM/)).toBeNull();
  });
});
