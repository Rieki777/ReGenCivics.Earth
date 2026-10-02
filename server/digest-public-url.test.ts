/**
 * The weekly community digest ("This week in the community", Weekly Round-Up)
 * builds every site link from the public base URL. A Railway APP_BASE_URL of
 * https://regencivics.com must still send readers to https://regencivics.earth.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { getAppBaseUrl, toAbsoluteUrl, wrapLinksWithTracking } from "./_core/email";
import { buildCommunityDigestHtml, digestPublicUrl } from "./jobs/digestJob";
import { SITE_ORIGIN } from "../shared/siteContext";

const ENV_KEYS = ["APP_BASE_URL", "APP_URL", "VITE_APP_URL"] as const;
const saved: Partial<Record<(typeof ENV_KEYS)[number], string | undefined>> = {};

function rememberEnv() {
  for (const key of ENV_KEYS) saved[key] = process.env[key];
}

function restoreEnv() {
  for (const key of ENV_KEYS) {
    const value = saved[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
}

rememberEnv();
afterEach(() => {
  restoreEnv();
});

describe("weekly digest links ignore a regencivics.com override", () => {
  it("builds the quiet-week letter on .earth", () => {
    process.env.APP_BASE_URL = "https://regencivics.com";
    delete process.env.APP_URL;
    delete process.env.VITE_APP_URL;

    expect(getAppBaseUrl()).toBe(SITE_ORIGIN);
    expect(digestPublicUrl("/blog/how-to-apply-for-season-2")).toBe(
      `${SITE_ORIGIN}/blog/how-to-apply-for-season-2`,
    );
    expect(toAbsoluteUrl("/community")).toContain(`${SITE_ORIGIN}/community`);
    expect(toAbsoluteUrl("https://www.regencivics.com/join")).toBe(`${SITE_ORIGIN}/join`);

    const html = buildCommunityDigestHtml({
      posts: [],
      weekNum: 0,
      weekLabel: "September 28, 2026",
    });

    expect(html).toContain("Weekly Round-Up · September 28, 2026");
    expect(html).toContain("From the blog");
    expect(html).toContain("The community has been quiet this week");
    expect(html).toContain(`${SITE_ORIGIN}/blog/what-makes-regen-civics-different?utm_source=email`);
    expect(html).toContain(`${SITE_ORIGIN}/blog/introducing-games-and-quests?utm_source=email`);
    expect(html).toContain(`${SITE_ORIGIN}/fund?utm_source=email`);
    expect(html).toContain(`${SITE_ORIGIN}/community?utm_source=email`);
    expect(html).not.toMatch(/regencivics\.com/i);
  });

  it("rewrites retired links that arrived inside forum excerpts", () => {
    process.env.APP_BASE_URL = "https://www.regencivics.com";
    const html = buildCommunityDigestHtml({
      posts: [
        { id: 12, title: "Land call", content: "Read https://regencivics.com/apply before Thursday.", replyCount: 2 },
        { id: 13, title: "Season", content: "http://www.regencivics.com/season2", replyCount: 1 },
        { id: 14, title: "Map", content: "See the map.", replyCount: 0 },
      ],
      weekNum: 4,
      weekLabel: "September 28, 2026",
      assemblySection: `<a href="${digestPublicUrl("/assembly?utm_source=email&utm_medium=digest&utm_campaign=weekly")}">Visit the Assembly</a>`,
    });
    expect(html).toContain(`${SITE_ORIGIN}/community/post/12`);
    expect(html).toContain(`${SITE_ORIGIN}/apply`);
    expect(html).toContain(`${SITE_ORIGIN}/season2`);
    expect(html).toContain(`${SITE_ORIGIN}/assembly`);
    expect(html).not.toMatch(/regencivics\.com/i);
  });

  it("falls through APP_URL and VITE_APP_URL when APP_BASE_URL is unset", () => {
    delete process.env.APP_BASE_URL;
    process.env.APP_URL = "https://regencivics.com";
    expect(getAppBaseUrl()).toBe(SITE_ORIGIN);
    expect(digestPublicUrl("/schedule")).toBe(`${SITE_ORIGIN}/schedule`);

    delete process.env.APP_URL;
    process.env.VITE_APP_URL = "http://www.regencivics.com";
    expect(getAppBaseUrl()).toBe(SITE_ORIGIN);
  });

  it("keeps a localhost base", () => {
    process.env.APP_BASE_URL = "http://localhost:3000";
    expect(getAppBaseUrl()).toBe("http://localhost:3000");
    expect(digestPublicUrl("/join")).toBe("http://localhost:3000/join");
  });

  it("click tracking does not embed the retired host", () => {
    process.env.APP_BASE_URL = "https://regencivics.com";
    process.env.JWT_SECRET = process.env.JWT_SECRET || "digest-url-test-secret";
    const html = wrapLinksWithTracking('<a href="https://regencivics.com/blog/how-to-apply-for-season-2">Read</a>', 3);
    expect(html).not.toMatch(/regencivics\.com/i);
    expect(decodeURIComponent(html)).toContain(`${SITE_ORIGIN}/blog/how-to-apply-for-season-2`);
  });
});

describe("APP_BASE_URL snapshot at import", () => {
  it("is .earth even when the module loads with a .com override", async () => {
    vi.resetModules();
    process.env.APP_BASE_URL = "https://regencivics.com";
    delete process.env.APP_URL;
    delete process.env.VITE_APP_URL;
    const email = await import("./_core/email");
    expect(email.APP_BASE_URL).toBe(SITE_ORIGIN);
    expect(email.APP_BASE_URL).not.toMatch(/regencivics\.com/i);
    restoreEnv();
    vi.resetModules();
  });
});
