import { describe, expect, it } from "vitest";
import { ALLIANCE_ROLES, cleanRoles, missingForSubmit, SUPPORT_MIN } from "./allianceApplication";
import { mergeBadges, projectNameKey } from "./memberBadges";
import { seasonRegister } from "./seasonSchedule";

describe("cleanRoles", () => {
  it("keeps known tags once, in list order, from an array or the stored JSON", () => {
    expect(cleanRoles(["Legal", "Coordination", "Legal", "Nope"])).toEqual(["Coordination", "Legal"]);
    expect(cleanRoles(JSON.stringify(["Technology", "Other"]))).toEqual(["Technology", "Other"]);
  });

  it("reads nothing from junk", () => {
    expect(cleanRoles("not json")).toEqual([]);
    expect(cleanRoles(null)).toEqual([]);
    expect(cleanRoles({ a: 1 })).toEqual([]);
  });

  it("offers every tag /connect offered, so an inquiry converts without losing one", () => {
    expect(ALLIANCE_ROLES.map((r) => r.id)).toContain("Bioregional Econ");
    expect(ALLIANCE_ROLES).toHaveLength(18);
  });
});

describe("missingForSubmit", () => {
  const ready = {
    organizationName: "Seed Commons",
    contactName: "Ana",
    roles: ["Funding"],
    supportDescription: "x".repeat(SUPPORT_MIN),
  };

  it("is empty for a complete application", () => {
    expect(missingForSubmit(ready)).toEqual([]);
  });

  it("names each missing piece in the applicant's words", () => {
    expect(missingForSubmit({ ...ready, organizationName: " ", roles: [], supportDescription: "short" })).toEqual([
      "your organization's name",
      "at least one role or kind of support",
      "how you support land projects (a sentence or two)",
    ]);
  });
});

describe("member badges", () => {
  it("merges in a fixed order, once each", () => {
    expect(mergeBadges(["alliance_partner"], ["land_project", "alliance_partner"])).toEqual(["land_project", "alliance_partner"]);
    expect(mergeBadges(undefined, [])).toEqual([]);
  });

  it("compares project names ignoring case and spacing", () => {
    expect(projectNameKey("  Hill   Farm ")).toBe(projectNameKey("hill farm"));
  });

  it("carries badges onto the Season register, merged per project", () => {
    const rows = [
      { slots: "tue", displayName: "Maya", projectName: "Hill Farm", projectUrl: "https://hill.farm", userId: 4 },
      { slots: "wed", displayName: "Kai", projectName: "hill farm", projectUrl: "https://hill.farm", userId: null },
      { slots: "wed", displayName: "Ola", projectName: "Other", projectUrl: "https://other.org", userId: null },
    ];
    const register = seasonRegister(rows, (s) => s ?? null, (u) => u ?? null, 60, (row) =>
      row.userId === 4 ? ["alliance_partner"] : row.projectName?.toLowerCase() === "hill farm" ? ["land_project"] : [],
    );
    expect(register[0]).toMatchObject({ project: "Hill Farm", names: "Maya, Kai", badges: ["land_project", "alliance_partner"] });
    expect(register[1].badges).toEqual([]);
  });
});
