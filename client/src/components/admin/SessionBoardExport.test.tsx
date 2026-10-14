/**
 * The admin export of every weekly session board (Rye, 2026-10-13: "We read
 * these answers to shape how we build Village OS"). Nothing loads until an
 * admin taps; the CSV is boardExportCsv's, the JSON is the export as sent; the
 * summary reads each week's human needs answers in plain words.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { EXPORT_COPY, boardExportCsv, type BoardExport } from "@shared/boardEntries";
import { needsSummary, type AnswerRow } from "@shared/humanNeeds";
import {
  PANEL_COPY,
  SessionBoardExport,
  SessionBoardExportView,
  anonymousLines,
  csvForDownload,
  tallyLine,
} from "./SessionBoardExport";

const query = vi.fn();

vi.mock("@/lib/trpc", () => ({
  trpc: {
    useUtils: () => ({ client: { sessionBoard: { adminExport: { query: (...a: unknown[]) => query(...a) } } } }),
  },
}));

const at = "2026-10-14T17:30:00.000Z";
const row = (id: number, block: string, text: string, projectId: number | null): AnswerRow => ({
  id, kind: "answer", block, text, projectId, createdAt: at,
});
const ROWS: AnswerRow[] = [
  row(1, "needs", "love", 7),
  row(2, "top", "love", 7),
  row(3, "n-love", "unmet", 7),
  row(4, "g-love", "thriving", 7),
  row(5, "m-love", "circle", 7),
  row(6, "decide-now", "founder", null),
];

const DATA: BoardExport = {
  generatedAt: "2026-10-14T19:00:00.000Z",
  why: EXPORT_COPY.why,
  weeks: [
    {
      week: 2,
      title: "Week 2: Pain Points & Growth Opportunities",
      href: "/season2/week/2",
      status: "open",
      projects: [],
      rows: [
        {
          id: 90, kind: "pain", key: null, stage: "Circle", label: "A pain point you named", value: "=SUM(A1)",
          projectId: null, projectName: null, applicationId: null, displayName: "Rye", author: "signed-in",
          userId: 1, chosen: false, hidden: false, createdAt: at,
        },
      ],
      anonymous: [],
      votes: [],
      summary: null,
      projectViews: [],
    },
    {
      week: 3,
      title: "Week 3: Game & Organisation Co-Creation Part 1",
      href: "/season2/week/3",
      status: "open",
      projects: [
        {
          cardId: 7, name: "Amora", place: "Dominicalito, Costa Rica", applicationId: 57, applicationName: "Amora",
          applicationStatus: "under_review", projectPath: null, adminPath: "/admin?tab=applications&open=57",
          hidden: false, addedBy: null, checkins: 3,
        },
      ],
      rows: [],
      anonymous: [
        { key: "pulse-a", label: "How it was landing", value: "Clear", createdAt: at },
        { key: "pulse-a", label: "How it was landing", value: "Clear", createdAt: at },
        { key: "pulse-a", label: "How it was landing", value: "Too fast", createdAt: at },
      ],
      votes: [],
      summary: needsSummary(ROWS),
      projectViews: [{ cardId: 7, name: "Amora", lines: ["All this is for: not chosen yet."], villageOs: { needs: [] } }],
    },
    {
      week: 4, title: "Week 4", href: "/season2/week/4", status: "none",
      projects: [], rows: [], anonymous: [], votes: [], summary: null, projectViews: [],
    },
  ],
};

let createObjectURL: ReturnType<typeof vi.fn>;
let blobs: Blob[];

beforeEach(() => {
  query.mockReset();
  query.mockResolvedValue(DATA);
  blobs = [];
  createObjectURL = vi.fn((b: Blob) => {
    blobs.push(b);
    return "blob:test";
  });
  Object.assign(URL, { createObjectURL, revokeObjectURL: vi.fn() });
  vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

function readBlob(b: Blob): Promise<string> {
  return new Promise((resolve) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.readAsText(b);
  });
}

describe("SessionBoardExport", () => {
  it("loads nothing until an admin taps, and says why the answers are kept", () => {
    render(<SessionBoardExport />);
    expect(query).not.toHaveBeenCalled();
    expect(screen.getByText(EXPORT_COPY.why)).toBeTruthy();
    expect(screen.getByRole("button", { name: EXPORT_COPY.json })).toBeTruthy();
    expect(screen.getByRole("button", { name: EXPORT_COPY.csv })).toBeTruthy();
  });

  it("downloads the CSV that boardExportCsv builds, with a byte-order mark", async () => {
    render(<SessionBoardExport />);
    await userEvent.click(screen.getByRole("button", { name: EXPORT_COPY.csv }));
    expect(query).toHaveBeenCalledTimes(1);
    expect(blobs).toHaveLength(1);
    expect(blobs[0].type).toContain("text/csv");
    const text = await readBlob(blobs[0]);
    expect(text.replace(String.fromCharCode(0xfeff), "")).toBe(boardExportCsv(DATA));
    // A typed answer that looks like a formula reaches the spreadsheet as text.
    expect(text).toContain("'=SUM(A1)");
  });

  it("downloads the JSON as sent", async () => {
    render(<SessionBoardExport />);
    await userEvent.click(screen.getByRole("button", { name: EXPORT_COPY.json }));
    expect(blobs[0].type).toBe("application/json");
    expect(JSON.parse(await readBlob(blobs[0]))).toEqual(DATA);
  });

  it("shows each week's summary, newest first, after a tap", async () => {
    render(<SessionBoardExport />);
    await userEvent.click(screen.getByRole("button", { name: PANEL_COPY.summary }));
    const weeks = await screen.findAllByTestId("export-week");
    expect(weeks.map((w) => within(w).getAllByRole("link")[0].textContent)).toEqual([
      "Week 4",
      "Week 3: Game & Organisation Co-Creation Part 1",
      "Week 2: Pain Points & Growth Opportunities",
    ]);
    expect(within(weeks[0]).getByText(PANEL_COPY.noBoard)).toBeTruthy();
    expect(within(weeks[1]).getByText(PANEL_COPY.projects(1))).toBeTruthy();
    expect(within(weeks[1]).getByText("Unmet 1")).toBeTruthy();
    expect(within(weeks[1]).getByText("Thriving 1")).toBeTruthy();
    expect(within(weeks[1]).getByText("How it was landing: Clear 2 · Too fast 1")).toBeTruthy();
    expect(within(weeks[2]).getByText(PANEL_COPY.noNeeds)).toBeTruthy();
  });

  it("says so when the export fails", async () => {
    query.mockRejectedValueOnce(new Error("FORBIDDEN"));
    render(<SessionBoardExport />);
    await userEvent.click(screen.getByRole("button", { name: EXPORT_COPY.csv }));
    expect(await screen.findByText(EXPORT_COPY.failed)).toBeTruthy();
    expect(blobs).toHaveLength(0);
  });
});

describe("pieces", () => {
  it("tallies only the options with a count, in the list's order", () => {
    const opts = [{ key: "a", label: "Alive" }, { key: "b", label: "Unmet" }];
    expect(tallyLine({ a: 0, b: 2 }, opts)).toBe("Unmet 2");
    expect(tallyLine({ a: 1, b: 2 }, opts)).toBe("Alive 1 · Unmet 2");
    expect(tallyLine({ a: 0, b: 0 }, opts)).toBe(PANEL_COPY.none);
  });

  it("counts anonymous answers by question and choice, with no names", () => {
    expect(anonymousLines(DATA.weeks[1].anonymous)).toEqual(["How it was landing: Clear 2 · Too fast 1"]);
    // The two pulses share their words; each keeps its own line, named by its stage.
    const both = [
      ...DATA.weeks[1].anonymous,
      { key: "pulse-b", label: "How it was landing", value: "Clear", createdAt: DATA.weeks[1].anonymous[0].createdAt },
    ];
    expect(anonymousLines(both, 3)).toEqual([
      "How it was landing (How deep, how wide): Clear 2 · Too fast 1",
      "How it was landing (Who meets each need): Clear 1",
    ]);
  });

  it("puts the byte-order mark only in front of the CSV", () => {
    const csv = csvForDownload(DATA);
    expect(csv.charCodeAt(0)).toBe(0xfeff);
    expect(csv.slice(1)).toBe(boardExportCsv(DATA));
  });

  it("renders the view from data without a request", () => {
    render(<SessionBoardExportView data={DATA} />);
    expect(screen.getAllByTestId("export-week")).toHaveLength(3);
    expect(query).not.toHaveBeenCalled();
  });
});
