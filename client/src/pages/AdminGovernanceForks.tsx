/**
 * Governance Forks (ADR-46): the hub-side roster of village-platform forks
 * that on-chain governance outcomes are relayed to.
 *
 * A fork of the village platform (game-amora and its descendants) registers
 * here with its callback URL and the shared secret its founder set as
 * GOVERNANCE_HUB_SECRET on their side. From then on, when a [gm:<id>]
 * proposal reaches a terminal outcome on Base, the relay delivers it to
 * every active fork — at-least-once, with backoff — and this page is where
 * an operator watches that actually happen (and unsticks it when it
 * doesn't).
 *
 * Server truth lives in server/routes/governanceForks.ts (adminProcedure)
 * and server/lib/hypha-bridge/fork-relay.ts; this page only reads, registers
 * and nudges.
 */
import { useState } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { TaoSpinner } from "@/components/TaoSpinner";
import {
  AlertTriangle, ArrowLeft, CheckCircle2, ChevronDown, ChevronUp, Clock, ExternalLink,
  GitFork, Loader2, Plus, RefreshCw, XCircle,
} from "lucide-react";

/**
 * The document locks color-scheme dark (see AdminFunding.tsx's FIELD_CLASS
 * for the war story) — on this page's light surface, a bare shadcn Input
 * renders near-white text over dark native widget chrome. [color-scheme:light]
 * plus explicit colors is the cure, not a styling preference.
 */
const FIELD_CLASS =
  "[color-scheme:light] bg-white dark:bg-white text-[#1a472a] dark:text-[#1a472a] " +
  "placeholder:text-[#1a472a]/60 dark:placeholder:text-[#1a472a]/60 " +
  "border-[#1a472a]/30 focus-visible:ring-[#1a472a]/40";

/** Outline buttons inherit dark-theme tokens; on the light surface they need the brand tint spelled out. */
const OUTLINE_BTN = "border-[#1a472a]/40 text-[#1a472a] hover:bg-[#1a472a]/5 hover:text-[#1a472a]";

function formatRelativeTime(date: Date): string {
  // clamp: server-stamped rows can sit a few seconds ahead of this clock
  const s = Math.max(0, Math.round((Date.now() - date.getTime()) / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}

const defaultForm = { name: "", callbackUrl: "", secret: "", instanceId: "" };

/** queued → retrying → delivered, judged from the row itself. */
function deliveryState(d: { deliveredAt: Date | null; attempts: number }) {
  if (d.deliveredAt) return { label: "delivered", classes: "bg-green-100 text-green-800" };
  if (d.attempts > 0) return { label: "retrying", classes: "bg-amber-100 text-amber-800" };
  return { label: "queued", classes: "bg-blue-100 text-blue-800" };
}

function SectionError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="p-6 text-center text-[#1a472a]/80">
      <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-amber-600" />
      <p className="text-sm">{message}</p>
      <Button variant="outline" size="sm" className={`mt-3 ${OUTLINE_BTN}`} onClick={onRetry}>
        <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
        Retry
      </Button>
    </div>
  );
}

