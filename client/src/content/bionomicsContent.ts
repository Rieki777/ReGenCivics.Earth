/**
 * Bionomics page copy, extracted so it can be edited without touching JSX.
 *
 * The `/bionomics/edit` admin page reads from this default map and writes
 * overrides to localStorage (key: `bionomics-content-overrides`). At render
 * time, Bionomics.tsx calls `useBionomicsContent()` which merges defaults
 * with localStorage overrides, so an admin can preview edits live.
 *
 * To persist edits, the admin exports a JSON diff and either:
 *   (a) pastes it into the chat so the code can be updated, or
 *   (b) a follow-up migration stores it in a `pageContent` table.
 *
 * For now, overrides live in localStorage only. The defaults below match
 * the copy currently rendered in Bionomics.tsx.
 */

export interface BionomicsSection {
  id: string;
  label: string;
  description: string;
  defaultText: string;
}

export const BIONOMICS_SECTIONS: BionomicsSection[] = [
  {
    id: "hero_blurb",
    label: "Hero blurb (under the main title)",
    description: "The one-paragraph framing that sits under the Bridging Worlds hero image.",
    defaultText:
      "The living-economy side of ReGen Civics where we are living into the future of how we need our economic systems to be. The Game, $ReGen, and the bioregional infrastructure we have been growing since 2017.",
  },
  {
    id: "p2p_food_caption",
    label: "Peer-to-peer food economy caption",
    description: "The short caption that sits under the new bionomics diagram.",
    defaultText:
      "Local food systems as the energy backing a regenerative currency.",
  },
  {
    id: "twelve_attributes_blurb",
    label: "12 BFF Attributes blurb",
    description: "Blurb under the 12 BFF Attributes section heading.",
    defaultText:
      "The BioFi ebook lists 12 attributes a Bioregional Financing Facility should embody. Here is where we honestly stand on each one. We will update this list openly as the Game evolves.",
  },
  {
    id: "three_legs_blurb",
    label: "Three Legs blurb",
    description: "Blurb under the Three Legs of Bioregional Regeneration heading.",
    defaultText:
      "The BioFi framework names three legs that any bioregion needs to regenerate at scale: an Organizing Team, a Bioregional Hub, and a Bioregional Financing Facility. ReGen Civics builds tools for all three.",
  },
  {
    id: "regenerators_paragraph_1",
    label: "Regenerators (main paragraph)",
    description: "The main paragraph describing regenerators, their role, and how they show up in ReGen Civics.",
    defaultText:
      "The BioFi framework centers regenerators. People, projects, and practices that heal place. Bionomics is built to resource them, connect them, and amplify them. Inside ReGen Civics, regenerators show up as land projects in the incubator, food producers on LocalScale, players doing quests in their own backyards, role-holders running the Game, and bioregional teams forking our tools and adapting them. If you are healing place, you are a regenerator. The Game is for you.",
  },
  {
    id: "seed_2017_text",
    label: "The 2017 seed question",
    description: "The timeline block describing the 2017 origin question.",
    defaultText:
      "Bitcoin can spend billions a year on energy to back its currency. What if we spent that money setting up local food systems to back a new currency, one backed by local, regenerative, and delicious food? This is the question that started everything. A democratic financial system backed by local food systems.",
  },
];

const STORAGE_KEY = "bionomics-content-overrides";

export function readBionomicsOverrides(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, string>;
    }
  } catch {
    // ignore malformed JSON
  }
  return {};
}

export function writeBionomicsOverrides(overrides: Record<string, string>): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(overrides));
  } catch {
    // ignore storage errors (e.g. quota exceeded, private mode)
  }
}

export function clearBionomicsOverrides(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

/**
 * Read copy for a single section. Returns the localStorage override if
 * present, otherwise the default. Safe to call from any render.
 */
export function getBionomicsCopy(id: string): string {
  const overrides = readBionomicsOverrides();
  if (overrides[id]) return overrides[id];
  const section = BIONOMICS_SECTIONS.find((s) => s.id === id);
  return section?.defaultText ?? "";
}
