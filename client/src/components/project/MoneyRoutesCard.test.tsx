import { describe, expect, it, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { MONEY_ROUTES_CARD } from "@shared/crowdpoolCopy";

type Row = { id: number; partner: string; label: string | null; url: string; status: string; reviewNote: string | null };

const addMutate = vi.fn();
const removeMutate = vi.fn();
let rows: Row[] = [];
let loanRoutesOpen = false;

vi.mock("@/lib/trpc", () => ({
  trpc: {
    useUtils: () => ({ campaigns: { getPartnerLinksForSteward: { invalidate: vi.fn() } } }),
    campaigns: {
      getPartnerLinksForSteward: { useQuery: () => ({ data: rows, isLoading: false, error: null }) },
      crowdpoolSettings: {
        useQuery: () => ({
          data: { moneyShare: { softMinPct: 10, softMaxPct: 30, defaultPct: 20 }, moneyMovesHere: false, loanRoutesOpen },
        }),
      },
      addPartnerLink: { useMutation: () => ({ mutate: addMutate, isPending: false }) },
      removePartnerLink: { useMutation: () => ({ mutate: removeMutate, isPending: false }) },
    },
  },
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { MoneyRoutesCard } from "./MoneyRoutesCard";

const pending: Row = { id: 1, partner: "maearth", label: "Give through Ma Earth", url: "https://maearth.com/p/hill-farm", status: "pending", reviewNote: null };
const verified: Row = { id: 2, partner: "maearth", label: "Give through Ma Earth", url: "https://maearth.com/p/hill-farm-2", status: "verified", reviewNote: null };
const rejected: Row = { id: 3, partner: "gosteward", label: "Lend through Steward", url: "https://gosteward.com/p/hill", status: "rejected", reviewNote: "That page belongs to another farm." };
const example: Row = { id: 4, partner: "gosteward", label: "Lend through GoSteward", url: "https://gosteward.com/example", status: "example", reviewNote: null };

function renderCard(props: Partial<Parameters<typeof MoneyRoutesCard>[0]> = {}) {
  return render(<MoneyRoutesCard campaignId={9} isExample={false} closed={false} {...props} />);
}

describe("MoneyRoutesCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    rows = [];
    loanRoutesOpen = false;
  });

  it("names the card and says what the team checks", () => {
    renderCard();
    const card = document.getElementById("money-routes")!;
    expect(within(card).getByRole("heading", { name: "Money routes" })).toBeInTheDocument();
    expect(screen.getByText(MONEY_ROUTES_CARD.intro)).toBeInTheDocument();
    expect(screen.getByText("No routes yet.")).toBeInTheDocument();
  });

  it("gives every route its status in words", () => {
    rows = [pending, verified, rejected, example];
    renderCard();
    expect(screen.getByText("Waiting for the ReGen Civics team to check it.")).toBeInTheDocument();
    expect(screen.getByText("Checked. It shows on your page.")).toBeInTheDocument();
    expect(screen.getByText("Not shown. That page belongs to another farm.")).toBeInTheDocument();
    expect(screen.getByText("Example route. It never links out.")).toBeInTheDocument();
  });

  it("links real routes out safely, never example routes, and lets only admins remove examples", () => {
    rows = [verified, example];
    renderCard();
    const link = screen.getByRole("link", { name: /hill-farm-2/ });
    expect(link).toHaveAttribute("href", verified.url);
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
    expect(screen.queryByRole("link", { name: /example/ })).toBeNull();
    expect(screen.getAllByRole("button", { name: /^Remove/ })).toHaveLength(1);
    fireEvent.click(screen.getByRole("button", { name: "Remove: Give through Ma Earth" }));
    expect(removeMutate).toHaveBeenCalledWith({ linkId: 2 });
  });

  it("an admin can remove an example route", () => {
    rows = [example];
    renderCard({ isAdmin: true });
    expect(screen.getByRole("button", { name: "Remove: Lend through Steward" })).toBeInTheDocument();
  });

  it("refuses a link off the partner's site with the server's own words, and sends nothing", () => {
    renderCard();
    fireEvent.change(screen.getByLabelText("Link to your project's page"), { target: { value: "https://maearth.com.evil.test/p/x" } });
    fireEvent.click(screen.getByRole("button", { name: "Send for checking" }));
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Use your project's page on Ma Earth. The link has to start with https://maearth.com.",
    );
    expect(addMutate).not.toHaveBeenCalled();
  });

  it("sends a good link for checking, with the proof link", () => {
    renderCard();
    fireEvent.change(screen.getByLabelText("Link to your project's page"), { target: { value: " https://www.maearth.com/p/hill-farm " } });
    fireEvent.change(screen.getByLabelText("A link that shows this page is yours (optional)"), { target: { value: "https://hillfarm.org/support" } });
    fireEvent.click(screen.getByRole("button", { name: "Send for checking" }));
    expect(addMutate).toHaveBeenCalledWith({
      campaignId: 9,
      partner: "maearth",
      url: "https://www.maearth.com/p/hill-farm",
      proofUrl: "https://hillfarm.org/support",
    });
  });

  it("says Steward routes wait while the loan route switch is off", () => {
    renderCard();
    expect(screen.queryByText(MONEY_ROUTES_CARD.loanRoutesWait)).toBeNull();
    fireEvent.change(screen.getByLabelText("Kind of route"), { target: { value: "gosteward" } });
    expect(screen.getByText(MONEY_ROUTES_CARD.loanRoutesWait)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Link to your project's page"), { target: { value: "https://gosteward.com/p/hill-farm" } });
    fireEvent.click(screen.getByRole("button", { name: "Send for checking" }));
    expect(addMutate).toHaveBeenCalledWith(expect.objectContaining({ partner: "gosteward", url: "https://gosteward.com/p/hill-farm" }));
  });

  it("drops the wait line once loans can show", () => {
    loanRoutesOpen = true;
    renderCard();
    fireEvent.change(screen.getByLabelText("Kind of route"), { target: { value: "gosteward" } });
    expect(screen.queryByText(MONEY_ROUTES_CARD.loanRoutesWait)).toBeNull();
  });

  it("the quiz in the closed disclosure preselects the route it recommends", () => {
    renderCard();
    expect(screen.getByText("Not sure which fits?").closest("details")).not.toHaveAttribute("open");
    fireEvent.click(screen.getByRole("button", { name: "Generating revenue and able to repay a loan" }));
    fireEvent.click(screen.getByRole("button", { name: "A smaller number of larger backers" }));
    fireEvent.click(screen.getByRole("button", { name: "$100,000 or more" }));
    expect(screen.getByText("Steward looks like the fit")).toBeInTheDocument();
    expect(screen.getByText("Add that route below.")).toBeInTheDocument();
    expect((screen.getByLabelText("Kind of route") as HTMLSelectElement).value).toBe("gosteward");
  });

  it("an example campaign keeps its example routes and takes no new ones", () => {
    rows = [example];
    renderCard({ isExample: true });
    expect(screen.getByText("Example campaigns keep their example routes.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Send for checking" })).toBeNull();
  });

  it("a closed campaign takes no new routes", () => {
    renderCard({ closed: true });
    expect(screen.getByText("This campaign is closed, so it takes no new routes.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Send for checking" })).toBeNull();
  });

  it("carries no fund copy and no amount field", () => {
    rows = [pending, verified];
    const { container } = renderCard();
    expect(container.textContent).not.toMatch(/\$RCivics|fund minimum|CHF 250|reserve|allocat|seat|donat|pledge|claim|earmark/i);
    expect(container.querySelector('input[type="number"]')).toBeNull();
  });
});
