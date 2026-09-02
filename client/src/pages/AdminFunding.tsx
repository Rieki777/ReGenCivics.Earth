/**
 * /admin/funding - the funding pipeline portal + application engine.
 *
 * The list is the 117-row funder pipeline researched and source-verified on
 * 2026-07-24. Rye works the right-hand columns (app status, owner, next action)
 * inline; the research columns are read-only here and get refreshed by
 * scripts/seed-funding-pipeline.ts.
 *
 * "Prepare application" runs the positioning kernel against one row and returns
 * a positioning summary plus a standalone Cowork prompt. Nothing here submits
 * anything. The prompt is copied into a separate session, where a human drafts
 * the application and a human sends it.
 *
 * Two display rules worth knowing before editing this file:
 *
 *  - The page is a light surface, and the site declares color-scheme: dark
 *    (client/index.html). Native form controls therefore render with the
 *    browser's DARK chrome unless the control opts out, which is what made the
 *    first version ship with dark grey boxes and unreadable placeholders on a
 *    cream background. Every control here carries FIELD_CLASS, which pins
 *    [color-scheme:light] plus explicit background, text, placeholder, and
 *    border colors. Do not drop it, and do not rely on the base Input's
 *    bg-transparent.
 *
 *  - Research text goes through cleanField. The seed writes ranges with
 *    en-dashes ("$250K-$5M+") and STEERING section 1.1 bans them on screen.
 */
import { useMemo, useState } from "react";
import { BackButton } from "@/components/BackButton";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { TaoSpinner } from "@/components/TaoSpinner";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { getLoginUrl } from "@/const";
import { cleanField } from "@shared/funding";
import { AdminChrome } from "@/components/admin/AdminChrome";
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

const PRIORITY_STYLE: Record<Priority, { chip: string; help: string }> = {
  P1: { chip: "bg-green-100 text-green-900 border-green-400", help: "Strong fit, open now" },
  P2: { chip: "bg-amber-100 text-amber-900 border-amber-400", help: "Strong fit, gated on timing or an invitation" },
  P3: { chip: "bg-rose-100 text-rose-900 border-rose-400", help: "Stretch, partnership, or geography-conditional" },
  ADV: { chip: "bg-violet-100 text-violet-900 border-violet-400", help: "Advisory, not capital" },
  ALLY: { chip: "bg-blue-100 text-blue-900 border-blue-400", help: "Field network and allies" },
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

/**
 * The one class every form control on this page needs.
 *
 * [color-scheme:light] is the load-bearing part: the document declares
 * color-scheme dark, so without this the browser paints its own dark widget
 * background behind a transparent input, and the date picker indicator and
 * select dropdown come out dark too. The explicit text and placeholder colors
 * matter for the same reason, since the inherited foreground is a light token.
 */
const FIELD_CLASS =
  "[color-scheme:light] w-full rounded-md border border-[#1a472a]/30 bg-white " +
  "text-[#1a472a] dark:text-[#1a472a] dark:bg-white " +
  "placeholder:text-[#1a472a]/75 dark:placeholder:text-[#1a472a]/75 " +
  "px-2.5 py-2 text-base md:text-sm pointer-coarse:min-h-11 " +
  "focus:outline-none focus:ring-2 focus:ring-[#1a472a]/40 focus:border-[#1a472a]/50";

/** Selects need room on the right so the longest option does not run into the caret. */
const SELECT_CLASS = `${FIELD_CLASS} pr-7`;

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

function ymd(value: string | Date | null | undefined): string {
  if (!value) return "";
  const d = typeof value === "string" ? value : value.toISOString();
  return d.slice(0, 10);
}

/** An editable cell that only writes when the value actually changed on blur. */
function InlineText({
  value,
  placeholder,
  onSave,
  type = "text",
  ariaLabel,
}: {
  value: string | null;
  placeholder: string;
  onSave: (next: string | null) => void;
  type?: "text" | "date";
  ariaLabel: string;
}) {
  const committed = type === "date" ? ymd(value) : (value ?? "");
  const [draft, setDraft] = useState(committed);

  return (
    <input
      type={type}
      value={draft}
      placeholder={placeholder}
      aria-label={ariaLabel}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => {
        const trimmed = draft.trim();
        if (trimmed === committed) return;
        onSave(trimmed === "" ? null : trimmed);
      }}
      className={FIELD_CLASS}
    />
  );
}

