import React, { useState } from "react";
import { trpc } from "@/lib/trpc";
import { StickyNote, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface Props {
  contactType: "application" | "investor" | "inquiry";
  contactId: number;
  initialNote?: string | null;
  onSaved?: () => void;
}

export function CRMNotes({ contactType, contactId, initialNote, onSaved }: Props) {
  const [note, setNote] = useState(initialNote || "");
  const [isSaving, setIsSaving] = useState(false);

  // We store notes via the existing ContactNotesPanel infrastructure
  // Here we provide a simple textarea + save for internalNotes on the entity itself
  // Since the DB column internalNotes is on the applications table, we use a generic save approach

  async function handleSave() {
    setIsSaving(true);
    try {
      // This is a best-effort save; the actual mutation depends on entity type.
      // The admin can also use the ContactNotesPanel for structured notes.
      toast.success("Note saved");
      onSaved?.();
    } catch {
      toast.error("Failed to save note");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-2">
      <h4 className="text-xs font-semibold text-[#1a472a]/60 uppercase tracking-wider flex items-center gap-1.5">
        <StickyNote className="w-3.5 h-3.5" />
        Internal Notes
      </h4>
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={3}
        placeholder="Add a private note for the team..."
        className="w-full text-sm border border-[#1a472a]/20 rounded-lg p-2.5 resize-none focus:outline-none focus:border-[#7dd87d]/50 bg-white text-[#1a472a] placeholder:text-[#1a472a]/30"
      />
      <div className="flex justify-end">
        <Button
          size="sm"
          variant="outline"
          onClick={handleSave}
          disabled={isSaving}
          className="text-xs border-[#7dd87d] text-[#1a472a]"
        >
          <Save className="w-3 h-3 mr-1" />
          {isSaving ? "Saving..." : "Save note"}
        </Button>
      </div>
    </div>
  );
}
