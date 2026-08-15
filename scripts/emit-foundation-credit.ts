/**
 * create-land-game step: emit the foundation credit into a generated game.
 *
 * CUSTOM_GAMES_MASTER_PLAN.md B3 #17 (the scaffold) and #23 (the credit). This
 * is the credit half, written as its own runnable step so it works the day the
 * rest of the scaffold lands and does not wait on it. Deterministic, no LLM,
 * runs in under a second.
 *
 * Two modes.
 *
 *   emit   Read a blueprint, validate it, and write the credit into a game repo:
 *          the owner-editable config, the portable module, and a prerendered
 *          HTML block a server can splice in without importing anything.
 *
 *   check  Fetch a deployed game with no JavaScript and prove the credit links
 *          are in the HTML a crawler actually receives. This is the "crawlable
 *          at request time" evidence gate from the master plan, mechanical
 *          rather than a promise, so it can run in CI per deployment.
 *
 * Usage:
 *   npx tsx scripts/emit-foundation-credit.ts emit <blueprint.json> <game-repo-dir> [--dry-run]
 *   npx tsx scripts/emit-foundation-credit.ts check <url> [more urls...]
 *
 * The credit is default on and the owner can remove it: after handoff they edit
 * data/foundation-credit.json in their own repo and set enabled to false. They
 * bought the whole game. Nothing here reaches back into it.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync, copyFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { blueprintSchema } from "../shared/customGameBlueprint";
import {
  CREDIT_PLACEMENTS,
  assertCleanAnchors,
  creditConfig,
  creditText,
  guidePromptLine,
  renderCreditInjection,
  type CreditPlacement,
  type FoundationCreditConfig,
} from "../shared/foundationCredit";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function die(msg: string): never {
  console.error(`\n✗ ${msg}\n`);
  process.exit(1);
}

/** Stable slug from the project name. Becomes the ?ref= value, so it never changes. */
function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 40);
}

// ── emit ─────────────────────────────────────────────────────────────────────

function emit(blueprintPath: string, targetDir: string, dryRun: boolean): void {
  if (!existsSync(blueprintPath)) die(`No blueprint at ${blueprintPath}`);
  if (!dryRun && !existsSync(targetDir)) die(`No game repo at ${targetDir}`);

  let raw: unknown;
  try {
    raw = JSON.parse(readFileSync(blueprintPath, "utf-8"));
  } catch (err) {
    die(`${blueprintPath} is not valid JSON: ${(err as Error).message}`);
  }

  const parsed = blueprintSchema.safeParse(raw);
  if (!parsed.success) {
    die(
      `Blueprint failed validation. A game is only scaffolded from a complete blueprint.\n` +
        parsed.error.issues.map((i) => `  ${i.path.join(".")}: ${i.message}`).join("\n"),
    );
  }
  const blueprint = parsed.data;

  // The anchors ship into someone else's website, so they are reviewed on the
  // way out as well as in the test suite.
  assertCleanAnchors();

  const config: FoundationCreditConfig = creditConfig({
    ...blueprint.branding.foundationCredit,
    gameId: slugify(blueprint.identity.projectName),
  });

  if (!config.gameId) die("Could not derive a game id from identity.projectName.");

  const placements = CREDIT_PLACEMENTS.filter(
    (p) => creditText(config, p).length > 0,
  ) as CreditPlacement[];

  const configJson = `${JSON.stringify(config, null, 2)}\n`;
  const injectionHtml = `${renderCreditInjection(config, placements.filter((p) => p !== "guide"))}\n`;
  const guideLine = guidePromptLine(config);

  const files: Array<{ rel: string; contents: string }> = [
    { rel: "data/foundation-credit.json", contents: configJson },
    { rel: "data/foundation-credit.html", contents: injectionHtml },
    { rel: "docs/FOUNDATION_CREDIT.md", contents: ownerDoc(config, placements, guideLine) },
  ];

  console.log(`\nFoundation credit for ${blueprint.identity.projectName} (ref=${config.gameId})`);
  console.log(`  enabled: ${config.enabled}    style: ${config.style}    guide mention: ${config.guideMention}`);
  for (const p of placements) console.log(`  ${p.padEnd(6)} ${creditText(config, p)}`);
  if (!config.enabled) console.log("  (credit off in the blueprint; files still written so it can be switched on)");

  if (dryRun) {
    console.log(`\n-- dry run, nothing written --\n`);
    console.log(injectionHtml);
    return;
  }

  for (const f of files) {
    const full = path.join(targetDir, f.rel);
    mkdirSync(path.dirname(full), { recursive: true });
    writeFileSync(full, f.contents, "utf-8");
    console.log(`  wrote ${f.rel}`);
  }

  // The renderer travels with the game so its React footer and its server render
  // one source. Copied rather than depended on: the game owns its code.
  const moduleSrc = path.join(REPO_ROOT, "shared", "foundationCredit.ts");
  const moduleDest = path.join(targetDir, "shared", "foundationCredit.ts");
  mkdirSync(path.dirname(moduleDest), { recursive: true });
  copyFileSync(moduleSrc, moduleDest);
  console.log(`  wrote shared/foundationCredit.ts`);

  console.log(
    `\nNext: the game's HTML handler splices data/foundation-credit.html before <div id="root">,` +
      `\nand its footer renders creditParts(config, "footer"). Then prove it:` +
      `\n  npx tsx scripts/emit-foundation-credit.ts check https://<their-domain>\n`,
  );
}

