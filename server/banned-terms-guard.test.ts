/**
 * The campaign-surface word guard (scripts/check-banned-terms.mjs; build spec
 * 2026-09-25, section 10.5). Pure: no database. The last block runs the guard
 * over the real guarded files, so a banned word landing on a campaign surface
 * fails here as well as in gate 1f and CI.
 */
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
// @ts-expect-error plain .mjs module, typed loosely on purpose
import { FUND_WORDS_EXEMPT, GUARDED_FILES, buildRules, findBannedTerms, guardedFiles, loadModelBannedTerms } from "../scripts/check-banned-terms.mjs";

type Finding = { line: number; term: string; match: string; text: string };

const SURFACE = "client/src/components/project/Example.tsx";
const NOTICE = "server/lib/campaign-notify.ts";
const DASH = String.fromCharCode(0x2014);

function terms(file: string, text: string): string[] {
  return (findBannedTerms(file, text) as Finding[]).map((f) => f.term);
}

describe("the banned words", () => {
  it("reads BANNED_TERMS from shared/crowdpoolModel.ts, so the list lives in one place", () => {
    const { terms: list, fromSource } = loadModelBannedTerms();
    expect(fromSource).toBe(true);
    expect(list).toEqual(expect.arrayContaining(["earmark", "earmarking", "earmarked", "donation", "donor", "tax deductible", "charitable"]));
  });

  it("flags every family in user-facing text", () => {
    const cases: Array<[string, string]> = [
      ['const a = "Your pledge counts";', "pledge"],
      ['const a = "Pledged so far";', "pledge"],
      ['const a = "Two pledges came in";', "pledge"],
      ['const a = "Keep pledging";', "pledge"],
      ["<p>Funded!</p>", "funded"],
      ['const a = "This unlocks the next stage";', "unlock"],
      ['const a = "Unlock the barn";', "unlock"],
      ['const a = "Claim your place";', "claim"],
      ['const a = "Two claims expired";', "claim"],
      ['const a = "Already claimed";', "claim"],
      ['const a = "Make a donation";', "donation"],
      ['const a = "Thank you for your donations";', "donation"],
      ['const a = "Every donor matters";', "donor"],
      ['const a = "Earmark it for seeds";', "earmark"],
      ['const a = "Earmarked for the barn";', "earmarked"],
      ['const a = "It is tax deductible";', "tax deductible"],
      ['const a = "It is tax-deductible";', "tax deductible"],
      ['const a = "A charitable gift";', "charitable"],
      [`const a = "Tools ${DASH} and time";`, "em-dash"],
    ];
    for (const [line, term] of cases) {
      expect(terms(SURFACE, line), line).toContain(term);
    }
  });

  it("matches whole words only", () => {
    expect(terms(SURFACE, "const claimTitle = plain(contribution.title);")).toEqual([]);
    expect(terms(SURFACE, "import { PledgeSimulator } from './PledgeSimulator';")).toEqual([]);
    expect(terms(SURFACE, "const fundedCount = 0;")).toEqual([]);
    expect(terms(SURFACE, 'const a = "This holds their place. A reserved seat_id";')).toEqual([]);
  });

  it("bans the fund words on contributor surfaces and leaves them to the notices", () => {
    const fundLines = [
      'const a = "Buy $RCivics";',
      'const a = "The fund minimum is high";',
      'const a = "From CHF 250";',
      'const a = "Held in reserve";',
      'const a = "Your allocation";',
      'const a = "Allocate it";',
      'const a = "Routing signal";',
      'const a = "A seat at the table";',
    ];
    for (const line of fundLines) {
      expect(terms(SURFACE, line).length, line).toBeGreaterThan(0);
      expect(terms(NOTICE, line), line).toEqual([]);
    }
    expect(FUND_WORDS_EXEMPT.has(NOTICE)).toBe(true);
    // The campaign words still apply to the notices.
    expect(terms(NOTICE, 'title: "Your claim expired",')).toEqual(["claim"]);
  });
});

