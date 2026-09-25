import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { CampaignStewardStats } from "./CampaignStewardStats";
import { computeCampaignProgress } from "@shared/campaignProgress";

const fmt = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;
const items = [{ id: 1, kind: "item", equipmentName: "Excavator", estimatedValue: 5000, quantityWanted: 1 }];
const progressFor = (financialTarget: number) =>
  computeCampaignProgress({
    campaign: { status: "active", isDemo: 0, financialTarget, currency: "USD", startedAt: "2026-09-01T00:00:00Z", durationDays: 90 },
    items, rows: [], lends: [], routes: [],
  });

function renderStats(financialTarget: number) {
  return render(
    <CampaignStewardStats
      campaignId={5228}
      progress={progressFor(financialTarget)}
      contributorsCount={0}
      counts={{ waiting: 0, accepted: 0, delivered: 0 }}
      formatCurrency={fmt}
    />,
  );
}

describe("CampaignStewardStats", () => {
  it("says a project asks for no money once, never twice in a row", () => {
    const { container } = renderStats(0);
    const text = container.textContent ?? "";
    expect(text.match(/This project asks for no money/g)).toHaveLength(1);
  });

  it("with a money ask, shows the soft money-share note under the bar", () => {
    renderStats(1000);
    expect(screen.getByText(/^Money is 17% of the whole ask\./)).toBeInTheDocument();
  });
});
