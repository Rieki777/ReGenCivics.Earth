#!/usr/bin/env node
/**
 * Phase -2 baseline orchestrator: runs both halves and writes the report.
 *
 * The deterministic half always runs. The LLM half runs only when
 * OPENROUTER_API_KEY is present; without it the report is written with that
 * section marked pending rather than failing the whole run, because the site
 * measurement is useful on its own and is the half re-run after every phase.
 *
 * Run: node scripts/agent-baseline/run.mjs [baseUrl]
 * Writes: docs/agent-baseline/BASELINE-<YYYY-MM-DD>.md plus the two JSON files.
 */
import { mkdirSync, writeFileSync, existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";
import { crawl, DEFAULT_BASE } from "./crawl.mjs";
import { ask, QUESTIONS } from "./ask.mjs";

const repo = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const outDir = join(repo, "docs/agent-baseline");
const stamp = new Date().toISOString().slice(0, 10);

const pct = (n, d) => (d === 0 ? "0%" : `${Math.round((n / d) * 100)}%`);

function crawlSection(c) {
  const total = c.routes.length;
  const blank = c.routes.filter((r) => r.verdict === "BLANK");
  const thin = c.routes.filter((r) => r.verdict === "THIN");
  const full = c.routes.filter((r) => r.verdict === "FULL");
  const noTitle = c.routes.filter((r) => !r.title);
  const noDesc = c.routes.filter((r) => !r.description);
  const noCanon = c.routes.filter((r) => !r.canonical);
  const withPageJsonld = c.routes.filter((r) => (r.pageSpecificJsonldTypes ?? []).length > 0);
  const siteWide = c.jsonld?.siteWideTypes ?? [];
  const pageTypes = [...new Set(c.routes.flatMap((r) => r.pageSpecificJsonldTypes ?? []))].sort();

  const lines = [];
  lines.push(`## 1. What a non-executing agent sees`);
  lines.push("");
  lines.push(`Base: \`${c.base}\`. Crawled ${total} urls (${c.routeSource.staticFromAppTsx} static routes read from \`client/src/App.tsx\`, plus every url in \`/sitemap.xml\`, minus the paths our own robots.txt disallows).`);
  lines.push("");
  lines.push("| Verdict | Routes | Share | Meaning |");
  lines.push("|---|---:|---:|---|");
  lines.push(`| FULL | ${full.length} | ${pct(full.length, total)} | Over 1000 characters of prose in the initial HTML |`);
  lines.push(`| THIN | ${thin.length} | ${pct(thin.length, total)} | 200 to 1000 characters |`);
  lines.push(`| BLANK | ${blank.length} | ${pct(blank.length, total)} | Under 200 characters: an empty shell |`);
  lines.push("");
  lines.push("Head tags, measured on the same fetch:");
  lines.push("");
  lines.push("| Tag | Missing on |");
  lines.push("|---|---:|");
  lines.push(`| \`<title>\` | ${noTitle.length} / ${total} |`);
  lines.push(`| \`<meta name="description">\` | ${noDesc.length} / ${total} |`);
  lines.push(`| \`<link rel="canonical">\` | ${noCanon.length} / ${total} |`);
  lines.push(`| Page-specific JSON-LD | ${total - withPageJsonld.length} / ${total} |`);
  lines.push("");
  if (siteWide.length) {
    lines.push(`\`${siteWide.join("`, `")}\` is on ${pct(1, 1)} of routes, so it is one boilerplate block in the HTML shell rather than structured data about any page. It is excluded from the count above; counting it would report near-total coverage for a site where ${total - withPageJsonld.length} routes describe nothing.`);
    lines.push("");
  }
  if (pageTypes.length) lines.push(`Page-specific types in use: ${pageTypes.map((t) => `\`${t}\``).join(", ")}.`);
  lines.push("");
  lines.push("### Files an agent looks for first");
  lines.push("");
  lines.push("| File | Present | Bytes |");
  lines.push("|---|---|---:|");
  for (const f of c.files) {
    lines.push(`| \`${f.path}\` | ${f.present ? "yes" : "no"} | ${f.present ? f.bytes : "-"} |`);
  }
  lines.push("");
  lines.push("### Blank routes, in full");
  lines.push("");
  lines.push("These return an empty shell to any agent that does not run JavaScript. Each one is a page that exists for a human and does not exist for Muse, Spark or Instinct.");
  lines.push("");
  lines.push(blank.map((r) => `\`${r.path}\``).join(", ") || "None.");
  lines.push("");
  if (thin.length) {
    lines.push("### Thin routes");
    lines.push("");
    lines.push(thin.map((r) => `\`${r.path}\``).join(", "));
    lines.push("");
  }
  return lines.join("\n");
}

