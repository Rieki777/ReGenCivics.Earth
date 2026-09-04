import { describe, expect, it } from "vitest";
import {
  LAND_PROJECTS_CATEGORY_SLUG,
  TEAM_USER_EMAIL,
  TEAM_USER_HANDLE,
  TEAM_USER_NAME,
  TEAM_USER_OPEN_ID,
  getOrCreateTeamUserId,
  isTeamUser,
  jsonLdAuthor,
  landProjectTeamAttribution,
} from "./team-user";

const skipIfNoDb = !process.env.DATABASE_URL;

describe("isTeamUser", () => {
  it("matches the team email, handle, or openId", () => {
    expect(isTeamUser({ email: "team@regencivics.earth" })).toBe(true);
    expect(isTeamUser({ email: "Team@ReGenCivics.earth" })).toBe(true);
    expect(isTeamUser({ handle: "regen-civics-team" })).toBe(true);
    expect(isTeamUser({ handle: "Regen-Civics-Team" })).toBe(true);
    expect(isTeamUser({ openId: TEAM_USER_OPEN_ID })).toBe(true);
  });

  it("rejects personal accounts", () => {
    expect(isTeamUser({ email: "rieki.cordon@gmail.com", name: "Rieki Cordon (Rieki)" })).toBe(false);
    expect(isTeamUser({ handle: "rieki", openId: "google:123" })).toBe(false);
    expect(isTeamUser(null)).toBe(false);
    expect(isTeamUser(undefined)).toBe(false);
  });
});

describe("jsonLdAuthor", () => {
  it("uses Organization for the team identity", () => {
    expect(jsonLdAuthor({ email: TEAM_USER_EMAIL, name: TEAM_USER_NAME })).toEqual({
      "@type": "Organization",
      name: TEAM_USER_NAME,
    });
  });

  it("uses Person for a community member", () => {
    expect(jsonLdAuthor({ email: "friend@example.com", name: "Ada" })).toEqual({
      "@type": "Person",
      name: "Ada",
    });
  });

  it("falls back to Anonymous for an unknown person", () => {
    expect(jsonLdAuthor(undefined)).toEqual({
      "@type": "Person",
      name: "Anonymous",
    });
  });
});

describe("land project category slug", () => {
  it("is the Forum > Land Projects catalog slug", () => {
    expect(LAND_PROJECTS_CATEGORY_SLUG).toBe("land-projects");
    expect(TEAM_USER_HANDLE).toBe("regen-civics-team");
  });
});

describe("landProjectTeamAttribution", () => {
  it("returns the team identity for the land-projects category", () => {
    expect(landProjectTeamAttribution("land-projects")).toEqual({
      authorName: TEAM_USER_NAME,
      authorHandle: TEAM_USER_HANDLE,
      authorAvatar: "/brand/regen_logo.svg",
    });
  });

  it("leaves other categories untouched", () => {
    expect(landProjectTeamAttribution("general")).toBeNull();
    expect(landProjectTeamAttribution("alliance-partners")).toBeNull();
    expect(landProjectTeamAttribution(null)).toBeNull();
  });
});

describe("getOrCreateTeamUserId", () => {
  it.skipIf(skipIfNoDb)("returns a stable team user id", async () => {
    const first = await getOrCreateTeamUserId();
    const second = await getOrCreateTeamUserId();
    expect(first).toEqual(expect.any(Number));
    expect(first).toBeGreaterThan(0);
    expect(second).toBe(first);
  });
});
