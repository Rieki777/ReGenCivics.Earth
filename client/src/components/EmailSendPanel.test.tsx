import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { EmailSendPanel } from "./EmailSendPanel";

const sendPreviewMutate = vi.fn();
const confirmSendMutate = vi.fn();

vi.mock("@/lib/trpc", () => ({
  trpc: {
    harvest: {
      sendPreview: {
        useMutation: () => ({
          mutateAsync: sendPreviewMutate,
          isPending: false,
          isError: false,
          error: null,
        }),
      },
      confirmSend: {
        useMutation: () => ({
          mutateAsync: confirmSendMutate,
          isPending: false,
          isError: false,
          error: null,
        }),
      },
    },
  },
}));

describe("EmailSendPanel", () => {
  beforeEach(() => {
    sendPreviewMutate.mockReset();
    confirmSendMutate.mockReset();
  });

  it("previews then confirms on the existing harvest send path", async () => {
    sendPreviewMutate.mockResolvedValue({
      subject: "The forest is planted",
      recipientCount: 12,
      confirmToken: "token-abc",
    });
    confirmSendMutate.mockResolvedValue({ recipientCount: 12, duplicate: false });
    const onSent = vi.fn();
    const user = userEvent.setup();
    render(<EmailSendPanel itemId={44} onSent={onSent} />);

    await user.click(screen.getByRole("button", { name: /Preview email send/ }));
    await waitFor(() => {
      expect(sendPreviewMutate).toHaveBeenCalledWith({ itemId: 44 });
    });
    expect(screen.getByText(/The forest is planted/)).toBeDefined();
    expect(screen.getByText(/12 subscribers/)).toBeDefined();

    await user.click(screen.getByRole("button", { name: /Confirm send to 12/ }));
    await waitFor(() => {
      expect(confirmSendMutate).toHaveBeenCalledWith({
        itemId: 44,
        confirmToken: "token-abc",
        idempotencyKey: expect.any(String),
      });
    });
    expect(onSent).toHaveBeenCalled();
    expect(screen.getByText("Sent to 12 subscribers.")).toBeDefined();
  });
});
