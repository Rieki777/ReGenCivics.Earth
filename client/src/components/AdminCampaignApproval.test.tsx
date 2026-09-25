import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { computeCampaignProgress } from "@shared/campaignProgress";
import { CROWDPOOL_READINESS } from "@shared/crowdpoolReadiness";

const mutateAsync = vi.fn().mockResolvedValue({ success: true });
const reviewMutate = vi.fn();
let campaignStatus = "pending_review";
let financialTarget = 0;
let loanRoutesOpen = false;
let routes: Array<Record<string, unknown>> = [];

const items = [
  {
    id: 11, campaignId: 44, kind: "item", category: "equipment", capitalType: "material", capacityUnit: "count",
    quantityWanted: 1, quantityClaimed: 0, quantityDelivered: 0, estimatedValue: 1000,
    equipmentName: "Wood chipper", neededFrom: "2026-10-01", neededUntil: "2026-12-15", acceptsGift: 1, acceptsLoan: 1,
  },
];

const campaign = () => {
  const base = {
    id: 44,
    title: "Hill Farm Season",
    projectName: "Hill Farm",
    location: "Vermont",
    status: campaignStatus,
    currency: "USD",
    totalValue: 1000,
    pledgedTotal: 0,
    financialTarget,
    pledgedFinancial: 0,
    landValue: 0,
    contributorsCount: 0,
    durationDays: 60,
    isDemo: 0,
    startedAt: null,
    createdAt: "2026-09-01T00:00:00.000Z",
    description: "A season on the hill.",
    items,
    images: [],
  };
  return {
    ...base,
    progress: computeCampaignProgress({ campaign: base, items, rows: [], lends: [], routes: [] }),
  };
};

