import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

let mine: Array<Record<string, unknown>> = [];
let arrival: Array<{ contributionId: number; note: Record<string, string | null> }> = [];
const withdrawMock = vi.fn();
const invalidate = vi.fn();

vi.mock("@/lib/trpc", () => ({
  trpc: {
    useUtils: () => ({ campaigns: { myContributions: { invalidate } } }),
    campaigns: {
      myContributions: { useQuery: () => ({ data: mine }) },
      myArrivalNotes: { useQuery: () => ({ data: arrival }) },
      withdrawContribution: { useMutation: () => ({ mutateAsync: withdrawMock, isPending: false }) },
    },
  },
}));

import { YourContributions } from "./YourContributions";
import { ARRIVAL, LINK, YOUR_OFFERS } from "@shared/crowdpoolCopy";

const row = (id: number, status: string, title: string, over: Record<string, unknown> = {}) => ({
  id, campaignId: 7, campaignItemId: 50, status, title, quantityPledged: 1, acknowledgedNote: null,
  offerMode: null, availableFrom: null, lendUntil: null, returnedAt: null, ...over,
});
const note = (whereToGo: string) => ({ whereToGo, whatToBring: null, askFor: "Maria", meals: null, beds: null, gettingThere: null });

const props = { campaignIds: [7], campaignTitles: { 7: "Spring Build" }, items: [] as any[] };

beforeEach(() => {
  vi.clearAllMocks();
  mine = [];
  arrival = [];
});

describe("YourContributions", () => {
  it("renders nothing when this person offered nothing here", () => {
    mine = [row(1, "pending", "Elsewhere", { campaignId: 99 })];
    const { container } = render(<YourContributions {...props} />);
    expect(container.innerHTML).toBe("");
  });

  it("puts a Needs you line at the top only for accepted offers with an arrival note, and opens the note inline", async () => {
    mine = [
      row(1, "accepted", "Trailer"),
      row(2, "accepted", "Farm hand"),
      row(3, "pending", "Seed trays"),
      row(4, "fulfilled", "Wheelbarrow"),
    ];
    arrival = [
      { contributionId: 1, note: note("Gate 3") },
      { contributionId: 4, note: note("Back barn") },
    ];
    const user = userEvent.setup();
    render(<YourContributions {...props} variant="inline" />);
    const lane = screen.getByTestId("needs-you");
    const buttons = within(lane).getAllByRole("button");
    expect(buttons.map((b) => b.textContent)).toEqual([ARRIVAL.needsYou("Trailer")]);
    // The lane comes before the list of offers.
    expect(lane.compareDocumentPosition(screen.getByText("Seed trays")) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

    const open = buttons[0];
    expect(open.getAttribute("aria-expanded")).toBe("false");
    expect(screen.queryByText("Gate 3")).toBeNull();
    await user.click(open);
    expect(open.getAttribute("aria-expanded")).toBe("true");
    expect(document.getElementById(open.getAttribute("aria-controls")!)!.hidden).toBe(false);
    expect(screen.getByRole("heading", { name: ARRIVAL.viewHeading })).toBeDefined();
    expect(screen.getByText("Gate 3")).toBeDefined();
    expect(screen.getByText("Maria")).toBeDefined();

    // A delivered offer keeps its note, closed, under its row.
    const keep = screen.getByRole("button", { name: ARRIVAL.show });
    expect(keep.getAttribute("aria-expanded")).toBe("false");
    expect(screen.queryByText("Back barn")).toBeNull();
    await user.click(keep);
    expect(screen.getByText("Back barn")).toBeDefined();
    expect(screen.getByRole("button", { name: ARRIVAL.hide }).getAttribute("aria-expanded")).toBe("true");
  });

  it("no Needs you lane when no accepted offer has a note", () => {
    mine = [row(1, "accepted", "Trailer"), row(2, "pending", "Seed trays")];
    arrival = [];
    render(<YourContributions {...props} />);
    expect(screen.queryByTestId("needs-you")).toBeNull();
    expect(screen.queryByText(/Needs you/)).toBeNull();
  });

  it("shows Withdraw only on offers still waiting, and withdraws through the shared dialog", async () => {
    mine = [row(1, "accepted", "Trailer"), row(3, "pending", "Seed trays"), row(5, "rejected", "Gloves")];
    withdrawMock.mockResolvedValue({ success: true });
    const user = userEvent.setup();
    render(<YourContributions {...props} />);
    const withdrawButtons = screen.getAllByRole("button", { name: /^Withdraw your offer of / });
    expect(withdrawButtons).toHaveLength(1);
    expect(withdrawButtons[0].getAttribute("aria-label")).toBe(YOUR_OFFERS.withdrawLabel("Seed trays"));
    expect(withdrawButtons[0].textContent).toBe(YOUR_OFFERS.withdraw);

    await user.click(withdrawButtons[0]);
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText(LINK.withdrawTitle)).toBeDefined();
    expect(within(dialog).getByText(LINK.withdrawBody)).toBeDefined();
    await user.click(within(dialog).getByRole("button", { name: LINK.withdrawConfirm }));
    expect(withdrawMock).toHaveBeenCalledWith({ contributionId: 3 });
    await waitFor(() => expect(invalidate).toHaveBeenCalled());
    const live = screen.getAllByRole("status").find((el) => el.getAttribute("aria-live") === "polite");
    expect(live?.textContent).toBe(LINK.withdrawn);
  });

  it("keeps the dialog open with the server's words when a withdraw is refused", async () => {
    mine = [row(3, "pending", "Seed trays")];
    withdrawMock.mockRejectedValue({ message: "The stewards just answered this offer. Refresh to see where it stands." });
    const user = userEvent.setup();
    render(<YourContributions {...props} />);
    await user.click(screen.getByRole("button", { name: YOUR_OFFERS.withdrawLabel("Seed trays") }));
    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: LINK.withdrawConfirm }));
    expect((await within(dialog).findByRole("alert")).textContent).toBe("The stewards just answered this offer. Refresh to see where it stands.");
    await user.click(within(dialog).getByRole("button", { name: LINK.withdrawKeep }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });
});