function StatusSelect({
  row,
  onField,
}: {
  row: PipelineRow;
  onField: (id: number, patch: Record<string, unknown>) => void;
}) {
  return (
    <select
      value={row.appStatus}
      onChange={(e) => onField(row.id, { appStatus: e.target.value })}
      aria-label={`Application status for ${row.name}`}
      className={SELECT_CLASS}
    >
      {APP_STATUSES.map((s) => (
        <option key={s} value={s}>
          {STATUS_LABEL[s]}
        </option>
      ))}
    </select>
  );
}

function PriorityChip({ priority }: { priority: Priority }) {
  const style = PRIORITY_STYLE[priority] ?? PRIORITY_STYLE.P2;
  return (
    <span
      title={style.help}
      className={`inline-block rounded-full border px-2 py-0.5 text-[11px] font-bold ${style.chip}`}
    >
      {priority}
    </span>
  );
}

function FunderLink({ row }: { row: PipelineRow }) {
  if (!row.link) return <span className="font-semibold text-[#1a472a]">{row.name}</span>;
  return (
    <a
      href={row.link}
      target="_blank"
      rel="noopener noreferrer"
      className="font-semibold text-[#1a472a] underline decoration-[#1a472a]/30 underline-offset-2 hover:decoration-[#1a472a] inline-flex items-center gap-1"
    >
      {row.name}
      <ExternalLink className="w-3 h-3 flex-shrink-0 opacity-60" aria-hidden="true" />
      <span className="sr-only">(opens in a new tab)</span>
    </a>
  );
}

/**
 * The row-level action. It always reads "Prepare" here: this button does not
 * know whether a generation already exists, and guessing from the expanded
 * state would label it "Regenerate" on a funder that has never been generated.
 * The real Regenerate button lives in the Applications panel, which does know.
 */