vi.mock("@/lib/trpc", () => ({
  trpc: {
    useUtils: () => ({
      campaigns: {
        list: { invalidate: vi.fn() },
        getPartnerLinksForSteward: { invalidate: vi.fn() },
        getReadiness: { invalidate: vi.fn() },
      },
    }),
    campaigns: {
      list: { useQuery: () => ({ data: [campaign()], isLoading: false }) },
      getById: { useQuery: () => ({ data: campaign(), isLoading: false }) },
      updateStatus: { useMutation: () => ({ mutateAsync }) },
      crowdpoolSettings: {
        useQuery: () => ({
          data: { moneyShare: { softMinPct: 10, softMaxPct: 30, defaultPct: 20 }, moneyMovesHere: false, loanRoutesOpen },
        }),
      },
      getReadiness: {
        useQuery: () => ({ data: [{ itemKey: CROWDPOOL_READINESS[0].key, tickedBy: 3, tickedAt: "2026-09-20T10:00:00Z" }] }),
      },
      // The reviewer's own ticks stay local; the stored-ticks hook is idle here.
      setReadinessTick: { useMutation: () => ({ mutate: vi.fn() }) },
      getPartnerLinksForSteward: { useQuery: () => ({ data: routes, isLoading: false }) },
      reviewPartnerLink: { useMutation: () => ({ mutate: reviewMutate, isPending: false }) },
    },
  },
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { AdminCampaignApproval } from "./AdminCampaignApproval";

async function openReview() {
  render(<AdminCampaignApproval />);
  fireEvent.click(screen.getByRole("button", { name: /Review/ }));
  await screen.findByText("Review notes");
}

describe("AdminCampaignApproval", () => {
  beforeEach(() => {
    mutateAsync.mockClear();
    reviewMutate.mockClear();
    campaignStatus = "pending_review";
    financialTarget = 0;
    loanRoutesOpen = false;
    routes = [];
  });

  it("sends review notes with an approval", async () => {
    await openReview();
    fireEvent.change(screen.getByPlaceholderText(/What the stewards should know/), { target: { value: "Lovely. Add a photo of the barn." } });
    fireEvent.click(screen.getByRole("button", { name: /Approve & Publish/ }));
    await waitFor(() => expect(mutateAsync).toHaveBeenCalledWith({
      id: 44, status: "active", reviewNotes: "Lovely. Add a photo of the barn.",
    }));
  });

  it("sends review notes with a decline", async () => {
    await openReview();
    fireEvent.change(screen.getByPlaceholderText(/What the stewards should know/), { target: { value: "Needs a budget." } });
    fireEvent.click(screen.getByRole("button", { name: /Reject/ }));
    await waitFor(() => expect(mutateAsync).toHaveBeenCalledWith({ id: 44, status: "rejected", reviewNotes: "Needs a budget." }));
  });

  it("marks an active campaign complete after a confirm, and never offers funded", async () => {
    campaignStatus = "active";
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);
    await openReview();
    expect(screen.queryByText(/funded/i)).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /Mark complete/ }));
    await waitFor(() => expect(mutateAsync).toHaveBeenCalledWith({ id: 44, status: "completed" }));
    expect(confirmSpy).toHaveBeenCalledWith(expect.stringContaining("contributors with an account hear about it"));
    confirmSpy.mockRestore();
  });

  it("does nothing when the complete confirm is declined", async () => {
    campaignStatus = "active";
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(false);
    await openReview();
    fireEvent.click(screen.getByRole("button", { name: /Mark complete/ }));
    expect(mutateAsync).not.toHaveBeenCalled();
    confirmSpy.mockRestore();
  });

  it("reads the two-line bar, in-kind first, and the ask as in-kind and money", async () => {
    await openReview();
    const bars = screen.getAllByRole("progressbar");
    expect(bars[0]).toHaveAttribute("aria-label", "In-kind");
    expect(screen.getByText("In-kind: 0 of 1 needs met")).toBeInTheDocument();
    expect(screen.getByText("This project asks for no money")).toBeInTheDocument();
    expect(screen.getByText("In-kind asked")).toBeInTheDocument();
    expect(screen.getByText("Money asked")).toBeInTheDocument();
    expect(screen.getByText("Land value")).toBeInTheDocument();
    expect(screen.getByText("60 days")).toBeInTheDocument();
    expect(screen.queryByText(/Pledged|Financial Target|Total Value/)).toBeNull();
  });

  it("lists each need by its own title, with its window and modes", async () => {
    await openReview();
    fireEvent.mouseDown(screen.getByRole("tab", { name: /Items/ }));
    expect(await screen.findByText("Wood chipper")).toBeInTheDocument();
    expect(screen.getByText(/Needed 1 Oct to 15 Dec(?: 2026)?\. Give or lend\./)).toBeInTheDocument();
  });

  it("shows the soft money-share note under the money ask, outside the band too, and never blocks", async () => {
    financialTarget = 1000;
    await openReview();
    expect(screen.getByText("Money is 50% of the whole ask. Most campaigns ask for 10 to 30 percent. You can send it as it is.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Approve & Publish/ })).toBeEnabled();
  });

  it("verifies a pending route with the currency of the partner page", async () => {
    routes = [{
      id: 7, partner: "maearth", label: "Give through Ma Earth", url: "https://maearth.com/p/hill-farm",
      proofUrl: "https://hillfarm.org/support", status: "pending", reviewNote: null, cachedCurrency: null,
      createdAt: "2026-09-21T09:00:00Z",
    }];
    await openReview();
    const row = screen.getByTestId("route-review-7");
    expect(within(row).getByText("Give through Ma Earth")).toBeInTheDocument();
    expect(within(row).getByRole("link", { name: /maearth\.com\/p\/hill-farm/ })).toHaveAttribute("rel", "noopener noreferrer");
    expect(within(row).getByRole("link", { name: "https://hillfarm.org/support" })).toHaveAttribute("rel", "noopener noreferrer");
    expect(within(row).getByText(/Added 21 September 2026/)).toBeInTheDocument();
    const currency = within(row).getByLabelText("Currency of the numbers on that page") as HTMLSelectElement;
    expect(currency.value).toBe("USD");
    fireEvent.change(currency, { target: { value: "EUR" } });
    fireEvent.click(within(row).getByRole("button", { name: "Verify" }));
    expect(reviewMutate).toHaveBeenCalledWith({ linkId: 7, decision: "verified", currency: "EUR" });
  });

  it("hides a route with a note the project sees", async () => {
    routes = [{
      id: 8, partner: "maearth", label: null, url: "https://maearth.com/p/other", proofUrl: null,
      status: "pending", reviewNote: null, cachedCurrency: null, createdAt: "2026-09-21T09:00:00Z",
    }];
    await openReview();
    const row = screen.getByTestId("route-review-8");
    fireEvent.change(within(row).getByLabelText("Why (the project sees this)"), { target: { value: "That page is another farm's." } });
    fireEvent.click(within(row).getByRole("button", { name: "Don't show" }));
    expect(reviewMutate).toHaveBeenCalledWith({ linkId: 8, decision: "rejected", note: "That page is another farm's." });
  });

  it("a Steward route cannot be verified while the loan route switch is off", async () => {
    routes = [{
      id: 9, partner: "gosteward", label: null, url: "https://gosteward.com/p/hill", proofUrl: null,
      status: "pending", reviewNote: null, cachedCurrency: null, createdAt: "2026-09-21T09:00:00Z",
    }];
    await openReview();
    const row = screen.getByTestId("route-review-9");
    expect(within(row).getByText("Loan routes can't be verified until the loan route switch is on.")).toBeInTheDocument();
    expect(within(row).getByRole("button", { name: "Verify" })).toBeDisabled();
  });

  it("a Steward route can be verified once the switch is on", async () => {
    loanRoutesOpen = true;
    routes = [{
      id: 9, partner: "gosteward", label: null, url: "https://gosteward.com/p/hill", proofUrl: null,
      status: "pending", reviewNote: null, cachedCurrency: null, createdAt: "2026-09-21T09:00:00Z",
    }];
    await openReview();
    const row = screen.getByTestId("route-review-9");
    expect(within(row).queryByText(/loan route switch/)).toBeNull();
    expect(within(row).getByRole("button", { name: "Verify" })).toBeEnabled();
  });

  it("a hidden route can be verified later, or hidden again with a new note", async () => {
    routes = [{
      id: 12, partner: "maearth", label: null, url: "https://maearth.com/p/hill-farm", proofUrl: null,
      status: "rejected", reviewNote: "Wrong farm.", cachedCurrency: null, createdAt: "2026-09-21T09:00:00Z",
    }];
    await openReview();
    const row = screen.getByTestId("route-review-12");
    expect(within(row).getByText(/Not shown\. Wrong farm\./)).toBeInTheDocument();
    expect(within(row).getByLabelText("Why (the project sees this)")).toHaveValue("Wrong farm.");
    fireEvent.change(within(row).getByLabelText("Why (the project sees this)"), { target: { value: "Still the wrong farm." } });
    fireEvent.click(within(row).getByRole("button", { name: "Don't show" }));
    expect(reviewMutate).toHaveBeenLastCalledWith({ linkId: 12, decision: "rejected", note: "Still the wrong farm." });
    fireEvent.click(within(row).getByRole("button", { name: "Verify" }));
    expect(reviewMutate).toHaveBeenLastCalledWith({ linkId: 12, decision: "verified", currency: "USD" });
  });

  it("an example route shows no link and no review buttons", async () => {
    routes = [{
      id: 10, partner: "maearth", label: null, url: "https://maearth.com/example", proofUrl: null,
      status: "example", reviewNote: null, cachedCurrency: "USD", createdAt: "2026-09-21T09:00:00Z",
    }];
    await openReview();
    const row = screen.getByTestId("route-review-10");
    expect(within(row).queryByRole("link")).toBeNull();
    expect(within(row).queryByRole("button")).toBeNull();
    expect(within(row).getByText(/Example route\. It never links out\./)).toBeInTheDocument();
  });

  it("shows what the project ticked beside the reviewer's own list", async () => {
    await openReview();
    expect(screen.getByTestId(`project-tick-${CROWDPOOL_READINESS[0].key}`)).toHaveTextContent("The project ticked this on 20 September 2026.");
    expect(screen.getByTestId(`project-tick-${CROWDPOOL_READINESS[1].key}`)).toHaveTextContent("Not ticked by the project.");
  });
});
