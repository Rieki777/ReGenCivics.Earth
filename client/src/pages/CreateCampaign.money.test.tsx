import { describe, expect, it, vi, beforeEach } from "vitest";
import { useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";

const mutate = vi.fn();

vi.mock("@/lib/trpc", () => ({
  trpc: {
    applicantsForCampaign: { list: { useQuery: () => ({ data: [], isLoading: false }) } },
    applications: {
      myApplications: {
        useQuery: () => ({
          data: [{ id: 7, projectName: "Hill Farm", status: "approved", vision: "A season on the hill.", location: "Vermont" }],
        }),
      },
    },
    campaigns: {
      create: { useMutation: () => ({ mutate, isPending: false }) },
      crowdpoolSettings: {
        useQuery: () => ({
          data: { moneyShare: { softMinPct: 10, softMaxPct: 30, defaultPct: 20 }, moneyMovesHere: false, loanRoutesOpen: false },
        }),
      },
    },
  },
}));
vi.mock("@/_core/hooks/useAuth", () => ({ useAuth: () => ({ user: { id: 1, role: "user" } }) }));
vi.mock("@/const", () => ({ getLoginUrl: () => "/login" }));
vi.mock("@/components/SEO", () => ({ default: () => null, pageSEO: { createCampaign: {} } }));
vi.mock("@/components/crowdpool/DesignCompanion", () => ({ DesignCompanion: () => null }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }));

import CreateCampaign, { FinancialTargetSection, ThingTermsFields, addDaysToDay, type MoneyChoice } from "./CreateCampaign";

const BAND = { softMinPct: 10, softMaxPct: 30, defaultPct: 20 };

/** The Money step with its own state, the way the wizard holds it. */
function MoneyStep({ inKind = 80000, error = null as string | null }) {
  const [choice, setChoice] = useState<MoneyChoice | null>(null);
  const [amount, setAmount] = useState(0);
  const [ma, setMa] = useState("");
  const [st, setSt] = useState("");
  const [days, setDays] = useState(90);
  return (
    <FinancialTargetSection
      inKindTotal={inKind}
      landTotal={inKind}
      equipmentTotal={0}
      rolesTotal={0}
      otherTotal={0}
      currency="USD"
      currencySymbol="$"
      moneyChoice={choice}
      onMoneyChoice={setChoice}
      financialTarget={amount}
      setFinancialTarget={setAmount}
      moneyError={error}
      band={BAND}
      maEarthUrl={ma}
      setMaEarthUrl={setMa}
      stewardUrl={st}
      setStewardUrl={setSt}
      routeErrors={{}}
      durationDays={days}
      setDurationDays={setDays}
    />
  );
}

describe("the Money step", () => {
  it("asks for an explicit choice, with nothing selected at first", () => {
    render(<MoneyStep />);
    expect(screen.getByRole("heading", { name: "Money this project needs" })).toBeInTheDocument();
    expect(screen.getByText(
      "Most of what a land project needs isn't money. Campaigns usually ask for 10 to 30 percent of their whole ask in money, and some ask for none.",
    )).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "This project asks for money" })).not.toBeChecked();
    expect(screen.getByRole("radio", { name: "This project asks for no money" })).not.toBeChecked();
    expect(screen.queryByLabelText(/How much money/)).toBeNull();
  });

  it("shows the choice error on the field", () => {
    render(<MoneyStep error="Choose one to continue." />);
    expect(screen.getByRole("alert")).toHaveTextContent("Choose one to continue.");
    expect(screen.getByRole("radiogroup")).toHaveAttribute("aria-invalid", "true");
  });

  it("with money: the amount, the suggestion and its Use button, and the note inside the band", () => {
    render(<MoneyStep />);
    fireEvent.click(screen.getByRole("radio", { name: "This project asks for money" }));
    const amount = screen.getByLabelText("How much money, in USD?");
    expect(screen.getByText("20 percent of your whole ask would be $20.0K.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Use $20.0K" }));
    expect(amount).toHaveValue(20000);
    expect(screen.getByText("Money is 20% of the whole ask.")).toBeInTheDocument();
    expect(screen.queryByText(/Most campaigns ask/)).toBeNull();
  });

  it("outside the band the note says so softly, and nothing blocks", () => {
    render(<MoneyStep />);
    fireEvent.click(screen.getByRole("radio", { name: "This project asks for money" }));
    fireEvent.change(screen.getByLabelText("How much money, in USD?"), { target: { value: "120000" } });
    expect(screen.getByText("Money is 60% of the whole ask. Most campaigns ask for 10 to 30 percent. You can send it as it is.")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("How much money, in USD?"), { target: { value: "2000" } });
    expect(screen.getByText("Money is 2% of the whole ask. Most campaigns ask for 10 to 30 percent. You can send it as it is.")).toBeInTheDocument();
  });

  it("the slider runs 0 to 50 percent of the whole ask", () => {
    render(<MoneyStep />);
    fireEvent.click(screen.getByRole("radio", { name: "This project asks for money" }));
    const slider = screen.getByRole("slider", { name: "Money as a share of the whole ask" });
    expect(slider).toHaveAttribute("min", "0");
    expect(slider).toHaveAttribute("max", "50");
    fireEvent.change(slider, { target: { value: "25" } });
    // money = inKind x 25 / 75
    expect(screen.getByLabelText("How much money, in USD?")).toHaveValue(26667);
    expect(screen.getByText("Money is 25% of the whole ask.")).toBeInTheDocument();
  });

  it("with money: the route quiz and the two route fields with the checking line", () => {
    render(<MoneyStep />);
    fireEvent.click(screen.getByRole("radio", { name: "This project asks for money" }));
    expect(screen.getByRole("heading", { name: "Where can people put money in?" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Which money route fits this project?" })).toBeInTheDocument();
    expect(screen.getByText("Three quick questions. The answer picks a route below. You can add both.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Under $100,000" })).toBeInTheDocument();
    expect(screen.getByLabelText("Your project's page on Ma Earth")).toBeInTheDocument();
    expect(screen.getByLabelText("Your project's page on Steward")).toBeInTheDocument();
    expect(screen.getByText(
      "The ReGen Civics team checks each link before it shows on your campaign. The money goes straight to your project and never passes through ReGen Civics.",
    )).toBeInTheDocument();
  });

  it("no money shows no amount, no routes, and no crypto copy", () => {
    const { container } = render(<MoneyStep />);
    fireEvent.click(screen.getByRole("radio", { name: "This project asks for no money" }));
    expect(screen.queryByLabelText(/How much money/)).toBeNull();
    expect(screen.queryByLabelText("Your project's page on Ma Earth")).toBeNull();
    expect(container.textContent).not.toMatch(/crypto|USDC|donation|pledge|funded/i);
  });
});

