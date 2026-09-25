import { describe, expect, it, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { CROWDPOOL_READINESS } from "@shared/crowdpoolReadiness";

const setTick = vi.fn();
const invalidate = vi.fn();
let stored: Array<{ itemKey: string; tickedBy: number; tickedAt: string }> = [];
let failNext = false;
const readinessQuery = vi.fn();

vi.mock("@/lib/trpc", () => ({
  trpc: {
    useUtils: () => ({ campaigns: { getReadiness: { invalidate } } }),
    campaigns: {
      getReadiness: {
        useQuery: (input: { campaignId: number }, opts: { enabled: boolean }) => {
          readinessQuery(input, opts);
          return opts.enabled ? { data: stored, isLoading: false } : { data: undefined, isLoading: false };
        },
      },
      setReadinessTick: {
        useMutation: () => ({
          mutate: (input: unknown, handlers: { onError?: () => void; onSettled?: () => void }) => {
            setTick(input);
            if (failNext) handlers.onError?.();
            handlers.onSettled?.();
          },
        }),
      },
    },
  },
}));
const { toastMock } = vi.hoisted(() => ({ toastMock: { success: vi.fn(), error: vi.fn() } }));
vi.mock("sonner", () => ({ toast: toastMock }));

import { CrowdpoolReadiness } from "./CrowdpoolReadiness";

const first = CROWDPOOL_READINESS[0];
const second = CROWDPOOL_READINESS[1];

describe("CrowdpoolReadiness", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    stored = [];
    failNext = false;
    localStorage.clear();
  });

  it("keeps a reader's ticks in this browser when no campaign is given, and sends nothing", () => {
    render(<CrowdpoolReadiness framed={false} storageKey="reader" />);
    fireEvent.click(screen.getByLabelText(new RegExp(first.title)));
    expect(JSON.parse(localStorage.getItem("crowdpool_ready:reader")!)).toEqual([first.key]);
    expect(setTick).not.toHaveBeenCalled();
    expect(readinessQuery).toHaveBeenCalledWith({ campaignId: 0 }, expect.objectContaining({ enabled: false }));
    expect(screen.getByText("Tick each one as your project shows it. Your ticks stay in this browser.")).toBeInTheDocument();
  });

  it("loads a campaign's stored ticks and says the review team sees them", () => {
    stored = [{ itemKey: first.key, tickedBy: 3, tickedAt: "2026-09-20T10:00:00Z" }];
    render(<CrowdpoolReadiness framed={false} campaignId={44} />);
    expect(screen.getByLabelText(new RegExp(first.title))).toBeChecked();
    expect(screen.getByLabelText(new RegExp(second.title))).not.toBeChecked();
    expect(
      screen.getByText("Tick each one as your project shows it. Your ticks are saved on this campaign. The review team sees them."),
    ).toBeInTheDocument();
  });

  it("saves a tick and an untick on the campaign, never in the browser", () => {
    stored = [{ itemKey: first.key, tickedBy: 3, tickedAt: "2026-09-20T10:00:00Z" }];
    render(<CrowdpoolReadiness framed={false} campaignId={44} />);
    fireEvent.click(screen.getByLabelText(new RegExp(second.title)));
    expect(setTick).toHaveBeenLastCalledWith({ campaignId: 44, key: second.key, ticked: true });
    expect(screen.getByLabelText(new RegExp(second.title))).toBeChecked();
    fireEvent.click(screen.getByLabelText(new RegExp(first.title)));
    expect(setTick).toHaveBeenLastCalledWith({ campaignId: 44, key: first.key, ticked: false });
    expect(invalidate).toHaveBeenCalledWith({ campaignId: 44 });
    expect(localStorage.length).toBe(0);
  });

  it("rolls a tick back and says so when the server refuses it", async () => {
    render(<CrowdpoolReadiness framed={false} campaignId={44} />);
    failNext = true;
    fireEvent.click(screen.getByLabelText(new RegExp(first.title)));
    await waitFor(() => expect(screen.getByLabelText(new RegExp(first.title))).not.toBeChecked());
    expect(toastMock.error).toHaveBeenCalledWith("Couldn't save that tick. Try again.");
  });

  it("shows the review team what the project ticked, and when", () => {
    render(
      <CrowdpoolReadiness
        framed={false}
        audience="review"
        storageKey="review-44"
        projectTicks={[{ itemKey: first.key, tickedAt: "2026-09-20T10:00:00Z" }]}
      />,
    );
    expect(screen.getByTestId(`project-tick-${first.key}`)).toHaveTextContent("The project ticked this on 20 September 2026.");
    expect(screen.getByTestId(`project-tick-${second.key}`)).toHaveTextContent("Not ticked by the project.");
    // The reviewer's own tick stays local.
    fireEvent.click(screen.getByLabelText(new RegExp(second.title)));
    expect(setTick).not.toHaveBeenCalled();
    expect(JSON.parse(localStorage.getItem("crowdpool_ready:review-44")!)).toEqual([second.key]);
  });

  it("shows no project line until the project's ticks are known", () => {
    render(<CrowdpoolReadiness framed={false} audience="review" storageKey="review-44" />);
    expect(screen.queryByText("Not ticked by the project.")).toBeNull();
  });
});
