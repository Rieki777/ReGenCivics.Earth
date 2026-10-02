import { describe, expect, it } from "vitest";
import { SignJWT } from "jose";
import { checkinUrlForToken, signCheckinToken, verifyCheckinToken } from "./checkinToken";

const secret = "unit-test-checkin-secret";

describe("checkin tokens", () => {
  it("round-trips one event and one email", async () => {
    const token = await signCheckinToken(12, " Ada@Farm.example ", { secret });
    expect(await verifyCheckinToken(token, { secret })).toEqual({
      eventId: 12,
      email: "ada@farm.example",
    });
  });

  it("rejects the shared event token and a token signed for something else", async () => {
    expect(await verifyCheckinToken("6c1b4e2a-9f0d-4a1b-8c3d-111111111111", { secret })).toBeNull();
    const other = await new SignJWT({ purpose: "newsletter-prefs", email: "ada@farm.example" })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("1h")
      .sign(new TextEncoder().encode(secret));
    expect(await verifyCheckinToken(other, { secret })).toBeNull();
  });

  it("puts the token in a query string so the address is not part of the link", () => {
    const url = checkinUrlForToken("https://regencivics.earth", "abc.def.ghi");
    expect(url).toBe("https://regencivics.earth/checkin?token=abc.def.ghi");
    expect(url).not.toContain("@");
  });
});
