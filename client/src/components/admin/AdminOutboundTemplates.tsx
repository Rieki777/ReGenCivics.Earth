/**
 * Outbound Templates tab: list / create / edit / delete newsletter letter templates.
 * Persists via emailTemplates (kind=newsletter, bodyFormat=markdown).
 */
import { useMemo, useState } from "react";
import { FileText, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  isLetterLayout,
  isNewsletterEmailTemplateRow,
  uniqueLetterKey,
  type LetterLayout,
} from "@shared/letterLayout";

type TemplateRow = {
  templateKey: string;
  customSubject?: string | null;
  customBody?: string | null;
  bodyFormat?: string | null;
  layout?: string | null;
  label?: string | null;
  kind?: string | null;
  updatedAt?: string | Date | null;
};

type EditorMode = "create" | "edit";

const EMPTY_DRAFT = {
  label: "",
  customSubject: "",
  customBody: "",
  layout: "announcement" as LetterLayout,
};

export function AdminOutboundTemplates() {
  const utils = trpc.useUtils();
  const savedQuery = trpc.email.getCustomTemplates.useQuery();
  const save = trpc.email.saveCustomTemplate.useMutation();
  const remove = trpc.email.deleteCustomTemplate.useMutation();

  const letters = useMemo(
    () => (savedQuery.data ?? []).filter((row: TemplateRow) => isNewsletterEmailTemplateRow(row)),
    [savedQuery.data],
  );

  const [editorOpen, setEditorOpen] = useState(false);
  const [editorMode, setEditorMode] = useState<EditorMode>("create");
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [draft, setDraft] = useState(EMPTY_DRAFT);
  const [deleteKey, setDeleteKey] = useState<string | null>(null);

  function openCreate() {
    setEditorMode("create");
    setEditingKey(null);
    setDraft(EMPTY_DRAFT);
    setEditorOpen(true);
  }

  function openEdit(row: TemplateRow) {
    setEditorMode("edit");
    setEditingKey(row.templateKey);
    setDraft({
      label: row.label || row.templateKey,
      customSubject: row.customSubject || "",
      customBody: row.customBody || "",
      layout: isLetterLayout(row.layout) ? row.layout : "announcement",
    });
    setEditorOpen(true);
  }

  async function handleSave() {
    const label = draft.label.trim();
    const subject = draft.customSubject.trim();
    const body = draft.customBody.trim();
    if (!label) {
      toast.error("Name the template.");
      return;
    }
    if (!subject || !body) {
      toast.error("Subject and body are required.");
      return;
    }

    try {
      if (editorMode === "create") {
        const key = uniqueLetterKey(
          label,
          letters.map((row) => row.templateKey),
          "nl",
        );
        await save.mutateAsync({
          templateKey: key,
          customSubject: subject,
          customBody: body,
          bodyFormat: "markdown",
          layout: draft.layout,
          label,
          isActive: 1,
          createOnly: true,
          kind: "newsletter",
        });
        toast.success(`Created “${label}”.`);
      } else if (editingKey) {
        await save.mutateAsync({
          templateKey: editingKey,
          customSubject: subject,
          customBody: body,
          bodyFormat: "markdown",
          layout: draft.layout,
          label,
          isActive: 1,
          kind: "newsletter",
        });
        toast.success(`Updated “${label}”.`);
      }
      await utils.email.getCustomTemplates.invalidate();
      setEditorOpen(false);
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Could not save the template.");
    }
  }

  async function handleDelete() {
    if (!deleteKey) return;
    try {
      await remove.mutateAsync({ templateKey: deleteKey });
      await utils.email.getCustomTemplates.invalidate();
      toast.success("Template deleted.");
      setDeleteKey(null);
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Could not delete the template.");
    }
  }

  const deleteLabel =
    letters.find((row) => row.templateKey === deleteKey)?.label || deleteKey || "this template";

  return (
    <>
      <Card className="bg-white border-2 border-[#1a472a]/10">
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle
                className="text-[#1a472a] flex items-center gap-2"
                style={{ fontFamily: "var(--font-display)" }}
              >
                <FileText className="w-5 h-5" />
                Newsletter templates
              </CardTitle>
              <CardDescription>
                Saved Outbound letters: full markdown layouts with CTA buttons and images. Create,
                edit, or delete here — or save from Write.
              </CardDescription>
            </div>
            <Button
              type="button"
              className="bg-[#1a472a] hover:bg-[#2d5a3d] text-white"
              onClick={openCreate}
              data-testid="templates-create"
            >
              <Plus className="w-4 h-4 mr-2" />
              New template
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {savedQuery.isLoading ? (
            <Loader2 className="w-6 h-6 animate-spin text-[#7dd87d]" />
          ) : letters.length === 0 ? (
            <p className="text-sm text-[#1a472a]/80">
              No newsletter templates yet. Create one here or save a letter from Write.
            </p>
          ) : (
            <ul className="space-y-2" data-testid="templates-list">
              {letters.map((row) => (
                <li
                  key={row.templateKey}
                  className="rounded-lg border border-[#1a472a]/10 p-3 flex flex-wrap items-start justify-between gap-3"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-[#1a472a]">{row.label || row.templateKey}</p>
                    <p className="text-xs text-[#1a472a]/70 truncate">
                      {row.customSubject || "No subject"}
                    </p>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      <Badge variant="outline" className="text-xs capitalize">
                        {isLetterLayout(row.layout) ? row.layout.replace("_", " ") : "announcement"}
                      </Badge>
                      <Badge variant="outline" className="text-xs font-mono">
                        {row.templateKey}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 shrink-0">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="border-[#1a472a]/30 text-[#1a472a]"
                      onClick={() => openEdit(row)}
                      data-testid={`templates-edit-${row.templateKey}`}
                    >
                      <Pencil className="w-3.5 h-3.5 mr-1" />
                      Edit
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="border-red-300 text-red-700 hover:bg-red-50"
                      onClick={() => setDeleteKey(row.templateKey)}
                      data-testid={`templates-delete-${row.templateKey}`}
                    >
                      <Trash2 className="w-3.5 h-3.5 mr-1" />
                      Delete
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogContent className="bg-white max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-[#1a472a]">
              {editorMode === "create" ? "New newsletter template" : "Edit newsletter template"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="tpl-label" className="text-[#1a472a]">
                Name
              </Label>
              <Input
                id="tpl-label"
                value={draft.label}
                onChange={(e) => setDraft((d) => ({ ...d, label: e.target.value }))}
                placeholder="Season 2 welcome"
                className="bg-white border-[#1a472a]/20"
                data-testid="templates-editor-label"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="tpl-subject" className="text-[#1a472a]">
                Subject
              </Label>
              <Input
                id="tpl-subject"
                value={draft.customSubject}
                onChange={(e) => setDraft((d) => ({ ...d, customSubject: e.target.value }))}
                placeholder="A note from ReGen Civics"
                className="bg-white border-[#1a472a]/20"
                data-testid="templates-editor-subject"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="tpl-layout" className="text-[#1a472a]">
                Letter layout
              </Label>
              <Select
                value={draft.layout}
                onValueChange={(v) => setDraft((d) => ({ ...d, layout: v as LetterLayout }))}
              >
                <SelectTrigger id="tpl-layout" className="bg-white border-[#1a472a]/20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="plain">Plain letter</SelectItem>
                  <SelectItem value="announcement">Announcement (header, buttons, callouts)</SelectItem>
                  <SelectItem value="one_pager">One-pager (PDF page)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="tpl-body" className="text-[#1a472a]">
                Body (markdown)
              </Label>
              <Textarea
                id="tpl-body"
                value={draft.customBody}
                onChange={(e) => setDraft((d) => ({ ...d, customBody: e.target.value }))}
                placeholder={"Friends,\n\nHere's what's blooming this season…"}
                className="bg-white border-[#1a472a]/20 min-h-[180px] font-mono text-sm"
                data-testid="templates-editor-body"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="ghost"
              className="text-[#2d5a3d]"
              onClick={() => setEditorOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="bg-[#1a472a] hover:bg-[#2d5a3d] text-white"
              disabled={save.isPending}
              onClick={() => void handleSave()}
              data-testid="templates-editor-save"
            >
              {save.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              {editorMode === "create" ? "Create" : "Save changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteKey} onOpenChange={(open) => !open && setDeleteKey(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete template?</AlertDialogTitle>
            <AlertDialogDescription>
              “{deleteLabel}” will be removed permanently. Letters already scheduled or sent are
              unchanged.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-700 hover:bg-red-800"
              disabled={remove.isPending}
              onClick={(e) => {
                e.preventDefault();
                void handleDelete();
              }}
              data-testid="templates-delete-confirm"
            >
              {remove.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin inline" /> : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default AdminOutboundTemplates;
