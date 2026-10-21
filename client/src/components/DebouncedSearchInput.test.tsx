/**
 * The search box keeps its own text so a keystroke re-renders only the box
 * (STEERING.md section 13). What must not slip: the page hears each pause
 * once, never an echo of its own value; outside changes (a link that fills
 * the search) reach the box; a Clear empties it even with unsent text; and
 * text still unsent when the box goes away is not lost.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { useRef, useState } from "react";
import { DebouncedSearchInput, type DebouncedSearchHandle } from "./DebouncedSearchInput";

function Page({ onSettled, initial = "" }: { onSettled: (value: string) => void; initial?: string }) {
  const [search, setSearch] = useState(initial);
  const [shown, setShown] = useState(true);
  const box = useRef<DebouncedSearchHandle>(null);
  return (
    <>
      {shown && (
        <DebouncedSearchInput
          aria-label="Search"
          handle={box}
          value={search}
          onChange={(value) => {
            setSearch(value);
            onSettled(value);
          }}
        />
      )}
      <button type="button" onClick={() => { box.current?.reset(); setSearch(""); }}>Clear</button>
      <button type="button" onClick={() => setSearch("river@example.test")}>Fill</button>
      <button type="button" onClick={() => setShown(false)}>Leave</button>
      <output>{search}</output>
    </>
  );
}

describe("DebouncedSearchInput", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("shows each key at once and tells the page once typing pauses", () => {
    const onSettled = vi.fn();
    render(<Page onSettled={onSettled} />);
    const box = screen.getByLabelText("Search") as HTMLInputElement;

    for (const value of ["r", "ri", "riv", "rive", "river"]) {
      fireEvent.change(box, { target: { value } });
      act(() => { vi.advanceTimersByTime(80); });
    }
    expect(box.value).toBe("river");
    expect(onSettled).not.toHaveBeenCalled();
    expect(screen.getByRole("status").textContent).toBe("");

    act(() => { vi.advanceTimersByTime(200); });
    expect(onSettled).toHaveBeenCalledTimes(1);
    expect(onSettled).toHaveBeenCalledWith("river");
    expect(screen.getByRole("status").textContent).toBe("river");
  });

  it("takes outside changes into the box without echoing them back", () => {
    const onSettled = vi.fn();
    render(<Page onSettled={onSettled} initial="soil" />);
    const box = screen.getByLabelText("Search") as HTMLInputElement;
    expect(box.value).toBe("soil");

    fireEvent.click(screen.getByText("Fill"));
    expect(box.value).toBe("river@example.test");
    fireEvent.click(screen.getByText("Clear"));
    expect(box.value).toBe("");

    act(() => { vi.advanceTimersByTime(1000); });
    expect(onSettled).not.toHaveBeenCalled();
  });

  it("sends nothing when the text goes back to what the page already has", () => {
    const onSettled = vi.fn();
    render(<Page onSettled={onSettled} initial="seed" />);
    const box = screen.getByLabelText("Search") as HTMLInputElement;

    fireEvent.change(box, { target: { value: "seeds" } });
    fireEvent.change(box, { target: { value: "seed" } });
    act(() => { vi.advanceTimersByTime(500); });
    expect(onSettled).not.toHaveBeenCalled();
  });

  it("empties on Clear even while typed text is unsent, and never sends it", () => {
    const onSettled = vi.fn();
    render(<Page onSettled={onSettled} />);
    const box = screen.getByLabelText("Search") as HTMLInputElement;

    fireEvent.change(box, { target: { value: "ma" } });
    fireEvent.click(screen.getByText("Clear"));
    expect(box.value).toBe("");

    act(() => { vi.advanceTimersByTime(1000); });
    expect(box.value).toBe("");
    expect(onSettled).not.toHaveBeenCalled();
  });

  it("sends text still unsent when the box goes away", () => {
    const onSettled = vi.fn();
    render(<Page onSettled={onSettled} />);
    const box = screen.getByLabelText("Search") as HTMLInputElement;

    fireEvent.change(box, { target: { value: "smith" } });
    fireEvent.click(screen.getByText("Leave"));
    expect(onSettled).toHaveBeenCalledTimes(1);
    expect(onSettled).toHaveBeenCalledWith("smith");
    expect(screen.getByRole("status").textContent).toBe("smith");
  });
});
