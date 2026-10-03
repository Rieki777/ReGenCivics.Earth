import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  VILLAGE_OS_GUIDE_URL,
  VILLAGE_OS_OFFER,
  VILLAGE_OS_REPO_URL,
  VILLAGE_OS_SETUP_PROMPT_URL,
  VILLAGE_OS_STARTER_KIT_URL,
} from "@shared/villageOsOffer";

const setupPrompt = vi.fn();

vi.mock("@/lib/trpc", () => ({
  trpc: {
    villageOs: {
      setupPrompt: { useQuery: () => setupPrompt() },
    },
  },
}));

import { SelfHostActions } from "./VillageOs";

const o = VILLAGE_OS_OFFER;
const LINKS = {
  repoUrl: VILLAGE_OS_REPO_URL,
  starterKitUrl: VILLAGE_OS_STARTER_KIT_URL,
  guideUrl: VILLAGE_OS_GUIDE_URL,
  setupPromptUrl: VILLAGE_OS_SETUP_PROMPT_URL,
};

function withClipboard(writeText: (text: string) => Promise<void>) {
  Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
}

describe("Run it yourself, switched on", () => {
  afterEach(() => {
    cleanup();
    Object.defineProperty(navigator, "clipboard", { value: undefined, configurable: true });
  });

  it("copies the prompt for an AI assistant and says so", async () => {
    setupPrompt.mockReturnValue({ data: { text: "I am a community founder." }, isLoading: false });
    const writeText = vi.fn(async () => {});
    withClipboard(writeText);
    render(<SelfHostActions {...LINKS} />);
    await userEvent.click(screen.getByRole("button", { name: o.selfCopyGuide }));
    expect(writeText).toHaveBeenCalledWith("I am a community founder.");
    expect(screen.getByRole("status").textContent).toBe(o.selfCopied);
  });

  it("points to the guide's own page when the browser refuses to copy", async () => {
    setupPrompt.mockReturnValue({ data: { text: "I am a community founder." }, isLoading: false });
    withClipboard(vi.fn(async () => { throw new Error("denied"); }));
    render(<SelfHostActions {...LINKS} />);
    await userEvent.click(screen.getByRole("button", { name: o.selfCopyGuide }));
    const status = screen.getByRole("status");
    expect(status.textContent).toContain(o.selfCopyFailed);
    expect(status.querySelector("a")?.getAttribute("href")).toBe(VILLAGE_OS_SETUP_PROMPT_URL);
  });

  it("links to the guide instead of a copy button when the prompt could not be read", () => {
    setupPrompt.mockReturnValue({ data: { text: null }, isLoading: false });
    withClipboard(vi.fn(async () => {}));
    render(<SelfHostActions {...LINKS} />);
    expect(screen.queryByRole("button", { name: o.selfCopyGuide })).toBeNull();
    expect(screen.getByRole("link", { name: new RegExp(o.selfOpenGuidePrompt) }).getAttribute("href")).toBe(VILLAGE_OS_SETUP_PROMPT_URL);
  });

  it("shows neither while the prompt is loading", () => {
    setupPrompt.mockReturnValue({ data: undefined, isLoading: true });
    withClipboard(vi.fn(async () => {}));
    render(<SelfHostActions {...LINKS} />);
    expect(screen.queryByRole("button", { name: o.selfCopyGuide })).toBeNull();
    expect(screen.queryByRole("link", { name: new RegExp(o.selfOpenGuidePrompt) })).toBeNull();
  });

  it("offers the starter kit, the step-by-step guide and the code at the pinned release", () => {
    setupPrompt.mockReturnValue({ data: { text: "x" }, isLoading: false });
    render(<SelfHostActions {...LINKS} />);
    expect(screen.getByRole("link", { name: new RegExp(o.selfStarterKit) }).getAttribute("href")).toBe(VILLAGE_OS_STARTER_KIT_URL);
    expect(screen.getByRole("link", { name: new RegExp(o.selfReadGuide) }).getAttribute("href")).toBe(VILLAGE_OS_GUIDE_URL);
    expect(screen.getByRole("link", { name: new RegExp(o.selfButton) }).getAttribute("href")).toBe(VILLAGE_OS_REPO_URL);
  });
});
