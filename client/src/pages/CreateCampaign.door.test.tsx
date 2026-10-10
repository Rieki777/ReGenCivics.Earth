/**
 * /create-campaign as the creator front door (build spec 2026-10-01, sections
 * 16.1 and 16.4): signed out, in review, changes requested, loading, a
 * steward whose search matches nothing, and ?application= preselecting.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

type App = { id: number; projectName: string; status: string; vision?: string; location?: string };

const h = vi.hoisted(() => ({
  user: { id: 1, role: "user" } as { id: number; role: string } | null,
  authLoading: false,
  myApps: [] as App[],
  myAppsLoading: false,
  /** Rows by the list's search input. */
  listRows: (_search: string) => [] as App[],
  listLoading: false,
  search: "",
}));

vi.mock("@/lib/trpc", () => ({
  trpc: {
    useUtils: () => ({ campaigns: { getReadiness: { invalidate: vi.fn() } } }),
    applicantsForCampaign: {
      list: {
        useQuery: (input: { search: string }, opts: { enabled: boolean }) =>
          !opts.enabled
            ? { data: undefined, isLoading: false }
            : h.listLoading
              ? { data: undefined, isLoading: true }
              : { data: h.listRows(input.search), isLoading: false },
      },
    },
    applications: {
      myApplications: {
        useQuery: (_input: undefined, opts: { enabled: boolean }) =>
          !opts.enabled
            ? { data: undefined, isLoading: false }
            : h.myAppsLoading
              ? { data: undefined, isLoading: true }
              : { data: h.myApps, isLoading: false },
      },
    },
    campaigns: {
      create: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) },
      crowdpoolSettings: {
        useQuery: () => ({
          data: { moneyShare: { softMinPct: 10, softMaxPct: 30, defaultPct: 20 }, moneyMovesHere: false, loanRoutesOpen: false },
        }),
      },
      getReadiness: { useQuery: () => ({ data: undefined, isLoading: false }) },
      setReadinessTick: { useMutation: () => ({ mutate: vi.fn() }) },
    },
  },
}));
vi.mock("@/_core/hooks/useAuth", () => ({ useAuth: () => ({ user: h.user, loading: h.authLoading }) }));
vi.mock("wouter", async (orig) => ({ ...(await orig<typeof import("wouter")>()), useSearch: () => h.search }));
vi.mock("@/components/SEO", () => ({ default: () => null, pageSEO: { createCampaign: {} } }));
vi.mock("@/components/crowdpool/DesignCompanion", () => ({ DesignCompanion: () => null }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }));

import CreateCampaign from "./CreateCampaign";
import { READINESS_TITLE } from "@shared/crowdpoolReadiness";

const HILL_FARM: App = { id: 7, projectName: "Hill Farm", status: "approved", vision: "A season on the hill.", location: "Vermont" };
const NO_APPLICATION = "You have no accepted application yet. Apply first. It takes about 15 minutes.";
const SEARCH = "Search by project name, contact, or location...";

