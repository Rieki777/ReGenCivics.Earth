import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { LandProjectVoteField, type AppliedProjectPick } from "./LandProjectVoteField";

vi.mock("wouter", () => ({
  Link: ({ children, href, className }: { children: React.ReactNode; href: string; className?: string }) => (
    <a href={href} className={className}>{children}</a>
  ),
}));

const picks: AppliedProjectPick[] = [
  { id: 7, name: "Hill Farm", href: "https://regencivics.earth/project/7-hill-farm" },
];

describe("LandProjectVoteField", () => {
  it("fills the vote from an applied project and keeps typing open", () => {
    const onProjectChange = vi.fn();
    const onPick = vi.fn();
    render(
      <LandProjectVoteField
        project=""
        picks={picks}
        onProjectChange={onProjectChange}
        onPick={onPick}
      />,
    );

    const apply = screen.getByRole("link", { name: "Not listed? Apply with your project" });
    expect(apply.getAttribute("href")).toBe("/apply");
    fireEvent.change(screen.getByLabelText("Your applied project"), { target: { value: "7" } });
    expect(onPick).toHaveBeenCalledWith(picks[0]);

    fireEvent.change(screen.getByLabelText("Your land project"), { target: { value: "A new name" } });
    expect(onProjectChange).toHaveBeenCalledWith("A new name");
  });

  it("keeps the apply link when no project list is available", () => {
    render(
      <LandProjectVoteField
        project=""
        picks={[]}
        onProjectChange={() => {}}
        onPick={() => {}}
      />,
    );
    expect(screen.getByRole("link", { name: "Not listed? Apply with your project" }).getAttribute("href")).toBe("/apply");
    expect(screen.getByLabelText("Your land project")).toBeTruthy();
    expect(screen.queryByLabelText("Your applied project")).toBeNull();
  });
});
