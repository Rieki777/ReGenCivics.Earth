/**
 * Body mic: EmailMarkdownComposer exposes the shared DictationButton on the
 * Write tab so Outbound Write and Applications letters can dictate at the caret
 * without a second speech stack.
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { EmailMarkdownComposer } from "./EmailMarkdownComposer";

vi.mock("@/components/SmartImagePicker", () => ({
  SmartImagePicker: () => null,
}));

describe("EmailMarkdownComposer dictation", () => {
  it("offers the shared mic on the body Write tab", () => {
    render(
      <EmailMarkdownComposer
        subject=""
        body="Hello"
        onSubjectChange={() => {}}
        onBodyChange={() => {}}
      />,
    );
    expect(screen.getByTestId("dictation-button")).toBeTruthy();
    expect(screen.getByLabelText("Dictate body")).toBeTruthy();
    expect(screen.getByRole("toolbar", { name: "Markdown formatting" })).toBeTruthy();
    expect(screen.getByTestId("email-body")).toBeTruthy();
  });

  it("hides the mic on Preview so toolbar/preview stay unchanged", async () => {
    render(
      <EmailMarkdownComposer
        subject="Subj"
        body="Body text"
        onSubjectChange={() => {}}
        onBodyChange={() => {}}
      />,
    );
    await userEvent.click(screen.getByRole("tab", { name: "Preview" }));
    expect(screen.queryByTestId("dictation-button")).toBeNull();
    expect(screen.getByTitle("Email preview")).toBeTruthy();
  });
});
