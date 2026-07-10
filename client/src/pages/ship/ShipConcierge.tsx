/**
 * /ship/concierge - The AI concierge. Warm pirate captain. Two modes:
 *  - default: intake (~10 questions) -> generates a 7-day itinerary from
 *    verified map locations -> refine by chat.
 *  - ?mode=log: the seed-chest QR flow. Log a planting (species, GPS, photo).
 */
import { useMemo, useState } from "react";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PageWrapper } from "@/components/PageWrapper";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { ShipSection, ShipEyebrow, ShipNavRow, ShipImage, useShipFlags } from "./shipShared";

const QUESTIONS: Array<{ id: string; label: string; textarea?: boolean }> = [
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

const SPECIES = ["Chestnut", "Oak / acorn", "Apple", "Pear", "Plum", "Walnut", "Hazelnut", "Elderberry", "Other saved fruit seed"];

function ItineraryView({ itinerary }: { itinerary: any }) {
  if (!itinerary?.days?.length) return null;
  return (
    <div className="space-y-4">
      {itinerary.summary && <p className="text-foreground/90 italic">{itinerary.summary}</p>}
      {itinerary.days.map((d: any) => (
        <div key={d.day} className="rounded-xl border bg-card p-4">
          <h4 className="font-semibold">Day {d.day}{d.title ? `: ${d.title}` : ""}</h4>
          {d.notes && <p className="text-sm text-foreground/80 mt-1">{d.notes}</p>}
        </div>
      ))}
    </div>
  );
}

function SeedLogMode() {
  const log = trpc.ship.seeds.log.useMutation();
  const [species, setSpecies] = useState(SPECIES[0]);
  const [notes, setNotes] = useState("");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [photoUrl, setPhotoUrl] = useState("");

  function getLocation() {
    if (!navigator.geolocation) return toast.error("Location is not available on this device.");
    navigator.geolocation.getCurrentPosition(
      (p) => { setCoords({ lat: p.coords.latitude, lng: p.coords.longitude }); toast.success("Location captured."); },
      () => toast.error("Could not read your location."),
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await log.mutateAsync({
        species,
        lat: coords?.lat,
        lng: coords?.lng,
        photoUrl: photoUrl || undefined,
        notes: notes || undefined,
      });
      toast.success("Planting logged. It joins the map once verified.");
      setNotes(""); setPhotoUrl("");
    } catch (err: any) {
      toast.error(err?.message ?? "Please sign in to log a planting.");
    }
  }

  return (
    <ShipSection>
      <ShipEyebrow>Log a planting</ShipEyebrow>
      <h1 className="text-3xl font-bold mb-3">You planted something. Tell the ship.</h1>
      <p className="text-foreground/80 mb-5">One card, one log. Every verified planting joins the treasure map for the crews who follow.</p>
      <form onSubmit={submit} className="space-y-4 max-w-lg">
        <div>
          <Label htmlFor="species">What did you plant?</Label>
          <select id="species" value={species} onChange={(e) => setSpecies(e.target.value)} className="w-full h-10 rounded-md border bg-background px-3">
            {SPECIES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <Label>Where?</Label>
          <div className="flex items-center gap-3">
            <Button type="button" variant="outline" onClick={getLocation}>Use my location</Button>
            {coords && <span className="text-sm text-muted-foreground">{coords.lat.toFixed(4)}, {coords.lng.toFixed(4)}</span>}
          </div>
        </div>
        <div>
          <Label htmlFor="photo">Photo URL (optional)</Label>
          <Input id="photo" value={photoUrl} onChange={(e) => setPhotoUrl(e.target.value)} placeholder="https://…" />
        </div>
        <div>
          <Label htmlFor="pnotes">Notes (optional)</Label>
          <Textarea id="pnotes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} maxLength={1000} />
        </div>
        <Button type="submit" disabled={log.isPending} className="bg-[#2f5d3a] hover:bg-[#264a2f]">{log.isPending ? "Logging…" : "Log this planting"}</Button>
      </form>
    </ShipSection>
  );
}

export default function ShipConcierge() {
  const mode = useMemo(() => new URLSearchParams(window.location.search).get("mode"), []);
  const flags = useShipFlags();
  const start = trpc.ship.concierge.start.useMutation();
  const generate = trpc.ship.concierge.generate.useMutation();
  const chat = trpc.ship.concierge.chat.useMutation();

  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [itinerary, setItinerary] = useState<any>(null);
  const [messages, setMessages] = useState<Array<{ role: string; content: string }>>([]);
  const [chatInput, setChatInput] = useState("");

  if (mode === "log") {
    return (
      <PageWrapper>
        <SEO title="Log a Planting" description="Log a seed planting aboard the ReGen Ship." url="/ship/concierge" />
        <ShipNavRow />
        <SeedLogMode />
      </PageWrapper>
    );
  }

  async function generateItinerary(e: React.FormEvent) {
    e.preventDefault();
    try {
      const filled = Object.fromEntries(Object.entries(answers).filter(([, v]) => v?.trim()));
      const s = await start.mutateAsync({ answers: filled });
      const sid = s.id as number;
      setSessionId(sid);
      const res = await generate.mutateAsync({ sessionId: sid });
      setItinerary(res.itinerary);
      toast.success("Your treasure map is charted.");
    } catch (err: any) {
      toast.error(err?.message ?? "The concierge could not chart the map just now.");
    }
  }

  async function sendChat(e: React.FormEvent) {
    e.preventDefault();
    if (!sessionId || !chatInput.trim()) return;
    const mine = chatInput;
    setChatInput("");
    setMessages((m) => [...m, { role: "user", content: mine }]);
    try {
      const res = await chat.mutateAsync({ sessionId, message: mine });
      setMessages(res.messages);
    } catch (err: any) {
      toast.error(err?.message ?? "The concierge is quiet just now.");
    }
  }

  return (
    <PageWrapper>
      <SEO title="The Ship's Concierge" description="Ahoy. Let the ship chart your voyage through Cascadia." url="/ship/concierge" />
      <ShipNavRow />
      <ShipSection>
        <div className="grid md:grid-cols-[1fr_2fr] gap-6 items-start mb-6">
          <div className="aspect-square max-w-[220px]"><ShipImage name="ship-concierge-captain.jpg" alt="The ship's regenerative pirate captain." className="h-full" /></div>
          <div>
            <ShipEyebrow>The concierge</ShipEyebrow>
            <h1 className="text-3xl font-bold mb-2">Ahoy, welcome aboard</h1>
            <p className="text-foreground/80">Answer a few questions and I will chart a voyage for you, drawn only from the real places on the treasure map.</p>
            {!flags.concierge && <p className="text-sm text-amber-700 dark:text-amber-400 mt-2">The concierge is not aboard yet. Check back soon, or explore the <a href="/ship/map" className="underline">treasure map</a>.</p>}
          </div>
        </div>

        {!itinerary && (
          <form onSubmit={generateItinerary} className="space-y-4 max-w-2xl">
            {QUESTIONS.map((q) => (
              <div key={q.id}>
                <Label htmlFor={q.id}>{q.label}</Label>
                {q.textarea
                  ? <Textarea id={q.id} value={answers[q.id] ?? ""} onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })} rows={2} maxLength={1000} />
                  : <Input id={q.id} value={answers[q.id] ?? ""} onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })} maxLength={1000} />}
              </div>
            ))}
            <Button type="submit" disabled={!flags.concierge || start.isPending || generate.isPending} className="bg-[#2f5d3a] hover:bg-[#264a2f]">
              {start.isPending || generate.isPending ? "Charting…" : "Chart my voyage"}
            </Button>
          </form>
        )}

        {itinerary && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold mb-3">Your treasure map</h2>
              <ItineraryView itinerary={itinerary} />
            </div>
            <div className="rounded-2xl border bg-card p-5">
              <h3 className="font-semibold mb-2">Refine it with the captain</h3>
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
      </ShipSection>
    </PageWrapper>
  );
}
