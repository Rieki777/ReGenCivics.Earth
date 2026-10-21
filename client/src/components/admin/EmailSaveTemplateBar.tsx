/**
 * Save the current markdown letter as a reusable template, or download it as PDF.
 */

import { memo, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { usePersistFn } from "@/hooks/usePersistFn";
import { toast } from "sonner";
import { Download, Loader2, Save } from "lucide-react";
import {
  isApplicationMarkdownTemplateRow,
  isNewsletterEmailTemplateRow,
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
  kind?: string | null;
};

interface Props {
  subject: string;
  body: string;
  layout: LetterLayout;
  builtinTemplates: BuiltinTemplate[];
  currentKey: string;
  onSaved: (key: string) => void;
  kind?: "application" | "newsletter";
}

// The bar sits under a letter composer and takes the subject and body as
// props, so it renders on every keystroke there. The parts below do not
// depend on the letter: memoized with stable props, they skip those renders
// (a closed Radix Select still renders every item; STEERING.md section 13).

const TemplateToReplaceSelect = memo(function TemplateToReplaceSelect({
  value,
  options,
  onChange,
}: {
  value: string;
  options: Array<{ key: string; label: string }>;
  onChange: (key: string) => void;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-[#1a472a]">Template to replace</Label>
      <Select
        value={value}
        onValueChange={onChange}
      >
        <SelectTrigger className={EMAIL_FIELD_CLASS}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((opt) => (
            <SelectItem key={opt.key} value={opt.key}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
});

const NewTemplateNameField = memo(function NewTemplateNameField({
  value,
  onChange,
}: {
  value: string;
  onChange: (label: string) => void;
}) {
  return (
    <div className="space-y-1">
      <Label htmlFor="new-letter-name" className="text-[#1a472a]">New template name</Label>
      <Input
        id="new-letter-name"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Season 2 next steps"
        className={EMAIL_FIELD_CLASS}
      />
    </div>
  );
});

// The buttons take booleans and stable handlers, so a keystroke in the letter
// re-renders them and their icons only when a button turns on or off.
const SaveBarActions = memo(function SaveBarActions({
  saveDisabled,
  savePending,
  pdfDisabled,
  pdfPending,
  onSave,
  onPdf,
}: {
  saveDisabled: boolean;
  savePending: boolean;
  pdfDisabled: boolean;
  pdfPending: boolean;
  onSave: () => Promise<void>;
  onPdf: () => Promise<void>;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <Button
        type="button"
        size="sm"
        onClick={() => void onSave()}
        disabled={saveDisabled}
        className="bg-[#4a7c59] hover:bg-[#3d6849] text-white"
      >
        {savePending ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Save className="w-3.5 h-3.5 mr-1" />}
        Save template
      </Button>
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={() => void onPdf()}
        disabled={pdfDisabled}
        className="border-[#1a472a]/30 text-[#1a472a]"
      >
        {pdfPending ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Download className="w-3.5 h-3.5 mr-1" />}
        Download PDF
      </Button>
    </div>
  );
});

export function EmailSaveTemplateBar({
  subject,
  body,
  layout,
  builtinTemplates,
  currentKey,
  onSaved,
  kind = "application",
}: Props) {
  const utils = trpc.useUtils();
  const savedQuery = trpc.email.getCustomTemplates.useQuery();
  const save = trpc.email.saveCustomTemplate.useMutation();
  const pdf = trpc.email.renderPdf.useMutation();

  const savedLetters = useMemo(
    () =>
      (savedQuery.data ?? []).filter((row: SavedRow) =>
        kind === "newsletter" ? isNewsletterEmailTemplateRow(row) : isApplicationMarkdownTemplateRow(row),
      ),
    [savedQuery.data, kind],
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

  // Stable for the memoized buttons, and every call runs the closure of the
  // bar's newest render. The bar re-renders whenever the subject or body
  // changes, so a click saves (or prints) exactly the letter on screen.
  const handleSave = usePersistFn(async () => {
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
        const key = uniqueLetterKey(
          label,
          [
            ...builtinTemplates.map((t) => t.id),
            ...savedLetters.map((row) => row.templateKey),
          ],
          kind === "newsletter" ? "nl" : "letter",
        );
        await save.mutateAsync({
          templateKey: key,
          customSubject: subject,
          customBody: body,
          bodyFormat: "markdown",
          layout,
          label,
          isActive: 1,
          createOnly: true,
          kind,
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
        kind,
      });
      await utils.email.getCustomTemplates.invalidate();
      onSaved(targetKey);
      toast.success("Template saved. It will load from the template list.");
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Could not save the template.";
      toast.error(message);
    }
  });

  const handlePdf = usePersistFn(async () => {
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
  });

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
        <TemplateToReplaceSelect value={targetKey} options={existingOptions} onChange={setTargetKey} />
      ) : (
        <NewTemplateNameField value={newLabel} onChange={setNewLabel} />
      )}
      <SaveBarActions
        saveDisabled={save.isPending || !subject.trim() || !body.trim()}
        savePending={save.isPending}
        pdfDisabled={pdf.isPending || !body.trim()}
        pdfPending={pdf.isPending}
        onSave={handleSave}
        onPdf={handlePdf}
      />
    </div>
  );
}
