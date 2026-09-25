import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { BringChips, availableChips, needMatchesChips } from "./BringChips";
import type { NeedChip } from "@shared/crowdpoolNeedAction";
import type { NeedProgress } from "@shared/campaignProgress";

const items = [
  { id: 1, kind: "item", equipmentName: "Tractor" },
  { id: 2, kind: "loan", equipmentName: "Chipper" },
  { id: 3, kind: "role", roleTitle: "Cook" },
  { id: 4, kind: "shift", roleTitle: "Planting day" },
  { id: 5, kind: "knowledge", resourceName: "Soil class" },
  { id: 6, kind: "crypto", resourceName: "USDC" },
];
const filled = { filled: true } as NeedProgress;
const open = { filled: false } as NeedProgress;

function Harness({ byNeed, showMoney = false, onMoney = vi.fn() }: { byNeed?: Record<number, NeedProgress>; showMoney?: boolean; onMoney?: () => void }) {
  const [selected, setSelected] = useState<NeedChip[]>([]);
  const inKind = items.filter((i) => i.kind !== "crypto");
  const shown = inKind.filter((i) => needMatchesChips(i, selected)).length;
  return (
    <BringChips
      items={items}
      byNeed={byNeed}
      selected={selected}
      onChange={setSelected}
      showMoney={showMoney}
      onMoney={onMoney}
      shownCount={shown}
      totalCount={inKind.length}
    />
  );
}

describe("BringChips", () => {
  it("shows a chip only when an open need falls under it; money kinds never make one", () => {
    expect(availableChips(items)).toEqual(["things", "time", "role", "knowhow"]);
    expect(availableChips(items, { 3: filled, 4: filled, 1: open })).toEqual(["things", "knowhow"]);
    render(<Harness byNeed={{ 3: filled, 4: open }} />);
    expect(screen.getByRole("heading", { name: "What can you bring?" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Things" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Time" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Know-how" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "A role" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Money" })).toBeNull();
  });

  it("chips toggle aria-pressed, combine with OR, and say how many needs show", () => {
    render(<Harness />);
    const things = screen.getByRole("button", { name: "Things" });
    const time = screen.getByRole("button", { name: "Time" });
    expect(things).toHaveAttribute("aria-pressed", "false");
    fireEvent.click(things);
    expect(things).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText("Showing 2 of 5 needs.")).toBeInTheDocument();
    fireEvent.click(time);
    expect(screen.getByText("Showing 3 of 5 needs.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Show all" }));
    expect(things).toHaveAttribute("aria-pressed", "false");
    expect(time).toHaveAttribute("aria-pressed", "false");
    expect(screen.queryByText(/Showing/)).toBeNull();
  });

  it("the money chip moves to the money block and filters nothing", () => {
    const onMoney = vi.fn();
    render(<Harness showMoney onMoney={onMoney} />);
    const money = screen.getByRole("button", { name: "Money" });
    expect(money).not.toHaveAttribute("aria-pressed");
    fireEvent.click(money);
    expect(onMoney).toHaveBeenCalled();
    expect(screen.queryByText(/Showing/)).toBeNull();
  });

  it("renders nothing with no open need and no money", () => {
    const { container } = render(<Harness byNeed={{ 1: filled, 2: filled, 3: filled, 4: filled, 5: filled }} />);
    expect(container.textContent).toBe("");
  });

  it("needMatchesChips: no chip shows every need", () => {
    expect(needMatchesChips({ kind: "role" }, [])).toBe(true);
    expect(needMatchesChips({ kind: "role" }, ["things"])).toBe(false);
    expect(needMatchesChips({ kind: "loan" }, ["things"])).toBe(true);
  });
});
