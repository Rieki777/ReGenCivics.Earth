import { Calendar } from "lucide-react";

interface Intention {
  text: string;
}

interface SeasonalIntentionProps {
  intention: Intention | null;
  season: string;
  year: number;
  onSet: (text: string) => void;
}

export default function SeasonalIntention({
  intention,
  season,
  year,
  onSet,
}: SeasonalIntentionProps) {
  return (
    <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-4">
      <h3 className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-300">
        <Calendar className="h-4 w-4" />
        {season.charAt(0).toUpperCase() + season.slice(1)} {year} Intention
      </h3>

      {intention ? (
        <p className="text-sm text-gray-200">{intention.text}</p>
      ) : (
        <div>
          <p className="mb-2 text-sm text-gray-400">
            Set your intention for this season.
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const form = e.target as HTMLFormElement;
              const input = form.elements.namedItem("intention") as HTMLInputElement;
              if (input.value.trim()) {
                onSet(input.value.trim());
                input.value = "";
              }
            }}
            className="flex gap-2"
          >
            <input
              name="intention"
              type="text"
              placeholder="What are you growing this season?"
              className="flex-1 rounded-md border border-gray-600 bg-gray-900 px-3 py-1.5 text-sm text-white placeholder-gray-500"
            />
            <button
              type="submit"
              className="rounded-md bg-green-700 px-3 py-1.5 text-sm text-white hover:bg-green-600"
            >
              Set
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
