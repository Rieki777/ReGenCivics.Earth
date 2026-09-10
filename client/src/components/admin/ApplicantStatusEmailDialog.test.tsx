import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ApplicantStatusEmailDialog } from "./ApplicantStatusEmailDialog";

vi.mock("@/lib/trpc", () => ({
  trpc: {
    useUtils: () => ({
      email: { getCustomTemplates: { invalidate: vi.fn() } },
    }),
    applications: {
      listEmailRecipients: {
        useQuery: () => ({
          data: [{ email: "ada@example.com", name: "Ada", projectName: "Ada's Farm" }],
          isLoading: false,
        }),
      },
    },
    email: {
      getCustomTemplates: { useQuery: () => ({ data: [], isSuccess: true }) },
      sendBulk: { useMutation: () => ({ mutateAsync: vi.fn() }) },
      draftWithAgent: { useMutation: () => ({ mutateAsync: vi.fn(), isPending: false }) },
      saveCustomTemplate: { useMutation: () => ({ mutateAsync: vi.fn(), isPending: false }) },
      renderPdf: { useMutation: () => ({ mutateAsync: vi.fn(), isPending: false }) },
    },
  },
}));

describe("ApplicantStatusEmailDialog", () => {
  it("does not send the admin to the Settings bulk composer", () => {
    render(
      <ApplicantStatusEmailDialog
        open
        onOpenChange={vi.fn()}
        status="approved"
        statusLabel="Approved"
        applicationCount={1}
      />,
    );
    expect(screen.queryByText("Open in email composer")).toBeNull();
    expect(screen.getByRole("button", { name: /Send to 1/ })).toBeDefined();
  });
});