function askSection(a) {
  if (!a) {
    return [
      "## 2. What models say to the four questions",
      "",
      "**Pending.** This half needs `OPENROUTER_API_KEY`, which lives in Railway and is not in the local `.env`. The harness is built and tested; it runs in one command the moment the key is available:",
      "",
      "```bash",
      "OPENROUTER_API_KEY=... node scripts/agent-baseline/run.mjs",
      "```",
      "",
      "The four questions, one per funnel:",
      "",
      ...QUESTIONS.map((q) => `${q.funnel}. ${q.text}`),
      "",
    ].join("\n");
  }
  const ok = a.runs.filter((r) => !r.error);
  const lines = [];
  lines.push("## 2. What models say to the four questions");
  lines.push("");
  lines.push(`Models: ${a.models.map((m) => `\`${m}\``).join(", ")}. Judge: \`${a.judgeModel}\`. Two arms per question: **cold** (web search on, unscoped: the real control) and **sited** (search pushed at regencivics.earth).`);
  lines.push("");
  lines.push("| Model | Arm | Q | Mentioned | Our url | Has a date | Accuracy | Actionable |");
  lines.push("|---|---|---|---|---|---|---:|---:|");
  for (const r of ok) {
    const d = r.deterministic ?? {};
    lines.push(
      `| \`${r.model}\` | ${r.arm} | ${r.funnel} | ${d.mentionsReGenCivics ? "yes" : "no"} | ${d.returnsOurUrl ? "yes" : "no"} | ${d.hasDate ? "yes" : "no"} | ${r.judged?.accuracy ?? "-"}/2 | ${r.judged?.actionability ?? "-"}/2 |`,
    );
  }
  lines.push("");
  const cold = ok.filter((r) => r.arm === "cold");
  const mentionedCold = cold.filter((r) => r.deterministic?.mentionsReGenCivics);
  lines.push(`**Cold arm headline:** ReGen Civics named in ${mentionedCold.length} of ${cold.length} answers (${pct(mentionedCold.length, cold.length)}).`);
  lines.push("");
  const competitors = {};
  for (const r of cold) for (const c of r.deterministic?.competitorsCited ?? []) competitors[c] = (competitors[c] ?? 0) + 1;
  const ranked = Object.entries(competitors).sort((x, y) => y[1] - x[1]);
  if (ranked.length) {
    lines.push("### The ranking set we are actually up against");
    lines.push("");
    lines.push("Sources the models cited in the cold arm, most cited first. This is the competitor list, produced by the channel rather than guessed at.");
    lines.push("");
    lines.push("| Source | Times cited |");
    lines.push("|---|---:|");
    for (const [host, n] of ranked.slice(0, 25)) lines.push(`| ${host} | ${n} |`);
    lines.push("");
  }
  const inventions = ok.flatMap((r) => (r.judged?.inventions ?? []).map((i) => ({ model: r.model, arm: r.arm, funnel: r.funnel, i })));
  lines.push("### Inventions");
  lines.push("");
  lines.push("Claims about ReGen Civics stated as fact that the judge could not verify. Each one is a gap in the site: the model needed a fact, found nothing, and filled it in.");
  lines.push("");
  if (inventions.length) {
    for (const v of inventions) lines.push(`- (${v.funnel}, ${v.arm}, \`${v.model}\`) ${v.i}`);
  } else {
    lines.push("None recorded.");
  }
  lines.push("");
  const errs = a.runs.filter((r) => r.error);
  if (errs.length) {
    lines.push("### Calls that failed");
    lines.push("");
    for (const e of errs) lines.push(`- \`${e.model}\` ${e.arm} ${e.funnel}: ${e.error}`);
    lines.push("");
  }
  return lines.join("\n");
}

