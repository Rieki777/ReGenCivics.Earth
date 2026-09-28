/**
 * Cooperative interest: people and land projects who told us they're
 * interested in the member-owned cooperative in design (server/routes/coop.ts).
 * No amounts, no pledges: interest is a conversation starter, never a
 * membership or a contribution.
 */
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { useToast } from "@/hooks/use-toast";
import { TaoSpinner } from "@/components/TaoSpinner";
import { SELECT_CLASS, ymd } from "./fieldClass";

const STATUSES = ["new", "contacted", "in_conversation", "archived"] as const;
type Status = (typeof STATUSES)[number];

const STATUS_LABEL: Record<Status, string> = {
  new: "New",
  contacted: "Contacted",
  in_conversation: "In conversation",
  archived: "Archived",
};

const KIND_LABEL: Record<string, string> = {
  land_project: "Land project",
  person: "Person",
  organization: "Organization",
  funder: "Funder or foundation",
};

type InterestRow = {
  id: number;
  name: string;
  email: string;
  kind: string;
  organization: string | null;
  location: string | null;
  capitalForms: string[] | null;
  message: string | null;
  status: Status;
  createdAt: string | Date;
};

export function CoopInterestPanel() {
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const [filter, setFilter] = useState<Status | "">("");
  const { data, isLoading } = trpc.coop.listInterest.useQuery(filter ? { status: filter } : undefined);
  const setStatus = trpc.coop.setInterestStatus.useMutation({
    onSuccess: () => utils.coop.listInterest.invalidate(),
    onError: (err) => toast({ title: "Could not save", description: err.message, variant: "destructive" }),
  });

  const rows = (data ?? []) as InterestRow[];

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <p className="text-sm text-[#1a472a]/85 max-w-3xl">
          People and land projects who asked to hear more about the cooperative. The form collects no amounts:
          this is who to talk with, and what they might bring.
        </p>
        <label className="block w-full sm:w-56">
          <span className="block text-xs font-bold text-[#1a472a]/80 mb-1">Show</span>
          <select value={filter} onChange={(e) => setFilter(e.target.value as Status | "")} className={SELECT_CLASS}>
            <option value="">Everyone</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABEL[s]}
              </option>
            ))}
          </select>
        </label>
      </div>

      {isLoading ? (
        <TaoSpinner size={48} />
      ) : rows.length === 0 ? (
        <Card className="p-8 text-center bg-white">
          <p className="text-[#1a472a]/80">No one yet.</p>
        </Card>
      ) : (
        rows.map((r) => (
          <Card key={r.id} className="p-4 bg-white border-[#1a472a]/15">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="font-bold text-[#1a472a]">
                  {r.name}
                  <span className="ml-2 text-xs font-semibold text-[#1a472a]/70">{KIND_LABEL[r.kind] ?? r.kind}</span>
                </h3>
                <a href={`mailto:${r.email}`} className="text-sm text-[#1a472a] underline underline-offset-2 break-all">
                  {r.email}
                </a>
                <p className="text-xs text-[#1a472a]/70">
                  {[r.organization, r.location, ymd(r.createdAt)].filter(Boolean).join(" · ")}
                </p>
              </div>
              <label className="block w-full sm:w-48">
                <span className="sr-only">Status for {r.name}</span>
                <select
                  value={r.status}
                  onChange={(e) => setStatus.mutate({ id: r.id, status: e.target.value as Status })}
                  className={SELECT_CLASS}
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {STATUS_LABEL[s]}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            {r.capitalForms && r.capitalForms.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {r.capitalForms.map((c) => (
                  <span key={c} className="rounded-full border border-[#1a472a]/25 bg-[#f7f4ee] px-2 py-0.5 text-xs text-[#1a472a]">
                    {c}
                  </span>
                ))}
              </div>
            )}
            {r.message && <p className="mt-2 text-sm text-[#1a472a]/90 whitespace-pre-wrap">{r.message}</p>}
          </Card>
        ))
      )}
    </div>
  );
}
