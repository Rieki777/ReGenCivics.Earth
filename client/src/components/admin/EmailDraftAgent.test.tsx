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
  });
});
