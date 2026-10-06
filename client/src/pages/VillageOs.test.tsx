import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { JOIN_URL } from "@shared/sessionLinks";
import {
  CORE_DONATE_PAGE_URL,
  VILLAGE_OS_GUIDE_URL,
  VILLAGE_OS_OFFER,
  VILLAGE_OS_REPO_URL,
  VILLAGE_OS_SETUP_PROMPT_URL,
  VILLAGE_OS_STARTER_KIT_URL,
} from "@shared/villageOsOffer";

const setupPrompt = vi.fn();
const offerQuery = vi.fn(() => ({ data: undefined, isLoading: false }));
const zeffyQuery = vi.fn((): { data: { enabled: boolean; embedUrl: string | null }; isLoading: boolean } => ({
  data: { enabled: false, embedUrl: null },
  isLoading: false,
}));

vi.mock("@/lib/trpc", () => ({
  trpc: {
    villageOs: {
      setupPrompt: { useQuery: () => setupPrompt() },
      offer: { useQuery: () => offerQuery() },
    },
    churchDonations: {
      zeffyEnabled: { useQuery: () => zeffyQuery() },
    },
  },
}));

vi.mock("@/components/SEO", () => ({ SEO: () => null }));
vi.mock("@/components/PageWrapper", () => ({
  PageWrapper: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
vi.mock("@/components/AnimatedSection", () => ({
  AnimatedSection: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
vi.mock("wouter", () => ({
  Link: ({ children, href, className }: { children: React.ReactNode; href: string; className?: string }) => (
    <a href={href} className={className}>{children}</a>
  ),
}));

import VillageOs, { SelfHostActions } from "./VillageOs";

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

describe("the world gate", () => {
  afterEach(() => {
    cleanup();
    zeffyQuery.mockReturnValue({ data: { enabled: false, embedUrl: null }, isLoading: false });
  });

  it("names the four core modules and keeps the agreed facts behind the gates", async () => {
    render(<VillageOs />);
    expect(screen.getByRole("heading", { level: 1, name: o.heroTitle })).toBeTruthy();
    expect(screen.getByText(o.standardLabel)).toBeTruthy();
    for (const mod of o.standardModules) {
      expect(screen.getByText(mod.name)).toBeTruthy();
      expect(screen.getByText(mod.line)).toBeTruthy();
    }
    expect(screen.getByText(o.custom.blurb)).toBeTruthy();
    expect(screen.getByText(o.custom.priceBadge)).toBeTruthy();
    expect(screen.getByText("Hosting is provided by CORE as part of our spiritual purpose. We run on donations.")).toBeTruthy();
    expect(screen.getByRole("link", { name: o.circle.joinButton }).getAttribute("href")).toBe(JOIN_URL);
    const donate = screen.getByRole("link", { name: /Donate/ });
    expect(donate.getAttribute("href")).toBe(CORE_DONATE_PAGE_URL);
    expect(donate.getAttribute("rel")).toContain("noopener");
    expect(donate.getAttribute("target")).toBe("_blank");
    expect(screen.getByRole("link", { name: o.tools.integrateButton }).getAttribute("href")).toBe(o.tools.integrateHref);
    expect(screen.getByRole("link", { name: /Hypha/ }).getAttribute("href")).toBe("https://app.hypha.earth/");
    expect(screen.getByRole("link", { name: /LocalScale/ }).getAttribute("href")).toBe("https://localscale.org/");
    expect(screen.queryByRole("link", { name: /Saberra/ })).toBeNull();
    expect(screen.getByText("Saberra")).toBeTruthy();

    const hosted = screen.getByRole("heading", { name: o.hosted.title }).closest("article");
    if (!hosted) throw new Error("hosted gate missing");
    const toggle = within(hosted).getByRole("button", { name: /Open the notes/ });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(within(hosted).queryByText(o.hosted.lines[0])).toBeNull();
    await userEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(within(hosted).getByText(o.hosted.lines[0])).toBeTruthy();

    const guide = screen.getByRole("button", { name: o.fieldGuide.open });
    expect(guide).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByText(o.facts[0])).toBeNull();
    await userEvent.click(guide);
    expect(guide).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText(o.facts[0])).toBeTruthy();
    expect(screen.getByText(o.facts[2])).toBeTruthy();

    const text = document.body.textContent ?? "";
    expect(text).not.toMatch(/Read it down the page|Each gate is a way in|Pick a path|Three facts about|everything is free|Riverside/i);
  });

  it("opens the Zeffy form page, not the embed, when the endpoint has one", () => {
    zeffyQuery.mockReturnValue({
      data: { enabled: true, embedUrl: "https://www.zeffy.com/en-US/embed/donation-form/donation-312" },
      isLoading: false,
    });
    render(<VillageOs />);
    const donate = screen.getByRole("link", { name: /Donate/ });
    expect(donate.getAttribute("href")).toBe("https://www.zeffy.com/en-US/donation-form/donation-312");
    expect(donate.getAttribute("href")).not.toContain("embed");
    expect(donate.getAttribute("href")).not.toMatch(/[?&]/);
  });
});
