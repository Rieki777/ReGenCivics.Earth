/**
 * The add-by-URL fallback must keep working even when every one-click path
 * fails, because that is the situation it exists for.
 */
import { describe, it, expect, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { CalendarFeedUrls } from "./CalendarFeedUrls";
import { CALENDAR_FEEDS } from "@/lib/calendarLinks";

/**
 * The panel ships collapsed (Rye, 2026-09-07): the buttons work for almost
 * everyone, and three URLs plus per-app instructions sitting open underneath
 * them made the page read as though the buttons were unreliable. Every
 * assertion about the content therefore opens it first.
 */
function renderOpen() {
  const result = render(<CalendarFeedUrls />);
  fireEvent.click(screen.getByRole("button", { name: /Buttons not working/i }));
  return result;
}

describe("CalendarFeedUrls", () => {
  it("stays collapsed until asked for, and says what it is behind one control", () => {
    render(<CalendarFeedUrls />);

    const toggle = screen.getByRole("button", { name: /Buttons not working/i });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByText(CALENDAR_FEEDS.all.httpsUrl)).toBeNull();
    expect(screen.queryByRole("button", { name: /Copy the .* calendar URL/i })).toBeNull();

    fireEvent.click(toggle);

    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText(CALENDAR_FEEDS.all.httpsUrl)).toBeInTheDocument();
  });

  it("shows all three feed URLs as plain https, never webcal", () => {
    renderOpen();

    for (const feed of [CALENDAR_FEEDS.all, CALENDAR_FEEDS.openAccess, CALENDAR_FEEDS.season2]) {
      const node = screen.getByText(feed.httpsUrl);
      expect(node).toBeInTheDocument();
      expect(feed.httpsUrl.startsWith("https://")).toBe(true);
    }

    // webcal:// is the thing that silently fails for Google users. This block
    // is the fallback for exactly that, so it must not repeat the mistake.
    expect(document.body.textContent).not.toMatch(/webcal:/);
  });

  it("reads the URLs from the shared feed definitions, so they cannot drift from the buttons", () => {
    renderOpen();
    // Not hard-coded strings: if the feed paths move, this test moves with them.
    expect(screen.getByText(CALENDAR_FEEDS.all.httpsUrl).textContent)
      .toBe(CALENDAR_FEEDS.all.httpsUrl);
  });

  it("gives every copy button an accessible name", () => {
    renderOpen();
    const buttons = screen.getAllByRole("button", { name: /Copy the .* calendar URL/i });
    expect(buttons.length).toBe(3);
  });

  it("leaves the URL readable when the clipboard is unavailable", async () => {
    // Insecure context, denied permission, or a browser that blocks it.
    vi.stubGlobal("navigator", { clipboard: undefined });
    renderOpen();

    // The URL is still on screen and selectable, which is the actual guarantee.
    const url = screen.getByText(CALENDAR_FEEDS.all.httpsUrl);
    expect(url).toBeInTheDocument();
    expect(url.className).toMatch(/select-all/);
    vi.unstubAllGlobals();
  });

  it("tells the reader this is a live subscription, not a one-off import", () => {
    renderOpen();
    expect(document.body.textContent).toMatch(/live feeds/i);
    expect(document.body.textContent).toMatch(/updates in place rather than arriving as a\s+duplicate/i);
  });
});
