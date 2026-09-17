import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { AdminBroadcastPanel } from "./AdminBroadcastPanel";
import { BROADCAST_FILL_EVENT } from "@shared/broadcastChannels";

const draftMutateAsync = vi.fn();
const postMutateAsync = vi.fn();
const farcasterMutateAsync = vi.fn();
const refetchProfiles = vi.fn();

let profilesState: {
  data:
    | Array<{
        id: string;
        service: string;
        service_username: string;
        formatted_username?: string;
      }>
    | undefined;
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
        postToBuffer: { useMutation: () => ({ mutateAsync: postMutateAsync }) },
        farcasterIntent: { useMutation: () => ({ mutateAsync: farcasterMutateAsync }) },
      },
    },
    harvest: {
      draftBroadcast: {
        useMutation: () => ({ mutateAsync: draftMutateAsync, isPending: false }),
      },
    },
  },
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), message: vi.fn() },
}));

import { toast } from "sonner";

function selectChannel(label: string) {
  const box = screen.getByText(label).closest("label");
  expect(box).toBeTruthy();
  const control = box!.querySelector('[role="checkbox"]') as HTMLElement;
  fireEvent.click(control);
}

describe("AdminBroadcastPanel", () => {
  beforeEach(() => {
    draftMutateAsync.mockReset();
    postMutateAsync.mockReset();
    farcasterMutateAsync.mockReset();
    refetchProfiles.mockReset();
    profilesState = {
      data: [
        { id: "buf-x", service: "twitter", service_username: "regen" },
        { id: "buf-li", service: "linkedin", service_username: "regen-li" },
      ],
      isLoading: false,
      error: null,
      isFetching: false,
    };
    localStorage.clear();
    vi.stubGlobal("open", vi.fn());
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  it("shows Draft with Harvest and Connect on disconnected Buffer channels", () => {
    profilesState = { data: [], isLoading: false, error: null, isFetching: false };
    render(<AdminBroadcastPanel />);
    expect(screen.getByTestId("draft-with-harvest")).toBeDefined();
    expect(screen.getByTestId("connect-twitter")).toBeDefined();
    expect(screen.getByTestId("connect-linkedin")).toBeDefined();
  });

  it("routes Connect to settings when Buffer has no token", () => {
    profilesState = {
      data: undefined,
      isLoading: false,
      error: { message: "Buffer not configured", data: { code: "PRECONDITION_FAILED" } },
      isFetching: false,
    };
    render(<AdminBroadcastPanel />);
    expect(screen.getByTestId("connect-twitter").getAttribute("href")).toMatch(/settings|admin/i);
    expect(screen.getByTestId("draft-with-harvest")).toBeDefined();
  });

  it("shows per-channel editors when multiple channels are selected", () => {
    render(<AdminBroadcastPanel />);
    expect(screen.queryByTestId("per-channel-editors")).toBeNull();
    selectChannel("X / Twitter");
    selectChannel("LinkedIn");
    expect(screen.getByTestId("per-channel-editors")).toBeDefined();
  });

  it("posts a distinct body to each Buffer profile", async () => {
    postMutateAsync.mockResolvedValue({
      results: [
        { profileId: "buf-x", success: true, updateId: "u1" },
        { profileId: "buf-li", success: true, updateId: "u2" },
      ],
    });
    render(<AdminBroadcastPanel />);
    selectChannel("X / Twitter");
    selectChannel("LinkedIn");

    fireEvent.change(screen.getByTestId("broadcast-message"), {
      target: { value: "Master draft for the village." },
    });
    fireEvent.change(screen.getByTestId("channel-body-twitter"), {
      target: { value: "Short X body." },
    });
    fireEvent.click(screen.getByTestId("channel-tab-linkedin"));
    await waitFor(() => expect(screen.getByTestId("channel-body-linkedin")).toBeDefined());
    fireEvent.change(screen.getByTestId("channel-body-linkedin"), {
      target: { value: "Longer LinkedIn body for builders." },
    });

    fireEvent.click(screen.getByTestId("broadcast-post-now"));
    await waitFor(() => expect(postMutateAsync).toHaveBeenCalled());

    expect(postMutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        posts: [
          { profileId: "buf-x", text: "Short X body." },
          { profileId: "buf-li", text: "Longer LinkedIn body for builders." },
        ],
        imageUrl: undefined,
      }),
    );
  });

  it("sends imageUrl to Buffer when provided", async () => {
    postMutateAsync.mockResolvedValue({
      results: [{ profileId: "buf-x", success: true, updateId: "u1" }],
    });
    render(<AdminBroadcastPanel />);
    selectChannel("X / Twitter");
    fireEvent.change(screen.getByTestId("broadcast-message"), {
      target: { value: "Photo post." },
    });
    fireEvent.change(screen.getByTestId("broadcast-image-url"), {
      target: { value: "https://cdn.example.com/village.jpg" },
    });
    fireEvent.click(screen.getByTestId("broadcast-post-now"));
    await waitFor(() => expect(postMutateAsync).toHaveBeenCalled());
    expect(postMutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        posts: [{ profileId: "buf-x", text: "Photo post." }],
        imageUrl: "https://cdn.example.com/village.jpg",
      }),
    );
  });

  it("posts to multiple Buffer profiles on the same network when selected", async () => {
    profilesState = {
      data: [
        {
          id: "buf-x-a",
          service: "twitter",
          service_username: "regen",
          formatted_username: "@regen",
        },
        {
          id: "buf-x-b",
          service: "twitter",
          service_username: "regen2",
          formatted_username: "@regen2",
        },
      ],
      isLoading: false,
      error: null,
      isFetching: false,
    };
    postMutateAsync.mockResolvedValue({
      results: [
        { profileId: "buf-x-a", success: true },
        { profileId: "buf-x-b", success: true },
      ],
    });
    render(<AdminBroadcastPanel />);
    selectChannel("X / Twitter");
    expect(screen.getByTestId("profile-picker-twitter")).toBeDefined();
    expect(screen.getByTestId("profile-check-buf-x-a")).toBeDefined();
    expect(screen.getByTestId("profile-check-buf-x-b")).toBeDefined();

    fireEvent.change(screen.getByTestId("broadcast-message"), {
      target: { value: "Same copy to both X accounts." },
    });
    fireEvent.click(screen.getByTestId("broadcast-post-now"));
    await waitFor(() => expect(postMutateAsync).toHaveBeenCalled());
    expect(postMutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        posts: [
          { profileId: "buf-x-a", text: "Same copy to both X accounts." },
          { profileId: "buf-x-b", text: "Same copy to both X accounts." },
        ],
      }),
    );
  });

  it("applies assistant fill events into the compose box", async () => {
    render(<AdminBroadcastPanel />);
    await act(async () => {
      window.dispatchEvent(
        new CustomEvent(BROADCAST_FILL_EVENT, { detail: { text: "From the assistant." } }),
      );
    });
    expect((screen.getByTestId("broadcast-message") as HTMLTextAreaElement).value).toBe(
      "From the assistant.",
    );
  });

  it("shows LLM adapt master → each only when multiple channels are selected", () => {
    render(<AdminBroadcastPanel />);
    expect(screen.queryByTestId("llm-adapt-master-to-channels")).toBeNull();
    selectChannel("X / Twitter");
    expect(screen.queryByTestId("llm-adapt-master-to-channels")).toBeNull();
    selectChannel("LinkedIn");
    expect(screen.getByTestId("llm-adapt-master-to-channels")).toBeDefined();
    expect(screen.getByTestId("adapt-master-to-channels")).toBeDefined();
    expect(screen.getByTestId("llm-adapt-master-to-channels").textContent).toMatch(
      /LLM adapt master/i,
    );
  });

  it("LLM adapt with empty master toasts and does not call draftBroadcast", async () => {
    render(<AdminBroadcastPanel />);
    selectChannel("X / Twitter");
    selectChannel("LinkedIn");
    fireEvent.click(screen.getByTestId("llm-adapt-master-to-channels"));
    await waitFor(() => expect(toast.error).toHaveBeenCalled());
    expect(toast.error).toHaveBeenCalledWith("Write a master draft first.");
    expect(draftMutateAsync).not.toHaveBeenCalled();
  });

  it("LLM adapt with filled master calls draftBroadcast and fills channel bodies", async () => {
    draftMutateAsync.mockResolvedValue({
      drafts: [
        { channel: "twitter", label: "X / Twitter", text: "Short X rewrite.", charCount: 16, maxChars: 280 },
        {
          channel: "linkedin",
          label: "LinkedIn",
          text: "Longer LinkedIn rewrite for builders.",
          charCount: 38,
          maxChars: 3000,
        },
      ],
      sources: [],
      grounded: false,
      voice: null,
      errors: [],
    });
    render(<AdminBroadcastPanel />);
    selectChannel("X / Twitter");
    selectChannel("LinkedIn");
    fireEvent.change(screen.getByTestId("broadcast-message"), {
      target: { value: "  Master village update for all networks.  " },
    });
    fireEvent.click(screen.getByTestId("llm-adapt-master-to-channels"));
    await waitFor(() => expect(draftMutateAsync).toHaveBeenCalled());
    expect(draftMutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        intent: "Master village update for all networks.",
        channels: ["twitter", "linkedin"],
        mode: "adaptMaster",
      }),
    );
    await waitFor(() => {
      expect((screen.getByTestId("channel-body-twitter") as HTMLTextAreaElement).value).toBe(
        "Short X rewrite.",
      );
    });
    fireEvent.click(screen.getByTestId("channel-tab-linkedin"));
    await waitFor(() => {
      expect((screen.getByTestId("channel-body-linkedin") as HTMLTextAreaElement).value).toBe(
        "Longer LinkedIn rewrite for builders.",
      );
    });
    expect(toast.success).toHaveBeenCalledWith("LLM adapted master into each channel.");
  });
});
