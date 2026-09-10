import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AdminOutboundHub } from "./AdminOutboundHub";

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

describe("AdminOutboundHub", () => {
  it("shows the newsletter composer with insert-button control", () => {
    render(<AdminOutboundHub surface="write" onSurfaceChange={vi.fn()} />);
    expect(screen.getByText("Write a letter")).toBeDefined();
    expect(screen.getByRole("button", { name: "Insert button" })).toBeDefined();
    expect(screen.getByRole("button", { name: "Insert image" })).toBeDefined();
    expect(screen.getByRole("button", { name: /Preview send/i })).toBeDefined();
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
});
