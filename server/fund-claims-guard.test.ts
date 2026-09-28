/**
 * The fund-claims gate (scripts/check-fund-claims.mjs; funding engine Phase 0,
 * plan v1.2 gate G5). Pure: no database. The last block runs the gate over the
 * real tree, so upside language landing on any public surface fails here as
 * well as in gate 1d and CI.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
// @ts-expect-error plain .mjs module, typed loosely on purpose
import { SELF, SUMMARY_SURFACES, findG5, findRetired, findTraction, g5Applies, scannedFiles } from "../scripts/check-fund-claims.mjs";

type Finding = { line: number; claim: string; match?: string; text: string };

const PAGE = "client/src/pages/Example.tsx";
const PROSE = "client/public/llms.txt";

function g5(file: string, text: string): string[] {
  return (findG5(file, text) as Finding[]).map((f) => f.claim);
}

describe("retired claims", () => {
  it("flags the retired fund name and the formation phrasing", () => {
    const hits = (findRetired(PAGE, 'const a = "The ReGen Civics Fund is in formation";') as Finding[]).map((f) => f.claim);
    expect(hits).toContain("ReGen Civics Fund");
    expect(hits).toContain("fund is in formation");
  });

  it("honors an allow comment on the line or the line above", () => {
    expect(findRetired(PAGE, 'const a = "Regulation D"; // fund-claims-allow: names the definition')).toEqual([]);
    expect(findRetired(PAGE, "// fund-claims-allow: quoted for history\nconst a = \"Regulation D\";")).toEqual([]);
  });
});

describe("G5 phrases: what promises or prices upside is caught", () => {
  const cases: Array<[string, string]> = [
    ['const a = "Target returns of 8-12% annually";', "returns (financial)"],
    ['const a = "Modelled target of 12 to 18% net IRR";', "IRR"],
    ['const a = "A 15% ROI for patient capital";', "ROI"],
    ['const a = "Earn a 6% cash yield";', "yield"],
    ['const a = "Land value appreciation drives it";', "appreciation"],
    ['const a = "Exchange listings in year 7";', "exchange listing"],
    ['const a = "Trade on secondary markets";', "secondary market"],
    ['const a = "The index fund for the transition";', "index fund"],
    ['const a = "Direct investment in specific projects";', "direct investment"],
    ['const a = "Invest in land projects through us";', "invest in land projects"],
    ['const a = "A rare investment opportunity";', "investment offer"],
    ['const a = "Open to accredited investors only";', "accredited investor"],
    ['const a = "20% carried interest over an 8% preferred return";', "fund terms"],
    ['const a = "Quarterly LP letter";', "LP"],
    ['const a = "Fund II deploys next";', "Fund I / II / III"],
    ['const a = "A land-backed security";', "land-backed security"],
    ['const a = "Quarterly distributions to token holders";', "distributions to holders"],
    ['const a = "Exchange for USD at any time";', "tokens for money"],
    ['const a = "A venture fund for land";', "venture fund"],
    ['const a = "A diversified portfolio of land projects";', "portfolio"],
    ['const a = "A new asset class";', "asset class"],
    ['const a = "Liquidity pools open soon";', "liquidity promise"],
    ['const a = "$ReGen is currently valued at $0.01 each";', "token price"],
  ];
  for (const [line, label] of cases) {
    it(`flags ${label}`, () => {
      expect(g5(PAGE, line)).toContain(label);
    });
  }

  it("catches a percentage beside a return word in either order", () => {
    expect(g5(PAGE, 'const a = "Returns near 12% a year";')).toContain("percent near a return word");
    expect(g5(PAGE, 'const a = "About 9% in distributions";')).toContain("percent near a return word");
  });
});

describe("G5 phrases: what is not upside is left alone", () => {
  it("ignores the JavaScript return keyword next to a percentage", () => {
    expect(g5(PAGE, 'if (p >= 95) return "Top 5%";')).toEqual([]);
    expect(g5(PAGE, "return `<table width=\"100%\">`;")).toEqual([]);
  });

  it("ignores a currency code that happens to spell IRR", () => {
    expect(g5(PAGE, "{ code: 'IRR', symbol: 'rial', name: 'Iranian Rial' },")).toEqual([]);
  });

  it("ignores an identifier named NAV", () => {
    expect(g5(PAGE, "const NAV = [")).toEqual([]);
  });

  it("ignores comment lines in code, which must be able to name what is banned", () => {
    expect(g5(PAGE, "// the old page promised 12 to 18% net IRR")).toEqual([]);
    expect(g5(PAGE, "/*\n * target returns of 8-12%\n */")).toEqual([]);
  });

  it("still reads markdown list items, which are content, not comments", () => {
    expect(g5("README.md", "* Target returns of 8-12% annually")).toContain("returns (financial)");
  });

  it("leaves everyday words alone", () => {
    expect(g5(PAGE, 'const a = "Invest your time in the quest";')).toEqual([]);
    expect(g5(PAGE, 'const a = "Crop yields rose after the cover crop";')).toEqual([]);
    expect(g5(PAGE, 'const a = "The cooperative accepts no money";')).toEqual([]);
  });

  it("honors an allow comment", () => {
    expect(g5(PAGE, "// fund-claims-allow: names the 4 Returns framework\nconst a = \"financial returns in the 4 Returns frame\";")).toEqual([]);
  });
});