export default function AdminGovernanceForks() {
  const { user, loading: authLoading } = useAuth();
  const isAdmin = !!user && (user.role === "admin" || user.role === "superadmin");
  const utils = trpc.useUtils();

  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState(defaultForm);
  const [openForkId, setOpenForkId] = useState<number | null>(null);

  const {
    data: forks = [],
    isLoading,
    isError: forksError,
    refetch: refetchForks,
  } = trpc.governanceForks.list.useQuery(undefined, { enabled: isAdmin });
  const {
    data: deliveries = [],
    isLoading: deliveriesLoading,
    isError: deliveriesError,
    refetch: refetchDeliveries,
  } = trpc.governanceForks.deliveries.useQuery({ forkId: openForkId! }, { enabled: openForkId !== null });

  const closeForm = () => {
    setShowCreate(false);
    setForm(defaultForm);
  };

  const registerMut = trpc.governanceForks.register.useMutation({
    onSuccess: () => {
      utils.governanceForks.list.invalidate();
      closeForm();
      toast.success("Fork registered — outcomes will relay to it from the next on-chain event");
    },
    onError: (e) => toast.error("Registration failed", { description: e.message }),
  });
  const setActiveMut = trpc.governanceForks.setActive.useMutation({
    onSuccess: () => utils.governanceForks.list.invalidate(),
    onError: (e) => toast.error("Could not update fork", { description: e.message }),
  });
  const flushMut = trpc.governanceForks.flush.useMutation({
    onSuccess: (r) => {
      utils.governanceForks.list.invalidate();
      utils.governanceForks.deliveries.invalidate();
      if (r.delivered === 0 && r.failed === 0 && r.deferred === 0) {
        toast.success("Queue is clear — nothing owed");
      } else if (r.deferred > 0 && r.delivered === 0 && r.failed === 0) {
        toast.info(`${r.deferred} owed ${r.deferred === 1 ? "delivery is" : "deliveries are"} waiting out backoff or a paused fork — nothing attempted`);
      } else {
        const parts = [`${r.delivered} delivered`, `${r.failed} failed`];
        if (r.deferred > 0) parts.push(`${r.deferred} waiting out backoff`);
        toast.success(`Flush: ${parts.join(", ")}`);
      }
    },
    onError: (e) => toast.error("Flush failed", { description: e.message }),
  });

  const callbackInvalid = form.callbackUrl.length > 0 && !form.callbackUrl.startsWith("https://");
  const secretInvalid = form.secret.length > 0 && form.secret.length < 16;
  const canSubmit =
    form.name.trim().length > 0 &&
    form.callbackUrl.startsWith("https://") &&
    form.secret.length >= 16 &&
    !registerMut.isPending;

  if (authLoading || (isAdmin && isLoading)) return <TaoSpinner fullPage size={72} />;

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f0ebe3]">
        <Card className="max-w-md p-8 text-center">
          <h2 className="text-2xl font-bold text-[#1a472a] mb-4">Login Required</h2>
          <p className="text-[#1a472a]/80 mb-6">Sign in as an admin to manage governance forks.</p>
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
          <p className="text-[#1a472a]/80">This page is for platform admins only.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f0ebe3]">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#1a472a] to-[#2d5a3d] text-white py-4 md:py-6">
        <div className="container px-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3 md:gap-4">
              <Link href="/admin" className="text-white/80 hover:text-white" aria-label="Back to admin dashboard">
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <GitFork className="w-8 h-8 md:w-10 md:h-10 flex-shrink-0" />
              <div>
                <h1 className="text-xl md:text-3xl font-bold" style={{ fontFamily: "var(--font-display)" }}>
                  Governance Forks
                </h1>
                <p className="text-white/85 text-sm md:text-base">
                  Village platforms this hub relays on-chain vote outcomes to
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                onClick={() => flushMut.mutate()}
                disabled={flushMut.isPending}
                variant="outline"
                className="border-[#7dd87d]/60 text-[#7dd87d] hover:bg-[#7dd87d]/20 hover:text-[#7dd87d] text-xs md:text-sm"
              >
                {flushMut.isPending
                  ? <Loader2 className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2 animate-spin" />
                  : <RefreshCw className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />}
                Flush queue
              </Button>
              <Button
                size="sm"
                onClick={() => (showCreate ? closeForm() : setShowCreate(true))}
                aria-expanded={showCreate}
                className="bg-[#7dd87d] text-[#1a472a] hover:bg-[#a8e6a8] font-semibold text-xs md:text-sm"
              >
                <Plus className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
                Register fork
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container px-4 py-6 space-y-6 max-w-4xl">
        {/* Register form */}
        {showCreate && (
          <Card className="bg-white border border-[#1a472a]/10">
            <CardHeader>
              <CardTitle className="text-[#1a472a] flex items-center gap-2" style={{ fontFamily: "var(--font-display)" }}>
                <Plus className="w-5 h-5" />
                Register a fork
              </CardTitle>
              <CardDescription className="mt-1 text-[#1a472a]/70">
                The founder sets the same secret as GOVERNANCE_HUB_SECRET on their platform; the relay signs every
                delivery with it. Their callback is https://&lt;their-domain&gt;/api/webhooks/mechanics-governance.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="fork-name" className="text-[#1a472a]">Name</Label>
                  <Input
                    id="fork-name"
                    className={FIELD_CLASS}
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    placeholder="Amora"
                    maxLength={120}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="fork-instance" className="text-[#1a472a]">Instance id (optional)</Label>
                  <Input
                    id="fork-instance"
                    className={FIELD_CLASS}
                    value={form.instanceId}
                    onChange={(e) => setForm((f) => ({ ...f, instanceId: e.target.value }))}
                    placeholder="amora.regencivics.earth"
                    maxLength={80}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="fork-callback" className="text-[#1a472a]">Callback URL</Label>
                <Input
                  id="fork-callback"
                  className={FIELD_CLASS}
                  value={form.callbackUrl}
                  onChange={(e) => setForm((f) => ({ ...f, callbackUrl: e.target.value }))}
                  placeholder="https://amora.regencivics.earth/api/webhooks/mechanics-governance"
                  aria-invalid={callbackInvalid || undefined}
                  aria-describedby={callbackInvalid ? "fork-callback-error" : undefined}
                />
                {callbackInvalid && (
                  <p id="fork-callback-error" role="alert" className="text-xs text-red-600">
                    Fork callbacks must be https
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="fork-secret" className="text-[#1a472a]">Shared secret</Label>
                <Input
                  id="fork-secret"
                  className={FIELD_CLASS}
                  type="password"
                  value={form.secret}
                  onChange={(e) => setForm((f) => ({ ...f, secret: e.target.value }))}
                  placeholder="At least 16 characters"
                  autoComplete="new-password"
                  aria-invalid={secretInvalid || undefined}
                  aria-describedby={secretInvalid ? "fork-secret-error" : undefined}
                />
                {secretInvalid && (
                  <p id="fork-secret-error" role="alert" className="text-xs text-red-600">
                    Use at least 16 characters — this signs governance outcomes ({form.secret.length}/16)
                  </p>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() =>
                    registerMut.mutate({
                      name: form.name.trim(),
                      callbackUrl: form.callbackUrl.trim(),
                      secret: form.secret,
                      instanceId: form.instanceId.trim() || undefined,
                    })
                  }
                  disabled={!canSubmit}
                  className="bg-[#7dd87d] hover:bg-[#9de89d] text-[#1a472a] font-semibold"
                >
                  {registerMut.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Register
                </Button>
                <Button variant="outline" className={OUTLINE_BTN} onClick={closeForm}>
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Roster */}
        {forksError ? (
          <SectionError message="Could not load the fork roster — this is an error, not an empty roster." onRetry={() => refetchForks()} />
        ) : forks.length === 0 ? (
          <div className="p-8 text-center text-[#1a472a]/75">
            <GitFork className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p>No forks registered yet</p>
            <p className="text-sm mt-1">
              When a village forks the platform, register its callback here and outcomes start flowing.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {forks.map((fork) => (
              <Card key={fork.id} className="bg-white border border-[#1a472a]/10">
                <CardContent className="p-4 space-y-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-[#1a472a]">{fork.name}</span>
                        {fork.instanceId && (
                          <span className="text-xs text-[#1a472a]/60">{fork.instanceId}</span>
                        )}
                        {!fork.active && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                            paused
                          </span>
                        )}
                      </div>
                      <p className="text-xs font-mono text-[#1a472a]/75 truncate mt-1" title={fork.callbackUrl}>
                        {fork.callbackUrl}
                      </p>
                      <p className="text-xs text-[#1a472a]/60 mt-1">
                        secret {fork.secretLast4}
                        {fork.lastRelayAt ? (
                          <span title={new Date(fork.lastRelayAt).toLocaleString()}>
                            {" · last relay "}{formatRelativeTime(new Date(fork.lastRelayAt))}
                            {fork.lastStatus ? ` (${fork.lastStatus})` : ""}
                          </span>
                        ) : (
                          " · no relays yet"
                        )}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1.5">
                        <Switch
                          id={`fork-active-${fork.id}`}
                          checked={fork.active}
                          onCheckedChange={(checked) => setActiveMut.mutate({ id: fork.id, active: checked })}
                          disabled={setActiveMut.isPending}
                        />
                        <Label htmlFor={`fork-active-${fork.id}`} className="text-xs text-[#1a472a]/80">
                          Active
                        </Label>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className={`text-xs ${OUTLINE_BTN}`}
                        aria-expanded={openForkId === fork.id}
                        aria-label={`Deliveries for ${fork.name}`}
                        onClick={() => setOpenForkId((v) => (v === fork.id ? null : fork.id))}
                      >
                        {openForkId === fork.id
                          ? <ChevronUp className="w-3.5 h-3.5 mr-1" aria-hidden="true" />
                          : <ChevronDown className="w-3.5 h-3.5 mr-1" aria-hidden="true" />}
                        Deliveries
                      </Button>
                    </div>
                  </div>

                  {/* Deliveries drill-down */}
                  {openForkId === fork.id && (
                    <div className="border-t border-[#1a472a]/10 pt-3">
                      {deliveriesLoading ? (
                        <div className="flex items-center justify-center py-6">
                          <Loader2 className="w-5 h-5 animate-spin text-[#1a472a]/80" />
                        </div>
                      ) : deliveriesError ? (
                        <SectionError message="Could not load deliveries for this fork." onRetry={() => refetchDeliveries()} />
                      ) : deliveries.length === 0 ? (
                        <p className="text-center text-[#1a472a]/70 text-sm py-4">
                          No outcomes relayed to this fork yet.
                        </p>
                      ) : (
                        <div className="space-y-1.5">
                          {deliveries.map((d) => {
                            const state = deliveryState(d);
                            return (
                              <div
                                key={d.id}
                                className="flex flex-wrap items-center gap-2 text-xs rounded-lg border border-[#1a472a]/10 px-3 py-2"
                              >
                                <span className="font-mono text-[#1a472a]">[gm:{d.marker}]</span>
                                <span
                                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-medium ${
                                    d.outcome === "passed" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-700"
                                  }`}
                                >
                                  {d.outcome === "passed"
                                    ? <CheckCircle2 className="w-3 h-3" aria-hidden="true" />
                                    : <XCircle className="w-3 h-3" aria-hidden="true" />}
                                  {d.outcome}
                                </span>
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full font-medium ${state.classes}`}>
                                  {state.label}
                                </span>
                                <span className="text-[#1a472a]/70">
                                  {d.attempts} attempt{d.attempts === 1 ? "" : "s"}
                                </span>
                                {d.deliveredAt ? (
                                  <span
                                    className="text-[#1a472a]/70"
                                    title={new Date(d.deliveredAt).toLocaleString()}
                                  >
                                    <Clock className="w-3 h-3 inline mr-0.5" aria-hidden="true" />
                                    {formatRelativeTime(new Date(d.deliveredAt))}
                                  </span>
                                ) : d.lastError ? (
                                  <span className="text-red-600 truncate max-w-[16rem]" title={d.lastError}>
                                    {d.lastError}
                                  </span>
                                ) : null}
                                {d.basescanUrl && (
                                  <a
                                    href={d.basescanUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    aria-label={`Transaction for gm:${d.marker} on Basescan (opens in a new tab)`}
                                    className="text-[#1a472a] underline inline-flex items-center gap-0.5 ml-auto"
                                  >
                                    tx <ExternalLink className="w-3 h-3" aria-hidden="true" />
                                  </a>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <p className="text-xs text-[#1a472a]/60">
          Deliveries retry automatically with backoff (5 min doubling, capped at 6 h) on every incoming on-chain
          event. "Flush queue" retries everything whose backoff has elapsed; rows still inside their window are
          reported as waiting, not silently skipped.
        </p>
      </div>
    </div>
  );
}
