import { describe, expect, it } from "vitest";
import {
  audienceChoiceLabel,
  audienceChoiceValue,
  audienceFromChoice,
  choiceFromStoredAudience,
  excludeOfferedOf,
  filterNewsletterAudience,
  listAudienceGroups,
  listChoiceCount,
  newsletterAudienceCsv,
  parseAudienceChoiceValue,
  withExcludeOffered,
  type AudienceChoice,
  type ListAudienceCounts,
  type NewsletterAudienceRow,
} from "./outboundAudience";
import { OUTBOUND_DIGEST } from "@shared/crowdpoolCopy";

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

  it("marks a campaign that closed without completing", () => {
    const groups = listAudienceGroups({ ...counts, campaigns: [{ id: 31, title: "Low Farm", isDemo: false, status: "closed", count: 3 }] });
    expect(groups[0].options[0].label).toBe("Email followers: Low Farm (closed)");
  });
});

// Build spec 2026-09-27, section 12.4: the season digest for email-only followers.
describe("the season digest in the Outbound picker", () => {
  const withDigests: ListAudienceCounts = {
    ...counts,
    seasonDigests: [
      { seasonNumber: 2, count: 41, countExcluding: 30 },
      { seasonNumber: 3, count: 7, countExcluding: 7 },
    ],
  };
  const digest = (seasonNumber: number, excludeOffered: boolean): AudienceChoice =>
    ({ kind: "list", list: { kind: "season_digest", seasonNumber, excludeOffered } });

  it("has its own group, last, with the count in each label following the checkbox (on by default)", () => {
    const groups = listAudienceGroups(withDigests);
    const group = groups.at(-1)!;
    expect(group.label).toBe(OUTBOUND_DIGEST.group);
    expect(group.options).toEqual([
      { value: "list:season_digest:2", label: "Season 2: email followers and the waitlist (30)", count: null },
      { value: "list:season_digest:3", label: "Season 3: email followers and the waitlist (7)", count: null },
    ]);
    // Unticked, the labels count everyone.
    const off = listAudienceGroups(withDigests, digest(2, false)).at(-1)!;
    expect(off.options[0].label).toBe("Season 2: email followers and the waitlist (41)");
  });

  it("the Select value carries the season, and the checkbox state comes from beside it", () => {
    expect(audienceChoiceValue(digest(2, true))).toBe("list:season_digest:2");
    expect(audienceChoiceValue(digest(2, false))).toBe("list:season_digest:2");
    expect(parseAudienceChoiceValue("list:season_digest:2")).toEqual(digest(2, true));
    expect(parseAudienceChoiceValue("list:season_digest:2", { excludeOffered: false })).toEqual(digest(2, false));
    expect(parseAudienceChoiceValue("list:season_digest:0")).toBeNull();
    expect(excludeOfferedOf(digest(3, false))).toBe(false);
    expect(excludeOfferedOf({ kind: "newsletter", source: "all" })).toBe(true);
    expect(excludeOfferedOf(null)).toBe(true);
  });

  it("the checkbox changes a digest choice and leaves every other choice alone", () => {
    expect(withExcludeOffered(digest(2, true), false)).toEqual(digest(2, false));
    const waitlist: AudienceChoice = { kind: "list", list: { kind: "waitlist", seasonNumber: 3 } };
    expect(withExcludeOffered(waitlist, false)).toBe(waitlist);
  });

  it("counts, labels and saves the list the server resolves", () => {
    expect(listChoiceCount(digest(2, true), withDigests)).toBe(30);
    expect(listChoiceCount(digest(2, false), withDigests)).toBe(41);
    expect(listChoiceCount(digest(9, true), withDigests)).toBe(0);
    expect(listChoiceCount(digest(2, true), counts)).toBe(0);
    expect(audienceChoiceLabel(digest(2, true), withDigests)).toBe(
      "Season 2 digest: email followers and the waitlist, leaving out people who already offered",
    );
    expect(audienceFromChoice(digest(2, false))).toEqual({
      sources: [], activeOnly: true, list: { kind: "season_digest", seasonNumber: 2, excludeOffered: false },
    });
    // Duplicate keeps the digest and its checkbox.
    const stored = { sources: [], activeOnly: true, list: { kind: "season_digest", seasonNumber: 2, excludeOffered: false } };
    expect(choiceFromStoredAudience(stored)).toEqual(digest(2, false));
  });

  it("keeps a duplicated digest for a season with no count row", () => {
    const groups = listAudienceGroups(withDigests, digest(1, true));
    expect(groups.at(-1)!.options.some((o) => o.value === "list:season_digest:1")).toBe(true);
  });
});
