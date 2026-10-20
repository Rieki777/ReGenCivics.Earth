/**
 * "Your tools" on the Alliance Partner application (ADR-73): up to five tools
 * the partner brings, each a link and a sentence on what it does. When the
 * application is sent they join the ReGen Tools Library's review queue, and
 * approving the partner lists them on /tools.
 */
import { memo, type ChangeEvent, type ComponentProps, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { LIGHT_CARD_FIELD } from "@/lib/fieldStyles";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, Wrench } from "lucide-react";
import { TickBox } from "@/components/TickBox";
import { usePersistFn } from "@/hooks/usePersistFn";
import { MAX_DRAFT_TOOLS, TOOL_KINDS, toolProblems, type DraftTool } from "@shared/toolLibrary";

const field = `mt-1 min-h-11 ${LIGHT_CARD_FIELD}`;

export const EMPTY_TOOL: DraftTool = { name: "", url: "", description: "", kind: "software", isOpenSource: false };

type UpdateTool = (i: number, patch: Partial<DraftTool>) => void;

// Every piece below is memoized on one tool's own values, and the editor hands
// them stable callbacks, so a keystroke re-renders the field being typed in
// and not the other fields or tools.

const StillLabel = memo(Label);

const NAME_LABEL = (
  <>
    Name <span className="font-normal text-[#1a472a]/85">(optional)</span>
  </>
);

const ToolHeader = memo(function ToolHeader({ index: i, onRemove }: { index: number; onRemove: (i: number) => void }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <p className="flex items-center gap-2 text-sm font-semibold text-[#1a472a]">
        <Wrench className="h-4 w-4" aria-hidden="true" /> Tool {i + 1}
      </p>
      <Button type="button" variant="ghost" size="sm" className="min-h-11 text-[#1a472a]" onClick={() => onRemove(i)} aria-label={`Remove tool ${i + 1}`}>
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
});

const ToolText = memo(function ToolText({
  index,
  name,
  id,
  label,
  value,
  onUpdate,
  multiline = false,
  wrapperClassName,
  ...inputProps
}: {
  index: number;
  name: "url" | "name" | "description";
  id: string;
  label: ReactNode;
  value: string;
  onUpdate: UpdateTool;
  multiline?: boolean;
  wrapperClassName?: string;
} & Pick<ComponentProps<"input">, "type" | "inputMode" | "placeholder" | "className">) {
  const onChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const patch: Partial<DraftTool> = {};
    patch[name] = e.target.value;
    onUpdate(index, patch);
  };
  return (
    <div className={wrapperClassName}>
      <StillLabel htmlFor={id} className="text-[#1a472a]">{label}</StillLabel>
      {multiline ? (
        <Textarea id={id} value={value} onChange={onChange} className={inputProps.className} />
      ) : (
        <Input id={id} value={value} onChange={onChange} {...inputProps} />
      )}
    </div>
  );
});

const ToolKind = memo(function ToolKind({
  index: i,
  kind,
  isOpenSource,
  onUpdate,
}: {
  index: number;
  kind: DraftTool["kind"];
  isOpenSource: boolean;
  onUpdate: UpdateTool;
}) {
  return (
    <div className="mt-3 flex flex-wrap gap-2" role="radiogroup" aria-label={`What kind of tool is tool ${i + 1}`}>
      {TOOL_KINDS.map((k) => (
        <button
          key={k.id}
          type="button"
          role="radio"
          aria-checked={kind === k.id}
          title={k.hint}
          onClick={() => onUpdate(i, { kind: k.id })}
          className={`min-h-11 rounded-full border-2 px-3 text-sm transition-colors ${kind === k.id ? "border-[#4a7c59] bg-[#7dd87d]/20 text-[#1a472a] font-semibold" : "border-[#1a472a]/15 text-[#1a472a]/80 hover:border-[#4a7c59]/50"}`}
        >
          {k.label}
        </button>
      ))}
      <label className="ml-1 flex min-h-11 items-center gap-2 text-sm text-[#1a472a]">
        <TickBox checked={isOpenSource} onChange={(v) => onUpdate(i, { isOpenSource: v })} />
        Open source
      </label>
    </div>
  );
});

