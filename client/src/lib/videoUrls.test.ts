/**
 * Videos must never be routed through /api/img.
 *
 * /api/img (server/routes/global.ts) is a Sharp IMAGE proxy. Handed an .mp4 it
 * pulls the whole object out of R2 into the Node process, calls
 * sharp(buffer).metadata(), throws "Input buffer contains unsupported image
 * format", and only from the catch block does it 302 to the original URL. The
 * cost per video, per visitor:
 *
 *   - the entire file buffered in server RAM (the /land hero is 33.7 MB)
 *   - a failed Sharp parse, which was logging in production on 2026-09-03
 *   - a redirect round trip
 *   - the browser downloading the file a SECOND time, direct from R2
 *
 * and because the proxy buffers rather than streams, the browser's Range header
 * is discarded, so nothing plays progressively until all of that finishes.
 *
 * The direct R2 URL answers Range with 206 and streams straight away. This test
 * pins that: video URLs go direct, images keep using cdnImg.
 */
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const SRC = join(process.cwd(), "client", "src");
const VIDEO_EXT = /\.(mp4|webm|mov|m4v)/i;

function sourceFiles(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (entry === "node_modules") continue;
      sourceFiles(full, out);
    } else if (/\.(ts|tsx)$/.test(entry)) {
      out.push(full);
    }
  }
  return out;
}

describe("video asset URLs", () => {
  const files = sourceFiles(SRC);

  it("finds source files to scan", () => {
    expect(files.length).toBeGreaterThan(100);
  });

  it("never wraps a video URL in cdnImg()", () => {
    const offenders: string[] = [];

    for (const file of files) {
      const text = readFileSync(file, "utf8");
      // cdnImg( ... .mp4 ... ) on a single line, which is how every call site
      // in this codebase is written.
      const re = /cdnImg\(\s*["'`][^"'`]*\.(?:mp4|webm|mov|m4v)[^"'`]*["'`]/gi;
      for (const m of text.matchAll(re)) {
        const line = text.slice(0, m.index).split("\n").length;
        offenders.push(`${file.replace(process.cwd(), "")}:${line}  ${m[0]}`);
      }
    }

    expect(offenders, `Route these straight at R2 instead:\n${offenders.join("\n")}`).toEqual([]);
  });

  it("keeps every asset video pointing at the R2 origin", () => {
    const bad: string[] = [];

    for (const file of files) {
      if (file.endsWith("videoUrls.test.ts")) continue;
      const text = readFileSync(file, "utf8");
      for (const m of text.matchAll(/["'`](\/api\/img[^"'`]*)["'`]/g)) {
        if (VIDEO_EXT.test(m[1])) {
          bad.push(`${file.replace(process.cwd(), "")}  ${m[1]}`);
        }
      }
    }

    expect(bad, `Hard-coded /api/img video URLs:\n${bad.join("\n")}`).toEqual([]);
  });
});
