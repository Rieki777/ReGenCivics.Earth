import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AdminEventAutoReminders } from "./AdminEventAutoReminders";

const preview = vi.fn();
const mutateAsync = vi.fn();

vi.mock("@/lib/trpc", () => ({
  trpc: {
    useUtils: () => ({
      events: { listAutoReminders: { invalidate: vi.fn() } },
    }),
    events: {
      previewAutoReminderAudience: {
        useQuery: (input: { audienceMode: string }) => preview(input),
      },
      setAutoReminder: {
        useMutation: () => ({ mutateAsync, isPending: false }),
      },
    },
  },
}));

describe("AdminEventAutoReminders", () => {
  it("defaults a Season 2 episode to approved projects and shows the count", () => {
    preview.mockReturnValue({
      data: { count: 12, label: "Season 2 approved projects", blocked: false },
      isLoading: false,
    });
    render(
      <AdminEventAutoReminders
        event={{ id: 7, title: "Week 1", type: "episode", season: "Season 2", status: "upcoming" }}
      />,
    );
    expect(screen.getByText(/Land projects with application status approved or active/)).toBeDefined();
    expect(screen.getByText("This will send to 12 people.")).toBeDefined();
    expect(screen.getByText("7 days before")).toBeDefined();
    expect(screen.getByText("24 hours before")).toBeDefined();
    expect(screen.getByText("1 hour before")).toBeDefined();
  });

  it("forces a custom event to pick an audience before enabling", async () => {
    preview.mockReturnValue({
      data: { count: 0, label: "Custom selection", blocked: true },
      isLoading: false,
    });
    render(
      <AdminEventAutoReminders
        event={{ id: 8, title: "Investor dinner", type: "special", season: null, status: "upcoming" }}
      />,
    );
    expect(screen.getByText(/Pick who should get these emails/)).toBeDefined();
    expect(screen.getByText(/choose an audience first/)).toBeDefined();

    const enable = screen.getByLabelText("Send reminders automatically before this event");
    await userEvent.click(enable);
    expect(screen.getByText(/Pick at least one list before turning auto-reminders on/)).toBeDefined();
    expect((screen.getByRole("button", { name: "Save auto-reminders" }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("defaults an Open Access session to the broad newsletter list", () => {
    preview.mockReturnValue({
      data: { count: 40, label: "Everyone", blocked: false },
      isLoading: false,
    });
    render(
      <AdminEventAutoReminders
        event={{ id: 9, title: "Open Access Session", type: "open", season: "Open", status: "upcoming" }}
      />,
    );
    expect(screen.getByText(/Active newsletter subscribers, plus anyone who signed up/)).toBeDefined();
    expect(screen.getByText("This will send to 40 people.")).toBeDefined();
  });
});
