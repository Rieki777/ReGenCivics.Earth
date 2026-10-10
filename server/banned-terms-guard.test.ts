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
import { FUND_WORDS_EXEMPT, GUARDED_FILES, OLD_PHRASES, PHRASE_GUARDED_FILES, PROFILE_GUARDED_FILES, buildRules, findBannedTerms, findForFile, findOldPhrases, guardedFiles, isCampaignSurface, loadModelBannedTerms, phraseGuardedFiles } from "../scripts/check-banned-terms.mjs";

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

describe("the old phrases (bundle 1, 2026-10-01)", () => {
  const PROFILE = "client/src/pages/PlayerProfile.tsx";
  const COPY = "client/src/data/pageCopy.ts";
  const phrases = (file: string, text: string): string[] => (findOldPhrases(file, text) as Finding[]).map((f) => f.term);
  const everything = (file: string, text: string): string[] => (findForFile(file, text) as Finding[]).map((f) => f.term);

  const CASES: Array<[string, string]> = [
    ['const a = "This need is already fully claimed";', "fully claimed"],
    ['const a = "Fully-claimed needs drop off";', "fully claimed"],
    ['const a = "Claim a spot on the needs list";', "claim a spot"],
    ['const a = "Complete quests to earn tokens";', "earn tokens"],
    ['const a = "Each quest earns tokens";', "earn tokens"],
    ['const a = "Help earning tokens";', "earn tokens"],
    ['const a = "Get tokens for your contributions";', "tokens for your contributions"],
    ['const a = "Money. On this platform that means crypto.";', "that means crypto"],
    ['const a = "It now grows on your Living Tree.";', "grows on your Living Tree"],
  ];

  it("catches each old phrase in a profile file and on a campaign surface", () => {
    for (const [line, term] of CASES) {
      expect(phrases(PROFILE, line), line).toContain(term);
      expect(phrases(SURFACE, line), line).toContain(term);
      expect(everything(COPY, line), line).toContain(term);
    }
    // Every rule has a case here.
    const covered = new Set(CASES.map(([, term]) => term));
    for (const rule of OLD_PHRASES as Array<{ label: string; profileOnly?: boolean }>) {
      if (!rule.profileOnly) expect(covered.has(rule.label), rule.label).toBe(true);
    }
  });

  it("catches the Currency label on the profile only", () => {
    const line = '<p className="text-white/70 text-xs mt-1">Currency</p>';
    expect(phrases(PROFILE, line)).toEqual(["Currency label"]);
    expect(phrases("client/src/components/profile/ProfileHeader.tsx", line)).toEqual(["Currency label"]);
    expect(phrases("client/src/pages/CreateCampaign.tsx", line)).toEqual([]);
    expect(phrases(SURFACE, line)).toEqual([]);
    expect(phrases(COPY, line)).toEqual([]);
    // The word in a sentence is not the label.
    expect(phrases(PROFILE, "<p>Pick a currency for the campaign</p>")).toEqual([]);
  });

  it("leaves the word list off the profile, so claim for the token bridge stays", () => {
    const text = ['<Button>Claim to wallet</Button>', 'const a = "Funded and claimed";', 'const b = "$RCivics balance";'].join("\n");
    expect(everything(PROFILE, text)).toEqual([]);
    expect(everything(COPY, text)).toEqual([]);
    // The same lines on a campaign surface still trip the word list.
    expect(everything(SURFACE, text)).toEqual(expect.arrayContaining(["claim", "funded", "$RCivics"]));
  });

  it("checks the em-dash on the profile and copy files", () => {
    const line = `const a = "Quests ${DASH} and gratitude";`;
    expect(everything(PROFILE, line)).toEqual(["em-dash"]);
    expect(everything(COPY, line)).toEqual(["em-dash"]);
  });

  it("skips comment lines and honours banned-terms-allow", () => {
    const text = [
      "// it used to say earn tokens here",
      "{/* 3. Earn Tokens, the old heading */}",
      " * fully claimed, in a doc comment",
      'const a = "earn tokens"; // banned-terms-allow: quoting the old copy in a test fixture',
      'const ok = "Complete quests to earn $ReGen.";',
    ].join("\n");
    expect(findOldPhrases(PROFILE, text)).toEqual([]);
    expect(findForFile(PROFILE, text)).toEqual([]);
  });

  it("knows which files are campaign surfaces", () => {
    expect(isCampaignSurface("client/src/components/project/StewardTools.tsx")).toBe(true);
    expect(isCampaignSurface("client/src/components/project/StewardTools.test.tsx")).toBe(false);
    expect(isCampaignSurface("shared/crowdpoolCopy.ts")).toBe(true);
    expect(isCampaignSurface(PROFILE)).toBe(false);
    expect(isCampaignSurface(COPY)).toBe(false);
  });

  it("lists the profile and copy files the spec names", () => {
    expect(PROFILE_GUARDED_FILES).toEqual([
      "client/src/pages/PlayerProfile.tsx",
      "client/src/pages/PlayerProfileByHandle.tsx",
      "client/src/components/profile/ProfileHeader.tsx",
    ]);
    expect(PHRASE_GUARDED_FILES).toEqual([
      "client/src/data/pageCopy.ts",
      "shared/crowdpoolingTaxonomy.ts",
      "server/routes/campaigns.ts",
      "scripts/seed-demo-campaigns.ts",
    ]);
  });

  it("reports a missing profile or copy file", () => {
    const empty = mkdtempSync(path.join(tmpdir(), "old-phrases-"));
    try {
      const { files, missing } = phraseGuardedFiles(empty);
      expect(files).toEqual([]);
      expect(missing).toEqual([...PROFILE_GUARDED_FILES, ...PHRASE_GUARDED_FILES]);
    } finally {
      rmSync(empty, { recursive: true, force: true });
    }
  });

  it("every profile and copy file is clean today", () => {
    const { files, missing } = phraseGuardedFiles();
    expect(missing).toEqual([]);
    const dirty = files
      .map((f: string) => [f, findForFile(f, readFileSync(f, "utf8")) as Finding[]] as const)
      .filter(([, found]: readonly [string, Finding[]]) => found.length > 0);
    expect(dirty).toEqual([]);
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

  it("guards the gift map, its gift tool and the creator front door (bundle 1, section 16.2)", () => {
    expect(GUARDED_FILES).toEqual(
      expect.arrayContaining([
        "client/src/pages/CrowdPooling.tsx",
        "client/src/components/character/GiftMapChrome.tsx",
        "client/src/components/CrowdPoolingTool.tsx",
        "client/src/components/crowdpool/CampaignStartDoor.tsx",
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
      .map((f: string) => [f, findForFile(f, readFileSync(f, "utf8"), rules) as Finding[]] as const)
      .filter(([, found]: readonly [string, Finding[]]) => found.length > 0);
    expect(dirty).toEqual([]);
  });
});
