/**
 * C9: Knowledge Map Admin Panel
 * Lets admins curate pinned knowledge-map entries per forum category.
 * AI can suggest entries; admin approves or deletes them.
 */
import { useState } from "react";
import { BookOpen, Plus, Trash2, Check, Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

const fieldClass =
  "bg-white text-[#1a472a] placeholder:text-[#1a472a]/75 border-[#1a472a]/25 text-sm";

export default function KnowledgeMapAdminPanel() {
  const utils = trpc.useUtils();

  const { data: allEntries = [], isLoading } = trpc.knowledgeMap.listAll.useQuery();
  const { data: pending = [] } = trpc.knowledgeMap.pendingSuggestions.useQuery();
  const { data: categories = [] } = trpc.forum.categories.useQuery();

  const approveMut = trpc.knowledgeMap.approve.useMutation({
    onSuccess: () => { utils.knowledgeMap.listAll.invalidate(); utils.knowledgeMap.pendingSuggestions.invalidate(); toast.success("Entry approved"); },
  });
  const deleteMut = trpc.knowledgeMap.delete.useMutation({
    onSuccess: () => { utils.knowledgeMap.listAll.invalidate(); utils.knowledgeMap.pendingSuggestions.invalidate(); toast.success("Entry deleted"); },
  });
  const addMut = trpc.knowledgeMap.add.useMutation({
    onSuccess: () => { utils.knowledgeMap.listAll.invalidate(); setForm({ categoryId: 0, title: "", summary: "", postId: "", url: "" }); toast.success("Entry added"); },
  });
  const suggestMut = trpc.knowledgeMap.suggestFromAI.useMutation({
    onSuccess: (data) => { utils.knowledgeMap.pendingSuggestions.invalidate(); toast.success(`AI suggested ${data.suggested} entr${data.suggested === 1 ? "y" : "ies"}`); },
    onError: () => toast.error("AI suggestion failed"),
  });

  const [form, setForm] = useState({ categoryId: 0, title: "", summary: "", postId: "", url: "" });
  const [suggestCatId, setSuggestCatId] = useState<number>(0);

  const approved = allEntries.filter(e => e.approvedAt !== null && e.suggestedByAI === 0);
  const pendingApproval = pending;

  function handleAdd() {
    if (!form.categoryId || !form.title.trim()) { toast.error("Category and title are required"); return; }
    addMut.mutate({
      categoryId: form.categoryId,
      title: form.title.trim(),
      summary: form.summary.trim() || undefined,
      postId: form.postId ? Number(form.postId) : undefined,
      url: form.url.trim() || undefined,
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <BookOpen className="w-5 h-5 text-[#1a472a]" />
        <h3 className="text-lg font-semibold text-[#1a472a]">Knowledge Map</h3>
        <span className="text-xs text-[#1a472a]/75 ml-1">Curated entry points per forum category</span>
      </div>

      <div className="bg-white border border-[#1a472a]/15 rounded-xl p-4 space-y-3">
        <p className="text-sm font-medium text-[#1a472a] flex items-center gap-1.5">
          <Sparkles className="w-4 h-4 text-[#4a7c59]" />
          Ask Claude to suggest entries
        </p>
        <div className="flex gap-2">
          <select
            value={suggestCatId}
            onChange={e => setSuggestCatId(Number(e.target.value))}
            className="flex-1 bg-white border border-[#1a472a]/25 text-[#1a472a] text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-[#1a472a]"
          >
            <option value={0}>Select category…</option>
            {categories.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <Button
            size="sm"
            disabled={!suggestCatId || suggestMut.isPending}
            onClick={() => {
              const cat = categories.find(c => c.id === suggestCatId);
              if (!cat) return;
              suggestMut.mutate({ categoryId: cat.id, categoryName: cat.name });
            }}
            className="bg-[#1a472a] hover:bg-[#2d5a3d] text-[#f8f5f0]"
          >
            {suggestMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Suggest"}
          </Button>
        </div>
      </div>

      {pendingApproval.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-[#6b3f12] font-semibold uppercase tracking-wider">
            Pending AI suggestions ({pendingApproval.length})
          </p>
          {pendingApproval.map(entry => (
            <div key={entry.id} className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-lg p-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm text-[#1a472a] font-medium">{entry.title}</p>
                {entry.summary && <p className="text-xs text-[#1a472a]/75 mt-0.5">{entry.summary}</p>}
                <p className="text-xs text-[#1a472a]/75 mt-1">
                  {entry.postId ? `Post #${entry.postId}` : entry.url ?? "No link"}
                  {" · "}Cat #{entry.categoryId}
                </p>
              </div>
              <div className="flex gap-1.5 flex-shrink-0">
                <button
                  onClick={() => approveMut.mutate({ id: entry.id })}
                  className="p-1.5 rounded-md bg-[#1a472a]/10 hover:bg-[#1a472a] text-[#1a472a] hover:text-[#f8f5f0] transition-colors"
                  title="Approve"
                >
                  <Check className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => deleteMut.mutate({ id: entry.id })}
                  className="p-1.5 rounded-md bg-red-50 hover:bg-red-100 text-red-700 transition-colors"
                  title="Delete"
                  aria-label="Delete entry"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="bg-white border border-[#1a472a]/15 rounded-xl p-4 space-y-3">
        <p className="text-sm font-medium text-[#1a472a] flex items-center gap-1.5">
          <Plus className="w-4 h-4 text-[#4a7c59]" />
          Add entry manually
        </p>
        <div className="grid grid-cols-2 gap-2">
          <select
            value={form.categoryId}
            onChange={e => setForm(f => ({ ...f, categoryId: Number(e.target.value) }))}
            className="col-span-2 bg-white border border-[#1a472a]/25 text-[#1a472a] text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-[#1a472a]"
          >
            <option value={0}>Select category…</option>
            {categories.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <Input
            placeholder="Title"
            value={form.title}
            onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            className={`col-span-2 ${fieldClass}`}
          />
          <Textarea
            placeholder="Short summary (optional)"
            value={form.summary}
            onChange={e => setForm(f => ({ ...f, summary: e.target.value }))}
            rows={2}
            className={`col-span-2 ${fieldClass} resize-none`}
          />
          <Input
            placeholder="Post ID (if forum post)"
            value={form.postId}
            onChange={e => setForm(f => ({ ...f, postId: e.target.value }))}
            className={fieldClass}
          />
          <Input
            placeholder="URL (if external)"
            value={form.url}
            onChange={e => setForm(f => ({ ...f, url: e.target.value }))}
            className={fieldClass}
          />
        </div>
        <Button
          size="sm"
          disabled={addMut.isPending}
          onClick={handleAdd}
          className="bg-[#1a472a] hover:bg-[#2d5a3d] text-[#f8f5f0]"
        >
          {addMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Add Entry"}
        </Button>
      </div>

      <div className="space-y-2">
        <p className="text-xs text-[#1a472a]/80 font-semibold uppercase tracking-wider">
          Approved entries ({approved.length})
        </p>
        {isLoading && <p className="text-sm text-[#1a472a]/75">Loading…</p>}
        {!isLoading && approved.length === 0 && (
          <p className="text-sm text-[#1a472a]/75">No entries yet. Use AI or add manually.</p>
        )}
        {approved.map(entry => (
          <div key={entry.id} className="flex items-start gap-3 bg-white border border-[#1a472a]/15 rounded-lg p-3">
            <div className="flex-1 min-w-0">
              <p className="text-sm text-[#1a472a] font-medium">{entry.title}</p>
              {entry.summary && <p className="text-xs text-[#1a472a]/75 mt-0.5">{entry.summary}</p>}
              <p className="text-xs text-[#1a472a]/75 mt-1">
                {entry.postId ? `Post #${entry.postId}` : entry.url ?? "-"}
                {" · "}Cat #{entry.categoryId}
                {" · "}Order {entry.sortOrder}
              </p>
            </div>
            <button
              onClick={() => deleteMut.mutate({ id: entry.id })}
              className="p-1.5 rounded-md hover:bg-red-50 text-[#1a472a]/70 hover:text-red-700 transition-colors flex-shrink-0"
              title="Remove"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
