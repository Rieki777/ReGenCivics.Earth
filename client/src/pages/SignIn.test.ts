import { describe, expect, it, vi } from "vitest";

// SignIn.tsx pulls in the app's trpc client and dialogs; the helper under
// test is pure, so stub the heavy modules.
vi.mock("@/lib/trpc", () => ({ trpc: {} }));
vi.mock("@/_core/hooks/useAuth", () => ({ useAuth: () => ({}) }));
vi.mock("@/components/AuthDialog", () => ({ AuthDialog: () => null }));
vi.mock("@/components/SEO", () => ({ SEO: () => null }));

import { signInDestination } from "./SignIn";

describe("signInDestination", () => {
  it("goes to a same-site returnTo", () => {
    expect(signInDestination("?returnTo=%2Fproject%2F42-harmony-valley")).toBe("/project/42-harmony-valley");
  });

  it("keeps a hash and query inside returnTo", () => {
    expect(signInDestination("?returnTo=" + encodeURIComponent("/project/c7-x?tab=a#your-contributions")))
      .toBe("/project/c7-x?tab=a#your-contributions");
  });

  it("falls back to /profile with no returnTo", () => {
    expect(signInDestination("")).toBe("/profile");
  });

  it("refuses protocol-relative and absolute URLs", () => {
    expect(signInDestination("?returnTo=" + encodeURIComponent("//evil.example"))).toBe("/profile");
    expect(signInDestination("?returnTo=" + encodeURIComponent("https://evil.example/x"))).toBe("/profile");
    expect(signInDestination("?returnTo=" + encodeURIComponent("/\\evil.example"))).toBe("/profile");
    expect(signInDestination("?returnTo=" + encodeURIComponent("javascript:alert(1)"))).toBe("/profile");
  });

  it("never loops back to /sign-in", () => {
    expect(signInDestination("?returnTo=" + encodeURIComponent("/sign-in?returnTo=/x"))).toBe("/profile");
  });
});
