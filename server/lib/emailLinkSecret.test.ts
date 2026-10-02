import { afterEach, describe, expect, it } from "vitest";
import { SignJWT } from "jose";
import { ENV } from "../_core/env";
import { signEmailLink, verifyEmailLink } from "./emailLinkSecret";

const LEGACY = "legacy-jwt-secret-for-email-links";
const DEDICATED = "dedicated-email-link-secret-value";

describe("email link secret", () => {
  const previousDedicated = process.env.EMAIL_LINK_SECRET;
  const previousCookie = ENV.cookieSecret;

  afterEach(() => {
    if (previousDedicated === undefined) delete process.env.EMAIL_LINK_SECRET;
    else process.env.EMAIL_LINK_SECRET = previousDedicated;
    (ENV as { cookieSecret: string }).cookieSecret = previousCookie;
  });

  it("signs with JWT_SECRET when EMAIL_LINK_SECRET is unset", async () => {
    delete process.env.EMAIL_LINK_SECRET;
    (ENV as { cookieSecret: string }).cookieSecret = LEGACY;
    const token = await signEmailLink({ email: "ada@example.org", purpose: "newsletter-prefs" }, "365d");
    expect(await verifyEmailLink(token)).toMatchObject({ email: "ada@example.org" });
  });

  it("signs new links with EMAIL_LINK_SECRET and still opens a JWT_SECRET link", async () => {
    (ENV as { cookieSecret: string }).cookieSecret = LEGACY;
    const oldToken = await new SignJWT({ email: "old@example.org", purpose: "newsletter-prefs" })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("365d")
      .sign(new TextEncoder().encode(LEGACY));

    process.env.EMAIL_LINK_SECRET = DEDICATED;
    const fresh = await signEmailLink({ email: "new@example.org", purpose: "newsletter-confirm" }, "24h");

    expect(await verifyEmailLink(oldToken)).toMatchObject({ email: "old@example.org" });
    expect(await verifyEmailLink(fresh)).toMatchObject({ email: "new@example.org", purpose: "newsletter-confirm" });

    (ENV as { cookieSecret: string }).cookieSecret = "some-other-session-secret";
    expect(await verifyEmailLink(fresh)).toMatchObject({ email: "new@example.org" });
    expect(await verifyEmailLink(oldToken)).toBeNull();
  });
});
