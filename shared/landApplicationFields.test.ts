import { describe, expect, it } from "vitest";
import {
  EMPTY_ANSWER,
  LAND_APPLICATION_FIELDS,
  formatLandApplicationAnswers,
  groupLandApplicationAnswers,
  landApplicationFieldKeys,
  parseDocumentUrls,
  parseJsonArray,
} from "./landApplicationFields";

describe("landApplicationFieldKeys", () => {
  it("covers the apply-form answer columns reviewers need", () => {
    const keys = landApplicationFieldKeys();
    for (const required of [
      "projectName",
      "projectType",
      "location",
      "vision",
      "landStatus",
      "projectSizeHectares",
      "teamSize",
      "teamDescription",
      "regenerativePractices",
      "governanceApproach",
      "communityEngagement",
      "timeCommitment",
      "currentFunding",
      "fundingNeeds",
      "mixedUse",
      "meetingFrequency",
      "dietaryPatterns",
      "websiteUrl",
      "videoUrl",
      "documentsUrl",
      "additionalNotes",
      "needsText",
      "offersText",
      "contactName",
      "contactEmail",
    ]) {
      expect(keys).toContain(required);
    }
    // No duplicate keys in the registry.
    expect(new Set(keys).size).toBe(keys.length);
  });
});

describe("parseJsonArray / parseDocumentUrls", () => {
  it("reads JSON arrays and bare values", () => {
    expect(parseJsonArray('["residential","agricultural"]')).toEqual([
      "residential",
      "agricultural",
    ]);
    expect(parseJsonArray(["vegan"])).toEqual(["vegan"]);
    expect(parseJsonArray("")).toEqual([]);
    expect(parseJsonArray(null)).toEqual([]);
    expect(parseJsonArray("not-json")).toEqual(["not-json"]);
  });

  it("extracts document URLs from string or {url} objects", () => {
    expect(parseDocumentUrls(JSON.stringify(["https://a.example/1"]))).toEqual([
      "https://a.example/1",
    ]);
    expect(
      parseDocumentUrls(JSON.stringify([{ name: "plan.pdf", url: "https://a.example/plan.pdf" }])),
    ).toEqual(["https://a.example/plan.pdf"]);
    expect(parseDocumentUrls("https://a.example/bare")).toEqual(["https://a.example/bare"]);
    expect(parseDocumentUrls(null)).toEqual([]);
  });
});

describe("formatLandApplicationAnswers", () => {
  it("returns one row per registry field and uses — for empties", () => {
    const rows = formatLandApplicationAnswers({
      projectName: "Terra Vallalta",
      projectType: "early_stage",
      location: "Catalonia, Spain",
      vision: "A regenerative village.",
      landStatus: "owned",
      teamSize: 4,
      teamDescription: "Four stewards.",
      regenerativePractices: "Soil and water.",
      governanceApproach: "Sociocracy.",
      communityEngagement: "Open days.",
      timeCommitment: "One day a week.",
      fundingNeeds: "Seed capital.",
    });

    expect(rows).toHaveLength(LAND_APPLICATION_FIELDS.length);

    const byKey = Object.fromEntries(rows.map((r) => [r.key, r]));
    expect(byKey.projectName.displayValue).toBe("Terra Vallalta");
    expect(byKey.projectType.displayValue).toBe("Early stage");
    expect(byKey.landStatus.displayValue).toBe("Owned");
    expect(byKey.vision.kind).toBe("longtext");
    expect(byKey.websiteUrl.displayValue).toBe(EMPTY_ANSWER);
    expect(byKey.websiteUrl.isEmpty).toBe(true);
    expect(byKey.currentFunding.displayValue).toBe(EMPTY_ANSWER);
  });

  it("formats arrays, hectares, map pin, and document links", () => {
    const rows = formatLandApplicationAnswers({
      projectSizeHectares: 12.5,
      mixedUse: JSON.stringify(["residential", "agricultural"]),
      dietaryPatterns: '["vegan","vegetarian"]',
      meetingFrequency: "weekly",
      latitude: 41.9,
      longitude: 2.1,
      websiteUrl: "https://example.org",
      documentsUrl: JSON.stringify([
        { name: "plan.pdf", url: "https://cdn.example/plan.pdf" },
        "https://cdn.example/photo.jpg",
      ]),
    });
    const byKey = Object.fromEntries(rows.map((r) => [r.key, r]));
    expect(byKey.projectSizeHectares.displayValue).toBe("12.5");
    expect(byKey.mixedUse.displayValue).toBe("Residential, Agricultural");
    expect(byKey.dietaryPatterns.displayValue).toBe("Vegan, Vegetarian");
    expect(byKey.meetingFrequency.displayValue).toBe("Weekly");
    expect(byKey.mapPin.displayValue).toBe("41.9, 2.1");
    expect(byKey.websiteUrl.kind).toBe("url");
    expect(byKey.documentsUrl.kind).toBe("url_list");
    expect(byKey.documentsUrl.urls).toEqual([
      "https://cdn.example/plan.pdf",
      "https://cdn.example/photo.jpg",
    ]);
  });

  it("does not invent answers when the record is empty", () => {
    const rows = formatLandApplicationAnswers({});
    expect(rows.every((r) => r.isEmpty && r.displayValue === EMPTY_ANSWER)).toBe(true);
  });
});

describe("groupLandApplicationAnswers", () => {
  it("groups in section order", () => {
    const groups = groupLandApplicationAnswers(
      formatLandApplicationAnswers({ projectName: "X", vision: "Y" }),
    );
    expect(groups.map((g) => g.section)).toEqual([
      "Contact",
      "Project",
      "Land & community",
      "Team",
      "Values & alignment",
      "Commitment & resources",
      "Links & documents",
      "Extra",
    ]);
    const project = groups.find((g) => g.section === "Project");
    expect(project?.answers.some((a) => a.key === "projectName")).toBe(true);
  });
});
