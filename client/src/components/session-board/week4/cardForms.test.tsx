/**
 * Week 4's card forms (review of 2026-10-15): a half-written card survives
 * its form unmounting (the room moving on, the rail, another form opening);
 * Enter moves to the next field and never saves a half-written card; a hint
 * is read with its field; and a Save that isn't ready says why.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { CARD_COPY } from "@shared/boardCards";
import { dropDraft } from "../week3/drafts";
import { DecideForm, SeatForm } from "./CardForms";

const NEEDS = [{ key: "vitality", label: "Vitality" }, { key: "love", label: "Love" }];
const KEY = "card:seat:5:new:vitality";

afterEach(() => {
  cleanup();
  dropDraft(KEY);
});

function seatForm(onSave = vi.fn(async () => true)) {
  return render(<SeatForm draftKey={KEY} need="vitality" needs={NEEDS} circlesFirst={["water"]} ownCircles={[]} onSave={onSave} onCancel={() => undefined} />);
}

describe("a seat form", () => {
  it("keeps its words when it unmounts and comes back, and is marked unsaved meanwhile", () => {
    const first = seatForm();
    fireEvent.change(screen.getByLabelText(CARD_COPY.seat.name), { target: { value: "Seed saver" } });
    fireEvent.change(screen.getByLabelText(CARD_COPY.seat.aim), { target: { value: "Seeds for every bed" } });
    fireEvent.click(screen.getByRole("button", { name: /Someone on our team holds it/ }));
    expect(first.container.querySelector("form[data-unsaved]")).not.toBeNull();
    first.unmount();

    const again = seatForm();
    expect((screen.getByLabelText(CARD_COPY.seat.name) as HTMLTextAreaElement).value).toBe("Seed saver");
    expect((screen.getByLabelText(CARD_COPY.seat.aim) as HTMLTextAreaElement).value).toBe("Seeds for every bed");
    expect(screen.getByRole("button", { name: /Someone on our team holds it/ }).getAttribute("aria-pressed")).toBe("true");
    expect(again.container.querySelector("form[data-unsaved]")).not.toBeNull();
  });

  it("forgets its words on Cancel", () => {
    const first = seatForm();
    fireEvent.change(screen.getByLabelText(CARD_COPY.seat.name), { target: { value: "Seed saver" } });
    fireEvent.click(screen.getByRole("button", { name: CARD_COPY.cancel }));
    first.unmount();
    const again = seatForm();
    expect((screen.getByLabelText(CARD_COPY.seat.name) as HTMLTextAreaElement).value).toBe("");
    expect(again.container.querySelector("form[data-unsaved]")).toBeNull();
  });

  it("Enter on a line moves to the next field and saves nothing", () => {
    const onSave = vi.fn(async () => true);
    seatForm(onSave);
    const name = screen.getByLabelText(CARD_COPY.seat.name);
    fireEvent.change(name, { target: { value: "Seed saver" } });
    name.focus();
    fireEvent.keyDown(name, { key: "Enter" });
    expect(onSave).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(screen.getByLabelText(CARD_COPY.seat.circle));
    expect(name.getAttribute("enterkeyhint")).toBe("next");
    expect(screen.getByLabelText(CARD_COPY.seat.contribution).getAttribute("enterkeyhint")).toBe("done");
  });

  it("ties each hint to its field", () => {
    seatForm();
    fireEvent.click(screen.getByRole("button", { name: /Someone on our team holds it/ }));
    const who = screen.getByLabelText(CARD_COPY.seat.whoTeam);
    const hint = document.getElementById(who.getAttribute("aria-describedby") ?? "");
    expect(hint?.textContent).toBe(CARD_COPY.seat.whoHint);
  });

  it("a Save that isn't ready stays focusable, says why in a live region, and moves to what's missing", () => {
    const onSave = vi.fn(async () => true);
    seatForm(onSave);
    const save = screen.getByRole("button", { name: CARD_COPY.seat.save });
    expect(save.hasAttribute("disabled")).toBe(false);
    expect(save.getAttribute("aria-disabled")).toBe("true");
    fireEvent.click(save);
    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByRole("status").textContent).toBe(CARD_COPY.bad.seat);
    expect(document.activeElement).toBe(screen.getByLabelText(CARD_COPY.seat.name));
  });
});

describe("a decide form", () => {
  const DKEY = "card:decide:5:new:water";
  afterEach(() => dropDraft(DKEY));

  it("Another way asks for its line, and a Save without it says so", async () => {
    const onSave = vi.fn(async () => true);
    render(<DecideForm draftKey={DKEY} circle="water" circlesFirst={["water"]} ownCircles={[]} onSave={onSave} onCancel={() => undefined} />);
    fireEvent.change(screen.getByLabelText(/What Living Water decides on/), { target: { value: "when we draw from the spring" } });
    fireEvent.click(screen.getByRole("button", { name: /Another way/ }));
    const gloss = screen.getByLabelText(CARD_COPY.decide.gloss);
    fireEvent.click(screen.getByRole("button", { name: CARD_COPY.decide.save }));
    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByRole("status").textContent).toBe(CARD_COPY.bad.gloss);
    expect(document.activeElement).toBe(gloss);
    fireEvent.change(gloss, { target: { value: "the two families who farm it decide together" } });
    fireEvent.click(screen.getByRole("button", { name: CARD_COPY.decide.save }));
    await Promise.resolve();
    expect(onSave).toHaveBeenCalledWith({ circle: "water", decidesOn: "when we draw from the spring", how: "other", gloss: "the two families who farm it decide together" });
  });
});
