import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { PastEventCtaGate, PastEventExpandedPanel } from "./PastEventRecording";
import { CALENDAR_LABELS } from "@/components/CalendarCta";

vi.mock("@/lib/trpc", () => ({
  trpc: {
    recordings: {
      byEventId: {
        // eventId 2 = no linked/matching recording (empty-state case)
        useQuery: (input: { eventId: number }) => ({
          data:
            input.eventId === 2
              ? null
              : {
                  id: 9,
                  editedYoutubeUrl: "https://youtu.be/edited-cut",
                  youtubeUrl: "https://youtu.be/raw",
                  riversideUrl: null,
                  thumbnailUrl: "https://example.com/t.jpg",
                  durationSeconds: 125,
                  overview: "We talked about open access and follow-ups.",
                  aiSummary: null,
                  forumPostId: 42,
                },
          isLoading: false,
        }),
      },
      getPublic: {
        useQuery: () => ({
          data: {
            id: 9,
            overview: "Full overview of the session.",
            editedYoutubeUrl: "https://youtu.be/edited-cut",
            youtubeUrl: "https://youtu.be/raw",
            riversideUrl: null,
            chaptersJson: [{ tSeconds: 30, title: "Intro" }],
            decisionsJson: ["Ship the historical UX"],
            actionItemsJson: [{ owner: "Rie", item: "Review PR" }],
            transcriptJson: [{ start: 30, text: "Hello community" }],
            forumPostId: 42,
          },
          isLoading: false,
        }),
      },
    },
  },
}));

vi.mock("wouter", () => ({
  Link: ({ children, href, ...rest }: any) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

describe("PastEventCtaGate", () => {
  it("hides calendar children on historical/past", () => {
    render(
      <PastEventCtaGate isPast>
        <a href="https://calendar.google.com">{CALENDAR_LABELS.google}</a>
        <button type="button">Get Reminder</button>
      </PastEventCtaGate>,
    );
    expect(screen.queryByText(CALENDAR_LABELS.google)).toBeNull();
    expect(screen.queryByText("Get Reminder")).toBeNull();
  });

  it("shows children when upcoming", () => {
    render(
      <PastEventCtaGate isPast={false}>
        <button type="button">Get Reminder</button>
      </PastEventCtaGate>,
    );
    expect(screen.getByText("Get Reminder")).toBeTruthy();
  });
});

describe("PastEventExpandedPanel", () => {
  it("shows Watch + Discuss + RecordingDetail and never calendar/reminder labels", () => {
    render(
      <PastEventExpandedPanel
        eventId={1}
        recordingId={9}
        eventYoutubeUrl="https://youtu.be/event"
        description="Past OA session"
      />,
    );

    const watch = screen.getByTestId("past-event-watch-expanded");
    expect(watch).toHaveAttribute("href", "https://youtu.be/edited-cut");
    expect(screen.getByTestId("past-event-discuss")).toHaveAttribute(
      "href",
      "/community/post/42",
    );
    expect(screen.getByTestId("recording-detail")).toBeTruthy();
    expect(screen.getByText("Chapters")).toBeTruthy();
    expect(screen.getByText("Follow-ups")).toBeTruthy();
    expect(screen.getByText("Intro")).toBeTruthy();

    expect(screen.queryByText(CALENDAR_LABELS.google)).toBeNull();
    expect(screen.queryByText(CALENDAR_LABELS.apple)).toBeNull();
    expect(screen.queryByText("Get Reminder")).toBeNull();
    expect(screen.queryByText("Join Waitlist")).toBeNull();
    expect(screen.queryByText(/Join on Riverside/i)).toBeNull();
    expect(screen.queryByText(/Suggest agenda/i)).toBeNull();
  });

  it("shows no-recording empty when no recordingId and byEventId null", () => {
    render(<PastEventExpandedPanel eventId={2} recordingId={null} />);
    expect(screen.getByTestId("past-empty-no-recording")).toHaveTextContent(
      "No recording linked yet",
    );
  });
});
