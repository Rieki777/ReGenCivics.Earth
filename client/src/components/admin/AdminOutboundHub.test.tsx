import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AdminOutboundHub } from "./AdminOutboundHub";

vi.mock("@/lib/trpc", () => ({
  trpc: {
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
  it("shows the write stub and no send control", () => {
    render(<AdminOutboundHub surface="write" onSurfaceChange={vi.fn()} />);
    expect(screen.getByText("Write a letter")).toBeDefined();
    expect(screen.getByText(/Sending ships in the next update/)).toBeDefined();
    expect(screen.getByText(/Insert a CTA button/)).toBeDefined();
    expect(screen.getByText(/unsubscribe footer/)).toBeDefined();
    expect(screen.queryByRole("button", { name: /send/i })).toBeNull();
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
  });
});
