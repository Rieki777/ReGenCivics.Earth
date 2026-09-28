import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const saveMock = vi.fn();
const invalidate = vi.fn();
const queryOpts: Array<{ enabled?: boolean }> = [];
let notes: Array<Record<string, unknown>> = [];

vi.mock("@/lib/trpc", () => ({
  trpc: {
    useUtils: () => ({ campaigns: { getArrivalNotes: { invalidate } } }),
    campaigns: {
      getArrivalNotes: {
        useQuery: (_input: unknown, opts: { enabled?: boolean }) => {
          queryOpts.push(opts);
          return { data: opts?.enabled === false ? undefined : notes, isLoading: false };
        },
      },
      setArrivalNote: { useMutation: () => ({ mutateAsync: saveMock, isPending: false }) },
    },
  },
}));
const { toastMock } = vi.hoisted(() => ({ toastMock: { success: vi.fn(), error: vi.fn() } }));
vi.mock("sonner", () => ({ toast: toastMock }));

import { ArrivalNoteCard, showCount } from "./ArrivalNoteCard";
import { ARRIVAL } from "@shared/crowdpoolCopy";

const need = (over: Record<string, unknown>) => ({
  campaignId: 44, category: "resource", capitalType: "material", capacityUnit: "count",
  quantityWanted: 1, quantityClaimed: 0, quantityDelivered: 0, estimatedValue: 1000, ...over,
});
const items = [
  need({ id: 1, kind: "role", roleTitle: "Farm hand" }),
  need({ id: 2, kind: "item", equipmentName: "Trailer" }),
  need({ id: 3, kind: "crypto", resourceName: "Old money need" }),
] as any[];

const row = (campaignItemId: number, over: Record<string, unknown> = {}) => ({
  campaignItemId, whereToGo: null, whatToBring: null, askFor: null, meals: null, beds: null, gettingThere: null,
  updatedAt: new Date(), ...over,
});

beforeEach(() => {
  vi.clearAllMocks();
  queryOpts.length = 0;
  notes = [];
  saveMock.mockResolvedValue({ success: true, saved: true, deleted: false });
});

