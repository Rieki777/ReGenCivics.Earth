/**
 * No need at 0, and nine months at most, in the campaign wizard (ruling
 * 2026-09-27; build spec 2026-09-27, sections 5.3 and Q5).
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";

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
// The coach, reduced to one suggestion that arrives with no value.
vi.mock("@/components/crowdpool/DesignCompanion", () => ({
  DesignCompanion: ({ onAddSuggestion }: { onAddSuggestion: (s: unknown) => void }) => (
    <button
      type="button"
      onClick={() => onAddSuggestion({ kind: "item", title: "Seed library shelves", capitalType: "material", estimatedValue: 0, rationale: "" })}
    >
      Take the coach's suggestion
    </button>
  ),
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }));

import CreateCampaign, { firstZeroValueNeed } from "./CreateCampaign";
import { DURATION, DURATION_FIELD, ZERO_VALUE } from "@shared/crowdpoolCopy";

const FIELD = "Add what this need is worth. A need can't be listed at 0.";
const lastPayload = () => mutate.mock.calls[mutate.mock.calls.length - 1][0];
const step = (label: string) => screen.getByRole("button", { name: new RegExp(`^\\s*\\d\\s*${label}\\s*$`) });

/** The wizard with its application picked (the steps show after that). */
function start() {
  render(<CreateCampaign />);
  fireEvent.click(screen.getByRole("button", { name: /Hill Farm/ }));
}

/** The wizard with an application picked, the Ecovillage template loaded and a DAO link. */
async function startWithTemplate() {
  start();
  fireEvent.click(screen.getByRole("button", { name: /Use Template/ }));
  fireEvent.click(await screen.findByRole("button", { name: /Ecovillage/ }));
  fireEvent.change(screen.getByPlaceholderText(/app\.hypha\.earth/), {
    target: { value: "https://app.hypha.earth/en/dho/hill-farm/agreements/create/propose-contribution" },
  });
}

async function createWithNoMoney() {
  fireEvent.click(step("Money"));
  fireEvent.click(screen.getByRole("radio", { name: "This project asks for no money" }));
  fireEvent.click(screen.getByRole("button", { name: /Create Campaign/ }));
}

beforeEach(() => mutate.mockClear());

describe("the copy", () => {
  it("is Rye's words", () => {
    expect(ZERO_VALUE.field).toBe(FIELD);
    expect(DURATION.intro).toBe("How long should your campaign run? Up to nine months, 273 days.");
  });
});

