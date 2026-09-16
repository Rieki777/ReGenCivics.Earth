import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { AdminBroadcastPanel } from "./AdminBroadcastPanel";
import { BROADCAST_FILL_EVENT } from "@shared/broadcastChannels";

const draftMutateAsync = vi.fn();
const postMutateAsync = vi.fn();
const farcasterMutateAsync = vi.fn();
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

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn() } }));

function selectChannel(label: string) {
  const box = screen.getByText(label).closest("label");
  expect(box).toBeTruthy();
  const checkbox = box!.querySelector('[role="checkbox"], input, button');
  // Checkbox from shadcn is a button with role=checkbox
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
    // jsdom open stub
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

  it("shows per-channel editors when multiple channels are selected", () => {
    render(<AdminBroadcastPanel />);
    expect(screen.queryByTestId("per-channel-editors")).toBeNull();
    selectChannel("X / Twitter");
    selectChannel("LinkedIn");
    expect(screen.getByTestId("per-channel-editors")).toBeDefined();
    expect(screen.getByTestId("copy-master-to-channels")).toBeDefined();
    expect(screen.getByTestId("adapt-master-to-channels")).toBeDefined();
    expect(screen.getByTestId("channel-tab-twitter")).toBeDefined();
    expect(screen.getByTestId("channel-tab-linkedin")).toBeDefined();
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
    // LinkedIn tab may need activation for content; TabsContent still mounts with value
    fireEvent.click(screen.getByTestId("channel-tab-linkedin"));
    await waitFor(() => expect(screen.getByTestId("channel-body-linkedin")).toBeDefined());
    fireEvent.change(screen.getByTestId("channel-body-linkedin"), {
      target: { value: "Longer LinkedIn body for builders." },
    });

    fireEvent.click(screen.getByTestId("broadcast-post-now"));
    await waitFor(() => expect(postMutateAsync).toHaveBeenCalled());

    expect(postMutateAsync).toHaveBeenCalledWith({
      posts: [
        { profileId: "buf-x", text: "Short X body." },
        { profileId: "buf-li", text: "Longer LinkedIn body for builders." },
      ],
      link: undefined,
      scheduledAt: undefined,
    });
  });

  it("falls back to master text for channels without a custom body", async () => {
    postMutateAsync.mockResolvedValue({
      results: [
        { profileId: "buf-x", success: true },
        { profileId: "buf-li", success: true },
      ],
    });
    render(<AdminBroadcastPanel />);
    selectChannel("X / Twitter");
    selectChannel("LinkedIn");
    fireEvent.change(screen.getByTestId("broadcast-message"), {
      target: { value: "Shared master body." },
    });
    fireEvent.click(screen.getByTestId("broadcast-post-now"));
    await waitFor(() => expect(postMutateAsync).toHaveBeenCalled());
    expect(postMutateAsync).toHaveBeenCalledWith({
      posts: [
        { profileId: "buf-x", text: "Shared master body." },
        { profileId: "buf-li", text: "Shared master body." },
      ],
      link: undefined,
      scheduledAt: undefined,
    });
  });

  it("seeds per-channel bodies from multi-channel Harvest drafts", async () => {
    draftMutateAsync.mockResolvedValue({
      drafts: [
        { channel: "twitter", label: "X / Twitter", text: "X take.", charCount: 7, maxChars: 280 },
        { channel: "linkedin", label: "LinkedIn", text: "LinkedIn take.", charCount: 14, maxChars: 3000 },
      ],
      sources: [],
      grounded: false,
      voice: { version: "1.0.0", revision: 1 },
      errors: [],
    });
    render(<AdminBroadcastPanel />);
    selectChannel("X / Twitter");
    selectChannel("LinkedIn");
    fireEvent.click(screen.getByTestId("draft-with-harvest"));
    await waitFor(() => expect(draftMutateAsync).toHaveBeenCalled());
    expect((screen.getByTestId("channel-body-twitter") as HTMLTextAreaElement).value).toBe("X take.");
    fireEvent.click(screen.getByTestId("channel-tab-linkedin"));
    await waitFor(() => {
      expect((screen.getByTestId("channel-body-linkedin") as HTMLTextAreaElement).value).toBe("LinkedIn take.");
    });
  });
});
