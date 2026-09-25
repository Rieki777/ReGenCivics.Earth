/**
 * The tools directory's input, adversarially.
 *
 * The repo field is public, unauthenticated, and ends up in an href. React
 * escapes text but not the target of a link, so a `javascript:` URL here is a
 * script that runs when somebody clicks a name in the directory. These tests
 * exist mostly to keep that closed.
 */

import { describe, expect, it } from "vitest";
import { cleanAgent, cleanRepoUrl, repoLabel } from "./interopTools";

describe("cleanRepoUrl", () => {
  it("keeps ordinary https repos", () => {
    expect(cleanRepoUrl("https://github.com/Rieki777/ReGenCivics.Earth")).toBe(
      "https://github.com/Rieki777/ReGenCivics.Earth",
    );
    expect(cleanRepoUrl("https://gitlab.com/group/project")).toBe("https://gitlab.com/group/project");
    expect(cleanRepoUrl("http://git.example.org/thing")).toBe("http://git.example.org/thing");
  });

  it("assumes https for the scheme-less paste people actually make", () => {
    expect(cleanRepoUrl("github.com/owner/repo")).toBe("https://github.com/owner/repo");
    expect(cleanRepoUrl("  codeberg.org/owner/repo  ")).toBe("https://codeberg.org/owner/repo");
  });

  it("refuses every scheme that is not http or https", () => {
    // The one that matters: this would run on click if it reached an href.
    expect(cleanRepoUrl("javascript:alert(1)")).toBeNull();
    expect(cleanRepoUrl("JavaScript:alert(1)")).toBeNull();
    expect(cleanRepoUrl("data:text/html,<script>alert(1)</script>")).toBeNull();
    expect(cleanRepoUrl("vbscript:msgbox(1)")).toBeNull();
    expect(cleanRepoUrl("file:///etc/passwd")).toBeNull();
    expect(cleanRepoUrl("ftp://example.com/x")).toBeNull();
  });

  it("refuses blanks, nonsense and non-strings", () => {
    expect(cleanRepoUrl(undefined)).toBeNull();
    expect(cleanRepoUrl(null)).toBeNull();
    expect(cleanRepoUrl("")).toBeNull();
    expect(cleanRepoUrl("   ")).toBeNull();
    expect(cleanRepoUrl(42 as unknown as string)).toBeNull();
  });

  it("refuses a host nobody else could open", () => {
    // A bare word becomes https://localhost-style with no dot: not a repo.
    expect(cleanRepoUrl("myrepo")).toBeNull();
    expect(cleanRepoUrl("localhost")).toBeNull();
  });

  it("refuses a URL too long for the column, rather than letting MySQL cut it", () => {
    expect(cleanRepoUrl("https://example.com/" + "a".repeat(600))).toBeNull();
    expect(cleanRepoUrl("https://example.com/" + "a".repeat(400))).not.toBeNull();
  });

  it("drops a trailing slash so the same repo is one entry", () => {
    expect(cleanRepoUrl("https://github.com/owner/repo/")).toBe("https://github.com/owner/repo");
    expect(cleanRepoUrl("https://github.com/owner/repo///")).toBe("https://github.com/owner/repo");
  });
});

describe("cleanAgent", () => {
  it("keeps a plain name", () => {
    expect(cleanAgent("Claude Code")).toBe("Claude Code");
    expect(cleanAgent("  my own  ")).toBe("my own");
  });

  it("treats blank and non-strings as nothing", () => {
    expect(cleanAgent(undefined)).toBeNull();
    expect(cleanAgent("")).toBeNull();
    expect(cleanAgent("   ")).toBeNull();
    expect(cleanAgent(7 as unknown as string)).toBeNull();
  });

  it("strips control and bidi characters, like the display name does", () => {
    expect(cleanAgent("Claude\nCode")).toBe("ClaudeCode");
    expect(cleanAgent("Claude\u202Ereversed")).toBe("Claudereversed");
    expect(cleanAgent("\uFEFFClaude")).toBe("Claude");
  });

  it("bounds to the column width", () => {
    expect(cleanAgent("a".repeat(400))).toHaveLength(120);
  });
});

describe("repoLabel", () => {
  it("shows owner/repo where there is one", () => {
    expect(repoLabel("https://github.com/Rieki777/ReGenCivics.Earth")).toBe("Rieki777/ReGenCivics.Earth");
    expect(repoLabel("https://gitlab.com/group/project")).toBe("group/project");
  });

  it("falls back to the host for a bare domain", () => {
    expect(repoLabel("https://example.com")).toBe("example.com");
  });

  it("never throws on something unparseable", () => {
    expect(repoLabel("not a url")).toBe("not a url");
  });
});

describe("what the register accepts from a raised hand", () => {
  it("takes the hub page or docs people actually have, not only a git host", () => {
    // The ask is "somewhere the Circle can open", so a docs site or a notion
    // page is as valid as a repo.
    expect(cleanRepoUrl("https://docs.mytool.dev")).toBe("https://docs.mytool.dev");
    expect(cleanRepoUrl("mytool.dev/stack")).toBe("https://mytool.dev/stack");
    expect(cleanRepoUrl("https://www.notion.so/team/our-stack")).toBe("https://www.notion.so/team/our-stack");
  });

  it("still refuses a link that would run code when the Circle clicks it", () => {
    // The register renders these as real links, so this is the whole point.
    expect(cleanRepoUrl("javascript:fetch('/steal')")).toBeNull();
    expect(cleanRepoUrl("data:text/html,<script>1</script>")).toBeNull();
  });

  it("refuses an address only the author can open", () => {
    // Not a security rule, a usefulness one: interoperability needs the other
    // agents to be able to read it.
    expect(cleanRepoUrl("localhost")).toBeNull();
    expect(cleanRepoUrl("myrepo")).toBeNull();
  });
});
