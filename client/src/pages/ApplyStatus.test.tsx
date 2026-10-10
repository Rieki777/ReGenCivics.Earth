/**
 * /apply/status (build spec bundle 1, sections 16.3 and 16.4): a signed-out
 * reader gets a way to sign in and come back, and an accepted founder's
 * status card links every next step, with the wizard opened on their project.
 * No line promises an emailed decision (section 15, question 11).
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

type App = {
  id: number;
  projectName: string;
  status: string;
  location: string;
  season?: number | null;
  submittedAt?: string | null;
};

const h = vi.hoisted(() => ({
  user: { id: 1, role: "user" } as { id: number; role: string } | null,
  apps: [] as App[],
}));

vi.mock("@/lib/trpc", () => ({
  trpc: {
    applications: {
      myApplications: { useQuery: () => ({ data: h.apps, isLoading: false }) },
    },
  },
}));
vi.mock("@/_core/hooks/useAuth", () => ({ useAuth: () => ({ user: h.user, loading: false }) }));
vi.mock("@/components/SEO", () => ({ SEO: () => null }));

import ApplyStatus from "./ApplyStatus";
import { projectPathForApplication } from "@shared/projectKey";
import { READINESS_HREF } from "@shared/crowdpoolReadiness";
import { VILLAGE_OS_OFFER, VILLAGE_OS_PATH } from "@shared/villageOsOffer";

/** Before the Season 2 opening day (March 2027), so the default day shows. */
const BEFORE_OPENING = new Date(Date.UTC(2026, 9, 9));

function app(over: Partial<App>): App {
  return { id: 7, projectName: "Hill Farm", status: "submitted", location: "Vermont", season: 2, ...over };
}

const hrefOf = (name: string | RegExp) => screen.getByRole("link", { name }).getAttribute("href");