describe("an Add form refuses a need at 0", () => {
  it("Other Needs: stops on the value field with the message and focus, and adds nothing", async () => {
    start();
    fireEvent.click(step("Other Needs"));
    fireEvent.click(screen.getByRole("button", { name: /^Building Supplies/ }));
    const value = screen.getByLabelText(/^Estimated Value/);
    fireEvent.click(screen.getByRole("button", { name: "Add Item" }));
    expect(screen.getByRole("alert")).toHaveTextContent(FIELD);
    expect(value).toHaveAttribute("aria-invalid", "true");
    expect(value).toHaveFocus();
    expect(screen.getByText("Section Total").nextSibling).toHaveTextContent("$0");

    // A value above 0 goes through and clears the message.
    fireEvent.change(value, { target: { value: "1500" } });
    expect(screen.queryByRole("alert")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Add Item" }));
    expect(screen.getByText("Section Total").nextSibling).toHaveTextContent("$1.5K");
  });

  it("Equipment: the value typed is the value listed, and 0 is refused", async () => {
    start();
    fireEvent.click(step("Equipment"));
    fireEvent.click(screen.getByRole("button", { name: "Add Custom Equipment" }));
    fireEvent.change(screen.getByPlaceholderText("e.g., Custom Tractor"), { target: { value: "Seed press" } });
    const value = screen.getByLabelText(/^Estimated Value/);
    fireEvent.click(screen.getByRole("button", { name: "Add Equipment" }));
    expect(screen.getByRole("alert")).toHaveTextContent(FIELD);
    expect(value).toHaveFocus();

    fireEvent.change(value, { target: { value: "650" } });
    fireEvent.click(screen.getByRole("button", { name: "Add Equipment" }));
    // It used to drop the typed value and list the press at 0.
    expect(screen.getByText("Seed press")).toBeInTheDocument();
    expect(screen.getByText("Section Total").nextSibling).toHaveTextContent("$650");
  });
});

describe("a listed need at 0", () => {
  it("a coach suggestion with no value arrives with the message on its row and its value field open", async () => {
    start();
    fireEvent.click(screen.getByRole("button", { name: "Take the coach's suggestion" }));
    fireEvent.click(step("Other Needs"));
    const field = screen.getByLabelText("What it's worth ($)");
    expect(field).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByRole("alert")).toHaveTextContent(FIELD);
    expect(field).toHaveAccessibleDescription(FIELD);

    // Fixing it: the field stays open while typing and the message goes.
    fireEvent.focus(field);
    fireEvent.change(field, { target: { value: "8" } });
    expect(screen.queryByRole("alert")).toBeNull();
    expect(screen.getByLabelText("What it's worth ($)")).toHaveValue(8);
    fireEvent.change(screen.getByLabelText("What it's worth ($)"), { target: { value: "800" } });
    expect(screen.getByLabelText("What it's worth ($)")).toHaveAttribute("aria-invalid", "false");
  });

  it("Create moves to the first need at 0, marks it and focuses its value; nothing is sent", async () => {
    await startWithTemplate();
    // Clear the first template tool's value on its row.
    fireEvent.click(step("Equipment"));
    const firstValue = screen.getAllByLabelText("What it's worth ($)")[0];
    fireEvent.change(firstValue, { target: { value: "0" } });
    expect(screen.getByRole("alert")).toHaveTextContent(FIELD);

    await createWithNoMoney();
    expect(mutate).not.toHaveBeenCalled();
    // Back on Equipment, with the row flagged and the cursor in its value.
    expect(step("Equipment").className).toContain("bg-[#4a7c59]");
    const flagged = screen.getAllByLabelText("What it's worth ($)").find((el) => el.getAttribute("aria-invalid") === "true")!;
    expect(flagged).toBeTruthy();
    await waitFor(() => expect(flagged).toHaveFocus());

    // With a value again, Create sends, and no need goes at 0.
    fireEvent.change(flagged, { target: { value: "90000" } });
    await createWithNoMoney();
    expect(mutate).toHaveBeenCalledTimes(1);
    const items = lastPayload().items as Array<{ estimatedValue: number }>;
    expect(items.every((i) => i.estimatedValue > 0)).toBe(true);
  });

  it("firstZeroValueNeed reads the steps in order", () => {
    const land = [{ id: "l1", hectares: 5, regions: [], features: [], description: "", videoUrl: "", estimatedValue: 50000, customValue: null }];
    const equipment = [{ id: "e1", category: "tools", name: "Saw", quantity: 2, description: "", estimatedValue: 0, customValue: null }];
    const roles = [{ id: "r1", title: "Cook", category: "", description: "", hoursPerWeek: 10, weeksNeeded: 4, hourlyRate: 0, estimatedValue: 0, customValue: null }];
    const other = [{ id: "o1", category: "other", title: "Permit", description: "", estimatedValue: 0, customValue: 250 }];
    expect(firstZeroValueNeed({ land, equipment, roles, other })).toEqual({ step: 1, id: "e1" });
    expect(firstZeroValueNeed({ land, equipment: [], roles, other })).toEqual({ step: 2, id: "r1" });
    expect(firstZeroValueNeed({ land, equipment: [], roles: [], other })).toBeNull();
    expect(firstZeroValueNeed({ land: [{ ...land[0], customValue: 0 }], equipment: [], roles: [], other: [] })).toEqual({ step: 0, id: "l1" });
  });
});

describe("a campaign runs nine months at most", () => {
  it("the day field clamps at 273, says why, and the presets end at nine months", async () => {
    await startWithTemplate();
    fireEvent.click(step("Money"));
    expect(screen.getByText(DURATION.intro)).toBeInTheDocument();
    const days = screen.getByRole("spinbutton", { name: DURATION_FIELD.daysLabel });
    expect(days).toHaveAttribute("max", "273");
    expect(screen.getByRole("slider", { name: DURATION_FIELD.daysLabel })).toHaveAttribute("max", "273");
    fireEvent.change(days, { target: { value: "400" } });
    expect(days).toHaveValue(273);
    expect(screen.getByText("A campaign runs nine months at most, 273 days.")).toBeInTheDocument();

    const presets = ["30d", "60d", "90d", "4mo", "6mo", "9mo"].map((label) => screen.getByRole("button", { name: label }));
    expect(presets).toHaveLength(6);
    expect(screen.queryByRole("button", { name: "1yr" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "9mo" }));
    expect(days).toHaveValue(270);
    expect(screen.queryByText("A campaign runs nine months at most, 273 days.")).toBeNull();
    expect(within(screen.getByRole("slider", { name: DURATION_FIELD.daysLabel }).parentElement!).getByText("9 months")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("radio", { name: "This project asks for no money" }));
    fireEvent.click(screen.getByRole("button", { name: /Create Campaign/ }));
    expect(lastPayload().durationDays).toBe(270);
  });
});
