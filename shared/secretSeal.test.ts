import { describe, expect, it } from "vitest";
import { openSecret, sealSecret } from "./secretSeal";

describe("sealSecret", () => {
  it("round-trips and does not leave the secret in the ciphertext string", () => {
    const secret = "1//refresh-token-value-not-for-logs";
    const sealed = sealSecret(secret, "test-key-material");
    expect(sealed.startsWith("v1.")).toBe(true);
    expect(sealed).not.toContain(secret);
    expect(openSecret(sealed, "test-key-material")).toBe(secret);
  });

  it("refuses a different key", () => {
    const sealed = sealSecret("token", "key-a");
    expect(() => openSecret(sealed, "key-b")).toThrow(/could not be read/);
  });
});
