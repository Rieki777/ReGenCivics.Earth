import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { VoteCallTimesCta } from "./VoteCallTimesCta";

describe("VoteCallTimesCta", () => {
  it("is one primary button to the season vote, with a caption under it", () => {
    render(<VoteCallTimesCta />);
    const link = screen.getByRole("link", { name: "Vote on call times" });
    expect(link.getAttribute("href")).toBe("/season-schedule");
    expect(link.className).toContain("bg-[#7dd87d]");
    expect(link.className).toContain("text-[#1a472a]");
    expect(link.className).toContain("min-h-16");
    expect(link.className).not.toContain("bg-[#1a472a]");
    const caption = screen.getByText("Add your info too.");
    expect(caption.tagName).toBe("SPAN");
    expect(caption.closest("a")).toBeNull();
  });
});
