import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { TwoLineBar } from "./TwoLineBar";
import { computeCampaignProgress, summarizeProgress, type ProgressItem, type ProgressRoute, type ProgressRow } from "@shared/campaignProgress";

const fmt = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;

const items: ProgressItem[] = [
  { id: 1, kind: "item", estimatedValue: 60000, quantityWanted: 1, equipmentName: "Tractor" },
  { id: 2, kind: "role", capacityUnit: "count", estimatedValue: 20000, quantityWanted: 2, roleTitle: "Cook" },
  { id: 3, kind: "shift", estimatedValue: 10000, quantityWanted: 1, roleTitle: "Planting day" },
];
const rows: ProgressRow[] = [
  { campaignItemId: 1, status: "fulfilled", contributionType: "equipment", offerMode: "give", quantity: 1, value: 60000, financialValue: 60000, count: 1 },
];
const routes: ProgressRoute[] = [
  { partner: "maearth", status: "verified", cachedRaised: 8000, cachedCurrency: "USD", lastFetchedAt: null },
  { partner: "gosteward", status: "verified", cachedRaised: 4000, cachedCurrency: "USD", lastFetchedAt: null },
];
const campaign = { status: "active", isDemo: 0, financialTarget: 20000, currency: "USD", startedAt: new Date("2027-01-01T00:00:00Z"), durationDays: 72 };

function progress(over: Partial<typeof campaign> = {}, r: ProgressRoute[] = routes) {
  return computeCampaignProgress({ campaign: { ...campaign, ...over }, items, rows, lends: [], routes: r });
}

describe("TwoLineBar, full", () => {
  it("reads in-kind first, then money, then the open, completion and strip lines", () => {
    render(<TwoLineBar progress={progress()} formatCurrency={fmt} settings={{ moneyMovesHere: false }} onOpenSheet={() => {}} />);
    const text = document.body.textContent ?? "";
    const order = [
      "Pooled so far",
      "In-kind: 1 of 3 needs met ($60,000 of $90,000 confirmed)",
      "Money: $12,000 of $20,000 through partner routes ($4,000 of it lent)",
      "2 needs still open. 1 role, 1 shift.",
      "Complete means the money half and the in-kind half both land by 14 March 2027.",
      "No money moves through this site yet.",
      "Stewards are asked to answer every offer and post what happens.",
    ].map((s) => text.indexOf(s));
    expect(order.every((i) => i >= 0)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
    // The completion line carries the date, so there is no separate Closes line.
    expect(text).not.toMatch(/Closes /);
    expect(text).not.toMatch(/%|funded|days left/i);
  });

  it("each bar's aria-valuetext is exactly its visible line", () => {
    render(<TwoLineBar progress={progress()} formatCurrency={fmt} />);
    const [inKind, money] = screen.getAllByRole("progressbar");
    expect(inKind).toHaveAttribute("aria-label", "In-kind");
    expect(inKind).toHaveAttribute("aria-valuetext", "In-kind: 1 of 3 needs met ($60,000 of $90,000 confirmed)");
    expect(inKind).toHaveAttribute("aria-valuenow", "66");
    expect(inKind).toHaveAttribute("aria-valuemin", "0");
    expect(inKind).toHaveAttribute("aria-valuemax", "100");
    expect(screen.getAllByText("In-kind: 1 of 3 needs met ($60,000 of $90,000 confirmed)").length).toBeGreaterThan(0);
    expect(money).toHaveAttribute("aria-label", "Money");
    expect(money).toHaveAttribute("aria-valuetext", "Money: $12,000 of $20,000 through partner routes ($4,000 of it lent)");
    expect(money).toHaveAttribute("aria-valuenow", "60");
  });

  it("the in-kind line is a button that opens the whole-ask sheet", () => {
    const onOpenSheet = vi.fn();
    render(<TwoLineBar progress={progress()} formatCurrency={fmt} onOpenSheet={onOpenSheet} />);
    const button = screen.getByRole("button", {
      name: "In-kind: 1 of 3 needs met ($60,000 of $90,000 confirmed). See the whole ask by form of capital.",
    });
    expect(button).toHaveAttribute("aria-haspopup", "dialog");
    expect(screen.getByText("See all nine forms of capital")).toBeInTheDocument();
    fireEvent.click(button);
    expect(onOpenSheet).toHaveBeenCalledTimes(1);
  });

  it("names a verified Ma Earth route in the strip, and drops the money line's bar when no money is asked", () => {
    const { unmount } = render(<TwoLineBar progress={progress()} formatCurrency={fmt} settings={{ moneyMovesHere: false }} maEarthVerified />);
    expect(screen.getByText("Gifts through Ma Earth go to the project either way.")).toBeInTheDocument();
    unmount();
    render(<TwoLineBar progress={progress({ financialTarget: 0 }, [])} formatCurrency={fmt} />);
    expect(screen.getByText("This project asks for no money")).toBeInTheDocument();
    expect(screen.getAllByRole("progressbar")).toHaveLength(1);
    expect(screen.getByText("Complete means every need is confirmed by 14 March 2027.")).toBeInTheDocument();
  });

  it("an example campaign carries the example completion rule", () => {
    render(<TwoLineBar progress={progress({ isDemo: 1 })} formatCurrency={fmt} />);
    expect(screen.getByText("On a real campaign, complete means the money half and the in-kind half both land by its close date.")).toBeInTheDocument();
  });
});

describe("TwoLineBar, compact", () => {
  it("shows the two short lines, thin bars and the close date, and no completion line or strip", () => {
    const p = progress();
    render(<TwoLineBar progress={summarizeProgress(p, items)} formatCurrency={fmt} variant="compact" />);
    const text = document.body.textContent ?? "";
    expect(text.indexOf("In-kind: 1 of 3 needs met")).toBeLessThan(text.indexOf("Money: $12,000 of $20,000"));
    expect(screen.getByText("Closes 14 March 2027")).toBeInTheDocument();
    const [inKind, money] = screen.getAllByRole("progressbar");
    expect(inKind).toHaveAttribute("aria-valuetext", "In-kind: 1 of 3 needs met");
    expect(money).toHaveAttribute("aria-valuetext", "Money: $12,000 of $20,000");
    expect(text).not.toMatch(/Complete means|Stewards are asked|Pooled so far/);
    expect(screen.queryByRole("button")).toBeNull();
  });
});
