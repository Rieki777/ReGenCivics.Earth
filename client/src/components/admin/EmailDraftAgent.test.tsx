import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { EmailDraftAgent } from "./EmailDraftAgent";

const newsletterMutate = vi.fn();
const applicationMutate = vi.fn();

vi.mock("@/lib/trpc", () => ({
  trpc: {
    email: {
      draftWithAgent: {
        useMutation: () => ({ mutateAsync: applicationMutate, isPending: false }),
      },
    },
    outbound: {
      draftWithAgent: {
        useMutation: () => ({ mutateAsync: newsletterMutate, isPending: false }),
      },
    },
  },
}));

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

describe("EmailDraftAgent newsletter", () => {
  it("applies a proposed subject, body, and layout into the parent", async () => {
    newsletterMutate.mockResolvedValue({
      reply: "Drafted a short letter.",
      subject: "This week's note",
      body: "Friends,\n\n[Watch the stream](https://regencivics.earth/)",
      layout: "announcement",
    });
    const onApply = vi.fn();
    render(
      <EmailDraftAgent
        currentSubject=""
        currentBody=""
        currentLayout="plain"
        statusLabel="active subscribers"
        audienceLabel="active subscribers"
        recipientCount={12}
        variant="newsletter"
        onApply={onApply}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: "Draft a letter about this week's Harvest." }));
    const apply = await screen.findByTestId("apply-to-draft");
    await userEvent.click(apply);

    expect(newsletterMutate).toHaveBeenCalled();
    expect(applicationMutate).not.toHaveBeenCalled();
    expect(onApply).toHaveBeenCalledWith({
      subject: "This week's note",
      body: "Friends,\n\n[Watch the stream](https://regencivics.earth/)",
      layout: "announcement",
    });
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
