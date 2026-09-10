import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { AdminBroadcastPanel } from "./AdminBroadcastPanel";
import { BROADCAST_FILL_EVENT } from "@shared/broadcastChannels";

const draftMutateAsync = vi.fn();
const refetchProfiles = vi.fn();

let profilesState: {
  data: Array<{ id: string; service: string; service_username: string }> | undefined;
  isLoading: boolean;
  error: { message: string; data?: { code: string } } | null;
  isFetching: boolean;
} = {
  data: [],
  isLoading: false,
  error: null,
  isFetching: false,
};

vi.mock("@/lib/trpc", () => ({
  trpc: {
    admin: {
      broadcast: {
        getBufferProfiles: {
          useQuery: () => ({ ...profilesState, refetch: refetchProfiles }),
        },
        postToBuffer: { useMutation: () => ({ mutateAsync: vi.fn() }) },
        farcasterIntent: { useMutation: () => ({ mutateAsync: vi.fn() }) },
      },
    },
    harvest: {
      draftBroadcast: {
        useMutation: () => ({ mutateAsync: draftMutateAsync, isPending: false }),
      },
    },
  },
}));

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn() } }));

describe("AdminBroadcastPanel", () => {
  beforeEach(() => {
    draftMutateAsync.mockReset();
    refetchProfiles.mockReset();
    profilesState = { data: [], isLoading: false, error: null, isFetching: false };
    localStorage.clear();
  });
  afterEach(() => vi.clearAllMocks());

  it("shows Draft with Harvest and Connect on disconnected Buffer channels", () => {
    render(<AdminBroadcastPanel />);
    expect(screen.getByTestId("draft-with-harvest")).toBeDefined();
    expect(screen.getByTestId("connect-twitter")).toBeDefined();
    expect(screen.getByTestId("connect-linkedin")).toBeDefined();
    expect(screen.getByTestId("connect-twitter").getAttribute("href")).toBe("https://publish.buffer.com/channels");
    expect(screen.queryByTestId("connect-farcaster")).toBeNull();
    expect(screen.getByText("Opens Warpcast")).toBeDefined();
  });

  it("routes Connect to Broadcast settings when Buffer has no token", () => {
    profilesState = {
      data: undefined,
      isLoading: false,
      error: { message: "Buffer not configured", data: { code: "PRECONDITION_FAILED" } },
      isFetching: false,
    };
    render(<AdminBroadcastPanel />);
    expect(screen.getByText("Buffer is not configured")).toBeDefined();
    expect(screen.getByTestId("connect-twitter").getAttribute("href")).toBe("/admin?tab=settings");
    expect(screen.getByTestId("draft-with-harvest")).toBeDefined();
    expect(screen.getByTestId("dictation-button")).toBeDefined();
  });

  it("fills the message box from a Harvest draft", async () => {
    draftMutateAsync.mockResolvedValue({
      drafts: [{ channel: "twitter", label: "X / Twitter", text: "Food forests feed the village.", charCount: 30, maxChars: 280 }],
      sources: [{ id: 1, title: "Food is the foundation" }],
      grounded: true,
      voice: { version: "1.0.0", revision: 2 },
      errors: [],
    });
    render(<AdminBroadcastPanel />);
    fireEvent.click(screen.getByTestId("draft-with-harvest"));
    await waitFor(() => {
      expect(draftMutateAsync).toHaveBeenCalled();
    });
    const box = screen.getByTestId("broadcast-message") as HTMLTextAreaElement;
    expect(box.value).toBe("Food forests feed the village.");
    expect(screen.getByTestId("harvest-drafts").textContent).toContain("Food is the foundation");
    expect(screen.getByTestId("harvest-drafts").textContent).toContain("Worldview Pack r2");
  });

  it("applies assistant fill events into the compose box", async () => {
    sessionStorage.setItem("broadcast_fill_pending", "stale queued fill");
    render(<AdminBroadcastPanel />);
    await act(async () => {
      window.dispatchEvent(new CustomEvent(BROADCAST_FILL_EVENT, { detail: { text: "From the assistant." } }));
    });
    expect((screen.getByTestId("broadcast-message") as HTMLTextAreaElement).value).toBe("From the assistant.");
    expect(sessionStorage.getItem("broadcast_fill_pending")).toBeNull();
  });

  it("picks up a pending fill left before the panel mounted", () => {
    sessionStorage.setItem("broadcast_fill_pending", "Queued from the assistant.");
    render(<AdminBroadcastPanel />);
    expect((screen.getByTestId("broadcast-message") as HTMLTextAreaElement).value).toBe("Queued from the assistant.");
    expect(sessionStorage.getItem("broadcast_fill_pending")).toBeNull();
  });

  it("offers the shared dictation mic on the Message field", () => {
    render(<AdminBroadcastPanel />);
    expect(screen.getByTestId("dictation-button")).toBeTruthy();
    expect(screen.getByLabelText("Dictate message")).toBeTruthy();
  });
});
