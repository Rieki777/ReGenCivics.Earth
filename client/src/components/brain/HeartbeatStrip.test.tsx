/**
 * The week metric is the month-one success measure, and the reason it is worth
 * a test file rather than an eyeball is that its failure mode is silence: a
 * strip that renders four pipeline chips and no numbers looks completely
 * healthy, which is exactly how the plan managed to name items-closed-per-week
 * as THE metric and then never display it.
 *
 * So what is asserted is that the numbers reach the screen at all, that they
 * survive a server that has not deployed them yet, and that the week label is
 * the same string everywhere it is read.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { HeartbeatStrip, ago, weekLabel } from "./HeartbeatStrip";

const statusUseQuery = vi.fn();

vi.mock("@/lib/trpc", () => ({
  trpc: {
    brain: { status: { useQuery: (input: unknown, opts: unknown) => statusUseQuery(input, opts) } },
  },
}));

const SIGNALS = {
  capture: { lastAt: new Date("2026-08-30T16:30:00Z"), state: "ok" },
  bridge: { lastAt: new Date("2026-08-30T15:00:00Z"), state: "ok" },
  generation: { lastAt: null, state: "never" },
  digest: { lastAt: new Date("2026-08-20T00:00:00Z"), state: "late" },
};

function status(over: Record<string, unknown> = {}) {
  return {
    data: {
      signals: SIGNALS,
      weekStart: new Date(2026, 7, 24, 0, 0, 0),
      closedThisWeek: 0,
      promotedThisWeek: 0,
      ...over,
    },
  };
}

describe("HeartbeatStrip", () => {
  beforeEach(() => {
    statusUseQuery.mockReset();
    statusUseQuery.mockReturnValue(status());
  });
  afterEach(() => vi.clearAllMocks());

  it("renders nothing at all before the first answer, rather than zeroes", () => {
    statusUseQuery.mockReturnValue({ data: undefined });
    const { container } = render(<HeartbeatStrip />);
    // Zeroes drawn while the query is still in flight would read as "you closed
    // nothing this week", which is a claim the client cannot make yet.
    expect(container.firstChild).toBeNull();
  });

  it("shows closed and promoted for the week, with the Monday it counts from", () => {
    statusUseQuery.mockReturnValue(status({ closedThisWeek: 6, promotedThisWeek: 3 }));
    render(<HeartbeatStrip />);

    expect(screen.getByTestId("brain-week-closed").textContent).toBe("6");
    expect(screen.getByTestId("brain-week-promoted").textContent).toBe("3");
    expect(screen.getByTestId("brain-week-metric").textContent).toContain("closed");
    expect(screen.getByTestId("brain-week-metric").textContent).toContain("promoted");
    expect(screen.getByTestId("brain-week-metric").textContent).toContain("since Aug 24");
  });

  it("shows a real zero, because a zero week is the signal to stop building", () => {
    // Addendum 2 item 8: if this is still zero after two weeks, stop and look at
    // why. Hiding the section when the number is zero would delete the finding.
    render(<HeartbeatStrip />);
    expect(screen.getByTestId("brain-week-closed").textContent).toBe("0");
    expect(screen.getByTestId("brain-week-promoted").textContent).toBe("0");
  });

  it("still draws the pipeline chips when the server predates the metric", () => {
    // A client deployed ahead of the server gets signals and nothing else. The
    // fifteen-day silent ingest failure is the reason those chips matter more
    // than the new numbers do.
    statusUseQuery.mockReturnValue({ data: { signals: SIGNALS } });
    render(<HeartbeatStrip />);

    expect(screen.getByLabelText("Pipeline heartbeat").textContent).toContain("capture");
    expect(screen.getByLabelText("Pipeline heartbeat").textContent).toContain("generation · never");
    expect(screen.getByTestId("brain-week-closed").textContent).toBe("0");
    expect(screen.getByTestId("brain-week-metric").textContent).not.toContain("since");
  });
});

describe("weekLabel", () => {
  it("is the same string in every locale and every ICU build", () => {
    // toLocaleDateString is not: it varies by browser locale and by whether
    // Node was built with full ICU, so the label could not be asserted at all.
    expect(weekLabel(new Date(2026, 7, 24))).toBe("Aug 24");
    expect(weekLabel(new Date(2026, 0, 5))).toBe("Jan 5");
  });

  it("has nothing to say about a missing or unparseable week start", () => {
    expect(weekLabel(null)).toBeNull();
    expect(weekLabel(undefined)).toBeNull();
    expect(weekLabel("not a date")).toBeNull();
  });
});

describe("ago", () => {
  const now = new Date("2026-08-30T12:00:00Z").getTime();

  it("stays coarse: minutes, then hours, then days", () => {
    expect(ago(new Date("2026-08-30T11:30:00Z"), now)).toBe("30m");
    expect(ago(new Date("2026-08-30T06:00:00Z"), now)).toBe("6h");
    expect(ago(new Date("2026-08-25T12:00:00Z"), now)).toBe("5d");
    expect(ago(null, now)).toBe("never");
  });
});
