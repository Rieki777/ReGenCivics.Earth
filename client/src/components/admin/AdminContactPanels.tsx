import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MessageSquare, Trash2, Clock, UserCheck, Tag, Loader2, Plus, X } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export function ContactNotesPanel({ contactType, contactId }: { contactType: string; contactId: number }) {
  const [newNote, setNewNote] = useState('');
  const utils = trpc.useUtils();

  const { data: notes, isLoading } = trpc.contactNotes.list.useQuery({ contactType, contactId });
  const createNote = trpc.contactNotes.create.useMutation({
    onSuccess: () => {
      utils.contactNotes.list.invalidate({ contactType, contactId });
      setNewNote('');
      toast.success('Note saved');
    },
    onError: (e: any) => toast.error(e.message),
  });
  const deleteNote = trpc.contactNotes.delete.useMutation({
    onSuccess: () => utils.contactNotes.list.invalidate({ contactType, contactId }),
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="border-t border-[#1a472a]/10 pt-4 space-y-3">
      <p className="text-xs font-semibold text-[#1a472a]/80 uppercase tracking-wide flex items-center gap-1.5">
        <MessageSquare className="w-3.5 h-3.5" />
        Internal Notes {notes?.length ? `(${notes.length})` : ''}
      </p>
      {isLoading && <p className="text-xs text-[#1a472a]/75">Loading…</p>}
      {notes?.map((note: any) => (
        <div key={note.id} className="flex items-start gap-2 p-2.5 rounded-lg bg-amber-50 border border-amber-200">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-[#1a472a] whitespace-pre-wrap">{note.note}</p>
            <p className="text-xs text-[#1a472a]/75 mt-1">
              {note.authorName} · {new Date(note.createdAt).toLocaleString()}
            </p>
          </div>
          <button
            onClick={() => deleteNote.mutate({ id: note.id })}
            className="text-red-400 hover:text-red-600 flex-shrink-0 mt-0.5"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      ))}
      <div className="flex gap-2">
        <Textarea
          value={newNote}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNewNote(e.target.value)}
          placeholder="Add an internal note (visible to admin team only)…"
          className="min-h-[60px] text-xs bg-white flex-1 resize-none"
        />
        <Button
          size="sm"
          onClick={() => createNote.mutate({ contactType, contactId, note: newNote })}
          disabled={!newNote.trim() || createNote.isPending}
          className="self-end bg-[#1a472a] hover:bg-[#2d5a3d]"
        >
          {createNote.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
        </Button>
      </div>
    </div>
  );
}

// ─── Reminder Panel ───────────────────────────────────────────────────────────
export function ReminderPanel({ contactType, contactId }: { contactType: string; contactId: number }) {
  const [date, setDate] = useState('');
  const [msg, setMsg] = useState('');
  const utils = trpc.useUtils();

  const { data: notes } = trpc.contactNotes.list.useQuery({ contactType, contactId });
  const createNote = trpc.contactNotes.create.useMutation({
    onSuccess: () => {
      utils.contactNotes.list.invalidate({ contactType, contactId });
      setDate(''); setMsg('');
      toast.success('Reminder set');
    },
    onError: (e: any) => toast.error(e.message),
  });
  const deleteNote = trpc.contactNotes.delete.useMutation({
    onSuccess: () => utils.contactNotes.list.invalidate({ contactType, contactId }),
  });

  const reminders = (notes || []).filter((n: any) => n.note.startsWith('⏰ Reminder'));

  const handleSet = () => {
    if (!date) return;
    const text = `⏰ Reminder [${date}]: ${msg || 'Follow up'}`;
    createNote.mutate({ contactType, contactId, note: text });
  };

  return (
    <div className="border-t border-[#1a472a]/10 pt-4 space-y-2">
      <p className="text-xs font-semibold text-[#1a472a]/80 uppercase tracking-wide flex items-center gap-1.5">
        <Clock className="w-3.5 h-3.5" />
        Reminders {reminders.length > 0 ? `(${reminders.length})` : ''}
      </p>
      {reminders.map((r: any) => (
        <div key={r.id} className="flex items-center gap-2 p-2 bg-orange-50 border border-orange-200 rounded-lg text-xs">
          <span className="flex-1 text-orange-800">{r.note}</span>
          <button onClick={() => deleteNote.mutate({ id: r.id })} className="text-orange-400 hover:text-red-500">
            <X className="w-3 h-3" />
          </button>
        </div>
      ))}
      <div className="flex gap-2">
        <Input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="h-7 text-xs bg-white w-36"
        />
        <Input
          value={msg}
          onChange={(e) => setMsg(e.target.value)}
          placeholder="Reminder note…"
          className="h-7 text-xs bg-white flex-1"
          onKeyDown={(e) => { if (e.key === 'Enter') handleSet(); }}
        />
        <Button
          size="sm"
          onClick={handleSet}
          disabled={!date || createNote.isPending}
          className="h-7 bg-[#1a472a] hover:bg-[#2d5a3d]"
        >
          <Plus className="w-3 h-3" />
        </Button>
      </div>
    </div>
  );
}

// ─── Assignee Select ──────────────────────────────────────────────────────────
const TEAM_MEMBERS = ['Rieki', 'Alice', 'Bob', 'Carlos', 'Dana', 'Evan'];

export function AssigneeSelect({ contactType, contactId }: { contactType: string; contactId: number }) {
  const utils = trpc.useUtils();
  const { data: tags } = trpc.contactTags.list.useQuery({ contactType, contactId });
  const addTag = trpc.contactTags.add.useMutation({
    onSuccess: () => utils.contactTags.list.invalidate({ contactType, contactId }),
  });
  const removeTag = trpc.contactTags.remove.useMutation({
    onSuccess: () => utils.contactTags.list.invalidate({ contactType, contactId }),
  });

  const assigneeTag = tags?.find((t: any) => t.tag.startsWith('assignee:'));
  const currentAssignee = assigneeTag?.tag?.replace('assignee:', '') || '';

  const handleChange = (value: string) => {
    if (assigneeTag) removeTag.mutate({ id: assigneeTag.id });
    if (value && value !== 'unassigned') {
      addTag.mutate({ contactType, contactId, tag: `assignee:${value}` });
    }
  };

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-[#1a472a]/80 shrink-0">Assigned to:</span>
      <Select value={currentAssignee || 'unassigned'} onValueChange={handleChange}>
        <SelectTrigger className="min-h-11 text-xs flex-1 max-w-[160px]">
          <SelectValue placeholder="Unassigned" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="unassigned">Unassigned</SelectItem>
          {TEAM_MEMBERS.map(m => (
            <SelectItem key={m} value={m}>{m}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

// ─── Contact Tags Panel ────────────────────────────────────────────────────────
const PRESET_TAGS = ['hot-lead', 'vip', 'follow-up', 'do-not-contact', 'season-3', 'needs-call', 'investor-ready', 'land-project'];

export function ContactTagsPanel({ contactType, contactId }: { contactType: string; contactId: number }) {
  const [input, setInput] = useState('');
  const utils = trpc.useUtils();

  const { data: tags } = trpc.contactTags.list.useQuery({ contactType, contactId });
  const addTag = trpc.contactTags.add.useMutation({
    onSuccess: () => {
      utils.contactTags.list.invalidate({ contactType, contactId });
      setInput('');
    },
    onError: (e: any) => toast.error(e.message),
  });
  const removeTag = trpc.contactTags.remove.useMutation({
    onSuccess: () => utils.contactTags.list.invalidate({ contactType, contactId }),
    onError: (e: any) => toast.error(e.message),
  });

  const existingTagNames = new Set(tags?.map((t: any) => t.tag) || []);

  const handleAdd = (tag: string) => {
    const trimmed = tag.trim().toLowerCase();
    if (!trimmed || existingTagNames.has(trimmed)) return;
    addTag.mutate({ contactType, contactId, tag: trimmed });
  };

  return (
    <div className="border-t border-[#1a472a]/10 pt-4 space-y-2">
      <p className="text-xs font-semibold text-[#1a472a]/80 uppercase tracking-wide">Tags</p>
      <div className="flex flex-wrap gap-1.5">
        {tags?.map((t: any) => (
          <span
            key={t.id}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#7dd87d]/20 border border-[#4a7c59]/30 text-xs text-[#1a472a]"
          >
            {t.tag}
            <button onClick={() => removeTag.mutate({ id: t.id })} className="text-[#1a472a]/75 hover:text-red-500">
              <X className="w-2.5 h-2.5" />
            </button>
          </span>
        ))}
      </div>
      <div className="flex gap-1 flex-wrap">
        {PRESET_TAGS.filter(pt => !existingTagNames.has(pt)).slice(0, 6).map(pt => (
          <button
            key={pt}
            type="button"
            onClick={() => handleAdd(pt)}
            className="px-2 py-0.5 text-xs rounded-full bg-gray-100 hover:bg-[#7dd87d]/20 border border-gray-200 text-gray-600 hover:text-[#1a472a] transition-colors"
          >
            + {pt}
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAdd(input); } }}
          placeholder="Add custom tag…"
          className="h-7 text-xs bg-white flex-1"
        />
        <Button
          size="sm"
          onClick={() => handleAdd(input)}
          disabled={!input.trim() || addTag.isPending}
          className="h-7 bg-[#1a472a] hover:bg-[#2d5a3d]"
        >
          <Plus className="w-3 h-3" />
        </Button>
      </div>
    </div>
  );
}
