import { describe, expect, it } from "vitest";
import {
  EMPTY_LOI_ANSWER,
  LOI_FIELDS,
  formatLoiAnswers,
  groupLoiAnswers,
  loiFieldKeys,
} from "./loiFields";

describe("loiFieldKeys", () => {
  it("covers LOI applicant answer columns", () => {
    const keys = loiFieldKeys();
    for (const required of [
      "fullName",
      "email",
      "phone",
      "organization",
      "role",
      "pledgeAmount",
      "investorType",
      "investmentTimeline",
      "geographicPreference",
      "sectorInterests",
      "motivations",
      "questionsForTeam",
      "additionalNotes",
      "referralSource",
    ]) {
      expect(keys).toContain(required);
    }
    expect(new Set(keys).size).toBe(keys.length);
  });
});

describe("formatLoiAnswers", () => {
  it("shows currency/enums and — for empty optionals", () => {
    const rows = formatLoiAnswers({
      fullName: "Ada",
      email: "ada@example.com",
      pledgeAmount: 250000,
      investorType: "family_office",
      investmentTimeline: "3_months",
    });
    expect(rows).toHaveLength(LOI_FIELDS.length);
    const byKey = Object.fromEntries(rows.map((r) => [r.key, r]));
    expect(byKey.pledgeAmount.displayValue).toBe("$250,000");
    expect(byKey.investorType.displayValue).toBe("Family Office");
    expect(byKey.investmentTimeline.displayValue).toBe("Within 3 months");
    expect(byKey.phone.displayValue).toBe(EMPTY_LOI_ANSWER);
    expect(byKey.motivations.isEmpty).toBe(true);
    expect(byKey.organization.displayValue).toBe(EMPTY_LOI_ANSWER);
  });

  it("formats sector interests from JSON or bare text", () => {
    const jsonRows = formatLoiAnswers({
      sectorInterests: JSON.stringify(["agroforestry", "housing"]),
    });
    expect(Object.fromEntries(jsonRows.map((r) => [r.key, r])).sectorInterests.displayValue).toBe(
      "agroforestry, housing",
    );
    const bare = formatLoiAnswers({ sectorInterests: "water, soil" });
    expect(Object.fromEntries(bare.map((r) => [r.key, r])).sectorInterests.displayValue).toBe(
      "water, soil",
    );
  });
});

describe("groupLoiAnswers", () => {
  it("groups in section order including empty fields", () => {
    const groups = groupLoiAnswers(formatLoiAnswers({ fullName: "X" }));
    expect(groups.map((g) => g.section)).toEqual([
      "Contact",
      "Investment details",
      "Preferences",
      "Additional information",
    ]);
  });
});
