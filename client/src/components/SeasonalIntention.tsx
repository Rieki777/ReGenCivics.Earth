/**
 * SeasonalIntention — player's intention for the current season plus a history
 * of past seasonal intentions. Server-backed via
 * trpc.playerProfiles.{getIntentions, setIntention}. Seeds from the legacy
 * localStorage key on first load if the server has no entries yet.
 */

import { Calendar, Check } from "lucide-react";
import { useEffect, useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { toast } from "sonner";

interface SeasonalIntentionProps {
  season: string;
  year: number;
  /** Optional: called with the saved text for parent-side bookkeeping. */
  onSet?: (text: string) => void;
}

interface LegacyRecord {
  text: string;
  season: string;
  year: number;
  setAt: string;
}

const LEGACY_STORAGE_KEY = "regen-season-intentions";
const MIGRATION_FLAG_KEY = "regen-season-intentions-migrated";

function loadLegacyIntentions(): LegacyRecord[] {
  try {
    const raw = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as LegacyRecord[];
  } catch {
    return [];
  }
}

export default function SeasonalIntention({ season, year, onSet }: SeasonalIntentionProps) {
  const { isAuthenticated } = useAuth();
  const utils = trpc.useUtils();

  const intentionsQuery = trpc.playerProfiles.getIntentions.useQuery(undefined, {
    enabled: isAuthenticated,
    staleTime: 60 * 1000,
  });

  const setIntentionMutation = trpc.playerProfiles.setIntention.useMutation({
    onSuccess: () => {
      utils.playerProfiles.getIntentions.invalidate();
      setInputValue("");
      setEditing(false);
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 2000);
    },
    onError: (e) => toast.error(e.message),
  });

  const [inputValue, setInputValue] = useState("");
  const [editing, setEditing] = useState(false);
  const [justSaved, setJustSaved] = useState(false);

  const intentions = intentionsQuery.data ?? [];
  const currentIntention = useMemo(
    () => intentions.find((r) => r.season === season && r.year === year) ?? null,
    [intentions, season, year]
  );
  const pastIntentions = useMemo(
    () => intentions.filter((r) => !(r.season === season && r.year === year)),
    [intentions, season, year]
  );

  // One-time migration from the old localStorage bucket. Runs after the
  // server query resolves and only if the server has no records yet.
  useEffect(() => {
    if (!isAuthenticated || intentionsQuery.isLoading) return;
    if (intentions.length > 0) return;
    try {
      if (localStorage.getItem(MIGRATION_FLAG_KEY)) return;
      const legacy = loadLegacyIntentions();
      if (legacy.length === 0) {
        localStorage.setItem(MIGRATION_FLAG_KEY, "done");
        return;
      }
      // Upsert each legacy row sequentially. We do this once, then mark migrated.
      (async () => {
        for (const r of legacy) {
          try {
            await setIntentionMutation.mutateAsync({
              season: r.season,
              year: r.year,
              intention: r.text.slice(0, 300),
            });
          } catch {
            /* keep going; we'll try the next one */
          }
        }
        localStorage.setItem(MIGRATION_FLAG_KEY, "done");
      })();
    } catch {
      /* localStorage unavailable */
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, intentionsQuery.isLoading, intentions.length]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const text = inputValue.trim();
    if (!text) return;
    setIntentionMutation.mutate({ season, year, intention: text });
    onSet?.(text);
  };

  const seasonLabel = season.charAt(0).toUpperCase() + season.slice(1);
  const showForm = editing || !currentIntention;

  return (
    <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-4">
      <h3 className="mb-3 flex items-center justify-between gap-2 text-sm font-medium text-gray-300">
        <span className="flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          {seasonLabel} {year} Intention
        </span>
        {justSaved && (
          <span className="inline-flex items-center gap-1 text-xs text-green-400">
            <Check className="h-3.5 w-3.5" /> Saved
          </span>
        )}
      </h3>

      {currentIntention && !editing && (
        <div className="mb-3">
          <p className="text-sm text-white bg-gray-900/50 rounded-md px-3 py-2 border border-gray-600">
            {currentIntention.intention}
          </p>
          <button
            onClick={() => {
              setEditing(true);
              setInputValue(currentIntention.intention);
            }}
            className="text-xs text-gray-400 hover:text-gray-200 underline mt-2"
          >
            Update intention
          </button>
        </div>
      )}

      {showForm && isAuthenticated && (
        <div>
          {!currentIntention && (
            <p className="mb-2 text-sm text-gray-300">
              Set your intention for this season.
            </p>
          )}
          <form onSubmit={handleSubmit} className="flex gap-2">
            <input
              name="intention"
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="What are you growing this season?"
              maxLength={300}
              className="flex-1 rounded-md border border-gray-600 bg-gray-900 px-3 py-1.5 text-sm text-white placeholder-gray-500"
            />
            <button
              type="submit"
              className="rounded-md bg-green-700 px-3 py-1.5 text-sm text-white hover:bg-green-600 disabled:opacity-40"
              disabled={!inputValue.trim() || setIntentionMutation.isPending}
            >
              {setIntentionMutation.isPending ? "Saving…" : "Set"}
            </button>
            {editing && (
              <button
                type="button"
                onClick={() => {
                  setEditing(false);
                  setInputValue("");
                }}
                className="rounded-md px-3 py-1.5 text-sm text-gray-400 hover:text-gray-200"
              >
                Cancel
              </button>
            )}
          </form>
        </div>
      )}

      {!isAuthenticated && !currentIntention && (
        <p className="text-sm text-gray-400 italic">
          Sign in to set a seasonal intention.
        </p>
      )}

      {pastIntentions.length > 0 && (
        <div className="mt-4 border-t border-gray-700 pt-3">
          <p className="text-xs text-gray-500 mb-2 uppercase tracking-wider">Past Intentions</p>
          <ul className="space-y-2">
            {pastIntentions.map((record) => (
              <li key={record.id} className="flex items-start gap-2">
                <span className="text-xs text-gray-500 mt-0.5 shrink-0 w-20">
                  {record.season.charAt(0).toUpperCase() + record.season.slice(1)} {record.year}
                </span>
                <span className="text-xs text-gray-300">{record.intention}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
