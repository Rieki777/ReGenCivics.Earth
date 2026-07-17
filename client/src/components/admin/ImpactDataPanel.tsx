/**
 * ReGen impact schema editor (Phase C1, improvement 7). Lives in the admin
 * application detail sheet. Loads the project's impact_data JSON, edits it
 * against the shared zod schema (server re-validates on save), and stores
 * through applications.adminSetImpact. Backfill of the current cohort happens
 * here by hand (small N). Public display renders elsewhere via
 * publicImpactSummary(); this panel is admin-only.
 */

import { useEffect, useState } from "react";
import { Sprout } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { GOVERNANCE_MATURITY_STAGES, type ImpactData } from "@shared/impact";

const NUMBER_FIELDS: { key: keyof ImpactData; label: string; hint?: string; integer?: boolean }[] = [
  { key: "hectaresUnderRegeneration", label: "Hectares under regeneration" },
  { key: "waterCapturedM3PerYear", label: "Water captured (m³/year)" },
  { key: "waterRestoredM3PerYear", label: "Water restored (m³/year)" },
  { key: "soilOrganicMatterPercent", label: "Soil organic matter (%)", hint: "0 to 100" },
  { key: "foodOutputKgPerYear", label: "Food output (kg/year)" },
  { key: "peopleHoused", label: "People housed", integer: true },
  { key: "peopleFed", label: "People fed", integer: true },
  { key: "peopleTrained", label: "People trained", integer: true },
];

export function ImpactDataPanel({ applicationId }: { applicationId: number }) {
  const utils = trpc.useUtils();
  const impactQuery = trpc.applications.adminGetImpact.useQuery({ id: applicationId });
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [governance, setGovernance] = useState<string>("");
  const [context, setContext] = useState<string>("");
  const [loadedFor, setLoadedFor] = useState<number | null>(null);

  useEffect(() => {
    if (!impactQuery.data || loadedFor === applicationId) return;
    const impact = impactQuery.data.impact ?? {};
    const next: Record<string, string> = {};
    for (const f of NUMBER_FIELDS) {
      const v = impact[f.key];
      next[f.key as string] = typeof v === "number" ? String(v) : "";
    }
    setDraft(next);
    setGovernance(impact.governanceMaturity ?? "");
    setContext(impact.context ?? "");
    setLoadedFor(applicationId);
  }, [impactQuery.data, applicationId, loadedFor]);

  const saveMutation = trpc.applications.adminSetImpact.useMutation({
    onSuccess: () => {
      toast.success("Impact data saved");
      utils.applications.adminGetImpact.invalidate({ id: applicationId });
    },
    onError: (err) => toast.error(err.message),
  });

  const save = () => {
    const impact: Record<string, unknown> = {};
    for (const f of NUMBER_FIELDS) {
      const raw = draft[f.key as string]?.trim();
      if (!raw) continue;
      const num = Number(raw);
      if (Number.isNaN(num)) {
        toast.error(`${f.label} must be a number`);
        return;
      }
      impact[f.key as string] = f.integer ? Math.round(num) : num;
    }
    if (governance) impact.governanceMaturity = governance;
    if (context.trim()) impact.context = context.trim();
    saveMutation.mutate({ id: applicationId, impact });
  };

  return (
    <div className="rounded-lg border border-[#1a472a]/15 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Sprout className="w-4 h-4 text-[#4a7c59]" />
        <Label className="text-sm font-semibold text-[#1a472a]">Impact data (ReGen impact schema)</Label>
      </div>
      {impactQuery.isLoading ? (
        <p className="text-sm text-[#1a472a]/60">Loading…</p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3">
            {NUMBER_FIELDS.map((f) => (
              <div key={f.key as string}>
                <label className="block text-xs text-[#1a472a]/70 mb-0.5">
                  {f.label}
                  {f.hint ? ` (${f.hint})` : ""}
                </label>
                <input
                  type="number"
                  value={draft[f.key as string] ?? ""}
                  onChange={(e) => setDraft((d) => ({ ...d, [f.key as string]: e.target.value }))}
                  className="w-full rounded-md border border-[#1a472a]/20 bg-white text-[#1a472a] px-2 py-1.5 text-sm focus:outline-none focus:border-[#7dd87d]/60"
                />
              </div>
            ))}
          </div>
          <div>
            <label className="block text-xs text-[#1a472a]/70 mb-0.5">Governance maturity</label>
            <select
              value={governance}
              onChange={(e) => setGovernance(e.target.value)}
              className="w-full rounded-md border border-[#1a472a]/20 bg-white text-[#1a472a] px-2 py-1.5 text-sm focus:outline-none focus:border-[#7dd87d]/60"
            >
              <option value="">Not assessed</option>
              {GOVERNANCE_MATURITY_STAGES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-[#1a472a]/70 mb-0.5">Context (methods, measurement notes)</label>
            <textarea
              value={context}
              onChange={(e) => setContext(e.target.value.slice(0, 4000))}
              rows={3}
              className="w-full rounded-md border border-[#1a472a]/20 bg-white text-[#1a472a] px-2 py-1.5 text-sm focus:outline-none focus:border-[#7dd87d]/60"
            />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#1a472a]/50">
              {impactQuery.data?.impact?.updatedAt
                ? `Last saved ${new Date(impactQuery.data.impact.updatedAt).toLocaleString()}`
                : "Nothing recorded yet"}
            </span>
            <Button
              onClick={save}
              disabled={saveMutation.isPending}
              className="bg-[#4a7c59] text-white hover:bg-[#5a8c69] rounded-md px-4 h-8 text-sm"
            >
              {saveMutation.isPending ? "Saving…" : "Save impact data"}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
