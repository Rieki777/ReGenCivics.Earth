import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import {
  GalleryCard,
  showContributorCount,
  sortGallery,
  toGalleryCampaign,
  type GalleryCampaign,
  type GalleryRow,
} from "./GalleryCard";
import {
  computeCampaignProgress,
  summarizeProgress,
  type ProgressItem,
  type ProgressRoute,
  type ProgressRow,
} from "@shared/campaignProgress";

const TODAY = "2026-09-25";

const items: ProgressItem[] = [
  { id: 1, kind: "item", equipmentName: "Tractor", estimatedValue: 20000, quantityWanted: 1 },
  { id: 2, kind: "role", capacityUnit: "hours_per_week", roleTitle: "Farm manager", estimatedValue: 30000, quantityWanted: 20 },
  { id: 3, kind: "shift", roleTitle: "Planting day", estimatedValue: 1000, quantityWanted: 12 },
  { id: 4, kind: "item", equipmentName: "Seed drill", estimatedValue: 4000, quantityWanted: 1 },
];

function summary(opts: {
  isDemo?: number;
  status?: string;
  rows?: ProgressRow[];
  routes?: ProgressRoute[];
  financialTarget?: number;
  items?: ProgressItem[];
  currency?: string;
}) {
  const list = opts.items ?? items;
  const p = computeCampaignProgress({
    campaign: {
      status: opts.status ?? "active",
      isDemo: opts.isDemo ?? 0,
      financialTarget: opts.financialTarget ?? 10000,
      currency: opts.currency ?? "USD",
      startedAt: "2026-09-01T00:00:00Z",
      durationDays: 90,
    },
    items: list,
    rows: opts.rows ?? [
      { campaignItemId: 1, status: "accepted", contributionType: "equipment", offerMode: "give", quantity: 1, value: 20000, financialValue: 20000, count: 1 },
      { campaignItemId: 4, status: "pending", contributionType: "equipment", offerMode: "give", quantity: 1, value: 4000, financialValue: 4000, count: 1 },
    ],
    lends: [],
    routes: opts.routes ?? [],
  });
  return summarizeProgress(p, list, TODAY);
}

function campaign(over: Partial<GalleryCampaign> = {}): GalleryCampaign {
  return {
    id: 12,
    name: "Spring Build",
    projectName: "Hill Farm",
    location: "Asturias, Spain",
    description: "We are rebuilding the old barn. Then the orchard.",
    currency: "USD",
    image: "",
    tags: [],
    status: "active",
    isDemo: false,
    createdAtMs: Date.parse("2026-08-01T00:00:00Z"),
    path: "/project/41-hill-farm?campaign=12",
    progress: summary({}),
    ...over,
  };
}

afterEach(() => {
  vi.restoreAllMocks();
  Object.defineProperty(window.navigator, "share", { value: undefined, configurable: true });
});

