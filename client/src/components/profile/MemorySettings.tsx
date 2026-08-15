/**
 * "What the Guide remembers about you" (Phase D2, improvement 13).
 * The transparency surface IS the feature: opt-in toggle (default OFF), the
 * full list of stored facts, delete any or all, export. Facts are small
 * game-journey facts written deterministically from events, never from chat,
 * and the Guide only reads them while the toggle is on.
 */

import { Brain, Download, Trash2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";

export function MemorySettings() {
  const utils = trpc.useUtils();
  const settingsQuery = trpc.companionMemory.settings.useQuery();
  const exportQuery = trpc.companionMemory.exportMemory.useQuery(undefined, { enabled: false });

  const refresh = () => utils.companionMemory.settings.invalidate();
  const setOptIn = trpc.companionMemory.setOptIn.useMutation({ onSuccess: refresh });
  const deleteFact = trpc.companionMemory.deleteFact.useMutation({ onSuccess: refresh });
  const deleteAll = trpc.companionMemory.deleteAll.useMutation({ onSuccess: refresh });

  const optIn = settingsQuery.data?.optIn ?? false;
  const facts = settingsQuery.data?.facts ?? [];

  const download = async () => {
    const result = await exportQuery.refetch();
    if (!result.data) return;
    const blob = new Blob([JSON.stringify(result.data, null, 2)], { type: "application/json" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `regen-guide-memory-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  return (
    <div className="rounded-2xl bg-white/5 border border-white/10 p-5 space-y-4">
      <div className="flex items-center gap-2">
        <Brain className="w-4 h-4 text-[#7dd87d]" />
        <h3 className="text-white font-bold text-sm">What the Guide remembers about you</h3>
      </div>
      <p className="text-white/60 text-sm">
        With your consent, the Guide keeps small notes about your game journey: quests you completed, crews you
        joined, gratitude you received. Everything it remembers is listed here, in full. You can delete any note,
        delete them all, or export them. Off means the Guide writes nothing and reads nothing.
      </p>

      <label className="flex items-center gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={optIn}
          onChange={(e) => setOptIn.mutate({ optIn: e.target.checked })}
          disabled={setOptIn.isPending || settingsQuery.isLoading}
          className="w-4 h-4 accent-[#7dd87d]"
        />
        <span className="text-white/80 text-sm">Let the Guide remember my journey</span>
      </label>

      {facts.length > 0 ? (
        <>
          <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
            {facts.map((f) => (
              <div
                key={f.id}
                className="flex items-start justify-between gap-2 rounded-lg bg-white/5 px-3 py-2"
              >
                <div className="text-white/75 text-sm">
                  {f.fact}
                  <span className="text-white/60 text-xs ml-2">
                    {new Date(f.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <button
                  onClick={() => deleteFact.mutate({ id: f.id })}
                  disabled={deleteFact.isPending}
                  className="text-white/60 hover:text-white shrink-0"
                  title="Delete this note"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <Button
              onClick={download}
              className="bg-white/10 text-white hover:bg-white/20 rounded-full px-4 h-8 text-xs"
            >
              <Download className="w-3 h-3 mr-1" /> Export
            </Button>
            <Button
              onClick={() => {
                if (window.confirm("Delete every note the Guide holds about you? This can't be undone.")) {
                  deleteAll.mutate();
                }
              }}
              disabled={deleteAll.isPending}
              className="bg-white/10 text-white/70 hover:bg-red-500/20 hover:text-red-300 rounded-full px-4 h-8 text-xs"
            >
              <Trash2 className="w-3 h-3 mr-1" /> Delete all
            </Button>
          </div>
        </>
      ) : (
        <p className="text-white/60 text-xs">
          {optIn
            ? "Nothing recorded yet. Notes appear within a day of your next quest completion or crew."
            : "Nothing is stored."}
        </p>
      )}
    </div>
  );
}
