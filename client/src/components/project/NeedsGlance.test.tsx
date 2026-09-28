import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";

type MutateOpts = { onSuccess?: () => void; onError?: (e: Error) => void };
const markCalls: Array<{ vars: { campaignItemId: number; marked: boolean } }> = [];
let failNext = false;
const invalidate = vi.fn();
const toastError = vi.fn();

vi.mock("@/lib/trpc", () => ({
  trpc: {
    useUtils: () => ({ campaigns: { getNeedMarkers: { invalidate } } }),
    campaigns: {
      setNeededToStart: {
        useMutation: () => ({
          isPending: false,
          mutate: (vars: { campaignItemId: number; marked: boolean }, opts?: MutateOpts) => {
            markCalls.push({ vars });
            if (failNext) opts?.onError?.(new Error("nope"));
            else opts?.onSuccess?.();
          },
        }),
      },
      setNeedHours: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) },
    },
  },
}));
vi.mock("wouter", () => ({ Link: ({ children, href, ...rest }: any) => <a href={href} {...rest}>{children}</a> }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: (...a: unknown[]) => toastError(...a) } }));

import { NeedsGlance } from "./NeedsGlance";
import { CampaignStewardStats, neededToStartMet } from "./CampaignStewardStats";
import { computeCampaignProgress } from "@shared/campaignProgress";
import { NEED_MARKER } from "@shared/crowdpoolCopy";

const need = (over: Record<string, unknown>) => ({
  campaignId: 44, category: "resource", capitalType: "material", capacityUnit: "count",
  quantityWanted: 1, quantityClaimed: 0, quantityDelivered: 0, estimatedValue: 1000, ...over,
});
const items = [
  need({ id: 11, kind: "item", resourceName: "Well pump" }),
  need({ id: 12, kind: "item", category: "equipment", equipmentName: "Wheelbarrow" }),
  need({ id: 13, kind: "crypto", resourceName: "Legacy money need" }),
] as any[];

function glance(props: Partial<Parameters<typeof NeedsGlance>[0]> = {}) {
  return render(
    <NeedsGlance items={items} canEditHours={false} onChanged={() => {}} campaignId={44} markedIds={[12]} canMark {...props} />,
  );
}

const card = (title: string) => screen.getByText(title).closest("div.bg-\\[\\#f0f7f0\\]") as HTMLElement;

beforeEach(() => {
  markCalls.length = 0;
  failNext = false;
  invalidate.mockClear();
  toastError.mockClear();
});

describe("Needed to start in the steward's needs list", () => {
  it("says once what the mark is, and gives each need a labelled checkbox; money gets none", () => {
    glance();
    expect(screen.getAllByText(NEED_MARKER.intro)).toHaveLength(1);
    expect(NEED_MARKER.intro).toBe("Mark the needs your project can't begin without. Only your stewards see this mark.");
    const boxes = screen.getAllByRole("checkbox", { name: "Needed to start" });
    expect(boxes).toHaveLength(2);
    expect(within(card("Legacy money need")).queryByRole("checkbox")).toBeNull();
    // The checkbox names its need for screen readers.
    const pumpBox = within(card("Well pump")).getByRole("checkbox");
    expect(pumpBox).toHaveAccessibleDescription("Well pump");
  });

  it("shows the stored marks as ticked with a chip", () => {
    glance();
    expect(within(card("Wheelbarrow")).getByRole("checkbox")).toBeChecked();
    expect(screen.getByTestId("need-marker-chip-12")).toHaveTextContent("Needed to start");
    expect(within(card("Well pump")).getByRole("checkbox")).not.toBeChecked();
    expect(screen.queryByTestId("need-marker-chip-11")).toBeNull();
  });

  it("saves on change and shows the mark at once", () => {
    glance();
    const pumpBox = within(card("Well pump")).getByRole("checkbox");
    fireEvent.click(pumpBox);
    expect(markCalls.map((c) => c.vars)).toEqual([{ campaignItemId: 11, marked: true }]);
    expect(pumpBox).toBeChecked();
    expect(screen.getByTestId("need-marker-chip-11")).toBeInTheDocument();
    expect(invalidate).toHaveBeenCalledWith({ campaignId: 44 });

    fireEvent.click(within(card("Wheelbarrow")).getByRole("checkbox"));
    expect(markCalls.map((c) => c.vars)[1]).toEqual({ campaignItemId: 12, marked: false });
    expect(within(card("Wheelbarrow")).getByRole("checkbox")).not.toBeChecked();
  });

  it("rolls back with a toast when the save fails", () => {
    failNext = true;
    glance();
    const pumpBox = within(card("Well pump")).getByRole("checkbox");
    fireEvent.click(pumpBox);
    expect(markCalls).toHaveLength(1);
    expect(pumpBox).not.toBeChecked();
    expect(screen.queryByTestId("need-marker-chip-11")).toBeNull();
    expect(toastError).toHaveBeenCalledWith("Couldn't save that. Try again.");
  });

  it("a closed or example campaign shows the chips but no checkboxes or intro", () => {
    glance({ canMark: false });
    expect(screen.queryByRole("checkbox")).toBeNull();
    expect(screen.queryByText(NEED_MARKER.intro)).toBeNull();
    expect(screen.getByTestId("need-marker-chip-12")).toBeInTheDocument();
  });

  it("waits for the stored marks before offering checkboxes", () => {
    glance({ markedIds: undefined });
    expect(screen.queryByRole("checkbox")).toBeNull();
  });

  it("each checkbox row is at least 44px tall", () => {
    glance();
    for (const box of screen.getAllByRole("checkbox")) {
      expect(box.closest("label")!.className).toContain("min-h-11");
    }
  });
});

describe("the Needed to start line in How it's going", () => {
  const progressWith = (filledIds: number[]) =>
    computeCampaignProgress({
      campaign: { id: 44, status: "active", isDemo: 0, financialTarget: 0, currency: "USD", durationDays: 90, startedAt: null },
      items: items.filter((i) => i.kind !== "crypto"),
      rows: filledIds.map((id) => ({
        campaignItemId: id, status: "accepted", contributionType: "resource", offerMode: "give",
        quantity: 1, value: 1000, financialValue: 0, count: 1,
      })),
      lends: [],
      routes: [],
    } as any);

  it("counts the marked needs that are filled", () => {
    expect(neededToStartMet(progressWith([11]), [11, 12])).toEqual({ met: 1, n: 2 });
    expect(neededToStartMet(progressWith([11, 12]), [11, 12, 12])).toEqual({ met: 2, n: 2 });
    // A mark on a need the reading doesn't hold (a money kind) isn't counted.
    expect(neededToStartMet(progressWith([]), [13])).toEqual({ met: 0, n: 0 });
    expect(neededToStartMet(progressWith([]), undefined)).toEqual({ met: 0, n: 0 });
  });

  it("shows the line only when a need is marked", () => {
    const props = {
      campaignId: 44,
      contributorsCount: 0,
      counts: { waiting: 0, accepted: 1, delivered: 0 },
      formatCurrency: (n: number) => `$${n}`,
    };
    const { rerender } = render(<CampaignStewardStats {...props} progress={progressWith([11])} neededToStart={[11, 12]} />);
    expect(screen.getByTestId("needed-to-start-line")).toHaveTextContent("Needed to start: 1 of 2 met.");
    rerender(<CampaignStewardStats {...props} progress={progressWith([11])} neededToStart={[]} />);
    expect(screen.queryByTestId("needed-to-start-line")).toBeNull();
  });
});
