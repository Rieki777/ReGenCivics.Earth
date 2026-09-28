/**
 * No URL fragment reaches Sentry (security review 2026-09-28).
 *
 * Opening a second /offer#<token> link in a tab already on /offer is a
 * fragment change with no reload. Sentry's history instrumentation recorded
 * navigation breadcrumbs with the full URL, token included, and the next
 * captured error shipped them. The review reproduced it: breadcrumbs
 * [{from '/offer#TOKEN', to '/offer#TOKEN'}, {from '/offer#TOKEN', to
 * '/offer'}], and the envelope contained the token.
 *
 * The first block tests the scrub functions. The second runs the real
 * @sentry/react SDK with the exact options main.tsx spreads into
 * Sentry.init and a transport that only records, so nothing leaves the
 * machine, and checks the envelope it would send.
 */
import { afterEach, describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import * as Sentry from "@sentry/react";
import { scrubBreadcrumb, scrubEvent, sentryPrivacyOptions, stripFragment } from "./sentryScrub";

const TOKEN = "SECPROBE" + "x".repeat(35);

describe("the scrub", () => {
  it("drops a fragment and keeps the rest of the URL", () => {
    expect(stripFragment(`/offer#${TOKEN}`)).toBe("/offer");
    expect(stripFragment(`https://regencivics.earth/offer?x=1#${TOKEN}`)).toBe("https://regencivics.earth/offer?x=1");
    expect(stripFragment("/campaigns")).toBe("/campaigns");
    expect(stripFragment(42)).toBe(42);
  });

  it("scrubs navigation, fetch and xhr breadcrumbs, and the message", () => {
    const nav = scrubBreadcrumb({ category: "navigation", data: { from: `/offer#${TOKEN}`, to: `/offer#${TOKEN}` } });
    expect(nav.data).toEqual({ from: "/offer", to: "/offer" });
    const fetchCrumb = scrubBreadcrumb({ category: "fetch", data: { url: `/api/trpc/x#${TOKEN}`, method: "POST", status_code: 200 } });
    expect(fetchCrumb.data).toEqual({ url: "/api/trpc/x", method: "POST", status_code: 200 });
    const msg = scrubBreadcrumb({ category: "navigation", message: `Navigated to /offer#${TOKEN} from /campaigns` });
    expect(msg.message).toBe("Navigated to /offer from /campaigns");
    expect(JSON.stringify([nav, fetchCrumb, msg])).not.toContain(TOKEN);
  });

  it("scrubs an event's request URL, Referer, transaction, breadcrumbs and url tag", () => {
    const e = scrubEvent({
      request: { url: `https://regencivics.earth/offer#${TOKEN}`, headers: { Referer: `https://regencivics.earth/offer#${TOKEN}` } },
      transaction: `/offer#${TOKEN}`,
      breadcrumbs: [{ category: "navigation", data: { from: `/offer#${TOKEN}`, to: "/offer" } }],
      tags: { url: `/offer#${TOKEN}` },
    });
    expect(JSON.stringify(e)).not.toContain(TOKEN);
    expect(e.request!.url).toBe("https://regencivics.earth/offer");
  });
});

describe("the options main.tsx gives Sentry.init", () => {
  afterEach(async () => {
    await Sentry.getClient()?.close();
  });

  it("main.tsx spreads them into Sentry.init", () => {
    const main = readFileSync(resolve(__dirname, "../main.tsx"), "utf8");
    expect(main).toMatch(/Sentry\.init\(\{[\s\S]*\.\.\.scrub\.sentryPrivacyOptions\(\)[\s\S]*\}\)/);
  });

  it("a captured error after a same-tab /offer navigation carries no token", async () => {
    const sent: string[] = [];
    Sentry.init({
      dsn: "https://public@example.invalid/1",
      defaultIntegrations: false,
      integrations: [],
      transport: (options) =>
        Sentry.createTransport(options, async (request) => {
          sent.push(typeof request.body === "string" ? request.body : new TextDecoder().decode(request.body as Uint8Array));
          return { statusCode: 200 };
        }),
      ...sentryPrivacyOptions(),
    });
    // What the history instrumentation recorded in the review.
    Sentry.addBreadcrumb({ category: "navigation", data: { from: `/offer#${TOKEN}`, to: `/offer#${TOKEN}` } });
    Sentry.addBreadcrumb({ category: "navigation", data: { from: `/offer#${TOKEN}`, to: "/offer" } });
    Sentry.captureException(new Error("later error"));
    await Sentry.flush(2000);
    expect(sent.length).toBeGreaterThan(0);
    const envelope = sent.join("\n");
    expect(envelope).toContain("later error");
    expect(envelope).toContain('"from":"/offer"');
    expect(envelope).not.toContain(TOKEN);
  });
});
