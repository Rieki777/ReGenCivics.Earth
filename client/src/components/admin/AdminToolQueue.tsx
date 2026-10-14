/**
 * Tools waiting for review (ADR-73): every pending ReGen Tools Library entry,
 * from /tools/submit and from Alliance Partner applications. Before this, a
 * submitted tool sat pending with no screen anywhere that listed it.
 *
 * A tool that came with an Alliance Partner application is normally approved
 * with the partner; it shows here too, so it can be decided on its own when
 * the application is declined or the admin unticked it.
 */
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Check, ExternalLink, Loader2, Wrench, X } from "lucide-react";
import { TOOL_KINDS } from "@shared/toolLibrary";

function kindLabel(kind: string | null): string {
  return TOOL_KINDS.find((k) => k.id === kind)?.label ?? "Tool";
}

export function AdminToolQueue() {
  const utils = trpc.useUtils();
  const pending = trpc.tools.listPending.useQuery();
  const moderate = trpc.tools.moderate.useMutation({
    onSuccess: (_r, vars) => {
      toast.success(vars.action === "approve" ? "Listed in the Tools Library." : "Not listed.");
      utils.tools.listPending.invalidate();
      utils.allianceApplications.get.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });
  const rows = pending.data ?? [];

  return (
    <Card className="bg-white border-2 border-[#1a472a]/10">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-[#1a472a]" style={{ fontFamily: "var(--font-display)" }}>
          <Wrench className="h-5 w-5" /> Tools waiting for review
        </CardTitle>
        <CardDescription>
          New entries for the <a href="/tools" className="underline">ReGen Tools Library</a>. Tools that came with an Alliance
          Partner application are listed when you approve the partner.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        {pending.isLoading ? (
          <div className="p-6"><Loader2 className="h-5 w-5 animate-spin text-[#1a472a]" /></div>
        ) : rows.length === 0 ? (
          <p className="p-6 text-sm text-[#1a472a]/75">Nothing is waiting.</p>
        ) : (
          <ul className="divide-y divide-[#1a472a]/10">
            {rows.map((t) => (
              <li key={t.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="font-semibold text-[#1a472a]">
                    {t.name}{" "}
                    <span className="text-xs font-normal text-[#1a472a]/70">{kindLabel(t.toolKind)}{t.isOpenSource ? ", open source" : ""}</span>
                  </p>
                  <a href={t.websiteUrl} target="_blank" rel="noopener noreferrer nofollow" className="inline-flex min-h-11 items-center gap-1 break-all text-sm text-[#1a472a] underline">
                    {t.websiteUrl} <ExternalLink className="h-3 w-3 shrink-0" />
                  </a>
                  {t.shortSummary && <p className="mt-1 text-sm text-[#1a472a]/85">{t.shortSummary}</p>}
                  <p className="mt-1 text-xs text-[#1a472a]/70">
                    {t.allianceOrganization
                      ? `From ${t.allianceOrganization}'s Alliance Partner application (${(t.allianceStatus ?? "").replace(/_/g, " ")})`
                      : `Submitted at /tools/submit${t.submitterName ? ` by ${t.submitterName}` : ""}`}
                    {" · "}
                    {new Date(t.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <Button
                    type="button"
                    size="sm"
                    className="min-h-11"
                    disabled={moderate.isPending}
                    onClick={() => moderate.mutate({ toolId: t.id, action: "approve" })}
                  >
                    <Check className="mr-1 h-4 w-4" /> List it
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="min-h-11"
                    disabled={moderate.isPending}
                    onClick={() => {
                      if (window.confirm(`Leave ${t.name} out of the library?`)) moderate.mutate({ toolId: t.id, action: "reject" });
                    }}
                  >
                    <X className="mr-1 h-4 w-4" /> Not listed
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
