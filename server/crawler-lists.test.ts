/**
 * /campaigns and /bounties for a non-executing agent.
 *
 * Both were empty shells until 2026-09-28. Both are built from rows rather
 * than written as prose, because a hand-written sentence about "active
 * campaigns" is wrong the week a campaign closes, and a stale listing sends
 * someone at something that is already over.
 *
 * The db module is mocked so the empty case and the populated case are both
 * deterministic, rather than depending on what happens to be open today.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

const rows = vi.hoisted(() => ({ campaigns: [] as any[], bounties: [] as any[], agreements: [] as any[] }));

vi.mock("./db", () => ({
  listCampaigns: async () => rows.campaigns,
  getOpenBountiesSnapshot: async () => rows.bounties,
  listCommunityAgreements: async () => rows.agreements,
}));

function items(jsonld: unknown) {
  const list = (jsonld as { itemListElement?: { item: Record<string, unknown> }[] })
    .itemListElement;
  return (list ?? []).map((l) => l.item);
}

beforeEach(() => {
  rows.campaigns = [];
  rows.bounties = [];
  rows.agreements = [];
  // Both builders cache for ten minutes, so each case needs fresh module state.
  vi.resetModules();
});

const campaigns = () =>
  import("./_core/crawler-content").then((m) => m.getCampaignsListContent());
const bounties = () =>
  import("./_core/crawler-content").then((m) => m.getBountiesListContent());
const guidelines = () =>
  import("./_core/crawler-content").then((m) => m.getGuidelinesContent());

describe("/campaigns", () => {
  it("lists what is open, with a link to each campaign", async () => {
    rows.campaigns = [
      {
        id: 7,
        title: "Cedar Ridge water systems",
        projectName: "Cedar Ridge",
        location: "Josephine County, Oregon",
        description: "Spring capture and storage for the market garden.",
        financialTarget: 40000,
        pledgedTotal: 12500,
        currency: "USD",
      },
    ];
    const c = await campaigns();
    expect(c!.bodyHtml).toContain("Cedar Ridge water systems");
    expect(c!.bodyHtml).toContain("/campaign/7");
    expect(c!.bodyHtml).toContain("1 land project campaign is open");
    expect(items(c!.jsonld)[0]["@type"]).toBe("Project");
  });

  it("states pledged only alongside the target", async () => {
    // A raised figure with nothing to compare it to reads as bigger or smaller
    // than it is, and an agent will repeat whichever number it finds.
    rows.campaigns = [
      { id: 1, title: "A", projectName: "A", financialTarget: 0, pledgedTotal: 9000, currency: "USD" },
    ];
    const c = await campaigns();
    expect(c!.bodyHtml).not.toContain("9,000");
  });

  it("says so plainly when nothing is open", async () => {
    const c = await campaigns();
    expect(c!.bodyHtml).toContain("No campaigns are open for contributions");
    expect(items(c!.jsonld)).toHaveLength(0);
  });

  it("escapes a campaign title", async () => {
    rows.campaigns = [{ id: 1, title: '</h3><script>x</script>', projectName: "p" }];
    const c = await campaigns();
    expect(c!.bodyHtml).not.toContain("<script>x</script>");
  });
});

describe("/bounties", () => {
  it("lists open bounties and says they need no relocation", async () => {
    rows.bounties = [
      { id: "b1", title: "Write the water-rights explainer", body: "Two pages, sourced.", tier: "steward" },
    ];
    const b = await bounties();
    expect(b!.bodyHtml).toContain("Write the water-rights explainer");
    expect(b!.bodyHtml).toContain("1 bounty is open");
    // The D funnel's whole point: the control's weakest incumbent answer was
    // "I can't move right now", and remote-doable work is the answer to it.
    expect(b!.bodyHtml).toContain("without relocating");
  });

  it("says so plainly when nothing is open", async () => {
    const b = await bounties();
    expect(b!.bodyHtml).toContain("No bounties are open right now");
    expect(items(b!.jsonld)).toHaveLength(0);
  });

  it("never leaks an internal id into the payload", async () => {
    // Directory reviews check for internal identifiers, and a bounty id is of
    // no use to a reader.
    rows.bounties = [{ id: "internal-uuid-9f3", title: "T", body: "B" }];
    const b = await bounties();
    expect(b!.bodyHtml).not.toContain("internal-uuid-9f3");
    expect(JSON.stringify(b!.jsonld)).not.toContain("internal-uuid-9f3");
  });
});

describe("/community/guidelines", () => {
  it("groups active agreements by category", async () => {
    rows.agreements = [
      { id: 1, title: "Honesty", description: "Share what you actually experienced.", category: "Forum Conduct" },
      { id: 2, title: "No spam", description: "No repeated low-effort posts.", category: "Moderation" },
    ];
    const g = await guidelines();
    expect(g!.bodyHtml).toContain("Forum Conduct");
    expect(g!.bodyHtml).toContain("Moderation");
    expect(g!.bodyHtml).toContain("Honesty");
    expect(g!.bodyHtml).toContain("2 agreements are active");
  });

  it("says the agreements evolve, because the page says so", async () => {
    // Built from rows rather than frozen prose for this reason: the community
    // proposes and votes on these, so a hardcoded copy would be a promise the
    // community did not make.
    rows.agreements = [{ id: 1, title: "A", description: "B", category: "C" }];
    const g = await guidelines();
    expect(g!.bodyHtml).toContain("evolve as the community does");
  });

  it("says so plainly when none are active", async () => {
    const g = await guidelines();
    expect(g!.bodyHtml).toContain("No agreements are active yet");
  });
});
