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

import { ContributionCard, canMarkReturned, claimCountdown, loanLine, type OwnerContribution } from "./ContributionCard";
import { AcceptDialog } from "./AcceptDialog";
import { OFFER_NOTES } from "@shared/crowdpoolCopy";
import { WaitingOnYou, offerNotesSummary } from "./WaitingOnYou";

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

describe("the delivery countdown on a returned loan", () => {
  const soon = () => new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString();

  it("shows while the loan is out", () => {
    renderCard(row({ claimExpiresAt: soon() }));
    expect(screen.getByText(/left to deliver$/)).toBeInTheDocument();
  });

  it("goes once the loan is marked Returned, since nothing is left to deliver", () => {
    renderCard(row({ claimExpiresAt: soon(), returnedAt: "2026-09-25T10:00:00Z" }));
    expect(screen.queryByText(/left to deliver/)).toBeNull();
    expect(screen.queryByText(/delivery window passed/)).toBeNull();
    expect(claimCountdown({ status: "accepted", claimExpiresAt: soon(), returnedAt: "2026-09-25T10:00:00Z" } as any)).toBeNull();
  });
});

// Build spec 2026-09-27, section 10.2: notes someone sent from their offer link.
describe("notes from the offer link", () => {
  beforeEach(() => vi.clearAllMocks());

  it("shows each note, newest first, as plain text under its heading", () => {
    render(
      <ContributionCard
        contribution={row({ status: "pending" })}
        need={null}
        notes={[
          { body: "Can I bring it Friday &amp; stay for lunch?", createdAt: "2026-09-27T14:05:00Z" },
          { body: "Hello from the offer link", createdAt: "2026-09-26T09:00:00Z" },
        ]}
        formatCurrency={fmt}
        onAction={vi.fn()}
        onFormalize={vi.fn()}
        formalizing={false}
      />,
    );
    const block = screen.getByTestId("offer-notes-31");
    expect(block.textContent).toContain(OFFER_NOTES.heading);
    const items = block.querySelectorAll("li");
    expect(items).toHaveLength(2);
    expect(items[0].textContent).toContain("Can I bring it Friday & stay for lunch?");
    expect(items[1].textContent).toContain("Hello from the offer link");
  });

  it("shows nothing when there are no notes", () => {
    renderCard(row({ status: "pending" }));
    expect(screen.queryByTestId("offer-notes-31")).toBeNull();
    expect(screen.queryByText(OFFER_NOTES.heading)).toBeNull();
  });
});

describe("the notes row in Waiting on you", () => {
  const queue = { total: 0, sendForReview: false, toAnswer: [], pendingOnFilledRoles: [], toDeliver: [], toThank: [] } as any;

  it("counts offers still in play that carry a note, and jumps to Waiting when one of them waits", () => {
    const list = [
      { id: 1, status: "pending" }, { id: 2, status: "accepted" }, { id: 3, status: "withdrawn" }, { id: 4, status: "pending" },
    ];
    expect(offerNotesSummary(list, { 1: [{}], 2: [{}], 3: [{}] })).toEqual({ count: 2, tab: "waiting" });
    expect(offerNotesSummary(list, { 2: [{}] })).toEqual({ count: 1, tab: "accepted" });
    expect(offerNotesSummary(list, { 3: [{}], 4: [] })).toBeNull();
  });

  it("shows the row even when nothing else waits, and jumps to the offers", () => {
    const onJump = vi.fn();
    render(<WaitingOnYou queue={queue} loading={false} onJump={onJump} onSendForReview={vi.fn()} offerNotes={{ count: 2, tab: "accepted" }} />);
    expect(screen.queryByText("Nothing is waiting on you right now.")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: new RegExp(OFFER_NOTES.row(2).slice(0, 20)) }));
    expect(onJump).toHaveBeenCalledWith("accepted");
  });

  it("says nothing waits when there are no notes and no offers", () => {
    render(<WaitingOnYou queue={queue} loading={false} onJump={vi.fn()} onSendForReview={vi.fn()} />);
    expect(screen.getByText("Nothing is waiting on you right now.")).toBeDefined();
  });
});
