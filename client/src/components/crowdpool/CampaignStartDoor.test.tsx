/**
 * The creator front door on /create-campaign (build spec 2026-10-01, section
 * 16.1 and 16.4): each state's line and links, and exactly one #ready.
 */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";

vi.mock("@/lib/trpc", () => ({
  trpc: {
    useUtils: () => ({ campaigns: { getReadiness: { invalidate: vi.fn() } } }),
    campaigns: {
      getReadiness: { useQuery: () => ({ data: undefined, isLoading: false }) },
      setReadinessTick: { useMutation: () => ({ mutate: vi.fn() }) },
    },
  },
}));
vi.mock("@/components/SEO", () => ({ default: () => null, pageSEO: { createCampaign: {} } }));

import { CampaignStartDoor, type StartDoorState } from "./CampaignStartDoor";
import { START_DOOR } from "@shared/crowdpoolCopy";
import { APPLY_BUTTON_LABEL } from "@shared/applicationWindow";
import { READINESS_TITLE } from "@shared/crowdpoolReadiness";

const BEFORE_OPENING = new Date("2026-10-09T12:00:00Z");
const ALL_STATES: StartDoorState[] = ["loading", "signed-out", "no-application", "changes-requested", "draft", "in-review", "accepted"];

function door(state: StartDoorState, extra: Partial<Parameters<typeof CampaignStartDoor>[0]> = {}) {
  return render(<CampaignStartDoor state={state} openReady={false} now={BEFORE_OPENING} {...extra} />);
}

describe("CampaignStartDoor", () => {
  beforeEach(() => localStorage.clear());

  it("shows the heading, the lede and the four steps in every state", () => {
    for (const state of ALL_STATES) {
      const { unmount } = door(state);
      expect(screen.getByRole("heading", { level: 1, name: START_DOOR.heading })).toBeInTheDocument();
      expect(screen.getByText(START_DOOR.lede)).toBeInTheDocument();
      const steps = within(screen.getByRole("list", { name: "How a campaign starts" })).getAllByRole("listitem");
      expect(steps).toHaveLength(4);
      expect(steps[3]).toHaveTextContent("Crowdpooling opens together on 20 March 2027 by default.");
      expect(within(steps[0]).getByRole("link", { name: APPLY_BUTTON_LABEL })).toHaveAttribute("href", "/apply");
      unmount();
    }
  });

  it("step 4 drops the default day once the round has opened", () => {
    door("signed-out", { now: new Date("2027-05-01T12:00:00Z") });
    const steps = within(screen.getByRole("list", { name: "How a campaign starts" })).getAllByRole("listitem");
    expect(steps[3]).not.toHaveTextContent("by default");
    expect(steps[3]).toHaveTextContent("Ask the ReGen Civics team if your project needs a different day.");
  });

  it("signed out: sign in, back to this page, and the apply link", () => {
    door("signed-out");
    expect(screen.getByText(START_DOOR.signedOut)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Sign in" })).toHaveAttribute("href", "/sign-in?returnTo=%2Fcreate-campaign");
    const apply = screen.getAllByRole("link", { name: APPLY_BUTTON_LABEL });
    expect(apply.length).toBe(2);
    for (const a of apply) expect(a).toHaveAttribute("href", "/apply");
  });

  it("no accepted application: says so and links to apply", () => {
    door("no-application");
    expect(screen.getByText(START_DOOR.noApplication)).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Sign in" })).toBeNull();
  });

  it("changes requested: its line and a link to the application, never the apply link", () => {
    door("changes-requested");
    expect(screen.getByText("The review team asked for some changes to your application.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "See your application" })).toHaveAttribute("href", "/apply/status");
    // Only step 1 links to /apply.
    expect(screen.getAllByRole("link", { name: APPLY_BUTTON_LABEL })).toHaveLength(1);
  });

  it("draft: the line is the link back to the application", () => {
    door("draft");
    expect(screen.getByRole("link", { name: "Finish your application." })).toHaveAttribute("href", "/apply");
  });

  it("in review: names each project and never says no applicants are available", () => {
    door("in-review", { inReviewNames: ["Hill Farm", "Oak Hollow"] });
    expect(
      screen.getByText("Hill Farm and Oak Hollow are in review. You can start a campaign once one is accepted. Meanwhile, get ready with the eight below."),
    ).toBeInTheDocument();
    expect(screen.queryByText(/No applicants available yet/)).toBeNull();
  });

  it("accepted: the pick line, then the picker", () => {
    door("accepted", { children: <button type="button">Hill Farm</button> });
    expect(screen.getByText(START_DOOR.pick)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Hill Farm" })).toBeInTheDocument();
  });

  it("carries exactly one #ready in every state", () => {
    for (const state of ALL_STATES) {
      const { container, unmount } = door(state);
      expect(container.querySelectorAll("#ready").length, state).toBe(1);
      expect(screen.getByRole("heading", { name: READINESS_TITLE }), state).toBeInTheDocument();
      unmount();
    }
  });

  it("accepted: #ready is the fold, closed, and open when the page was opened at #ready", () => {
    const { container, unmount } = door("accepted");
    const fold = container.querySelector("#ready")!;
    expect(fold.tagName).toBe("DETAILS");
    expect(fold).not.toHaveAttribute("open");
    expect(within(fold as HTMLElement).getByText("What the review checks")).toBeInTheDocument();
    unmount();
    const opened = door("accepted", { openReady: true });
    expect(opened.container.querySelector("#ready")).toHaveAttribute("open");
  });

  it("accepted: a #ready link followed while the page is open opens the fold", async () => {
    const { container } = door("accepted");
    const fold = container.querySelector("#ready") as HTMLDetailsElement;
    expect(fold.open).toBe(false);
    window.location.hash = "#ready";
    await waitFor(() => expect(fold.open).toBe(true));
    window.history.replaceState(null, "", window.location.pathname);
  });

  it("every other state: #ready is the open list itself", () => {
    const { container } = door("signed-out");
    expect(container.querySelector("#ready")!.tagName).toBe("SECTION");
  });

  it("uses our words: no em-dash in any state", () => {
    for (const state of ALL_STATES) {
      const { container, unmount } = door(state, { inReviewNames: ["Hill Farm"] });
      expect(container.textContent ?? "", state).not.toContain(String.fromCharCode(0x2014));
      unmount();
    }
  });
});
