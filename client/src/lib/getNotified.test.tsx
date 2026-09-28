/**
 * "Hear when it opens" on /campaigns moves focus into the season form, not
 * only the scroll (review 2026-09-28). Runs the real season FollowControl
 * inside #get-notified, signed out and signed in.
 */
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const auth = vi.hoisted(() => ({ signedIn: false }));
vi.mock("@/_core/hooks/useAuth", () => ({
  useAuth: () =>
    auth.signedIn
      ? { user: { id: 5, email: "ada@example.org" }, isAuthenticated: true, loading: false }
      : { user: null, isAuthenticated: false, loading: false },
}));
vi.mock("@/lib/trpc", () => ({
  trpc: {
    campaigns: {
      joinWaitlist: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) },
    },
  },
}));

import { FollowControl } from "@/components/crowdpool/FollowControl";
import { GET_NOTIFIED_ID, goToGetNotified } from "./getNotified";
import { FOLLOW } from "@shared/crowdpoolCopy";

function page() {
  return render(
    <div>
      <a href="#get-notified">{FOLLOW.bannerButton}</a>
      <div id={GET_NOTIFIED_ID}>
        <FollowControl mode="season" variant="card" />
      </div>
    </div>,
  );
}

describe("goToGetNotified", () => {
  it("signed out: scrolls to the form and focuses its email field", () => {
    auth.signedIn = false;
    page();
    const scroll = vi.fn();
    const target = document.getElementById(GET_NOTIFIED_ID)!;
    target.scrollIntoView = scroll;
    screen.getByRole("link", { name: FOLLOW.bannerButton }).focus();
    expect(goToGetNotified()).toBe(true);
    expect(scroll).toHaveBeenCalledWith({ behavior: "smooth", block: "start" });
    expect(document.activeElement?.tagName).toBe("INPUT");
    expect(target.contains(document.activeElement)).toBe(true);
  });

  it("signed in: focuses the one button", () => {
    auth.signedIn = true;
    page();
    document.getElementById(GET_NOTIFIED_ID)!.scrollIntoView = vi.fn();
    goToGetNotified();
    expect(document.activeElement).toBe(screen.getByRole("button", { name: FOLLOW.seasonSignedIn }));
  });

  it("is what the gallery banner's link calls", () => {
    const src = readFileSync(resolve(__dirname, "../pages/CrowdPoolingProjects.tsx"), "utf8");
    const banner = src.slice(src.indexOf('href="#get-notified"'), src.indexOf("{FOLLOW.bannerButton}"));
    expect(banner).toContain("goToGetNotified()");
  });

  it("does nothing when the form isn't on the page", () => {
    auth.signedIn = false;
    render(<a href="#get-notified">{FOLLOW.bannerButton}</a>);
    expect(goToGetNotified()).toBe(false);
  });
});
