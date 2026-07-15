/**
 * The First Mate: the ship's voyage-planning companion. One shared planner used
 * by the full page (/ship/concierge) and by the compact drawer on the treasure
 * map. Intake answers -> a 7-day itinerary drawn only from verified map places
 * -> refine by chat. When an itinerary lands, the host decides what to do with
 * it (the map draws it live as a route and shares the "My voyage" state).
 *
 * The route path stays /ship/concierge and the tRPC namespace stays
 * ship.concierge; only the persona name changed to the First Mate (2026-07-10).
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { FormCompanion } from "@/components/companion";

export const FIRST_MATE_GREETING =
  "Ahoy. I'm your First Mate. Tell me who you are and I'll chart your voyage.";

/** The whole treasure map is community-grown, so the intro says so. */
export const FIRST_MATE_INTRO =
  "Answer a few questions and I will chart a voyage for you, drawn only from the real places on the treasure map. The map is community-grown and always growing, so there is more here every week: springs, food forests, land projects, events, and the new kinds of places crews keep adding.";

export type ItineraryDay = { day: number; title?: string; notes?: string; locationIds?: number[] };
export type Itinerary = { summary?: string; days?: ItineraryDay[] };

export const FIRST_MATE_QUESTIONS: Array<{ id: string; label: string; textarea?: boolean }> = [
  { id: "pace", label: "What pace do you want? Restful, balanced, or full days?" },
  { id: "activity", label: "How much physical activity do you want? Hiking, paddling, biking, service work?" },
  { id: "springs", label: "How much do you want to seek out springs and wild water?" },
  { id: "food_forests", label: "How drawn are you to food forests and planting?" },
  { id: "events", label: "Do you want to catch land project events or workshops on your route?" },
  { id: "spiritual", label: "Any spiritual practice you want time and space for?" },
  { id: "skills", label: "What skills could you gift the land projects you visit?", textarea: true },
  { id: "diet", label: "Any diet details within the vegan commitment we should know?" },
  { id: "must_sees", label: "Any must-see places already on your list?" },
  { id: "group", label: "Who is your crew? Tell us about your group." },
];

export function ItineraryView({ itinerary }: { itinerary: Itinerary | null }) {
  if (!itinerary?.days?.length) return null;
  return (
    <div className="space-y-4">
      {itinerary.summary && <p className="text-foreground/90 italic">{itinerary.summary}</p>}
      {itinerary.days.map((d) => (
        <div key={d.day} className="rounded-xl border bg-card p-4">
          <h4 className="font-semibold">Day {d.day}{d.title ? `: ${d.title}` : ""}</h4>
          {d.notes && <p className="text-sm text-foreground/80 mt-1">{d.notes}</p>}
        </div>
      ))}
    </div>
  );
}

/**
 * The First Mate quick customization: the brief pre-booking pass used by the
 * suggested voyages on /ship/book. Seed answers go in (voyage, dates, pace,
 * voyage_nights), she charts an itinerary from the real treasure map on mount,
 * and the guest refines it by chat. The full planner (/ship/concierge) stays the
 * longer pass after booking. Remount (key) to re-chart for a new selection.
 */
