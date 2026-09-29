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

const dictationProps = {
    currentSubject: "",
    currentBody: "",
    statusLabel: "new",
    recipientCount: 1,
    onApply: () => {},
};

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

describe("EmailDraftAgent dictation", () => {
    it("offers the shared mic on the Write with me input", () => {
          render(<EmailDraftAgent {...dictationProps} />);
          expect(screen.getByText("Write with me")).toBeTruthy();
          expect(screen.getByPlaceholderText("Tell me what to change...")).toBeTruthy();
          expect(screen.getByTestId("dictation-button")).toBeTruthy();
          expect(screen.getByLabelText("Dictate message")).toBeTruthy();
    });

           it("uses the same shared mic for the newsletter writing partner", () => {
                 render(<EmailDraftAgent {...dictationProps} variant="newsletter" audienceLabel="all subscribers" />);
                 expect(screen.getByTestId("dictation-button")).toBeTruthy();
                 expect(screen.getByLabelText("Dictate message")).toBeTruthy();
           });
});

describe("EmailDraftAgent apply gating", () => {
    it("hides Apply when the proposal matches the current draft", async () => {
          applicationMutate.mockResolvedValue({
                  reply: "Tweaked the tone.",
                  subject: "Same subject",
                  body: "Same body",
                  layout: "plain",
          });
          render(
                  <EmailDraftAgent
                            currentSubject="Same subject"
                            currentBody="Same body"
                            currentLayout="plain"
                            statusLabel="approved"
                            recipientCount={3}
                            onApply={vi.fn()}
                          />,
                );
          await userEvent.click(screen.getByRole("button", { name: "Write a warmer version of this draft." }));
          expect(await screen.findByText("Tweaked the tone.")).toBeTruthy();
          expect(screen.queryByTestId("apply-to-draft")).toBeNull();
    });

    it("toasts an error when Apply would not change the draft", async () => {
          const { toast } = await import("sonner");
          applicationMutate.mockResolvedValue({
                  reply: "Updated the subject.",
                  subject: "",
                  body: "",
                  layout: "announcement",
          });
          const onApply = vi.fn();
          render(
                  <EmailDraftAgent
                            currentSubject="Hello"
                            currentBody="Body"
                            currentLayout="announcement"
                            statusLabel="approved"
                            recipientCount={3}
                            onApply={onApply}
                          />,
                );
          await userEvent.click(screen.getByRole("button", { name: "Write a warmer version of this draft." }));
          // layout matches current → no meaningful proposal → no button
          expect(await screen.findByText("Updated the subject.")).toBeTruthy();
          expect(screen.queryByTestId("apply-to-draft")).toBeNull();
          expect(onApply).not.toHaveBeenCalled();
          expect(toast.error).not.toHaveBeenCalled();
    });

    it("applies a subject-only proposal without requiring a new body", async () => {
          applicationMutate.mockResolvedValue({
                  reply: "Updated the subject line.",
                  subject: "New subject line",
                  body: "Kept body",
                  layout: "",
          });
          const onApply = vi.fn();
          render(
                  <EmailDraftAgent
                            currentSubject="Old subject"
                            currentBody="Kept body"
                            currentLayout="announcement"
                            statusLabel="approved"
                            recipientCount={3}
                            onApply={onApply}
                          />,
                );
          await userEvent.click(screen.getByRole("button", { name: "Write a warmer version of this draft." }));
          const apply = await screen.findByTestId("apply-to-draft");
          await userEvent.click(apply);
          expect(onApply).toHaveBeenCalledWith({
                  subject: "New subject line",
                  body: "Kept body",
                  layout: undefined,
          });
    });
});
