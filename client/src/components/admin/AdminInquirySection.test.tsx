import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { InquirySection } from "./AdminInquirySection";

const noopMutation = () => ({ mutate: vi.fn(), mutateAsync: vi.fn(), isPending: false });

vi.mock("@/lib/trpc", () => ({
  trpc: {
    useUtils: () => ({
      generalInquiries: { list: { invalidate: vi.fn() } },
    }),
    contactNotes: { create: { useMutation: () => noopMutation() } },
    generalInquiries: {
      updateStatus: { useMutation: () => noopMutation() },
    },
    email: { sendBulk: { useMutation: () => noopMutation() } },
  },
}));

vi.mock("@/components/EmailTemplateSelector", () => ({
  EmailTemplateSelector: () => null,
  emailTemplates: [],
}));

vi.mock("@/components/admin/EmailMarkdownComposer", () => ({
  EmailMarkdownComposer: () => null,
}));

vi.mock("@/components/admin/EmailSaveTemplateBar", () => ({
  EmailSaveTemplateBar: () => null,
}));

vi.mock("./AdminContactPanels", () => ({
  ContactNotesPanel: () => null,
  ContactTagsPanel: () => null,
  ReminderPanel: () => null,
  AssigneeSelect: () => null,
}));

vi.mock("./EmailHistoryPanel", () => ({
  EmailHistoryPanel: () => null,
}));

describe("InquirySection alliance list rows", () => {
  it("shows a visible application blurb under name and email without opening the row", () => {
    render(
      <InquirySection
        pathType="alliance"
        inquiries={[
          {
            id: 42,
            pathType: "alliance",
            fullName: "Rye",
            email: "rieki@pm.me",
            status: "new",
            createdAt: new Date(Date.now() - 10 * 24 * 3_600_000).toISOString(),
            allianceSupportDescription: "We help land projects set up governance councils and shared treasuries.",
            partnershipDescription: "A longer partnership vision that should not win over the support description.",
          },
        ]}
      />,
    );

    expect(screen.getByText("Rye")).toBeDefined();
    expect(screen.getByText("rieki@pm.me")).toBeDefined();
    expect(
      screen.getByText("We help land projects set up governance councils and shared treasuries."),
    ).toBeDefined();
    expect(screen.getByRole("button", { name: "Email" })).toBeDefined();
    expect(screen.getByText(/overdue/)).toBeDefined();
    expect(
      screen.queryByText("A longer partnership vision that should not win over the support description."),
    ).toBeNull();
  });
});
