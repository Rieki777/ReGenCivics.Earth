/**
 * The Voice rules screen (Harvest Phase 3, build item 5): the transparency
 * surface for the learning loop. Learned rules list with weight and last-seen;
 * Rye can edit, demote, or delete any of them. The five hard publishing rules
 * render as immovable and supreme. Owner-gated (harvest.listRules is
 * ownerProcedure).
 */
import { useState } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Loader2, Lock, Trash2, Pencil, Check, X, ArrowDown } from "lucide-react";

const HARD_RULES = [
  "No em-dashes. Zero. Use a comma, a period, a colon, or rewrite.",
  "No contrast framing. Lead with the affirmative.",
  "No AI filler vocabulary (delve, leverage, seamless, robust, unlock, and the rest).",
  "No rhetorical-question openers. The brand framing question is the one exception.",
  "No passive inspiration. Say something specific.",
];

function RuleRow({ rule, onChanged }: {
  rule: { id: number; category: string; rule: string; weight: number; lastSeen: string | Date };
  onChanged: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(rule.rule);
  const update = trpc.harvest.updateRule.useMutation();
  const remove = trpc.harvest.deleteRule.useMutation();

  return (
    <div className="rounded-xl border border-[#4a7c59]/25 bg-white px-4 py-3 space-y-1.5">
      <div className="flex items-center gap-2 flex-wrap">
        <Badge variant="outline" className="text-[10px] border-[#4a7c59]/40 text-[#4a7c59]">{rule.category.replace("_", " ")}</Badge>
        <span className="text-[10px] text-[#1a472a]/75">weight {rule.weight.toFixed(2)} · last seen {new Date(rule.lastSeen).toLocaleDateString()}</span>
        <span className="flex-1" />
        {!editing && (
          <>
            <button title="Edit" className="text-[#1a472a]/75 hover:text-[#1a472a]" onClick={() => setEditing(true)}><Pencil className="w-3.5 h-3.5" /></button>
            <button title="Demote (halve the weight)" className="text-[#1a472a]/75 hover:text-amber-700" disabled={update.isPending}
              onClick={async () => { await update.mutateAsync({ ruleId: rule.id, weight: Math.max(0.1, rule.weight / 2) }); onChanged(); }}>
              <ArrowDown className="w-3.5 h-3.5" />
            </button>
            <button title="Delete" className="text-[#1a472a]/75 hover:text-red-700" disabled={remove.isPending}
              onClick={async () => { await remove.mutateAsync({ ruleId: rule.id }); onChanged(); }}>
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </>
        )}
      </div>
      {editing ? (
        <div className="flex gap-2 items-center">
          <input value={text} onChange={(e) => setText(e.target.value)} maxLength={400}
            className="flex-1 text-sm rounded-lg border border-[#4a7c59]/30 px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#7dd87d]" />
          <button className="text-[#4a7c59]" disabled={update.isPending}
            onClick={async () => {
              try {
                await update.mutateAsync({ ruleId: rule.id, rule: text });
                setEditing(false);
                onChanged();
              } catch {
                // Guardrail rejection: keep editing, the message shows below.
              }
            }}>
            <Check className="w-4 h-4" />
          </button>
          <button className="text-[#1a472a]/75" onClick={() => { setEditing(false); setText(rule.rule); }}><X className="w-4 h-4" /></button>
        </div>
      ) : (
        <p className="text-sm text-[#1a472a]">{rule.rule}</p>
      )}
      {update.isError && editing && <p className="text-xs text-red-700">{update.error.message}</p>}
    </div>
  );
}

export default function AdminVoiceRules() {
  const rules = trpc.harvest.listRules.useQuery(undefined, { retry: false, refetchOnWindowFocus: false });
  const utils = trpc.useUtils();
  const onChanged = () => void utils.harvest.listRules.invalidate();

  if (rules.isLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-[#f8f5f0]"><Loader2 className="w-6 h-6 animate-spin text-[#1a472a]" /></div>;
  }
  if (rules.isError || !rules.data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8f5f0] p-6 text-center">
        <div>
          <p className="text-[#1a472a] font-semibold">Voice rules belong to the owner.</p>
          <Link href="/admin" className="text-sm text-[#4a7c59] hover:underline">Back to admin</Link>
        </div>
      </div>
    );
  }
  const learned = rules.data.rules;

  return (
    <div className="min-h-screen bg-[#f8f5f0] pb-24">
      <div className="max-w-3xl mx-auto px-4 pt-6 space-y-6">
        <div>
          <Link href="/admin-create" className="text-xs text-[#4a7c59] hover:underline inline-flex items-center gap-1 mb-1"><ArrowLeft className="w-3 h-3" /> The Harvest</Link>
          <h1 className="text-2xl font-bold text-[#1a472a]">Voice rules</h1>
          <p className="text-xs text-[#1a472a]/75 mt-1">What the system has learned from your edits. Edit, demote, or delete anything. Rules decay unless your edits keep reinforcing them.</p>
        </div>

        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-[#1a472a]/75 uppercase tracking-wide flex items-center gap-1.5"><Lock className="w-3.5 h-3.5" /> Hard rules (immovable, always supreme)</h2>
          {HARD_RULES.map((rule) => (
            <div key={rule} className="rounded-xl bg-[#1a472a] text-white/90 px-4 py-2.5 text-sm flex items-center gap-2">
              <Lock className="w-3.5 h-3.5 text-[#7dd87d] flex-shrink-0" />{rule}
            </div>
          ))}
        </section>

        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-[#1a472a]/75 uppercase tracking-wide">Learned rules ({learned.length})</h2>
          {learned.length === 0 && (
            <p className="text-sm text-[#1a472a]/75">Nothing learned yet. Edit a draft on The Harvest, save it, and tap "mostly style" when the change was about how it sounds.</p>
          )}
          {learned.map((rule) => (
            <RuleRow key={(rule as { id: number }).id} rule={rule as { id: number; category: string; rule: string; weight: number; lastSeen: string | Date }} onChanged={onChanged} />
          ))}
        </section>
      </div>
    </div>
  );
}
