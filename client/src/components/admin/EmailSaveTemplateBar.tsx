/**
 * Save the current markdown letter as a reusable template, or download it as PDF.
 */

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Download, Loader2, Save } from "lucide-react";
import {
  isMarkdownEmailTemplateRow,
  uniqueLetterKey,
  type LetterLayout,
} from "@shared/letterLayout";
import { EMAIL_FIELD_CLASS } from "@/components/admin/EmailMarkdownComposer";

type BuiltinTemplate = { id: string; label: string };

type SavedRow = {
  templateKey: string;
  customSubject?: string | null;
  customBody?: string | null;
  bodyFormat?: string | null;
  layout?: string | null;
  label?: string | null;
};

interface Props {
  subject: string;
  body: string;
  layout: LetterLayout;
  builtinTemplates: BuiltinTemplate[];
  currentKey: string;
  onSaved: (key: string) => void;
}

export function EmailSaveTemplateBar({
  subject,
  body,
  layout,
  builtinTemplates,
  currentKey,
  onSaved,
}: Props) {
  const utils = trpc.useUtils();
  const savedQuery = trpc.email.getCustomTemplates.useQuery();
  const save = trpc.email.saveCustomTemplate.useMutation();
  const pdf = trpc.email.renderPdf.useMutation();

  const savedLetters = useMemo(
    () => (savedQuery.data ?? []).filter((row: SavedRow) => isMarkdownEmailTemplateRow(row)),
    [savedQuery.data],
  );

  const [mode, setMode] = useState<"existing" | "new">("existing");
  const [targetKey, setTargetKey] = useState(currentKey);
  const [newLabel, setNewLabel] = useState("");

  useEffect(() => {
    setTargetKey(currentKey);
  }, [currentKey]);

  const existingOptions = useMemo(() => {
    const seen = new Set<string>();
    const options: Array<{ key: string; label: string }> = [];
    for (const tpl of builtinTemplates) {
      seen.add(tpl.id);
      const overlay = savedLetters.find((row) => row.templateKey === tpl.id);
      options.push({
        key: tpl.id,
        label: overlay?.label ? `${tpl.label} (saved)` : tpl.label,
      });
    }
    for (const row of savedLetters) {
      if (seen.has(row.templateKey)) continue;
      options.push({
        key: row.templateKey,
        label: row.label || row.templateKey,
      });
    }
    return options;
  }, [builtinTemplates, savedLetters]);

  const handleSave = async () => {
    if (!subject.trim() || !body.trim()) {
      toast.error("Write a subject and body before saving a template.");
      return;
    }
    try {
      if (mode === "new") {
        const label = newLabel.trim();
        if (!label) {
          toast.error("Name the new template.");
          return;
        }
        const key = uniqueLetterKey(label, [
          ...builtinTemplates.map((t) => t.id),
          ...savedLetters.map((row) => row.templateKey),
        ]);
        await save.mutateAsync({
          templateKey: key,
          customSubject: subject,
          customBody: body,
          bodyFormat: "markdown",
          layout,
          label,
          isActive: 1,
          createOnly: true,
        });
        await utils.email.getCustomTemplates.invalidate();
        onSaved(key);
        toast.success(`Saved as ${label}.`);
        return;
      }

      const option = existingOptions.find((o) => o.key === targetKey);
      const builtin = builtinTemplates.find((t) => t.id === targetKey);
      await save.mutateAsync({
        templateKey: targetKey,
        customSubject: subject,
        customBody: body,
        bodyFormat: "markdown",
        layout,
        label: option?.label.replace(/ \(saved\)$/, "") || builtin?.label || targetKey,
        isActive: 1,
      });
      await utils.email.getCustomTemplates.invalidate();
      onSaved(targetKey);
      toast.success("Template saved. It will load from the template list.");
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Could not save the template.";
      toast.error(message);
    }
  };

  const handlePdf = async () => {
    if (!body.trim()) {
      toast.error("Write a body before downloading a PDF.");
      return;
    }
    try {
      const result = await pdf.mutateAsync({ subject, body, layout });
      const binary = atob(result.pdfBase64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      const blob = new Blob([bytes], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = result.filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Could not build the PDF.";
      toast.error(message);
    }
  };

  return (
    <div className="space-y-2 rounded-md border border-[#4a7c59]/20 bg-[#f8faf8] p-3 apply-form-dark">
      <p className="text-sm font-semibold text-[#1a472a]">Keep this letter</p>
      <p className="text-xs text-[#1a472a]/75">
        Save the draft as a template you can pick again, or download a PDF of the same layout.
      </p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setMode("existing")}
          className={`text-xs px-2 py-1 rounded-full border pointer-coarse:min-h-11 ${
            mode === "existing"
              ? "bg-[#1a472a] text-white border-[#1a472a]"
              : "bg-white text-[#1a472a] border-[#4a7c59]/30"
          }`}
        >
          Replace an existing template
        </button>
        <button
          type="button"
          onClick={() => setMode("new")}
          className={`text-xs px-2 py-1 rounded-full border pointer-coarse:min-h-11 ${
            mode === "new"
              ? "bg-[#1a472a] text-white border-[#1a472a]"
              : "bg-white text-[#1a472a] border-[#4a7c59]/30"
          }`}
        >
          Save as a new template
        </button>
      </div>
      {mode === "existing" ? (
        <div className="space-y-1">
          <Label className="text-[#1a472a]">Template to replace</Label>
          <Select
            value={targetKey}
            onValueChange={setTargetKey}
          >
            <SelectTrigger className={EMAIL_FIELD_CLASS}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {existingOptions.map((opt) => (
                <SelectItem key={opt.key} value={opt.key}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : (
        <div className="space-y-1">
          <Label htmlFor="new-letter-name" className="text-[#1a472a]">New template name</Label>
          <Input
            id="new-letter-name"
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            placeholder="Season 2 next steps"
            className={EMAIL_FIELD_CLASS}
          />
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          onClick={() => void handleSave()}
          disabled={save.isPending || !subject.trim() || !body.trim()}
          className="bg-[#4a7c59] hover:bg-[#3d6849] text-white"
        >
          {save.isPending ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Save className="w-3.5 h-3.5 mr-1" />}
          Save template
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => void handlePdf()}
          disabled={pdf.isPending || !body.trim()}
          className="border-[#1a472a]/30 text-[#1a472a]"
        >
          {pdf.isPending ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Download className="w-3.5 h-3.5 mr-1" />}
          Download PDF
        </Button>
      </div>
    </div>
  );
}
