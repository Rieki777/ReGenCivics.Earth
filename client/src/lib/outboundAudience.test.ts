import { describe, expect, it } from "vitest";
import {
  audienceChoiceLabel,
  audienceChoiceValue,
  audienceFromChoice,
  choiceFromStoredAudience,
  filterNewsletterAudience,
  listAudienceGroups,
  listChoiceCount,
  newsletterAudienceCsv,
  parseAudienceChoiceValue,
  type AudienceChoice,
  type ListAudienceCounts,
  type NewsletterAudienceRow,
} from "./outboundAudience";

const rows: NewsletterAudienceRow[] = [
  { id: 1, email: "active@example.com", name: "Ada", source: "exit_intent", isActive: 1, createdAt: "2026-08-01T00:00:00.000Z" },
  { id: 2, email: "pending@example.com", name: "Bea", source: "footer", isActive: 0, createdAt: "2026-08-02T00:00:00.000Z" },
  { id: 3, email: "home@example.com", name: null, source: "homepage", isActive: 1, createdAt: "2026-08-03T00:00:00.000Z" },
];

describe("filterNewsletterAudience", () => {
  it("defaults to active subscribers when status is active", () => {
    const filtered = filterNewsletterAudience(rows, { status: "active", source: "all" });
    expect(filtered.map((r) => r.email)).toEqual(["active@example.com", "home@example.com"]);
  });

  it("filters by signup source", () => {
    const filtered = filterNewsletterAudience(rows, { status: "all", source: "exit_intent" });
    expect(filtered).toHaveLength(1);
    expect(filtered[0].email).toBe("active@example.com");
  });

  it("can show pending (inactive) rows only", () => {
    const filtered = filterNewsletterAudience(rows, { status: "pending", source: "all" });
    expect(filtered.map((r) => r.email)).toEqual(["pending@example.com"]);
  });
});

describe("newsletterAudienceCsv", () => {
  it("includes isActive and source columns", () => {
    const csv = newsletterAudienceCsv(rows.slice(0, 1));
    const [header, line] = csv.split("\n");
    expect(header).toBe("Email,Name,Source,Active,Subscribed Date");
    expect(line.startsWith("active@example.com,Ada,exit_intent,yes,")).toBe(true);
  });
});

const counts: ListAudienceCounts = {
  campaigns: [
    { id: 12, title: "Harmony Valley", isDemo: true, status: "active", count: 4 },
    { id: 30, title: "Hill Farm", isDemo: false, status: "cancelled", count: 2 },
  ],
  allCampaigns: 5,
  waitlists: [{ seasonNumber: 3, count: 7 }],
};

describe("Outbound audience picker", () => {
  const choices: AudienceChoice[] = [
    { kind: "newsletter", source: "all" },
    { kind: "newsletter", source: "homepage" },
    { kind: "list", list: { kind: "campaign", campaignId: 12 } },
    { kind: "list", list: { kind: "all_campaigns" } },
    { kind: "list", list: { kind: "waitlist", seasonNumber: 3 } },
  ];

  it("round-trips every choice through its Select value", () => {
    for (const c of choices) {
      expect(parseAudienceChoiceValue(audienceChoiceValue(c))).toEqual(c);
    }
    expect(parseAudienceChoiceValue("nl:nope")).toBeNull();
    expect(parseAudienceChoiceValue("list:campaign:0")).toBeNull();
    expect(parseAudienceChoiceValue("list:campaign:abc")).toBeNull();
  });

  it("a list replaces the newsletter sources in the saved audience", () => {
    expect(audienceFromChoice({ kind: "newsletter", source: "all" })).toEqual({ sources: [], activeOnly: true });
    expect(audienceFromChoice({ kind: "newsletter", source: "footer" })).toEqual({ sources: ["footer"], activeOnly: true });
    expect(audienceFromChoice({ kind: "list", list: { kind: "campaign", campaignId: 12 } }))
      .toEqual({ sources: [], activeOnly: true, list: { kind: "campaign", campaignId: 12 } });
  });

  it("Duplicate keeps a list and never widens to all subscribers", () => {
    const stored = { sources: [], activeOnly: true, list: { kind: "waitlist", seasonNumber: 3 } };
    expect(choiceFromStoredAudience(stored)).toEqual({ kind: "list", list: { kind: "waitlist", seasonNumber: 3 } });
    expect(choiceFromStoredAudience({ sources: ["footer"], activeOnly: true })).toEqual({ kind: "newsletter", source: "footer" });
    expect(choiceFromStoredAudience({ sources: [], activeOnly: true })).toEqual({ kind: "newsletter", source: "all" });
  });

  it("labels and counts come from listAudiences", () => {
    expect(audienceChoiceLabel({ kind: "list", list: { kind: "campaign", campaignId: 12 } }, counts)).toBe("Email followers of Harmony Valley");
    expect(audienceChoiceLabel({ kind: "list", list: { kind: "all_campaigns" } }, counts)).toBe("Everyone following a campaign by email");
    expect(audienceChoiceLabel({ kind: "list", list: { kind: "waitlist", seasonNumber: 3 } }, counts)).toBe("Crowdpool waitlist, Season 3");
    expect(audienceChoiceLabel({ kind: "newsletter", source: "all" }, counts)).toBe("active subscribers");
    expect(listChoiceCount({ kind: "list", list: { kind: "campaign", campaignId: 30 } }, counts)).toBe(2);
    expect(listChoiceCount({ kind: "list", list: { kind: "all_campaigns" } }, counts)).toBe(5);
    expect(listChoiceCount({ kind: "list", list: { kind: "waitlist", seasonNumber: 3 } }, counts)).toBe(7);
    expect(listChoiceCount({ kind: "newsletter", source: "all" }, counts)).toBeNull();
  });

  it("groups campaign followers, all campaigns, then waitlists, marking examples and cancelled", () => {
    const groups = listAudienceGroups(counts);
    expect(groups.map((g) => g.label)).toEqual(["Campaign email followers", "All campaigns", "Crowdpool waitlist"]);
    expect(groups[0].options.map((o) => o.label)).toEqual([
      "Email followers: Harmony Valley (Example)",
      "Email followers: Hill Farm (cancelled)",
    ]);
  });

  it("keeps a duplicated list visible even when it has no count row", () => {
    const keep: AudienceChoice = { kind: "list", list: { kind: "campaign", campaignId: 99 } };
    const groups = listAudienceGroups(counts, keep);
    expect(groups[0].options.some((o) => o.value === "list:campaign:99")).toBe(true);
  });
});
