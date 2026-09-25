import { describe, expect, it } from "vitest";
import {
  parseProjectKey,
  projectKey,
  projectPathForApplication,
  projectPathForCampaign,
  slugifyProjectName,
  canonicalRedirectTarget,
} from "./projectKey";

describe("slugifyProjectName", () => {
  it("lowercases, strips accents and joins words with dashes", () => {
    expect(slugifyProjectName("Harmony Valley Ecovillage")).toBe("harmony-valley-ecovillage");
    expect(slugifyProjectName("Terra Viva São João!")).toBe("terra-viva-sao-joao");
    expect(slugifyProjectName("  --Hello__World--  ")).toBe("hello-world");
  });
  it("caps at 60 characters with no trailing dash", () => {
    const s = slugifyProjectName("a".repeat(59) + " bcdef");
    expect(s.length).toBeLessThanOrEqual(60);
    expect(s.endsWith("-")).toBe(false);
    expect(slugifyProjectName("x".repeat(200))).toHaveLength(60);
  });
  it("is empty for a name with no letters or digits", () => {
    expect(slugifyProjectName("!!!")).toBe("");
  });
});

describe("projectKey and parseProjectKey", () => {
  it("round-trips an application key", () => {
    const k = projectKey({ applicationId: 42, campaignId: 7, name: "Harmony Valley" });
    expect(k).toBe("42-harmony-valley");
    expect(parseProjectKey(k)).toEqual({ kind: "application", id: 42 });
  });
  it("round-trips a campaign key when there is no application", () => {
    const k = projectKey({ applicationId: null, campaignId: 7, name: "Harmony Valley Ecovillage" });
    expect(k).toBe("c7-harmony-valley-ecovillage");
    expect(parseProjectKey(k)).toEqual({ kind: "campaign", id: 7 });
  });
  it("accepts a numeric-only key and a bare id when the name has no slug", () => {
    expect(parseProjectKey("42")).toEqual({ kind: "application", id: 42 });
    expect(parseProjectKey("c9")).toEqual({ kind: "campaign", id: 9 });
    expect(projectKey({ applicationId: 5, campaignId: 1, name: "???" })).toBe("5");
  });
  it("answers any slug for the same id", () => {
    expect(parseProjectKey("42-some-old-name")).toEqual({ kind: "application", id: 42 });
  });
  it("gives null for junk", () => {
    for (const junk of ["", "abc", "c", "-42", "42_x", "C7-x", "0", "c0-x", "42-Upper", "42/../x", "x".repeat(200)]) {
      expect(parseProjectKey(junk)).toBeNull();
    }
  });
});

describe("paths", () => {
  it("builds application and campaign paths", () => {
    expect(projectPathForApplication(42, "Harmony Valley")).toBe("/project/42-harmony-valley");
    expect(projectPathForCampaign({ id: 7, applicationId: null, projectName: "Harmony Valley", title: "Plant 400 trees" }))
      .toBe("/project/c7-harmony-valley");
    expect(projectPathForCampaign({ id: 7, applicationId: 42, projectName: null, title: "Plant trees" }))
      .toBe("/project/42-plant-trees");
  });
});

describe("sanitized names", () => {
  it("decodes entities before slugging", () => {
    expect(slugifyProjectName("Seeds &amp; Soil")).toBe("seeds-soil");
  });
});

describe("canonicalRedirectTarget", () => {
  it("moves an old slug to the canonical path", () => {
    expect(canonicalRedirectTarget({ location: "/project/42-old", canonicalPath: "/project/42-harmony", isPlaceholderData: false }))
      .toBe("/project/42-harmony");
    expect(canonicalRedirectTarget({ location: "/project/42-harmony", canonicalPath: "/project/42-harmony", isPlaceholderData: false }))
      .toBeNull();
  });
  it("never bounces back while the previous project's data is still on screen", () => {
    // Moving from project A to project B: B's key is in the URL, A's data is the placeholder.
    expect(canonicalRedirectTarget({ location: "/project/c1600-rewild", canonicalPath: "/project/c1597-harmony", isPlaceholderData: true }))
      .toBeNull();
    expect(canonicalRedirectTarget({ location: "/project/c1600-rewild", canonicalPath: null, isPlaceholderData: false })).toBeNull();
  });
});
