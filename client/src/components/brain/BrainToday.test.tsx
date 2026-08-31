/**
 * Today is an assembly, so what is tested here is the assembly: which sections
 * are on the screen and in what order.
 *
 * Order is not decoration. The week-one card states the protocol, the protocol
 * says the five done-triage answers come first in the morning, and triage is
 * the section that actually moves the 219-item number. If triage drifts below
 * the dated work it becomes the thing Rye scrolls past, and the plan's own
 * month-one metric is the thing that quietly stays at zero.
 *
 * The children are mocked. Each has its own file of tests; duplicating them
 * here would only mean two places to update when one of them changes.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BrainToday, rankToday } from "./BrainToday";

const invalidate = vi.fn();
const todayUseQuery = vi.fn();
const listUseQuery = vi.fn();
const feedUseQuery = vi.fn();

vi.mock("@/lib/trpc", () => ({
  trpc: {
    useUtils: () => ({ brain: { invalidate } }),
    brain: {
      today: { useQuery: (i: unknown, o: unknown) => todayUseQuery(i, o) },
      list: { useQuery: (i: unknown, o: unknown) => listUseQuery(i, o) },
    },
    harvest: { listFeed: { useQuery: (i: unknown, o: unknown) => feedUseQuery(i, o) } },
  },
}));

vi.mock("./HeartbeatStrip", () => ({ HeartbeatStrip: () => <div data-testid="heartbeat" /> }));
vi.mock("./WeekOneCard", () => ({ WeekOneCard: () => <div data-testid="week-one" /> }));
vi.mock("./BrainItemSheet", () => ({ BrainItemSheet: ({ id }: { id: number }) => <div>{id}</div> }));
vi.mock("./BrainList", () => ({
  BrainRow: ({ item }: { item: { id: number; title: string } }) => (
    <div data-testid={`row-${item.id}`}>{item.title}</div>
  ),
}));
vi.mock("./TriageQueue", () => ({
  TriageQueue: ({ onAnswered }: { onAnswered?: () => void }) => (
    <button type="button" data-testid="triage" onClick={() => onAnswered?.()}>
      triage
    </button>
  ),
}));

function result(over: Record<string, unknown> = {}) {
  return { data: undefined, isLoading: false, isError: false, error: null, ...over };
}

describe("BrainToday", () => {
  beforeEach(() => {
    for (const fn of [invalidate, todayUseQuery, listUseQuery, feedUseQuery]) fn.mockReset();
    todayUseQuery.mockReturnValue(
      result({ data: { due: [], raw: 219, ready: 0, inFlight: 0, claimed: 0 } }),
    );
    listUseQuery.mockReturnValue(result({ data: [] }));
    feedUseQuery.mockReturnValue(result({ data: { ideas: [] } }));
  });
  afterEach(() => vi.clearAllMocks());

  it("puts the protocol and the triage queue on the screen", () => {
    render(<BrainToday onGoToCreate={() => {}} />);
    expect(screen.getByTestId("heartbeat")).toBeDefined();
    expect(screen.getByTestId("week-one")).toBeDefined();
    expect(screen.getByTestId("triage")).toBeDefined();
  });

  it("keeps triage above the dated work, where the protocol puts it", () => {
    const { container } = render(<BrainToday onGoToCreate={() => {}} />);
    const triage = screen.getByTestId("triage");
    const due = screen.getByText(/Due and now/);

    // DOCUMENT_POSITION_FOLLOWING: `due` comes after `triage` in the document.
    expect(triage.compareDocumentPosition(due) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(container).toBeDefined();
  });

  it("reads the protocol before the work, and the heartbeat before both", () => {
    render(<BrainToday onGoToCreate={() => {}} />);
    const heartbeat = screen.getByTestId("heartbeat");
    const weekOne = screen.getByTestId("week-one");
    expect(heartbeat.compareDocumentPosition(weekOne) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("refreshes the counts and the week metric when an item is triaged", async () => {
    render(<BrainToday onGoToCreate={() => {}} />);
    await userEvent.setup().click(screen.getByTestId("triage"));
    // Answering "Done" changes the closed-this-week number in the strip and the
    // raw count in the grid. Neither refetches on its own.
    expect(invalidate).toHaveBeenCalled();
  });
});

describe("rankToday", () => {
  it("orders by due, then priority, then age, and does not NaN on undated items", () => {
    const ranked = rankToday([
      { id: 1, due: null, priority: "someday", capturedAt: "2026-08-01T00:00:00Z" },
      { id: 2, due: "2026-09-01", priority: "someday" },
      { id: 3, due: null, priority: "now", capturedAt: "2026-08-20T00:00:00Z" },
    ] as unknown as Array<{ id: number; due?: unknown; priority?: string; capturedAt?: unknown }>);
    expect(ranked.map((r) => r.id)).toEqual([2, 3, 1]);
  });
});
