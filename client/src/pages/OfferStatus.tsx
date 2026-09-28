/**
 * /offer#<token>: one offer, for someone who offered without an account
 * (build spec 2026-09-27, section 10.4; research R34).
 *
 * The token rides in the fragment, so no server ever receives it. App.tsx
 * moves it out of the address bar before anything else runs
 * (client/src/lib/offerStatusToken.ts); this page reads it back from memory
 * or from sessionStorage after a reload in the same tab, and asks the server
 * through POST mutations only (offerStatus.view, withdraw, reply).
 *
 * Top to bottom at 375px: the offer and its project, the steps, the
 * stewards' note, the arrival note, other needs after an ending, then
 * Withdraw (while it waits) and a note to the stewards. Linked to an
 * account, the page is read-only and points to sign-in.
 *
 * noindex, no share buttons: the page is private to whoever holds the link.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "../../../server/routers";
import { trpc } from "@/lib/trpc";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AuthDialog } from "@/components/AuthDialog";
import { ArrivalNoteView } from "@/components/crowdpool/ArrivalNoteView";
import { WithdrawOfferDialog } from "@/components/crowdpool/WithdrawOfferDialog";
import { CheckCircle2, Circle, CircleDot, Link2Off, Loader2, UserPlus } from "lucide-react";
import { LINK } from "@shared/crowdpoolCopy";
import { formatShortDay } from "@shared/crowdpoolNeedAction";
import {
  captureOfferTokenFromLocation,
  forgetOfferToken,
  readOfferToken,
} from "@/lib/offerStatusToken";

type OfferView = inferRouterOutputs<AppRouter>["offerStatus"]["view"];

/** The shape of a status token: 43 base64url characters. Anything else is a bad link, no call needed. */
export const OFFER_TOKEN_SHAPE = /^[A-Za-z0-9_-]{43}$/;

const REPLY_MAX = 1000;

/** "26 March 2027": a whole date for the link's end. */
function longDate(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
}

function lendLine(lend: OfferView["lend"]): string | null {
  if (!lend) return null;
  if (lend.from && lend.until) return LINK.lending(formatShortDay(lend.from), formatShortDay(lend.until));
  if (lend.until) return LINK.lendingUntil(formatShortDay(lend.until));
  return null;
}

function errorCode(err: unknown): string | undefined {
  return (err as { data?: { code?: string } } | null)?.data?.code;
}

function errorMessage(err: unknown, fallback: string): string {
  const m = (err as { message?: string } | null)?.message;
  return m && m.length < 300 ? m : fallback;
}

