import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { LandProjectVoteField, type AppliedProjectPick } from "./LandProjectVoteField";

vi.mock("wouter", () => ({
  Link: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a>,
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
        ready
        onProjectChange={onProjectChange}
        onPick={onPick}
      />,
    );

    expect(screen.queryByRole("link", { name: "Apply with your project" })).toBeNull();
    fireEvent.change(screen.getByLabelText("Your applied project"), { target: { value: "7" } });
    expect(onPick).toHaveBeenCalledWith(picks[0]);

    fireEvent.change(screen.getByLabelText("Your land project"), { target: { value: "A new name" } });
    expect(onProjectChange).toHaveBeenCalledWith("A new name");
  });

  it("offers apply when no project list is available", () => {
    render(
      <LandProjectVoteField
        project=""
        picks={[]}
        ready
        onProjectChange={() => {}}
        onPick={() => {}}
      />,
    );
    expect(screen.getByRole("link", { name: "Apply with your project" }).getAttribute("href")).toBe("/apply");
    expect(screen.getByLabelText("Your land project")).toBeTruthy();
  });

  it("waits to show apply while the project list is still loading", () => {
    render(
      <LandProjectVoteField
        project=""
        picks={[]}
        ready={false}
        onProjectChange={() => {}}
        onPick={() => {}}
      />,
    );
    expect(screen.queryByRole("link", { name: "Apply with your project" })).toBeNull();
  });
});
