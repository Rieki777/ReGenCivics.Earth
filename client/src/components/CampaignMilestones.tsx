/**
 * CampaignMilestones Component
 * Vertical timeline derived from campaign data and contribution history.
 * No separate milestones table — milestones are inferred from existing fields.
 */

import { useMemo } from "react";
import { CheckCircle2, Circle, Calendar } from "lucide-react";

interface Contribution {
  amount: number;
  createdAt: Date | string;
}

interface Campaign {
  createdAt: Date | string;
  startedAt?: Date | string | null;
  publishedAt?: Date | string | null;
  pledgedTotal?: number | null;
  pledgedFinancial?: number | null;
  financialTarget?: number | null;
  status?: string;
  items?: { estimatedValue: number }[];
}

interface Milestone {
  date: Date;
  label: string;
  subtext?: string;
  past: boolean;
}

interface CampaignMilestonesProps {
  campaign: Campaign;
  contributions: Contribution[];
  currency: string;
}

function formatMilestoneDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatCurrencyShort(amount: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
    notation: "compact",
  }).format(amount);
}

export function CampaignMilestones({ campaign, contributions, currency }: CampaignMilestonesProps) {
  const now = new Date();

  const milestones = useMemo<Milestone[]>(() => {
    const result: Milestone[] = [];

    // 1. Campaign created
    const createdAt = new Date(campaign.createdAt);
    result.push({
      date: createdAt,
      label: "Campaign created",
      subtext: "Listing went live on ReGen Civics",
      past: true,
    });

    // 2. Campaign started / published (if different from created)
    const startedAt = campaign.startedAt || campaign.publishedAt;
    if (startedAt) {
      const startDate = new Date(startedAt);
      if (Math.abs(startDate.getTime() - createdAt.getTime()) > 60 * 60 * 1000) {
        result.push({
          date: startDate,
          label: "Campaign launched",
          subtext: "Accepting contributions",
          past: startDate <= now,
        });
      }
    }

    // 3. First contribution
    if (contributions.length > 0) {
      const sorted = [...contributions].sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
      const firstDate = new Date(sorted[0].createdAt);
      result.push({
        date: firstDate,
        label: "First contribution received",
        subtext: `${contributions.length} contributor${contributions.length !== 1 ? "s" : ""} total`,
        past: firstDate <= now,
      });
    }

    // 4. Progress milestones against total value
    const totalValue =
      campaign.items && campaign.items.length > 0
        ? campaign.items.reduce((sum, item) => sum + item.estimatedValue, 0)
        : campaign.financialTarget || 0;

    const raisedValue = campaign.pledgedTotal || 0;

    if (totalValue > 0) {
      const pct = (raisedValue / totalValue) * 100;

      // 25% milestone
      const target25 = totalValue * 0.25;
      if (raisedValue >= target25) {
        // Find approximate date when 25% was crossed
        let crossDate: Date | null = null;
        if (contributions.length > 0) {
          const sorted = [...contributions].sort(
            (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          );
          let running = 0;
          for (const c of sorted) {
            running += c.amount;
            if (running >= target25) {
              crossDate = new Date(c.createdAt);
              break;
            }
          }
        }
        result.push({
          date: crossDate || now,
          label: "25% funded",
          subtext: `${formatCurrencyShort(target25, currency)} raised`,
          past: true,
        });
      } else {
        result.push({
          date: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
          label: "25% funded",
          subtext: `${formatCurrencyShort(target25, currency)} goal`,
          past: false,
        });
      }

      // 50% milestone
      const target50 = totalValue * 0.5;
      if (raisedValue >= target50) {
        let crossDate: Date | null = null;
        if (contributions.length > 0) {
          const sorted = [...contributions].sort(
            (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          );
          let running = 0;
          for (const c of sorted) {
            running += c.amount;
            if (running >= target50) {
              crossDate = new Date(c.createdAt);
              break;
            }
          }
        }
        result.push({
          date: crossDate || now,
          label: "50% funded",
          subtext: `${formatCurrencyShort(target50, currency)} raised`,
          past: true,
        });
      } else if (pct > 0) {
        result.push({
          date: new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000),
          label: "50% funded",
          subtext: `${formatCurrencyShort(target50, currency)} goal`,
          past: false,
        });
      }

      // Goal reached
      if (campaign.status === "funded" || campaign.status === "completed" || raisedValue >= totalValue) {
        result.push({
          date: now,
          label: "Campaign goal reached",
          subtext: `${formatCurrencyShort(totalValue, currency)} fully funded`,
          past: true,
        });
      } else {
        result.push({
          date: new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000),
          label: "Campaign goal",
          subtext: `${formatCurrencyShort(totalValue, currency)} target`,
          past: false,
        });
      }
    }

    // Sort by date, past milestones first
    return result.sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [campaign, contributions, currency, now]);

  if (milestones.length === 0) return null;

  return (
    <div className="bg-white/95 backdrop-blur rounded-3xl p-6 md:p-8 mb-6 shadow-xl">
      <h2 className="text-xl font-bold text-[#1a472a] mb-6 flex items-center gap-2" style={{ fontFamily: "var(--font-display)" }}>
        <Calendar className="w-5 h-5 text-[#4a7c59]" />
        Timeline
      </h2>
      <ol className="relative" aria-label="Campaign milestone timeline">
        {milestones.map((milestone, index) => {
          const isLast = index === milestones.length - 1;
          return (
            <li key={index} className="flex gap-4">
              {/* Left column: dot + line */}
              <div className="flex flex-col items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                  milestone.past
                    ? "bg-[#4a7c59] text-white"
                    : "bg-white border-2 border-[#1a472a]/20 text-[#1a472a]/30"
                }`}>
                  {milestone.past ? (
                    <CheckCircle2 className="w-4 h-4" />
                  ) : (
                    <Circle className="w-4 h-4" />
                  )}
                </div>
                {!isLast && (
                  <div className={`w-px flex-1 my-1 ${milestone.past ? "bg-[#4a7c59]/30" : "bg-[#1a472a]/10"}`} />
                )}
              </div>
              {/* Right column: content */}
              <div className={`pb-6 min-w-0 ${isLast ? "" : ""}`}>
                <p className={`text-xs font-medium mb-0.5 ${milestone.past ? "text-[#4a7c59]" : "text-[#1a472a]/40"}`}>
                  {milestone.past ? formatMilestoneDate(milestone.date) : "Upcoming"}
                </p>
                <p className={`font-semibold text-sm ${milestone.past ? "text-[#1a472a]" : "text-[#1a472a]/50"}`}>
                  {milestone.label}
                </p>
                {milestone.subtext && (
                  <p className={`text-xs mt-0.5 ${milestone.past ? "text-[#1a472a]/60" : "text-[#1a472a]/35"}`}>
                    {milestone.subtext}
                  </p>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
