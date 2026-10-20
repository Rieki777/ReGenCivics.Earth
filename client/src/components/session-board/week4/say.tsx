/**
 * One polite live region per Week 4 stage, so a card that saves or is taken
 * back is said aloud to a screen reader as well as seen: the form closing on
 * its own says nothing. Week4Frame mounts the region; the forms call `say`.
 */
import { createContext, useCallback, useContext, useState, type ReactNode } from "react";

const SayContext = createContext<(text: string) => void>(() => {});

export function SayRegion({ children }: { children: ReactNode }) {
  const [said, setSaid] = useState("");
  // Cleared first, so the same words said twice are read twice.
  const say = useCallback((text: string) => {
    setSaid("");
    if (typeof requestAnimationFrame === "function") requestAnimationFrame(() => setSaid(text));
    else setSaid(text);
  }, []);
  return (
    <SayContext.Provider value={say}>
      {children}
      <p className="sr-only" aria-live="polite">{said}</p>
    </SayContext.Provider>
  );
}

export function useSay(): (text: string) => void {
  return useContext(SayContext);
}
