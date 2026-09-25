import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { WholeAskSheet } from "./WholeAskSheet";
import { TwoLineBar } from "./TwoLineBar";
import { computeCampaignProgress, type ProgressItem, type ProgressRow } from "@shared/campaignProgress";
import { CAPITAL_TYPES } from "@shared/capitals";

const fmt = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;

const items: ProgressItem[] = [
  { id: 1, kind: "item", capitalType: "material", estimatedValue: 60000, quantityWanted: 1, equipmentName: "Tractor" },
  { id: 2, kind: "role", capitalType: "experiential", capacityUnit: "count", estimatedValue: 20000, quantityWanted: 1, roleTitle: "Cook" },
];
const rows: ProgressRow[] = [
  { campaignItemId: 1, status: "fulfilled", contributionType: "equipment", offerMode: "give", quantity: 1, value: 60000, financialValue: 60000, count: 1 },
  // A freeform offer the stewards accepted: shown in the sheet, not counted in the half.
  { campaignItemId: null, status: "accepted", contributionType: "knowledge", offerMode: null, quantity: 1, value: 500, financialValue: 500, count: 1 },
];
const progress = computeCampaignProgress({
  campaign: { status: "active", isDemo: 0, financialTarget: 20000, currency: "USD", startedAt: new Date("2027-01-01T00:00:00Z"), durationDays: 72 },
  items,
  rows,
  lends: [],
  routes: [
    { partner: "maearth", status: "verified", cachedRaised: 5000, cachedCurrency: "USD", lastFetchedAt: null },
    { partner: "gosteward", status: "verified", cachedRaised: 3000, cachedCurrency: "EUR", lastFetchedAt: null },
  ],
});

function Harness({ onSeeNeeds = vi.fn(), onSeeMoney = vi.fn() }: { onSeeNeeds?: (c: string) => void; onSeeMoney?: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <TwoLineBar progress={progress} formatCurrency={fmt} onOpenSheet={() => setOpen(true)} />
      <WholeAskSheet open={open} onOpenChange={setOpen} progress={progress} formatCurrency={fmt} onSeeNeeds={onSeeNeeds} onSeeMoney={onSeeMoney} />
    </>
  );
}

describe("WholeAskSheet", () => {
  it("opens from the in-kind line with nine rows in capital order, whose figures add up to the headline", () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole("button", { name: /See the whole ask by form of capital/ }));
    const dialog = screen.getByRole("dialog", { name: "The whole ask, in nine forms of capital" });
    // Whole ask = in-kind 80,000 + money 20,000; confirmed = 60,000 + min(5,000, 20,000).
    expect(within(dialog).getByText("$100,000 asked. $65,000 confirmed so far.")).toBeInTheDocument();
    const rowsEl = dialog.querySelectorAll("li[data-capital]");
    expect(Array.from(rowsEl).map((li) => li.getAttribute("data-capital"))).toEqual([...CAPITAL_TYPES]);
  });

  it("each row says what was asked, confirmed and delivered; an empty row says so in words", () => {
    render(<WholeAskSheet open onOpenChange={() => {}} progress={progress} formatCurrency={fmt} onSeeNeeds={() => {}} onSeeMoney={() => {}} />);
    const row = (c: string) => document.querySelector(`li[data-capital="${c}"]`) as HTMLElement;
    expect(within(row("material")).getByText("Material capital")).toBeInTheDocument();
    expect(within(row("material")).getByText("Asked $60,000")).toBeInTheDocument();
    expect(within(row("material")).getByText("Confirmed $60,000")).toBeInTheDocument();
    expect(within(row("material")).getByText("Delivered $60,000")).toBeInTheDocument();
    expect(within(row("experiential")).queryByText(/Delivered/)).toBeNull();
    expect(within(row("spiritual")).getByText("Nothing asked in this form.")).toBeInTheDocument();
    expect(within(row("intellectual")).getByText("Plus $500 in other offers the stewards accepted.")).toBeInTheDocument();
    expect(within(row("financial")).getByText("Asked $20,000")).toBeInTheDocument();
    expect(within(row("financial")).getByText("Confirmed $5,000")).toBeInTheDocument();
    // A route in another currency is shown on its own.
    expect(within(row("financial")).getByText("3,000 EUR through Steward is shown on its own, in its own currency.")).toBeInTheDocument();
    expect(screen.getByText("Values are each project's own estimates. Confirmed means the project's stewards accepted it.")).toBeInTheDocument();
  });

  it("moves to a form's needs, or to the money block", () => {
    const onSeeNeeds = vi.fn();
    const onSeeMoney = vi.fn();
    render(<WholeAskSheet open onOpenChange={() => {}} progress={progress} formatCurrency={fmt} onSeeNeeds={onSeeNeeds} onSeeMoney={onSeeMoney} />);
    const row = (c: string) => document.querySelector(`li[data-capital="${c}"]`) as HTMLElement;
    fireEvent.click(within(row("material")).getByRole("button", { name: "See these needs" }));
    expect(onSeeNeeds).toHaveBeenCalledWith("material");
    fireEvent.click(within(row("financial")).getByRole("button", { name: "See ways to put money in" }));
    expect(onSeeMoney).toHaveBeenCalled();
    // A form with no needs has nothing to move to.
    expect(within(row("spiritual")).queryByRole("button")).toBeNull();
  });
});
