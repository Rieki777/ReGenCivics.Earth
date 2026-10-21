/**
 * BioregionListbox replaced a cmdk list so a bioregion picker opens without
 * mounting a component per bioregion (STEERING.md section 13). These pin the
 * behaviour it has to keep from cmdk: the same matches in the same order, the
 * first match highlighted, the keys, pointer highlight, picking, and the
 * picker-specific empty state.
 */
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { defaultFilter } from "cmdk";
import { BioregionListbox, rankBioregions } from "./BioregionListbox";

const REGIONS = [
  { id: 1, name: "Alaska & Yukon Interior", realm: "Nearctic", subrealm: "Northern North America" },
  { id: 2, name: "Cascadia Bioregion", realm: "Nearctic", subrealm: null },
  { id: 3, name: "Salish Sea", realm: null, subrealm: null },
  { id: 4, name: "Central American Highlands", realm: "Neotropic", subrealm: "Central America" },
  { id: 5, name: "Atlantic Forest", realm: "Neotropic", subrealm: null },
];

const options = () => screen.getAllByRole("option");
const highlighted = () => screen.getAllByRole("option").find((o) => o.getAttribute("aria-selected") === "true");

describe("rankBioregions", () => {
  it("keeps every bioregion in order with no search", () => {
    expect(rankBioregions(REGIONS, "").map((b) => b.id)).toEqual([1, 2, 3, 4, 5]);
  });

  it("matches and orders exactly as cmdk's own filter scores them", () => {
    for (const search of ["a", "as", "cas", "sea", "cent", "zz"]) {
      const expected = REGIONS.map((b, index) => ({ id: b.id, index, score: defaultFilter(b.name, search) }))
        .filter((x) => x.score > 0)
        .sort((x, y) => y.score - x.score || x.index - y.index)
        .map((x) => x.id);
      expect(rankBioregions(REGIONS, search).map((b) => b.id)).toEqual(expected);
    }
  });

  it("breaks ties by the previous list, as cmdk's keystroke-by-keystroke sort did", () => {
    // cmdk re-sorted the rows on screen at every keystroke. Model that
    // directly and compare, typing each search one letter at a time.
    const cmdkTyped = (search: string) => {
      let rows = [...REGIONS];
      for (let k = 1; k <= search.length; k++) {
        const s = search.slice(0, k);
        rows = rows.filter((b) => defaultFilter(b.name, s) > 0).sort((x, y) => defaultFilter(y.name, s) - defaultFilter(x.name, s));
      }
      return rows.map((b) => b.id);
    };
    for (const search of ["as", "cas", "sea", "cent", "zz", "an"]) {
      let rows = rankBioregions(REGIONS, "");
      for (let k = 1; k <= search.length; k++) rows = rankBioregions(REGIONS, search.slice(0, k), rows);
      expect(rows.map((b) => b.id)).toEqual(cmdkTyped(search));
    }
  });
});

