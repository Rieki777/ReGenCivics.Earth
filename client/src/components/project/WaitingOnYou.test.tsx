/**
 * "Waiting on you" on a project page's steward tools (build spec bundle 1,
 * sections 16.3 and 16.4): the Ready to crowdpool row says how many of the
 * eight are ticked until all are, and the list never says "Nothing is
 * waiting on you" while the offers are still loading (A5-03).
 */
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { WaitingOnYou } from "./WaitingOnYou";
import type { StewardQueue } from "@shared/stewardQueue";

const EMPTY: StewardQueue = {
  toAnswer: [],
  toDeliver: [],
  toThank: [],
  sendForReview: false,
  pendingOnFilledRoles: [],
  total: 0,
};

function renderIt(props: Partial<Parameters<typeof WaitingOnYou>[0]> = {}) {
  return render(
    <WaitingOnYou
      queue={EMPTY}
      loading={false}
      onJump={vi.fn()}
      onSendForReview={vi.fn()}
      {...props}
    />,
  );
}

describe("WaitingOnYou", () => {
  it("shows how many Ready to crowdpool items are ticked, and jumps to the status card", () => {
    const onOpenReadiness = vi.fn();
    renderIt({ readyTicked: 3, onOpenReadiness });
    const row = screen.getByRole("button", { name: /3 of 8 Ready to crowdpool items ticked/ });
    expect(row).toHaveTextContent("3 of 8 Ready to crowdpool items ticked. The review team sees your ticks.");
    expect(screen.queryByText("Nothing is waiting on you right now.")).toBeNull();
    fireEvent.click(row);
    expect(onOpenReadiness).toHaveBeenCalledTimes(1);
  });

  it("counts a list with nothing ticked yet", () => {
    renderIt({ readyTicked: 0 });
    expect(screen.getByText("0 of 8 Ready to crowdpool items ticked. The review team sees your ticks.")).toBeInTheDocument();
  });

  it("shows no ticks row once all eight are ticked, or when the list is not open", () => {
    for (const readyTicked of [8, null]) {
      const { unmount } = renderIt({ readyTicked });
      expect(screen.queryByText(/Ready to crowdpool items ticked/)).toBeNull();
      expect(screen.getByText("Nothing is waiting on you right now.")).toBeInTheDocument();
      unmount();
    }
  });

  it("keeps the ticks row beside the other rows", () => {
    renderIt({ readyTicked: 5, queue: { ...EMPTY, sendForReview: true, total: 1 } });
    expect(screen.getByText("This campaign is a draft. Send it for review when it's ready.")).toBeInTheDocument();
    expect(screen.getByText(/5 of 8 Ready to crowdpool items ticked/)).toBeInTheDocument();
  });

  it("says it is checking while the offers load, and never that nothing is waiting", () => {
    renderIt({ loading: true, queue: null, readyTicked: 3 });
    expect(screen.getByText("Checking what needs you...")).toBeInTheDocument();
    expect(screen.queryByText("Nothing is waiting on you right now.")).toBeNull();
    // A queue already built from earlier data still waits for the load.
    const { unmount } = renderIt({ loading: true });
    expect(screen.getAllByText("Checking what needs you...")).toHaveLength(2);
    expect(screen.queryByText("Nothing is waiting on you right now.")).toBeNull();
    unmount();
  });

  it("keeps the sent-back row", () => {
    renderIt({ queue: { ...EMPTY, sendForReview: true, total: 1 }, sentBack: true });
    expect(screen.getByText("The review team sent this back. Make the changes and send it for review again.")).toBeInTheDocument();
  });
});
