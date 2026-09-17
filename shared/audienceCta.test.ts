import { describe, expect, it } from "vitest";
import { pickAudienceCta } from "./audienceCta";
import { SITE_ORIGIN } from "./siteContext";

describe("pickAudienceCta", () => {
  it("maps episode / season 2 to /season2", () => {
    expect(pickAudienceCta({ type: "episode" }).path).toBe("/season2");
    expect(pickAudienceCta({ season: "Season 2" }).url).toBe(`${SITE_ORIGIN}/season2`);
    expect(pickAudienceCta({ title: "S2 Episode 3" }).path).toBe("/season2");
  });

  it("maps open access to /schedule", () => {
    expect(pickAudienceCta({ type: "open" }).path).toBe("/schedule");
    expect(pickAudienceCta({ title: "Open Access September" }).path).toBe("/schedule");
  });

  it("maps apply / land project to /apply", () => {
    expect(pickAudienceCta({ title: "How to apply" }).path).toBe("/apply");
    expect(pickAudienceCta({ title: "Land project kickoff" }).path).toBe("/apply");
  });

  it("maps investor and loi", () => {
    expect(pickAudienceCta({ title: "Investor office hours" }).path).toBe("/investor");
    expect(pickAudienceCta({ title: "LOI workshop" }).path).toBe("/loi");
  });

  it("maps claim seeds", () => {
    expect(pickAudienceCta({ title: "Claim SEEDS together" }).path).toBe("/claim-seeds");
  });

  it("defaults to /connect", () => {
    expect(pickAudienceCta({ type: "special", title: "Community jam" }).path).toBe("/connect");
    expect(pickAudienceCta(null).path).toBe("/connect");
  });
});
