/**
 * The letter of intent to the cooperative treasury (ADR-78): what loi.submit
 * accepts and what its confirmation email says.
 *
 * The letter came back on 2026-10-21 with an amount and no minimum. These pin
 * the rules that make it safe to put on a public page: any whole-dollar amount
 * above zero, consent that must be literally true, an accreditation answer
 * that is optional and never a gate, and an email built only from COOP's
 * sentences that passes the same retired-claim and G5 checks as the repo.
 */
import { describe, it, expect } from "vitest";
import { loiSubmitInput, loiConfirmationHtml } from "./routes/investors";
import { COOP } from "../shared/fund";
import { escapeHtml } from "../shared/htmlText";
import { LOI_MAX_PLEDGE_USD } from "../shared/loiFields";
// @ts-expect-error plain .mjs module, typed loosely on purpose
import { findRetired, findG5 } from "../scripts/check-fund-claims.mjs";

const VALID = {
  fullName: "Ada Lovelace",
  email: "ada@example.org",
  pledgeAmount: 5000,
  investorType: "individual",
  consent: true,
} as const;

describe("loi.submit input", () => {
  it("accepts the smallest valid letter and fills the defaults", () => {
    const parsed = loiSubmitInput.parse(VALID);
    expect(parsed.investmentTimeline).toBe("flexible");
    expect(parsed.capitalForms).toEqual([]);
    expect(parsed.accreditedStatus).toBeUndefined();
  });

  it("has no minimum: one dollar is a valid letter", () => {
    expect(loiSubmitInput.safeParse({ ...VALID, pledgeAmount: 1 }).success).toBe(true);
  });

  it("rejects zero, negative, fractional and oversized amounts", () => {
    for (const pledgeAmount of [0, -5, 10.5, LOI_MAX_PLEDGE_USD + 1]) {
      expect(loiSubmitInput.safeParse({ ...VALID, pledgeAmount }).success, String(pledgeAmount)).toBe(false);
    }
  });

  it("requires consent to be literally true", () => {
    expect(loiSubmitInput.safeParse({ ...VALID, consent: false }).success).toBe(false);
    const { consent: _omit, ...withoutConsent } = VALID;
    expect(loiSubmitInput.safeParse(withoutConsent).success).toBe(false);
  });

  it("lets a land project sign, and refuses a signer type it doesn't know", () => {
    expect(loiSubmitInput.safeParse({ ...VALID, investorType: "land_project" }).success).toBe(true);
    expect(loiSubmitInput.safeParse({ ...VALID, investorType: "whale" }).success).toBe(false);
  });

  it("takes the accreditation answer as optional, from a fixed list", () => {
    for (const accreditedStatus of ["yes", "no", "not_sure", "not_us"]) {
      expect(loiSubmitInput.safeParse({ ...VALID, accreditedStatus }).success, accreditedStatus).toBe(true);
    }
    expect(loiSubmitInput.safeParse({ ...VALID, accreditedStatus: "maybe" }).success).toBe(false);
  });

  it("only takes the nine forms of capital", () => {
    expect(loiSubmitInput.safeParse({ ...VALID, capitalForms: ["living", "social"] }).success).toBe(true);
    expect(loiSubmitInput.safeParse({ ...VALID, capitalForms: ["crypto"] }).success).toBe(false);
  });

  it("bounds every free-text field", () => {
    expect(loiSubmitInput.safeParse({ ...VALID, motivations: "x".repeat(4001) }).success).toBe(false);
    expect(loiSubmitInput.safeParse({ ...VALID, country: "x".repeat(121) }).success).toBe(false);
  });
});

describe("loi confirmation email", () => {
  const html = loiConfirmationHtml("Ada <script>", 250000);

  it("names the amount and says what a letter of intent means", () => {
    expect(html).toContain("$250,000");
    expect(html).toContain(escapeHtml(COOP.loiPromise));
    expect(html).toContain(escapeHtml(COOP.launch));
    expect(html).toContain(escapeHtml(COOP.notAnOffer));
  });

  it("escapes the name a stranger typed", () => {
    expect(html).not.toContain("<script>");
    expect(html).toContain("Ada &lt;script&gt;");
  });

  it("carries no retired claim and no G5 phrase", () => {
    expect(findRetired("loi_confirmation.html", html)).toEqual([]);
    expect(findG5("loi_confirmation.html", html)).toEqual([]);
  });
});
