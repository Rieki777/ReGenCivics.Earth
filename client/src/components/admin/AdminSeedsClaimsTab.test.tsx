/**
 * The admin SEEDS claims tab showed "2 claims total" with an empty body
 * because the UI sent page=1 to a 0-indexed API (offset 20 of 2 rows).
 * These tests pin the page mapping and that filer identity (email + SEEDS
 * account) plus submitted fields render from the real schema names.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AdminSeedsClaimsTab, type SeedsClaimRow } from "./AdminSeedsClaimsTab";

const listUseQuery = vi.fn();
const exportRefetch = vi.fn();

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("@/lib/trpc", () => ({
  trpc: {
    seedsClaims: {
      adminStats: {
        useQuery: () => ({
          data: {
            totalClaims: 2,
            pendingCount: 0,
            approvedCount: 2,
            deniedCount: 0,
            flaggedCount: 0,
            disputeCount: 0,
            totalRegenCommitted: 106682,
          },
          refetch: vi.fn(),
        }),
      },
      adminList: {
        useQuery: (input: unknown) => listUseQuery(input),
      },
      adminReview: {
        useMutation: () => ({ mutateAsync: vi.fn(), isPending: false }),
      },
      adminExport: {
        useQuery: () => ({ refetch: exportRefetch, data: undefined }),
      },
    },
  },
}));

function claim(over: Partial<SeedsClaimRow> & Pick<SeedsClaimRow, "id">): SeedsClaimRow {
  return {
    seedsAccount: "aliceaccount",
    email: "alice@example.com",
    originalUsdTotal: 5334.1,
    spentUsdAmount: 0,
    claimedUsdAmount: 5334.1,
    regenAmount: 53341,
    baseWalletAddress: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    isDispute: false,
    disputeReason: null,
    evidenceUrls: null,
    status: "approved",
    adminNotes: null,
    reviewedAt: "2026-09-01T12:00:00.000Z",
    reviewedBy: 7,
    createdAt: "2026-08-10T12:00:00.000Z",
    updatedAt: "2026-09-01T12:00:00.000Z",
    ...over,
  };
}

const ALL_CLAIMS: SeedsClaimRow[] = [
  claim({ id: 11, email: "alice@example.com", seedsAccount: "aliceaccount" }),
  claim({
    id: 12,
    email: "bob@example.com",
    seedsAccount: "bobaccount12",
    originalUsdTotal: 5334.1,
    claimedUsdAmount: 5334.1,
    regenAmount: 53341,
    spentUsdAmount: 100,
    isDispute: true,
    disputeReason: "Account was renamed on Telos.",
    evidenceUrls: JSON.stringify(["https://assets.example/proof.png"]),
    baseWalletAddress: "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
  }),
];

beforeEach(() => {
  listUseQuery.mockReset();
  listUseQuery.mockImplementation((input: { isDispute?: boolean; status?: string; search?: string; page?: number }) => {
    let rows = ALL_CLAIMS;
    if (input?.isDispute) rows = rows.filter((c) => c.isDispute);
    if (input?.status) rows = rows.filter((c) => c.status === input.status);
    if (input?.search) {
      const q = input.search.toLowerCase();
      rows = rows.filter(
        (c) => c.email.toLowerCase().includes(q) || c.seedsAccount.toLowerCase().includes(q),
      );
    }
    if (input?.page && input.page > 0) {
      return { data: { claims: [], total: rows.length }, isLoading: false, refetch: vi.fn() };
    }
    return { data: { claims: rows, total: rows.length }, isLoading: false, refetch: vi.fn() };
  });
});

describe("AdminSeedsClaimsTab list", () => {
  it("asks the API for page 0 on first load so existing claims are not skipped", () => {
    render(<AdminSeedsClaimsTab />);
    expect(listUseQuery).toHaveBeenCalled();
    const input = listUseQuery.mock.calls[0][0];
    expect(input.page).toBe(0);
    expect(input.status).toBeUndefined();
    expect(input.search).toBeUndefined();
    expect(input.isDispute).toBeUndefined();
  });

  it("shows who filed each claim when two approved claims exist and search is empty", () => {
    render(<AdminSeedsClaimsTab />);
    expect(screen.getByText("alice@example.com")).toBeDefined();
    expect(screen.getByText("bob@example.com")).toBeDefined();
    expect(screen.getByText("aliceaccount")).toBeDefined();
    expect(screen.getByText("bobaccount12")).toBeDefined();
    expect(screen.queryByText("No claims match your search")).toBeNull();
    expect(screen.getByText("2 claims total")).toBeDefined();
  });

  it("renders submitted detail fields from schema names when a row is opened", async () => {
    const user = userEvent.setup();
    render(<AdminSeedsClaimsTab />);
    await user.click(screen.getByText("bob@example.com"));
    expect(screen.getByText("Submitted answers")).toBeDefined();
    expect(screen.getByText("0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb")).toBeDefined();
    expect(screen.getByText("Account was renamed on Telos.")).toBeDefined();
    expect(screen.getByText("View evidence")).toBeDefined();
    expect(screen.getByText("Email Address")).toBeDefined();
    expect(screen.getByText("Spent, sold, or transferred USD")).toBeDefined();
    expect(screen.getByText("Base Wallet Address")).toBeDefined();
  });

  it("passes isDispute to the list query when Disputes only is checked", async () => {
    const user = userEvent.setup();
    render(<AdminSeedsClaimsTab />);
    await user.click(screen.getByText("Disputes only"));
    const last = listUseQuery.mock.calls.at(-1)?.[0];
    expect(last.isDispute).toBe(true);
    expect(screen.getByText("bob@example.com")).toBeDefined();
    expect(screen.queryByText("alice@example.com")).toBeNull();
  });
});
