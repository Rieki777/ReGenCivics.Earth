/**
 * The ship gate, runnable on any machine this repo is worked from.
 *
 * Why this exists: the gate used to live only as prose in CLAUDE.md, and the
 * prose was wrong in two ways that no one noticed for three months.
 *
 *   - `pnpm typecheck` named a script that has never existed in package.json
 *     (the real one is `check`). It was copied into 30+ docs from there.
 *   - `python3` is correct on the Linux cowork VM the gate was authored for,
 *     but on Windows it resolves to a Microsoft Store stub that prints an ad
 *     and exits 0 WITHOUT running the audit — a green gate that checked nothing.
 *
 * Both failed silently: whoever hit them substituted a working command by hand
 * and moved on, so the docs never got corrected. A gate you have to translate
 * before running is a gate that eventually gets skipped. This runs it instead.
 *
 * Usage: pnpm gate
 */
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";

/**
 * Find a Python that actually runs. On Windows, `py` (the official launcher) is
 * tried first: bare `python3`/`python` there are usually App Execution Alias
 * stubs that redirect to the Store rather than execute anything.
 */
function findPython() {
  const candidates = process.platform === "win32"
    ? ["py", "python3", "python"]
    : ["python3", "python"];
  for (const bin of candidates) {
    // -c is the probe: a Store stub fails this, a real interpreter prints ok.
    const probe = spawnSync(bin, ["-c", "print('ok')"], { encoding: "utf8" });
    if (probe.status === 0 && probe.stdout.trim() === "ok") return bin;
  }
  return null;
}

function run(label, cmd, args) {
  process.stdout.write(`\n── ${label}\n   $ ${cmd} ${args.join(" ")}\n`);
  // No shell: it is unnecessary once every binary is addressed directly, and it
  // would mean concatenating args into a command line rather than escaping them.
  const res = spawnSync(cmd, args, { stdio: "inherit" });
  if (res.error) {
    process.stdout.write(`\n✗ ${label} could not start: ${res.error.message}\n`);
    process.exit(1);
  }
  if (res.status !== 0) {
    process.stdout.write(`\n✗ ${label} FAILED (exit ${res.status})\n`);
    process.exit(res.status ?? 1);
  }
}

const AUDIT = "scripts/audit-truncation.py";

// Gate 1: no truncated source files.
if (!existsSync(AUDIT)) {
  console.error(`✗ ${AUDIT} is missing. The truncation gate cannot run.`);
  process.exit(1);
}
const python = findPython();
if (!python) {
  console.error(
    "✗ No working Python interpreter found (tried: " +
      (process.platform === "win32" ? "py, python3, python" : "python3, python") +
      ").\n" +
      "  The truncation gate cannot run. Install Python — on Windows, from python.org\n" +
      "  rather than the Store, so the `py` launcher is registered.\n" +
      "  Do NOT skip this gate: FUSE truncation is silent and typecheck will not catch it.",
  );
  process.exit(1);
}
run("gate 1: truncation audit", python, [AUDIT]);

// Gate 1b: no invisible tap blockers. Added 2026-07-17 after the
// WizardRadialMenu dead zone shipped: a mounted opacity-0 menu made the
// bottom-right ~600px of every phone screen swallow taps (profile tabs,
// gratitude toggles), invisible in every screenshot and absent on desktop
// where the element is md:hidden. Static review missed it three times.
// STRONG findings fail the gate; WARN findings are informational.
// Suppress a reviewed finding with a `tap-audit-ok` comment on the line
// above the className — only after checking the element's real hit-box.
const TAP_AUDIT = "scripts/audit-tap-blockers.py";
if (existsSync(TAP_AUDIT)) {
  run("gate 1b: tap-blocker audit", python, [TAP_AUDIT]);
}

// Gate 1c: no touch targets capped below 44px. The base ui components carry
// pointer-coarse: floors in their variants; raw <button>/[role=button]
// elements are currently rescued by a transitional max-width:767px
// min-height blanket in index.css that Phase 5 of
// MOBILE_FIRST_MASTER_PLAN.md deletes. This gate keeps new raw elements
// self-sufficient so that deletion stays safe. STRONG findings fail the
// gate; WARN findings are informational. Suppress a reviewed finding with a
// `touch-ok` comment on or up to 2 lines above the element, only for a
// <button>/[role=button] whose small visual is intentional (the ::after
// expander still gives those a 44px hit area).
const TOUCH_AUDIT = "scripts/audit-touch-targets.py";
if (existsSync(TOUCH_AUDIT)) {
  run("gate 1c: touch-target audit", python, [TOUCH_AUDIT]);
}

// Gate 3: types clean. (Gate 2 is the per-className grep — it needs the name of
// the class you added, so it stays a manual step; see CLAUDE.md.)
// Address tsc's entry script through node rather than the .bin shim, so this
// needs no shell and behaves the same on Windows and Linux.
const TSC = "node_modules/typescript/bin/tsc";
if (!existsSync(TSC)) {
  console.error(`✗ ${TSC} is missing. Run \`pnpm install\` first.`);
  process.exit(1);
}
run("gate 3: typecheck", process.execPath, [TSC, "--noEmit"]);

process.stdout.write(
  "\n✓ Gates 1, 1b, 1c and 3 pass.\n" +
    "  Gate 2 is manual — for each className or @keyframes you added:\n" +
    "    rg -g '*.css' '<the-name>' client/src/\n",
);
