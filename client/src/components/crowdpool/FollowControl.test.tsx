/**
 * The one Follow control (build spec 2026-09-27, section 12.5): every row of
 * the spec's table, the rollback, the field errors and the live regions.
 */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FOLLOW } from "@shared/crowdpoolCopy";

type MutationOpts = { onSuccess?: (d?: unknown) => void; onError?: (e: unknown) => void; onSettled?: () => void };
type MockMutation = { mutate: ReturnType<typeof vi.fn>; opts: MutationOpts; isPending: boolean };

const mutations = vi.hoisted(() => ({} as Record<string, MockMutation>));
const invalidateGetPublic = vi.hoisted(() => vi.fn());
function mutation(name: string) {
  return {
    useMutation: (opts: MutationOpts = {}) => {
      const m = (mutations[name] ??= { mutate: vi.fn(), opts, isPending: false });
      m.opts = opts;
      return { mutate: m.mutate, isPending: m.isPending };
    },
  };
}

vi.mock("@/lib/trpc", () => ({
  trpc: {
    useUtils: () => ({ projects: { getPublic: { invalidate: invalidateGetPublic } } }),
    campaigns: {
      followProject: mutation("followProject"),
      unfollowProject: mutation("unfollowProject"),
      subscribeByEmail: mutation("subscribeByEmail"),
      joinWaitlist: mutation("joinWaitlist"),
    },
  },
}));

const authState = vi.hoisted(() => ({ signedIn: false, email: "ada@example.com" as string | null }));
vi.mock("@/_core/hooks/useAuth", () => ({
  useAuth: () => authState.signedIn
    ? { user: { id: 5, name: "Ada", email: authState.email }, isAuthenticated: true }
    : { user: null, isAuthenticated: false },
}));

const { toastMock } = vi.hoisted(() => ({ toastMock: { success: vi.fn(), error: vi.fn() } }));
vi.mock("sonner", () => ({ toast: toastMock }));

import { FollowControl, isEmailLike } from "./FollowControl";

const project = {
  mode: "project" as const,
  projectKey: "12-hill-farm",
  campaignId: 44,
  projectName: "Hill Farm",
  initiallyFollowing: false,
  variant: "header" as const,
};

function called(name: string) {
  return mutations[name]?.mutate ?? vi.fn();
}

