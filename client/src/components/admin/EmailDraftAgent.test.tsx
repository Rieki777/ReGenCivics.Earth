/**
 * Writing-partner mic: the shared DictationButton sits next to
 * "Tell me what to change..." so Outbound Write and Applications status
 * email can dictate without growing a second speech stack.
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { EmailDraftAgent } from "./EmailDraftAgent";

vi.mock("@/lib/trpc", () => ({
  trpc: {
    email: {
      draftWithAgent: { useMutation: () => ({ mutateAsync: vi.fn(), isPending: false }) },
    },
    outbound: {
      draftWithAgent: { useMutation: () => ({ mutateAsync: vi.fn(), isPending: false }) },
    },
  },
}));

const props = {
  currentSubject: "",
  currentBody: "",
  statusLabel: "new",
  recipientCount: 1,
  onApply: () => {},
};

describe("EmailDraftAgent dictation", () => {
  it("offers the shared mic on the Write with me input", () => {
    render(<EmailDraftAgent {...props} />);
    expect(screen.getByText("Write with me")).toBeTruthy();
    expect(screen.getByPlaceholderText("Tell me what to change...")).toBeTruthy();
    expect(screen.getByTestId("dictation-button")).toBeTruthy();
    expect(screen.getByLabelText("Dictate message")).toBeTruthy();
  });

  it("uses the same shared mic for the newsletter writing partner", () => {
    render(<EmailDraftAgent {...props} variant="newsletter" audienceLabel="all subscribers" />);
    expect(screen.getByTestId("dictation-button")).toBeTruthy();
    expect(screen.getByLabelText("Dictate message")).toBeTruthy();
  });
});
