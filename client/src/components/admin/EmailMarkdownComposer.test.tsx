/**
 * Composer discoverability: Features popover, Button on application variant,
 * Callout insert, and the shared body mic on Write.
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

describe("EmailMarkdownComposer feature catalog", () => {
  it("shows Features and Button on the application variant (Image stays newsletter-only)", async () => {
    render(
      <EmailMarkdownComposer
        subject=""
        body=""
        onSubjectChange={() => {}}
        onBodyChange={() => {}}
        variant="application"
      />,
    );
    expect(screen.getByTestId("composer-features")).toBeTruthy();
    expect(screen.getByTestId("composer-insert-button")).toBeTruthy();
    expect(screen.getByTestId("composer-insert-callout")).toBeTruthy();
    expect(screen.queryByTestId("composer-insert-image")).toBeNull();

    await userEvent.click(screen.getByTestId("composer-features"));
    expect(screen.getByTestId("composer-features-popover")).toBeTruthy();
    expect(screen.getByText("What you can add")).toBeTruthy();
    expect(screen.getByText("Button (CTA)")).toBeTruthy();
    expect(screen.getByText("Merge tokens")).toBeTruthy();
    expect(screen.getByText(/newsletter only/i)).toBeTruthy();
  });

  it("shows Image on the newsletter variant", () => {
    render(
      <EmailMarkdownComposer
        subject=""
        body=""
        onSubjectChange={() => {}}
        onBodyChange={() => {}}
        variant="newsletter"
      />,
    );
    expect(screen.getByTestId("composer-insert-image")).toBeTruthy();
    expect(screen.getByTestId("composer-insert-button")).toBeTruthy();
  });

  it("Callout inserts an Important blockquote into the body", async () => {
    const onBodyChange = vi.fn();
    render(
      <EmailMarkdownComposer
        subject=""
        body=""
        onSubjectChange={() => {}}
        onBodyChange={onBodyChange}
        variant="application"
      />,
    );
    await userEvent.click(screen.getByTestId("composer-insert-callout"));
    expect(onBodyChange).toHaveBeenCalled();
    const next = onBodyChange.mock.calls.at(-1)?.[0] as string;
    expect(next).toMatch(/> Important: your note here/);
  });
});
