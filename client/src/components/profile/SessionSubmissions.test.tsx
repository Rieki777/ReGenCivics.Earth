/**
 * The profile's "Weekly sessions" section (Rye, 2026-10-13): every week's
 * answers, newest week first, each linking back to its board, and an empty
 * state that says how answers get here, guests included.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SUBMISSIONS_COPY } from "@shared/boardEntries";
import {
  GUEST_LINE,
  SessionSubmissions,
  WeeklySessionsView,
  groupByStage,
  projectLines,
  type SubmissionWeek,
} from "./SessionSubmissions";

/** En and em dashes, built from char codes so this file holds neither. */
const DASHES = new RegExp(`[${String.fromCharCode(0x2013, 0x2014)}]`);

const invalidate = vi.fn();
const useQuery = vi.fn();
let claimed: ((r: { moved: number; merged: number }) => void) | undefined;
const toastSuccess = vi.fn();

vi.mock("sonner", () => ({ toast: { success: (...a: unknown[]) => toastSuccess(...a), error: vi.fn() } }));

vi.mock("@/lib/trpc", () => ({
  trpc: {
    useUtils: () => ({ sessionBoard: { mySubmissions: { invalidate } } }),
    sessionBoard: { mySubmissions: { useQuery: (...a: unknown[]) => useQuery(...a) } },
    seasonSchedule: { state: { useQuery: () => ({ data: undefined, isLoading: false, isError: false }) } },
  },
}));

vi.mock("@/components/session-board/useSessionBoard", () => ({
  useClaimGuest: (cb?: (r: { moved: number; merged: number }) => void) => {
    claimed = cb;
  },
}));

const WEEK2: SubmissionWeek = {
  week: 2,
  title: "Week 2: Pain Points & Growth Opportunities",
  href: "/season2/week/2",
  lastAt: "2026-10-07T18:00:00.000Z",
  projects: [{ cardId: 4, name: "Toa Hermitage", how: "added" }],
  entries: [
    { id: "i10", stage: "Drop in", label: "Your arrival word", value: "Curious", project: null, anonymous: false, at: "2026-10-07T17:05:00.000Z" },
    { id: "v3", stage: null, label: "You raised a hand for", value: "Week 4: Village OS", project: null, anonymous: false, at: "2026-10-07T18:00:00.000Z" },
  ],
};

const WEEK3: SubmissionWeek = {
  week: 3,
  title: "Week 3: Game & Organisation Co-Creation Part 1",
  href: "/season2/week/3",
  lastAt: "2026-10-14T18:30:00.000Z",
  projects: [{ cardId: 9, name: "Amora", how: "checked in" }],
  entries: [
    { id: "i40", stage: "What your project is for", label: "A human need your project is here to meet", value: "Love", project: "Amora", anonymous: false, at: "2026-10-14T17:30:00.000Z" },
    { id: "i41", stage: "What your project is for", label: "A seed you planted", value: "Love", project: "Amora", anonymous: false, at: "2026-10-14T17:31:00.000Z" },
    { id: "i50", stage: "How deep, how wide", label: "How it was landing", value: "Clear", project: null, anonymous: true, at: "2026-10-14T17:40:00.000Z" },
    { id: "i60", stage: "Who decides", label: "How your project decides today", value: "Not decided yet", project: null, anonymous: false, at: "2026-10-14T18:30:00.000Z" },
  ],
};

beforeEach(() => {
  invalidate.mockReset();
  useQuery.mockReset();
  toastSuccess.mockReset();
  claimed = undefined;
});

