import { describe, expect, it } from "vitest";
import {
  adminListPageToApiPage,
  buildSeedsClaimSubmitInput,
  formatClaimUsd,
  parseEvidenceUrls,
} from "./seedsClaimsUi";

const formBase = {
  seedsAccount: "aliceaccount",
  totalUsd: 1200,
  adjustedUsd: 1000,
  spentAmount: 200,
  baseWalletAddress: "0x1111111111111111111111111111111111111111",
  email: "alice@example.com",
  disputeExplanation: "",
  disputeEvidence: [] as { name: string; url: string }[],
  isOnDisputePath: false,
};

describe("adminListPageToApiPage", () => {
  it("maps the UI's page 1 onto API offset page 0 so the first claims are not skipped", () => {
    expect(adminListPageToApiPage(1)).toBe(0);
    expect(adminListPageToApiPage(2)).toBe(1);
    expect(adminListPageToApiPage(0)).toBe(0);
    expect(adminListPageToApiPage(-4)).toBe(0);
  });
});

describe("buildSeedsClaimSubmitInput", () => {
  it("sends spent and claimed amounts from the found-account path", () => {
    const payload = buildSeedsClaimSubmitInput(formBase, 10);
    expect(payload.spentUsdAmount).toBe(200);
    expect(payload.claimedUsdAmount).toBe(1000);
    expect(payload.originalUsdTotal).toBe(1200);
    expect(payload.isDispute).toBe(false);
    expect(payload.regenAmount).toBe(10000);
    expect(payload.email).toBe("alice@example.com");
  });

  it("maps the dispute 'USD Amount Claiming' field onto claimedUsdAmount", () => {
    const payload = buildSeedsClaimSubmitInput(
      {
        ...formBase,
        totalUsd: 0,
        adjustedUsd: 0,
        spentAmount: 350,
        isOnDisputePath: true,
        disputeExplanation: "My account was renamed.",
        disputeEvidence: [{ name: "shot.png", url: "https://assets.example/shot.png" }],
      },
      10,
    );
    expect(payload.isDispute).toBe(true);
    expect(payload.claimedUsdAmount).toBe(350);
    expect(payload.spentUsdAmount).toBe(0);
    expect(payload.disputeReason).toBe("My account was renamed.");
    expect(payload.evidenceUrls).toBe(JSON.stringify(["https://assets.example/shot.png"]));
    expect(payload.regenAmount).toBe(3500);
  });
});

describe("parseEvidenceUrls", () => {
  it("reads the JSON array of URL strings the form stores", () => {
    expect(parseEvidenceUrls(JSON.stringify(["https://a.example/1", "https://a.example/2"]))).toEqual([
      "https://a.example/1",
      "https://a.example/2",
    ]);
  });

  it("accepts a bare URL and an array of { url } objects", () => {
    expect(parseEvidenceUrls("https://a.example/bare")).toEqual(["https://a.example/bare"]);
    expect(parseEvidenceUrls(JSON.stringify([{ url: "https://a.example/obj" }]))).toEqual([
      "https://a.example/obj",
    ]);
  });

  it("returns empty for missing or blank values", () => {
    expect(parseEvidenceUrls(null)).toEqual([]);
    expect(parseEvidenceUrls("")).toEqual([]);
    expect(parseEvidenceUrls("not-json-and-not-a-url")).toEqual([]);
  });
});

describe("formatClaimUsd", () => {
  it("formats finite amounts and dashes missing ones", () => {
    expect(formatClaimUsd(10668.2)).toMatch(/10,668\.20/);
    expect(formatClaimUsd(undefined)).toBe("-");
  });
});
