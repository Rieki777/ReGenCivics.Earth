/**
 * The cooperative interest form and the metrics table (funding engine Phase 0).
 *
 * The vitest env has no DATABASE_URL, so this covers what runs before the
 * database: input validation, the admin gate on every private procedure, the
 * closed-by-default public read, the confirmation email's escaping, and the
 * wiring between the 0275 migration's live-count rows and the code that
 * computes them.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import { interestConfirmationHtml, submitInterestInput } from "./routes/coop";
import { COMPUTED, formatMetricValue, publicMetrics } from "./funding/metrics";
import { COOP } from "@shared/fund";

function makeCtx(user: TrpcContext["user"] | null): TrpcContext {
  return {
    user,
    req: {
      protocol: "https",
      method: "POST",
      headers: { origin: "https://regencivics.earth", host: "regencivics.earth" },
      cookies: {},
      socket: { remoteAddress: "127.0.0.1" },
    } as unknown as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  } as TrpcContext;
}

const ADMIN = { id: 1, role: "admin" } as unknown as TrpcContext["user"];
const PLAYER = { id: 2, role: "user" } as unknown as TrpcContext["user"];

const VALID = {
  name: "Ana Rivera",
  email: "ana@example.org",
  kind: "land_project" as const,
  capitalForms: ["living", "social"],
  consent: true as const,
};

describe("coop interest: the form asks for no amounts and needs consent", () => {
  it("accepts a plain expression of interest", () => {
    expect(submitInterestInput.safeParse(VALID).success).toBe(true);
  });

  it("requires consent to be exactly true", () => {
    expect(submitInterestInput.safeParse({ ...VALID, consent: false }).success).toBe(false);
    const { consent: _drop, ...noConsent } = VALID;
    expect(submitInterestInput.safeParse(noConsent).success).toBe(false);
  });

  it("rejects an unknown kind and an unknown form of capital", () => {
    expect(submitInterestInput.safeParse({ ...VALID, kind: "investor" }).success).toBe(false);
    expect(submitInterestInput.safeParse({ ...VALID, capitalForms: ["equity"] }).success).toBe(false);
  });

  it("rejects a bad email and an oversized name", () => {
    expect(submitInterestInput.safeParse({ ...VALID, email: "not-an-email" }).success).toBe(false);
    expect(submitInterestInput.safeParse({ ...VALID, name: "x".repeat(161) }).success).toBe(false);
  });

  it("drops any amount a client tries to send, so none can be stored", () => {
    const parsed = submitInterestInput.parse({ ...VALID, pledgeAmount: 250000, amount: 1 });
    expect(parsed).not.toHaveProperty("pledgeAmount");
    expect(parsed).not.toHaveProperty("amount");
  });
});

describe("coop interest: admin procedures are admin-only", () => {
  it("rejects anonymous and non-admin callers", async () => {
    for (const user of [null, PLAYER]) {
      const caller = appRouter.createCaller(makeCtx(user));
      await expect(caller.coop.listInterest()).rejects.toThrow();
      await expect(caller.coop.interestStats()).rejects.toThrow();
      await expect(caller.coop.setInterestStatus({ id: 1, status: "contacted" })).rejects.toThrow();
    }
  });

  it("rejects an unknown status even for an admin", async () => {
    const caller = appRouter.createCaller(makeCtx(ADMIN));
    await expect(caller.coop.setInterestStatus({ id: 1, status: "invested" as never })).rejects.toThrow();
  });
});

describe("coop interest: the confirmation email", () => {
  it("escapes the submitted name", () => {
    const html = interestConfirmationHtml('<script>alert("x")</script>');
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("carries the promise and the one disclaimer", () => {
    const html = interestConfirmationHtml("Ana");
    expect(html).toContain("not a commitment and involves no money");
    expect(html).toContain("Nothing on this site is an offer");
    expect(html).toContain(COOP.name);
  });
});

describe("metrics: public reads are closed by default", () => {
  it("returns nothing when no database is configured", async () => {
    expect(await publicMetrics()).toEqual({});
  });

  it("serves the public read to anyone, and nothing else", async () => {
    const anon = appRouter.createCaller(makeCtx(null));
    expect(await anon.metrics.public()).toEqual({});
    await expect(anon.metrics.list()).rejects.toThrow();
    await expect(anon.metrics.refresh()).rejects.toThrow();
    await expect(anon.metrics.update({ id: 1, isPublic: true })).rejects.toThrow();
  });

  it("keeps live platform counts off the public API", async () => {
    const anon = appRouter.createCaller(makeCtx(null));
    await expect(anon.stats.getPublicStats()).rejects.toThrow();
  });
});

describe("metrics: formatting and wiring", () => {
  it("formats counts and dollars plainly", () => {
    expect(formatMetricValue(1234, "count")).toBe("1,234");
    expect(formatMetricValue(10000, "usd")).toBe("$10,000");
    expect(formatMetricValue(null, "count")).toBeNull();
    expect(formatMetricValue(Number.NaN, "count")).toBeNull();
  });

  it("has code for every live count the 0275 migration seeds", () => {
    const sql = readFileSync(path.resolve(__dirname, "..", "drizzle", "0275_funding_engine_foundations.sql"), "utf8");
    const seeded = new Set<string>();
    for (const line of sql.split(/\r?\n/)) {
      if (!line.startsWith("INSERT IGNORE INTO `metrics`")) continue;
      const values = line.slice(line.indexOf("VALUES"));
      const parts = values.split("', ");
      // (metricKey, label, definition, unit, computedFrom, sortOrder): computedFrom
      // is the fifth value, quoted, or NULL for a hand-entered row.
      const computedFrom = parts[4]?.split("'")[1];
      if (computedFrom) seeded.add(computedFrom);
    }
    expect(seeded.size).toBeGreaterThanOrEqual(6);
    for (const key of seeded) expect(COMPUTED, `no live count named ${key}`).toHaveProperty(key);
  });
});
