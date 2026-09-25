import { describe, expect, it } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { NeedsTab, filterOpenNeeds, matchesPlace, needPlaceLine, EMPTY_FILTER } from "./NeedsTab";
import type { OpenNeedRow, OpenNeedsResult, OpenRouteRow } from "@shared/openNeeds";

let nextId = 100;
function need(over: Partial<OpenNeedRow> = {}): OpenNeedRow {
  const id = over.needId ?? nextId++;
  return {
    needId: id,
    campaignId: 12,
    projectName: "Hill Farm",
    campaignTitle: "Spring Build",
    location: "Asturias, Spain",
    isDemo: false,
    path: `/project/41-hill-farm?campaign=12&offer=${id}#need-${id}`,
    kind: "item",
    chip: "things",
    verb: "Offer",
    title: "Tractor",
    detail: null,
    status: { key: "none", text: "No one has offered yet" },
    noOffersYet: true,
    place: "land",
    capitalType: "material",
    ...over,
  };
}

function route(over: Partial<OpenRouteRow> = {}): OpenRouteRow {
  return {
    campaignId: 12,
    projectName: "Hill Farm",
    partner: "maearth",
    label: "Give through Ma Earth",
    path: "/project/41-hill-farm?campaign=12#money",
    isDemo: false,
    ...over,
  };
}

function result(over: Partial<OpenNeedsResult> = {}): OpenNeedsResult {
  return { needs: [], examples: [], routes: [], exampleRoutes: [], realCampaignCount: 0, ...over };
}

const tractor = need({ needId: 1, title: "Tractor" });
const cook = need({
  needId: 2, kind: "role", chip: "role", verb: "Apply", title: "Cook", place: null,
  detail: "20 hrs a week until 15 Dec, about 240 hours in all",
  status: { key: "partly", text: "4 of 20 hours a week offered" }, noOffersYet: false,
});
const planting = need({ needId: 3, kind: "shift", chip: "time", verb: "Sign up", title: "Planting day", detail: "On 12 Oct", projectName: "River Commons", location: "Wales" });
const soilClass = need({ needId: 4, kind: "knowledge", chip: "knowhow", verb: "Apply", title: "Soil class", place: "remote", location: "Wales" });
const bookkeeper = need({ needId: 5, kind: "role", chip: "role", verb: "Apply", title: "Bookkeeper", place: "either" });
const exampleChipper = need({
  needId: 9, isDemo: true, campaignId: 1597, projectName: "Harmony Valley", title: "Wood chipper (loan)",
  path: "/project/c1597-harmony-valley?campaign=1597&offer=9#need-9",
});

const titles = () =>
  screen.queryAllByRole("heading", { level: 3 }).map((h) => h.textContent);

