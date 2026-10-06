import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { SeasonDefaults } from "./SeasonDefaults";
import { READINESS_HREF } from "@shared/crowdpoolReadiness";

describe("SeasonDefaults on /campaigns", () => {
  it("before the season opens: the default opening day, labelled as a default, and the Ready list", () => {
    render(<SeasonDefaults now={new Date("2026-09-27T12:00:00Z")} />);
    const block = screen.getByRole("region", { name: "Season defaults" });
    expect(block).toHaveTextContent(
      "Default opening day: 20 March 2027. Season 2 crowdpooling opens together at the March equinox, when the Build Season opens on the Year wheel. Each project can choose its own day.",
    );
    expect(block).toHaveTextContent("What we look for, by default: the Ready to crowdpool list.");
    const link = screen.getByRole("link", { name: "the Ready to crowdpool list" });
    expect(link).toHaveAttribute("href", READINESS_HREF);
    expect(READINESS_HREF).toBe("/crowd-pooling#ready");
  });

  it("through the Resource Season the launch is still ahead", () => {
    render(<SeasonDefaults now={new Date("2027-01-10T12:00:00Z")} />);
    expect(screen.getByRole("region", { name: "Season defaults" })).toHaveTextContent(
      "Default opening day: 20 March 2027. Season 2 crowdpooling opens together at the March equinox",
    );
  });

  it("once the Build Season has opened, it says the day the round opened", () => {
    render(<SeasonDefaults now={new Date("2027-05-01T12:00:00Z")} />);
    expect(screen.getByRole("region", { name: "Season defaults" })).toHaveTextContent(
      "Season 2 crowdpooling opened on 20 March 2027, the default opening day on the Year wheel. Each project can choose its own day.",
    );
  });

  it("uses our words: no em-dash, no fund or money words", () => {
    const { container } = render(<SeasonDefaults now={new Date("2026-09-27T12:00:00Z")} />);
    const text = container.textContent ?? "";
    expect(text).not.toContain(String.fromCharCode(0x2014));
    expect(text).not.toMatch(/pledge|donation|funded|claim|earmark/i);
  });
});
