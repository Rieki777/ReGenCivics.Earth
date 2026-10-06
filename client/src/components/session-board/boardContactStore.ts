/**
 * Whether this browser should be asked for a name and email, and the
 * localStorage that remembers the answer across weeks.
 * Kept out of the React provider so board writes can mark a contribution
 * without a circular import.
 */
import type { BoardFollowUpFrom } from "@shared/boardSignup";

export const BOARD_CONTACT_KEY = "session-board:contact";
const NAME_KEY = "session-board:name";

export type StoredBoardContact =
  | { name: string; email: string; savedAt: number }
  | { dismissedAt: number; name?: string };

type Listener = (from: BoardFollowUpFrom) => void;
const contributionListeners = new Set<Listener>();
const storageListeners = new Set<() => void>();

export function onBoardContribution(listener: Listener): () => void {
  contributionListeners.add(listener);
  return () => contributionListeners.delete(listener);
}

export function onBoardContactStore(listener: () => void): () => void {
  storageListeners.add(listener);
  return () => storageListeners.delete(listener);
}

export function markBoardContribution(from: BoardFollowUpFrom) {
  for (const listener of contributionListeners) listener(from);
}

function readRaw(key: string): string {
  try {
    return window.localStorage.getItem(key) ?? "";
  } catch {
    return "";
  }
}

function writeRaw(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* storage blocked */
  }
}

export function readBoardContact(): StoredBoardContact | null {
  try {
    const raw = readRaw(BOARD_CONTACT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredBoardContact;
    if (parsed && typeof (parsed as { savedAt?: number }).savedAt === "number" && typeof (parsed as { email?: string }).email === "string") {
      return parsed;
    }
    if (parsed && typeof (parsed as { dismissedAt?: number }).dismissedAt === "number") return parsed;
    return null;
  } catch {
    return null;
  }
}

export function readBoardName(): string {
  const stored = readBoardContact();
  if (stored && "name" in stored && stored.name) return stored.name;
  return readRaw(NAME_KEY);
}

export function saveBoardContact(input: { name: string; email: string }) {
  const name = input.name.trim().slice(0, 120);
  const email = input.email.trim().slice(0, 320);
  writeRaw(BOARD_CONTACT_KEY, JSON.stringify({ name, email, savedAt: Date.now() }));
  if (name) writeRaw(NAME_KEY, name);
  for (const listener of storageListeners) listener();
}

export function dismissBoardContact(name?: string) {
  const trimmed = name?.trim().slice(0, 120) ?? "";
  writeRaw(BOARD_CONTACT_KEY, JSON.stringify({ dismissedAt: Date.now(), ...(trimmed ? { name: trimmed } : {}) }));
  if (trimmed) writeRaw(NAME_KEY, trimmed);
  for (const listener of storageListeners) listener();
}

export function boardContactPrompt(input: {
  stored: StoredBoardContact | null;
  signedInEmail: string | null;
  contributed: boolean;
  asked: boolean;
}): "ask" | "hide" {
  if (input.signedInEmail) return "hide";
  if (input.stored && "savedAt" in input.stored) return "hide";
  if (input.asked) return "ask";
  if (input.stored && "dismissedAt" in input.stored) return "hide";
  if (input.contributed) return "ask";
  return "hide";
}

export function showBoardContactLink(stored: StoredBoardContact | null, signedInEmail: string | null): boolean {
  if (signedInEmail) return false;
  if (stored && "savedAt" in stored) return false;
  return true;
}

export function readLinkedFlag(): boolean {
  return readRaw("session-board:browser-linked") === "1";
}

export function writeLinkedFlag() {
  writeRaw("session-board:browser-linked", "1");
}
