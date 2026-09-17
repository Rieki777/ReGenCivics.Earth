import { describe, expect, it } from "vitest";
import {
  EMPTY_INVESTOR_ANSWER,
  formatInvestorInquiryAnswers,
  investorInquiryFieldKeys,
} from "./investorInquiryFields";

describe("investorInquiryFieldKeys", () => {
  it("uses real schema keys (not legacy aliases motivation/experience/questions)", () => {
    const keys = investorInquiryFieldKeys();
    expect(keys).toContain("motivations");
    expect(keys).toContain("investmentExperience");
    expect(keys).toContain("questionsForTeam");
    expect(keys).toContain("investmentTimeline");
    expect(keys).toContain("newsletterOptIn");
    expect(keys).not.toContain("motivation");
    expect(keys).not.toContain("experience");
    expect(keys).not.toContain("questions");
    expect(keys).not.toContain("accreditedStatus");
    expect(keys).not.toContain("howHeard");
    expect(keys).not.toContain("timeline");
  });
});

describe("formatInvestorInquiryAnswers", () => {
  it("maps stored answers with human labels and — for empties", () => {
    const rows = formatInvestorInquiryAnswers({
      fullName: "Ada Lovelace",
      email: "ada@example.com",
      motivations: "Regenerate bioregions.",
      investmentExperience: "Impact fund LP.",
      questionsForTeam: "How is governance shared?",
      investmentRange: "1m_5m",
      investmentTimeline: "6_months",
      newsletterOptIn: 1,
    });
    const byKey = Object.fromEntries(rows.map((r) => [r.key, r]));
    expect(byKey.motivations.displayValue).toBe("Regenerate bioregions.");
    expect(byKey.investmentExperience.displayValue).toBe("Impact fund LP.");
    expect(byKey.questionsForTeam.displayValue).toBe("How is governance shared?");
    expect(byKey.investmentRange.displayValue).toBe("$1M – $5M");
    expect(byKey.investmentTimeline.displayValue).toBe("Within 6 months");
    expect(byKey.newsletterOptIn.displayValue).toBe("Yes");
    expect(byKey.phone.displayValue).toBe(EMPTY_INVESTOR_ANSWER);
    expect(byKey.impactGoals.isEmpty).toBe(true);
  });
});