describe("NeedsTab", () => {
  it("keeps the server's order and says who has offered in words", () => {
    render(<NeedsTab data={result({ needs: [planting, tractor, cook], realCampaignCount: 2 })} />);
    expect(screen.getByRole("heading", { name: "Every open need, across every campaign" })).toBeInTheDocument();
    expect(screen.getByText("Needs no one has offered on yet come first. Pick one and it takes you to the project.")).toBeInTheDocument();
    expect(titles()).toEqual(["Planting day", "Tractor", "Cook"]);
    expect(screen.getAllByText("No one has offered yet")).toHaveLength(2);
    expect(screen.getByText("4 of 20 hours a week offered")).toBeInTheDocument();
  });

  it("each row has its verb as a 44px link to the project, with the offer sheet in the address", () => {
    render(<NeedsTab data={result({ needs: [tractor, cook, planting], realCampaignCount: 1 })} />);
    const offer = screen.getByRole("link", { name: "Offer: Tractor" });
    expect(offer).toHaveTextContent("Offer");
    expect(offer).toHaveAttribute("href", "/project/41-hill-farm?campaign=12&offer=1#need-1");
    expect(offer.className).toContain("min-h-11");
    expect(screen.getByRole("link", { name: "Apply: Cook" })).toHaveTextContent("Apply");
    expect(screen.getByRole("link", { name: "Sign up: Planting day" })).toHaveTextContent("Sign up");
    expect(screen.getByText("River Commons · Wales")).toBeInTheDocument();
    expect(screen.getByText("On 12 Oct")).toBeInTheDocument();
  });

  it("kind chips combine with OR and toggle aria-pressed", () => {
    render(<NeedsTab data={result({ needs: [tractor, cook, planting, soilClass], realCampaignCount: 2 })} />);
    const things = screen.getByRole("button", { name: "Things" });
    const time = screen.getByRole("button", { name: "Time" });
    expect(things).toHaveAttribute("aria-pressed", "false");
    fireEvent.click(things);
    expect(things).toHaveAttribute("aria-pressed", "true");
    expect(titles()).toEqual(["Tractor"]);
    fireEvent.click(time);
    expect(titles()).toEqual(["Tractor", "Planting day"]);
    for (const name of ["Things", "Time", "A role", "Know-how", "Money", "On the land", "Remote"]) {
      expect(screen.getByRole("button", { name }).className).toContain("min-h-11");
    }
  });

  it("a place chip narrows, counts either for both, leaves out needs that don't say, and says so", () => {
    render(<NeedsTab data={result({ needs: [tractor, cook, soilClass, bookkeeper], realCampaignCount: 1 })} />);
    expect(screen.queryByText("Needs that don't say where they happen are left out.")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Remote" }));
    expect(titles()).toEqual(["Soil class", "Bookkeeper"]);
    expect(screen.getByText("Needs that don't say where they happen are left out.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Remote" }));
    fireEvent.click(screen.getByRole("button", { name: "On the land" }));
    expect(titles()).toEqual(["Tractor", "Bookkeeper"]);
    expect(screen.getByText("Hill Farm · Asturias, Spain · On the land or remote")).toBeInTheDocument();
  });

  it("search matches the title, the project name and the detail", () => {
    render(<NeedsTab data={result({ needs: [tractor, cook, planting], realCampaignCount: 2 })} />);
    const box = screen.getByRole("searchbox", { name: "Search needs" });
    expect(box).toHaveAttribute("placeholder", "Search needs, like truck or cook");
    fireEvent.change(box, { target: { value: "trac" } });
    expect(titles()).toEqual(["Tractor"]);
    fireEvent.change(box, { target: { value: "river commons" } });
    expect(titles()).toEqual(["Planting day"]);
    fireEvent.change(box, { target: { value: "240 hours" } });
    expect(titles()).toEqual(["Cook"]);
  });

  it("puts example needs in their own labelled row below the real ones", () => {
    render(<NeedsTab data={result({ needs: [tractor], examples: [exampleChipper], realCampaignCount: 1 })} />);
    const heading = screen.getByRole("heading", { name: "Example needs" });
    expect(screen.getByText("From example campaigns. Nothing sent on them reaches a real project.")).toBeInTheDocument();
    const section = heading.closest("section")!;
    expect(within(section).getByRole("heading", { name: "Wood chipper (loan)" })).toBeInTheDocument();
    expect(within(section).getByText("Example")).toBeInTheDocument();
    expect(within(section).queryByRole("heading", { name: "Tractor" })).toBeNull();
    expect(titles()).toEqual(["Tractor", "Example needs", "Wood chipper (loan)"]);
  });

  it("the Money chip swaps the list for the ways to put money in, never a need", () => {
    const { rerender } = render(
      <NeedsTab
        data={result({
          needs: [tractor, cook],
          routes: [route()],
          exampleRoutes: [route({ campaignId: 1597, projectName: "Harmony Valley", partner: "gosteward", label: "Lend through Steward", isDemo: true, path: "/project/c1597-harmony-valley?campaign=1597#money" })],
          realCampaignCount: 1,
        })}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Things" }));
    fireEvent.click(screen.getByRole("button", { name: "Money" }));
    expect(screen.getByRole("button", { name: "Money" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Things" })).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByRole("heading", { name: "Ways to put money in" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Tractor" })).toBeNull();
    expect(screen.queryByRole("link", { name: /Offer|Apply/ })).toBeNull();
    const real = screen.getByRole("link", { name: "Hill Farm: Give through Ma Earth" });
    expect(real).toHaveAttribute("href", "/project/41-hill-farm?campaign=12#money");
    const example = screen.getByRole("link", { name: "Harmony Valley: Lend through Steward" });
    expect(within(example.closest("li")!).getByText("Example route")).toBeInTheDocument();

    rerender(<NeedsTab data={result({ needs: [tractor], realCampaignCount: 1 })} />);
    expect(screen.getByText("No project has a money route yet.")).toBeInTheDocument();
  });

  it("empty state: filters that match nothing", () => {
    render(<NeedsTab data={result({ needs: [tractor], examples: [exampleChipper], realCampaignCount: 1 })} />);
    fireEvent.click(screen.getByRole("button", { name: "Know-how" }));
    expect(
      screen.getByText("Nothing open matches that right now. Clear a filter, or add up what you can bring in the Crowd Pooling Tool."),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open the Crowd Pooling Tool" })).toHaveAttribute("href", "/crowd-pooling");
    fireEvent.click(screen.getByRole("button", { name: "Clear filters" }));
    expect(titles()).toEqual(["Tractor", "Example needs", "Wood chipper (loan)"]);
    expect(screen.getByRole("button", { name: "Know-how" })).toHaveAttribute("aria-pressed", "false");
  });

  it("empty state: only examples, before Season 2 crowdpooling", () => {
    render(<NeedsTab data={result({ examples: [exampleChipper] })} notifyForm={<form aria-label="Get notified" />} />);
    expect(screen.getByText("These are example campaigns. Real needs open when Season 2 starts crowdpooling.")).toBeInTheDocument();
    expect(screen.getByRole("form", { name: "Get notified" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Add up what you can bring" })).toHaveAttribute("href", "/crowd-pooling");
    expect(screen.getByRole("heading", { name: "Example needs" })).toBeInTheDocument();
  });

  it("empty state: nothing at all", () => {
    render(<NeedsTab data={result()} notifyForm={<form aria-label="Get notified" />} />);
    expect(screen.getByText("No campaigns are open yet. Real needs open when Season 2 starts crowdpooling.")).toBeInTheDocument();
    expect(screen.getByRole("form", { name: "Get notified" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Example needs" })).toBeNull();
  });

  it("says so when live campaigns have every need filled", () => {
    render(<NeedsTab data={result({ realCampaignCount: 3 })} />);
    expect(screen.getByText("Every need on the live campaigns is filled right now.")).toBeInTheDocument();
    expect(screen.queryByText(/No campaigns are open yet/)).toBeNull();
  });
});

describe("filtering helpers", () => {
  it("matchesPlace: none on matches all; on, null is left out and either counts for both", () => {
    expect(matchesPlace(null, [])).toBe(true);
    expect(matchesPlace(null, ["land"])).toBe(false);
    expect(matchesPlace("either", ["remote"])).toBe(true);
    expect(matchesPlace("either", ["land"])).toBe(true);
    expect(matchesPlace("land", ["remote"])).toBe(false);
    expect(matchesPlace("remote", ["land", "remote"])).toBe(true);
  });

  it("filterOpenNeeds never re-sorts", () => {
    const rows = [soilClass, tractor, bookkeeper, cook];
    expect(filterOpenNeeds(rows, EMPTY_FILTER).map((r) => r.needId)).toEqual([4, 1, 5, 2]);
    expect(filterOpenNeeds(rows, { ...EMPTY_FILTER, kinds: ["role", "knowhow"] }).map((r) => r.needId)).toEqual([4, 5, 2]);
  });

  it("needPlaceLine leaves the location off a remote need", () => {
    expect(needPlaceLine(soilClass)).toBe("Hill Farm · Remote");
    expect(needPlaceLine({ projectName: "Seeds &amp; Soil", location: null, place: null })).toBe("Seeds & Soil");
  });
});
