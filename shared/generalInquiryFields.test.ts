import { describe, expect, it } from "vitest";
import {
  EMPTY_INQUIRY_ANSWER,
  GENERAL_INQUIRY_FIELDS,
  formatGeneralInquiryAnswers,
  generalInquiryFieldKeys,
  parseInquiryJsonArray,
} from "./generalInquiryFields";

describe("generalInquiryFieldKeys", () => {
  it("covers general_inquiries answer columns (not legacy message/formData)", () => {
    const keys = generalInquiryFieldKeys();
    for (const required of [
      "fullName",
      "email",
      "pathType",
      "organizationUrl",
      "partnershipDescription",
      "allianceSupportDescription",
      "landProjects",
      "allianceOrganizations",
      "roleInterest",
      "capitalTypes",
      "valueContribution",
      "whyIdealFit",
      "additionalNotes",
      "newsletterOptIn",
    ]) {
      expect(keys).toContain(required);
    }
    expect(keys).not.toContain("message");
    expect(keys).not.toContain("formData");
    expect(keys).not.toContain("location");
    expect(new Set(keys).size).toBe(keys.length);
  });
});

describe("parseInquiryJsonArray", () => {
  it("reads JSON arrays", () => {
    expect(parseInquiryJsonArray('["hypha","seeds"]')).toEqual(["hypha", "seeds"]);
    expect(parseInquiryJsonArray(null)).toEqual([]);
  });
});

describe("formatGeneralInquiryAnswers", () => {
  it("returns one row per field with — for empties", () => {
    const rows = formatGeneralInquiryAnswers({
      fullName: "Sam",
      email: "sam@example.com",
      pathType: "alliance",
      partnershipDescription: "Build together.",
      newsletterOptIn: 0,
    });
    expect(rows).toHaveLength(GENERAL_INQUIRY_FIELDS.length);
    const byKey = Object.fromEntries(rows.map((r) => [r.key, r]));
    expect(byKey.pathType.displayValue).toBe("Alliance partnership");
    expect(byKey.partnershipDescription.displayValue).toBe("Build together.");
    expect(byKey.organizationUrl.displayValue).toBe(EMPTY_INQUIRY_ANSWER);
    expect(byKey.newsletterOptIn.displayValue).toBe("No");
    expect(byKey.allianceSupportDescription.isEmpty).toBe(true);
  });

  it("formats map pin and string arrays", () => {
    const rows = formatGeneralInquiryAnswers({
      organizationLatitude: 10.5,
      organizationLongitude: -84.2,
      capitalTypes: JSON.stringify(["social", "living"]),
      landProjects: '["la_tierra","tdf"]',
    });
    const byKey = Object.fromEntries(rows.map((r) => [r.key, r]));
    expect(byKey.organizationMapPin.displayValue).toBe("10.5, -84.2");
    expect(byKey.capitalTypes.displayValue).toBe("social, living");
    expect(byKey.landProjects.displayValue).toBe("la tierra, tdf");
  });
});
