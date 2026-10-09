import { describe, expect, it } from "vitest";
import { CORE_USER_EMAIL, CORE_USER_HANDLE, CORE_USER_NAME, CORE_USER_OPEN_ID, isCoreUser } from "./core-user";

describe("ReGen Civics Core", () => {
  it("matches the system identity and leaves people and elders alone", () => {
    expect(CORE_USER_NAME).toBe("ReGen Civics Core");
    expect(isCoreUser({ email: CORE_USER_EMAIL })).toBe(true);
    expect(isCoreUser({ handle: CORE_USER_HANDLE })).toBe(true);
    expect(isCoreUser({ openId: CORE_USER_OPEN_ID })).toBe(true);
    expect(isCoreUser({ name: "ReGen Civics Core" })).toBe(true);
    expect(isCoreUser({ name: "Rieki Cordon", email: "rieki.cordon@gmail.com" })).toBe(false);
    expect(isCoreUser({ name: "ReGen Civics Team", email: "team@regencivics.earth" })).toBe(false);
    expect(isCoreUser(null)).toBe(false);
  });
});
