/**
 * Each audience sees its own surfaces (build spec 2026-10-01, section 16).
 *
 * The Ready to crowdpool list moved from the contributor gift map at
 * /crowd-pooling to the creator front door at /create-campaign#ready. These
 * checks read the source, so a later edit cannot quietly send a land project
 * back to the gift map, or put the founders' checklist on a contributor page.
 * Pure: no database, no network.
 */
import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve, sep } from "node:path";
import { READINESS_HREF } from "../shared/crowdpoolReadiness";
import { REGEN_SEASONS } from "../shared/regenYear";

const REPO = resolve(__dirname, "..");
const SOURCE = /\.(ts|tsx|js|jsx|mjs|cjs)$/;
const TEST_FILE = /\.(test|spec)\.(ts|tsx|js|jsx|mjs|cjs)$/;

/** Every source file under a directory, as repo-relative paths with forward slashes. */
function sourceFiles(dir: string): string[] {
  const out: string[] = [];
  const walk = (abs: string) => {
    for (const name of readdirSync(abs)) {
      if (name === "node_modules" || name === "dist" || name === "__snapshots__") continue;
      const full = join(abs, name);
      if (statSync(full).isDirectory()) walk(full);
      else if (SOURCE.test(name)) out.push(relative(REPO, full).split(sep).join("/"));
    }
  };
  walk(resolve(REPO, dir));
  return out;
}

const read = (path: string) => readFileSync(resolve(REPO, path), "utf8");

/** The pages and components a land project reads on its way to a campaign. */
const CREATOR_INTENT_FILES = [
  "client/src/components/ApplicationsNotice.tsx",
  "client/src/pages/ApplySuccess.tsx",
  "client/src/pages/Schedule.tsx",
  "client/src/pages/SeasonSchedule.tsx",
  "client/src/pages/Season2.tsx",
  "client/src/components/crowdpool/SeasonDefaults.tsx",
  "server/routes/applications.ts",
  "client/src/components/crowdpool/CampaignStartDoor.tsx",
  "client/src/pages/Land.tsx",
  "client/src/pages/ApplyStatus.tsx",
  "client/src/pages/MyApplications.tsx",
];

/** The pages a contributor reads while looking for something to help with. */
const CONTRIBUTOR_FILES = [
  "client/src/pages/CrowdPooling.tsx",
  "client/src/pages/CrowdPoolingProjects.tsx",
  "client/src/components/project/ProjectCampaignFront.tsx",
  "client/src/components/crowdpool/NeedsTab.tsx",
  "client/src/components/campaign-needs/NeedsRegistry.tsx",
];

describe("each audience sees its own surfaces", () => {
  it("1. the public Ready to crowdpool list lives on the creator front door", () => {
    expect(READINESS_HREF.startsWith("/create-campaign")).toBe(true);
    expect(READINESS_HREF).toBe("/create-campaign#ready");
  });

  it("2. no source file spells out the old address (the forward in CrowdPooling.tsx names no address)", () => {
    // Built so this file never contains the literal it searches for.
    const old = ["crowd-pooling", "ready"].join("#");
    const files = ["client/src", "shared", "server"].flatMap(sourceFiles).filter((f) => !TEST_FILE.test(f));
    expect(files.length).toBeGreaterThan(200);
    const hits = files.filter((f) => read(f).includes(old));
    expect(hits).toEqual([]);
  });

  it("3. creator pages never send a land project to the gift map or the calculator", () => {
    const hits: string[] = [];
    for (const f of CREATOR_INTENT_FILES) {
      const text = read(f);
      for (const needle of ['href="/crowd-pooling"', 'href: "/crowd-pooling"', '"/calculator"']) {
        if (text.includes(needle)) hits.push(`${f}: ${needle}`);
      }
    }
    expect(hits).toEqual([]);
  });

  it("4. contributor pages never carry the founders' checklist", () => {
    const hits = CONTRIBUTOR_FILES.filter((f) => /import[^;]*\bCrowdpoolReadiness\b[^;]*from/.test(read(f)));
    expect(hits).toEqual([]);
  });

  it("5. the Resource season's move for land projects links the list", () => {
    const move = REGEN_SEASONS.spring.play.find((m) => m.who === "Land projects");
    expect(move?.href).toBe(READINESS_HREF);
  });
});
