import { Calendar } from "lucide-react";
import { useState, useEffect } from "react";

interface SeasonalIntentionProps {
  intention: { text: string } | null;
  season: string;
  year: number;
  onSet: (text: string) => void;
}

interface IntentionRecord {
  text: string;
  season: string;
  year: number;
  setAt: string; // ISO date string
}

const STORAGE_KEY = "regen-season-intentions";

function loadIntentions(): IntentionRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as IntentionRecord[];
  } catch {
    return [];
  }
}

function saveIntention(record: IntentionRecord) {
  try {
    const existing = loadIntentions().filter(
      (r) => !(r.season === record.season && r.year === record.year)
    );
    localStorage.setItem(STORAGE_KEY, JSON.stringify([record, ...existing]));
  } catch {
    /* ignore */
  }
}

export default function SeasonalIntention({
  season,
  year,
  onSet,
}: SeasonalIntentionProps) {
  const [allIntentions, setAllIntentions] = useState<IntentionRecord[]>([]);
  const [inputValue, setInputValue] = useState("");

  // Load from localStorage on mount
  useEffect(() => {
    setAllIntentions(loadIntentions());
  }, []);

  const currentIntention = allIntentions.find(
    (r) => r.season === season && r.year === year
  ) ?? null;

  const pastIntentions = allIntentions.filter(
    (r) => !(r.season === season && r.year === year)
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const text = inputValue.trim();
    if (!text) return;
    const record: IntentionRecord = {
      text,
      season,
      year,
      setAt: new Date().toISOString(),
    };
    saveIntention(record);
    setAllIntentions(loadIntentions());
    setInputValue("");
    onSet(text);
  };

  const seasonLabel = season.charAt(0).toUpperCase() + season.slice(1);

  return (
    <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-4">
      <h3 className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-300">
        <Calendar className="h-4 w-4" />
        {seasonLabel} {year} Intention
      </h3>

      {currentIntention ? (
        <div>
          <p className="text-sm text-white mb-3 bg-gray-900/50 rounded-md px-3 py-2 border border-gray-600">
            {currentIntention.text}
          </p>
          <button
            onClick={() => {
              // Allow updating the intention
              const updated = allIntentions.filter(
                (r) => !(r.season === season && r.year === year)
              );
              setAllIntentions(updated);
              try {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
              } catch { /* ignore */ }
            }}
            className="text-xs text-gray-400 hover:text-gray-200 underline"
          >
            Update intention
          </button>
        </div>
      ) : (
        <div>
          <p className="mb-2 text-sm text-gray-300">
            Set your intention for this season.
          </p>
          <form onSubmit={handleSubmit} className="flex gap-2">
            <input
              name="intention"
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="What are you growing this season?"
              className="flex-1 rounded-md border border-gray-600 bg-gray-900 px-3 py-1.5 text-sm text-white placeholder-gray-500"
            />
            <button
              type="submit"
              className="rounded-md bg-green-700 px-3 py-1.5 text-sm text-white hover:bg-green-600 disabled:opacity-40"
              disabled={!inputValue.trim()}
            >
              Set
            </button>
          </form>
        </div>
      )}

      {/* History */}
      {pastIntentions.length > 0 && (
        <div className="mt-4 border-t border-gray-700 pt-3">
          <p className="text-xs text-gray-500 mb-2 uppercase tracking-wider">Past Intentions</p>
          <ul className="space-y-2">
            {pastIntentions.map((record, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-xs text-gray-500 mt-0.5 shrink-0 w-20">
                  {record.season.charAt(0).toUpperCase() + record.season.slice(1)} {record.year}
                </span>
                <span className="text-xs text-gray-300">{record.text}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
