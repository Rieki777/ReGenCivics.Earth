/**
 * The steward's Edit campaign sheet (bundle 1, item 9): prefill from the
 * project page's front, the days field that never snaps back, removing and
 * adding needs, field checks on their fields, and a server refusal inline.
 * Save carries the version the sheet opened (seenUpdatedAt); a land need
 * shows its words in a box of its own; the sheet stops adding at 60 needs.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";

type MutateOpts = { onSuccess?: () => void; onError?: (e: { message: string; data?: { code: string } }) => void };
const sent: Array<Record<string, any>> = [];
let refuseWith: string | null = null;
let refuseCode: string | undefined;
const toastSuccess = vi.fn();

vi.mock("@/lib/trpc", () => ({
  trpc: {
    campaigns: {
      updateDraft: {
        useMutation: () => ({
          isPending: false,
          mutate: (vars: Record<string, any>, opts?: MutateOpts) => {
            sent.push(vars);
            if (refuseWith) opts?.onError?.({ message: refuseWith, data: refuseCode ? { code: refuseCode } : undefined });
            else opts?.onSuccess?.();
          },
        }),
      },
    },
  },
}));
vi.mock("sonner", () => ({ toast: { success: (...a: unknown[]) => toastSuccess(...a), error: vi.fn() } }));

import { EditCampaignDialog, type EditableCampaign, type EditableNeed } from "./EditCampaignDialog";
import { DURATION, EDIT_CAMPAIGN, ZERO_VALUE } from "@shared/crowdpoolCopy";

const OPENED = new Date("2026-10-09T17:00:00.000Z");
const front: EditableCampaign = {
  id: 44,
  updatedAt: OPENED,
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

function sheet(campaign: EditableCampaign = front, extra: { sentBack?: boolean } = {}) {
  return render(<EditCampaignDialog open onClose={onClose} campaign={campaign} currencySymbol="$" onSaved={onSaved} {...extra} />);
}
const thingNeed = (id: number): EditableNeed => ({
  id, category: "resource", kind: "item", capitalType: "material", capacityUnit: "count",
  resourceName: `Crate ${id}`, estimatedValue: 10, quantityWanted: 1, acceptsGift: 1, acceptsLoan: 0,
});
const block = (key: string) => screen.getByTestId(`edit-need-${key}`);
const save = () => fireEvent.click(screen.getByRole("button", { name: EDIT_CAMPAIGN.save }));

beforeEach(() => {
  sent.length = 0;
  refuseWith = null;
  refuseCode = undefined;
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
    // The version the sheet opened, so a co-steward's save in between is caught.
    expect(sent[0].seenUpdatedAt).toEqual(OPENED);
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

  it("shows a server refusal inline above the buttons and stays open, and a CONFLICT fetches the campaign again", async () => {
    refuseWith = "Someone just changed this campaign. Refresh and try again.";
    refuseCode = "CONFLICT";
    sheet();
    save();
    await waitFor(() => expect(sent).toHaveLength(1));
    const alert = await screen.findByText("Someone just changed this campaign. Refresh and try again.");
    expect(alert.closest('[role="alert"]')).not.toBeNull();
    expect(onClose).not.toHaveBeenCalled();
    expect(toastSuccess).not.toHaveBeenCalled();
    expect(onSaved).toHaveBeenCalledTimes(1);
  });

  it("shows the plain line, never the list, when an input check comes back from the server", async () => {
    refuseWith = '[\n  {\n    "code": "too_big",\n    "maximum": 60,\n    "path": ["items"]\n  }\n]';
    refuseCode = "BAD_REQUEST";
    sheet();
    save();
    expect(await screen.findByText(EDIT_CAMPAIGN.failed)).toBeInTheDocument();
    expect(screen.queryByText(/too_big/)).toBeNull();
    expect(onSaved).not.toHaveBeenCalled();
  });

  it("speaks to the review team's note only when it was sent back", () => {
    const { unmount } = sheet();
    expect(screen.getByText(EDIT_CAMPAIGN.intro)).toBeInTheDocument();
    expect(screen.queryByText(EDIT_CAMPAIGN.introSentBack)).toBeNull();
    unmount();
    sheet(front, { sentBack: true });
    expect(screen.getByText(EDIT_CAMPAIGN.introSentBack)).toBeInTheDocument();
  });

  it("fills again from a refresh that lands before the steward changes anything, and never after", () => {
    const later = new Date("2026-10-09T17:00:05.000Z");
    const { rerender } = sheet();
    rerender(
      <EditCampaignDialog open onClose={onClose} campaign={{ ...front, updatedAt: later, title: "Hill Farm, saved a moment ago" }} currencySymbol="$" onSaved={onSaved} />,
    );
    const title = screen.getByLabelText(EDIT_CAMPAIGN.titleLabel);
    expect(title).toHaveValue("Hill Farm, saved a moment ago");

    fireEvent.change(title, { target: { value: "Hill Farm, my words" } });
    rerender(
      <EditCampaignDialog open onClose={onClose} campaign={{ ...front, updatedAt: new Date("2026-10-09T17:01:00.000Z"), title: "Someone else's title" }} currencySymbol="$" onSaved={onSaved} />,
    );
    expect(screen.getByLabelText(EDIT_CAMPAIGN.titleLabel)).toHaveValue("Hill Farm, my words");
    save();
    // It still sends the version it was filled from.
    expect(sent[0]).toMatchObject({ title: "Hill Farm, my words", seenUpdatedAt: later });
  });

  it("shows a land need's words in a box of their own, and never saves a made-up name into them", async () => {
    const withLand: EditableCampaign = {
      ...front,
      items: [
        {
          id: 21, category: "land", kind: "item", capitalType: "living", capacityUnit: "count", estimatedValue: 9000, quantityWanted: 1,
          hectares: 4, region: "Devon", landDescription: "South-facing pasture.\nA spring at the top.", acceptsGift: 0, acceptsLoan: 1,
        },
        {
          id: 22, category: "land", kind: "item", capitalType: "living", capacityUnit: "count", estimatedValue: 500, quantityWanted: 1,
          hectares: 2, region: "Cornwall", landDescription: null, acceptsGift: 0, acceptsLoan: 1,
        },
      ],
    };
    sheet(withLand);
    const first = within(block("need-21"));
    expect(first.queryByLabelText(EDIT_CAMPAIGN.needName)).toBeNull();
    expect(first.getByText(EDIT_CAMPAIGN.kinds.land)).toBeInTheDocument();
    const about = first.getByLabelText(EDIT_CAMPAIGN.landAbout);
    expect(about.tagName).toBe("TEXTAREA");
    expect(about).toHaveValue("South-facing pasture.\nA spring at the top.");
    // The second has no words of its own: its box starts empty.
    expect(within(block("need-22")).getByLabelText(EDIT_CAMPAIGN.landAbout)).toHaveValue("");
    fireEvent.click(within(block("need-22")).getByRole("button", { name: EDIT_CAMPAIGN.remove }));
    expect(within(block("need-22")).getByText("Remove this land?")).toBeInTheDocument();
    fireEvent.click(within(block("need-22")).getByRole("button", { name: EDIT_CAMPAIGN.removeNo }));

    save();
    await waitFor(() => expect(sent).toHaveLength(1));
    expect(sent[0].items[0]).toMatchObject({ id: 21, category: "land", landDescription: "South-facing pasture.\nA spring at the top." });
    expect(sent[0].items[1].id).toBe(22);
    expect("landDescription" in sent[0].items[1]).toBe(false);
  });

  it("stops offering Add a need past 60 needs, and asks for fewer before saving", async () => {
    // A campaign started with more needs than the sheet saves (create has no cap).
    sheet({ ...front, items: Array.from({ length: 61 }, (_, i) => thingNeed(200 + i)) });
    expect(screen.queryByRole("button", { name: EDIT_CAMPAIGN.addThing })).toBeNull();
    expect(screen.queryByRole("button", { name: EDIT_CAMPAIGN.addRole })).toBeNull();
    expect(screen.getByTestId("edit-needs-full")).toHaveTextContent(EDIT_CAMPAIGN.needsFull(60));
    save();
    expect(screen.getByText(EDIT_CAMPAIGN.errors.tooManyNeeds(60))).toBeInTheDocument();
    await waitFor(() => expect(document.activeElement?.id).toBe("edit-needs"));
    expect(sent).toHaveLength(0);
  }, 30_000);
});
