/**
 * "Your tools" on the Alliance Partner application (ADR-73): up to five tools
 * the partner brings, each a link and a sentence on what it does. When the
 * application is sent they join the ReGen Tools Library's review queue, and
 * approving the partner lists them on /tools.
 */
import { Button } from "@/components/ui/button";
import { LIGHT_CARD_FIELD } from "@/lib/fieldStyles";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, Wrench } from "lucide-react";
import { TickBox } from "@/components/TickBox";
import { MAX_DRAFT_TOOLS, TOOL_KINDS, toolProblems, type DraftTool } from "@shared/toolLibrary";

const field = `mt-1 min-h-11 ${LIGHT_CARD_FIELD}`;

export const EMPTY_TOOL: DraftTool = { name: "", url: "", description: "", kind: "software", isOpenSource: false };

export function DraftToolsEditor({
  tools,
  onChange,
  showProblems,
}: {
  tools: DraftTool[];
  onChange: (next: DraftTool[]) => void;
  /** Show each tool's missing pieces (after the person tries to send). */
  showProblems?: boolean;
}) {
  const update = (i: number, patch: Partial<DraftTool>) => onChange(tools.map((t, j) => (j === i ? { ...t, ...patch } : t)));
  const remove = (i: number) => onChange(tools.filter((_, j) => j !== i));

  return (
    <fieldset>
      <legend className="text-lg font-semibold text-[#1a472a]">Your tools</legend>
      <p className="text-sm text-[#1a472a]/75 mt-1">
        Optional. Add the tools you make or offer: an app, a physical tool, a method. Each needs a link and a sentence on what
        it does. When we approve your partnership they go into the <a href="/tools" className="underline">ReGen Tools Library</a> for
        land projects to find.
      </p>

      <div className="mt-3 space-y-4">
        {tools.map((tool, i) => {
          const problems = showProblems ? toolProblems(tool) : [];
          return (
            <div key={i} className="rounded-xl border border-[#1a472a]/15 bg-[#f8f5f0] p-4" data-testid="draft-tool">
              <div className="flex items-center justify-between gap-2">
                <p className="flex items-center gap-2 text-sm font-semibold text-[#1a472a]">
                  <Wrench className="h-4 w-4" aria-hidden="true" /> Tool {i + 1}
                </p>
                <Button type="button" variant="ghost" size="sm" className="min-h-11 text-[#1a472a]" onClick={() => remove(i)} aria-label={`Remove tool ${i + 1}`}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <div className="mt-2 grid gap-3 sm:grid-cols-2">
                <div>
                  <Label htmlFor={`tool-url-${i}`} className="text-[#1a472a]">Link</Label>
                  <Input id={`tool-url-${i}`} type="url" inputMode="url" value={tool.url} onChange={(e) => update(i, { url: e.target.value })} placeholder="https://yourtool.org" className={field} />
                </div>
                <div>
                  <Label htmlFor={`tool-name-${i}`} className="text-[#1a472a]">Name <span className="font-normal text-[#1a472a]/85">(optional)</span></Label>
                  <Input id={`tool-name-${i}`} value={tool.name} onChange={(e) => update(i, { name: e.target.value })} placeholder="We use the link's site name if blank" className={field} />
                </div>
              </div>
              <div className="mt-3">
                <Label htmlFor={`tool-desc-${i}`} className="text-[#1a472a]">What it does, and who it is for</Label>
                <Textarea id={`tool-desc-${i}`} value={tool.description} onChange={(e) => update(i, { description: e.target.value })} className={`${field} min-h-[80px]`} />
              </div>
              <div className="mt-3 flex flex-wrap gap-2" role="radiogroup" aria-label={`What kind of tool is tool ${i + 1}`}>
                {TOOL_KINDS.map((k) => (
                  <button
                    key={k.id}
                    type="button"
                    role="radio"
                    aria-checked={tool.kind === k.id}
                    title={k.hint}
                    onClick={() => update(i, { kind: k.id })}
                    className={`min-h-11 rounded-full border-2 px-3 text-sm transition-colors ${tool.kind === k.id ? "border-[#4a7c59] bg-[#7dd87d]/20 text-[#1a472a] font-semibold" : "border-[#1a472a]/15 text-[#1a472a]/80 hover:border-[#4a7c59]/50"}`}
                  >
                    {k.label}
                  </button>
                ))}
                <label className="ml-1 flex min-h-11 items-center gap-2 text-sm text-[#1a472a]">
                  <TickBox checked={tool.isOpenSource} onChange={(v) => update(i, { isOpenSource: v })} />
                  Open source
                </label>
              </div>
              {problems.length > 0 && (
                <p className="mt-2 text-sm font-medium text-[#8a3b12]" role="alert">This tool needs {problems.join(" and ")}.</p>
              )}
            </div>
          );
        })}
      </div>

      {tools.length < MAX_DRAFT_TOOLS && (
        <Button type="button" variant="outline" className="mt-3 min-h-11 border-[#4a7c59] text-[#1a472a] hover:bg-[#7dd87d]/15 hover:text-[#1a472a] dark:border-[#4a7c59] dark:bg-transparent dark:hover:bg-[#7dd87d]/15" onClick={() => onChange([...tools, { ...EMPTY_TOOL }])}>
          <Plus className="mr-2 h-4 w-4" /> {tools.length ? "Add another tool" : "Add a tool"}
        </Button>
      )}
    </fieldset>
  );
}