const ToolCard = memo(function ToolCard({
  tool,
  index: i,
  showProblems,
  onUpdate,
  onRemove,
}: {
  tool: DraftTool;
  index: number;
  showProblems: boolean;
  onUpdate: UpdateTool;
  onRemove: (i: number) => void;
}) {
  const problems = showProblems ? toolProblems(tool) : [];
  return (
    <div className="rounded-xl border border-[#1a472a]/15 bg-[#f8f5f0] p-4" data-testid="draft-tool">
      <ToolHeader index={i} onRemove={onRemove} />
      <div className="mt-2 grid gap-3 sm:grid-cols-2">
        <ToolText index={i} name="url" id={`tool-url-${i}`} label="Link" type="url" inputMode="url" value={tool.url} onUpdate={onUpdate} placeholder="https://yourtool.org" className={field} />
        <ToolText index={i} name="name" id={`tool-name-${i}`} label={NAME_LABEL} value={tool.name} onUpdate={onUpdate} placeholder="We use the link's site name if blank" className={field} />
      </div>
      <ToolText index={i} name="description" id={`tool-desc-${i}`} label="What it does, and who it is for" value={tool.description} onUpdate={onUpdate} multiline wrapperClassName="mt-3" className={`${field} min-h-[80px]`} />
      <ToolKind index={i} kind={tool.kind} isOpenSource={tool.isOpenSource} onUpdate={onUpdate} />
      {problems.length > 0 && (
        <p className="mt-2 text-sm font-medium text-[#8a3b12]" role="alert">This tool needs {problems.join(" and ")}.</p>
      )}
    </div>
  );
});

const AddToolButton = memo(function AddToolButton({ hasTools, onAdd }: { hasTools: boolean; onAdd: () => void }) {
  return (
    <Button type="button" variant="outline" className="mt-3 min-h-11 border-[#4a7c59] text-[#1a472a] hover:bg-[#7dd87d]/15 hover:text-[#1a472a] dark:border-[#4a7c59] dark:bg-transparent dark:hover:bg-[#7dd87d]/15" onClick={onAdd}>
      <Plus className="mr-2 h-4 w-4" /> {hasTools ? "Add another tool" : "Add a tool"}
    </Button>
  );
});

export const DraftToolsEditor = memo(function DraftToolsEditor({
  tools,
  onChange,
  showProblems,
}: {
  tools: DraftTool[];
  onChange: (next: DraftTool[]) => void;
  /** Show each tool's missing pieces (after the person tries to send). */
  showProblems?: boolean;
}) {
  const update = usePersistFn((i: number, patch: Partial<DraftTool>) => onChange(tools.map((t, j) => (j === i ? { ...t, ...patch } : t))));
  const remove = usePersistFn((i: number) => onChange(tools.filter((_, j) => j !== i)));
  const add = usePersistFn(() => onChange([...tools, { ...EMPTY_TOOL }]));

  return (
    <fieldset>
      <legend className="text-lg font-semibold text-[#1a472a]">Your tools</legend>
      <p className="text-sm text-[#1a472a]/75 mt-1">
        Optional. Add the tools you make or offer: an app, a physical tool, a method. Each needs a link and a sentence on what
        it does. When we approve your partnership they go into the <a href="/tools" className="underline">ReGen Tools Library</a> for
        land projects to find.
      </p>

      <div className="mt-3 space-y-4">
        {tools.map((tool, i) => (
          <ToolCard key={i} tool={tool} index={i} showProblems={!!showProblems} onUpdate={update} onRemove={remove} />
        ))}
      </div>

      {tools.length < MAX_DRAFT_TOOLS && <AddToolButton hasTools={tools.length > 0} onAdd={add} />}
    </fieldset>
  );
});
