import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { NeedCard } from "./NeedCard";
import { needFillRatio } from "./NeedsRegistry";
import type { NeedProgress } from "@shared/campaignProgress";

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

const np = (over: Partial<NeedProgress> = {}): NeedProgress => ({
  unit: "count",
  wanted: 1,
  confirmed: 0,
  delivered: 0,
  offered: 0,
  offerCount: 0,
  open: 1,
  filled: false,
  confirmedValue: 0,
  deliveredValue: 0,
  gives: 0,
  lends: [],
  status: { key: "none", text: "No one has offered yet" },
  ...over,
});

function renderCard(item: any, extra: Record<string, unknown> = {}) {
  const onClaim = vi.fn();
  const { container } = render(
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
  return { onClaim, container };
}

describe("NeedCard verbs and anchors", () => {
  it("carries id=need-{id} so a link can land on it", () => {
    const { container } = renderCard(role());
    expect(container.querySelector("#need-5")).not.toBeNull();
  });

  it("roles and knowledge sessions Apply, things Offer, shifts Sign up", () => {
    renderCard(role({ id: 1 }));
    expect(screen.getByRole("button", { name: "Apply: Farm Manager" })).toBeInTheDocument();
  });

  it.each([
    [{ id: 2, kind: "knowledge", resourceName: "Soil class", quantityWanted: 1 }, "Apply"],
    [{ id: 3, kind: "item", equipmentName: "Tractor", quantityWanted: 1, estimatedValue: 9000 }, "Offer"],
    [{ id: 4, kind: "loan", equipmentName: "Wood chipper", quantityWanted: 1, estimatedValue: 500 }, "Offer"],
    [{ id: 6, kind: "shift", roleTitle: "Planting day", quantityWanted: 12 }, "Sign up"],
  ])("%o shows %s", (item, verb) => {
    renderCard(item);
    expect(screen.getByRole("button", { name: new RegExp(`^${verb}: `) })).toHaveTextContent(verb);
    expect(screen.queryByText(/Claim|Offer your time/)).toBeNull();
  });
});

describe("NeedCard statuses", () => {
  it("prints the status from the campaign reading, in words", () => {
    renderCard({ id: 3, kind: "item", equipmentName: "Tractor", quantityWanted: 3, estimatedValue: 900 }, {
      progress: np({ wanted: 3, offered: 1, offerCount: 1, status: { key: "partly", text: "1 of 3 offered" } }),
    });
    expect(screen.getByText("1 of 3 offered")).toBeInTheDocument();
  });

  it("with no reading, reads the need's own counters", () => {
    renderCard({ id: 3, kind: "item", equipmentName: "Tractor", quantityWanted: 2, quantityClaimed: 0, estimatedValue: 900 });
    expect(screen.getByText("No one has offered yet")).toBeInTheDocument();
  });

  it("adds a delivered line when something has arrived", () => {
    renderCard({ id: 3, kind: "item", equipmentName: "Tractor", quantityWanted: 3, estimatedValue: 900 }, {
      progress: np({ wanted: 3, confirmed: 2, delivered: 1, offered: 2, offerCount: 2, status: { key: "partly", text: "2 of 3 offered" } }),
    });
    expect(screen.getByText("1 delivered")).toBeInTheDocument();
  });

  it("a filled need says Filled and shows no button", () => {
    renderCard(role({ quantityClaimed: 40 }));
    expect(screen.getByText("Filled")).toBeInTheDocument();
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("hides the button when the campaign is cancelled", () => {
    renderCard(role(), { claimsHidden: true });
    expect(screen.queryByRole("button")).toBeNull();
  });
});

describe("NeedCard on an hours need (R18)", () => {
  it("says the time in plain words, with no dollar figure", () => {
    const { onClaim } = renderCard(role({ durationMonths: 6 }));
    expect(screen.getByText("40 hrs a week for 6 months, about 1,040 hours in all")).toBeInTheDocument();
    expect(screen.getByText(/about 1 full-time person/)).toBeInTheDocument();
    expect(screen.getByText("10 of 40 hours a week offered")).toBeInTheDocument();
    expect(screen.queryByText("$8000")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /^Apply/ }));
    expect(onClaim).toHaveBeenCalledWith(expect.objectContaining({
      id: 5,
      kind: "role",
      capacityUnit: "hours_per_week",
      quantityWanted: 40,
      quantityClaimed: 10,
    }));
  });

  it("with an end date, counts the hours to it", () => {
    renderCard(role({ quantityWanted: 10, quantityClaimed: 0, neededFrom: "2026-01-05", neededUntil: "2026-03-02" }));
    expect(screen.getByText(/^10 hrs a week until 2 Mar/)).toBeInTheDocument();
    expect(screen.getByText(/about 80 hours in all$/)).toBeInTheDocument();
  });

  it("a legacy role still on count reads as slots", () => {
    renderCard(role({ capacityUnit: "count", quantityWanted: 2, quantityClaimed: 1, quantityDelivered: 0, hoursPerWeek: 10 }));
    expect(screen.getByText("1 of 2 offered")).toBeInTheDocument();
    expect(screen.getByText("10 hrs a week each")).toBeInTheDocument();
  });
});

describe("NeedCard on a thing", () => {
  const tractor = {
    id: 7, kind: "item", equipmentName: "Tractor", quantityWanted: 1, estimatedValue: 9000,
    acceptsGift: 1, acceptsLoan: 1, neededFrom: "2026-03-01", neededUntil: "2026-06-30",
  };

  it("keeps its value and says when it is needed and how it may come", () => {
    renderCard(tractor);
    expect(screen.getByText("$9000")).toBeInTheDocument();
    expect(screen.getByText(/^Needed 1 Mar( 2026)? to 30 Jun( 2026)?\. Give or lend\.$/)).toBeInTheDocument();
  });

  it("shows what is already offered to give or lend", () => {
    renderCard(tractor, {
      progress: np({ offered: 2, offerCount: 2, gives: 1, lends: [{ quantity: 1, from: "2026-04-01", until: "2026-06-30" }], status: { key: "waiting", text: "Offered, waiting on the stewards" } }),
    });
    expect(screen.getByText("Offered, waiting on the stewards")).toBeInTheDocument();
    expect(screen.getByText(/^Offered so far: 1 to give\. 1 to lend, 1 Apr( 2026)? to 30 Jun( 2026)?\.$/)).toBeInTheDocument();
  });

  it("passes the modes and dates to the offer sheet", () => {
    const { onClaim } = renderCard(tractor);
    fireEvent.click(screen.getByRole("button", { name: /^Offer/ }));
    expect(onClaim).toHaveBeenCalledWith(expect.objectContaining({
      id: 7, kind: "item", acceptsGift: 1, acceptsLoan: 1, neededFrom: "2026-03-01", neededUntil: "2026-06-30",
    }));
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
