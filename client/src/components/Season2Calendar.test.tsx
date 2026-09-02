import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { Season2Calendar } from "./Season2Calendar";
import { openAccessGoogleUrl, NEW_MOON_SESSIONS } from "@/lib/seasonEvents";

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

  it("renders Google and Apple buttons for the Open Access Session and Season 2 episodes", () => {
    render(<Season2Calendar />);

    const google = screen.getAllByRole("link", { name: "Google Calendar" });
    const apple = screen.getAllByRole("link", { name: "Apple/Outlook" });
    const hrefs = google.map((a) => a.getAttribute("href") ?? "");

    const sep10 = NEW_MOON_SESSIONS.find((s) => s.date === "2026-09-10")!;
    expect(hrefs).toContain(openAccessGoogleUrl(sep10));
    expect(hrefs.some((h) => h.includes("dates=20261010T170000Z/20261010T190000Z"))).toBe(true);
    expect(hrefs.some((h) => h.includes("dates=20260926T150000Z/20260926T170000Z"))).toBe(true);
    expect(hrefs.some((h) => h.includes("dates=20261219T160000Z/20261219T180000Z"))).toBe(true);
    expect(hrefs.some((h) => h.includes("RRULE:FREQ=WEEKLY;COUNT=13"))).toBe(true);

    // One pair per upcoming OA session + 13 episodes + the add-all series row.
    expect(google.length).toBe(apple.length);
    expect(google.length).toBeGreaterThanOrEqual(15);

    expect(screen.getAllByText("Open Access Session").length).toBeGreaterThan(0);
    expect(screen.getByText("Week 1: Selection Day")).toBeInTheDocument();
    expect(screen.getByText("Week 13: Season Overview & Project Updates")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /See the full season schedule/i })).toHaveAttribute("href", "/schedule");
  });
});
