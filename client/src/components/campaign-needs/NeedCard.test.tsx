import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { NeedCard } from "./NeedCard";
import { needFillRatio } from "./NeedsRegistry";

const role = (over: Record<string, unknown> = {}) => ({
  id: 5,
  kind: "role",
  capacityUnit: "hours_per_week",
  capitalType: "experiential",
  roleTitle: "Farm Manager",
  title: "Farm Manager",
  quantityWanted: 40,
  quantityClaimed: 10,
  quantityDelivered: 0,
  hoursPerWeek: 40,
  estimatedValue: 8000,
  ...over,
});

function renderCard(item: any, extra: Record<string, unknown> = {}) {
  const onClaim = vi.fn();
  render(
    <NeedCard
      item={item}
      capital="experiential"
      accent="#4a7c59"
      campaignActive
      formatCurrency={(n) => `$${n}`}
      onClaim={onClaim}
      {...extra}
    />,
  );
  return onClaim;
}

describe("NeedCard on an hours need", () => {
  it("reads in hours a week and offers time", () => {
    const onClaim = renderCard(role());
    expect(screen.getByText(/Needs 40 hours a week \(about 1 full-time person\)/)).toBeInTheDocument();
    expect(screen.getByText(/10 of 40 hours a week filled/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Offer your time/ }));
    expect(onClaim).toHaveBeenCalledWith(expect.objectContaining({
      id: 5,
      kind: "role",
      capacityUnit: "hours_per_week",
      quantityWanted: 40,
      quantityClaimed: 10,
    }));
  });

  it("shows Filled and no button once every hour is accepted", () => {
    renderCard(role({ quantityClaimed: 40 }));
    expect(screen.getByText("This role is filled")).toBeInTheDocument();
    expect(screen.getByText("Filled")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Offer your time|Claim/ })).toBeNull();
  });

  it("a legacy role still on count reads as slots, as before", () => {
    renderCard(role({ capacityUnit: "count", quantityWanted: 2, quantityClaimed: 1, quantityDelivered: 0 }));
    expect(screen.getByText(/0 of 2 delivered, 1 more claimed/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Claim/ })).toBeInTheDocument();
    expect(screen.queryByText(/hours a week/)).toBeNull();
  });

  it("hides the claim button when claims are hidden (cancelled campaign)", () => {
    renderCard(role(), { claimsHidden: true });
    expect(screen.queryByRole("button", { name: /Offer your time|Claim/ })).toBeNull();
  });
});

describe("needFillRatio", () => {
  it("uses accepted hours over hours needed for hours needs", () => {
    expect(needFillRatio(role())).toBe(0.25);
    expect(needFillRatio(role({ quantityClaimed: 40 }))).toBe(1);
  });
  it("uses claimed slots for other needs", () => {
    expect(needFillRatio({ kind: "item", quantityWanted: 4, quantityClaimed: 1 })).toBe(0.25);
    expect(needFillRatio({ kind: "role", capacityUnit: "count", quantityWanted: 2, quantityClaimed: 2 })).toBe(1);
  });
});
