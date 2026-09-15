import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import EmailPreferences from "@/pages/EmailPreferences";

const { unsubMutate, STABLE_PREFS } = vi.hoisted(() => ({
  unsubMutate: vi.fn(),
  STABLE_PREFS: {
    email: "ada@example.org",
    isActive: true,
    pausedUntil: null as string | null,
    topics: {
      seasonal: true,
      open_access: true,
      season2: true,
      events: true,
      recordings: true,
    },
  },
}));

vi.mock("@/components/SEO", () => ({ SEO: () => null }));

vi.mock("@/lib/trpc", () => ({
  trpc: {
    newsletter: {
      getPreferences: {
        useQuery: (_input: { token: string }, opts: { enabled: boolean }) => ({
          data: opts.enabled ? STABLE_PREFS : undefined,
          isLoading: false,
          error: null,
          refetch: vi.fn(),
        }),
      },
      savePreferences: {
        useMutation: () => ({ mutate: vi.fn(), error: null }),
      },
      muteTopic: {
        useMutation: () => ({ mutate: vi.fn(), isPending: false, error: null }),
      },
      pauseMarketing: {
        useMutation: () => ({ mutate: vi.fn(), isPending: false }),
      },
      unsubscribeAll: {
        useMutation: () => ({ mutate: unsubMutate, isPending: false }),
      },
      resubscribe: {
        useMutation: () => ({ mutate: vi.fn(), isPending: false }),
      },
    },
  },
}));

describe("EmailPreferences page", () => {
  it("points people without a token at the email-entry fallback", () => {
    window.history.replaceState({}, "", "/email-preferences");
    render(<EmailPreferences />);
    expect(screen.getByText("Email preferences")).toBeDefined();
    expect(screen.queryByRole("button", { name: "Unsubscribe from all" })).toBeNull();
    expect(screen.getByText(/email-entry page/i)).toBeDefined();
  });

  it("unsubscribes from all only after a confirm click", async () => {
    window.history.replaceState({}, "", "/email-preferences?token=signed-token-value-1234567890");
    unsubMutate.mockClear();
    render(<EmailPreferences />);
    await userEvent.click(screen.getByRole("button", { name: "Unsubscribe from all" }));
    expect(unsubMutate).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole("button", { name: "Yes, unsubscribe from all" }));
    expect(unsubMutate).toHaveBeenCalledWith({ token: "signed-token-value-1234567890" });
  });
});
