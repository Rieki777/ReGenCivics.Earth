import { describe, expect, it } from "vitest";
import { subscriberGetsUnsubscribeConfirm, unsubscribeConfirmLetter } from "./unsubscribeConfirm";

describe("typed unsubscribe confirmation", () => {
  it("sends a confirmation only when the address is already a subscriber", () => {
    expect(subscriberGetsUnsubscribeConfirm(null)).toBe(false);
    expect(subscriberGetsUnsubscribeConfirm(undefined)).toBe(false);
    expect(subscriberGetsUnsubscribeConfirm({ email: "ada@example.org" })).toBe(true);
  });

  it("escapes the preferences link and does not claim the address is already removed", () => {
    const letter = unsubscribeConfirmLetter('https://regencivics.earth/email-preferences?token=a&b=<script>');
    expect(letter.subject).toBe("Confirm your ReGen Civics email choices");
    expect(letter.html).toContain("https://regencivics.earth/email-preferences?token=a&amp;b=&lt;script&gt;");
    expect(letter.html).not.toContain("<script>");
    expect(letter.html).not.toMatch(/unsubscribed/i);
  });
});
