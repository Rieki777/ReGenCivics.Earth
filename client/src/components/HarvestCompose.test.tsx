/**
 * Compose box mic: the shared DictationButton is present next to the idea
 * textarea so Harvest can dictate without growing its own speech stack.
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ComposeBox } from "./HarvestCompose";

vi.mock("@/lib/trpc", () => ({
  trpc: {
    harvest: {
      composePreview: { useMutation: () => ({ mutateAsync: vi.fn(), isPending: false, isError: false, error: null }) },
      compose: { useMutation: () => ({ mutateAsync: vi.fn(), isPending: false, isError: false, error: null }) },
    },
  },
}));

describe("ComposeBox dictation", () => {
  it("offers the shared mic on the idea box", () => {
    render(<ComposeBox onComposed={() => {}} />);
    expect(screen.getByTestId("dictation-button")).toBeTruthy();
    expect(screen.getByLabelText("Dictate idea")).toBeTruthy();
  });
});