describe("BioregionListbox", () => {
  it("draws a check only on chosen rows, and highlights the first row", () => {
    render(<BioregionListbox bioregions={REGIONS} isChosen={(id) => id === 3} onPick={() => {}} />);
    expect(options()).toHaveLength(5);
    expect(highlighted()?.textContent).toContain("Alaska & Yukon Interior");
    expect(document.querySelectorAll("svg.lucide-check")).toHaveLength(1);
    expect(options()[2].querySelector("svg.lucide-check")).not.toBeNull();
    expect(options()[0].textContent).toContain("Northern North America · Nearctic");
  });

  it("filters as you type, highlights the best match and scrolls it into view", () => {
    // jsdom has no scrollIntoView; record which row asks for it.
    const scrolledTo: string[] = [];
    Element.prototype.scrollIntoView = function (this: Element) {
      scrolledTo.push(this.id);
    };
    try {
      render(<BioregionListbox bioregions={REGIONS} isChosen={() => false} onPick={() => {}} />);
      const input = screen.getByRole("combobox");
      fireEvent.keyDown(input, { key: "ArrowDown" });
      fireEvent.change(input, { target: { value: "sea" } });
      expect(options().map((o) => o.textContent)).toEqual(rankBioregions(REGIONS, "sea").map((b) => expect.stringContaining(b.name)));
      expect(highlighted()?.textContent).toContain(rankBioregions(REGIONS, "sea")[0].name);
      expect(input.getAttribute("aria-activedescendant")).toBe(highlighted()?.id);
      expect(scrolledTo.at(-1)).toBe(highlighted()?.id);
    } finally {
      delete (Element.prototype as { scrollIntoView?: unknown }).scrollIntoView;
    }
  });

  it("moves with the keys cmdk used and picks with Enter", () => {
    const onPick = vi.fn();
    render(<BioregionListbox bioregions={REGIONS} isChosen={() => false} onPick={onPick} />);
    const input = screen.getByRole("combobox");
    fireEvent.keyDown(input, { key: "ArrowDown" });
    fireEvent.keyDown(input, { key: "ArrowDown" });
    expect(highlighted()?.textContent).toContain("Salish Sea");
    fireEvent.keyDown(input, { key: "ArrowUp" });
    expect(highlighted()?.textContent).toContain("Cascadia");
    fireEvent.keyDown(input, { key: "End" });
    expect(highlighted()?.textContent).toContain("Atlantic Forest");
    fireEvent.keyDown(input, { key: "ArrowDown" });
    expect(highlighted()?.textContent).toContain("Atlantic Forest");
    fireEvent.keyDown(input, { key: "Home" });
    expect(highlighted()?.textContent).toContain("Alaska");
    fireEvent.keyDown(input, { key: "ArrowDown", metaKey: true });
    expect(highlighted()?.textContent).toContain("Atlantic Forest");
    fireEvent.keyDown(input, { key: "k", ctrlKey: true });
    expect(highlighted()?.textContent).toContain("Central American");
    fireEvent.keyDown(input, { key: "j", ctrlKey: true });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onPick).toHaveBeenCalledWith(5);
  });

  it("keeps tied rows where the last keystroke left them, and a paste in list order", () => {
    // All four tie on "zz"; on "z" the two with a word starting in Z lead.
    const regions = [
      { id: 1, name: "Amazon River Basin" },
      { id: 2, name: "Atlantic Forest Brazil" },
      { id: 3, name: "Mesopotamia & Zagros" },
      { id: 4, name: "New Zealand Archipelago" },
    ];
    expect(new Set(regions.map((b) => defaultFilter(b.name, "zz"))).size).toBe(1);
    const { unmount } = render(<BioregionListbox bioregions={regions} isChosen={() => false} onPick={() => {}} />);
    const input = screen.getByRole("combobox");
    fireEvent.change(input, { target: { value: "z" } });
    fireEvent.change(input, { target: { value: "zz" } });
    expect(options().map((o) => o.textContent)).toEqual([
      "Mesopotamia & Zagros",
      "New Zealand Archipelago",
      "Amazon River Basin",
      "Atlantic Forest Brazil",
    ]);
    expect(highlighted()?.textContent).toBe("Mesopotamia & Zagros");
    unmount();

    render(<BioregionListbox bioregions={regions} isChosen={() => false} onPick={() => {}} />);
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "zz" } });
    expect(options()[0].textContent).toBe("Amazon River Basin");
  });

  it("highlights under the pointer, and on a tap, and picks on click", () => {
    const onPick = vi.fn();
    render(<BioregionListbox bioregions={REGIONS} isChosen={() => false} onPick={onPick} />);
    fireEvent.pointerMove(options()[3]);
    expect(highlighted()?.textContent).toContain("Central American");
    // A tap on a phone fires no pointermove before the click.
    fireEvent.click(options()[1]);
    expect(onPick).toHaveBeenCalledWith(2);
    expect(highlighted()?.textContent).toContain("Cascadia");
  });

  it("names the highlighted row on the list too, and hands focus back to the search box", () => {
    render(<BioregionListbox bioregions={REGIONS} isChosen={() => false} onPick={() => {}} />);
    const input = screen.getByRole("combobox");
    const list = screen.getByRole("listbox");
    fireEvent.keyDown(input, { key: "ArrowDown" });
    expect(list.getAttribute("aria-activedescendant")).toBe(highlighted()?.id);
    // A click on the search icon leaves focus on the list's frame; cmdk sent
    // it back to the box on the next arrow key or hover.
    const frame = input.closest("[data-slot=command]") as HTMLElement;
    frame.focus();
    fireEvent.keyDown(frame, { key: "ArrowDown" });
    expect(document.activeElement).toBe(input);
    frame.focus();
    fireEvent.pointerMove(options()[0]);
    expect(document.activeElement).toBe(input);
  });

  it("does not scroll on a hover after an arrow key that went nowhere", () => {
    const scrolledTo: string[] = [];
    Element.prototype.scrollIntoView = function (this: Element) {
      scrolledTo.push(this.id);
    };
    try {
      render(<BioregionListbox bioregions={REGIONS} isChosen={() => false} onPick={() => {}} />);
      fireEvent.keyDown(screen.getByRole("combobox"), { key: "ArrowUp" });
      fireEvent.pointerMove(options()[3]);
      expect(highlighted()?.textContent).toContain("Central American");
      expect(scrolledTo).toEqual([]);
    } finally {
      delete (Element.prototype as { scrollIntoView?: unknown }).scrollIntoView;
    }
  });

  it("shows the empty state, lets Enter reach a button in it, and keeps a controlled search", () => {
    const suggest = vi.fn();
    function Multi() {
      const [search, setSearch] = useState("");
      return (
        <BioregionListbox
          bioregions={REGIONS}
          isChosen={() => false}
          onPick={() => {}}
          search={search}
          onSearchChange={setSearch}
          renderEmpty={(s) => <button type="button" onClick={suggest}>Suggest "{s}"</button>}
        />
      );
    }
    render(<Multi />);
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "zzz" } });
    expect(screen.queryAllByRole("option")).toHaveLength(0);
    const button = screen.getByText('Suggest "zzz"');
    const enter = fireEvent.keyDown(button, { key: "Enter" });
    expect(enter).toBe(true);
  });
});
