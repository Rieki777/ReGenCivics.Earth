import { describe, expect, it } from "vitest";
import { buildEditedRecordingEmailHtml, editedRecordingSubject } from "./editedCutEmail";
import { parseDescriptionChapters } from "./youtubeChapters";

const DESCRIPTION = `
Chapters
0:00 Welcome: the open incubator model
0:59 Crowd pooling, shared equity, and collective fundraising
3:37 Why every project needs a clear “game”
64:00 Community tools, project profiles, and getting involved
1:11:40 Closing
`;

describe("edited recording email", () => {
  it("uses the week subject, the watch link, the board, the vote page, and chapter timestamps", () => {
    const chapters = parseDescriptionChapters(DESCRIPTION);
    const html = buildEditedRecordingEmailHtml({
      week: 2,
      title: "Incubator Overview",
      videoId: "JS8YoJE1PUI",
      chapters,
      prefsUrl: "https://regencivics.earth/email-preferences?token=abc",
    });
    expect(editedRecordingSubject(2, "Incubator Overview")).toBe(
      "Week 2 recording: Incubator Overview (edited)",
    );
    expect(html).toContain("Watch the recording");
    expect(html).toContain("https://youtu.be/JS8YoJE1PUI");
    expect(html).toContain("https://youtu.be/JS8YoJE1PUI?t=3840");
    expect(html).toContain("64:00");
    expect(html).toContain("Community tools, project profiles, and getting involved");
    expect(html).toContain("https://regencivics.earth/season2/week/2");
    expect(html).toContain("https://regencivics.earth/season-schedule");
    expect(html).toContain("Vote on call times");
    expect(html).toContain("Manage email preferences");
    expect(html).not.toContain("—");
  });
});
