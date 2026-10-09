/**
 * The steward's Edit campaign sheet (bundle 1, item 9): prefill from the
 * project page's front, the days field that never snaps back, removing and
 * adding needs, field checks on their fields, and a server refusal inline.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";

type MutateOpts = { onSuccess?: () => void; onError?: (e: { message: string }) => void };
const sent: Array<Record<string, any>> = [];
let refuseWith: string | null = null;
const toastSuccess = vi.fn();

vi.mock("@/lib/trpc", () => ({
  trpc: {
    campaigns: {
      updateDraft: {
        useMutation: () => ({
          isPending: false,
          mutate: (vars: Record<string, any>, opts?: MutateOpts) => {
            sent.push(vars);
            if (refuseWith) opts?.onError?.({ message: refuseWith });
            else opts?.onSuccess?.();
          },
        }),
      },
    },
  },
}));
vi.mock("sonner", () => ({ toast: { success: (...a: unknown[]) => toastSuccess(...a), error: vi.fn() } }));

import { EditCampaignDialog, type EditableCampaign } from "./EditCampaignDialog";
import { DURATION, EDIT_CAMPAIGN, ZERO_VALUE } from "@shared/crowdpoolCopy";

const front: EditableCampaign = {
  id: 44,
  title: "Hill Farm &amp; Orchard",
  description: "A season on the hill.",
  financialTarget: 500,
  durationDays: 90,
  items: [
    {
      id: 11, category: "equipment", kind: "item", capitalType: "material", capacityUnit: "count",
      equipmentName: "Wood chipper", estimatedValue: 1000, quantityWanted: 1,
      neededFrom: "2026-11-01", neededUntil: "2026-12-15", acceptsGift: 1, acceptsLoan: 1, workMode: null,
    },
    {
      id: 12, category: "role", kind: "role", capitalType: "experiential", capacityUnit: "hours_per_week",
      roleTitle: "Garden lead", roleDescription: "Beds and paths", estimatedValue: 4000, quantityWanted: 10, hoursPerWeek: 10,
      neededFrom: null, neededUntil: null, acceptsGift: 1, acceptsLoan: 0, workMode: "on_site",
    },
    // Money is never a need: the sheet leaves it out.
    { id: 13, category: "resource", kind: "crypto", resourceName: "Legacy money need", estimatedValue: 50, quantityWanted: 1 },
  ],
};

const onClose = vi.fn();
const onSaved = vi.fn();

function sheet() {
  return render(<EditCampaignDialog open onClose={onClose} campaign={front} currencySymbol="$" onSaved={onSaved} />);
}
const block = (key: string) => screen.getByTestId(`edit-need-${key}`);
const save = () => fireEvent.click(screen.getByRole("button", { name: EDIT_CAMPAIGN.save }));

beforeEach(() => {
  sent.length = 0;
  refuseWith = null;
  toastSuccess.mockClear();
  onClose.mockClear();
  onSaved.mockClear();
});

describe("EditCampaignDialog", () => {
  it("fills every field from the front, with two needs and no money need", () => {
    sheet();
    expect(screen.getByRole("heading", { name: EDIT_CAMPAIGN.title })).toBeInTheDocument();
    expect(screen.getByLabelText(EDIT_CAMPAIGN.titleLabel)).toHaveValue("Hill Farm & Orchard");
    expect(screen.getByLabelText(EDIT_CAMPAIGN.descriptionLabel)).toHaveValue("A season on the hill.");
    expect(screen.getByLabelText("Money this campaign asks for ($)")).toHaveValue("500");
    expect(screen.getByLabelText(EDIT_CAMPAIGN.daysLabel)).toHaveValue("90");
    expect(screen.getByText("Up to 273 days, about nine months.")).toBeInTheDocument();

    const chipper = within(block("need-11"));
    expect(chipper.getByLabelText(EDIT_CAMPAIGN.needName)).toHaveValue("Wood chipper");
    expect(chipper.getByLabelText("What it's worth ($)")).toHaveValue("1000");
    expect(chipper.getByLabelText(EDIT_CAMPAIGN.howMany)).toHaveValue("1");
    expect(chipper.getByLabelText(EDIT_CAMPAIGN.wantedFrom)).toHaveValue("2026-11-01");
    expect(chipper.getByLabelText(EDIT_CAMPAIGN.wantedUntil)).toHaveValue("2026-12-15");
    expect(chipper.getByLabelText(EDIT_CAMPAIGN.asGift)).toBeChecked();
    expect(chipper.getByLabelText(EDIT_CAMPAIGN.onLoan)).toBeChecked();

    const lead = within(block("need-12"));
    expect(lead.getByLabelText(EDIT_CAMPAIGN.needName)).toHaveValue("Garden lead");
    expect(lead.getByLabelText(EDIT_CAMPAIGN.hoursAWeek)).toHaveValue("10");
    expect(lead.queryByLabelText(EDIT_CAMPAIGN.asGift)).toBeNull();

    expect(screen.queryByDisplayValue("Legacy money need")).toBeNull();
    expect(screen.queryByTestId("edit-need-need-13")).toBeNull();
  });

  it("lets the days field sit empty while typing, says so on blur, and saves 45", async () => {
    sheet();
    const days = screen.getByLabelText(EDIT_CAMPAIGN.daysLabel);
    fireEvent.change(days, { target: { value: "" } });
    expect(days).toHaveValue("");
    fireEvent.blur(days);
    expect(days).toHaveValue("");
    expect(screen.getByText(EDIT_CAMPAIGN.errors.days)).toBeInTheDocument();
    expect(days).toHaveAttribute("aria-invalid", "true");

    fireEvent.change(days, { target: { value: "400" } });
    fireEvent.blur(days);
    expect(screen.getByText(DURATION.tooLong)).toBeInTheDocument();

    fireEvent.change(days, { target: { value: "45" } });
    expect(screen.queryByText(DURATION.tooLong)).toBeNull();
    save();
    await waitFor(() => expect(sent).toHaveLength(1));
    expect(sent[0]).toMatchObject({ id: 44, title: "Hill Farm & Orchard", financialTarget: 500, durationDays: 45 });
    expect(toastSuccess).toHaveBeenCalledWith(EDIT_CAMPAIGN.saved);
    expect(onSaved).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it("removes a need after a confirm and adds a role, and sends the right needs", async () => {
    sheet();
    const chipper = within(block("need-11"));
    fireEvent.click(chipper.getByRole("button", { name: EDIT_CAMPAIGN.remove }));
    // Nothing goes until they confirm; "Keep it" brings the button back.
    fireEvent.click(chipper.getByRole("button", { name: EDIT_CAMPAIGN.removeNo }));
    fireEvent.click(chipper.getByRole("button", { name: EDIT_CAMPAIGN.remove }));
    expect(chipper.getByText("Remove Wood chipper?")).toBeInTheDocument();
    fireEvent.click(chipper.getByRole("button", { name: EDIT_CAMPAIGN.removeYes }));
    expect(screen.queryByTestId("edit-need-need-11")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: EDIT_CAMPAIGN.addRole }));
    const added = screen.getAllByTestId(/^edit-need-new-/);
    expect(added).toHaveLength(1);
    const role = within(added[0]);
    expect(role.getByLabelText(EDIT_CAMPAIGN.capitalLabel)).toHaveValue("experiential");
    fireEvent.change(role.getByLabelText(EDIT_CAMPAIGN.needName), { target: { value: "Cook for the work weekends" } });
    fireEvent.change(role.getByLabelText("What it's worth ($)"), { target: { value: "900" } });
    fireEvent.change(role.getByLabelText(EDIT_CAMPAIGN.hoursAWeek), { target: { value: "6" } });
    fireEvent.change(role.getByLabelText(EDIT_CAMPAIGN.capitalLabel), { target: { value: "health" } });

    // The garden lead's value changes too.
    fireEvent.change(within(block("need-12")).getByLabelText("What it's worth ($)"), { target: { value: "4500" } });
    save();
    await waitFor(() => expect(sent).toHaveLength(1));
    expect(sent[0].items).toEqual([
      {
        id: 12, category: "role", kind: "role", capitalType: "experiential", roleTitle: "Garden lead",
        roleDescription: "Beds and paths", estimatedValue: 4500, quantityWanted: 10, hoursPerWeek: 10, workMode: "on_site",
      },
      {
        category: "role", kind: "role", capitalType: "health", roleTitle: "Cook for the work weekends",
        estimatedValue: 900, quantityWanted: 6, hoursPerWeek: 6, workMode: "on_site",
      },
    ]);
  });

  it("adds a thing as a gift by default, with the material capital", async () => {
    sheet();
    fireEvent.click(screen.getByRole("button", { name: EDIT_CAMPAIGN.addThing }));
    const thing = within(screen.getAllByTestId(/^edit-need-new-/)[0]);
    expect(thing.getByLabelText(EDIT_CAMPAIGN.asGift)).toBeChecked();
    expect(thing.getByLabelText(EDIT_CAMPAIGN.onLoan)).not.toBeChecked();
    fireEvent.change(thing.getByLabelText(EDIT_CAMPAIGN.needName), { target: { value: "Seed trays" } });
    fireEvent.change(thing.getByLabelText("What it's worth ($)"), { target: { value: "60" } });
    fireEvent.change(thing.getByLabelText(EDIT_CAMPAIGN.howMany), { target: { value: "3" } });
    save();
    await waitFor(() => expect(sent).toHaveLength(1));
    expect(sent[0].items[2]).toEqual({
      category: "resource", kind: "item", capitalType: "material", resourceName: "Seed trays",
      estimatedValue: 60, quantityWanted: 3, acceptsGift: true, acceptsLoan: false,
    });
  });

  it("shows each check on its own field, focuses the first, and sends nothing", async () => {
    sheet();
    const chipper = within(block("need-11"));
    fireEvent.change(chipper.getByLabelText("What it's worth ($)"), { target: { value: "0" } });
    fireEvent.click(chipper.getByLabelText(EDIT_CAMPAIGN.asGift));
    fireEvent.click(chipper.getByLabelText(EDIT_CAMPAIGN.onLoan));
    fireEvent.change(chipper.getByLabelText(EDIT_CAMPAIGN.wantedUntil), { target: { value: "2026-10-20" } });
    save();
    expect(chipper.getByText(ZERO_VALUE.field)).toBeInTheDocument();
    expect(chipper.getByText("A need can't end before it starts.")).toBeInTheDocument();
    expect(chipper.getByText("Choose at least one: as a gift or on loan.")).toBeInTheDocument();
    expect(chipper.getByLabelText("What it's worth ($)")).toHaveAttribute("aria-invalid", "true");
    await waitFor(() => expect(document.activeElement).toBe(chipper.getByLabelText("What it's worth ($)")));
    expect(sent).toHaveLength(0);
  });

  it("shows a server refusal inline above the buttons and stays open", async () => {
    refuseWith = "Someone just changed this campaign. Refresh and try again.";
    sheet();
    save();
    await waitFor(() => expect(sent).toHaveLength(1));
    const alert = await screen.findByText("Someone just changed this campaign. Refresh and try again.");
    expect(alert.closest('[role="alert"]')).not.toBeNull();
    expect(onClose).not.toHaveBeenCalled();
    expect(toastSuccess).not.toHaveBeenCalled();
  });
});
