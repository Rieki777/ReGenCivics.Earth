import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

const mutate = vi.fn();
const follow = vi.fn();
let authState: { user: any; isAuthenticated: boolean } = { user: null, isAuthenticated: false };
let onSuccessCb: (() => void) | null = null;

vi.mock("@/lib/trpc", () => ({
  trpc: {
    useUtils: () => ({ auth: { me: { invalidate: vi.fn() } } }),
    campaigns: {
      submitContribution: {
        useMutation: (opts: { onSuccess?: () => void }) => {
          onSuccessCb = opts?.onSuccess ?? null;
          return { mutate, isPending: false };
        },
      },
      joinWaitlist: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) },
      follow: { useMutation: () => ({ mutate: follow, isPending: false }) },
    },
  },
}));
vi.mock("@/_core/hooks/useAuth", () => ({ useAuth: () => authState }));
vi.mock("@/const", () => ({ getGoogleLoginUrl: () => "/api/auth/google", getLoginUrl: () => "/login" }));

import { ContributionModal, parseOfferHours, offerValue, type ContributionNeed } from "./ContributionModal";

const hoursNeed: ContributionNeed = {
  id: 9,
  kind: "role",
  capitalType: "experiential",
  title: "Farm Manager",
  quantityWanted: 40,
  quantityClaimed: 10,
  quantityDelivered: 0,
  estimatedValue: 8000,
  capacityUnit: "hours_per_week",
  hoursPerWeek: 40,
};

function openModal(need: ContributionNeed = hoursNeed) {
  return render(
    <ContributionModal isOpen onClose={vi.fn()} campaignId={3} campaignTitle="Hill Farm" projectName="Hill Farm" need={need} />,
  );
}

function fillContact() {
  fireEvent.change(screen.getByLabelText("Name *"), { target: { value: "Sam" } });
  fireEvent.change(screen.getByLabelText("Email *"), { target: { value: "sam@example.com" } });
}

