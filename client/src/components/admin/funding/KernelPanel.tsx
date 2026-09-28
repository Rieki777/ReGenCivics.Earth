/**
 * Kernel: the private positioning kernel and the Cowork template, edited here
 * (funding engine Phase 0; server/funding/prompts.ts).
 *
 * These texts used to be constants in the public repo. Every save makes a new
 * version and keeps the old ones, so a regeneration can be compared against
 * what the kernel said before, and a bad edit can be rolled back.
 */
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { useToast } from "@/hooks/use-toast";
import { TaoSpinner } from "@/components/TaoSpinner";
import { AlertTriangle } from "lucide-react";
import { FIELD_CLASS, SELECT_CLASS, ymd } from "./fieldClass";

type PromptKey = "positioning_kernel" | "cowork_template";

const KEY_LABEL: Record<PromptKey, string> = {
  positioning_kernel: "Positioning kernel (what the model reads before a funder row)",
  cowork_template: "Cowork template (the prompt each generation fills in)",
};

export function KernelPanel() {
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const [key, setKey] = useState<PromptKey>("positioning_kernel");
  const [body, setBody] = useState("");
  const [note, setNote] = useState("");
  const [openVersion, setOpenVersion] = useState<number | null>(null);

  const { data, isLoading } = trpc.adminFunding.getPrompt.useQuery({ key });

  useEffect(() => {
    if (data) setBody(data.active.body);
    setNote("");
    setOpenVersion(null);
  }, [data, key]);

  const save = trpc.adminFunding.savePrompt.useMutation({
    onSuccess: (res) => {
      utils.adminFunding.getPrompt.invalidate({ key });
      toast({ title: res.created ? `Saved as version ${res.version}` : "No change: this text is already active" });
    },
    onError: (err) => toast({ title: "Could not save", description: err.message, variant: "destructive" }),
  });

  const activate = trpc.adminFunding.activatePrompt.useMutation({
    onSuccess: () => {
      utils.adminFunding.getPrompt.invalidate({ key });
      toast({ title: "Version made active" });
    },
    onError: (err) => toast({ title: "Could not switch version", description: err.message, variant: "destructive" }),
  });

  return (
    <div className="space-y-4">
      <p className="text-sm text-[#1a472a]/85 max-w-3xl">
        The kernel is private. It lives only in the database, never in the public repo. Each save becomes a new
        version, and older versions stay here so you can compare or roll back.
      </p>

      <label className="block max-w-xl">
        <span className="block text-xs font-bold text-[#1a472a]/80 mb-1">Which text</span>
        <select value={key} onChange={(e) => setKey(e.target.value as PromptKey)} className={SELECT_CLASS}>
          {(Object.keys(KEY_LABEL) as PromptKey[]).map((k) => (
            <option key={k} value={k}>
              {KEY_LABEL[k]}
            </option>
          ))}
        </select>
      </label>

      {isLoading || !data ? (
        <TaoSpinner size={48} />
      ) : (
        <>
          {data.active.isFallback ? (
            <Card className="p-3 bg-amber-50 border-amber-300 flex gap-2 items-start">
              <AlertTriangle className="w-4 h-4 text-amber-700 mt-0.5 shrink-0" aria-hidden="true" />
              <p className="text-sm text-amber-900">
                Nothing saved yet, so generations run on the neutral fallback and get flagged kernel_not_seeded.
                Run scripts/seed-funding-prompts.ts, or paste the kernel below and save.
              </p>
            </Card>
          ) : (
            <p className="text-sm text-[#1a472a]">
              Active: version {data.active.version}
            </p>
          )}

          <Card className="p-4 bg-white border-[#1a472a]/15">
            <label className="block mb-3">
              <span className="block text-xs font-bold text-[#1a472a]/80 mb-1">Text</span>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={20}
                className={`${FIELD_CLASS} font-mono text-sm md:text-xs leading-relaxed`}
              />
            </label>
            <label className="block mb-3">
              <span className="block text-xs font-bold text-[#1a472a]/80 mb-1">What changed (optional)</span>
              <input value={note} onChange={(e) => setNote(e.target.value)} className={FIELD_CLASS} maxLength={500} />
            </label>
            <Button
              size="sm"
              onClick={() => save.mutate({ key, body, note: note.trim() || undefined })}
              disabled={save.isPending || !body.trim()}
              className="bg-[#1a472a] hover:bg-[#245c38] text-white pointer-coarse:min-h-11"
            >
              Save as a new version
            </Button>
          </Card>

          {data.versions.length > 0 && (
            <Card className="p-4 bg-white border-[#1a472a]/15">
              <h3 className="font-bold text-[#1a472a] mb-2">Versions</h3>
              <ul className="divide-y divide-[#1a472a]/10">
                {data.versions.map((v) => (
                  <li key={v.id} className="py-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="text-sm text-[#1a472a]">
                        <span className="font-semibold">v{v.version}</span> · {ymd(v.createdAt)}
                        {v.isActive && <span className="ml-2 text-emerald-700 font-semibold">active</span>}
                        {v.note && <span className="block text-xs text-[#1a472a]/75">{v.note}</span>}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setOpenVersion(openVersion === v.version ? null : v.version)}
                          className="border-[#1a472a]/40 text-[#1a472a] pointer-coarse:min-h-11"
                        >
                          {openVersion === v.version ? "Hide" : "Read"}
                        </Button>
                        {!v.isActive && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => activate.mutate({ key, version: v.version })}
                            disabled={activate.isPending}
                            className="border-[#1a472a]/40 text-[#1a472a] pointer-coarse:min-h-11"
                          >
                            Make active
                          </Button>
                        )}
                      </div>
                    </div>
                    {openVersion === v.version && (
                      <pre className="mt-2 max-h-80 overflow-auto whitespace-pre-wrap rounded bg-[#f7f4ee] p-3 text-xs text-[#1a472a]">
                        {v.body}
                      </pre>
                    )}
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
