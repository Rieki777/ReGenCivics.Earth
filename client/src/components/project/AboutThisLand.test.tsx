/**
 * About this land's governance link (review of build spec bundle 1, lane 5
 * commit 2). The link is free text the steward typed and nothing checks it,
 * so "The project's space on Hypha" shows only for a project's own Hypha
 * space; the Game's space (every example campaign links it) is named for
 * what it is, any other web address gets a neutral label, and text that is
 * not a web address is left out.
 */
import { afterEach, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { AboutThisLand, daoLinkFor } from "./AboutThisLand";
import type { ProjectFront } from "./StewardTools";

const PROJECT = "https://app.hypha.earth/en/dho/hill-farm/agreements";
const GAME_FORM = "https://app.hypha.earth/en/dho/regen-games/agreements/create/propose-contribution";

describe("daoLinkFor", () => {
  it("names a project's own Hypha space", () => {
    expect(daoLinkFor(PROJECT)).toEqual({ href: PROJECT, label: "The project's space on Hypha" });
    expect(daoLinkFor("https://hypha.earth/dho/hill-farm")?.label).toBe("The project's space on Hypha");
  });

  it("names the Game's and ReGen Civics' spaces for what they are", () => {
    expect(daoLinkFor(GAME_FORM)?.label).toBe("ReGen Games on Hypha");
    expect(daoLinkFor("https://app.hypha.earth/en/dho/regen-civics/agreements")?.label).toBe("ReGen Civics on Hypha");
  });

  it("gives any other web address a neutral label", () => {
    expect(daoLinkFor("https://example.org/our-dao")?.label).toBe("Governance link");
    expect(daoLinkFor("https://hypha.earth.example.org/dho/hill-farm")?.label).toBe("Governance link");
    expect(daoLinkFor("https://notahypha.earth/dho/hill-farm")?.label).toBe("Governance link");
    expect(daoLinkFor("http://app.hypha.earth/en/dho/hill-farm")?.label).toBe("Governance link");
    expect(daoLinkFor("https://app.hypha.earth/en/spaces")?.label).toBe("Governance link");
  });

  it("leaves out anything that is not a web address", () => {
    expect(daoLinkFor(null)).toBeNull();
    expect(daoLinkFor("  ")).toBeNull();
    expect(daoLinkFor("app.hypha.earth/en/dho/hill-farm")).toBeNull();
    expect(daoLinkFor("javascript:alert(1)")).toBeNull();
    expect(daoLinkFor("mailto:team@b1-lane.invalid")).toBeNull();
  });
});

describe("AboutThisLand", () => {
  afterEach(() => {
    window.location.hash = "";
  });

  function front(daoLink: string | null): ProjectFront {
    return { title: "Hill Farm", description: "A season on the hill.", daoLink, websiteUrl: null, videoUrl: null, images: [] } as unknown as ProjectFront;
  }

  it("prints the label daoLinkFor gives, opened from #about", () => {
    window.location.hash = "#about";
    const { unmount } = render(<AboutThisLand front={front(GAME_FORM)} />);
    expect(screen.getByRole("link", { name: "ReGen Games on Hypha" })).toHaveAttribute("href", GAME_FORM);
    expect(screen.queryByText("The project's space on Hypha")).toBeNull();
    unmount();

    render(<AboutThisLand front={front(PROJECT)} />);
    expect(screen.getByRole("link", { name: "The project's space on Hypha" })).toHaveAttribute("href", PROJECT);
  });
});
