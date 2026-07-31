/**
 * Governance fork relay (ADR-46): the pure decision layer, pinned.
 * The DB glue (enqueue/flush) rides these; a wrong answer here silently
 * loses or duplicates a village's constitutional change.
 */
import { describe, expect, it } from "vitest";
import {
  buildDeliveryPayload,
  extractGmMarker,
  retryEligible,
  terminalOutcomeFor,
} from "./lib/hypha-bridge/fork-relay";

describe("gm marker extraction", () => {
  it("matches the fork contract exactly — anywhere in the title, strict shape", () => {
    expect(extractGmMarker("[gm:gmp-123-ab] Widen the budget")).toBe("gmp-123-ab");
    expect(extractGmMarker("Re: [gm:gmp-9] edited by a voter")).toBe("gmp-9");
    expect(extractGmMarker("[GM:GMP-1] case-insensitive")).toBe("GMP-1");
  });

  it("never matches this repo's own [rc:] bridges or loose text", () => {
    expect(extractGmMarker("[rc:abc12345] a local bridge")).toBeNull();
    expect(extractGmMarker("gm:not-bracketed")).toBeNull();
    expect(extractGmMarker("[gm:has spaces]")).toBeNull();
    expect(extractGmMarker(undefined)).toBeNull();
  });
});

describe("terminal outcomes", () => {
  it("Executed is passed unless the chain says otherwise", () => {
    expect(terminalOutcomeFor({ type: "ProposalExecuted" })).toBe("passed");
    expect(terminalOutcomeFor({ type: "ProposalExecuted", passed: true })).toBe("passed");
    // executed-and-failed-quorum arrives as passed=false — a rejection.
    expect(terminalOutcomeFor({ type: "ProposalExecuted", passed: false })).toBe("failed");
    expect(terminalOutcomeFor({ type: "ProposalRejected" })).toBe("failed");
  });

  it("non-terminal events relay nothing", () => {
    expect(terminalOutcomeFor({ type: "ProposalCreated" })).toBeNull();
    expect(terminalOutcomeFor({ type: "Voted" })).toBeNull();
    expect(terminalOutcomeFor({ type: "Transfer" })).toBeNull();
  });
});

describe("retry backoff", () => {
  const now = new Date("2026-07-31T12:00:00Z");
  const ago = (ms: number) => new Date(now.getTime() - ms);

  it("first attempt is always eligible", () => {
    expect(retryEligible(0, null, now)).toBe(true);
  });

  it("doubles from five minutes and caps at six hours", () => {
    expect(retryEligible(1, ago(4 * 60 * 1000), now)).toBe(false);
    expect(retryEligible(1, ago(5 * 60 * 1000), now)).toBe(true);
    expect(retryEligible(2, ago(9 * 60 * 1000), now)).toBe(false);
    expect(retryEligible(2, ago(10 * 60 * 1000), now)).toBe(true);
    // Attempt 20 would be ~years uncapped; the cap keeps it at six hours.
    expect(retryEligible(20, ago(6 * 60 * 60 * 1000), now)).toBe(true);
    expect(retryEligible(20, ago(5 * 60 * 60 * 1000), now)).toBe(false);
  });
});

describe("the delivery payload", () => {
  it("is exactly what the fork receiver contract accepts", () => {
    const p = buildDeliveryPayload({
      marker: "gmp-1",
      outcome: "passed",
      txHash: "0xabc",
      hyphaProposalId: "777",
      basescanUrl: "https://basescan.org/tx/0xabc",
    });
    expect(p).toEqual({
      marker: "[gm:gmp-1]",
      outcome: "passed",
      txHash: "0xabc",
      hyphaProposalId: "777",
      url: "https://basescan.org/tx/0xabc",
    });
  });

  it("omits absent optionals rather than sending nulls", () => {
    const p = buildDeliveryPayload({ marker: "gmp-2", outcome: "failed", txHash: null, hyphaProposalId: null, basescanUrl: null });
    expect(p.txHash).toBeUndefined();
    expect(p.url).toBeUndefined();
    expect(p.outcome).toBe("failed");
  });
});
