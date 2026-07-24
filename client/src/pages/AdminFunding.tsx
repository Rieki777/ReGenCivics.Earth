/**
 * /admin/funding - the funding pipeline portal + application engine.
 *
 * The table is the 117-row funder pipeline researched and source-verified on
 * 2026-07-24. Rye works the right-hand columns (app status, owner, next action)
 * inline; the research columns are read-only here and get refreshed by
 * scripts/seed-funding-pipeline.ts.
 *
 * "Prepare application" runs the positioning kernel against one row and returns
 * a positioning summary plus a standalone Cowork prompt. Nothing here submits
 * anything. The prompt is copied into a separate session, where a human drafts
 * the application and a human sends it.
 */
import { useMemo, useState } from "react";
import { BackButton } from "@/components/BackButton";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { TaoSpinner } from "@/components/TaoSpinner";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { getLoginUrl } from "@/const";
import {
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Copy,
  ExternalLink,
  RefreshCw,
  Search,
  Sparkles,
} from "lucide-react";

// ── Vocabulary, mirrored from the migration's enums ─────────────────────────
const PRIORITIES = ["P1", "P2", "P3", "ADV", "ALLY"] as const;
type Priority = (typeof PRIORITIES)[number];

const APP_STATUSES = [
  "not_started",
  "researching",
  "preparing",
  "cultivating",
  "submitted",
  "in_review",
  "awarded",
  "declined",
  "parked",
] as const;
type AppStatus = (typeof APP_STATUSES)[number];

const PRIORITY_STYLE: Record<Priority, { chip: string; label: string; help: string }> = {
  P1: { chip: "bg-green-100 text-green-800 border-green-300", label: "P1", help: "Strong fit, open now" },
  P2: { chip: "bg-amber-100 text-amber-800 border-amber-300", label: "P2", help: "Strong fit, gated on timing or an invitation" },
  P3: { chip: "bg-rose-100 text-rose-800 border-rose-300", label: "P3", help: "Stretch, partnership, or geography-conditional" },
  ADV: { chip: "bg-violet-100 text-violet-800 border-violet-300", label: "ADV", help: "Advisory, not capital" },
  ALLY: { chip: "bg-blue-100 text-blue-800 border-blue-300", label: "ALLY", help: "Field network and allies" },
};

const STATUS_LABEL: Record<AppStatus, string> = {
  not_started: "Not started",
  researching: "Researching",
  preparing: "Preparing",
  cultivating: "Cultivating",
  submitted: "Submitted",
  in_review: "In review",
  awarded: "Awarded",
  declined: "Declined",
  parked: "Parked",
};

type PipelineRow = {
  id: number;
  name: string;
  category: string;
  capitalType: string | null;
  whatItFunds: string | null;
  typicalSize: string | null;
  geography: string | null;
  eligibility: string | null;
  accessStatus: string | null;
  deadline: string | null;
  fit: string | null;
  regenEntity: string | null;
  link: string | null;
  notes: string | null;
  priority: Priority;
  appStatus: AppStatus;
  owner: string | null;
  nextAction: string | null;
  nextActionDate: string | null;
  lastTouch: string | Date | null;
};

const INPUT_CLASS =
  "w-full rounded border border-[#1a472a]/20 bg-white px-2 py-1 text-sm text-base md:text-sm pointer-coarse:min-h-11";

function ymd(value: string | Date | null | undefined): string {
  if (!value) return "";
  const d = typeof value === "string" ? value : value.toISOString();
  return d.slice(0, 10);
}

/** One editable cell that only writes when the value actually changed on blur. */
function InlineText({
  value,
  placeholder,
  onSave,
  type = "text",
}: {
  value: string | null;
  placeholder: string;
  onSave: (next: string | null) => void;
  type?: "text" | "date";
}) {
  const [draft, setDraft] = useState(type === "date" ? ymd(value) : (value ?? ""));
  const committed = type === "date" ? ymd(value) : (value ?? "");

  return (
    <Input
      type={type}
      value={draft}
      placeholder={placeholder}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => {
        const trimmed = draft.trim();
        if (trimmed === committed) return;
        onSave(trimmed === "" ? null : trimmed);
      }}
      className={INPUT_CLASS}
    />
  );
}

