/**
 * The Harvest at /admin-create (Phase 2).
 *
 * Two tiers: Ripe ideas (why-now + Develop with an angle) and Drafts (edit in
 * place). Every card traces to its raw sources via the provenance panel.
 * Owner-only: harvest.listFeed is ownerProcedure, so anyone else sees the
 * quiet gate message, never data.
 */
import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Sprout, RefreshCw, Loader2, ChevronDown, ChevronUp, Copy, Check,
  Send, Moon, Ban, Compass, Sparkles, ExternalLink, ArrowLeft,
} from "lucide-react";

const CHANNELS = [
  { key: "linkedin", label: "LinkedIn" },
  { key: "facebook", label: "Facebook" },
  { key: "instagram", label: "Instagram" },
  { key: "threads_x", label: "Threads / X" },
  { key: "newsletter", label: "Newsletter" },
  { key: "article", label: "Article" },
] as const;
type ChannelKey = (typeof CHANNELS)[number]["key"];

function channelLabel(key: string): string {
  return CHANNELS.find((c) => c.key === key)?.label ?? key;
}

function timeAgo(date: string | Date | null): string {
  if (!date) return "never";
  const ms = Date.now() - new Date(date).getTime();
  const minutes = Math.floor(ms / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 48) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function ScorePills({ components, ripeness }: { components: unknown; ripeness: number }) {
  const c = (components ?? {}) as Record<string, number>;
  const parts: Array<[string, number | undefined]> = [
    ["material", c.material], ["recency", c.recency], ["cluster", c.cluster], ["focus", c.theme_focus],
  ];
  return (
    <span className="flex flex-wrap gap-1 items-center">
      <Badge className="bg-[#1a472a] text-[#7dd87d] hover:bg-[#1a472a]">{ripeness.toFixed(2)}</Badge>
      {parts.map(([name, value]) => value !== undefined && (
        <span key={name} className="text-[10px] px-1.5 py-0.5 rounded bg-[#1a472a]/10 text-[#1a472a]/70">
          {name} {Number(value).toFixed(2)}
        </span>
      ))}
    </span>
  );
}

function Provenance({ itemId, ideaId }: { itemId?: number; ideaId?: number }) {
  const query = trpc.harvest.getSource.useQuery(
    itemId ? { itemId } : { ideaId: ideaId! },
    { retry: false, refetchOnWindowFocus: false },
  );
  if (query.isLoading) return <p className="text-xs text-[#1a472a]/50 py-2"><Loader2 className="w-3 h-3 animate-spin inline mr-1" />Tracing sources...</p>;
  if (!query.data) return <p className="text-xs text-[#1a472a]/50 py-2">No provenance recorded for this one.</p>;
  const { sources, linkTree, noteRefs } = query.data;
  return (
    <div className="space-y-3 py-2 text-sm">
      {sources.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-[#1a472a]/60 uppercase tracking-wide">Raw sources</p>
          {sources.map((s) => (
            <div key={s.refId} className="rounded-lg bg-[#f0ebe3] px-3 py-2">
              <p className="text-[10px] text-[#1a472a]/50 mb-1">{s.refId} · {s.date ? new Date(s.date).toLocaleDateString() : "undated"}{s.forwardedFrom ? ` · fwd: ${s.forwardedFrom}` : ""}</p>
              <p className="text-xs text-[#1a472a] whitespace-pre-wrap">{(s.text ?? "").slice(0, 700)}{(s.text ?? "").length > 700 ? "..." : ""}</p>
            </div>
          ))}
        </div>
      )}
      {linkTree.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-[#1a472a]/60 uppercase tracking-wide mb-1">Link tree</p>
          <div className="flex flex-col gap-1">
            {linkTree.slice(0, 12).map((url) => (
              <a key={url} href={url} target="_blank" rel="noreferrer" className="text-xs text-[#4a7c59] hover:underline flex items-center gap-1 break-all">
                <ExternalLink className="w-3 h-3 flex-shrink-0" />{url}
              </a>
            ))}
          </div>
        </div>
      )}
      {noteRefs.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-[#1a472a]/60 uppercase tracking-wide mb-1">Vault notes</p>
          {noteRefs.map((ref) => (
            <p key={ref} className="text-xs text-[#1a472a]/70 font-mono">{ref}</p>
          ))}
        </div>
      )}
      {sources.length === 0 && linkTree.length === 0 && noteRefs.length === 0 && (
        <p className="text-xs text-[#1a472a]/50">No sources on file yet; the bridge fills these in.</p>
      )}
    </div>
  );
}

type IdeaRow = {
  id: number; title: string; summary: string | null; whyNow: string | null;
  ripeness: number; scoreComponents: unknown; themes: unknown; steer: string | null;
};

function IdeaCard({ idea, onChanged }: { idea: IdeaRow; onChanged: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const [channels, setChannels] = useState<ChannelKey[]>(["linkedin"]);
  const [angle, setAngle] = useState("");
  const [steerText, setSteerText] = useState("");
  const [showSteer, setShowSteer] = useState(false);
  const develop = trpc.harvest.develop.useMutation();
  const snooze = trpc.harvest.snooze.useMutation();
  const notThis = trpc.harvest.notThis.useMutation();
  const steer = trpc.harvest.steer.useMutation();

  function toggleChannel(key: ChannelKey) {
    setChannels((prev) => prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]);
  }

  async function runDevelop() {
    if (channels.length === 0) return;
    await develop.mutateAsync({ ideaId: idea.id, channels, ...(angle.trim() ? { angle: angle.trim() } : {}) });
    onChanged();
  }

  const themes = Array.isArray(idea.themes) ? (idea.themes as string[]) : [];

  return (
    <div className="rounded-2xl border border-[#4a7c59]/25 bg-white p-4 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-semibold text-[#1a472a]">{idea.title}</p>
          {idea.whyNow && <p className="text-xs text-[#4a7c59] mt-0.5">{idea.whyNow}</p>}
        </div>
        <ScorePills components={idea.scoreComponents} ripeness={idea.ripeness} />
      </div>
      {themes.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {themes.slice(0, 5).map((t) => <span key={t} className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#7dd87d]/15 text-[#1a472a]/70">{t}</span>)}
        </div>
      )}
      {idea.steer && <p className="text-xs text-amber-800 bg-amber-50 rounded px-2 py-1">Steer: {idea.steer}</p>}

      <div className="flex flex-wrap items-center gap-1.5 pt-1">
        <Button size="sm" className="h-8 rounded-lg bg-[#1a472a] hover:bg-[#2d5a3d]" onClick={() => setExpanded((e) => !e)}>
          <Sparkles className="w-3.5 h-3.5 mr-1" /> Develop {expanded ? <ChevronUp className="w-3 h-3 ml-1" /> : <ChevronDown className="w-3 h-3 ml-1" />}
        </Button>
        <Button size="sm" variant="ghost" className="h-8 text-[#1a472a]/60" disabled={snooze.isPending}
          onClick={async () => { await snooze.mutateAsync({ ideaId: idea.id, days: 7 }); onChanged(); }}>
          <Moon className="w-3.5 h-3.5 mr-1" /> Snooze
        </Button>
        <Button size="sm" variant="ghost" className="h-8 text-[#1a472a]/60" disabled={notThis.isPending}
          onClick={async () => { await notThis.mutateAsync({ ideaId: idea.id }); onChanged(); }}>
          <Ban className="w-3.5 h-3.5 mr-1" /> Not this
        </Button>
        <Button size="sm" variant="ghost" className="h-8 text-[#1a472a]/60" onClick={() => setShowSteer((s) => !s)}>
          <Compass className="w-3.5 h-3.5 mr-1" /> Steer
        </Button>
      </div>

      {showSteer && (
        <div className="flex gap-2">
          <Textarea value={steerText} onChange={(e) => setSteerText(e.target.value)} placeholder="e.g. focus on the fundraising angle"
            className="min-h-[40px] text-sm rounded-lg border-[#4a7c59]/30" rows={1} />
          <Button size="sm" className="h-9 rounded-lg bg-[#1a472a]" disabled={!steerText.trim() || steer.isPending}
            onClick={async () => { await steer.mutateAsync({ ideaId: idea.id, text: steerText.trim() }); setShowSteer(false); setSteerText(""); onChanged(); }}>
            Save
          </Button>
        </div>
      )}

      {expanded && (
        <div className="space-y-2 border-t border-[#1a472a]/10 pt-2">
          {idea.summary && <p className="text-xs text-[#1a472a]/70 whitespace-pre-wrap">{idea.summary.slice(0, 500)}</p>}
          <div className="flex flex-wrap gap-1.5">
            {CHANNELS.map((c) => (
              <button key={c.key} onClick={() => toggleChannel(c.key)}
                className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${channels.includes(c.key) ? "bg-[#1a472a] text-white border-[#1a472a]" : "bg-white text-[#1a472a]/70 border-[#1a472a]/25 hover:border-[#1a472a]/50"}`}>
                {c.label}
              </button>
            ))}
          </div>
          <input value={angle} onChange={(e) => setAngle(e.target.value)} placeholder="Angle (optional): the fatherhood thread, the numbers, ..."
            className="w-full text-sm rounded-lg border border-[#4a7c59]/30 px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#7dd87d]" maxLength={200} />
          <div className="flex items-center gap-2">
            <Button size="sm" className="h-9 rounded-lg bg-[#1a472a] hover:bg-[#2d5a3d]" disabled={develop.isPending || channels.length === 0} onClick={runDevelop}>
              {develop.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Sparkles className="w-4 h-4 mr-1" />}
              {develop.isPending ? "Drafting..." : `Draft ${channels.length} channel${channels.length === 1 ? "" : "s"}`}
            </Button>
            {develop.isError && <p className="text-xs text-red-700">{develop.error.message}</p>}
          </div>
          <details>
            <summary className="text-xs text-[#4a7c59] cursor-pointer">Where this comes from</summary>
            <Provenance ideaId={idea.id} />
          </details>
        </div>
      )}
    </div>
  );
}

type DraftRow = {
  id: number; channel: string; body: string | null; aiBody: string | null;
  status: "ready" | "edited" | "shipped"; angle: string | null;
  updatedAt: string | Date; ripeness: number;
};

function DraftCard({ item, ideaTitleById, onChanged }: { item: DraftRow & { ideaId: number | null; captureId: string }; ideaTitleById: Map<number, string>; onChanged: () => void }) {
  const [body, setBody] = useState(item.body ?? "");
  const [dirty, setDirty] = useState(false);
  const [copied, setCopied] = useState(false);
  const [nudge, setNudge] = useState("");
  const [showNudge, setShowNudge] = useState(false);
  const [showSources, setShowSources] = useState(false);
  const [postedOpen, setPostedOpen] = useState(false);
  const [postedText, setPostedText] = useState("");
  const [kindOpen, setKindOpen] = useState(false);
  const edit = trpc.harvest.editItem.useMutation();
  const regenerate = trpc.harvest.regenerate.useMutation();
  const markPosted = trpc.harvest.markPosted.useMutation();

  useEffect(() => { setBody(item.body ?? ""); setDirty(false); setKindOpen(false); }, [item.id, item.body]);

  // The one-tap classifier (plan s6): saving asks "mostly style or mostly
  // content?" so only style edits teach the voice loop. Content is the safer
  // default and gets the plain button.
  async function save(editKind: "style" | "content") {
    if (!dirty || !body.trim()) return;
    await edit.mutateAsync({ itemId: item.id, body, editKind });
    setDirty(false);
    setKindOpen(false);
    onChanged();
  }

  async function copyBody() {
    await navigator.clipboard.writeText(body);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  const statusColor = item.status === "shipped" ? "bg-[#4a7c59] text-white" : item.status === "edited" ? "bg-amber-100 text-amber-900" : "bg-[#1a472a]/10 text-[#1a472a]/70";
  const title = (item.ideaId && ideaTitleById.get(item.ideaId)) || item.captureId;

  return (
    <div className="rounded-2xl border border-[#4a7c59]/25 bg-white p-4 space-y-2">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 min-w-0">
          <Badge className="bg-[#1a472a] text-white hover:bg-[#1a472a]">{channelLabel(item.channel)}</Badge>
          <span className={`text-[10px] px-2 py-0.5 rounded-full ${statusColor}`}>{item.status}</span>
          <span className="text-xs text-[#1a472a]/50 truncate">{title}</span>
        </div>
        <span className="text-[10px] text-[#1a472a]/40">{timeAgo(item.updatedAt)}</span>
      </div>
      {item.angle && <p className="text-xs text-[#4a7c59]">Angle: {item.angle}</p>}

      <Textarea value={body} onChange={(e) => { setBody(e.target.value); setDirty(true); }}
        className="min-h-[140px] text-sm rounded-xl border-[#4a7c59]/30 focus-visible:ring-[#7dd87d] font-normal whitespace-pre-wrap" />

      <div className="flex flex-wrap items-center gap-1.5">
        {!kindOpen ? (
          <Button size="sm" className="h-8 rounded-lg bg-[#1a472a] hover:bg-[#2d5a3d]" disabled={!dirty || edit.isPending} onClick={() => setKindOpen(true)}>
            {edit.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Save edit"}
          </Button>
        ) : (
          <span className="flex items-center gap-1.5 text-xs text-[#1a472a]/70">
            That edit was
            <Button size="sm" variant="outline" className="h-8 rounded-lg border-[#4a7c59]/40 text-[#1a472a]" disabled={edit.isPending} onClick={() => void save("style")}>
              mostly style
            </Button>
            <Button size="sm" className="h-8 rounded-lg bg-[#1a472a] hover:bg-[#2d5a3d]" disabled={edit.isPending} onClick={() => void save("content")}>
              mostly content
            </Button>
          </span>
        )}
        <Button size="sm" variant="ghost" className="h-8 text-[#1a472a]/70" onClick={copyBody}>
          {copied ? <Check className="w-3.5 h-3.5 mr-1 text-[#4a7c59]" /> : <Copy className="w-3.5 h-3.5 mr-1" />}{copied ? "Copied" : "Copy"}
        </Button>
        <Button size="sm" variant="ghost" className="h-8 text-[#1a472a]/70" onClick={() => setShowNudge((s) => !s)} disabled={item.status === "shipped"}>
          <RefreshCw className="w-3.5 h-3.5 mr-1" /> Regenerate
        </Button>
        <Button size="sm" variant="ghost" className="h-8 text-[#1a472a]/70" onClick={() => setPostedOpen((s) => !s)} disabled={item.status === "shipped"}>
          <Send className="w-3.5 h-3.5 mr-1" /> Mark as posted
        </Button>
        <button className="text-xs text-[#4a7c59] hover:underline ml-auto" onClick={() => setShowSources((s) => !s)}>
          {showSources ? "Hide sources" : "Where this comes from"}
        </button>
      </div>

      {showNudge && (
        <div className="flex gap-2 items-center">
          <input value={nudge} onChange={(e) => setNudge(e.target.value)} placeholder="Nudge: shorter, more personal, lead with the question..."
            className="flex-1 text-sm rounded-lg border border-[#4a7c59]/30 px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#7dd87d]" maxLength={300} />
          <Button size="sm" className="h-9 rounded-lg bg-[#1a472a]" disabled={regenerate.isPending}
            onClick={async () => { await regenerate.mutateAsync({ itemId: item.id, ...(nudge.trim() ? { nudge: nudge.trim() } : {}) }); setShowNudge(false); setNudge(""); onChanged(); }}>
            {regenerate.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Go"}
          </Button>
        </div>
      )}

      {postedOpen && (
        <div className="space-y-2 border-t border-[#1a472a]/10 pt-2">
          <Textarea value={postedText} onChange={(e) => setPostedText(e.target.value)}
            placeholder="Optional: paste the final text as it was posted (the cleanest voice signal of all)"
            className="min-h-[60px] text-sm rounded-lg border-[#4a7c59]/30" />
          <Button size="sm" className="h-8 rounded-lg bg-[#4a7c59] hover:bg-[#1a472a]" disabled={markPosted.isPending}
            onClick={async () => { await markPosted.mutateAsync({ itemId: item.id, ...(postedText.trim() ? { postedText: postedText.trim() } : {}) }); setPostedOpen(false); onChanged(); }}>
            Confirm posted
          </Button>
        </div>
      )}

      {showSources && <Provenance itemId={item.id} />}
    </div>
  );
}

export default function AdminCreate() {
  const feed = trpc.harvest.listFeed.useQuery({ tier: "all" }, { retry: false, refetchOnWindowFocus: false });
  const refresh = trpc.harvest.refresh.useMutation();
  const utils = trpc.useUtils();
  const onChanged = () => void utils.harvest.listFeed.invalidate();

  const ideaTitleById = useMemo(() => {
    const map = new Map<number, string>();
    for (const idea of feed.data?.ideas ?? []) map.set(idea.id, idea.title);
    return map;
  }, [feed.data?.ideas]);

  if (feed.isLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-[#f8f5f0]"><Loader2 className="w-6 h-6 animate-spin text-[#1a472a]" /></div>;
  }

  if (feed.isError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8f5f0] p-6">
        <div className="text-center space-y-3">
          <Sprout className="w-8 h-8 text-[#4a7c59] mx-auto" />
          <p className="text-[#1a472a] font-semibold">The Harvest is the owner's creation studio.</p>
          <p className="text-sm text-[#1a472a]/60">Sign in as the owner to see the feed.</p>
          <Link href="/admin" className="text-sm text-[#4a7c59] hover:underline inline-flex items-center gap-1"><ArrowLeft className="w-3.5 h-3.5" /> Back to admin</Link>
        </div>
      </div>
    );
  }

  const data = feed.data!;
  const staleWarning = data.status.generationStale;

  return (
    <div className="min-h-screen bg-[#f8f5f0] pb-24">
      <div className="max-w-3xl mx-auto px-4 pt-6 space-y-6">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <Link href="/admin" className="text-xs text-[#4a7c59] hover:underline inline-flex items-center gap-1 mb-1"><ArrowLeft className="w-3 h-3" /> Admin</Link>
            <h1 className="text-2xl font-bold text-[#1a472a] flex items-center gap-2"><Sprout className="w-6 h-6 text-[#4a7c59]" /> The Harvest</h1>
            <Link href="/admin/voice-rules" className="text-xs text-[#4a7c59] hover:underline">Voice rules</Link>
            <p className="text-xs text-[#1a472a]/60 mt-1">
              {data.ready
                ? <>Generation ran {timeAgo(data.status.lastGeneration)} · bridge {timeAgo(data.status.lastBridge)}</>
                : "The feed tables are not migrated yet."}
              {staleWarning && data.ready && <span className="text-amber-700 font-medium"> · generation has not run in over two hours</span>}
            </p>
          </div>
          <Button size="sm" variant="outline" className="h-9 rounded-lg border-[#4a7c59]/40 text-[#1a472a]" disabled={refresh.isPending}
            onClick={async () => { await refresh.mutateAsync(); onChanged(); }}>
            {refresh.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <RefreshCw className="w-4 h-4 mr-1" />} Refresh
          </Button>
        </div>

        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-[#1a472a]/70 uppercase tracking-wide">Ripe ideas ({data.ideas.length})</h2>
          {data.ideas.length === 0 && <p className="text-sm text-[#1a472a]/50">Nothing ripe right now. The bridge and the hourly worker keep this fresh.</p>}
          {data.ideas.map((idea) => <IdeaCard key={idea.id} idea={idea as IdeaRow} onChanged={onChanged} />)}
        </section>

        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-[#1a472a]/70 uppercase tracking-wide">Drafts ({data.drafts.length})</h2>
          {data.drafts.length === 0 && <p className="text-sm text-[#1a472a]/50">No drafts yet. Tap Develop on a ripe idea.</p>}
          {data.drafts.map((item) => (
            <DraftCard key={item.id} item={item as DraftRow & { ideaId: number | null; captureId: string }} ideaTitleById={ideaTitleById} onChanged={onChanged} />
          ))}
        </section>
      </div>
    </div>
  );
}