describe("GalleryCard", () => {
  it("reads top to bottom: title, place, one line, Still open, in-kind, money, closes, one tag", () => {
    render(<GalleryCard campaign={campaign()} now={new Date("2026-09-25T00:00:00Z")} />);
    const card = screen.getByTestId("gallery-card");
    const text = card.textContent ?? "";
    const order = [
      "Spring Build",
      "Asturias, Spain",
      "We are rebuilding the old barn.",
      "Still open",
      "In-kind: 1 of 4 needs met",
      "Money: $0 of $10,000",
      "Closes 30 November 2026",
      "Open for offers",
    ].map((s) => {
      const at = text.indexOf(s);
      expect(at, s).toBeGreaterThanOrEqual(0);
      return at;
    });
    expect([...order].sort((a, b) => a - b)).toEqual(order);
    // One line of description, not the whole text.
    expect(text).not.toContain("Then the orchard.");
    // Up to three open needs, fewest offers first; the filled tractor is not among them.
    const still = within(card).getByText("Still open").parentElement!;
    expect(within(still).getAllByRole("listitem").map((li) => li.textContent)).toEqual([
      "Farm manager, 20 hrs a week",
      "Planting day, 12 places",
      "Seed drill",
    ]);
    // Exactly one state tag, and no percentage headline or countdown.
    expect(text).not.toMatch(/%|days left|Almost There/);
  });

  it("is one link to the project page, with Share as its own 44px button", () => {
    render(<GalleryCard campaign={campaign()} />);
    const card = screen.getByTestId("gallery-card");
    const links = within(card).getAllByRole("link");
    expect(links).toHaveLength(1);
    expect(links[0]).toHaveAttribute("href", "/project/41-hill-farm?campaign=12");
    expect(links[0]).toHaveAccessibleName("Spring Build");
    const share = within(card).getByRole("button", { name: "Share Spring Build" });
    expect(share.className).toContain("min-h-11");
    expect(share.className).toContain("min-w-11");
    // The share button sits above the stretched link, outside it.
    expect(links[0].contains(share)).toBe(false);
  });

  it("an example shows the Example tag and never a count, a close date or Almost complete", () => {
    // Nine of ten thousand in-kind confirmed and 900 of 1,000 money: almost complete on a real campaign.
    const near = {
      items: [
        { id: 1, kind: "item", equipmentName: "Barn roof", estimatedValue: 9000, quantityWanted: 1 },
        { id: 2, kind: "item", equipmentName: "Gutter", estimatedValue: 1000, quantityWanted: 1 },
      ] as ProgressItem[],
      rows: [
        { campaignItemId: 1, status: "accepted", contributionType: "equipment", offerMode: "give" as const, quantity: 1, value: 9000, financialValue: 9000, count: 1 },
      ],
      financialTarget: 1000,
      routes: [{ partner: "maearth" as const, status: "verified" as const, cachedRaised: 900, cachedCurrency: "USD", lastFetchedAt: null }],
    };
    const real = summary(near);
    expect(real.almostComplete).toBe(true);
    const { unmount } = render(<GalleryCard campaign={campaign({ progress: real })} />);
    expect(screen.getByText("Almost complete")).toBeInTheDocument();
    unmount();

    const example = summary({ ...near, isDemo: 1, routes: [{ ...near.routes[0], status: "example" as const }] });
    render(
      <GalleryCard
        campaign={campaign({ isDemo: true, progress: example, contributorsCount: 7 })}
        now={new Date("2026-11-25T00:00:00Z")}
      />,
    );
    const card = screen.getByTestId("gallery-card");
    expect(within(card).getByText("Example")).toBeInTheDocument();
    expect(within(card).queryByText("Almost complete")).toBeNull();
    expect(card.textContent).not.toMatch(/Closes|contributor/);
  });

  it("shows the contributor count only after the close or within 21 days of it", () => {
    const p = summary({});
    expect(p.endsAt).toBe("2026-11-30T00:00:00.000Z");
    expect(showContributorCount(p, 5, new Date("2026-10-01T00:00:00Z"))).toBe(false);
    expect(showContributorCount(p, 5, new Date("2026-11-15T00:00:00Z"))).toBe(true);
    expect(showContributorCount(p, 0, new Date("2026-11-15T00:00:00Z"))).toBe(false);
    expect(showContributorCount(p, undefined, new Date("2026-11-15T00:00:00Z"))).toBe(false);
    expect(showContributorCount(summary({ status: "completed" }), 5, new Date("2026-10-01T00:00:00Z"))).toBe(true);
    expect(showContributorCount(summary({ isDemo: 1 }), 5, new Date("2026-11-29T00:00:00Z"))).toBe(false);

    const { unmount } = render(<GalleryCard campaign={campaign({ contributorsCount: 5 })} now={new Date("2026-10-01T00:00:00Z")} />);
    expect(screen.queryByText("5 contributors")).toBeNull();
    unmount();
    render(<GalleryCard campaign={campaign({ contributorsCount: 1 })} now={new Date("2026-11-20T00:00:00Z")} />);
    expect(screen.getByText("1 contributor")).toBeInTheDocument();
  });

  it("hides Still open on a complete campaign", () => {
    render(<GalleryCard campaign={campaign({ status: "completed", progress: summary({ status: "completed" }) })} />);
    expect(screen.queryByText("Still open")).toBeNull();
    expect(screen.getByText("Complete")).toBeInTheDocument();
  });

  it("renders a campaign in a currency Intl does not know", () => {
    const p = summary({ currency: "USDC" });
    render(<GalleryCard campaign={campaign({ currency: "USDC", progress: p })} />);
    expect(screen.getByText("Money: 0 USDC of 10,000 USDC")).toBeInTheDocument();
  });

  it("shares the project page with the share line, through a dialog when the device has no share", () => {
    render(<GalleryCard campaign={campaign()} />);
    fireEvent.click(screen.getByRole("button", { name: "Share Spring Build" }));
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByRole("heading", { name: "Share Spring Build" })).toBeInTheDocument();
    expect(within(dialog).getByText("Hill Farm is crowdpooling on ReGen Civics. 3 needs still open. 1 role, 1 thing, 1 shift.")).toBeInTheDocument();
    const x = within(dialog).getByRole("link", { name: /Share on X/ });
    expect(decodeURIComponent(x.getAttribute("href")!)).toContain("https://regencivics.earth/project/41-hill-farm?campaign=12");
    expect(x).toHaveAttribute("rel", "noopener noreferrer");
    expect(within(dialog).getByRole("link", { name: /Share on WhatsApp/ })).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: "Copy link" })).toBeInTheDocument();
  });

  it("uses the device's own share sheet when there is one", () => {
    const share = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(window.navigator, "share", { value: share, configurable: true });
    render(<GalleryCard campaign={campaign({ isDemo: true, progress: summary({ isDemo: 1 }) })} />);
    fireEvent.click(screen.getByRole("button", { name: "Share Spring Build" }));
    expect(share).toHaveBeenCalledWith({
      title: "Spring Build",
      text: "Hill Farm is an example campaign on ReGen Civics.",
      url: "https://regencivics.earth/project/41-hill-farm?campaign=12",
    });
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});