export default function AdminFunding() {
  const { user, loading: authLoading } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const utils = trpc.useUtils();

  const [priority, setPriority] = useState<Priority | "">("");
  const [appStatus, setAppStatus] = useState<AppStatus | "">("");
  const [category, setCategory] = useState("");
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<number | null>(null);

  const isAdmin = !!user && (user.role === "admin" || user.role === "superadmin");

  const filters = useMemo(
    () => ({
      ...(priority ? { priority } : {}),
      ...(appStatus ? { appStatus } : {}),
      ...(category ? { category } : {}),
      ...(search.trim() ? { search: search.trim() } : {}),
    }),
    [priority, appStatus, category, search]
  );

  const { data: rows, isLoading } = trpc.adminFunding.list.useQuery(filters, { enabled: isAdmin });
  const { data: stats } = trpc.adminFunding.stats.useQuery(undefined, { enabled: isAdmin });
  const { data: categories } = trpc.adminFunding.categories.useQuery(undefined, { enabled: isAdmin });

  const update = trpc.adminFunding.update.useMutation({
    onSuccess: () => {
      utils.adminFunding.list.invalidate();
      utils.adminFunding.stats.invalidate();
    },
    onError: (err) => toast({ title: "Could not save", description: err.message, variant: "destructive" }),
  });

  const generate = trpc.adminFunding.generateApplication.useMutation({
    onSuccess: (_data, vars) => {
      utils.adminFunding.getApplications.invalidate({ pipelineId: vars.pipelineId });
      utils.adminFunding.list.invalidate();
      utils.adminFunding.stats.invalidate();
      toast({ title: "Positioning ready", description: "Review it, then copy the Cowork prompt." });
    },
    onError: (err) => toast({ title: "Generation failed", description: err.message, variant: "destructive" }),
  });

  if (authLoading || (isAdmin && isLoading)) return <TaoSpinner fullPage size={72} />;

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f0ebe3]">
        <Card className="max-w-md p-8 text-center">
          <h2 className="text-2xl font-bold text-[#1a472a] mb-4">Login Required</h2>
          <p className="text-[#1a472a]/70 mb-6">Sign in as an admin to open the funding pipeline.</p>
          <Button
            onClick={() => (window.location.href = getLoginUrl())}
            className="bg-[#7dd87d] hover:bg-[#9de89d] text-[#1a472a]"
          >
            Login to Continue
          </Button>
        </Card>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f0ebe3]">
        <Card className="max-w-md p-8 text-center">
          <h2 className="text-2xl font-bold text-[#1a472a] mb-4">Access Denied</h2>
          <p className="text-[#1a472a]/70 mb-6">This page is for admins.</p>
          <Button onClick={() => navigate("/")} className="bg-[#7dd87d] hover:bg-[#9de89d] text-[#1a472a]">
            Back to Home
          </Button>
        </Card>
      </div>
    );
  }

  const list = (rows ?? []) as PipelineRow[];

  const setField = (id: number, patch: Record<string, unknown>) => update.mutate({ id, ...patch } as never);

  const chips: Array<{ label: string; value: number; className: string }> = [
    { label: "Funders", value: stats?.total ?? 0, className: "bg-[#1a472a] text-white border-[#1a472a]" },
    ...PRIORITIES.map((p) => ({
      label: PRIORITY_STYLE[p].label,
      value: stats?.byPriority?.[p] ?? 0,
      className: PRIORITY_STYLE[p].chip,
    })),
    { label: "Submitted", value: stats?.submitted ?? 0, className: "bg-sky-100 text-sky-800 border-sky-300" },
    { label: "Awarded", value: stats?.awarded ?? 0, className: "bg-emerald-100 text-emerald-800 border-emerald-300" },
  ];

  return (
    <div className="min-h-screen bg-[#f0ebe3] py-6 md:py-12">
      <div className="container max-w-[1400px] px-4">
        <BackButton />

        <div className="mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-2">
            <h1 className="text-2xl md:text-4xl font-bold text-[#1a472a]">Funding Pipeline</h1>
            <Button
              variant="outline"
              size="sm"
              className="border-[#1a472a]/30 text-[#1a472a] w-fit pointer-coarse:min-h-11"
              onClick={() => navigate("/admin")}
            >
              Back to Dashboard
            </Button>
          </div>
          <p className="text-[#1a472a]/70 text-sm md:text-base">
            Every funder we researched, what it takes to reach them, and where each application stands. Prepare an
            application to get the positioning and a prompt you can run in a Cowork session. Submitting stays with you.
          </p>
        </div>

        {/* Stat chips */}
        <div className="flex flex-wrap gap-2 mb-5">
          {chips.map((c) => (
            <div key={c.label} className={`rounded-full border px-3 py-1.5 text-sm font-semibold ${c.className}`}>
              {c.value} <span className="font-normal opacity-80">{c.label}</span>
            </div>
          ))}
        </div>

        {/* Filters */}
        <Card className="p-3 md:p-4 mb-5 bg-white">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <label className="block">
              <span className="text-xs font-semibold text-[#1a472a]/70">Priority</span>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as Priority | "")}
                className={INPUT_CLASS}
              >
                <option value="">All priorities</option>
                {PRIORITIES.map((p) => (
                  <option key={p} value={p}>
                    {p}: {PRIORITY_STYLE[p].help}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="text-xs font-semibold text-[#1a472a]/70">App status</span>
              <select
                value={appStatus}
                onChange={(e) => setAppStatus(e.target.value as AppStatus | "")}
                className={INPUT_CLASS}
              >
                <option value="">All statuses</option>
                {APP_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {STATUS_LABEL[s]}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="text-xs font-semibold text-[#1a472a]/70">Category</span>
              <select value={category} onChange={(e) => setCategory(e.target.value)} className={INPUT_CLASS}>
                <option value="">All categories</option>
                {(categories ?? []).map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="text-xs font-semibold text-[#1a472a]/70">Search</span>
              <div className="relative">
                <Search className="w-4 h-4 absolute left-2 top-1/2 -translate-y-1/2 text-[#1a472a]/40 pointer-events-none" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Name, notes, entity, next action"
                  className={`${INPUT_CLASS} pl-8`}
                />
              </div>
            </label>
          </div>
          <p className="text-xs text-[#1a472a]/60 mt-2">
            Showing {list.length} of {stats?.total ?? 0}. Sorted P1 first, then by next-action date.
          </p>
        </Card>

        {list.length === 0 ? (
          <Card className="p-12 text-center bg-white">
            <p className="text-[#1a472a]/70">No funders match these filters.</p>
          </Card>
        ) : (
          <div className="space-y-2">
            {list.map((row) => (
              <FunderCard
                key={row.id}
                row={row}
                isOpen={expanded === row.id}
                onToggle={() => setExpanded(expanded === row.id ? null : row.id)}
                onField={setField}
                onGenerate={() => generate.mutate({ pipelineId: row.id })}
                generating={generate.isPending && generate.variables?.pipelineId === row.id}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── One funder ──────────────────────────────────────────────────────────────
function FunderCard({
  row,
  isOpen,
  onToggle,
  onField,
  onGenerate,
  generating,
}: {
  row: PipelineRow;
  isOpen: boolean;
  onToggle: () => void;
  onField: (id: number, patch: Record<string, unknown>) => void;
  onGenerate: () => void;
  generating: boolean;
}) {
  const style = PRIORITY_STYLE[row.priority] ?? PRIORITY_STYLE.P2;

  return (
    <Card className="bg-white overflow-hidden">
      {/* Summary line. Stacks on mobile, one row from lg up. */}
      <div className="p-3 md:p-4">
        <div className="flex flex-col lg:flex-row lg:items-start gap-3">
          <button
            onClick={onToggle}
            aria-expanded={isOpen}
            className="flex items-start gap-2 text-left flex-1 min-w-0 pointer-coarse:min-h-11"
          >
            {isOpen ? (
              <ChevronDown className="w-4 h-4 mt-1 flex-shrink-0 text-[#1a472a]/60" />
            ) : (
              <ChevronRight className="w-4 h-4 mt-1 flex-shrink-0 text-[#1a472a]/60" />
            )}
            <span className="min-w-0">
              <span className="flex flex-wrap items-center gap-2">
                <span className="font-bold text-[#1a472a]">{row.name}</span>
                <span className={`rounded-full border px-2 py-0.5 text-[11px] font-bold ${style.chip}`}>
                  {row.priority}
                </span>
                {row.fit && <span className="text-xs text-[#1a472a]/60">{row.fit} fit</span>}
              </span>
              <span className="block text-xs text-[#1a472a]/70 mt-0.5">
                {row.category}
                {row.capitalType ? ` · ${row.capitalType}` : ""}
                {row.typicalSize ? ` · ${row.typicalSize}` : ""}
                {row.deadline ? ` · ${row.deadline}` : ""}
              </span>
            </span>
          </button>

          <div className="flex flex-wrap items-center gap-2 lg:flex-shrink-0">
            <select
              value={row.appStatus}
              onChange={(e) => onField(row.id, { appStatus: e.target.value })}
              aria-label={`Application status for ${row.name}`}
              className={`${INPUT_CLASS} w-auto min-w-[9rem]`}
            >
              {APP_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABEL[s]}
                </option>
              ))}
            </select>
            {row.link && (
              <a
                href={row.link}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Open ${row.name} in a new tab`}
                className="inline-flex items-center justify-center rounded border border-[#1a472a]/25 text-[#1a472a] px-2 py-1.5 min-h-9 min-w-9 pointer-coarse:min-h-11 pointer-coarse:min-w-11 hover:bg-[#1a472a]/5"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            )}
            <Button
              size="sm"
              onClick={onGenerate}
              disabled={generating}
              className="bg-[#7dd87d] text-[#1a472a] hover:bg-[#9de89d] font-semibold pointer-coarse:min-h-11"
            >
              <Sparkles className="w-4 h-4 mr-1.5" />
              {generating ? "Working" : "Prepare application"}
            </Button>
          </div>
        </div>

        {/* Working columns, always visible: this is the row Rye scans. */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-3">
          <InlineText
            value={row.owner}
            placeholder="Owner"
            onSave={(owner) => onField(row.id, { owner })}
          />
          <InlineText
            value={row.nextAction}
            placeholder="Next action"
            onSave={(nextAction) => onField(row.id, { nextAction })}
          />
          <InlineText
            type="date"
            value={row.nextActionDate}
            placeholder="Next action date"
            onSave={(nextActionDate) => onField(row.id, { nextActionDate })}
          />
        </div>
      </div>

      {isOpen && (
        <div className="border-t border-[#1a472a]/10 bg-[#faf8f5] p-3 md:p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3 text-sm">
            <Detail label="What it funds" value={row.whatItFunds} />
            <Detail label="Eligibility" value={row.eligibility} />
            <Detail label="Geography" value={row.geography} />
            <Detail label="Access" value={row.accessStatus} />
            <Detail label="Entity to use" value={row.regenEntity} />
            <Detail label="Last touched" value={row.lastTouch ? ymd(row.lastTouch) : "never"} />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#1a472a]/70 mb-1" htmlFor={`notes-${row.id}`}>
              Notes
            </label>
            <NotesField id={row.id} value={row.notes} onSave={(notes) => onField(row.id, { notes })} />
          </div>

          <ApplicationsPanel pipelineId={row.id} onGenerate={onGenerate} generating={generating} />
        </div>
      )}
    </Card>
  );
}

function Detail({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div>
      <div className="text-xs font-semibold text-[#1a472a]/70">{label}</div>
      <div className="text-[#1a472a]/90">{value}</div>
    </div>
  );
}

function NotesField({
  id,
  value,
  onSave,
}: {
  id: number;
  value: string | null;
  onSave: (next: string | null) => void;
}) {
  const [draft, setDraft] = useState(value ?? "");
  return (
    <Textarea
      id={`notes-${id}`}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => {
        if (draft.trim() === (value ?? "").trim()) return;
        onSave(draft.trim() === "" ? null : draft.trim());
      }}
      rows={3}
      className="w-full text-base md:text-sm bg-white"
    />
  );
}

// ── Generation history ──────────────────────────────────────────────────────
type Generation = {
  id: number;
  positioningSummary: string | null;
  keyPoints: string[] | null;
  entityToUse: string | null;
  flags: string[] | null;
  coworkPrompt: string | null;
  modelUsed: string | null;
  createdAt: string | Date;
};

function ApplicationsPanel({
  pipelineId,
  onGenerate,
  generating,
}: {
  pipelineId: number;
  onGenerate: () => void;
  generating: boolean;
}) {
  const { data, isLoading } = trpc.adminFunding.getApplications.useQuery({ pipelineId });
  const generations = (data ?? []) as Generation[];

  if (isLoading) {
    return <p className="text-sm text-[#1a472a]/60">Loading positioning history.</p>;
  }

  if (generations.length === 0) {
    return (
      <div className="rounded border border-dashed border-[#1a472a]/25 p-4 text-sm text-[#1a472a]/70">
        No positioning yet. Prepare an application to generate one.
      </div>
    );
  }

  const [latest, ...older] = generations;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-bold text-[#1a472a]">Positioning</h3>
        <Button
          size="sm"
          variant="outline"
          onClick={onGenerate}
          disabled={generating}
          className="border-[#1a472a]/30 text-[#1a472a] pointer-coarse:min-h-11"
        >
          <RefreshCw className={`w-4 h-4 mr-1.5 ${generating ? "animate-spin" : ""}`} />
          {generating ? "Working" : "Regenerate"}
        </Button>
      </div>
      <GenerationBlock generation={latest} />
      {older.length > 0 && (
        <details className="rounded border border-[#1a472a]/15 bg-white">
          <summary className="cursor-pointer px-3 py-2 text-sm font-semibold text-[#1a472a] pointer-coarse:min-h-11 flex items-center">
            {older.length} earlier {older.length === 1 ? "generation" : "generations"}
          </summary>
          <div className="p-3 space-y-3 border-t border-[#1a472a]/10">
            {older.map((g) => (
              <GenerationBlock key={g.id} generation={g} />
            ))}
          </div>
        </details>
      )}
    </div>
  );
}

function GenerationBlock({ generation }: { generation: Generation }) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const flags = generation.flags ?? [];
  const keyPoints = generation.keyPoints ?? [];
  const unvalidated = flags.includes("generation_unvalidated");

  const copyPrompt = async () => {
    const text = generation.coworkPrompt ?? "";
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({
        title: "Copy blocked",
        description: "Your browser blocked the clipboard. Open the prompt and select it by hand.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="rounded border border-[#1a472a]/15 bg-white p-3">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
        <span className="text-xs text-[#1a472a]/60">
          {new Date(generation.createdAt).toLocaleString()}
          {generation.modelUsed ? ` · ${generation.modelUsed}` : ""}
        </span>
        {generation.entityToUse && (
          <span className="rounded-full bg-[#1a472a]/10 px-2 py-0.5 text-xs font-semibold text-[#1a472a]">
            Apply as: {generation.entityToUse}
          </span>
        )}
      </div>

      {unvalidated && (
        <div className="flex gap-2 rounded border border-amber-300 bg-amber-50 p-2 mb-2 text-sm text-amber-900">
          <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>
            This generation did not come back in a usable shape. The raw output is kept below. Regenerate, and if it
            fails again the kernel wording needs a look.
          </span>
        </div>
      )}

      {generation.positioningSummary && (
        <p className="text-sm text-[#1a472a]/90 whitespace-pre-wrap mb-3">{generation.positioningSummary}</p>
      )}

      {keyPoints.length > 0 && (
        <ul className="list-disc pl-5 space-y-1 text-sm text-[#1a472a]/90 mb-3">
          {keyPoints.map((p, i) => (
            <li key={i}>{p}</li>
          ))}
        </ul>
      )}

      {flags.filter((f) => f !== "generation_unvalidated").length > 0 && (
        <div className="rounded border border-amber-300 bg-amber-50 p-2 mb-3">
          <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900 mb-1">
            <AlertTriangle className="w-3.5 h-3.5" />
            Resolve before applying
          </div>
          <ul className="list-disc pl-5 space-y-1 text-sm text-amber-900">
            {flags
              .filter((f) => f !== "generation_unvalidated")
              .map((f, i) => (
                <li key={i}>{f}</li>
              ))}
          </ul>
        </div>
      )}

      {generation.coworkPrompt && (
        <details className="rounded border border-[#1a472a]/15">
          <summary className="cursor-pointer px-3 py-2 text-sm font-semibold text-[#1a472a] pointer-coarse:min-h-11 flex items-center">
            Cowork prompt
          </summary>
          <div className="border-t border-[#1a472a]/10 p-3">
            <Button
              size="sm"
              variant="outline"
              onClick={copyPrompt}
              className="mb-2 border-[#1a472a]/30 text-[#1a472a] pointer-coarse:min-h-11"
            >
              <Copy className="w-4 h-4 mr-1.5" />
              {copied ? "Copied" : "Copy prompt"}
            </Button>
            <pre className="whitespace-pre-wrap break-words text-xs text-[#1a472a]/90 bg-[#faf8f5] rounded p-2 max-h-96 overflow-y-auto">
              {generation.coworkPrompt}
            </pre>
            <p className="text-xs text-[#1a472a]/60 mt-2">
              Paste this into a fresh Cowork session with the regen-civics-clean folder connected. It drafts the
              application and hands the submission back to you.
            </p>
          </div>
        </details>
      )}
    </div>
  );
}
