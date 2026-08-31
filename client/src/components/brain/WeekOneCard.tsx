/**
 * The week-one protocol, on Today, dismissible (ADDENDUM-2 item 8).
 *
 * The reason this is a card and not a doc: the software does not build the
 * habit by itself. Every part of the command center assumes a five-minute
 * morning and a five-minute evening, and nothing on the screen says so. If the
 * closed-per-week number in the strip above is still zero after two weeks, this
 * card is the first thing to check was ever followed.
 *
 * The three lines are Rye's own framing from the addendum, kept word for word.
 * Editing them into something smoother would be editing the protocol.
 *
 * Dismissal persists in localStorage, which throws outright in Safari private
 * mode and in some embedded web views. Both the read and the write are wrapped:
 * a storage that refuses is a card that reappears, never a screen that breaks.
 */
import { useState } from "react";
import { X } from "lucide-react";

export const WEEK_ONE_DISMISSED_KEY = "brain-week-one-dismissed";

export function weekOneDismissed(): boolean {
  try {
    return localStorage.getItem(WEEK_ONE_DISMISSED_KEY) === "1";
  } catch {
    return false;
  }
}

const LINES: Array<{ when: string; what: string }> = [
  {
    when: "Morning (5 min)",
    what: "read the bot's morning message, answer the five done-triage buttons, shape three.",
  },
  { when: "During the day", what: "talk to the bot; screenshots included." },
  {
    when: "Evening (5 min)",
    what: "promote what is ready; when five build items share a repo, batch and forge them.",
  },
];

export function WeekOneCard() {
  // Read once, in the initialiser, so the card never flashes on and then off
  // after an effect gets round to checking storage.
  const [gone, setGone] = useState(() => weekOneDismissed());
  if (gone) return null;

  const dismiss = () => {
    setGone(true);
    try {
      localStorage.setItem(WEEK_ONE_DISMISSED_KEY, "1");
    } catch {
      // No storage. It comes back next load, which is the harmless direction.
    }
  };

  return (
    <section
      data-testid="brain-week-one"
      aria-label="Week one protocol"
      className="relative rounded-xl border border-[#1a472a]/25 bg-[#f0ebe3] px-3 py-3 pr-12"
    >
      <h2 className="text-sm font-semibold uppercase tracking-wide text-[#1a472a]">Week one</h2>
      <dl className="mt-2 space-y-1.5">
        {LINES.map((l) => (
          <div key={l.when} className="text-sm leading-relaxed">
            <dt className="inline font-semibold text-[#1a472a]">{l.when}: </dt>
            <dd className="inline text-[#2d5a3d]">{l.what}</dd>
          </div>
        ))}
      </dl>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss the week one protocol"
        data-testid="brain-week-one-dismiss"
        className="absolute right-1 top-1 flex min-h-11 min-w-11 items-center justify-center rounded-lg text-[#1a472a]"
      >
        <X className="h-5 w-5" aria-hidden="true" />
      </button>
    </section>
  );
}

export default WeekOneCard;
