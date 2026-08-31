/**
 * The card carries the operating protocol, so the wording is the artefact: it
 * is Rye's own framing from the addendum and a smoother paraphrase would be a
 * quietly different protocol. The assertions are on his sentences.
 *
 * The other half is the dismissal. localStorage throws outright in Safari
 * private mode and in some embedded web views, and an unguarded read there
 * takes down the whole Today screen for the sake of a card.
 */
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { WeekOneCard, WEEK_ONE_DISMISSED_KEY } from "./WeekOneCard";

describe("WeekOneCard", () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => vi.clearAllMocks());

  it("says the protocol in Rye's words, all three parts of the day", () => {
    render(<WeekOneCard />);
    const text = screen.getByTestId("brain-week-one").textContent ?? "";

    expect(text).toContain(
      "Morning (5 min): read the bot's morning message, answer the five done-triage buttons, shape three.",
    );
    expect(text).toContain("During the day: talk to the bot; screenshots included.");
    expect(text).toContain(
      "Evening (5 min): promote what is ready; when five build items share a repo, batch and forge them.",
    );
  });

  it("dismisses, and stays dismissed on the next open", async () => {
    const first = render(<WeekOneCard />);
    await userEvent.setup().click(screen.getByTestId("brain-week-one-dismiss"));

    expect(screen.queryByTestId("brain-week-one")).toBeNull();
    expect(localStorage.getItem(WEEK_ONE_DISMISSED_KEY)).toBe("1");

    first.unmount();
    render(<WeekOneCard />);
    expect(screen.queryByTestId("brain-week-one")).toBeNull();
  });

  it("survives storage that throws on read, the way Safari private mode does", () => {
    const boom = vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("SecurityError");
    });
    render(<WeekOneCard />);
    // Shown, not crashed. A card that reappears is the harmless direction.
    expect(screen.getByTestId("brain-week-one")).toBeDefined();
    boom.mockRestore();
  });

  it("survives storage that throws on write, and still goes away for this visit", async () => {
    const boom = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("QuotaExceededError");
    });
    render(<WeekOneCard />);
    await userEvent.setup().click(screen.getByTestId("brain-week-one-dismiss"));

    expect(screen.queryByTestId("brain-week-one")).toBeNull();
    boom.mockRestore();
  });

  it("gives the dismiss control a thumb-sized target", () => {
    render(<WeekOneCard />);
    const btn = screen.getByTestId("brain-week-one-dismiss");
    expect(btn.className).toContain("min-h-11");
    expect(btn.className).toContain("min-w-11");
  });
});