export function FirstMateQuickCustomize({ seedAnswers }: { seedAnswers: Record<string, string> }) {
  const start = trpc.ship.concierge.start.useMutation();
  const generate = trpc.ship.concierge.generate.useMutation();
  const chat = trpc.ship.concierge.chat.useMutation();

  const [sessionId, setSessionId] = useState<number | null>(null);
  // The session capability minted at start; every later call carries it so
  // session ids alone grant nothing (server: assertConciergeAccess).
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [itinerary, setItinerary] = useState<Itinerary | null>(null);
  const [messages, setMessages] = useState<Array<{ role: string; content: string }>>([]);
  const [chatInput, setChatInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const startedRef = useRef(false);

  const begin = useCallback(async () => {
    setError(null);
    try {
      const s = await start.mutateAsync({ answers: seedAnswers });
      const sid = s.id as number;
      setSessionId(sid);
      setSessionToken(s.token ?? null);
      const res = await generate.mutateAsync({ sessionId: sid, token: s.token ?? undefined });
      setItinerary(res.itinerary as Itinerary);
    } catch (err: any) {
      setError(err?.message ?? "The First Mate could not chart just now. Try again in a moment.");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seedAnswers]);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    void begin();
  }, [begin]);

  // No <form> here on purpose: this component can live inside the booking form
  // on /ship/book, and nested forms misfire. Enter and the Send button both call
  // this directly.
  async function sendChat() {
    if (!sessionId || !chatInput.trim()) return;
    const mine = chatInput;
    setChatInput("");
    setMessages((m) => [...m, { role: "user", content: mine }]);
    try {
      const res = await chat.mutateAsync({ sessionId, message: mine, token: sessionToken ?? undefined });
      setMessages(res.messages);
    } catch (err: any) {
      toast.error(err?.message ?? "The First Mate is quiet just now.");
    }
  }

  if (error) {
    return (
      <div className="rounded-2xl border bg-card p-5">
        <p className="text-sm text-foreground/80">{error}</p>
        <Button type="button" onClick={() => void begin()} className="mt-3 bg-[#2f5d3a] hover:bg-[#264a2f]">
          Chart it again
        </Button>
      </div>
    );
  }

  if (!itinerary) {
    return (
      <div className="rounded-2xl border bg-card p-5">
        <p className="text-sm text-foreground/80 animate-pulse motion-reduce:animate-none">
          Your First Mate is charting your voyage from the treasure map…
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="max-h-80 overflow-y-auto pr-1">
        <ItineraryView itinerary={itinerary} />
      </div>
      <div className="rounded-2xl border bg-card p-5">
        <h4 className="font-semibold mb-2">Tell her what to change</h4>
        <div className="space-y-2 mb-3 max-h-64 overflow-y-auto">
          {messages.map((m, i) => (
            <div key={i} className={m.role === "user" ? "text-right" : ""}>
              <span className={`inline-block px-3 py-2 rounded-lg text-sm ${m.role === "user" ? "bg-[#2f5d3a] text-white" : "bg-muted"}`}>{m.content}</span>
            </div>
          ))}
          {chat.isPending && <span className="inline-block px-3 py-2 rounded-lg text-sm bg-muted text-muted-foreground">…</span>}
        </div>
        <div className="flex gap-2">
          <Input
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void sendChat();
              }
            }}
            placeholder="More rest days, a waterfall, a service day…"
            maxLength={1000}
            enterKeyHint="send"
            aria-label="Tell the First Mate what to change"
          />
          <Button type="button" onClick={() => void sendChat()} disabled={chat.isPending} className="bg-[#2f5d3a] hover:bg-[#264a2f]">Send</Button>
        </div>
        <p className="text-xs text-muted-foreground mt-2">This is the quick pass. After you book, the full First Mate session charts every day with you.</p>
      </div>
    </div>
  );
}

/**
 * The First Mate planner. Holds the intake -> generate -> chat flow. `onItinerary`
 * fires whenever a fresh itinerary is charted so the host can draw it on the map.
 * `compact` tightens the layout for the map drawer.
 */