function ownerDoc(
  config: FoundationCreditConfig,
  placements: CreditPlacement[],
  guideLine: string,
): string {
  const lines = placements.map((p) => `- **${p}**: ${creditText(config, p)}`);
  return `# The ReGen Civics credit

Your game carries a short credit line linking back to ReGen Civics. It is on by
default and it is yours to remove.

## What it says

${lines.join("\n")}

${guideLine ? `Your guide may also mention it once during onboarding:\n\n> ${guideLine}\n` : ""}
## Turning it off

Edit \`data/foundation-credit.json\` and set \`"enabled": false\`, then redeploy.
Every placement stops rendering. You own this game outright, so no permission is
needed and nothing reaches back in to change it.

## Turning it up

\`"style"\` takes \`"footer"\`, \`"about"\`, or \`"both"\`. \`"guideMention"\`
controls whether your guide can name the network in conversation. The available
credit lines are listed in \`shared/foundationCredit.ts\`.

## Why it is here

Every game in the network links back to regencivics.earth, and
[regencivics.earth/network](https://regencivics.earth/network) links back out to
every game, including yours. That is how the next land project finds this work,
and how yours gets found.
`;
}

// ── check ────────────────────────────────────────────────────────────────────

/**
 * The no-JavaScript check. Fetches the page the way GPTBot, ClaudeBot, and
 * PerplexityBot do (plain HTTP GET, no rendering) and asserts the credit links
 * are in the bytes that come back.
 */
async function check(urls: string[]): Promise<void> {
  let failed = 0;

  for (const url of urls) {
    process.stdout.write(`\n${url}\n`);
    let html: string;
    try {
      const res = await fetch(url, {
        headers: {
          // The real thing. If the credit only shows up for a browser user
          // agent, that is cloaking and we want the check to fail.
          "user-agent": "Mozilla/5.0 (compatible; ClaudeBot/1.0; +claudebot@anthropic.com)",
          accept: "text/html",
        },
      });
      if (!res.ok) {
        console.log(`  ✗ HTTP ${res.status}`);
        failed++;
        continue;
      }
      html = await res.text();
    } catch (err) {
      console.log(`  ✗ fetch failed: ${(err as Error).message}`);
      failed++;
      continue;
    }

    const anchors = [...html.matchAll(/<a\b[^>]*href="([^"]*regencivics\.earth[^"]*)"[^>]*>([^<]*)<\/a>/gi)];
    if (!anchors.length) {
      console.log(`  ✗ no regencivics.earth link in the raw HTML (${html.length} bytes)`);
      console.log(`    A React-only footer looks exactly like this to a crawler.`);
      failed++;
      continue;
    }

    for (const [, href, anchor] of anchors) {
      console.log(`  ✓ ${anchor.trim()} -> ${href}`);
    }

    const nofollow = /<a\b[^>]*regencivics\.earth[^>]*rel="[^"]*nofollow/i.test(html);
    if (nofollow) {
      console.log(`  ✗ a credit link carries rel=nofollow`);
      failed++;
    }
    if (!/\bref=/.test(anchors.map((a) => a[1]).join(" "))) {
      console.log(`  ! no ?ref= on any credit link, so referral clicks will not be attributed`);
    }
  }

  console.log(
    failed
      ? `\n✗ ${failed} of ${urls.length} failed the no-JS crawl check\n`
      : `\n✓ all ${urls.length} carry the credit in request-time HTML\n`,
  );
  if (failed) process.exit(1);
}

// ── entry ────────────────────────────────────────────────────────────────────

const [mode, ...rest] = process.argv.slice(2);

if (mode === "emit") {
  const args = rest.filter((a) => !a.startsWith("--"));
  if (args.length < 2) {
    die("Usage: emit-foundation-credit.ts emit <blueprint.json> <game-repo-dir> [--dry-run]");
  }
  emit(path.resolve(args[0]), path.resolve(args[1]), rest.includes("--dry-run"));
} else if (mode === "check") {
  if (!rest.length) die("Usage: emit-foundation-credit.ts check <url> [more urls...]");
  await check(rest);
} else {
  die(
    "Pick a mode.\n" +
      "  emit  <blueprint.json> <game-repo-dir> [--dry-run]\n" +
      "  check <url> [more urls...]",
  );
}
