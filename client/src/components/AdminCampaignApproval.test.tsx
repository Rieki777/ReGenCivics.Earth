import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const mutateAsync = vi.fn().mockResolvedValue({ success: true });
let campaignStatus = "pending_review";

const campaign = () => ({
  id: 44,
  title: "Hill Farm Season",
  projectName: "Hill Farm",
  location: "Vermont",
  status: campaignStatus,
  currency: "USD",
  totalValue: 1000,
  pledgedTotal: 0,
  financialTarget: 0,
  pledgedFinancial: 0,
  landValue: 0,
  contributorsCount: 0,
  createdAt: "2026-09-01T00:00:00.000Z",
  description: "A season on the hill.",
  items: [],
  images: [],
});

vi.mock("@/lib/trpc", () => ({
  trpc: {
    useUtils: () => ({ campaigns: { list: { invalidate: vi.fn() } } }),
    campaigns: {
      list: { useQuery: () => ({ data: [campaign()], isLoading: false }) },
      getById: { useQuery: () => ({ data: campaign(), isLoading: false }) },
      updateStatus: { useMutation: () => ({ mutateAsync }) },
    },
  },
}));
vi.mock("./CampaignProgressTracker", () => ({ CampaignProgressTracker: () => null }));

import { AdminCampaignApproval } from "./AdminCampaignApproval";

async function openReview() {
  render(<AdminCampaignApproval />);
  fireEvent.click(screen.getByRole("button", { name: /Review/ }));
  await screen.findByText("Review notes");
}

describe("AdminCampaignApproval", () => {
  beforeEach(() => {
    mutateAsync.mockClear();
    campaignStatus = "pending_review";
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
});