function PrepareButton({
  generating,
  onGenerate,
  full = false,
}: {
  generating: boolean;
  onGenerate: () => void;
  full?: boolean;
}) {
  return (
    <Button
      size="sm"
      onClick={onGenerate}
      disabled={generating}
      className={`bg-[#7dd87d] text-[#1a472a] hover:bg-[#9de89d] font-semibold pointer-coarse:min-h-11 ${full ? "w-full" : ""}`}
    >
      {generating ? (
        <RefreshCw className="w-4 h-4 mr-1.5 animate-spin" />
      ) : (
        <Sparkles className="w-4 h-4 mr-1.5" />
      )}
      {generating ? "Working" : "Prepare"}
    </Button>
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
      setExpanded(vars.pipelineId);
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
          <p className="text-[#1a472a]/80 mb-6">Sign in as an admin to open the funding pipeline.</p>
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
          <p className="text-[#1a472a]/80 mb-6">This page is for admins.</p>
          <Button onClick={() => navigate("/")} className="bg-[#7dd87d] hover:bg-[#9de89d] text-[#1a472a]">
            Back to Home
          </Button>
        </Card>
      </div>
    );
  }

  const list = (rows ?? []) as PipelineRow[];
  const setField = (id: number, patch: Record<string, unknown>) => update.mutate({ id, ...patch } as never);
  const isGenerating = (id: number) => generate.isPending && generate.variables?.pipelineId === id;

  const chips: Array<{ label: string; value: number; className: string }> = [
    { label: "Funders", value: stats?.total ?? 0, className: "bg-[#1a472a] text-white border-[#1a472a]" },
    ...PRIORITIES.map((p) => ({
      label: p,
      value: stats?.byPriority?.[p] ?? 0,
      className: PRIORITY_STYLE[p].chip,
    })),
    { label: "Submitted", value: stats?.submitted ?? 0, className: "bg-sky-100 text-sky-900 border-sky-400" },
    { label: "Awarded", value: stats?.awarded ?? 0, className: "bg-emerald-100 text-emerald-900 border-emerald-400" },
  ];

  const filtersActive = Boolean(priority || appStatus || category || search.trim());

  return (
    <AdminChrome activeTab="funding">
    <div className="pb-4">
      <div className="container max-w-[1500px] px-4">
        <BackButton />

        <div className="mb-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-2">
            <h1 className="text-2xl md:text-4xl font-bold text-[#1a472a]">Funding Pipeline</h1>
            <Button
              variant="outline"
              size="sm"
              className="border-[#1a472a]/40 text-[#1a472a] hover:bg-[#1a472a]/5 w-fit pointer-coarse:min-h-11"
              onClick={() => navigate("/admin")}
            >
              Back to Dashboard
            </Button>
          </div>
          <p className="text-[#1a472a]/80 text-sm md:text-base max-w-3xl">
            Every funder we researched, what it takes to reach them, and where each application stands. Prepare an
            application to get the positioning and a prompt you can run in a Cowork session. Submitting stays with you.
          </p>
        </div>

        {/* Stat chips */}
        <div className="flex flex-wrap gap-2 mb-4">
          {chips.map((c) => (
            <div key={c.label} className={`rounded-full border px-3 py-1 text-sm font-bold ${c.className}`}>
              {c.value} <span className="font-medium opacity-90">{c.label}</span>
            </div>
          ))}
        </div>

        {/* Filters */}
        <Card className="p-3 md:p-4 mb-4 bg-white border-[#1a472a]/15">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <label className="block">
              <span className="block text-xs font-bold text-[#1a472a]/80 mb-1">Priority</span>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as Priority | "")}
                className={SELECT_CLASS}
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
              <span className="block text-xs font-bold text-[#1a472a]/80 mb-1">App status</span>
              <select
                value={appStatus}
                onChange={(e) => setAppStatus(e.target.value as AppStatus | "")}
                className={SELECT_CLASS}
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
              <span className="block text-xs font-bold text-[#1a472a]/80 mb-1">Category</span>
              <select value={category} onChange={(e) => setCategory(e.target.value)} className={SELECT_CLASS}>
                <option value="">All categories</option>
                {(categories ?? []).map((c) => (
                  <option key={c} value={c}>
                    {cleanField(c)}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="block text-xs font-bold text-[#1a472a]/80 mb-1">Search</span>
              <div className="relative">
                <Search
                  className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-[#1a472a]/75 pointer-events-none"
                  aria-hidden="true"
                />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Name, notes, entity, next action"
                  aria-label="Search funders"
                  className={`${FIELD_CLASS} pl-8`}
                />
              </div>
            </label>
          </div>
          <div className="flex flex-wrap items-center gap-3 mt-3">
            <p className="text-xs text-[#1a472a]/75">
              Showing {list.length} of {stats?.total ?? 0}. Sorted P1 first, then by next-action date.
            </p>
            {filtersActive && (
              <button
                onClick={() => {
                  setPriority("");
                  setAppStatus("");
                  setCategory("");
                  setSearch("");
                }}
                className="text-xs font-semibold text-[#1a472a] underline underline-offset-2 pointer-coarse:min-h-11"
              >
                Clear filters
              </button>
            )}
          </div>
        </Card>

        {list.length === 0 ? (
          <Card className="p-12 text-center bg-white">
            <p className="text-[#1a472a]/80">No funders match these filters.</p>
          </Card>
        ) : (
          <>
            {/* Desktop: one scannable table. 117 rows as cards was a wall. */}
            <Card className="hidden lg:block bg-white border-[#1a472a]/15 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-[#1a472a] text-white text-left">
                      <th className="p-2 pl-3 font-semibold w-8" aria-label="Expand" />
                      <th className="p-2 font-semibold min-w-[13rem]">Funder</th>
                      <th className="p-2 font-semibold min-w-[11rem]">Capital + size</th>
                      <th className="p-2 font-semibold min-w-[7rem] w-28">Deadline</th>
                      <th className="p-2 font-semibold w-16">Pri</th>
                      <th className="p-2 font-semibold w-40">Status</th>
                      <th className="p-2 font-semibold w-28">Owner</th>
                      <th className="p-2 font-semibold min-w-[11rem]">Next action</th>
                      <th className="p-2 font-semibold w-[9.5rem]">Date</th>
                      <th className="p-2 pr-3 font-semibold w-28" aria-label="Prepare application" />
                    </tr>
                  </thead>
                  <tbody>
                    {list.map((row, i) => (
                      <FunderTableRow
                        key={row.id}
                        row={row}
                        zebra={i % 2 === 1}
                        isOpen={expanded === row.id}
                        onToggle={() => setExpanded(expanded === row.id ? null : row.id)}
                        onField={setField}
                        onGenerate={() => generate.mutate({ pipelineId: row.id })}
                        generating={isGenerating(row.id)}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            {/* Mobile + tablet: cards. */}
            <div className="lg:hidden space-y-2">
              {list.map((row) => (
                <FunderCard
                  key={row.id}
                  row={row}
                  isOpen={expanded === row.id}
                  onToggle={() => setExpanded(expanded === row.id ? null : row.id)}
                  onField={setField}
                  onGenerate={() => generate.mutate({ pipelineId: row.id })}
                  generating={isGenerating(row.id)}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
    </AdminChrome>
  );
}

// ── Desktop row ─────────────────────────────────────────────────────────────
function FunderTableRow({
  row,
  zebra,
  isOpen,
  onToggle,
  onField,
  onGenerate,
  generating,
}: {
  row: PipelineRow;
  zebra: boolean;
  isOpen: boolean;
  onToggle: () => void;
  onField: (id: number, patch: Record<string, unknown>) => void;
  onGenerate: () => void;
  generating: boolean;
}) {
  const size = [cleanField(row.capitalType), cleanField(row.typicalSize)].filter(Boolean).join(" · ");

  return (
    <>
      <tr className={`border-t border-[#1a472a]/10 align-top ${zebra ? "bg-[#1a472a]/[0.03]" : ""}`}>
        <td className="p-2 pl-3">
          <button
            onClick={onToggle}
            aria-expanded={isOpen}
            aria-label={`${isOpen ? "Collapse" : "Expand"} details for ${row.name}`}
            className="text-[#1a472a]/75 hover:text-[#1a472a] p-1 inline-flex items-center justify-center pointer-coarse:min-h-11 pointer-coarse:min-w-11"
          >
            {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
        </td>
        <td className="p-2">
          <FunderLink row={row} />
          <div className="text-xs text-[#1a472a]/75 mt-0.5">
            {cleanField(row.category)}
            {row.fit ? ` · ${cleanField(row.fit)} fit` : ""}
          </div>
        </td>
        <td className="p-2 text-[#1a472a]/85 text-xs">{size}</td>
        <td className="p-2 text-[#1a472a]/85 text-xs">{cleanField(row.deadline)}</td>
        <td className="p-2">
          <PriorityChip priority={row.priority} />
        </td>
        <td className="p-2">
          <StatusSelect row={row} onField={onField} />
        </td>
        <td className="p-2">
          <InlineText
            value={row.owner}
            placeholder="Owner"
            ariaLabel={`Owner for ${row.name}`}
            onSave={(owner) => onField(row.id, { owner })}
          />
        </td>
        <td className="p-2">
          <InlineText
            value={row.nextAction}
            placeholder="Next action"
            ariaLabel={`Next action for ${row.name}`}
            onSave={(nextAction) => onField(row.id, { nextAction })}
          />
        </td>
        <td className="p-2">
          <InlineText
            type="date"
            value={row.nextActionDate}
            placeholder="Date"
            ariaLabel={`Next action date for ${row.name}`}
            onSave={(nextActionDate) => onField(row.id, { nextActionDate })}
          />
        </td>
        <td className="p-2 pr-3">
          <PrepareButton generating={generating} onGenerate={onGenerate} full />
        </td>
      </tr>
      {isOpen && (
        <tr className="border-t border-[#1a472a]/10">
          <td colSpan={10} className="p-0">
            <div className="bg-[#faf8f5] p-4">
              <FunderDetail row={row} onField={onField} onGenerate={onGenerate} generating={generating} />
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

// ── Mobile card ─────────────────────────────────────────────────────────────
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
  const meta = [
    cleanField(row.category),
    cleanField(row.capitalType),
    cleanField(row.typicalSize),
    cleanField(row.deadline),
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <Card className="bg-white border-[#1a472a]/15 overflow-hidden">
      <div className="p-3">
        <div className="flex items-start gap-2">
          <button
            onClick={onToggle}
            aria-expanded={isOpen}
            aria-label={`${isOpen ? "Collapse" : "Expand"} details for ${row.name}`}
            className="text-[#1a472a]/75 p-1 -ml-1 pointer-coarse:min-h-11 pointer-coarse:min-w-11 flex-shrink-0"
          >
            {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <FunderLink row={row} />
              <PriorityChip priority={row.priority} />
            </div>
            <div className="text-xs text-[#1a472a]/75 mt-0.5">{meta}</div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-2 mt-3">
          <StatusSelect row={row} onField={onField} />
          <InlineText
            value={row.owner}
            placeholder="Owner"
            ariaLabel={`Owner for ${row.name}`}
            onSave={(owner) => onField(row.id, { owner })}
          />
          <InlineText
            value={row.nextAction}
            placeholder="Next action"
            ariaLabel={`Next action for ${row.name}`}
            onSave={(nextAction) => onField(row.id, { nextAction })}
          />
          <div className="grid grid-cols-2 gap-2">
            <InlineText
              type="date"
              value={row.nextActionDate}
              placeholder="Date"
              ariaLabel={`Next action date for ${row.name}`}
              onSave={(nextActionDate) => onField(row.id, { nextActionDate })}
            />
            <PrepareButton generating={generating} onGenerate={onGenerate} full />
          </div>
        </div>
      </div>

      {isOpen && (
        <div className="border-t border-[#1a472a]/10 bg-[#faf8f5] p-3">
          <FunderDetail row={row} onField={onField} onGenerate={onGenerate} generating={generating} />
        </div>
      )}
    </Card>
  );
}

// ── Shared expanded detail ──────────────────────────────────────────────────
function FunderDetail({
  row,
  onField,
  onGenerate,
  generating,
}: {
  row: PipelineRow;
  onField: (id: number, patch: Record<string, unknown>) => void;
  onGenerate: () => void;
  generating: boolean;
}) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3 text-sm">
        <Detail label="What it funds" value={row.whatItFunds} />
        <Detail label="Eligibility" value={row.eligibility} />
        <Detail label="Geography" value={row.geography} />
        <Detail label="Access" value={row.accessStatus} />
        <Detail label="Entity to use" value={row.regenEntity} />
        <Detail label="Last touched" value={row.lastTouch ? ymd(row.lastTouch) : "never"} />
      </div>

      <div>
        <label className="block text-xs font-bold text-[#1a472a]/80 mb-1" htmlFor={`notes-${row.id}`}>
          Notes
        </label>
        <NotesField id={row.id} value={row.notes} onSave={(notes) => onField(row.id, { notes })} />
      </div>

      <ApplicationsPanel pipelineId={row.id} onGenerate={onGenerate} generating={generating} />
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string | null }) {
  const text = cleanField(value);
  if (!text) return null;
  return (
    <div>
      <div className="text-xs font-bold text-[#1a472a]/80">{label}</div>
      <div className="text-[#1a472a]/90">{text}</div>
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
    <textarea
      id={`notes-${id}`}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => {
        if (draft.trim() === (value ?? "").trim()) return;
        onSave(draft.trim() === "" ? null : draft.trim());
      }}
      rows={3}
      className={FIELD_CLASS}
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
    return <p className="text-sm text-[#1a472a]/75">Loading positioning history.</p>;
  }

  if (generations.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-[#1a472a]/30 bg-white p-4 text-sm text-[#1a472a]/80">
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
          className="border-[#1a472a]/40 text-[#1a472a] hover:bg-[#1a472a]/5 pointer-coarse:min-h-11"
        >
          <RefreshCw className={`w-4 h-4 mr-1.5 ${generating ? "animate-spin" : ""}`} />
          {generating ? "Working" : "Regenerate"}
        </Button>
      </div>
      <GenerationBlock generation={latest} />
      {older.length > 0 && (
        <details className="rounded-md border border-[#1a472a]/20 bg-white">
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
  const realFlags = flags.filter((f) => f !== "generation_unvalidated");

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
    <div className="rounded-md border border-[#1a472a]/20 bg-white p-3">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
        <span className="text-xs text-[#1a472a]/75">
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
        <div className="flex gap-2 rounded-md border border-amber-400 bg-amber-50 p-2 mb-2 text-sm text-amber-900">
          <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" aria-hidden="true" />
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

      {realFlags.length > 0 && (
        <div className="rounded-md border border-amber-400 bg-amber-50 p-2 mb-3">
          <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900 mb-1">
            <AlertTriangle className="w-3.5 h-3.5" aria-hidden="true" />
            Resolve before applying
          </div>
          <ul className="list-disc pl-5 space-y-1 text-sm text-amber-900">
            {realFlags.map((f, i) => (
              <li key={i}>{f}</li>
            ))}
          </ul>
        </div>
      )}

      {generation.coworkPrompt && (
        <details className="rounded-md border border-[#1a472a]/20">
          <summary className="cursor-pointer px-3 py-2 text-sm font-semibold text-[#1a472a] pointer-coarse:min-h-11 flex items-center">
            Cowork prompt
          </summary>
          <div className="border-t border-[#1a472a]/10 p-3">
            <Button
              size="sm"
              variant="outline"
              onClick={copyPrompt}
              className="mb-2 border-[#1a472a]/40 text-[#1a472a] hover:bg-[#1a472a]/5 pointer-coarse:min-h-11"
            >
              <Copy className="w-4 h-4 mr-1.5" />
              {copied ? "Copied" : "Copy prompt"}
            </Button>
            <pre className="whitespace-pre-wrap break-words text-xs text-[#1a472a]/90 bg-[#faf8f5] border border-[#1a472a]/10 rounded p-2 max-h-96 overflow-y-auto">
              {generation.coworkPrompt}
            </pre>
            <p className="text-xs text-[#1a472a]/75 mt-2">
              Paste this into a fresh Cowork session with the regen-civics-clean folder connected. It drafts the
              application and hands the submission back to you.
            </p>
          </div>
        </details>
      )}
    </div>
  );
}