describe("/apply/status", () => {
  beforeEach(() => {
    h.user = { id: 1, role: "user" };
    h.apps = [];
  });

  it("gives a signed-out reader Sign in, back to this page, above Return to Apply", () => {
    h.user = null;
    render(<ApplyStatus />);
    const signIn = screen.getByRole("link", { name: "Sign in" });
    expect(signIn).toHaveAttribute("href", "/sign-in?returnTo=%2Fapply%2Fstatus");
    const back = screen.getByRole("link", { name: "Return to Apply" });
    expect(back).toHaveAttribute("href", "/apply");
    expect(signIn.compareDocumentPosition(back) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("links an approved founder's four next steps, with the wizard opened on their project", () => {
    h.apps = [app({ id: 7, status: "approved" })];
    render(<ApplyStatus now={BEFORE_OPENING} />);
    expect(hrefOf(/Join the sessions/)).toBe("/season-schedule");
    expect(hrefOf(/What the review checks/)).toBe(READINESS_HREF);
    expect(hrefOf(/Open your project page/)).toBe(projectPathForApplication(7, "Hill Farm"));
    expect(hrefOf(/Start your campaign/)).toBe("/create-campaign?application=7");
    expect(screen.getByText("Crowdpooling opens together on 20 March 2027 by default.")).toBeInTheDocument();
    expect(screen.getByText("Hill Farm is accepted. Being accepted means your project meets the minimum criteria to take part in crowdpooling.")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Join the Community/ })).toBeNull();
    expect(screen.queryByRole("link", { name: /Play the Game/ })).toBeNull();
  });

  it("offers Village OS hosting to an accepted Season 2 project, and not to another season", () => {
    h.apps = [app({ status: "active", season: 2 })];
    const { unmount } = render(<ApplyStatus now={BEFORE_OPENING} />);
    expect(hrefOf(/Get your Village OS/)).toBe(VILLAGE_OS_PATH);
    expect(screen.getByText(VILLAGE_OS_OFFER.board.hostedLine)).toBeInTheDocument();
    expect(screen.getByText("Hill Farm is taking part in Season 2. Start or check your campaign from your project page.")).toBeInTheDocument();
    unmount();
    h.apps = [app({ status: "approved", season: 1 })];
    render(<ApplyStatus now={BEFORE_OPENING} />);
    expect(screen.queryByRole("link", { name: /Get your Village OS/ })).toBeNull();
  });

  it("names the accepted and taking-part steps for what they mean", () => {
    h.apps = [app({ status: "active" })];
    render(<ApplyStatus now={BEFORE_OPENING} />);
    expect(screen.getByText("Accepted")).toBeInTheDocument();
    expect(screen.getByText("Meets the minimum criteria to take part in crowdpooling")).toBeInTheDocument();
    expect(screen.getByText("Taking part")).toBeInTheDocument();
    expect(screen.getByText("In this season's sessions and crowdpooling round")).toBeInTheDocument();
  });

  it("promises no decision email while an application is in review", () => {
    for (const status of ["submitted", "under_review"]) {
      h.apps = [app({ status })];
      const { container, unmount } = render(<ApplyStatus now={BEFORE_OPENING} />);
      expect(container.textContent).not.toMatch(/in touch|1.2 weeks|email you|notified/i);
      // Other statuses keep today's two links.
      expect(hrefOf(/Join the Community/)).toBe("/community");
      expect(screen.queryByRole("link", { name: /Start your campaign/ })).toBeNull();
      unmount();
    }
  });

  it("tells a paused founder to write to us, and offers no campaign links", () => {
    h.apps = [app({ status: "inactive" })];
    render(<ApplyStatus now={BEFORE_OPENING} />);
    expect(screen.getByRole("link", { name: "Write to us" })).toHaveAttribute("href", "/connect");
    expect(screen.queryByRole("link", { name: /Start your campaign/ })).toBeNull();
  });

  /** Each timeline step's label and state, in order. */
  function steps(container: HTMLElement): string[] {
    return Array.from(container.querySelectorAll("[data-step-state]")).map(
      (el) => `${el.querySelector("p")?.textContent}:${el.getAttribute("data-step-state")}`,
    );
  }

  it("never marks Accepted as the current step of a rejected application", () => {
    h.apps = [app({ status: "rejected" })];
    const { container } = render(<ApplyStatus now={BEFORE_OPENING} />);
    expect(steps(container)).toEqual([
      "Draft:complete",
      "Submitted:complete",
      "Under Review:complete",
      "Accepted:pending",
      "Taking part:pending",
    ]);
    expect(container.querySelector('[aria-current="step"]')).toBeNull();
  });

  it("reads a paused application's steps as complete up to Accepted", () => {
    h.apps = [app({ status: "inactive" })];
    const { container } = render(<ApplyStatus now={BEFORE_OPENING} />);
    expect(steps(container)).toEqual([
      "Draft:complete",
      "Submitted:complete",
      "Under Review:complete",
      "Accepted:complete",
      "Taking part:pending",
    ]);
  });

  it("marks Under Review current when changes are requested, with the steps before it complete", () => {
    h.apps = [app({ status: "changes_requested" })];
    const { container } = render(<ApplyStatus now={BEFORE_OPENING} />);
    expect(steps(container)).toEqual([
      "Draft:complete",
      "Submitted:complete",
      "Under Review:current",
      "Accepted:pending",
      "Taking part:pending",
    ]);
  });

  it("drops the default day once crowdpooling has opened", () => {
    h.apps = [app({ status: "approved" })];
    render(<ApplyStatus now={new Date(Date.UTC(2027, 3, 1))} />);
    expect(screen.queryByText(/opens together on/)).toBeNull();
  });

  it("uses no em dash", () => {
    h.apps = [app({ status: "approved" })];
    const { container } = render(<ApplyStatus now={BEFORE_OPENING} />);
    expect(container.textContent).not.toContain(String.fromCharCode(0x2014));
  });
});