describe("give or lend on a thing need", () => {
  function Terms() {
    const [terms, setTerms] = useState({});
    return <ThingTermsFields idBase="t" terms={terms} defaultLoan={false} onChange={(p) => setTerms((t) => ({ ...t, ...p }))} />;
  }

  it("keeps at least one mode on, and says why", () => {
    render(<Terms />);
    const gift = screen.getByRole("button", { name: "As a gift" });
    const loan = screen.getByRole("button", { name: "On loan" });
    expect(gift).toHaveAttribute("aria-pressed", "true");
    expect(loan).toHaveAttribute("aria-pressed", "false");
    fireEvent.click(gift);
    expect(screen.getByRole("alert")).toHaveTextContent("Choose at least one: as a gift or on loan.");
    expect(gift).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(loan);
    fireEvent.click(gift);
    expect(gift).toHaveAttribute("aria-pressed", "false");
    expect(loan).toHaveAttribute("aria-pressed", "true");
  });

  it("says when a window ends before it starts", () => {
    render(<Terms />);
    fireEvent.change(screen.getByLabelText("Needed from (optional)"), { target: { value: "2026-11-01" } });
    fireEvent.change(screen.getByLabelText("Needed until (optional)"), { target: { value: "2026-10-01" } });
    expect(screen.getByRole("alert")).toHaveTextContent("A need can't end before it starts.");
  });

  it("adds days in UTC", () => {
    expect(addDaysToDay("2026-10-05", 364)).toBe("2027-10-04");
    expect(addDaysToDay("2026-03-28", 7)).toBe("2026-04-04");
  });
});

