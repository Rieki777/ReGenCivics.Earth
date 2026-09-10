import { describe, expect, it } from "vitest";
import {
  filterNewsletterAudience,
  newsletterAudienceCsv,
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