export default function OfferStatus() {
  // Normally App.tsx already took the fragment; this covers a same-tab
  // navigation to /offer#<token> after the app was running.
  const [token, setToken] = useState<string | null>(() => {
    captureOfferTokenFromLocation();
    return readOfferToken();
  });
  const wellFormed = !!token && OFFER_TOKEN_SHAPE.test(token);

  // Opening another offer link while this page is open is a fragment change
  // on the same document: no reload, so App.tsx never sees it. Take the new
  // token out of the address the moment it arrives and show that offer.
  useEffect(() => {
    const onHash = () => {
      if (!captureOfferTokenFromLocation()) return;
      const next = readOfferToken();
      setView(null);
      setLoadError(null);
      setState(next && OFFER_TOKEN_SHAPE.test(next) ? "loading" : "bad");
      setToken(next);
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  const viewMutation = trpc.offerStatus.view.useMutation();
  const withdrawMutation = trpc.offerStatus.withdraw.useMutation();
  const replyMutation = trpc.offerStatus.reply.useMutation();

  const [state, setState] = useState<"loading" | "ready" | "bad" | "error">(wellFormed ? "loading" : "bad");
  const [view, setView] = useState<OfferView | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [withdrawError, setWithdrawError] = useState<string | null>(null);
  const [liveMessage, setLiveMessage] = useState("");

  const [note, setNote] = useState("");
  const [noteError, setNoteError] = useState<string | null>(null);
  const [noteSent, setNoteSent] = useState(false);
  const noteRef = useRef<HTMLTextAreaElement>(null);

  const [authOpen, setAuthOpen] = useState(false);

  const load = useCallback(async () => {
    if (!token || !wellFormed) return;
    try {
      const v = await viewMutation.mutateAsync({ token });
      setView(v);
      setState("ready");
    } catch (err) {
      if (errorCode(err) === "NOT_FOUND") {
        forgetOfferToken();
        setState("bad");
      } else {
        setLoadError(errorMessage(err, LINK.loadFailed));
        setState("error");
      }
    }
    // viewMutation's identity changes each render; token changes only on a new link.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, wellFormed]);

  useEffect(() => {
    if (wellFormed) void load();
    else forgetOfferToken();
  }, [load, wellFormed]);

  const confirmWithdraw = async () => {
    if (!token) return;
    setWithdrawError(null);
    try {
      await withdrawMutation.mutateAsync({ token });
      setWithdrawOpen(false);
      setLiveMessage(LINK.withdrawn);
      await load();
    } catch (err) {
      setWithdrawError(errorMessage(err, LINK.withdrawFailed));
    }
  };

  const sendNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setNoteSent(false);
    const message = note.trim();
    if (!message) {
      setNoteError(LINK.replyEmpty);
      noteRef.current?.focus();
      return;
    }
    setNoteError(null);
    try {
      await replyMutation.mutateAsync({ token, message });
      setNote("");
      setNoteSent(true);
    } catch (err) {
      setNoteError(errorMessage(err, LINK.replyFailed));
      noteRef.current?.focus();
    }
  };

  const signInReturn = view ? `${view.projectPath}#your-contributions` : "/campaigns";

  return (
    <div className="min-h-[70vh] px-4 py-10 sm:py-16">
      <SEO title="Your offer" description="Check or change an offer you made to a land project." url="/offer" noIndex />
      <div className="max-w-xl mx-auto bg-white text-[#1a472a] rounded-2xl p-5 sm:p-8 shadow-xl light-form-island min-w-0">
        <p className="sr-only" role="status" aria-live="polite">{liveMessage}</p>

        {state === "loading" && (
          <p className="flex items-center gap-2 text-[#1a472a]/85" role="status">
            <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
            {LINK.loading}
          </p>
        )}

        {state === "error" && (
          <div role="alert">
            <p className="text-[#1a472a]/90 mb-4">{loadError ?? LINK.loadFailed}</p>
            <Button onClick={() => { setState("loading"); void load(); }} className="min-h-11 bg-[#4a7c59] hover:bg-[#1a472a] text-white">
              {LINK.tryAgain}
            </Button>
          </div>
        )}

        {state === "bad" && (
          <div data-testid="offer-bad-link">
            <Link2Off className="w-8 h-8 text-[#4a7c59] mb-3" aria-hidden="true" />
            <h1 className="text-2xl font-bold mb-2" style={{ fontFamily: "var(--font-display)" }}>{LINK.badTitle}</h1>
            <p className="text-[#1a472a]/85 mb-6">{LINK.badBody}</p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button onClick={() => setAuthOpen(true)} className="min-h-11 bg-[#4a7c59] hover:bg-[#1a472a] text-white">
                <UserPlus className="w-4 h-4 mr-2" aria-hidden="true" />
                {LINK.makeAccount}
              </Button>
              <Button asChild variant="outline" className="min-h-11 border-[#4a7c59] text-[#1a472a]">
                <Link href="/campaigns">{LINK.seeLive}</Link>
              </Button>
            </div>
          </div>
        )}

        {state === "ready" && view && (
          <div className="space-y-6 min-w-0" data-testid="offer-status">
            <header className="min-w-0">
              <h1 className="text-2xl font-bold leading-tight break-words" style={{ fontFamily: "var(--font-display)" }}>
                {LINK.title(view.projectName)}
              </h1>
              <p className="mt-1 text-[#1a472a]/85 break-words">{LINK.forCampaign(view.offerTitle, view.campaignTitle)}</p>
              {lendLine(view.lend) && <p className="mt-1 text-sm text-[#1a472a]/80">{lendLine(view.lend)}</p>}
              <Link href={view.projectPath} className="inline-flex items-center min-h-11 text-[#1a472a] font-semibold underline underline-offset-2">
                {LINK.seeProject}
              </Link>
            </header>

            <section aria-labelledby="offer-steps-heading" className="min-w-0">
              <h2 id="offer-steps-heading" className="text-lg font-bold mb-2">{LINK.stepsHeading}</h2>
              <ol className="space-y-2">
                {view.steps.map((s) => (
                  <li
                    key={s.key}
                    aria-current={s.state === "current" ? "step" : undefined}
                    className={`flex items-center gap-2 text-sm ${s.state === "todo" ? "text-[#1a472a]/60" : "text-[#1a472a]"}`}
                  >
                    {s.state === "done" && <CheckCircle2 className="w-4 h-4 text-[#4a7c59] flex-shrink-0" aria-hidden="true" />}
                    {s.state === "current" && <CircleDot className="w-4 h-4 text-[#1a472a] flex-shrink-0" aria-hidden="true" />}
                    {s.state === "todo" && <Circle className="w-4 h-4 flex-shrink-0" aria-hidden="true" />}
                    <span className={`min-w-0 break-words ${s.state === "current" ? "font-semibold" : ""}`}>{s.label}</span>
                    {s.state === "done" && (
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[#f0f7f0] text-[#1a472a]">{LINK.stepDone}</span>
                    )}
                    {s.state === "current" && (
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[#1a472a] text-white">{LINK.stepNow}</span>
                    )}
                  </li>
                ))}
              </ol>
              <p className="mt-3 text-[#1a472a]/90" data-testid="offer-step-line">{view.stepLine}</p>
            </section>

            {view.stewardNote && (
              <section className="rounded-xl bg-[#f0f7f0] p-4 min-w-0">
                <h2 className="font-bold mb-1">{LINK.stewardNote}</h2>
                <p className="text-sm text-[#1a472a]/90 break-words whitespace-pre-wrap">{view.stewardNote}</p>
              </section>
            )}

            <ArrivalNoteView note={view.arrivalNote} headingLevel={2} />

            {view.otherNeeds.length > 0 && (
              <section className="min-w-0">
                <h2 className="font-bold mb-2">{LINK.othersHeading}</h2>
                <ul className="space-y-1">
                  {view.otherNeeds.map((n) => (
                    <li key={n.path} className="min-w-0">
                      <Link href={n.path} className="inline-flex min-h-11 items-center text-[#1a472a] underline underline-offset-2 break-words">
                        {LINK.otherNeed(n.verb, n.title, n.projectName)}
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {view.canWithdraw && (
              <div>
                <Button
                  variant="outline"
                  onClick={() => { setWithdrawError(null); setWithdrawOpen(true); }}
                  className="w-full sm:w-auto min-h-11 border-[#1a472a]/40 text-[#1a472a]"
                >
                  {LINK.withdraw}
                </Button>
              </div>
            )}

            {view.canReply && (
              <form onSubmit={sendNote} className="space-y-2 min-w-0" noValidate>
                <Label htmlFor="offer-note" className="text-base font-bold text-[#1a472a]">{LINK.replyLabel}</Label>
                <p id="offer-note-help" className="text-sm text-[#1a472a]/80">{LINK.replyHelp}</p>
                <Textarea
                  id="offer-note"
                  ref={noteRef}
                  value={note}
                  maxLength={REPLY_MAX}
                  onChange={(e) => { setNote(e.target.value); setNoteSent(false); }}
                  aria-describedby={noteError ? "offer-note-help offer-note-error" : "offer-note-help"}
                  aria-invalid={noteError ? true : undefined}
                  rows={4}
                  className="bg-white text-base md:text-sm"
                />
                {noteError && (
                  <p id="offer-note-error" role="alert" className="text-sm text-red-700">{noteError}</p>
                )}
                <p className="text-sm text-[#1a472a]" aria-live="polite">{noteSent ? LINK.replySent : ""}</p>
                <Button
                  type="submit"
                  disabled={replyMutation.isPending}
                  className="w-full sm:w-auto min-h-11 bg-[#1a472a] hover:bg-[#0f2e1a] text-white"
                >
                  {replyMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" aria-hidden="true" />}
                  {LINK.replySend}
                </Button>
              </form>
            )}

            {view.linkedToAccount ? (
              <div className="rounded-xl border border-[#4a7c59]/30 bg-[#f0f7f0] p-4 space-y-3" data-testid="offer-linked">
                <p className="text-sm text-[#1a472a]">{LINK.linked}</p>
                <Button onClick={() => setAuthOpen(true)} className="w-full sm:w-auto min-h-11 bg-[#4a7c59] hover:bg-[#1a472a] text-white">
                  {LINK.signIn}
                </Button>
              </div>
            ) : (
              <div className="rounded-xl border border-[#4a7c59]/30 bg-[#f0f7f0] p-4 space-y-3">
                <p className="text-sm text-[#1a472a]">{LINK.makeAccountLead}</p>
                <Button onClick={() => setAuthOpen(true)} className="w-full sm:w-auto min-h-11 bg-[#4a7c59] hover:bg-[#1a472a] text-white">
                  <UserPlus className="w-4 h-4 mr-2" aria-hidden="true" />
                  {LINK.makeAccount}
                </Button>
              </div>
            )}

            {longDate(view.expiresAt) && (
              <p className="text-xs text-[#1a472a]/75">{LINK.expiresOn(longDate(view.expiresAt))}</p>
            )}
          </div>
        )}
      </div>

      <WithdrawOfferDialog
        open={withdrawOpen}
        onOpenChange={setWithdrawOpen}
        onConfirm={confirmWithdraw}
        pending={withdrawMutation.isPending}
        error={withdrawError}
      />
      <AuthDialog
        open={authOpen}
        onOpenChange={setAuthOpen}
        onLogin={() => setAuthOpen(false)}
        returnTo={signInReturn}
      />
    </div>
  );
}