describe("WeeklySessionsView", () => {
  it("lists weeks newest first, each linking back to its board", () => {
    render(<WeeklySessionsView weeks={[WEEK2, WEEK3]} />);
    const weeks = screen.getAllByTestId("weekly-session-week");
    expect(weeks).toHaveLength(2);
    expect(within(weeks[0]).getByText(WEEK3.title)).toBeTruthy();
    expect(within(weeks[1]).getByText(WEEK2.title)).toBeTruthy();
    expect(within(weeks[0]).getByRole("link", { name: SUBMISSIONS_COPY.open }).getAttribute("href")).toBe("/season2/week/3");
    expect(within(weeks[1]).getByRole("link", { name: SUBMISSIONS_COPY.open }).getAttribute("href")).toBe("/season2/week/2");
  });

  it("opens the newest week and shows every answer in plain words, with its project or the room", () => {
    render(<WeeklySessionsView weeks={[WEEK2, WEEK3]} />);
    const newest = screen.getAllByTestId("weekly-session-week")[0];
    expect(within(newest).getByText("You checked in with Amora.")).toBeTruthy();
    expect(within(newest).getByText("A seed you planted")).toBeTruthy();
    expect(within(newest).getAllByText("Amora").length).toBeGreaterThan(0);
    expect(within(newest).getByText(SUBMISSIONS_COPY.anonymous)).toBeTruthy();
    expect(within(newest).getByText(SUBMISSIONS_COPY.forRoom)).toBeTruthy();
    // The older week stays folded until tapped.
    const older = screen.getAllByTestId("weekly-session-week")[1];
    expect(within(older).queryByText("Curious")).toBeNull();
  });

  it("unfolds an older week on tap", async () => {
    render(<WeeklySessionsView weeks={[WEEK2, WEEK3]} />);
    const older = screen.getAllByTestId("weekly-session-week")[1];
    await userEvent.click(within(older).getByRole("button", { name: new RegExp(WEEK2.title) }));
    expect(within(older).getByText("Curious")).toBeTruthy();
    expect(within(older).getByText("You added Toa Hermitage.")).toBeTruthy();
  });

  it("says how answers get here when there are none, guests included", () => {
    render(<WeeklySessionsView weeks={[]} />);
    expect(screen.getByText(SUBMISSIONS_COPY.empty)).toBeTruthy();
    expect(screen.getByText(GUEST_LINE)).toBeTruthy();
    expect(screen.getByRole("link", { name: "Open the Week 3 board" }).getAttribute("href")).toBe("/season2/week/3");
  });
});

describe("helpers", () => {
  it("groups a week's entries in runs of one stage", () => {
    const groups = groupByStage(WEEK3.entries);
    expect(groups.map((g) => [g.stage, g.entries.length])).toEqual([
      ["What your project is for", 2],
      ["How deep, how wide", 1],
      ["Who decides", 1],
    ]);
  });

  it("names added and checked-in projects on their own lines", () => {
    expect(
      projectLines([
        { cardId: 1, name: "Amora", how: "added" },
        { cardId: 2, name: "Toa Hermitage", how: "checked in" },
        { cardId: 3, name: "Lupine Hollow", how: "checked in" },
      ]),
    ).toEqual(["You added Amora.", "You checked in with Toa Hermitage, Lupine Hollow."]);
  });

  it("keeps every user-facing line free of em and en dashes", () => {
    for (const s of [GUEST_LINE, ...projectLines([{ cardId: 1, name: "A", how: "added" }])]) {
      expect(s).not.toMatch(DASHES);
    }
  });
});

describe("SessionSubmissions", () => {
  it("claims this browser's guest answers, then refreshes the list and says so", () => {
    useQuery.mockReturnValue({ data: { weeks: [WEEK3] }, isLoading: false, isError: false });
    render(<SessionSubmissions />);
    expect(screen.getByText(WEEK3.title)).toBeTruthy();
    expect(claimed).toBeTypeOf("function");
    claimed!({ moved: 3, merged: 1 });
    expect(invalidate).toHaveBeenCalledTimes(1);
    expect(toastSuccess).toHaveBeenCalledWith(SUBMISSIONS_COPY.claimed);
  });

  it("stays quiet when there was nothing to claim", () => {
    useQuery.mockReturnValue({ data: { weeks: [] }, isLoading: false, isError: false });
    render(<SessionSubmissions />);
    claimed!({ moved: 0, merged: 0 });
    expect(toastSuccess).not.toHaveBeenCalled();
  });

  it("shows a plain line when the list can't load", () => {
    useQuery.mockReturnValue({ data: undefined, isLoading: false, isError: true, error: { message: "TOO_MANY_REQUESTS" } });
    render(<SessionSubmissions />);
    expect(screen.getByText(/didn't load/)).toBeTruthy();
    expect(screen.queryByText("TOO_MANY_REQUESTS")).toBeNull();
  });
});