describe("ContributionModal on an hours need", () => {
  beforeEach(() => {
    mutate.mockClear();
    authState = { user: null, isAuthenticated: false };
  });

  it("prefills the open hours and says how many are open", () => {
    openModal();
    const hours = screen.getByLabelText("Hours a week you can offer *") as HTMLInputElement;
    expect(hours.value).toBe("30");
    expect(screen.getByText("30 of 40 hours a week are still open. You can offer more or less.")).toBeInTheDocument();
    expect(screen.getByText("10 of 40 hours a week filled")).toBeInTheDocument();
    // The slot counter never shows for a role in hours.
    expect(screen.queryByLabelText(/How many slots/)).toBeNull();
    // No price in front of a person's time.
    expect(screen.queryByText(/Value of your offer/)).toBeNull();
    expect(screen.queryByText(/\$/)).toBeNull();
  });

  it("is an application: Apply for the role, Send my application", () => {
    openModal();
    expect(screen.getByRole("heading", { name: "Apply for Farm Manager" })).toBeInTheDocument();
    expect(screen.getByText("Your application goes to the stewards of Hill Farm.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Send my application" })).toBeInTheDocument();
  });

  it("sends the offered hours, not slots, and allows more than the open hours", () => {
    openModal();
    fillContact();
    fireEvent.change(screen.getByLabelText("Hours a week you can offer *"), { target: { value: "50" } });
    fireEvent.click(screen.getByRole("button", { name: "Send my application" }));
    expect(mutate).toHaveBeenCalledTimes(1);
    const sent = mutate.mock.calls[0][0];
    expect(sent.hoursPerWeek).toBe(50);
    expect(sent.quantityPledged).toBe(1);
    expect(sent.campaignItemId).toBe(9);
    // What rides along matches the server's own pricing (capped at the
    // role's hours); the server sets the stored value itself.
    expect(sent.estimatedValue).toBe(8000);
    expect(sent.offerMode).toBeUndefined();
  });

  it("refuses hours that are not a whole number from 1 to 168", () => {
    openModal();
    fillContact();
    for (const bad of ["0", "169", "2.5", ""]) {
      fireEvent.change(screen.getByLabelText("Hours a week you can offer *"), { target: { value: bad } });
      fireEvent.click(screen.getByRole("button", { name: "Send my application" }));
    }
    expect(mutate).not.toHaveBeenCalled();
  });

  it("nudges a signed-out person to use their sign-in email and offers sign-in", () => {
    openModal();
    expect(screen.getByText(/Use the email you'd sign in with/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Have an account? Sign in first" })).toBeInTheDocument();
  });

  it("shows the account card on success when signed out", async () => {
    openModal();
    fillContact();
    fireEvent.click(screen.getByRole("button", { name: "Send my application" }));
    // The mutation succeeded.
    const { act } = await import("@testing-library/react");
    act(() => { onSuccessCb?.(); });
    expect(screen.getByRole("status")).toHaveTextContent("Application sent");
    expect(screen.getByText("The stewards will answer you. We'll email you at sam@example.com when they do.")).toBeInTheDocument();
    expect(screen.getAllByText("We hold your tokens until you make an account.").length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: /Make my account/ })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Follow/ })).toBeNull();
  });

  it("signed in: answers come to notifications, Follow is offered once", async () => {
    authState = { user: { id: 1, name: "Sam", email: "sam@example.com" }, isAuthenticated: true };
    openModal();
    fireEvent.click(screen.getByRole("button", { name: "Send my application" }));
    const { act } = await import("@testing-library/react");
    act(() => { onSuccessCb?.(); });
    expect(screen.getByText("The stewards will answer you in your notifications and by email.")).toBeInTheDocument();
    expect(screen.queryByText("We hold your tokens until you make an account.")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Follow Hill Farm" }));
    expect(follow).toHaveBeenCalledWith({ campaignId: 3 });
  });

  it("offers no Follow to someone already following", async () => {
    authState = { user: { id: 1, name: "Sam", email: "sam@example.com" }, isAuthenticated: true };
    render(<ContributionModal isOpen onClose={vi.fn()} campaignId={3} campaignTitle="Hill Farm" projectName="Hill Farm" need={hoursNeed} isFollowing />);
    fireEvent.click(screen.getByRole("button", { name: "Send my application" }));
    const { act } = await import("@testing-library/react");
    act(() => { onSuccessCb?.(); });
    expect(screen.queryByRole("button", { name: /Follow/ })).toBeNull();
  });

  it("shows no nudge to someone signed in", () => {
    authState = { user: { id: 1, name: "Sam", email: "sam@example.com" }, isAuthenticated: true };
    openModal();
    expect(screen.queryByText(/Use the email you'd sign in with/)).toBeNull();
    expect(screen.queryByRole("button", { name: "Have an account? Sign in first" })).toBeNull();
    expect((screen.getByLabelText("Email *") as HTMLInputElement).value).toBe("sam@example.com");
  });
});

describe("ContributionModal on a count need", () => {
  beforeEach(() => { mutate.mockClear(); authState = { user: null, isAuthenticated: false }; });
  it("keeps the slot path for a legacy role on count", () => {
    openModal({ ...hoursNeed, capacityUnit: "count", quantityWanted: 3, quantityClaimed: 1 });
    expect(screen.queryByLabelText("Hours a week you can offer *")).toBeNull();
    expect(screen.getByLabelText(/How many slots\? \(up to 2\)/)).toBeInTheDocument();
    expect(screen.getByText("1 of 3 filled")).toBeInTheDocument();
  });
});

describe("offer helpers", () => {
  it("parseOfferHours takes whole hours from 1 to 168", () => {
    expect(parseOfferHours("10")).toBe(10);
    expect(parseOfferHours(" 168 ")).toBe(168);
    expect(parseOfferHours("0")).toBeNull();
    expect(parseOfferHours("169")).toBeNull();
    expect(parseOfferHours("1.5")).toBeNull();
    expect(parseOfferHours("-3")).toBeNull();
    expect(parseOfferHours("")).toBeNull();
  });
  it("offerValue is the share of the role's value by hours, capped at the role", () => {
    expect(offerValue(hoursNeed, 10)).toBe(2000);
    expect(offerValue(hoursNeed, 80)).toBe(8000);
  });
});
