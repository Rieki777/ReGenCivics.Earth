/**
 * CrowdpoolReadiness: the eight things a land project shows before its
 * campaign is approved for the crowdpooling round. The words live in
 * shared/crowdpoolReadiness.ts. Three places show them: /crowd-pooling#ready
 * for everyone, beside "Send for review" for a campaign's stewards, and in the
 * review dialog the team approves from.
 *
 * Where the ticks live (build spec 2026-09-25, section 12):
 *   - With `campaignId` (a campaign's stewards): stored on the campaign
 *     through campaigns.getReadiness and campaigns.setReadinessTick, keyed by
 *     the permanent item keys, so the review team sees them. A tick shows at
 *     once and rolls back with a message if the server refuses it.
 *   - Otherwise (the public list, the reviewer's own checklist): kept in this
 *     browser under `storageKey`. Nothing is sent.
 *   - `projectTicks` (the review dialog): beside each item, whether and when
 *     the project ticked it. The reviewer's own ticks stay local, as before.
 * Nothing adds up to a score.
 */
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ClipboardCheck } from "lucide-react";
import { trpc } from "@/lib/trpc";
import {
  CROWDPOOL_READINESS,
  READINESS_INTRO,
  READINESS_TITLE,
  weeksLabel,
} from "@shared/crowdpoolReadiness";
import { READINESS_STORED } from "@shared/crowdpoolCopy";
import { formatCloseDate } from "@shared/campaignProgress";

export type ProjectTick = { itemKey: string; tickedAt: Date | string | null };

type Props = {
  /** Title and intro. Off where the surrounding block already frames the list. */
  framed?: boolean;
  /** Who is ticking: the project getting ready, or the team reviewing it. */
  audience?: "project" | "review";
  /** Remember ticks in this browser under this key, one per campaign. Ignored with `campaignId`. */
  storageKey?: string;
  /** Store the ticks on this campaign (its stewards only; the server checks). */
  campaignId?: number;
  /** What the project ticked, shown beside each item in the review dialog. */
  projectTicks?: ProjectTick[];
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

function tickDate(v: Date | string | null): string | null {
  if (!v) return null;
  const d = v instanceof Date ? v : new Date(v);
  return isNaN(d.getTime()) ? null : formatCloseDate(d);
}

/** The ticks, stored on a campaign. Optimistic, with a rollback when the server refuses. */
function useStoredTicks(campaignId: number | undefined) {
  const enabled = campaignId != null;
  const utils = trpc.useUtils();
  const query = trpc.campaigns.getReadiness.useQuery(
    { campaignId: campaignId ?? 0 },
    { enabled, retry: false },
  );
  const [ticked, setTicked] = useState<string[]>([]);
  // Seed from the server whenever the stored set changes. Keyed by content,
  // so a refetch that returns the same ticks never resets the list.
  const serverKey = enabled && query.data ? query.data.map((t) => t.itemKey).sort().join("|") : null;
  useEffect(() => {
    if (serverKey !== null) setTicked(serverKey ? serverKey.split("|") : []);
  }, [serverKey]);

  const mutation = trpc.campaigns.setReadinessTick.useMutation();
  const toggle = (key: string) => {
    if (campaignId == null) return;
    const wasTicked = ticked.includes(key);
    setTicked((prev) => (wasTicked ? prev.filter((k) => k !== key) : [...prev, key]));
    mutation.mutate(
      { campaignId, key, ticked: !wasTicked },
      {
        onError: () => {
          setTicked((prev) => (wasTicked ? (prev.includes(key) ? prev : [...prev, key]) : prev.filter((k) => k !== key)));
          toast.error(READINESS_STORED.saveFailed);
        },
        onSettled: () => utils.campaigns.getReadiness.invalidate({ campaignId }),
      },
    );
  };
  return { enabled, ticked, toggle, loading: enabled && query.isLoading };
}

export function CrowdpoolReadiness({
  framed = true,
  audience = "project",
  storageKey,
  campaignId,
  projectTicks,
  id,
  className = "",
}: Props) {
  const stored = useStoredTicks(campaignId);
  const [localTicked, setLocalTicked] = useState<string[]>(() => (campaignId != null ? [] : readTicks(storageKey)));
  useEffect(() => {
    if (campaignId == null) setLocalTicked(readTicks(storageKey));
  }, [storageKey, campaignId]);

  const toggleLocal = (key: string) => {
    setLocalTicked((prev) => {
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

  const ticked = stored.enabled ? stored.ticked : localTicked;
  const toggle = stored.enabled ? stored.toggle : toggleLocal;
  const projectTickFor = new Map((projectTicks ?? []).map((t) => [t.itemKey, t]));

  const allIn = CROWDPOOL_READINESS.every((item) => ticked.includes(item.key));
  const titleId = `${id ?? "ready"}-title`;
  const hint =
    audience === "review"
      ? allIn
        ? "All eight in place."
        : "Tick each one as you check it against what the project shows."
      : stored.enabled
        ? allIn
          ? `All eight in place. ${READINESS_STORED.hint}`
          : `Tick each one as your project shows it. ${READINESS_STORED.hint}`
        : allIn
          ? "All eight in place. Your campaign is ready to send for review."
          : "Tick each one as your project shows it. Your ticks stay in this browser.";
  const inputScope = campaignId != null ? `c${campaignId}` : storageKey ?? "list";

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
          const inputId = `ready-${inputScope}-${item.key}`;
          const projectTick = projectTicks ? projectTickFor.get(item.key) : undefined;
          const projectDate = projectTick ? tickDate(projectTick.tickedAt) : null;
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
                  disabled={stored.loading}
                  onChange={() => toggle(item.key)}
                  className="h-5 w-5 shrink-0 cursor-pointer accent-[#4a7c59]"
                />
                <span className="font-bold text-[#1a472a] leading-snug">
                  <span className="text-[#4a7c59] mr-1.5">{n + 1}.</span>
                  {item.title}
                </span>
              </label>
              <div className="pl-8">
                {projectTicks && (
                  <p
                    className={`mb-1 text-sm font-semibold ${projectTick ? "text-[#1a472a]" : "text-[#1a472a]/75"}`}
                    data-testid={`project-tick-${item.key}`}
                  >
                    {projectTick
                      ? projectDate ? READINESS_STORED.projectTicked(projectDate) : READINESS_STORED.projectTickedNoDate
                      : READINESS_STORED.notTicked}
                  </p>
                )}
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
