/**
 * CrowdpoolReadiness: the eight things a land project shows before its
 * campaign is approved for the crowdpooling round. The words live in
 * shared/crowdpoolReadiness.ts. Three places show them: /crowd-pooling#ready
 * for everyone, beside "Send for review" for a campaign's stewards, and in the
 * review dialog the team approves from.
 *
 * The ticks are the reader's own checklist, kept in this browser only. Nothing
 * is sent and nothing adds up to a score.
 */
import { useEffect, useState } from "react";
import { ClipboardCheck } from "lucide-react";
import {
  CROWDPOOL_READINESS,
  READINESS_INTRO,
  READINESS_TITLE,
  weeksLabel,
} from "@shared/crowdpoolReadiness";

type Props = {
  /** Title and intro. Off where the surrounding block already frames the list. */
  framed?: boolean;
  /** Who is ticking: the project getting ready, or the team reviewing it. */
  audience?: "project" | "review";
  /** Remember ticks in this browser under this key, one per campaign. */
  storageKey?: string;
  id?: string;
  className?: string;
};

const PREFIX = "crowdpool_ready:";

function readTicks(key?: string): string[] {
  if (!key) return [];
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(PREFIX + key) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === "string") : [];
  } catch {
    return [];
  }
}

export function CrowdpoolReadiness({ framed = true, audience = "project", storageKey, id, className = "" }: Props) {
  const [ticked, setTicked] = useState<string[]>(() => readTicks(storageKey));
  useEffect(() => setTicked(readTicks(storageKey)), [storageKey]);

  const toggle = (key: string) => {
    setTicked((prev) => {
      const next = prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key];
      if (storageKey) {
        try {
          localStorage.setItem(PREFIX + storageKey, JSON.stringify(next));
        } catch {
          // Private windows can refuse storage; the ticks still work for this visit.
        }
      }
      return next;
    });
  };

  const allIn = CROWDPOOL_READINESS.every((item) => ticked.includes(item.key));
  const titleId = `${id ?? "ready"}-title`;
  const hint =
    audience === "review"
      ? allIn
        ? "All eight in place."
        : "Tick each one as you check it against what the project shows."
      : allIn
        ? "All eight in place. Your campaign is ready to send for review."
        : "Tick each one as your project shows it. Your ticks stay in this browser.";

  return (
    <section
      id={id}
      aria-labelledby={framed ? titleId : undefined}
      // The site runs a dark color scheme; this list sits on parchment, so its
      // checkboxes use the light one or they read as already ticked.
      className={`scroll-mt-24 [color-scheme:light] ${className}`}
    >
      {framed && (
        <>
          <h2
            id={titleId}
            className="flex items-center gap-2 text-2xl md:text-3xl font-bold text-[#1a472a] mb-2"
            style={{ fontFamily: "var(--font-display)" }}
          >
            <ClipboardCheck className="w-6 h-6 text-[#4a7c59] shrink-0" aria-hidden="true" />
            {READINESS_TITLE}
          </h2>
          <p className="text-[#1a472a]/85 mb-5 safe-prose">{READINESS_INTRO}</p>
        </>
      )}
      <ol className="space-y-3">
        {CROWDPOOL_READINESS.map((item, n) => {
          const checked = ticked.includes(item.key);
          const inputId = `ready-${storageKey ?? "list"}-${item.key}`;
          return (
            <li
              key={item.key}
              className={`rounded-xl border bg-white p-4 transition-colors ${
                checked ? "border-[#4a7c59]/70" : "border-[#7dd87d]/35"
              }`}
            >
              <label htmlFor={inputId} className="flex min-h-11 cursor-pointer items-center gap-3">
                <input
                  id={inputId}
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggle(item.key)}
                  className="h-5 w-5 shrink-0 cursor-pointer accent-[#4a7c59]"
                />
                <span className="font-bold text-[#1a472a] leading-snug">
                  <span className="text-[#4a7c59] mr-1.5">{n + 1}.</span>
                  {item.title}
                </span>
              </label>
              <div className="pl-8">
                <p className="text-sm text-[#1a472a]/85 safe-prose">{item.need}</p>
                <p className="mt-1 text-sm text-[#1a472a]/85 safe-prose">
                  <span className="font-semibold">Show:</span> {item.show}
                </p>
                <p className="mt-2 text-xs text-[#1a472a]/80">
                  Season 2: {weeksLabel(item.weeks)} · Governance Canvas: {item.canvas.join(", ")}
                </p>
              </div>
            </li>
          );
        })}
      </ol>
      <p className="mt-4 text-sm font-medium text-[#1a472a]/85" aria-live="polite">
        {hint}
      </p>
    </section>
  );
}

export default CrowdpoolReadiness;
