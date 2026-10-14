/**
 * /apply/alliance/status (ADR-72): an approved partner is pointed at the
 * Circle's call time vote until they have voted; an open application can be
 * edited; the review team's note shows when changes are asked for.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

type App = { id: number; status: string; organizationName: string; reviewNote?: string | null; submittedAt?: string | null };

const h = vi.hoisted(() => ({
  user: { id: 1 } as { id: number } | null,
  apps: [] as App[],
  voted: null as boolean | null,
}));

vi.mock("@/lib/trpc", () => ({
  trpc: {
    allianceApplications: { mine: { useQuery: () => ({ data: h.apps, isLoading: false }) } },
    interopSessions: {
      linkMyVote: {
        useMutation: (opts?: { onSuccess?: (r: { voted: boolean }) => void }) => ({
          mutate: () => { if (h.voted !== null) opts?.onSuccess?.({ voted: h.voted }); },
        }),
      },
    },
    seasonSchedule: { linkMyVote: { useMutation: () => ({ mutate: () => {} }) } },
  },
}));
vi.mock("@/_core/hooks/useAuth", () => ({ useAuth: () => ({ user: h.user, loading: false }) }));
vi.mock("@/components/SEO", () => ({ SEO: () => null }));

import AllianceApplyStatus, { alliancePosition, ALLIANCE_STATUS_SIGN_IN_HREF } from "./AllianceApplyStatus";

const hrefOf = (name: string | RegExp) => screen.getByRole("link", { name }).getAttribute("href");

describe("/apply/alliance/status", () => {
  beforeEach(() => {
    h.user = { id: 1 };
    h.apps = [];
    h.voted = null;
  });

  it("offers a way to sign in and come back", () => {
    h.user = null;
    render(<AllianceApplyStatus />);
    expect(hrefOf("Sign in")).toBe(ALLIANCE_STATUS_SIGN_IN_HREF);
  });

  it("asks an approved partner who has not voted to vote for the Circle's call time", () => {
    h.apps = [{ id: 3, status: "approved", organizationName: "Seed Commons" }];
    h.voted = false;
    render(<AllianceApplyStatus />);
    expect(screen.getByText(/haven't voted for a call time yet/)).toBeDefined();
    expect(hrefOf(/Vote for the Circle's call time →$/)).toBe("/interop-sessions");
    expect(hrefOf(/Subscribe to the Circle calendar/)).toBe("/calendar/interop-circle.ics");
  });

  it("lets an open application be edited and shows the review team's note", () => {
    h.apps = [{ id: 3, status: "changes_requested", organizationName: "Seed Commons", reviewNote: "Add your website." }];
    render(<AllianceApplyStatus />);
    expect(hrefOf("Edit your application")).toBe("/apply/alliance");
    expect(screen.getByText("Add your website.")).toBeDefined();
    expect(screen.queryByText(/haven't voted/)).toBeNull();
  });

  it("marks no step current for a declined application", () => {
    expect(alliancePosition("rejected").current).toBeNull();
    expect(alliancePosition("changes_requested")).toEqual({ done: 2, current: "under_review" });
  });

  it("uses no em dash", () => {
    h.apps = [{ id: 3, status: "approved", organizationName: "Seed Commons" }];
    const { container } = render(<AllianceApplyStatus />);
    expect(container.textContent).not.toContain(String.fromCharCode(0x2014));
  });
});