describe("toGalleryCampaign", () => {
  it("links to the project page focused on the campaign and decodes stored entities", () => {
    const row: GalleryRow = {
      id: 77,
      title: "Seeds &amp; Soil Spring",
      projectName: "Seeds &amp; Soil",
      applicationId: 41,
      location: "Oaxaca &amp; Puebla",
      description: "A seed bank.",
      currency: null,
      coverImage: null,
      status: "active",
      isDemo: 1,
      createdAt: "2026-08-01T00:00:00Z",
      progress: summary({}),
    };
    const c = toGalleryCampaign(row);
    expect(c.path).toBe("/project/41-seeds-soil?campaign=77");
    expect(c.name).toBe("Seeds & Soil Spring");
    expect(c.projectName).toBe("Seeds & Soil");
    expect(c.location).toBe("Oaxaca & Puebla");
    expect(c.currency).toBe("USD");
    expect(c.isDemo).toBe(true);
    expect(c.path).not.toContain("/campaign/");
  });
});

describe("sortGallery", () => {
  const a = campaign({ id: 1, createdAtMs: 3, progress: summary({}) });
  const noneOffered = summary({ rows: [] });
  const b = campaign({ id: 2, createdAtMs: 2, progress: noneOffered });
  const allMet = summary({
    financialTarget: 0,
    rows: items.map((i) => ({
      campaignItemId: i.id, status: "accepted", contributionType: "equipment", offerMode: null,
      quantity: i.quantityWanted, value: i.estimatedValue, financialValue: i.estimatedValue, count: 1,
    })),
  });
  const c = campaign({ id: 3, createdAtMs: 1, progress: allMet });

  it("Needs a hand puts the most needs no one has offered on first, then the most open needs", () => {
    expect(sortGallery([a, b, c], "needs-hand").map((x) => x.id)).toEqual([2, 1, 3]);
    expect(sortGallery([a, b, c], "needs-hand", new Map([[3, 5], [1, 2]])).map((x) => x.id)).toEqual([3, 1, 2]);
  });

  it("Closest to complete reads the smaller half; Newest reads the creation time", () => {
    expect(sortGallery([a, b, c], "closest-to-complete").map((x) => x.id)).toEqual([3, 1, 2]);
    expect(sortGallery([c, b, a], "newest").map((x) => x.id)).toEqual([1, 2, 3]);
  });

  it("Closing soonest puts campaigns with no close date last", () => {
    const later = campaign({ id: 4, progress: { ...summary({}), endsAt: "2027-01-01T00:00:00.000Z" } });
    const none = campaign({ id: 5, progress: { ...summary({}), endsAt: null } });
    expect(sortGallery([none, later, a], "closing-soonest").map((x) => x.id)).toEqual([1, 4, 5]);
  });

  it("returns a new array and leaves the input alone", () => {
    const input = [a, b, c];
    const out = sortGallery(input, "newest");
    expect(out).not.toBe(input);
    expect(input.map((x) => x.id)).toEqual([1, 2, 3]);
  });
});
