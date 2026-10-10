/**
 * /my-applications (build spec bundle 1, sections 16.3 and 16.4). The
 * "For land projects" block on /campaigns sends founders who are already
 * running a campaign here, so: an active, inactive or unknown status renders
 * without throwing (active and inactive once took the page down), accepted
 * rows open their project page and the campaign wizard, and once anything
 * was accepted "New Application" gives way to the one-per-account line.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

type App = {
  id: number;
  projectName: string;
  status: string;
  location: string;
  projectType: string;
  vision?: string;
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

import MyApplications from "./MyApplications";
import { projectPathForApplication } from "@shared/projectKey";

function app(over: Partial<App>): App {
  return { id: 1, projectName: "Hill Farm", status: "submitted", location: "Vermont", projectType: "land_project", ...over };
}

describe("/my-applications", () => {
  beforeEach(() => {
    h.user = { id: 1, role: "user" };
    h.apps = [];
  });

  it("renders active, inactive and unknown statuses without throwing", () => {
    h.apps = [
      app({ id: 1, projectName: "Hill Farm", status: "active" }),
      app({ id: 2, projectName: "River Commons", status: "inactive" }),
      app({ id: 3, projectName: "Oak Hollow", status: "something_new" }),
    ];
    render(<MyApplications />);
    expect(screen.getByText("Hill Farm")).toBeInTheDocument();
    expect(screen.getByText("Accepted, taking part")).toBeInTheDocument();
    expect(screen.getByText("River Commons")).toBeInTheDocument();
    expect(screen.getByText("Paused")).toBeInTheDocument();
    expect(screen.getByText("Oak Hollow")).toBeInTheDocument();
    expect(screen.getByText("Draft")).toBeInTheDocument();
  });

  it("gives approved and active rows their project page and the campaign wizard", () => {
    h.apps = [
      app({ id: 7, projectName: "Hill Farm", status: "approved" }),
      app({ id: 8, projectName: "River Commons", status: "active" }),
    ];
    render(<MyApplications />);
    const pages = screen.getAllByRole("link", { name: "Open your project page" });
    expect(pages.map((a) => a.getAttribute("href"))).toEqual([
      projectPathForApplication(7, "Hill Farm"),
      projectPathForApplication(8, "River Commons"),
    ]);
    const starts = screen.getAllByRole("link", { name: "Start your campaign" });
    expect(starts.map((a) => a.getAttribute("href"))).toEqual([
      "/create-campaign?application=7",
      "/create-campaign?application=8",
    ]);
  });

  it("keeps the project links off rows that are not accepted or are paused", () => {
    h.apps = [
      app({ id: 1, status: "submitted" }),
      app({ id: 2, status: "inactive", projectName: "River Commons" }),
    ];
    render(<MyApplications />);
    expect(screen.queryByRole("link", { name: "Open your project page" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Start your campaign" })).toBeNull();
  });

  it("swaps New Application for the one-per-account line once an application was accepted", () => {
    h.apps = [app({ id: 7, status: "approved" })];
    render(<MyApplications />);
    expect(screen.queryByText("New Application")).toBeNull();
    expect(
      screen.getByText((_, el) => el?.tagName === "P" && el.textContent === "One application per account for now. To bring another land project, write to us."),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "write to us" })).toHaveAttribute("href", "/connect");
  });

  it("keeps New Application while nothing was accepted", () => {
    h.apps = [app({ id: 1, status: "under_review" })];
    render(<MyApplications />);
    expect(screen.getByText("New Application")).toBeInTheDocument();
    expect(screen.queryByText(/One application per account/)).toBeNull();
  });

  it("sends a signed-out reader to sign in and back here", () => {
    h.user = null;
    render(<MyApplications />);
    expect(screen.getByRole("link", { name: "Login to Continue" })).toHaveAttribute("href", "/sign-in?returnTo=%2Fmy-applications");
  });
});
