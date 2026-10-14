/**
 * "Tools your project uses" (ADR-73): a land project picks the ReGen Tools
 * Library tools it uses, so each tool can show "used by N land projects" and
 * the next project choosing one can see who already does. Saved as it is
 * ticked; only accepted projects count toward the public number.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Check, Plus, Search } from "lucide-react";

export function ProjectToolsPicker({ applicationId, tone = "light" }: { applicationId: number | null; tone?: "light" | "dark" }) {
  const options = trpc.tools.options.useQuery(undefined, { staleTime: 5 * 60_000 });
  const current = trpc.tools.projectTools.useQuery({ applicationId: applicationId ?? 0 }, { enabled: !!applicationId });
  const save = trpc.tools.setProjectTools.useMutation();
  const [picked, setPicked] = useState<Set<number>>(new Set());
  const [query, setQuery] = useState("");
  const loaded = useRef(false);

  useEffect(() => {
    if (loaded.current || !current.data) return;
    loaded.current = true;
    setPicked(new Set(current.data));
  }, [current.data]);

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    const all = options.data ?? [];
    return q ? all.filter((t) => t.name.toLowerCase().includes(q)) : all;
  }, [options.data, query]);

  const dark = tone === "dark";
  const text = dark ? "text-white" : "text-[#1a472a]";
  const muted = dark ? "text-white/75" : "text-[#1a472a]/75";

  if (!applicationId) {
    return <p className={`text-sm ${muted}`}>Your tools list opens once your draft has saved.</p>;
  }

  function toggle(id: number) {
    const next = new Set(picked);
    if (next.has(id)) next.delete(id); else next.add(id);
    setPicked(next);
    save.mutate({ applicationId: applicationId!, toolIds: [...next] });
  }

  return (
    <div>
      <p className={`text-sm ${muted}`}>
        Tick the tools from the <a href="/tools" target="_blank" rel="noopener noreferrer" className="underline">ReGen Tools Library</a> your
        project uses. It helps the next project choose, and it saves as you tick.
      </p>
      {(options.data?.length ?? 0) > 8 && (
        <label className={`mt-3 flex min-h-11 items-center gap-2 rounded-lg border px-3 ${dark ? "border-white/50 bg-white/5" : "border-[#1a472a]/60 bg-white"}`}>
          <Search className={`h-4 w-4 ${muted}`} aria-hidden="true" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Find a tool"
            aria-label="Find a tool"
            className={`w-full bg-transparent text-sm outline-none ${text} ${dark ? "placeholder:text-white/70" : "placeholder:text-[#1a472a]/70"}`}
          />
        </label>
      )}
      <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Tools your project uses">
        {list.map((t) => {
          const on = picked.has(t.id);
          return (
            <button
              key={t.id}
              type="button"
              aria-pressed={on}
              onClick={() => toggle(t.id)}
              className={`inline-flex min-h-11 items-center gap-1.5 rounded-full border-2 px-3 text-sm transition-colors ${
                on
                  ? "border-[#4a7c59] bg-[#7dd87d]/25 font-semibold " + text
                  : (dark ? "border-white/20 text-white/85 hover:border-[#7dd87d]/60" : "border-[#1a472a]/15 text-[#1a472a]/85 hover:border-[#4a7c59]/50")
              }`}
            >
              {on ? <Check className="h-4 w-4" aria-hidden="true" /> : <Plus className="h-4 w-4" aria-hidden="true" />}
              {t.name}
            </button>
          );
        })}
      </div>
      <p className={`mt-3 text-sm ${muted}`} aria-live="polite">
        {save.isPending ? "Saving…" : save.isError ? "Could not save that. Try again." : picked.size ? `${picked.size} picked.` : ""}{" "}
        Missing one? <a href="/tools/submit" target="_blank" rel="noopener noreferrer" className="underline">Add it to the library</a>.
      </p>
    </div>
  );
}