describe("what the guard skips", () => {
  it("skips comment lines and the inside of a block comment", () => {
    const text = [
      "// a pledge in a line comment",
      "/* a funded block comment on one line */",
      "/**",
      " * Earmark, donation, claim: the words this file explains",
      " */",
      "/*",
      "   a block comment whose lines do not start with a star: pledge",
      "*/",
      "{/* JSX comment: funded */}",
      'const ok = "Offer sent";',
    ].join("\n");
    expect(findBannedTerms(SURFACE, text)).toEqual([]);
  });

  it("drops a trailing comment when the quotes before it balance, and never mistakes a URL for one", () => {
    expect(terms(SURFACE, 'const a = "Offer sent"; // was "Pledge sent"')).toEqual([]);
    expect(terms(SURFACE, 'const u = "https://example.test/claim"; ')).toEqual(["claim"]);
  });

  it("skips a quoted lowercase literal, an enum value or an id, and flags a capitalised one", () => {
    expect(terms(SURFACE, 'if (status === "funded") return;')).toEqual([]);
    expect(terms(SURFACE, "case 'funded':")).toEqual([]);
    expect(terms(SURFACE, 'sort: "most-funded",')).toEqual([]);
    expect(terms(SURFACE, "type: `claim_expired`,")).toEqual([]);
    expect(terms(SURFACE, 'scrollToId("claims");')).toEqual([]);
    expect(terms(SURFACE, 'label: "Funded",')).toEqual(["funded"]);
    expect(terms(SURFACE, 'label: "Pledged so far",')).toEqual(["pledge"]);
  });

  it("honours banned-terms-allow on the line or the line above", () => {
    expect(terms(SURFACE, 'run("claim expired"); // banned-terms-allow: a log label')).toEqual([]);
    const above = ["// banned-terms-allow: the token disclaimer", 'const t = "It makes no claim about value.";'].join("\n");
    expect(findBannedTerms(SURFACE, above)).toEqual([]);
    // Only the next line: two lines down is checked again.
    const twoDown = ["// banned-terms-allow: one line only", 'const a = "fine";', 'const b = "Claim it";'].join("\n");
    expect((findBannedTerms(SURFACE, twoDown) as Finding[]).map((f) => f.line)).toEqual([3]);
  });

  it("reports the line number and the matched word", () => {
    const found = findBannedTerms(SURFACE, ['const a = "ok";', 'const b = "Pledged so far";'].join("\n")) as Finding[];
    expect(found).toEqual([{ line: 2, term: "pledge", match: "Pledged", text: 'const b = "Pledged so far";' }]);
  });
});

describe("the guarded files", () => {
  it("lists the contributor surfaces the spec names", () => {
    expect(GUARDED_FILES).toEqual(
      expect.arrayContaining([
        "client/src/pages/ProjectPage.tsx",
        "client/src/pages/CrowdPoolingProjects.tsx",
        "client/src/components/crowdpool/NeedsTab.tsx",
        "client/src/components/crowdpool/GalleryCard.tsx",
        "client/src/components/ContributionModal.tsx",
        "shared/crowdpoolCopy.ts",
        "shared/stewardQueue.ts",
        "server/lib/campaign-notify.ts",
        "server/routes/embed.ts",
      ]),
    );
  });

  it("reports a listed path that is missing, so a rename cannot drop a surface quietly", () => {
    const empty = mkdtempSync(path.join(tmpdir(), "banned-terms-"));
    try {
      const { files, missing } = guardedFiles(empty);
      expect(files).toEqual([]);
      expect(missing).toEqual(expect.arrayContaining(["shared/crowdpoolCopy.ts", "client/src/components/project/"]));
    } finally {
      rmSync(empty, { recursive: true, force: true });
    }
  });

  it("every guarded surface is clean today", () => {
    const { files, missing } = guardedFiles();
    expect(missing).toEqual([]);
    // Tests are left out: they assert that banned words are absent.
    expect(files.some((f: string) => /\.test\.tsx?$/.test(f))).toBe(false);
    expect(files).toEqual(expect.arrayContaining(["client/src/components/project/StewardTools.tsx", "client/src/components/campaign-needs/NeedCard.tsx"]));
    const rules = buildRules();
    const dirty = files
      .map((f: string) => [f, findBannedTerms(f, readFileSync(f, "utf8"), rules) as Finding[]] as const)
      .filter(([, found]: readonly [string, Finding[]]) => found.length > 0);
    expect(dirty).toEqual([]);
  });
});