describe("ArrivalNoteCard", () => {
  it("offers the note for everyone and one per need, never for money, with the six labelled fields", () => {
    render(<ArrivalNoteCard campaignId={44} items={items} isExample={false} canEdit />);
    expect(screen.getByRole("heading", { name: ARRIVAL.title })).toBeDefined();
    expect(screen.getByText(ARRIVAL.intro)).toBeDefined();
    const select = screen.getByLabelText(ARRIVAL.whoFor) as HTMLSelectElement;
    expect(Array.from(select.options).map((o) => o.textContent)).toEqual([
      ARRIVAL.everyone, ARRIVAL.onlyFor("Farm hand"), ARRIVAL.onlyFor("Trailer"),
    ]);
    for (const label of Object.values(ARRIVAL.fields)) expect(screen.getByLabelText(label)).toBeDefined();
    expect((screen.getByLabelText(ARRIVAL.fields.whereToGo) as HTMLTextAreaElement).placeholder).toBe(ARRIVAL.placeholderWhere);
    // Nothing stored yet: nothing to clear.
    expect(screen.queryByRole("button", { name: ARRIVAL.clear })).toBeNull();
  });

  it("refuses to save an empty note, with the message under the first field and focus there", async () => {
    const user = userEvent.setup();
    render(<ArrivalNoteCard campaignId={44} items={items} isExample={false} canEdit />);
    await user.click(screen.getByRole("button", { name: ARRIVAL.save }));
    expect(saveMock).not.toHaveBeenCalled();
    expect(screen.getByRole("alert").textContent).toBe(ARRIVAL.empty);
    const first = screen.getByLabelText(ARRIVAL.fields.whereToGo);
    expect(document.activeElement).toBe(first);
    expect(first.getAttribute("aria-invalid")).toBe("true");
  });

  it("saves the note for everyone, trimmed, and says so", async () => {
    const user = userEvent.setup();
    render(<ArrivalNoteCard campaignId={44} items={items} isExample={false} canEdit />);
    await user.type(screen.getByLabelText(ARRIVAL.fields.whereToGo), "  Gate 3  ");
    await user.type(screen.getByLabelText(ARRIVAL.fields.meals), "Lunch is on us");
    await user.click(screen.getByRole("button", { name: ARRIVAL.save }));
    expect(saveMock).toHaveBeenCalledWith({
      campaignId: 44, whereToGo: "Gate 3", whatToBring: "", askFor: "", meals: "Lunch is on us", beds: "", gettingThere: "",
    });
    await waitFor(() => expect(toastMock.success).toHaveBeenCalledWith(ARRIVAL.saved));
    expect(invalidate).toHaveBeenCalledWith({ campaignId: 44 });
  });

  it("loads a need's own note, explains the fallback, saves it for that need, and clears it", async () => {
    notes = [row(0, { whereToGo: "Main gate" }), row(2, { whatToBring: "Straps &amp; a spare tyre" })];
    const user = userEvent.setup();
    render(<ArrivalNoteCard campaignId={44} items={items} isExample={false} canEdit />);
    expect((screen.getByLabelText(ARRIVAL.fields.whereToGo) as HTMLTextAreaElement).value).toBe("Main gate");
    expect(screen.queryByText(ARRIVAL.needHelp)).toBeNull();

    fireEvent.change(screen.getByLabelText(ARRIVAL.whoFor), { target: { value: "2" } });
    expect(screen.getByText(ARRIVAL.needHelp)).toBeDefined();
    expect((screen.getByLabelText(ARRIVAL.fields.whereToGo) as HTMLTextAreaElement).value).toBe("");
    expect((screen.getByLabelText(ARRIVAL.fields.whatToBring) as HTMLTextAreaElement).value).toBe("Straps & a spare tyre");

    await user.type(screen.getByLabelText(ARRIVAL.fields.askFor), "Maria");
    await user.click(screen.getByRole("button", { name: ARRIVAL.save }));
    expect(saveMock).toHaveBeenLastCalledWith(expect.objectContaining({ campaignId: 44, campaignItemId: 2, askFor: "Maria", whatToBring: "Straps & a spare tyre" }));

    await user.click(screen.getByRole("button", { name: ARRIVAL.clear }));
    expect(saveMock).toHaveBeenLastCalledWith({
      campaignId: 44, campaignItemId: 2, whereToGo: "", whatToBring: "", askFor: "", meals: "", beds: "", gettingThere: "",
    });
    await waitFor(() => expect(toastMock.success).toHaveBeenCalledWith(ARRIVAL.cleared));
  });

  it("shows a character count near each field's limit", () => {
    expect(showCount(107, 120)).toBe(false);
    expect(showCount(108, 120)).toBe(true);
    render(<ArrivalNoteCard campaignId={44} items={items} isExample={false} canEdit />);
    fireEvent.change(screen.getByLabelText(ARRIVAL.fields.askFor), { target: { value: "a".repeat(110) } });
    expect(screen.getByText(ARRIVAL.count(110, 120))).toBeDefined();
    expect(screen.queryByText(/of 500 characters/)).toBeNull();
  });

  it("an example shows the card disabled with the example line, and asks the server nothing", () => {
    render(<ArrivalNoteCard campaignId={44} items={items} isExample canEdit />);
    expect(screen.getByText(ARRIVAL.exampleOnly)).toBeDefined();
    expect(queryOpts.every((o) => o.enabled === false)).toBe(true);
    expect((screen.getByLabelText(ARRIVAL.fields.whereToGo) as HTMLTextAreaElement).closest("fieldset")!.disabled).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: ARRIVAL.save }));
    expect(saveMock).not.toHaveBeenCalled();
  });

  it("a cancelled or closed campaign keeps its note as it is", () => {
    notes = [row(0, { whereToGo: "Main gate" })];
    render(<ArrivalNoteCard campaignId={44} items={items} isExample={false} canEdit={false} />);
    expect(screen.getByText(ARRIVAL.closedCampaign)).toBeDefined();
    expect((screen.getByLabelText(ARRIVAL.fields.whereToGo) as HTMLTextAreaElement).value).toBe("Main gate");
    expect((screen.getByLabelText(ARRIVAL.fields.whereToGo) as HTMLTextAreaElement).closest("fieldset")!.disabled).toBe(true);
  });
});
