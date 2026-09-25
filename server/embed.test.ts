/**
 * The embed pages over real HTTP, with hostile values in every input.
 *
 * The badge routes take ?name=, ?player= and ?org= straight from the link, and
 * the campaign widget prints a steward-written title and location. Until
 * 2026-09-25 all of them went into the HTML unescaped, so a crafted
 * regencivics.earth link rendered whatever markup it carried. What matters is
 * the bytes the page sends, so that is what this asserts.
 */
import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import express from "express";
import type { Server } from "node:http";

const HOSTILE_TITLE = `<img src=x onerror="alert(1)">Hill Farm`;
const HOSTILE_PLACE = `</div><meta http-equiv="refresh" content="0;url=https://evil.example">`;

vi.mock("./db", () => ({
  // The widget reads the same progress inputs as every other surface.
  getCampaignProgressInputs: async (ids: number[]) =>
    new Map(ids.map((id) => [id, {
      items: [
        { id: 1, kind: "item", estimatedValue: 600, quantityWanted: 1, equipmentName: "Tractor" },
        { id: 2, kind: "role", capacityUnit: "count", estimatedValue: 400, quantityWanted: 1, roleTitle: "Cook" },
      ],
      rows: [{ campaignItemId: 1, status: "accepted", contributionType: "equipment", offerMode: "give", quantity: 1, value: 600, financialValue: 600, count: 1 }],
      lends: [],
      routes: [],
    }])),
  getDb: async () => ({
    select: () => ({
      from: () => ({
        where: () => ({
          limit: async () => [
            { id: 7, applicationId: null, projectName: null, status: "active", isDemo: 0, currency: "USD", startedAt: new Date("2026-09-01"), durationDays: 90, title: HOSTILE_TITLE, location: HOSTILE_PLACE, financialTarget: 1000, pledgedTotal: 10 },
          ],
        }),
      }),
    }),
  }),
}));

const { registerEmbedRoutes, queryText } = await import("./routes/embed");

let server: Server;
let base: string;

beforeAll(async () => {
  const app = express();
  registerEmbedRoutes(app);
  await new Promise<void>((done) => {
    server = app.listen(0, "127.0.0.1", () => done());
  });
  const addr = server.address();
  base = `http://127.0.0.1:${typeof addr === "object" && addr ? addr.port : 0}`;
});

afterAll(async () => {
  if (server) await new Promise<void>((done) => server.close(() => done()));
});

const page = async (path: string) => (await fetch(`${base}${path}`)).text();

/** No tag the attacker wrote survives as a tag. (Escaped, "onerror=" is plain text.) */
function expectNoInjectedMarkup(html: string) {
  expect(html).not.toMatch(/<script/i);
  expect(html).not.toMatch(/<meta http-equiv/i);
  expect(html).not.toMatch(/<img/i);
  expect(html).not.toMatch(/<form/i);
  expect(html).not.toMatch(/<[a-z]+[^>]*\sonerror=/i);
}

describe("embed pages escape every value they print", () => {
  it("alliance badge: ?org= is escaped", async () => {
    const html = await page(`/embed/badge/alliance?org=${encodeURIComponent(`<script>alert(1)</script><form action="https://evil.example">`)}`);
    expectNoInjectedMarkup(html);
    expect(html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
  });

  it("quest badge: ?name= and ?player= are escaped", async () => {
    const html = await page(
      `/embed/badge/quest/3?name=${encodeURIComponent(`<meta http-equiv="refresh" content="0;url=https://evil.example">`)}&player=${encodeURIComponent(`<img src=x onerror=alert(1)>`)}`,
    );
    expectNoInjectedMarkup(html);
    expect(html).toContain("&lt;meta http-equiv=&quot;refresh&quot;");
    expect(html).toContain("&lt;img src=x onerror=alert(1)&gt;");
  });

  it("quest badge: the route param in the default name is escaped", async () => {
    const html = await page(`/embed/badge/quest/${encodeURIComponent("<b>x</b>")}`);
    expect(html).not.toContain("<b>x</b>");
  });

  it("campaign widget: a steward-written title and location are escaped, in the body and the <title>", async () => {
    const html = await page("/embed/campaign/7");
    expectNoInjectedMarkup(html);
    expect(html).toContain("<title>&lt;img src=x onerror=&quot;alert(1)&quot;&gt;Hill Farm - ReGen Civics</title>");
    expect(html).toContain("&lt;/div&gt;&lt;meta http-equiv=&quot;refresh&quot;");
  });

  it("campaign widget: the two-line reading, one link to the project page, none of the old words", async () => {
    const html = await page("/embed/campaign/7");
    const inKind = html.indexOf("In-kind: 1 of 2 needs met");
    const money = html.indexOf("Money: $0 of $1,000");
    expect(inKind).toBeGreaterThan(-1);
    expect(money).toBeGreaterThan(inKind);
    expect(html).toContain('aria-valuetext="In-kind: 1 of 2 needs met"');
    expect(html).toContain(`href="https://regencivics.earth/project/c7-`);
    expect(html).toContain("?campaign=7");
    expect(html).toContain("See what's needed");
    expect(html).not.toMatch(/funded|Support This Project/i);
  });

  it("defaults still read plainly", async () => {
    expect(await page("/embed/badge/alliance")).toContain(">Alliance Partner</div>");
    expect(await page("/embed/badge/quest/2")).toContain("Quest 2");
  });
});

describe("queryText", () => {
  it("caps length, trims, falls back on empty or non-string values", () => {
    expect(queryText("a".repeat(500), "x")).toHaveLength(80);
    expect(queryText("  Hill Farm  ", "x")).toBe("Hill Farm");
    expect(queryText("", "Alliance Partner")).toBe("Alliance Partner");
    expect(queryText(["a", "b"], "Fallback")).toBe("Fallback");
    expect(queryText(undefined, "<b>")).toBe("&lt;b&gt;");
  });
});