describe("traction numbers on summary surfaces", () => {
  it("flags hardcoded counts of players, projects and partners", () => {
    const labels = (text: string) => (findTraction(PROSE, text) as Finding[]).map((f) => f.match);
    expect(labels("- 847 active players globally")).toEqual(["847 active players"]);
    expect(labels("- 42 land projects in the network")).toEqual(["42 land projects"]);
    expect(labels("- 15 alliance partner organizations")).toEqual(["15 alliance partner organizations"]);
  });

  it("leaves the Season One record alone", () => {
    expect(findTraction(PROSE, "Season One in 2022: 43 applied, 16 presented, 13 selected.")).toEqual([]);
  });

  it("covers the surfaces crawlers and AI assistants read", () => {
    expect(SUMMARY_SURFACES).toEqual(
      expect.arrayContaining(["client/public/llms.txt", "client/public/llms-full.txt", "client/index.html", "server/_core/crawler-content.ts", "README.md"]),
    );
  });
});

describe("scope", () => {
  it("applies G5 to the project's own skills and not to installed marketing skills", () => {
    expect(g5Applies(".claude/skills/regen-investor-deck/SKILL.md")).toBe(true);
    expect(g5Applies(".claude/skills/usage-based-pricing/SKILL.md")).toBe(false);
    expect(g5Applies("client/src/pages/Fund.tsx")).toBe(true);
  });

  it("scans the public text files as well as the source roots", () => {
    const files = scannedFiles() as string[];
    for (const f of ["client/public/llms.txt", "client/index.html", "README.md", "CONTEXT_THE_TWO_GAMES.md"]) {
      expect(files).toContain(f);
    }
    expect(files.some((f) => f.startsWith("client/src/pages/"))).toBe(true);
  });
});

describe("the real tree", () => {
  const root = path.resolve(__dirname, "..");
  const TEST_FILE = /\.(test|spec)\.[cm]?[jt]sx?$/;

  it("exempts only the files that define the rules", () => {
    // The gate's own list, imported: a second copy here drifted the first time
    // the rules moved to shared/g5Rules.mjs.
    expect([...(SELF as Set<string>)].sort()).toEqual([
      "scripts/check-fund-claims.mjs",
      "server/fund-claims-guard.test.ts",
      "shared/fund.ts",
      "shared/g5Rules.mjs",
    ]);
  });

  it("carries no retired claim and no G5 phrase on any scanned surface", () => {
    const problems: string[] = [];
    for (const rel of scannedFiles() as string[]) {
      if ((SELF as Set<string>).has(rel)) continue;
      const text = readFileSync(path.join(root, rel), "utf8");
      for (const v of findRetired(rel, text) as Finding[]) problems.push(`${rel}:${v.line} retired ${v.claim}`);
      if (TEST_FILE.test(rel) || !g5Applies(rel)) continue;
      for (const v of findG5(rel, text) as Finding[]) problems.push(`${rel}:${v.line} ${v.claim} ("${v.match}")`);
    }
    expect(problems, problems.slice(0, 40).join("\n")).toEqual([]);
  });

  it("carries no traction number on a summary surface", () => {
    const problems: string[] = [];
    for (const rel of SUMMARY_SURFACES as string[]) {
      const text = readFileSync(path.join(root, rel), "utf8");
      for (const v of findTraction(rel, text) as Finding[]) problems.push(`${rel}:${v.line} ${v.match}`);
    }
    expect(problems, problems.join("\n")).toEqual([]);
  });
});