describe("CreateCampaign sends the money choice", () => {
  beforeEach(() => mutate.mockClear());

  async function fillToMoneyStep() {
    render(<CreateCampaign />);
    fireEvent.click(screen.getByRole("button", { name: /Hill Farm/ }));
    fireEvent.click(screen.getByRole("button", { name: /Use Template/ }));
    fireEvent.click(await screen.findByRole("button", { name: /Ecovillage/ }));
    fireEvent.change(screen.getByPlaceholderText(/app\.hypha\.earth/), {
      target: { value: "https://app.hypha.earth/en/dho/hill-farm/agreements/create/propose-contribution" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Money$/ }));
  }

  const lastPayload = () => mutate.mock.calls[mutate.mock.calls.length - 1][0];

  it("the step is called Money, and the old 20% fallback is gone: no choice, no send", async () => {
    await fillToMoneyStep();
    expect(screen.queryByText(/Financial Target/)).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /Create Campaign/ }));
    expect(mutate).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent("Choose one to continue.");
  });

  it("no money sends 0 and no routes", async () => {
    await fillToMoneyStep();
    fireEvent.click(screen.getByRole("radio", { name: "This project asks for no money" }));
    expect(screen.getByTestId("tracker-money")).toHaveTextContent(/^Money: \$0 \(0% of the whole ask\)$/);
    fireEvent.click(screen.getByRole("button", { name: /Create Campaign/ }));
    expect(mutate).toHaveBeenCalledTimes(1);
    expect(lastPayload().financialTarget).toBe(0);
    expect(lastPayload().moneyRoutes).toBeUndefined();
  });

  it("asking for money needs an amount", async () => {
    await fillToMoneyStep();
    fireEvent.click(screen.getByRole("radio", { name: "This project asks for money" }));
    fireEvent.click(screen.getByRole("button", { name: /Create Campaign/ }));
    expect(mutate).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent("Add how much money this project asks for.");
  });

  it("outside the band the note shows and sending still works, with the routes", async () => {
    await fillToMoneyStep();
    fireEvent.click(screen.getByRole("radio", { name: "This project asks for money" }));
    fireEvent.change(screen.getByLabelText("How much money, in USD?"), { target: { value: "5000" } });
    expect(screen.getByText(/Most campaigns ask for 10 to 30 percent\. You can send it as it is\./)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Your project's page on Ma Earth"), { target: { value: "https://maearth.com/p/hill-farm" } });
    fireEvent.click(screen.getByRole("button", { name: /Create Campaign/ }));
    expect(mutate).toHaveBeenCalledTimes(1);
    expect(lastPayload().financialTarget).toBe(5000);
    expect(lastPayload().moneyRoutes).toEqual([{ partner: "maearth", url: "https://maearth.com/p/hill-farm" }]);
  });

  it("a route link off the partner's site stops the send with the server's words", async () => {
    await fillToMoneyStep();
    fireEvent.click(screen.getByRole("radio", { name: "This project asks for money" }));
    fireEvent.change(screen.getByLabelText("How much money, in USD?"), { target: { value: "5000" } });
    fireEvent.change(screen.getByLabelText("Your project's page on Steward"), { target: { value: "http://gosteward.com/p/hill" } });
    fireEvent.click(screen.getByRole("button", { name: /Create Campaign/ }));
    expect(mutate).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Use your project's page on Steward. The link has to start with https://gosteward.com.",
    );
  });

  it("needs carry their give-or-lend modes, dates and where the work happens", async () => {
    await fillToMoneyStep();
    // Equipment templates start as gift or loan; give the first a window.
    fireEvent.click(screen.getByRole("button", { name: /Equipment$/ }));
    fireEvent.change(screen.getAllByLabelText("Needed from (optional)")[0], { target: { value: "2026-11-01" } });
    fireEvent.change(screen.getAllByLabelText("Needed until (optional)")[0], { target: { value: "2027-02-28" } });
    expect(screen.getByText(/^Needed 1 Nov( 2026)? to 28 Feb 2027\. Give or lend\.$/)).toBeInTheDocument();
    // A role starts on a date, and one is remote.
    fireEvent.click(screen.getByRole("button", { name: /Roles$/ }));
    fireEvent.change(screen.getAllByLabelText("Starts on (optional)")[0], { target: { value: "2026-10-05" } });
    const firstRoleRemote = screen.getAllByRole("radio", { name: "Remote" })[0];
    fireEvent.click(firstRoleRemote);
    fireEvent.click(screen.getByRole("button", { name: /Money$/ }));
    fireEvent.click(screen.getByRole("radio", { name: "This project asks for no money" }));
    fireEvent.click(screen.getByRole("button", { name: /Create Campaign/ }));

    const items = lastPayload().items as Array<Record<string, unknown>>;
    const equipment = items.filter((i) => i.category === "equipment");
    expect(equipment.length).toBeGreaterThan(0);
    expect(equipment.every((i) => i.acceptsGift === true && i.acceptsLoan === true)).toBe(true);
    expect(equipment[0]).toMatchObject({ neededFrom: "2026-11-01", neededUntil: "2027-02-28" });
    const roles = items.filter((i) => i.category === "role");
    expect(roles[0]).toMatchObject({ neededFrom: "2026-10-05", neededUntil: "2027-10-04", workMode: "remote" });
    expect(roles.slice(1).every((r) => r.workMode === "on_site" && r.neededFrom === undefined)).toBe(true);
    // No need is ever a money kind or a legacy loan.
    expect(items.some((i) => i.kind === "crypto" || i.kind === "financial_link" || i.kind === "loan")).toBe(false);
  });

  it("the live tracker reads the in-kind ask and, once chosen, the money share", async () => {
    await fillToMoneyStep();
    expect(screen.getByText(/^In-kind ask: /)).toBeInTheDocument();
    expect(screen.queryByTestId("tracker-money")).toBeNull();
    fireEvent.click(screen.getByRole("radio", { name: "This project asks for money" }));
    fireEvent.change(screen.getByLabelText("How much money, in USD?"), { target: { value: "5000" } });
    expect(screen.getByTestId("tracker-money")).toHaveTextContent(/^Money: \$5\.0K \(\d+% of the whole ask\)$/);
  });
});
