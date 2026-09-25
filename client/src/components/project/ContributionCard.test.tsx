import { describe, expect, it, vi, beforeEach } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

const returnedMutate = vi.fn();
vi.mock("@/lib/trpc", () => ({
  trpc: {
    campaigns: {
      updateContributionStatus: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) },
      setAcceptedHours: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) },
      markLoanReturned: { useMutation: () => ({ mutate: returnedMutate, isPending: false }) },
    },
  },
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { ContributionCard, canMarkReturned, loanLine, type OwnerContribution } from "./ContributionCard";
import { AcceptDialog } from "./AcceptDialog";

const base = {
  id: 31,
  campaignId: 4,
  campaignItemId: 12,
  userId: 9,
  contributorName: "Kai",
  contributorEmail: "kai@example.com",
  contributorPhone: null,
  contributionType: "equipment",
  title: "Wood chipper",
  description: null,
  quantityPledged: 1,
  hoursPerWeek: null,
  estimatedValue: 1200,
  status: "accepted",
  isAnonymous: 0,
  contributorNotes: null,
  ownerNotes: null,
  acknowledgedNote: null,
  acknowledgedImageUrl: null,
  claimExpiresAt: null,
  hyphaBridgeKey: null,
  hyphaConfirmedAt: null,
  submittedAt: "2026-09-10T10:00:00Z",
  offerMode: "lend",
  availableFrom: "2026-10-01",
  lendUntil: "2026-12-15",
  lendTerms: "Runs well, needs a new blade by spring.",
  returnedAt: null,
};
const row = (over: Record<string, unknown> = {}) => ({ ...base, ...over }) as unknown as OwnerContribution;
const fmt = (n: number) => `$${n}`;

function renderCard(c: OwnerContribution, onAction = vi.fn()) {
  render(
    <ContributionCard contribution={c} need={null} formatCurrency={fmt} onAction={onAction} onFormalize={vi.fn()} formalizing={false} />,
  );
  return onAction;
}

describe("give or lend on a steward's offer card", () => {
  beforeEach(() => vi.clearAllMocks());

  it("a loan shows its dates and its one condition note", () => {
    renderCard(row());
    expect(screen.getByText(/^Loan: 1 Oct( 2026)? to 15 Dec( 2026)?$/)).toBeInTheDocument();
    expect(screen.getByText("Condition: Runs well, needs a new blade by spring.")).toBeInTheDocument();
  });

  it("a loan with no start date reads until its end", () => {
    expect(loanLine(row({ availableFrom: null }))).toMatch(/^Loan: until 15 Dec( 2026)?$/);
    expect(loanLine(row({ lendUntil: null }))).toBeNull();
  });

  it("a gift says Gift", () => {
    renderCard(row({ offerMode: "give", availableFrom: null, lendUntil: null, lendTerms: null }));
    expect(screen.getByText("Gift")).toBeInTheDocument();
    expect(screen.queryByText(/^Loan:/)).toBeNull();
    expect(screen.queryByRole("button", { name: "Mark returned" })).toBeNull();
  });

  it("a loan the stewards took on gets a Returned button that opens the returned action", () => {
    const onAction = renderCard(row());
    fireEvent.click(screen.getByRole("button", { name: "Mark returned" }));
    expect(onAction).toHaveBeenCalledWith("returned", expect.objectContaining({ id: 31 }));
  });

  it("only accepted, delivered or thanked loans not yet back can be marked returned", () => {
    expect(canMarkReturned(row({ status: "accepted" }))).toBe(true);
    expect(canMarkReturned(row({ status: "fulfilled" }))).toBe(true);
    expect(canMarkReturned(row({ status: "thanked" }))).toBe(true);
    expect(canMarkReturned(row({ status: "pending" }))).toBe(false);
    expect(canMarkReturned(row({ status: "released" }))).toBe(false);
    expect(canMarkReturned(row({ offerMode: "give" }))).toBe(false);
    expect(canMarkReturned(row({ returnedAt: "2026-12-16T09:00:00Z" }))).toBe(false);
  });

  it("a returned loan shows the date it came back and no button", () => {
    renderCard(row({ status: "fulfilled", returnedAt: "2026-12-16T09:00:00Z" }));
    expect(screen.getByText(/^Returned 16 Dec( 2026)?$/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Mark returned" })).toBeNull();
  });
});

describe("the returned dialog", () => {
  beforeEach(() => vi.clearAllMocks());

  it("says what it records, asks for no note, and calls markLoanReturned only", () => {
    render(
      <AcceptDialog contribution={row()} action="returned" need={null} formatCurrency={fmt} onClose={vi.fn()} onDone={vi.fn()} />,
    );
    expect(screen.getByRole("heading", { name: "Mark returned" })).toBeInTheDocument();
    expect(screen.getByText("This records that Wood chipper is back with Kai. Nothing else changes.")).toBeInTheDocument();
    expect(screen.queryByRole("textbox")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Mark returned" }));
    expect(returnedMutate).toHaveBeenCalledWith({ contributionId: 31 }, expect.any(Object));
  });
});