export function FirstMatePlanner({
  conciergeAboard,
  onItinerary,
  compact = false,
}: {
  conciergeAboard: boolean;
  onItinerary?: (itinerary: Itinerary) => void;
  compact?: boolean;
}) {
  const start = trpc.ship.concierge.start.useMutation();
  const generate = trpc.ship.concierge.generate.useMutation();
  const chat = trpc.ship.concierge.chat.useMutation();

  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [sessionId, setSessionId] = useState<number | null>(null);
  // The session capability minted at start; every later call carries it so
  // session ids alone grant nothing (server: assertConciergeAccess).
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [itinerary, setItinerary] = useState<Itinerary | null>(null);
  const [messages, setMessages] = useState<Array<{ role: string; content: string }>>([]);
  const [chatInput, setChatInput] = useState("");

  const busy = start.isPending || generate.isPending;
  const submitRef = useRef<HTMLDivElement | null>(null);

  async function generateItinerary(e: React.FormEvent) {
    e.preventDefault();
    try {
      const filled = Object.fromEntries(Object.entries(answers).filter(([, v]) => v?.trim()));
      const s = await start.mutateAsync({ answers: filled });
      const sid = s.id as number;
      setSessionId(sid);
      setSessionToken(s.token ?? null);
      const res = await generate.mutateAsync({ sessionId: sid, token: s.token ?? undefined });
      setItinerary(res.itinerary as Itinerary);
      onItinerary?.(res.itinerary as Itinerary);
      toast.success("Your treasure map is charted.");
    } catch (err: any) {
      toast.error(err?.message ?? "The First Mate could not chart the map just now.");
    }
  }

  async function sendChat(e: React.FormEvent) {
    e.preventDefault();
    if (!sessionId || !chatInput.trim()) return;
    const mine = chatInput;
    setChatInput("");
    setMessages((m) => [...m, { role: "user", content: mine }]);
    try {
      const res = await chat.mutateAsync({ sessionId, message: mine, token: sessionToken ?? undefined });
      setMessages(res.messages);
    } catch (err: any) {
      toast.error(err?.message ?? "The First Mate is quiet just now.");
    }
  }

  return (
    <div className={compact ? "space-y-4" : "space-y-6"}>
      {!itinerary && conciergeAboard && (
        <FormCompanion
          formId="concierge-intake"
          collected={answers}
          onField={(key, value) => setAnswers((a) => ({ ...a, [key]: value }))}
          onReadyForReview={() => submitRef.current?.scrollIntoView({ behavior: "smooth", block: "center" })}
        />
      )}
      {!itinerary && (
        <form onSubmit={generateItinerary} className={compact ? "space-y-3" : "space-y-4 max-w-2xl"}>
          {FIRST_MATE_QUESTIONS.map((q) => (
            <div key={q.id}>
              <Label htmlFor={`fm-${q.id}`} className={compact ? "text-sm" : undefined}>{q.label}</Label>
              {q.textarea
                ? <Textarea id={`fm-${q.id}`} value={answers[q.id] ?? ""} onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })} rows={2} maxLength={1000} />
                : <Input id={`fm-${q.id}`} value={answers[q.id] ?? ""} onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })} maxLength={1000} />}
            </div>
          ))}
          <div ref={submitRef}>
            <Button type="submit" disabled={!conciergeAboard || busy} className="bg-[#2f5d3a] hover:bg-[#264a2f]">
              {busy ? "Charting…" : "Chart my voyage"}
            </Button>
          </div>
        </form>
      )}

      {itinerary && (
        <div className="space-y-6">
          <div>
            <h3 className="text-xl font-bold mb-3">Your treasure map</h3>
            <ItineraryView itinerary={itinerary} />
          </div>
          <div className="rounded-2xl border bg-card p-5">
            <h4 className="font-semibold mb-2">Refine it with the First Mate</h4>
            <div className="space-y-2 mb-3 max-h-64 overflow-y-auto">
              {messages.map((m, i) => (
                <div key={i} className={m.role === "user" ? "text-right" : ""}>
                  <span className={`inline-block px-3 py-2 rounded-lg text-sm ${m.role === "user" ? "bg-[#2f5d3a] text-white" : "bg-muted"}`}>{m.content}</span>
                </div>
              ))}
            </div>
            <form onSubmit={sendChat} className="flex gap-2">
              <Input value={chatInput} onChange={(e) => setChatInput(e.target.value)} placeholder="Ask for more rest days, a waterfall, a service day…" maxLength={1000} />
              <Button type="submit" disabled={chat.isPending} className="bg-[#2f5d3a] hover:bg-[#264a2f]">Send</Button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
