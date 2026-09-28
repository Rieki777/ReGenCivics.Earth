/**
 * Metrics: every number ReGen Civics states about itself, in one place
 * (funding engine Phase 0; server/funding/metrics.ts).
 *
 * Live counts refresh from the database. Hand-entered numbers carry a source
 * and an as-of date. Nothing here reaches a public page until Rye confirms it
 * and marks it public (ruling 2026-09-27: live counts stay in admin until they
 * are meaningful), and the server enforces that order.
 */
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { useToast } from "@/hooks/use-toast";
import { TaoSpinner } from "@/components/TaoSpinner";
import { RefreshCw } from "lucide-react";
import { FIELD_CLASS, ymd } from "./fieldClass";

type MetricRow = {
  id: number;
  metricKey: string;
  label: string;
  definition: string | null;
  valueNumeric: number | null;
  displayValue: string | null;
  unit: string;
  computedFrom: string | null;
  computedAt: string | Date | null;
  asOf: string | Date | null;
  source: string | null;
  isPublic: boolean;
  confirmedAt: string | Date | null;
  notes: string | null;
};

function Chip({ tone, children }: { tone: "green" | "amber" | "slate" | "sky"; children: React.ReactNode }) {
  const cls = {
    green: "bg-emerald-100 text-emerald-900 border-emerald-400",
    amber: "bg-amber-100 text-amber-900 border-amber-400",
    slate: "bg-slate-100 text-slate-800 border-slate-300",
    sky: "bg-sky-100 text-sky-900 border-sky-400",
  }[tone];
  return <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold ${cls}`}>{children}</span>;
}

function MetricCard({ row }: { row: MetricRow }) {
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const computed = Boolean(row.computedFrom);
  const [value, setValue] = useState(row.valueNumeric === null ? "" : String(row.valueNumeric));
  const [display, setDisplay] = useState(row.displayValue ?? "");
  const [asOf, setAsOf] = useState(ymd(row.asOf));
  const [source, setSource] = useState(row.source ?? "");
  const [notes, setNotes] = useState(row.notes ?? "");

  const update = trpc.metrics.update.useMutation({
    onSuccess: () => {
      utils.metrics.list.invalidate();
      toast({ title: "Saved" });
    },
    onError: (err) => toast({ title: "Could not save", description: err.message, variant: "destructive" }),
  });

  const saveEntered = () => {
    const trimmed = value.trim();
    const numeric = trimmed === "" ? null : Number(trimmed.replace(/[$,]/g, ""));
    if (numeric !== null && !Number.isFinite(numeric)) {
      toast({ title: "That value is not a number", variant: "destructive" });
      return;
    }
    update.mutate({
      id: row.id,
      valueNumeric: numeric,
      displayValue: display.trim() || null,
      asOf: asOf || null,
      source: source.trim() || null,
      notes: notes.trim() || null,
    });
  };

  const confirmed = Boolean(row.confirmedAt);

  return (
    <Card className="p-4 bg-white border-[#1a472a]/15">
      <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
        <div>
          <h3 className="font-bold text-[#1a472a]">{row.label}</h3>
          <p className="text-xs text-[#1a472a]/70 font-mono">{row.metricKey}</p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-[#1a472a]">{row.displayValue ?? "Not set"}</div>
          <div className="text-xs text-[#1a472a]/70">{asOf ? `as of ${asOf}` : "no date"}</div>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5 mb-3">
        <Chip tone={computed ? "sky" : "slate"}>{computed ? "Live count" : "Entered by hand"}</Chip>
        <Chip tone={confirmed ? "green" : "amber"}>{confirmed ? "Confirmed" : "Unconfirmed"}</Chip>
        <Chip tone={row.isPublic ? "green" : "slate"}>{row.isPublic ? "Public" : "Admin only"}</Chip>
      </div>

      {row.definition && <p className="text-sm text-[#1a472a]/85 mb-3">{row.definition}</p>}

      {!computed && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
          <label className="block">
            <span className="block text-xs font-bold text-[#1a472a]/80 mb-1">Value ({row.unit})</span>
            <input value={value} onChange={(e) => setValue(e.target.value)} inputMode="decimal" className={FIELD_CLASS} />
          </label>
          <label className="block">
            <span className="block text-xs font-bold text-[#1a472a]/80 mb-1">How it reads (optional, e.g. 50+)</span>
            <input value={display} onChange={(e) => setDisplay(e.target.value)} className={FIELD_CLASS} />
          </label>
          <label className="block">
            <span className="block text-xs font-bold text-[#1a472a]/80 mb-1">As of</span>
            <input type="date" value={asOf} onChange={(e) => setAsOf(e.target.value)} className={FIELD_CLASS} />
          </label>
          <label className="block">
            <span className="block text-xs font-bold text-[#1a472a]/80 mb-1">Source</span>
            <input value={source} onChange={(e) => setSource(e.target.value)} placeholder="Where the number comes from" className={FIELD_CLASS} />
          </label>
        </div>
      )}
      {computed && (
        <p className="text-xs text-[#1a472a]/70 mb-3">
          {row.source ?? "Not refreshed yet."}
          {row.computedAt ? ` Refreshed ${ymd(row.computedAt)}.` : ""}
        </p>
      )}

      <label className="block mb-3">
        <span className="block text-xs font-bold text-[#1a472a]/80 mb-1">Notes</span>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className={FIELD_CLASS} />
      </label>

      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          onClick={computed ? () => update.mutate({ id: row.id, notes: notes.trim() || null }) : saveEntered}
          disabled={update.isPending}
          className="bg-[#1a472a] hover:bg-[#245c38] text-white pointer-coarse:min-h-11"
        >
          Save
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => update.mutate({ id: row.id, confirm: !confirmed })}
          disabled={update.isPending || (!computed && row.valueNumeric === null && !row.displayValue)}
          className="border-[#1a472a]/40 text-[#1a472a] pointer-coarse:min-h-11"
        >
          {confirmed ? "Unconfirm" : "Confirm this number"}
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => update.mutate({ id: row.id, isPublic: !row.isPublic })}
          disabled={update.isPending || (!row.isPublic && !confirmed)}
          className="border-[#1a472a]/40 text-[#1a472a] pointer-coarse:min-h-11"
          title={!confirmed ? "Confirm the number first" : undefined}
        >
          {row.isPublic ? "Take off public pages" : "Allow on public pages"}
        </Button>
      </div>
    </Card>
  );
}

export function MetricsPanel() {
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const { data, isLoading } = trpc.metrics.list.useQuery();
  const refresh = trpc.metrics.refresh.useMutation({
    onSuccess: (res) => {
      utils.metrics.list.invalidate();
      toast({
        title: `Refreshed ${res.updated.length} live counts`,
        description: res.failed.length ? `Could not compute: ${res.failed.join(", ")}` : undefined,
      });
    },
    onError: (err) => toast({ title: "Refresh failed", description: err.message, variant: "destructive" }),
  });

  if (isLoading) return <TaoSpinner size={48} />;
  const rows = (data ?? []) as MetricRow[];

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <p className="text-sm text-[#1a472a]/85 max-w-3xl">
          Every number we state about ourselves lives here once, with its definition and source. Live counts refresh
          from the database. Nothing shows on a public page until you confirm it and allow it there.
        </p>
        <Button
          size="sm"
          onClick={() => refresh.mutate()}
          disabled={refresh.isPending}
          className="bg-[#7dd87d] hover:bg-[#9de89d] text-[#1a472a] w-fit pointer-coarse:min-h-11"
        >
          <RefreshCw className="w-4 h-4 mr-1.5" aria-hidden="true" />
          Refresh live counts
        </Button>
      </div>
      {rows.length === 0 ? (
        <Card className="p-8 text-center bg-white">
          <p className="text-[#1a472a]/80">No metrics yet. The 0275 migration seeds them.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {rows.map((row) => (
            <MetricCard key={row.id} row={row} />
          ))}
        </div>
      )}
    </div>
  );
}
