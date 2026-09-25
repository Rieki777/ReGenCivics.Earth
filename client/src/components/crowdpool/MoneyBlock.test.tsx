import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { MoneyBlock, type MoneyRoute } from "./MoneyBlock";
import { HOLDER_LINE, LOAN_INTEREST_LINE, MONEY_BLOCK } from "@shared/crowdpoolCopy";

const maearth: MoneyRoute = {
  id: 1, partner: "maearth", label: "Give through Ma Earth", url: "https://maearth.com/p/hill-farm",
  cachedRaised: 8000, cachedCurrency: "USD", lastFetchedAt: "2026-09-20T03:00:00Z", status: "verified",
};
const steward: MoneyRoute = {
  id: 2, partner: "gosteward", label: "Lend through Steward", url: "https://gosteward.com/p/hill-farm",
  cachedRaised: 4000, cachedCurrency: "USD", lastFetchedAt: null, status: "verified",
};
const asks = { asksNone: false };

describe("MoneyBlock", () => {
  it("has no input of any kind", () => {
    const { container } = render(<MoneyBlock routes={[maearth, steward]} money={asks} currency="USD" />);
    expect(container.querySelectorAll("input, select, textarea, [contenteditable]")).toHaveLength(0);
    expect(screen.queryByRole("textbox")).toBeNull();
    expect(screen.queryByRole("spinbutton")).toBeNull();
  });

  it("names who holds the money on each card, exactly, and links out to finish there", () => {
    render(<MoneyBlock routes={[maearth, steward]} money={asks} currency="USD" />);
    const section = document.getElementById("money")!;
    expect(within(section).getByRole("heading", { name: "Putting money in" })).toBeInTheDocument();
    expect(screen.getByText("Most of what this project needs is listed above. If you'd like to put money in, these are the routes it holds. The ReGen Civics team checked each one.")).toBeInTheDocument();
    expect(screen.getByText(HOLDER_LINE.maearth)).toBeInTheDocument();
    expect(screen.getByText(HOLDER_LINE.gosteward)).toBeInTheDocument();
    expect(screen.getByText(LOAN_INTEREST_LINE)).toBeInTheDocument();
    expect(screen.getByText("Ma Earth pools gifts and can match them with grant money, so a small gift grows.")).toBeInTheDocument();
    expect(screen.getByText("$8,000 given so far")).toBeInTheDocument();
    expect(screen.getByText(", as of 20 September 2026")).toBeInTheDocument();
    expect(screen.getByText("$4,000 lent so far")).toBeInTheDocument();
    const give = screen.getByRole("link", { name: "Give on Ma Earth" });
    expect(give).toHaveAttribute("href", maearth.url);
    expect(give).toHaveAttribute("target", "_blank");
    expect(give).toHaveAttribute("rel", "noopener noreferrer");
    expect(screen.getByRole("link", { name: "Lend through Steward" })).toHaveAttribute("href", steward.url);
  });

  it("an example route shows its badge and example figures, and never links out", () => {
    render(<MoneyBlock routes={[{ ...maearth, status: "example" }, { ...steward, status: "example" }]} money={asks} currency="USD" />);
    expect(screen.getAllByText("Example route")).toHaveLength(2);
    expect(screen.getAllByText(/Example figures/).length).toBe(2);
    expect(screen.queryByRole("link")).toBeNull();
    expect(screen.getByText(HOLDER_LINE.maearth)).toBeInTheDocument();
    expect(screen.queryByText(/as of/)).toBeNull();
  });

  it("never shows a route that is not verified or an example", () => {
    render(<MoneyBlock routes={[{ ...maearth, status: "pending" }, { ...steward, status: "rejected" }]} money={asks} currency="USD" />);
    expect(screen.getByText("This project has no money route yet. Its needs above are open to you.")).toBeInTheDocument();
    expect(screen.queryByRole("link")).toBeNull();
  });

  it("a project that asks for no money says so, with no cards", () => {
    render(<MoneyBlock routes={[maearth]} money={{ asksNone: true }} currency="USD" />);
    expect(screen.getByText("This project asks for no money. Its needs above are where you can help.")).toBeInTheDocument();
    expect(screen.queryByRole("link")).toBeNull();
  });

  it("a route in another currency shows its own amount in its own currency", () => {
    render(<MoneyBlock routes={[{ ...maearth, cachedCurrency: "EUR", cachedRaised: 3000 }]} money={asks} currency="USD" />);
    expect(screen.getByText("€3,000 given so far")).toBeInTheDocument();
  });

  it("carries no fund copy", () => {
    const { container } = render(<MoneyBlock routes={[maearth, steward]} money={asks} currency="USD" />);
    expect(container.textContent).not.toMatch(/\$RCivics|fund minimum|CHF 250|reserve|allocat|seat|donat|pledge|claim/i);
  });
});

describe("MoneyBlock intro and loading", () => {
  it("says the team checked each route only when every route shown was verified", () => {
    render(<MoneyBlock routes={[maearth, steward]} money={asks} currency="USD" />);
    expect(screen.getByText(MONEY_BLOCK.introWithRoutes)).toBeInTheDocument();
  });

  it("on example routes says what they are, and never that anyone checked them", () => {
    const { container } = render(
      <MoneyBlock routes={[{ ...maearth, status: "example" }, { ...steward, status: "example" }]} money={asks} currency="USD" />,
    );
    expect(screen.getByText(MONEY_BLOCK.introExample)).toBeInTheDocument();
    expect(container.textContent).not.toContain("The ReGen Civics team checked each one.");
  });

  it("while the routes load, it waits and never says there is no route", () => {
    const { container } = render(<MoneyBlock routes={undefined} money={asks} currency="USD" />);
    expect(screen.getByText(MONEY_BLOCK.loading)).toHaveAttribute("aria-busy", "true");
    expect(container.textContent).not.toContain(MONEY_BLOCK.noRoute);
  });

  it("with the routes loaded and none shown, it says there is no route", () => {
    render(<MoneyBlock routes={[]} money={asks} currency="USD" />);
    expect(screen.getByText(MONEY_BLOCK.noRoute)).toBeInTheDocument();
  });
});
