import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { AdminBroadcastPanel } from "./AdminBroadcastPanel";
import { BROADCAST_FILL_EVENT, BROADCAST_FILL_STORAGE_KEY } from "@/lib/broadcastFill";

vi.mock("@/lib/trpc", () => ({
  trpc: {
    admin: {
      broadcast: {
        getBufferProfiles: {
          useQuery: () => ({
            data: [
              { id: "p1", service: "linkedin", service_username: "regen", formatted_username: "regen" },
            ],
            isLoading: false,
            error: null,
          }),
        },
        postToBuffer: { useMutation: () => ({ mutateAsync: vi.fn(), isPending: false }) },
        farcasterIntent: { useMutation: () => ({ mutateAsync: vi.fn(), isPending: false }) },
      },
    },
  },
}));

describe("AdminBroadcastPanel Harvest fill", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });
  afterEach(() => {
    sessionStorage.clear();
  });

  it("picks up a pending fill left before the panel mounted", () => {
    sessionStorage.setItem(BROADCAST_FILL_STORAGE_KEY, "Queued from Harvest.");
    render(<AdminBroadcastPanel />);
    expect((screen.getByTestId("broadcast-message") as HTMLTextAreaElement).value).toBe(
      "Queued from Harvest.",
    );
    expect(sessionStorage.getItem(BROADCAST_FILL_STORAGE_KEY)).toBeNull();
  });

  it("applies assistant fill events into the compose box", () => {
    sessionStorage.setItem(BROADCAST_FILL_STORAGE_KEY, "stale queued fill");
    render(<AdminBroadcastPanel />);
    act(() => {
      window.dispatchEvent(new CustomEvent(BROADCAST_FILL_EVENT, { detail: { text: "From the assistant." } }));
    });
    expect((screen.getByTestId("broadcast-message") as HTMLTextAreaElement).value).toBe(
      "From the assistant.",
    );
    expect(sessionStorage.getItem(BROADCAST_FILL_STORAGE_KEY)).toBeNull();
  });
});
