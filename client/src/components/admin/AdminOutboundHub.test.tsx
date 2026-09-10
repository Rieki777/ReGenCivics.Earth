import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AdminOutboundHub } from "./AdminOutboundHub";
import {
  OUTBOUND_WRITE_FILL_EVENT,
  OUTBOUND_WRITE_FILL_KEY,
  serializeOutboundWriteFill,
} from "@shared/outboundWriteFill";

vi.mock("@/lib/trpc", () => ({
  trpc: {
    useUtils: () => ({ email: { getCustomTemplates: { invalidate: vi.fn() } } }),
    newsletter: {
      list: {
        useQuery: () => ({
          data: [
            { id: 1, email: "active@example.com", name: "Ada", source: "exit_intent", isActive: 1, createdAt: "2026-08-01T00:00:00.000Z" },
            { id: 2, email: "old@example.com", name: "Bea", source: "footer", isActive: 0, createdAt: "2026-08-02T00:00:00.000Z" },
          ],
          isLoading: false,
        }),
      },
      listActive: {
        useQuery: () => ({
          data: [
            { id: 1, email: "active@example.com", name: "Ada", source: "exit_intent", isActive: 1 },
          ],
          isLoading: false,
        }),
      },
    },
    email: {
      getCustomTemplates: { useQuery: () => ({ data: [], isLoading: false }) },
      saveCustomTemplate: { useMutation: () => ({ mutateAsync: vi.fn(), isPending: false }) },
      renderPdf: { useMutation: () => ({ mutateAsync: vi.fn(), isPending: false }) },
      draftWithAgent: { useMutation: () => ({ mutateAsync: vi.fn(), isPending: false }) },
    },
    outbound: {
      saveDraft: { useMutation: () => ({ mutateAsync: vi.fn(), isPending: false }) },
      sendPreview: { useMutation: () => ({ mutateAsync: vi.fn(), isPending: false, isError: false, error: null }) },
      confirmSend: { useMutation: () => ({ mutateAsync: vi.fn(), isPending: false, isError: false, error: null }) },
      draftWithAgent: { useMutation: () => ({ mutateAsync: vi.fn(), isPending: false }) },
      listIssues: { useQuery: () => ({ data: [], isLoading: false }) },
    },
    admin: {
      broadcast: {
        getBufferProfiles: { useQuery: () => ({ data: [], isLoading: false, error: { message: "Buffer not configured" } }) },
        postToBuffer: { useMutation: () => ({ mutateAsync: vi.fn(), isPending: false }) },
        farcasterIntent: { useMutation: () => ({ mutateAsync: vi.fn(), isPending: false }) },
      },
    },
    harvest: {
      draftBroadcast: { useMutation: () => ({ mutateAsync: vi.fn(), isPending: false }) },
    },
  },
}));

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

describe("AdminOutboundHub", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it("shows the newsletter composer with insert-button control", () => {
    render(<AdminOutboundHub surface="write" onSurfaceChange={vi.fn()} />);
    expect(screen.getByText("Write a letter")).toBeDefined();
    expect(screen.getByRole("button", { name: "Insert button" })).toBeDefined();
    expect(screen.getByRole("button", { name: "Insert image" })).toBeDefined();
    expect(screen.getByRole("button", { name: /Preview send/i })).toBeDefined();
    expect(screen.queryByText(/composer will take full markdown/i)).toBeNull();
    expect(screen.queryByText(/send button stays off/i)).toBeNull();
  });

  it("defaults the people list to active subscribers", () => {
    render(<AdminOutboundHub surface="people" onSurfaceChange={vi.fn()} />);
    expect(screen.getByText("active@example.com")).toBeDefined();
    expect(screen.queryByText("old@example.com")).toBeNull();
  });

  it("lets the admin switch to Social without leaving the hub", async () => {
    const onSurfaceChange = vi.fn();
    render(<AdminOutboundHub surface="write" onSurfaceChange={onSurfaceChange} />);
    await userEvent.click(screen.getByRole("tab", { name: "Social" }));
    expect(onSurfaceChange).toHaveBeenCalledWith("social");
  });

  it("mounts the Broadcast composer on Social, including Draft with Harvest", () => {
    render(<AdminOutboundHub surface="social" onSurfaceChange={vi.fn()} />);
    expect(screen.getByTestId("draft-with-harvest")).toBeDefined();
    expect(screen.getByTestId("broadcast-message")).toBeDefined();
    expect(screen.getByTestId("dictation-button")).toBeDefined();
    expect(screen.getByLabelText("Dictate message")).toBeDefined();
  });

  it("fills Write fields from a pending assistant compose", () => {
    sessionStorage.setItem(
      OUTBOUND_WRITE_FILL_KEY,
      serializeOutboundWriteFill({
        subject: "Season update",
        body: "Friends,\n\nThe live stream is tonight.",
        layout: "plain",
      })!,
    );
    render(<AdminOutboundHub surface="write" onSurfaceChange={vi.fn()} />);
    expect((screen.getByTestId("outbound-write-subject") as HTMLInputElement).value).toBe("Season update");
    expect((screen.getByTestId("outbound-write-body") as HTMLTextAreaElement).value).toContain("live stream is tonight");
    expect(screen.getByTestId("outbound-write-body-layout").textContent).toMatch(/Plain letter/i);
    expect(sessionStorage.getItem(OUTBOUND_WRITE_FILL_KEY)).toBeNull();
  });

  it("fills Write fields from a live assistant compose event", () => {
    render(<AdminOutboundHub surface="write" onSurfaceChange={vi.fn()} />);
    act(() => {
      window.dispatchEvent(new CustomEvent(OUTBOUND_WRITE_FILL_EVENT, {
        detail: {
          subject: "From the assistant",
          body: "A short letter body.",
          layout: "announcement",
        },
      }));
    });
    expect((screen.getByTestId("outbound-write-subject") as HTMLInputElement).value).toBe("From the assistant");
    expect((screen.getByTestId("outbound-write-body") as HTMLTextAreaElement).value).toBe("A short letter body.");
  });
});
