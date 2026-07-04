/**
 * Protected-paths guard (Rung 3 CI gate) — pure unit tests.
 *
 * checkDiff is the fail-closed logic that decides what a machine-authored
 * assembly/* PR may touch. No DB, no git: runs in the fast test lane. Uses
 * the real .github/assembly-protected-paths.json so a config edit that
 * weakens the guard fails these tests.
 */
import { describe, expect, it } from "vitest";
// @ts-expect-error plain .mjs module, typed loosely on purpose
import { checkDiff, globMatch, loadProtectedConfig } from "../scripts/check-protected-paths.mjs";

const config = loadProtectedConfig();
const SCOPE = ["client/src/pages/Assembly*", "server/routes/assembly.ts"];

describe("globMatch", () => {
  it("matches ** across directory depth", () => {
    expect(globMatch("server/_core/**", "server/_core/auth/jwt.ts")).toBe(true);
    expect(globMatch("server/_core/**", "server/routes/forum.ts")).toBe(false);
  });
  it("matches * within a single segment", () => {
    expect(globMatch("client/src/pages/Assembly*", "client/src/pages/AssemblyPage.tsx")).toBe(true);
    expect(globMatch("client/src/pages/Assembly*", "client/src/pages/deep/AssemblyPage.tsx")).toBe(false);
  });
  it("escapes regex metacharacters in paths", () => {
    expect(globMatch("package.json", "package.json")).toBe(true);
    expect(globMatch("package.json", "packageXjson")).toBe(false);
  });
});

describe("checkDiff fail-closed behavior", () => {
  it("rejects everything when no scopePaths are declared", () => {
    const r = checkDiff(["client/src/pages/AssemblyPage.tsx"], [], config);
    expect(r.ok).toBe(false);
    expect(r.violations[0]).toMatch(/fail closed/i);
  });

  it("rejects a protected path even when the scope claims it", () => {
    const r = checkDiff(["server/lib/evolution.ts"], ["server/lib/evolution.ts"], config);
    expect(r.ok).toBe(false);
    expect(r.violations[0]).toMatch(/protected/);
  });

  it("rejects token-guarded files (the machine never writes tokens)", () => {
    const r = checkDiff(["server/db.ts"], ["server/**"], config);
    expect(r.ok).toBe(false);
    expect(r.violations[0]).toMatch(/protected/);
  });

  it("rejects files outside the declared scope", () => {
    const r = checkDiff(["server/routes/forum.ts"], SCOPE, config);
    expect(r.ok).toBe(false);
    expect(r.violations[0]).toMatch(/outside the declared scopePaths/);
  });

  it("accepts in-scope, unprotected files", () => {
    const r = checkDiff(["client/src/pages/AssemblyPage.tsx", "server/routes/assembly.ts"], SCOPE, config);
    expect(r.ok).toBe(true);
    expect(r.violations).toEqual([]);
  });
});

describe("checkDiff drizzle content scan", () => {
  const migration = "drizzle/0999_machine_feature.sql";

  it("allows an additive migration (CREATE + INSERT only)", () => {
    const r = checkDiff([migration], SCOPE, config, () =>
      "CREATE TABLE IF NOT EXISTS machine_notes (id INT); INSERT INTO machine_notes VALUES (1)"
    );
    expect(r.ok).toBe(true);
  });

  it.each(["DROP TABLE quests", "TRUNCATE quests", "ALTER TABLE quests ADD COLUMN x INT", "DELETE FROM quests WHERE 1=1"])(
    "rejects a migration containing %s",
    (sqlBody) => {
      const r = checkDiff([migration], SCOPE, config, () => sqlBody);
      expect(r.ok).toBe(false);
      expect(r.violations[0]).toMatch(/may only CREATE tables, ADD columns, or INSERT seeds/);
    }
  );
});

describe("the config itself keeps its teeth", () => {
  it("still protects the governance core", () => {
    const globs = [...config.protectedGlobs, ...config.tokenGuardedGlobs];
    for (const must of [
      "server/lib/evolution.ts",
      "server/lib/github-governance.ts",
      "scripts/check-protected-paths.mjs",
      ".github/**",
      "server/db.ts",
    ]) {
      expect(globs).toContain(must);
    }
  });
});
