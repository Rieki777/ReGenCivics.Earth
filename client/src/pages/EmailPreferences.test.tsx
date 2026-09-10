import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import EmailPreferences from "@/pages/EmailPreferences";

const mutate = vi.fn();

vi.mock("@/components/SEO", () => ({ SEO: () => null }));

vi.mock("@/lib/trpc", () => ({
  trpc: {
    newsletter: {
      unsubscribeByToken: {
        useMutation: () => ({ mutate, isPending: false }),
      },
    },
  },
}));

describe("EmailPreferences stub", () => {
  it("asks for a letter link when there is no token", () => {
    window.history.replaceState({}, "", "/preferences");
    render(<EmailPreferences />);
    expect(screen.getByText("Email preferences")).toBeDefined();
    expect(screen.queryByRole("button", { name: "Unsubscribe from all" })).toBeNull();
    expect(screen.getByText(/unsubscribe form/i)).toBeDefined();
  });

  it("unsubscribes from all only after the admin clicks", async () => {
    window.history.replaceState({}, "", "/preferences?token=signed-token-value-1234567890");
    mutate.mockClear();
    render(<EmailPreferences />);
    await userEvent.click(screen.getByRole("button", { name: "Unsubscribe from all" }));
    expect(mutate).toHaveBeenCalledWith({ token: "signed-token-value-1234567890" });
  });
});