describe("FollowControl", () => {
  beforeEach(() => {
    for (const k of Object.keys(mutations)) delete mutations[k];
    invalidateGetPublic.mockClear();
    toastMock.error.mockClear();
    authState.signedIn = false;
    authState.email = "ada@example.com";
  });

  describe("project mode, signed in: one tap", () => {
    beforeEach(() => { authState.signedIn = true; });

    it("is a 44px toggle, Follow then Following, that follows the project by its key", async () => {
      const user = userEvent.setup();
      render(<FollowControl {...project} />);
      const button = screen.getByRole("button", { name: FOLLOW.follow });
      expect(button).toHaveAttribute("aria-pressed", "false");
      expect(button.className).toContain("min-h-11");
      await user.click(button);
      expect(called("followProject")).toHaveBeenCalledWith({ key: "12-hill-farm" });
      const pressed = screen.getByRole("button", { name: FOLLOW.following });
      expect(pressed).toHaveAttribute("aria-pressed", "true");
      // The site's root is .dark: the outline variant's dark:bg-transparent
      // would leave white text on the white card (seen in the browser check).
      expect(pressed.className).toContain("dark:bg-[#4a7c59]");
      expect(pressed.className).not.toContain("dark:bg-transparent");
      // Nothing to type: no email field for someone signed in.
      expect(screen.queryByLabelText(FOLLOW.emailLabel)).toBeNull();
      // Every Follow on the page reads projects.getPublic, so it is refreshed.
      act(() => mutations.followProject.opts.onSettled?.());
      expect(invalidateGetPublic).toHaveBeenCalled();
    });

    it("unfollows from Following", async () => {
      const user = userEvent.setup();
      render(<FollowControl {...project} initiallyFollowing />);
      await user.click(screen.getByRole("button", { name: FOLLOW.following }));
      expect(called("unfollowProject")).toHaveBeenCalledWith({ key: "12-hill-farm" });
      expect(called("followProject")).not.toHaveBeenCalled();
      expect(screen.getByRole("button", { name: FOLLOW.follow })).toHaveAttribute("aria-pressed", "false");
    });

    it("rolls back and says so when the server says no", async () => {
      const user = userEvent.setup();
      render(<FollowControl {...project} />);
      await user.click(screen.getByRole("button", { name: FOLLOW.follow }));
      act(() => mutations.followProject.opts.onError?.(new Error("nope")));
      expect(screen.getByRole("button", { name: FOLLOW.follow })).toHaveAttribute("aria-pressed", "false");
      expect(toastMock.error).toHaveBeenCalledWith(FOLLOW.error);
    });

    it("the receipt names the project", async () => {
      const user = userEvent.setup();
      render(<FollowControl {...project} variant="receipt" />);
      await user.click(screen.getByRole("button", { name: "Follow Hill Farm" }));
      expect(screen.getByRole("button", { name: "Following Hill Farm" })).toHaveAttribute("aria-pressed", "true");
    });

    it("follows the page's reading when it changes", () => {
      const { rerender } = render(<FollowControl {...project} />);
      rerender(<FollowControl {...project} initiallyFollowing />);
      expect(screen.getByRole("button", { name: FOLLOW.following })).toHaveAttribute("aria-pressed", "true");
    });

    it("shows on a project with no live campaign too: a follow before the first campaign", async () => {
      const user = userEvent.setup();
      render(<FollowControl {...project} campaignId={null} />);
      await user.click(screen.getByRole("button", { name: FOLLOW.follow }));
      expect(called("followProject")).toHaveBeenCalledWith({ key: "12-hill-farm" });
    });
  });

  describe("project mode, signed out, with a live campaign: follow by email", () => {
    it("Follow opens the form: intro, a labelled field prefilled, Send me news", async () => {
      const user = userEvent.setup();
      render(<FollowControl {...project} defaultEmail="sam@example.com" />);
      const button = screen.getByRole("button", { name: FOLLOW.follow });
      expect(button).toHaveAttribute("aria-expanded", "false");
      expect(screen.queryByLabelText(FOLLOW.emailLabel)).toBeNull();
      await user.click(button);
      expect(button).toHaveAttribute("aria-expanded", "true");
      expect(screen.getByText(FOLLOW.emailIntro("Hill Farm"))).toBeInTheDocument();
      const field = screen.getByLabelText(FOLLOW.emailLabel) as HTMLInputElement;
      expect(field.value).toBe("sam@example.com");
      expect(field).toHaveFocus();
      await user.click(screen.getByRole("button", { name: FOLLOW.emailSubmit }));
      expect(called("subscribeByEmail")).toHaveBeenCalledWith({ campaignId: 44, email: "sam@example.com" });
      expect(called("followProject")).not.toHaveBeenCalled();

      act(() => mutations.subscribeByEmail.opts.onSuccess?.());
      expect(screen.getByRole("status")).toHaveTextContent(FOLLOW.emailDone("Hill Farm"));
      expect(screen.queryByLabelText(FOLLOW.emailLabel)).toBeNull();
      // Focus goes back to the button, which now reads Following.
      expect(screen.getByRole("button", { name: FOLLOW.following })).toHaveFocus();
    });

    it("an address that isn't one gets the message under the field and sends nothing", async () => {
      const user = userEvent.setup();
      render(<FollowControl {...project} />);
      await user.click(screen.getByRole("button", { name: FOLLOW.follow }));
      await user.type(screen.getByLabelText(FOLLOW.emailLabel), "not an email");
      await user.click(screen.getByRole("button", { name: FOLLOW.emailSubmit }));
      const alert = screen.getByRole("alert");
      expect(alert).toHaveTextContent(FOLLOW.invalidEmail);
      const field = screen.getByLabelText(FOLLOW.emailLabel);
      expect(field).toHaveAttribute("aria-invalid", "true");
      expect(field.getAttribute("aria-describedby")).toBe(alert.id);
      expect(called("subscribeByEmail")).not.toHaveBeenCalled();
    });

    it("a failed save says so under the field", async () => {
      const user = userEvent.setup();
      render(<FollowControl {...project} defaultEmail="sam@example.com" />);
      await user.click(screen.getByRole("button", { name: FOLLOW.follow }));
      await user.click(screen.getByRole("button", { name: FOLLOW.emailSubmit }));
      act(() => mutations.subscribeByEmail.opts.onError?.(new Error("rate limited")));
      expect(screen.getByRole("alert")).toHaveTextContent(FOLLOW.error);
    });

    it("the receipt's button names the project", () => {
      render(<FollowControl {...project} variant="receipt" defaultEmail="sam@example.com" />);
      expect(screen.getByRole("button", { name: "Follow Hill Farm" })).toHaveAttribute("aria-expanded", "false");
    });
  });

  describe("project mode falls back to the season form", () => {
    it("signed out with no live campaign: Follow opens the waitlist form", async () => {
      const user = userEvent.setup();
      render(<FollowControl {...project} campaignId={null} />);
      await user.click(screen.getByRole("button", { name: FOLLOW.follow }));
      expect(screen.getByText(FOLLOW.seasonHeading)).toBeInTheDocument();
      // A real project: the season, never "real campaigns" (review 2026-09-28).
      expect(screen.getByText(FOLLOW.seasonBodyProject)).toBeInTheDocument();
      expect(document.body.textContent).not.toMatch(/real campaigns/);
      await user.type(screen.getByLabelText(FOLLOW.emailLabel), "sam@example.com");
      await user.click(screen.getByRole("button", { name: FOLLOW.seasonSubmit }));
      expect(called("joinWaitlist")).toHaveBeenCalledWith({ email: "sam@example.com" });
      expect(called("subscribeByEmail")).not.toHaveBeenCalled();
      await act(async () => {
        mutations.joinWaitlist.opts.onSuccess?.();
        await new Promise((r) => requestAnimationFrame(() => r(null)));
      });
      expect(screen.getByRole("status")).toHaveTextContent(FOLLOW.seasonDoneProject);
      expect(document.body.textContent).not.toMatch(/real campaigns/);
    });


    it("an example project, signed out: says why, and offers the waitlist", async () => {
      const user = userEvent.setup();
      render(<FollowControl {...project} isExample defaultEmail="sam@example.com" />);
      await user.click(screen.getByRole("button", { name: FOLLOW.follow }));
      expect(screen.getByText(FOLLOW.exampleRefused)).toBeInTheDocument();
      await user.click(screen.getByRole("button", { name: FOLLOW.seasonSubmit }));
      expect(called("joinWaitlist")).toHaveBeenCalledWith({ email: "sam@example.com" });
      expect(called("subscribeByEmail")).not.toHaveBeenCalled();
    });

    it("an example project, signed in: never follows it, offers one button", async () => {
      authState.signedIn = true;
      const user = userEvent.setup();
      render(<FollowControl {...project} isExample />);
      const button = screen.getByRole("button", { name: FOLLOW.follow });
      expect(button).not.toHaveAttribute("aria-pressed");
      await user.click(button);
      expect(screen.getByText(FOLLOW.exampleRefused)).toBeInTheDocument();
      await user.click(screen.getByRole("button", { name: FOLLOW.seasonSignedIn }));
      expect(called("joinWaitlist")).toHaveBeenCalledWith({ email: "ada@example.com" });
      expect(called("followProject")).not.toHaveBeenCalled();
    });
  });

  describe("season mode", () => {
    it("signed out: heading, body, Your email and Tell me; then the confirmation takes focus", async () => {
      const user = userEvent.setup();
      render(<FollowControl mode="season" variant="card" />);
      expect(screen.getByRole("heading", { name: FOLLOW.seasonHeading })).toBeInTheDocument();
      expect(screen.getByText(FOLLOW.seasonBody)).toBeInTheDocument();
      await user.type(screen.getByLabelText(FOLLOW.emailLabel), " sam@example.com ");
      await user.click(screen.getByRole("button", { name: FOLLOW.seasonSubmit }));
      expect(called("joinWaitlist")).toHaveBeenCalledWith({ email: "sam@example.com" });
      await act(async () => {
        mutations.joinWaitlist.opts.onSuccess?.();
        await new Promise((r) => requestAnimationFrame(() => r(null)));
      });
      const status = screen.getByRole("status");
      expect(status).toHaveTextContent(FOLLOW.seasonDone);
      expect(status).toHaveFocus();
      expect(screen.queryByLabelText(FOLLOW.emailLabel)).toBeNull();
    });

    it("signed in: heading, the address we'll write to, and one button", async () => {
      authState.signedIn = true;
      const user = userEvent.setup();
      render(<FollowControl mode="season" variant="card" />);
      expect(screen.getByText(FOLLOW.seasonBodySignedIn("ada@example.com"))).toBeInTheDocument();
      expect(screen.queryByLabelText(FOLLOW.emailLabel)).toBeNull();
      await user.click(screen.getByRole("button", { name: FOLLOW.seasonSignedIn }));
      expect(called("joinWaitlist")).toHaveBeenCalledWith({ email: "ada@example.com" });
    });

    it("signed in with no address on the account: the email field instead", () => {
      authState.signedIn = true;
      authState.email = null;
      render(<FollowControl mode="season" variant="card" />);
      expect(screen.getByLabelText(FOLLOW.emailLabel)).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: FOLLOW.seasonSignedIn })).toBeNull();
    });

    it("the receipt takes its heading and the address just used, and needs a real address", async () => {
      const user = userEvent.setup();
      render(<FollowControl mode="season" variant="receipt" heading={FOLLOW.practiceHeading} defaultEmail="sam@example" />);
      expect(screen.getByText(FOLLOW.practiceHeading)).toBeInTheDocument();
      expect((screen.getByLabelText(FOLLOW.emailLabel) as HTMLInputElement).value).toBe("sam@example");
      await user.click(screen.getByRole("button", { name: FOLLOW.seasonSubmit }));
      expect(screen.getByRole("alert")).toHaveTextContent(FOLLOW.invalidEmail);
      expect(called("joinWaitlist")).not.toHaveBeenCalled();
    });

    // Build spec 2026-10-01, section 8.1 (C5): inside the Needs tab's white
    // card, the dark card's heading read dark green on dark green.
    it("the panel is light: its heading and a labelled email field, and nothing drawn in white", async () => {
      const user = userEvent.setup();
      const { container } = render(<FollowControl mode="season" variant="panel" />);
      const heading = screen.getByRole("heading", { name: FOLLOW.seasonHeading });
      expect(heading.tagName).toBe("H3");
      expect(heading.className).not.toContain("text-white");
      expect(heading.className).toContain("text-[#1a472a]");
      expect(container.firstElementChild?.className).toContain("bg-[#f0f7f0]");
      expect(screen.getByText(FOLLOW.seasonBody)).toBeInTheDocument();
      const label = screen.getByText(FOLLOW.emailLabel);
      expect(label.className).not.toContain("text-white");
      expect(container.querySelector('[class*="text-white"]:not(button)')).toBeNull();
      await user.type(screen.getByLabelText(FOLLOW.emailLabel), "sam@example.com");
      await user.click(screen.getByRole("button", { name: FOLLOW.seasonSubmit }));
      expect(called("joinWaitlist")).toHaveBeenCalledWith({ email: "sam@example.com" });
    });

    it("a failed save says so under the field", async () => {
      const user = userEvent.setup();
      const { container } = render(<FollowControl mode="season" variant="card" defaultEmail="sam@example.com" />);
      await user.click(screen.getByRole("button", { name: FOLLOW.seasonSubmit }));
      act(() => mutations.joinWaitlist.opts.onError?.(new Error("rate limited")));
      expect(within(container).getByRole("alert")).toHaveTextContent(FOLLOW.error);
    });
  });

  it("uses our words: no em-dash, no fund, token or money words", () => {
    const { container } = render(
      <>
        <FollowControl {...project} />
        <FollowControl mode="season" variant="card" />
      </>,
    );
    const text = container.textContent ?? "";
    expect(text).not.toContain(String.fromCharCode(0x2014));
    expect(text).not.toMatch(/pledge|donation|funded|claim|earmark|token|\$RCivics/i);
  });

  it("isEmailLike wants something@something.tld", () => {
    expect(isEmailLike(" ada@example.com ")).toBe(true);
    expect(isEmailLike("ada@example")).toBe(false);
    expect(isEmailLike("ada example.com")).toBe(false);
    expect(isEmailLike("")).toBe(false);
  });
});
