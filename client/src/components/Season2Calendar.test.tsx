import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Season2Calendar } from "./Season2Calendar";
import {
  openAccessGoogleUrl,
  NEW_MOON_SESSIONS,
  parseCompactUtc,
  SEEDS_YOUTUBE_SUBSCRIBE_URL,
} from "@/lib/seasonEvents";
import { CALENDAR_FEEDS, formatRangeWithReference } from "@/lib/calendarLinks";
import { CALENDAR_LABELS } from "./CalendarCta";
import { SEASON2_CURRICULUM, episodeTitle } from "@shared/season2Curriculum";

vi.mock("@/components/AnimatedSection", () => ({
  AnimatedSection: ({ children, as: Tag = "div", ...rest }: { children: React.ReactNode; as?: string } & Record<string, unknown>) => {
    const Comp = (Tag || "div") as "div";
    return <Comp {...rest}>{children}</Comp>;
  },
}));

vi.mock("wouter", () => ({
  Link: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a>,
}));

const WEEK_1 = episodeTitle(SEASON2_CURRICULUM[0]!);
const WEEK_13 = episodeTitle(SEASON2_CURRICULUM[12]!);

describe("Season2Calendar", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-02T15:00:00.000Z"));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  /** Both lists ship collapsed; open them so the sweeping assertions see every card. */
  function expandAll() {
    for (const re of [/Show \d+ more sessions/i, /Show \d+ more episodes/i]) {
      fireEvent.click(screen.getByRole("button", { name: re }));
    }
  }

  it("says what the next session is about and who the sessions are for", () => {
    render(<Season2Calendar />);

    // Sept 10 has a topic set; it must surface on the card, not just the date.
    expect(screen.getByText("All things Season Two")).toBeInTheDocument();
    expect(screen.getByText(/Come ask your questions and meet some of the cohort/i)).toBeInTheDocument();
    expect(screen.getByText(/More of them show up on selection day/i)).toBeInTheDocument();

    // And the standing pitch says who it is for and that it costs nothing.
    expect(screen.getByText(/A monthly session for anyone and everyone/i)).toBeInTheDocument();
    expect(screen.getByText(/Free, no commitment, no pitch required/i)).toBeInTheDocument();
  });

  it("collapses every date after the first by default", () => {
    render(<Season2Calendar />);

    // One Open Access card (the next one) and one episode card (Week 1).
    expect(screen.getAllByText("Open Access Session").length).toBe(1);
    expect(screen.getByText(WEEK_1)).toBeInTheDocument();
    expect(screen.queryByText(WEEK_13)).toBeNull();

    // The subscribe-once CTA stays the primary action while collapsed.
    expect(screen.getByText("All 13 weekly episodes")).toBeInTheDocument();

    const sessionsToggle = screen.getByRole("button", { name: /Show \d+ more sessions/i });
    expect(sessionsToggle).toHaveAttribute("aria-expanded", "false");

    expandAll();

    expect(screen.getAllByText("Open Access Session").length).toBeGreaterThan(1);
    expect(screen.getByText(WEEK_13)).toBeInTheDocument();
    expect(sessionsToggle).toHaveAttribute("aria-expanded", "true");
    expect(screen.getAllByRole("button", { name: /Show fewer dates/i }).length).toBe(2);
  });

  /**
   * This test used to assert the opposite: that every card carried a single
   * "Subscribe" link pointing at CALENDAR_SUBSCRIBE_WEBCAL. It passed for as
   * long as Google Calendar users were unable to subscribe at all, because
   * `webcal://` is an OS protocol handler Google's web app never sees. The rule
   * worth pinning is that no subscribe control offers only one destination.
   */
  it("never offers a subscribe link without both Google and Apple", () => {
    render(<Season2Calendar />);
    expandAll();

    expect(screen.queryByRole("link", { name: "Subscribe" })).toBeNull();

    const google = screen.getAllByRole("link", { name: CALENDAR_LABELS.google });
    const apple = screen.getAllByRole("link", { name: CALENDAR_LABELS.apple });
    expect(google.length).toBe(apple.length);
    expect(google.length).toBeGreaterThan(0);

    // The "all 13 weekly episodes" card subscribes to the Season 2 feed, and
    // its Apple counterpart points at the same feed over webcal.
    const hrefs = google.map((a) => a.getAttribute("href"));
    expect(hrefs).toContain(CALENDAR_FEEDS.season2.googleUrl);
    expect(apple.map((a) => a.getAttribute("href"))).toContain(CALENDAR_FEEDS.season2.webcalUrl);
  });

  it("points one-shot Google links at the 11:00 PT instants, not 8am PT or 1pm ET", () => {
    render(<Season2Calendar />);
    expandAll();

    const hrefs = screen
      .getAllByRole("link", { name: /Google Calendar/ })
      .map((a) => a.getAttribute("href") ?? "");

    const sep10 = NEW_MOON_SESSIONS.find((s) => s.date === "2026-09-10")!;
    expect(hrefs).toContain(openAccessGoogleUrl(sep10));
    expect(hrefs.some((h) => h.includes("dates=20261011T180000Z/20261011T200000Z"))).toBe(true);
    expect(hrefs.some((h) => h.includes("dates=20260926T180000Z/20260926T200000Z"))).toBe(true);
    expect(hrefs.some((h) => h.includes("dates=20261219T190000Z/20261219T210000Z"))).toBe(true);

    expect(hrefs.some((h) => h.includes("T150000Z"))).toBe(false);
    expect(hrefs.some((h) => h.includes("20260910T170000Z"))).toBe(false);
    expect(hrefs.some((h) => h.includes("20261010T170000Z"))).toBe(false);

    expect(screen.getByText(WEEK_1)).toBeInTheDocument();
    expect(screen.getByText(WEEK_13)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /See the full season schedule/i })).toHaveAttribute("href", "/schedule");
  });

  /**
   * Times are rendered in the reader's zone now, so this asserts the wiring
   * rather than a fixed string: whatever zone the test runs in, the card shows
   * what our own formatter produces for that instant. The formatter's output
   * per zone is pinned in lib/calendarLinks.test.ts, which passes zones
   * explicitly instead of depending on the machine.
   */
  it("shows the next session's time in the reader's own zone", () => {
    render(<Season2Calendar />);
    const sep10 = NEW_MOON_SESSIONS.find((s) => s.date === "2026-09-10")!;
    const expected = formatRangeWithReference(
      parseCompactUtc(sep10.startUtc),
      parseCompactUtc(sep10.endUtc),
    );
    expect(screen.getByText(expected)).toBeInTheDocument();
    expect(screen.queryByText(/8:00 AM/)).toBeNull();
  });

  it("offers all three feeds, with everything at the top", () => {
    // Rye, 2026-09-07: the everything feed leads, the open-sessions feed sits
    // with the open sessions, and the season feed with the episodes. A reader
    // who has decided they want the season should not have to scroll past two
    // sections of individual dates to find the button that adds all of it.
    render(<Season2Calendar />);

    const hrefs = screen.getAllByRole("link").map((a) => a.getAttribute("href"));
    expect(hrefs).toContain(CALENDAR_FEEDS.all.googleUrl);
    expect(hrefs).toContain(CALENDAR_FEEDS.all.webcalUrl);
    expect(hrefs).toContain(CALENDAR_FEEDS.openAccess.googleUrl);
    expect(hrefs).toContain(CALENDAR_FEEDS.openAccess.webcalUrl);
    expect(hrefs).toContain(CALENDAR_FEEDS.season2.googleUrl);
    expect(hrefs).toContain(CALENDAR_FEEDS.season2.webcalUrl);

    // "Everything" comes before the Open Access heading in document order.
    const everything = screen.getByText("Everything");
    const openHeading = screen.getByText("Open Access Sessions");
    expect(
      everything.compareDocumentPosition(openHeading) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("points people who are not in the cohort at the livestream", () => {
    // Weeks 2 to 13 are cohort working sessions, so for everyone else the
    // livestream is how they attend. The calendar says when; this says where.
    render(<Season2Calendar />);
    const yt = screen.getByRole("link", { name: /Subscribe on YouTube/i });
    expect(yt.getAttribute("href")).toBe(SEEDS_YOUTUBE_SUBSCRIBE_URL);
    expect(yt.className).toContain("min-h-[44px]");
  });
});
