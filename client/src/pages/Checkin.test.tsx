import { beforeAll, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import Checkin from "./Checkin";

const mutate = vi.fn();

vi.mock("@/lib/trpc", () => ({
  trpc: {
    events: {
      checkin: {
        useMutation: () => ({ mutate, isPending: false }),
      },
    },
  },
}));

vi.mock("wouter", async (importOriginal) => {
  const actual = await importOriginal<typeof import("wouter")>();
  return {
    ...actual,
    useParams: () => ({ token: undefined }),
    useSearch: () => "?token=signed-token-value",
  };
});

describe("Checkin", () => {
  beforeAll(() => {
    window.matchMedia = ((query: string) => ({
      matches: false,
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
      onchange: null,
    })) as typeof window.matchMedia;
  });

  it("has no email field and posts the signed token", async () => {
    const { default: userEvent } = await import("@testing-library/user-event");
    render(<Checkin />);
    expect(screen.queryByRole("textbox")).toBeNull();
    await userEvent.setup().click(screen.getByRole("button", { name: "Check In" }));
    expect(mutate).toHaveBeenCalledWith({ token: "signed-token-value" });
  });
});