function report(c, a, control) {
  const blank = c.routes.filter((r) => r.verdict === "BLANK").length;
  const total = c.routes.length;
  return `# Agent baseline, ${stamp}

Phase -2 of the agent-surface build slice. This is the control: what agents see
and say about ReGen Civics before any connector work. Re-run it after phases 2,
3 and 6 and compare against this file.

Generated by \`scripts/agent-baseline/run.mjs\`. Raw data in
\`crawl-${stamp}.json\` and \`ask-${stamp}.json\` beside this file.

## Headline

${blank} of ${total} public urls (${pct(blank, total)}) return an empty shell to an agent that
does not execute JavaScript. \`/llms.txt\` and \`/llms-full.txt\` are already
served. \`/.well-known/mcp\`, \`/agents.md\` and \`/openapi.json\` are not.

${crawlSection(c)}

${askSection(a)}

## 3. Control: the consumer apps

${control}

## How to re-run

\`\`\`bash
node scripts/agent-baseline/run.mjs                    # site half only
OPENROUTER_API_KEY=... node scripts/agent-baseline/run.mjs   # both halves
\`\`\`

The site half costs nothing and needs no key. It is the one to re-run after
every phase.
`;
}

const base = process.argv[2] || process.env.BASELINE_BASE_URL || DEFAULT_BASE;
mkdirSync(outDir, { recursive: true });

console.log(`crawling ${base} ...`);
const c = await crawl(base);
writeFileSync(join(outDir, `crawl-${stamp}.json`), JSON.stringify(c, null, 2));
console.log(`  ${c.routes.length} urls, ${JSON.stringify(c.counts)}`);

// The LLM half is expensive and its JSON is the artifact, so a run without a
// key reuses today's answers rather than dropping them. Regenerating the
// report on the site half alone used to blank section 2, which quietly
// replaced a completed measurement with the word "Pending".
const askFile = join(outDir, `ask-${stamp}.json`);
let a = null;
if (process.env.OPENROUTER_API_KEY) {
  console.log(`asking models ...`);
  a = await ask({});
  writeFileSync(askFile, JSON.stringify(a, null, 2));
} else if (existsSync(askFile)) {
  a = JSON.parse(readFileSync(askFile, "utf8"));
  console.log(`reusing today's LLM answers from ${askFile} (no key set)`);
} else {
  console.log(`skipping the LLM half: OPENROUTER_API_KEY is not set`);
}

// The consumer-app half is hand-written, so the report links it and counts
// recorded verdicts rather than inlining it. Counting a template's empty code
// fences was the first approach and it reported "0 of 0" the moment the file
// stopped being a template, which is a false negative about our own evidence.
// A settled `mentioned: **yes**` or `**no**` line is what a finished entry
// looks like, whatever shape the prose around it takes.
const controlFile = join(outDir, `control-${stamp}.md`);
let control;
if (existsSync(controlFile)) {
  const txt = readFileSync(controlFile, "utf8");
  const recorded = [...txt.matchAll(/mentioned:\s*\*\*(yes|no)\*\*/gi)];
  const noMention = recorded.filter((m) => m[1].toLowerCase() === "no").length;
  control =
    recorded.length === 0
      ? `**Pending.** No answers recorded yet in [\`control-${stamp}.md\`](./control-${stamp}.md).`
      : `${recorded.length} answers recorded in [\`control-${stamp}.md\`](./control-${stamp}.md), ` +
        `ReGen Civics unmentioned in ${noMention} of them. Method and the apps still ` +
        `needing an account are in that file.`;
} else {
  control = `**Pending.** No \`control-${stamp}.md\` yet.`;
}

const file = join(outDir, `BASELINE-${stamp}.md`);
writeFileSync(file, report(c, a, control));
console.log(`\nwrote ${file}`);
