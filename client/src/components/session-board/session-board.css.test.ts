import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const css = readFileSync(path.join(process.cwd(), "client/src/components/session-board/session-board.css"), "utf8");

describe("session board shell", () => {
  it("clips the shell so screen-reader text cannot stretch the page", () => {
    expect(css).toMatch(/\.sb-app \{[^}]*position:\s*relative;/s);
    expect(css).toMatch(/\.sb-app \{[^}]*overflow:\s*clip;/s);
    expect(css).toMatch(/\.sb-main \{[^}]*position:\s*relative;/s);
    expect(css).toMatch(/\.sb-main \{[^}]*overscroll-behavior:\s*contain;/s);
  });

  it("stacks the seat cards below 1200px", () => {
    expect(css).toMatch(
      /@media \(max-width: 1200px\) \{\s*\.sb-rolecard-row \{ grid-template-columns: minmax\(0, 1fr\); max-width: none; \}/,
    );
  });
});