describe("/create-campaign, the creator front door", () => {
  beforeEach(() => {
    h.user = { id: 1, role: "user" };
    h.authLoading = false;
    h.myApps = [];
    h.myAppsLoading = false;
    h.listRows = () => [];
    h.listLoading = false;
    h.search = "";
    localStorage.clear();
  });

  it("signed out: the door, sign in, and the open list", () => {
    h.user = null;
    const { container } = render(<CreateCampaign />);
    expect(screen.getByRole("heading", { level: 1, name: "Bring your land project to crowdpooling" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Sign in" })).toHaveAttribute("href", "/sign-in?returnTo=%2Fcreate-campaign");
    expect(screen.getByRole("heading", { name: READINESS_TITLE })).toBeInTheDocument();
    expect(container.querySelectorAll("#ready")).toHaveLength(1);
    expect(screen.queryByText("Sign In Required")).toBeNull();
  });

  it("while auth resolves: the door without a state block", () => {
    h.user = null;
    h.authLoading = true;
    render(<CreateCampaign />);
    expect(screen.getByRole("heading", { level: 1, name: "Bring your land project to crowdpooling" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Sign in" })).toBeNull();
  });

  it("an application in review: the in-review line, never 'No applicants available yet'", () => {
    h.myApps = [{ id: 3, projectName: "Oak Hollow", status: "under_review" }];
    render(<CreateCampaign />);
    expect(
      screen.getByText("Oak Hollow is in review. You can start your campaign once it's accepted. Meanwhile, get ready with the eight below."),
    ).toBeInTheDocument();
    expect(screen.queryByText(/No applicants available yet/)).toBeNull();
    expect(screen.queryByText(NO_APPLICATION)).toBeNull();
  });

  it("changes requested: its line and the way back to the application", () => {
    h.myApps = [{ id: 3, projectName: "Oak Hollow", status: "changes_requested" }];
    render(<CreateCampaign />);
    expect(screen.getByText("The review team asked for some changes to your application.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "See your application" })).toHaveAttribute("href", "/apply/status");
  });

  it("a rejected application or none: apply first", () => {
    h.myApps = [{ id: 3, projectName: "Oak Hollow", status: "rejected" }];
    render(<CreateCampaign />);
    expect(screen.getByText(NO_APPLICATION)).toBeInTheDocument();
  });

  // Each half loads only the read it is about, and the other read finds
  // nothing, so each half fails if its half of the loading guard goes.
  it("never says there is no accepted application while the person's applications are loading", () => {
    h.myAppsLoading = true;
    h.listRows = () => [];
    const { container } = render(<CreateCampaign />);
    expect(screen.getByRole("heading", { level: 1, name: "Bring your land project to crowdpooling" })).toBeInTheDocument();
    expect(screen.queryByText(NO_APPLICATION)).toBeNull();
    // Loading shows no state block: step 1's link is the only way to /apply.
    expect(container.querySelectorAll('a[href="/apply"]')).toHaveLength(1);
  });

  it("never says there is no accepted application while the unfiltered applicants read is loading", () => {
    // A founder who stewards a project without having applied: only the
    // applicants read can show it.
    h.myApps = [];
    h.listLoading = true;
    const { container } = render(<CreateCampaign />);
    expect(screen.getByRole("heading", { level: 1, name: "Bring your land project to crowdpooling" })).toBeInTheDocument();
    expect(screen.queryByText(NO_APPLICATION)).toBeNull();
    expect(container.querySelectorAll('a[href="/apply"]')).toHaveLength(1);
  });

  it("a paused application: names it, points to /connect, and never links to /apply", () => {
    h.myApps = [{ id: 3, projectName: "Oak Hollow", status: "inactive" }];
    const { container } = render(<CreateCampaign />);
    expect(screen.getByText(/Oak Hollow is paused\./)).toHaveTextContent(
      "Oak Hollow is paused. Write to us when you're ready to pick it up again.",
    );
    expect(screen.getByRole("link", { name: "Write to us" })).toHaveAttribute("href", "/connect");
    expect(screen.queryByText(NO_APPLICATION)).toBeNull();
    expect(container.querySelector('a[href="/apply"]')).toBeNull();
  });

  it("accepted: the picker under the pick line, labelled Your projects, with the list folded", () => {
    h.myApps = [HILL_FARM];
    const { container } = render(<CreateCampaign />);
    expect(screen.getByText("Pick the project this campaign is for. We fill in what your application already says.")).toBeInTheDocument();
    expect(screen.getByText("Your projects")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Hill Farm/ })).toBeInTheDocument();
    expect(screen.queryByText("Create Your Campaign")).toBeNull();
    // No apply link above the picker: /apply would reopen the accepted application.
    expect(container.querySelector('a[href="/apply"]')).toBeNull();
    const ready = container.querySelectorAll("#ready");
    expect(ready).toHaveLength(1);
    expect(ready[0].tagName).toBe("DETAILS");
  });

  it("accepted: the 'or select from all applicants' divider shows only over other projects", () => {
    h.myApps = [HILL_FARM];
    h.listRows = () => [HILL_FARM];
    const { unmount } = render(<CreateCampaign />);
    expect(screen.queryByText("or select from all applicants")).toBeNull();
    unmount();
    h.listRows = () => [HILL_FARM, { id: 9, projectName: "Oak Hollow", status: "approved", location: "Devon" }];
    render(<CreateCampaign />);
    expect(screen.getByText("or select from all applicants")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Oak Hollow/ })).toBeInTheDocument();
  });

  it("a steward who did not apply keeps the picker and its search box when a search matches nothing", () => {
    const oak: App = { id: 9, projectName: "Oak Hollow", status: "approved", location: "Devon" };
    h.myApps = [];
    h.listRows = (search) => (search === "" ? [oak] : []);
    render(<CreateCampaign />);
    expect(screen.getByRole("button", { name: /Oak Hollow/ })).toBeInTheDocument();
    fireEvent.change(screen.getByPlaceholderText(SEARCH), { target: { value: "zzz" } });
    expect(screen.getByPlaceholderText(SEARCH)).toBeInTheDocument();
    expect(screen.getByText("No projects match your search.")).toBeInTheDocument();
    expect(screen.getByText("Pick the project this campaign is for. We fill in what your application already says.")).toBeInTheDocument();
    expect(screen.queryByText(NO_APPLICATION)).toBeNull();
  });

  it("?application=7 opens the wizard on Hill Farm", () => {
    h.myApps = [HILL_FARM];
    h.search = "?application=7";
    render(<CreateCampaign />);
    expect(screen.queryByText("Pick the project this campaign is for. We fill in what your application already says.")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /Money$/ }));
    expect(screen.getByRole("heading", { name: "Money this project needs" })).toBeInTheDocument();
  });

  it("?application= naming a project the person can't start stays on the door", () => {
    h.myApps = [HILL_FARM];
    h.search = "?application=99";
    render(<CreateCampaign />);
    expect(screen.getByRole("button", { name: /Hill Farm/ })).toBeInTheDocument();
  });
});
