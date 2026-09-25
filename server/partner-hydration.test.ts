/**
 * Tests for the partner-progress hydration job (Task 1).
 *
 * Two layers, no database and no network:
 *  1. The pure extractors (server/lib/partner-funding-parse) against saved HTML
 *     fixtures for both funders, including the degrade-to-null path a real page
 *     with no live tracker takes.
 *  2. hydrateCampaignPartnerLinks orchestration with injected link loading,
 *     writes, and fetch, proving a good page updates its cached numbers and that
 *     a fetch error, a timeout, a 404, or an unparseable page all leave the row
 *     untouched (never zeroed).
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";
import {
  parseMaEarthFunding,
  parseGoStewardFunding,
  extractPartnerFunding,
} from "./lib/partner-funding-parse";
import { MySqlDialect } from "drizzle-orm/mysql-core";
import {
  hydrateCampaignPartnerLinks,
  loadVerifiedPartnerLinks,
  VERIFIED_PARTNER_LINKS_SQL,
  type FetchLike,
} from "./routes/batchJobs";

const fixture = (name: string) =>
  readFileSync(resolve(__dirname, "./__fixtures__/partner", name), "utf8");

const maEarthJson = fixture("maearth-json.html");
const maEarthText = fixture("maearth-text.html");
const goStewardNumbers = fixture("gosteward-with-numbers.html");
const goStewardWidget = fixture("gosteward-funded-widget.html");
const goStewardNoNumbers = fixture("gosteward-no-live-numbers.html");

describe("partner funding extractors", () => {
  it("reads Ma Earth numbers from an embedded RSC JSON payload, deriving percent from goal", () => {
    // Fixture has amountRaised 12450 + fundingGoal 24900 (no explicit percent)
    // and supporterCount 184, only in the script payload.
    expect(parseMaEarthFunding(maEarthJson)).toEqual({
      raised: 12450,
      contributorCount: 184,
      percent: 50,
    });
  });

  it("reads Ma Earth numbers from visible page text when there is no JSON", () => {
    expect(parseMaEarthFunding(maEarthText)).toEqual({
      raised: 8200,
      contributorCount: 126,
      percent: 41,
    });
  });

  it("reads GoSteward numbers from visible loan-progress text", () => {
    expect(parseGoStewardFunding(goStewardNumbers)).toEqual({
      raised: 340000,
      contributorCount: 212,
      percent: 68,
    });
  });

  it("reads GoSteward's real 'N% of $AMOUNT Funded' widget, ignoring prose dollar figures", () => {
    // Grounded in the live green-acres-milling page: a fully-funded loan widget
    // plus a "$20 million will be raised in phases" sentence that must NOT be
    // read as a total. GoSteward loan pages carry no public backer count.
    expect(parseGoStewardFunding(goStewardWidget)).toEqual({
      raised: 11526615,
      contributorCount: null,
      percent: 100,
    });
  });

  it("does not invent numbers from narrative prose (degrades to null)", () => {
    // Real GoSteward copy mentions "$20 million will be raised" and
    // "$11,526,615 ... invested" in prose, with no live tracker. None of it is
    // a real total, so the parser must return nothing rather than guess.
    const parsed = parseGoStewardFunding(goStewardNoNumbers);
    expect(parsed).toEqual({ raised: null, contributorCount: null, percent: null });
    expect(extractPartnerFunding(goStewardNoNumbers, "gosteward")).toBeNull();
  });

  it("returns null for empty or numberless input", () => {
    expect(extractPartnerFunding("", "maearth")).toBeNull();
    expect(extractPartnerFunding(null, "maearth")).toBeNull();
    expect(extractPartnerFunding("<html><body>Coming soon.</body></html>", "gosteward")).toBeNull();
  });
});

describe("hydrateCampaignPartnerLinks", () => {
  const fakeResponse = (text: string, ok = true, status = 200) => ({
    ok,
    status,
    text: async () => text,
  });

  // Routes each link's URL to a canned outcome.
  const fetchImpl: FetchLike = async (url, init) => {
    if (url.includes("good-maearth")) return fakeResponse(maEarthJson);
    if (url.includes("empty")) return fakeResponse("<html><body>Launching soon.</body></html>");
    if (url.includes("throws")) throw new Error("network down");
    if (url.includes("not-found")) return fakeResponse("", false, 404);
    if (url.includes("slow")) {
      // Never resolves on its own; only rejects when the timeout aborts it.
      return new Promise((_resolve, reject) => {
        const sig = init?.signal;
        if (sig) sig.addEventListener("abort", () => reject(new Error("aborted")));
      });
    }
    return fakeResponse("");
  };

  const links = [
    { id: 1, partner: "maearth", url: "https://maearth.com/projects/good-maearth" },
    { id: 2, partner: "gosteward", url: "https://gosteward.com/projects/throws" },
    { id: 3, partner: "maearth", url: "https://maearth.com/projects/empty" },
    { id: 4, partner: "gosteward", url: "https://gosteward.com/projects/slow" },
    { id: 5, partner: "gosteward", url: "https://gosteward.com/projects/not-found" },
  ];

  it("updates only the links it could parse and leaves the rest untouched", async () => {
    const writes: Array<{ id: number; funding: any }> = [];

    const result = await hydrateCampaignPartnerLinks(null, {
      fetchImpl,
      timeoutMs: 25,
      concurrency: 5,
      loadLinks: async () => links,
      writeUpdate: async (_db, id, funding) => {
        writes.push({ id, funding });
      },
    });

    // Only the good Ma Earth link is written, with the parsed numbers.
    expect(writes).toEqual([
      { id: 1, funding: { raised: 12450, contributorCount: 184, percent: 50 } },
    ]);

    // 1 updated, 1 stale (empty page), 3 failed (throw, timeout, 404).
    expect(result).toEqual({ checked: 5, updated: 1, stale: 1, failed: 3 });
  });

  it("no-ops with no links", async () => {
    const result = await hydrateCampaignPartnerLinks(null, {
      fetchImpl,
      loadLinks: async () => [],
      writeUpdate: async () => {
        throw new Error("should not write");
      },
    });
    expect(result).toEqual({ checked: 0, updated: 0, stale: 0, failed: 0 });
  });
});

// ─── SSRF hardening (build spec 2026-09-25, section 7.3; OWASP A10) ─────────

describe("hydration fetches verified allowlisted routes only", () => {
  it("the loader selects verified rows only, never pending, rejected or example", async () => {
    const query = new MySqlDialect().sqlToQuery(VERIFIED_PARTNER_LINKS_SQL).sql.replace(/\s+/g, " ");
    expect(query).toContain("pl.status = 'verified'");
    expect(query).not.toMatch(/'pending'|'rejected'|'example'/);

    // The default loader runs exactly that query.
    let ran: unknown = null;
    const fakeDb = {
      execute: async (q: unknown) => {
        ran = q;
        return [[{ id: 7, partner: "maearth", url: "https://maearth.com/projects/x" }]];
      },
    };
    expect(await loadVerifiedPartnerLinks(fakeDb)).toEqual([
      { id: 7, partner: "maearth", url: "https://maearth.com/projects/x" },
    ]);
    expect(ran).toBe(VERIFIED_PARTNER_LINKS_SQL);
  });

  const redirectTo = (location: string | null, status = 302) => ({
    ok: false,
    status,
    text: async () => "",
    headers: { get: (name: string) => (name.toLowerCase() === "location" ? location : null) },
  });
  const page = (text: string) => ({ ok: true, status: 200, text: async () => text, headers: { get: () => null } });

  async function runOne(url: string, partner: string, fetchImpl: FetchLike) {
    const writes: number[] = [];
    const result = await hydrateCampaignPartnerLinks(null, {
      fetchImpl,
      timeoutMs: 200,
      loadLinks: async () => [{ id: 42, partner, url }],
      writeUpdate: async (_db, id) => {
        writes.push(id);
      },
    });
    return { result, writes };
  }

  it("asks for manual redirects", async () => {
    const inits: any[] = [];
    await runOne("https://maearth.com/projects/good", "maearth", async (_u, init) => {
      inits.push(init);
      return page(maEarthJson);
    });
    expect(inits).toHaveLength(1);
    expect(inits[0].redirect).toBe("manual");
  });

  it("an off-host 3xx fails and the second URL is never fetched", async () => {
    for (const location of [
      "https://evil.test/projects/good",
      "http://maearth.com/projects/good",
      "https://169.254.169.254/latest/meta-data",
      "https://gosteward.com/projects/good",
      null,
    ]) {
      const fetched: string[] = [];
      const { result, writes } = await runOne("https://maearth.com/projects/good", "maearth", async (u) => {
        fetched.push(u);
        return fetched.length === 1 ? redirectTo(location) : page(maEarthJson);
      });
      expect({ location, fetched, result, writes }).toEqual({
        location,
        fetched: ["https://maearth.com/projects/good"],
        result: { checked: 1, updated: 0, stale: 0, failed: 1 },
        writes: [],
      });
    }
  });

  it("an on-host 3xx follows once", async () => {
    const fetched: string[] = [];
    const { result, writes } = await runOne("https://maearth.com/projects/old", "maearth", async (u) => {
      fetched.push(u);
      return fetched.length === 1 ? redirectTo("/projects/new", 301) : page(maEarthJson);
    });
    expect(fetched).toEqual(["https://maearth.com/projects/old", "https://maearth.com/projects/new"]);
    expect(result).toEqual({ checked: 1, updated: 1, stale: 0, failed: 0 });
    expect(writes).toEqual([42]);
  });

  it("a second redirect fails: one hop only", async () => {
    const fetched: string[] = [];
    const { result } = await runOne("https://maearth.com/projects/a", "maearth", async (u) => {
      fetched.push(u);
      return fetched.length === 1
        ? redirectTo("https://www.maearth.com/projects/b")
        : redirectTo("https://www.maearth.com/projects/c");
    });
    expect(fetched).toHaveLength(2);
    expect(result).toEqual({ checked: 1, updated: 0, stale: 0, failed: 1 });
  });

  it("re-validates the stored URL and never fetches one off the allowlist", async () => {
    for (const [url, partner] of [
      ["http://maearth.com/projects/x", "maearth"],
      ["https://evil.test/projects/x", "maearth"],
      ["https://maearth.com/projects/x", "gosteward"],
      ["https://127.0.0.1/projects/x", "gosteward"],
      ["https://maearth.com/projects/x", "grant"],
    ] as const) {
      const fetched: string[] = [];
      const { result } = await runOne(url, partner, async (u) => {
        fetched.push(u);
        return page(maEarthJson);
      });
      expect({ url, partner, fetched, failed: result.failed }).toEqual({ url, partner, fetched: [], failed: 1 });
    }
  });

  it("logs the link id, never the URL", async () => {
    const lines: string[] = [];
    const warn = console.warn;
    console.warn = (...args: unknown[]) => {
      lines.push(args.map(String).join(" "));
    };
    try {
      await hydrateCampaignPartnerLinks(null, {
        fetchImpl: async () => page(maEarthJson),
        loadLinks: async () => [{ id: 9, partner: "maearth", url: "https://maearth.com/projects/secret-slug" }],
        writeUpdate: async () => {
          throw new Error("disk full");
        },
      });
    } finally {
      console.warn = warn;
    }
    expect(lines.join("\n")).toContain("link 9");
    expect(lines.join("\n")).not.toContain("secret-slug");
  });
});
