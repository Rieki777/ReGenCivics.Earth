/**
 * The campaign and project share card composition (build spec 2026-09-25,
 * section 8.8): the two-line reading, in-kind first, one state tag, and none
 * of the old single-total words. The PNG render itself is covered nowhere
 * (see og-core.test.ts on the font pipeline); this checks what it would draw.
 */
import { describe, expect, it } from "vitest";
import { campaignTemplate, cardFor } from "./routes/og";
import { computeCampaignProgress } from "../shared/campaignProgress";

function texts(node: any, out: string[] = []): string[] {
  if (node == null) return out;
  if (typeof node === "string") out.push(node);
  else if (Array.isArray(node)) node.forEach((n) => texts(n, out));
  else if (typeof node === "object") texts(node.props?.children, out);
  return out;
}

const fmt = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;
const campaign = { status: "active", isDemo: 0, financialTarget: 20000, currency: "USD", startedAt: new Date("2026-09-01"), durationDays: 90 };
const items = [
  { id: 1, kind: "item", estimatedValue: 6000, quantityWanted: 1, equipmentName: "Tractor" },
  { id: 2, kind: "role", capacityUnit: "count", estimatedValue: 4000, quantityWanted: 1, roleTitle: "Cook" },
];
const rows = [{ campaignItemId: 1, status: "accepted", contributionType: "equipment", offerMode: "give" as const, quantity: 1, value: 6000, financialValue: 6000, count: 1 }];

describe("campaign share card", () => {
  it("draws the in-kind line first, then money, and the state tag", () => {
    const p = computeCampaignProgress({ campaign, items, rows, lends: [], routes: [] });
    const all = texts(campaignTemplate(cardFor({ title: "Hill Farm &amp; Orchard", location: "Oregon" }, p, fmt)));
    const inKind = all.findIndex((t) => t.startsWith("In-kind: 1 of 2 needs met"));
    const money = all.findIndex((t) => t === "Money: $0 of $20,000");
    expect(inKind).toBeGreaterThan(-1);
    expect(money).toBeGreaterThan(inKind);
    expect(all).toContain("Open for offers");
    expect(all).toContain("Hill Farm & Orchard");
    for (const t of all) expect(t).not.toMatch(/funded|backers|pledge|claim/i);
  });

  it("a project asking for no money shows the line and no money bar", () => {
    const p = computeCampaignProgress({ campaign: { ...campaign, financialTarget: 0 }, items, rows, lends: [], routes: [] });
    const card = cardFor({ title: "Hill Farm" }, p, fmt);
    expect(card.moneyPct).toBeNull();
    expect(card.moneyLine).toBe("This project asks for no money");
  });

  it("an example campaign carries the Example tag", () => {
    const p = computeCampaignProgress({ campaign: { ...campaign, isDemo: 1 }, items, rows, lends: [], routes: [] });
    expect(cardFor({ title: "Harmony Valley" }, p, fmt).stateTag).toBe("Example");
  });
});
