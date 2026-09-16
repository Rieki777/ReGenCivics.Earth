import { describe, expect, it } from "vitest";
import {
  loadInvestorDraftFromStorage,
  stripInvestorAttestations,
} from "./investorFormDraft";

describe("stripInvestorAttestations", () => {
  it("removes accredited and risk disclosure flags but keeps contact fields", () => {
    const stripped = stripInvestorAttestations({
      fullName: "Ada Lovelace",
      email: "ada@example.com",
      isAccreditedInvestor: true,
      understandsRisks: true,
      hasReadDisclosures: true,
      organization: "Analytical Engines",
    });
    expect(stripped.fullName).toBe("Ada Lovelace");
    expect(stripped.email).toBe("ada@example.com");
    expect(stripped.organization).toBe("Analytical Engines");
    expect(stripped).not.toHaveProperty("isAccreditedInvestor");
    expect(stripped).not.toHaveProperty("understandsRisks");
    expect(stripped).not.toHaveProperty("hasReadDisclosures");
  });

  it("returns empty object for nullish input", () => {
    expect(stripInvestorAttestations(null)).toEqual({});
    expect(stripInvestorAttestations(undefined)).toEqual({});
  });
});

describe("loadInvestorDraftFromStorage", () => {
  it("never restores attestation checkboxes from a saved draft", () => {
    const raw = JSON.stringify({
      fullName: "Returning",
      email: "r@example.com",
      isAccreditedInvestor: true,
      understandsRisks: true,
      hasReadDisclosures: true,
    });
    const draft = loadInvestorDraftFromStorage(raw);
    expect(draft?.fullName).toBe("Returning");
    expect(draft).not.toHaveProperty("isAccreditedInvestor");
    expect(draft).not.toHaveProperty("understandsRisks");
    expect(draft).not.toHaveProperty("hasReadDisclosures");
  });

  it("returns null for corrupt or empty storage", () => {
    expect(loadInvestorDraftFromStorage(null)).toBeNull();
    expect(loadInvestorDraftFromStorage("")).toBeNull();
    expect(loadInvestorDraftFromStorage("{not-json")).toBeNull();
  });
});
