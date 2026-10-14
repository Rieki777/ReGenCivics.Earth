/**
 * The Week 3 stages (2026-10-14): every stage kind has its component, the
 * private card never leaves the screen, slide links open the deck in a new tab
 * (placeholders stay plain numbers), and taps send the answer the contract
 * names (API_CONTRACT.md sections 2 and 4).
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { STAGE_RENDERERS, WEEK3_DECK, boardStages, defaultBoardState, promptsForWeek } from "@shared/sessionBoard";
import * as stageModule from "../stages";
import type { StageProps } from "../stages";
import { NeedsStage, PromptStage, week3CloseStats } from "../stages";
import { PrivateCard, addFeelWord } from "./PrivateCard";
import { SlideLine } from "./parts";
import { filterTiles } from "./CheckIn";
import { nextSessionWeek } from "./TellUs";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

type Row = { id: number; kind: string; block: string | null; text: string; projectId: number | null; hidden?: boolean };

function card(id: number, name: string, hidden = false) {
  return { id, name, place: null, url: null, phase: null, whereNow: null, ready: [], nextMove: null, shared: false, hidden, applicationId: null, displayName: null };
}

function item(r: Row) {
  return {
    theme: null, chosen: false, votes: 0, roomVotes: 0, fromItemId: null, displayName: null,
    createdAt: new Date(2026, 9, 14, 10, 0, r.id), hidden: false, ...r,
  };
}

function fakeProps(over: { index: number; items?: Row[]; mineIds?: number[]; myProject?: unknown }): StageProps {
  const actions = {
    answerPick: vi.fn(async () => true),
    answerNote: vi.fn(async () => ({ id: 1 })),
    ask: vi.fn(async () => ({ id: 2 })),
    checkIn: vi.fn(async () => null),
    removeItem: vi.fn(async () => true),
    curateItem: vi.fn(),
    curateProject: vi.fn(),
    addProject: vi.fn(async () => null),
    act: vi.fn(),
  };
  const board = {
    week: 3, status: "open", version: 1, serverNow: Date.now(), state: defaultBoardState(3), canFacilitate: false,
    notes: [], hands: {}, offers: {}, offerPeople: null, facilitatorLists: null,
    projects: [card(5, "Toa Hermitage")],
    items: (over.items ?? []).map(item),
    answerCounts: { mate: { hardly: 0, little: 2, some: 0, mostly: 1, fully: 0 } },
    checkins: {},
  };
  const mine = {
    itemIds: new Set(over.mineIds ?? []), projectIds: new Set(), votes: new Set(), hands: new Set(), offers: new Set(),
    anon: new Map<string, string>(), checkins: new Set<number>(),
  };
  return {
    board, week: 3, stages: boardStages(3), index: over.index, facilitator: false, canWrite: true, mine, actions,
    now: Date.now(), serverNow: () => Date.now(), go: vi.fn(),
    myProject: over.myProject === undefined ? { kind: "project", cardId: 5, name: "Toa Hermitage" } : over.myProject,
    setMyProject: vi.fn(), displayName: "", setDisplayName: vi.fn(), signedIn: false, look: vi.fn(),
  } as unknown as StageProps;
}

describe("stage components", () => {
  it("exports a component from stages.tsx for every stage kind", () => {
    const mod = stageModule as unknown as Record<string, unknown>;
    for (const name of Object.values(STAGE_RENDERERS)) expect(typeof mod[name], name).toBe("function");
  });
});

describe("the private card", () => {
  it("never saves or sends what is typed or tapped in", () => {
    const setItem = vi.spyOn(Storage.prototype, "setItem");
    const xhrOpen = vi.spyOn(XMLHttpRequest.prototype, "open");
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    const feel = promptsForWeek(3).get("feel")!;
    expect(feel.mode).toBe("private");
    expect(feel.hint).toBe("This stays on your screen. We never save it or send it to our server.");

    render(<PrivateCard p={feel} />);
    const field = screen.getByRole("textbox") as HTMLTextAreaElement;
    expect(field).not.toHaveAttribute("name");
    expect(field).toHaveAttribute("autocomplete", "off");
    expect(field.closest("form")).toBeNull();
    expect(screen.getByText(feel.hint!)).toBeInTheDocument();

    fireEvent.change(field, { target: { value: "I feel unsure because I need" } });
    fireEvent.click(screen.getByRole("button", { name: "Support" }));
    fireEvent.click(screen.getByRole("button", { name: "Clarity" }));
    expect(field.value).toBe("I feel unsure because I need support, clarity");
    expect(screen.getByText(/that's a strategy/)).toBeInTheDocument();

    expect(setItem).not.toHaveBeenCalled();
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(xhrOpen).not.toHaveBeenCalled();
    expect(window.location.href).not.toContain("unsure");
  });

  it("keeps the private words when the room moves on and back, in page memory only", () => {
    const setItem = vi.spyOn(Storage.prototype, "setItem");
    const p = { ...promptsForWeek(3).get("feel")!, key: "feel-remount-test" };
    const first = render(<PrivateCard p={p} />);
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "I feel stretched because I need rest" } });
    first.unmount();
    render(<PrivateCard p={p} />);
    expect((screen.getByRole("textbox") as HTMLTextAreaElement).value).toBe("I feel stretched because I need rest");
    expect(setItem).not.toHaveBeenCalled();
  });

  it("taps words in after need with a space, and after anything else with a comma", () => {
    expect(addFeelWord("", "Peace of mind")).toBe("Peace of mind");
    expect(addFeelWord("I need ", "Ease")).toBe("I need ease");
    expect(addFeelWord("I need ease", "Play")).toBe("I need ease, play");
  });
});

describe("slide links", () => {
  it("shows a slide with no page id yet as a plain number with no link", () => {
    const stage = { ...boardStages(3)[0], slides: [{ n: 99 }] };
    const { container } = render(<SlideLine week={3} stage={stage} />);
    expect(container.textContent).toContain("On screen:");
    expect(container.textContent).toContain("slide 99");
    expect(container.querySelector("a")).toBeNull();
  });

  it("links the new slides of the clean copy too", () => {
    render(<SlideLine week={3} stage={boardStages(3)[0]} />);
    expect(screen.getByRole("link")).toHaveAttribute("href", `https://docs.google.com/presentation/d/${WEEK3_DECK.fileId}/edit#slide=id.${WEEK3_DECK.pages[1]}`);
  });

  it("opens each real slide of the deck in a new tab", () => {
    render(<SlideLine week={3} stage={boardStages(3)[7]} />);
    const links = screen.getAllByRole("link");
    expect(links.map((l) => l.textContent?.replace(" (opens in a new tab)", ""))).toEqual(["slide 7", "slide 8", "slide 13"]);
    for (const l of links) {
      expect(l).toHaveAttribute("target", "_blank");
      expect(l).toHaveAttribute("rel", "noopener noreferrer");
    }
    expect(links[0]).toHaveAttribute("href", `https://docs.google.com/presentation/d/${WEEK3_DECK.fileId}/edit#slide=id.${WEEK3_DECK.pages[7]}`);
  });

  it("groups the slides for if there's time and to go deeper", () => {
    const { container } = render(<SlideLine week={3} stage={boardStages(3)[9]} />);
    expect(container.textContent).toContain("If there's time:");
    expect(container.textContent).toContain("Go deeper:");
  });

  it("draws nothing for a stage with no slides", () => {
    const { container } = render(<SlideLine week={2} stage={boardStages(2)[0]} />);
    expect(container.innerHTML).toBe("");
  });
});

describe("a prompt stage", () => {
  it("keeps an anonymous pick off the project and shows only counts", () => {
    const props = fakeProps({ index: 5 });
    render(<PromptStage {...props} />);
    expect(screen.getByText("For Toa Hermitage")).toBeInTheDocument();
    const little = screen.getByRole("button", { name: /A little/ });
    expect(little).toHaveTextContent("2");
    fireEvent.click(little);
    expect(props.actions.answerPick).toHaveBeenCalledWith({ key: "mate", option: "little", on: true, projectId: null });
    expect(screen.getByText("Only the counts show here, with no names.")).toBeInTheDocument();
  });

  it("moves only this screen to the check-in from the chip", () => {
    const props = fakeProps({ index: 5 });
    render(<PromptStage {...props} />);
    fireEvent.click(screen.getByRole("button", { name: "Change project" }));
    expect(props.look).toHaveBeenCalledWith(1);
    expect(props.go).not.toHaveBeenCalled();
  });

  it("asks for the room when nobody has tapped a project", () => {
    const props = fakeProps({ index: 5, myProject: null });
    render(<PromptStage {...props} />);
    expect(screen.getByText("Answering for the room. Tap your project to keep these with it.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Tap your project" }));
    expect(props.look).toHaveBeenCalledWith(1);
  });
});

describe("the human needs cards", () => {
  it("picks a human need for the tapped project, and plants a seed on a picked one", () => {
    const props = fakeProps({ index: 6, items: [{ id: 10, kind: "answer", block: "needs", text: "love", projectId: 5 }], mineIds: [10] });
    render(<NeedsStage {...props} />);
    expect(screen.getByText("3 seeds left")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /^Vitality & Survival Needs/ }));
    expect(props.actions.answerPick).toHaveBeenCalledWith({ key: "needs", option: "vitality", on: true, projectId: 5 });
    fireEvent.click(screen.getByRole("button", { name: "Plant a seed: Love" }));
    expect(props.actions.answerPick).toHaveBeenCalledWith({ key: "top", option: "love", on: true, projectId: 5 });
  });

  it("sends someone with no seeds back to plant them, on this screen only", () => {
    const props = fakeProps({ index: 7 });
    render(<NeedsStage {...props} />);
    // It names the stage: the one before "Who meets each need" is Living ways, where nothing is planted.
    expect(screen.getByText("Plant up to three seeds first, on What your project is for.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Go to What your project is for" }));
    expect(props.look).toHaveBeenCalledWith(6);
  });

  it("asks today, the goal and who it's for on each seed, with the goal's meaning", () => {
    const props = fakeProps({
      index: 7,
      items: [
        { id: 10, kind: "answer", block: "needs", text: "love", projectId: 5 },
        { id: 11, kind: "answer", block: "top", text: "love", projectId: 5 },
        { id: 12, kind: "answer", block: "g-love", text: "thriving", projectId: 5 },
      ],
      mineIds: [10, 11, 12],
    });
    render(<NeedsStage {...props} />);
    expect(screen.getByText("People come here for love. It's one of the reasons your project exists.")).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole("button", { name: /^Unmet/ })[0]);
    expect(props.actions.answerPick).toHaveBeenCalledWith({ key: "n-love", option: "unmet", on: true, projectId: 5 });
  });
});

describe("Week 3's close", () => {
  it("counts projects checked in, human needs named, seeds and questions, leaving hidden ones out", () => {
    const board = {
      projects: [card(5, "Toa Hermitage"), card(6, "Stray", true), card(7, "Amora")],
      checkins: { 5: 2, 6: 1 },
      items: [
        { id: 1, kind: "answer", block: "needs", text: "love", projectId: 7 },
        { id: 2, kind: "answer", block: "needs", text: "play", projectId: 7 },
        { id: 3, kind: "answer", block: "needs", text: "love", projectId: 5 },
        { id: 4, kind: "answer", block: "top", text: "love", projectId: 7 },
        { id: 5, kind: "answer", block: "needs", text: "growth", projectId: 6 },
        { id: 6, kind: "ask", block: "s3", text: "How?", projectId: null },
        { id: 7, kind: "ask", block: "s3", text: "Hidden", projectId: null, hidden: true },
      ].map(item),
    } as unknown as Parameters<typeof week3CloseStats>[0];
    expect(week3CloseStats(board)).toEqual([
      ["Projects checked in", "2"],
      ["Human needs named", "2"],
      ["Seeds planted", "1"],
      ["Questions asked", "1"],
    ]);
  });
});

describe("check-in helpers", () => {
  it("filters tiles by folded name and puts yours first", () => {
    const tiles = [
      { name: "Amora", cardId: 1 },
      { name: "Toa Hermitage", cardId: null },
      { name: "Temple of Roots", cardId: 3 },
    ];
    expect(filterTiles(tiles, "", (t) => t.cardId === 3).map((t) => t.name)).toEqual(["Temple of Roots", "Amora", "Toa Hermitage"]);
    expect(filterTiles(tiles, "  toa  HERMITAGE", () => false).map((t) => t.name)).toEqual(["Toa Hermitage"]);
  });

  it("files feedback under the next session that hasn't started", () => {
    const at = (d: number) => new Date(2026, 9, d, 10);
    const sessions = [
      { week: 3, start: at(14), status: "completed" },
      { week: 4, start: at(21), status: "upcoming" },
      { week: 5, start: at(28), status: "upcoming" },
    ];
    expect(nextSessionWeek(sessions, at(14).getTime() + 3_600_000)).toBe(4);
    expect(nextSessionWeek(sessions, at(29).getTime())).toBeNull();
  });
});
