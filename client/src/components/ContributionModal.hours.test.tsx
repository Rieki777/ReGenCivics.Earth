import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

const mutate = vi.fn();
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
    <ContributionModal isOpen onClose={vi.fn()} campaignId={3} campaignTitle="Hill Farm" need={need} />,
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
  });

  it("sends the offered hours, not slots, and allows more than the open hours", () => {
    openModal();
    fillContact();
    fireEvent.change(screen.getByLabelText("Hours a week you can offer *"), { target: { value: "50" } });
    fireEvent.click(screen.getByRole("button", { name: "Send my offer" }));
    expect(mutate).toHaveBeenCalledTimes(1);
    const sent = mutate.mock.calls[0][0];
    expect(sent.hoursPerWeek).toBe(50);
    expect(sent.quantityPledged).toBe(1);
    expect(sent.campaignItemId).toBe(9);
    // Priced like the server: capped at the role's hours.
    expect(sent.estimatedValue).toBe(8000);
  });

  it("refuses hours that are not a whole number from 1 to 168", () => {
    openModal();
    fillContact();
    for (const bad of ["0", "169", "2.5", ""]) {
      fireEvent.change(screen.getByLabelText("Hours a week you can offer *"), { target: { value: bad } });
      fireEvent.click(screen.getByRole("button", { name: "Send my offer" }));
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
    fireEvent.click(screen.getByRole("button", { name: "Send my offer" }));
    // The mutation succeeded.
    const { act } = await import("@testing-library/react");
    act(() => { onSuccessCb?.(); });
    expect(screen.getByText(/Your offer is with the stewards/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Make my account/ })).toBeInTheDocument();
    // Thanks reach account holders only, so no promise of one here.
    expect(screen.queryByText("You'll get a thank-you from the project once it's in.")).toBeNull();
  });

  it("promises the thank-you only to someone signed in", async () => {
    authState = { user: { id: 1, name: "Sam", email: "sam@example.com" }, isAuthenticated: true };
    openModal();
    fireEvent.click(screen.getByRole("button", { name: "Send my offer" }));
    const { act } = await import("@testing-library/react");
    act(() => { onSuccessCb?.(); });
    expect(screen.getByText("You'll get a thank-you from the project once it's in.")).toBeInTheDocument();
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
  beforeEach(() => mutate.mockClear());
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
