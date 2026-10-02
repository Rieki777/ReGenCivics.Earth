import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

const mutate = vi.fn();
const setLocation = vi.fn();

vi.mock("@/lib/trpc", () => ({
  trpc: {
    newsletter: {
      unsubscribe: {
        useMutation: (opts?: { onSuccess?: () => void; onError?: (err: { message: string }) => void }) => ({
          mutate: (input: unknown) => {
            mutate(input);
            opts?.onSuccess?.();
          },
        }),
      },
    },
  },
}));

vi.mock("wouter", async (importOriginal) => {
  const actual = await importOriginal<typeof import("wouter")>();
  return {
    ...actual,
    useLocation: () => ["/unsubscribe", setLocation],
    Link: ({ href, children, ...rest }: { href: string; children: ReactNode }) => (
      <a href={href} {...rest}>{children}</a>
    ),
  };
});

vi.mock("@/components/SEO", () => ({ SEO: () => null }));

import Unsubscribe from "./Unsubscribe";

describe("Unsubscribe", () => {
  beforeEach(() => {
    mutate.mockClear();
    setLocation.mockClear();
    window.history.replaceState({}, "", "/unsubscribe");
  });

  it("asks for a confirmation email and does not say the address is already removed", () => {
    render(<Unsubscribe />);
    expect(screen.getByRole("button", { name: "Email me a confirmation" })).toBeInTheDocument();
    expect(screen.queryByText(/You've been unsubscribed/)).toBeNull();
    expect(screen.queryByText(/removed from our mailing list/)).toBeNull();
    expect(screen.getByText(/A confirmation link goes out before we change what you receive/)).toBeInTheDocument();
  });

  it("shows the same inbox note after submit and posts the typed address", () => {
    render(<Unsubscribe />);
    fireEvent.change(screen.getByLabelText("Email Address"), { target: { value: "Ada@Example.org" } });
    fireEvent.click(screen.getByRole("button", { name: "Email me a confirmation" }));
    expect(mutate).toHaveBeenCalledWith({ email: "ada@example.org" });
    expect(screen.getByRole("heading", { name: "Check your inbox" })).toBeInTheDocument();
    expect(screen.getByText(/Nothing changes until you do/)).toBeInTheDocument();
  });

  it("opens preferences when the link already carries a token", () => {
    window.history.replaceState({}, "", "/unsubscribe?token=signed-token");
    render(<Unsubscribe />);
    expect(setLocation).toHaveBeenCalledWith("/preferences?token=signed-token");
    expect(screen.queryByRole("button", { name: "Email me a confirmation" })).toBeNull();
  });
});
