/**
 * A campaign that has ended reads as a record (review 2026-09-28).
 *
 * On a campaign in the new `closed` state the need buttons were hidden, but
 * right under "Crowdpooling closed on ... It didn't complete." the page
 * still showed the "What can you bring?" chips, the token line, the "Try
 * filling a need" disclosure and "This project has no money route yet. Its
 * needs above are open to you." A campaign now reaches `closed` with nobody
 * acting, so this shows after every close that didn't complete.
 *
 * ContributionModal is stubbed (it only opens from a need); everything the
 * page draws is real.
 */
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("@/lib/trpc", () => ({
  trpc: {
    campaigns: {
      crowdpoolSettings: { useQuery: () => ({ data: { moneyMovesHere: false } }) },
      getPartnerLinks: { useQuery: () => ({ data: [] }) },
    },
  },
}));
vi.mock("@/components/ContributionModal", () => ({ ContributionModal: () => null }));

import { ProjectCampaignFront } from "./ProjectCampaignFront";
import { computeCampaignProgress, type ProgressItem } from "@shared/campaignProgress";
import { BRING, CLOSE, MONEY_BLOCK, PAGE, TOKEN_LINE } from "@shared/crowdpoolCopy";

const items: ProgressItem[] = [
  { id: 1, kind: "item", estimatedValue: 6000, quantityWanted: 1, equipmentName: "Walk-behind tractor" },
  { id: 2, kind: "role", capacityUnit: "count", estimatedValue: 2000, quantityWanted: 1, roleTitle: "Cook" },
];

function front(status: string, closedAt: Date | null = null) {
  const campaign = {
    status, isDemo: 0, financialTarget: 2000, currency: "USD",
    startedAt: new Date("2026-06-01T00:00:00Z"), durationDays: 90, closedAt,
  };
  return {
    id: 7139, title: "Closed Meadow", status, isDemo: 0, currency: "USD",
    items: items.map((i) => ({ ...i, quantityClaimed: 0, quantityDelivered: 0 })),
    progress: computeCampaignProgress({ campaign, items, rows: [], lends: [], routes: [] }),
  } as any;
}

function draw(status: string, closedAt: Date | null = null) {
  return render(
    <ProjectCampaignFront
      front={front(status, closedAt)}
      onContributed={() => {}}
      needsAnchor
      projectName="Closed Meadow"
      canonicalPath="/project/c7139-closed-meadow"
      projectKey="c7139"
      followsProject={false}
    />,
  );
}

describe("a campaign that has ended", () => {
  it("closed at its close date: the needs stay as a record, with no invitation anywhere", () => {
    draw("closed", new Date("2026-09-28T00:00:00Z"));
    const text = document.body.textContent ?? "";
    expect(text).toContain("It didn't complete.");
    expect(text).toContain(CLOSE.afterLine);
    // The needs are still listed.
    expect(screen.getByText("Walk-behind tractor")).toBeDefined();
    // No chips, no token line, no simulator, no "open to you".
    expect(screen.queryByRole("heading", { name: BRING.heading })).toBeNull();
    expect(text).not.toContain(TOKEN_LINE("Closed Meadow"));
    expect(screen.queryByRole("button", { name: PAGE.tryFillingNeed })).toBeNull();
    expect(text).not.toContain(MONEY_BLOCK.noRoute);
    expect(text).not.toMatch(/open to you/);
    expect(screen.getByText(MONEY_BLOCK.ended)).toBeDefined();
    // And no way to offer.
    expect(screen.queryByRole("button", { name: PAGE.offerSomethingElse })).toBeNull();
  });

  it("completed and cancelled read the same way", () => {
    for (const status of ["completed", "cancelled"]) {
      const { unmount } = draw(status);
      expect(screen.queryByRole("heading", { name: BRING.heading })).toBeNull();
      expect(screen.queryByRole("button", { name: PAGE.tryFillingNeed })).toBeNull();
      expect(screen.getByText(MONEY_BLOCK.ended)).toBeDefined();
      unmount();
    }
  });
});

describe("a live campaign", () => {
  it("keeps every way in: the chips, the token line, the simulator and the money block", () => {
    draw("active");
    const text = document.body.textContent ?? "";
    expect(screen.getByRole("heading", { name: BRING.heading })).toBeDefined();
    expect(text).toContain(TOKEN_LINE("Closed Meadow"));
    expect(screen.getByRole("button", { name: PAGE.tryFillingNeed })).toBeDefined();
    expect(screen.getByText(MONEY_BLOCK.noRoute)).toBeDefined();
    expect(screen.queryByText(MONEY_BLOCK.ended)).toBeNull();
  });

  it("a steward's preview in review still shows the page as visitors will see it live", () => {
    draw("pending_review");
    expect(screen.getByRole("heading", { name: BRING.heading })).toBeDefined();
    expect(screen.queryByText(MONEY_BLOCK.ended)).toBeNull();
  });
});
