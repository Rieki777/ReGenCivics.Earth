import { describe, expect, it } from "vitest";
import { inquiryTypeForPath, getAgeInfo, filterByProject } from "./adminInquiry";

describe("admin inquiry helpers", () => {
  it("maps form paths onto hub types", () => {
    expect(inquiryTypeForPath("live")).toBe("live");
    expect(inquiryTypeForPath("create")).toBe("create");
    expect(inquiryTypeForPath("finance")).toBe("other");
    expect(inquiryTypeForPath("learn")).toBe("other");
    expect(inquiryTypeForPath("mystery")).toBe("other");
    expect(inquiryTypeForPath(undefined)).toBe("live");
  });

  it("marks inquiries older than 48h as overdue", () => {
    const fresh = getAgeInfo(new Date(Date.now() - 3 * 3_600_000));
    expect(fresh.isOverdue).toBe(false);
    const old = getAgeInfo(new Date(Date.now() - 72 * 3_600_000));
    expect(old.isOverdue).toBe(true);
    expect(old.label).toMatch(/overdue/);
  });

  it("filters inquiries by selected project id in formData", () => {
    const rows = [
      { id: 1, formData: JSON.stringify({ selectedProjects: ["la_tierra"] }) },
      { id: 2, formData: JSON.stringify({ selectedProjects: ["nyx"] }) },
      { id: 3, formData: JSON.stringify({ selectedOrganizations: ["hypha"] }) },
    ];
    expect(filterByProject(rows, "la_tierra").map((r) => r.id)).toEqual([1]);
    expect(filterByProject(rows, "hypha").map((r) => r.id)).toEqual([3]);
  });
});
