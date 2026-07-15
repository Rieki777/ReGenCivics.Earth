/**
 * Ask the Shipwright — the ship maintainer AI surface (SHIP_MAINTAINER_INVENTORY
 * Section 1.4). A calm question box for maintenance and operation questions.
 * Dangerous systems (propane, brakes, steering, air, burning, fire, CO) are
 * detected server-side and answered with make-safe steps only; the reply banner
 * turns to a warning and points to the Keeper.
 *
 * Photos: a voyager can snap up to 4 pictures of what she's doing (capture
 * opens the phone camera on mobile). They upload through files.upload to the
 * asset domain, and the server passes only our own asset URLs to the model,
 * which actually sees them.
 */
import { useRef, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Wrench, AlertTriangle, Camera, X, Loader2 } from "lucide-react";

const SYSTEMS = [
  { value: "general", label: "Not sure / general" },
  { value: "slides", label: "Slide-outs" },
  { value: "generator", label: "Generator" },
  { value: "plumbing", label: "Water + tanks" },
  { value: "water_filtration", label: "Water filtration" },
  { value: "electrical", label: "Electrical" },
  { value: "appliances", label: "Appliances" },
  { value: "starlink", label: "Starlink" },
  { value: "hvac", label: "Heat + air" },
  { value: "tires_brakes", label: "Tires" },
  { value: "engine", label: "Engine" },
  { value: "chassis", label: "Chassis + leveling" },
  { value: "propane", label: "Propane" },
] as const;

const MAX_PHOTOS = 4;
const MAX_PHOTO_MB = 8;

type Turn = { role: "user" | "assistant"; content: string; escalated?: boolean; photoUrls?: string[] };

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(",")[1] ?? "");
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function AskShipwright() {
  const ask = trpc.ship.shipwright.ask.useMutation();
  const upload = trpc.files.upload.useMutation();
  const [question, setQuestion] = useState("");
  const [system, setSystem] = useState<string>("general");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [caseId, setCaseId] = useState<number | undefined>(undefined);
  const [photos, setPhotos] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  async function addPhotos(files: FileList | null) {
    if (!files?.length) return;
    setPhotoError(null);
    const room = MAX_PHOTOS - photos.length;
    const picked = Array.from(files).slice(0, room);
    if (!picked.length) {
      setPhotoError(`Up to ${MAX_PHOTOS} photos per question.`);
      return;
    }
    setUploading(true);
    try {
      const urls: string[] = [];
      for (const file of picked) {
        if (!file.type.startsWith("image/")) continue;
        if (file.size > MAX_PHOTO_MB * 1024 * 1024) {
          setPhotoError(`Each photo needs to be under ${MAX_PHOTO_MB}MB.`);
          continue;
        }
        const base64 = await fileToBase64(file);
        const res = await upload.mutateAsync({ fileName: file.name, fileData: base64, contentType: file.type });
        urls.push(res.url);
      }
      setPhotos((p) => [...p, ...urls].slice(0, MAX_PHOTOS));
    } catch {
      setPhotoError("That photo didn't upload. Try again, or just describe what you see.");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const q = question.trim();
    if (q.length < 2) return;
    const sentPhotos = photos;
    setTurns((t) => [...t, { role: "user", content: q, photoUrls: sentPhotos }]);
    setQuestion("");
    setPhotos([]);
    try {
      const res = await ask.mutateAsync({
        question: q,
        system: system as (typeof SYSTEMS)[number]["value"],
        caseId,
        ...(sentPhotos.length ? { photoUrls: sentPhotos } : {}),
      });
      setCaseId(res.caseId ?? undefined);
      setTurns((t) => [...t, { role: "assistant", content: res.reply, escalated: res.escalated }]);
    } catch (err: any) {
      setTurns((t) => [...t, { role: "assistant", content: err?.message ?? "The Shipwright could not answer just now. Log it and your Keeper will look." }]);
    }
  }

  return (
    <div className="rounded-2xl border bg-card p-5">
      <div className="flex items-center gap-2 mb-2">
        <Wrench className="w-5 h-5 text-[#9c8a7c]" aria-hidden="true" />
        <h3 className="text-lg font-semibold">Ask the Shipwright</h3>
      </div>
      <p className="text-sm text-muted-foreground mb-4">
        Something acting up? Tell the Shipwright what she's doing and she'll help you sort it. Snap a photo if it helps,
        she can see it. For anything that feels unsafe, stop and call your Keeper.
      </p>

      {turns.length > 0 && (
        <div className="space-y-3 mb-4 max-h-80 overflow-y-auto pr-1">
          {turns.map((t, i) => (
            <div key={i} className={t.role === "user" ? "text-right" : ""}>
              <div
                className={[
                  "inline-block rounded-2xl px-3 py-2 text-sm text-left max-w-[90%]",
                  t.role === "user"
                    ? "bg-[#2f5d3a] text-white"
                    : t.escalated
                      ? "bg-red-500/10 border border-red-500/40 text-foreground"
                      : "bg-muted text-foreground",
                ].join(" ")}
              >
                {t.escalated && (
                  <span className="flex items-center gap-1.5 font-semibold text-red-600 dark:text-red-400 mb-1">
                    <AlertTriangle className="w-4 h-4" aria-hidden="true" /> Make her safe first
                  </span>
                )}
                {t.photoUrls && t.photoUrls.length > 0 && (
                  <span className="flex gap-1.5 mb-1.5">
                    {t.photoUrls.map((u) => (
                      <img key={u} src={u} alt="attached" className="w-12 h-12 rounded-lg object-cover border border-white/30" loading="lazy" />
                    ))}
                  </span>
                )}
                <span className="whitespace-pre-line">{t.content}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      <form onSubmit={submit} className="space-y-3">
        <div>
          <Label htmlFor="sw-system" className="text-xs">Which system?</Label>
          <select id="sw-system" value={system} onChange={(e) => setSystem(e.target.value)} className="w-full h-11 rounded-md border bg-background px-3 text-base">
            {SYSTEMS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>
        <div>
          <Label htmlFor="sw-q" className="text-xs">What's she doing?</Label>
          <Textarea id="sw-q" value={question} onChange={(e) => setQuestion(e.target.value)} rows={3} maxLength={2000} placeholder="Describe what you're seeing or hearing." className="text-base" />
        </div>

        {photos.length > 0 && (
          <div className="flex gap-2 flex-wrap">
            {photos.map((u) => (
              <div key={u} className="relative">
                <img src={u} alt="to send" className="w-16 h-16 rounded-lg object-cover border" />
                <button
                  type="button"
                  aria-label="Remove photo"
                  onClick={() => setPhotos((p) => p.filter((x) => x !== u))}
                  className="absolute -top-1.5 -right-1.5 bg-background border rounded-full p-0.5"
                >
                  <X className="w-3 h-3" aria-hidden="true" />
                </button>
              </div>
            ))}
          </div>
        )}
        {photoError && <p className="text-xs text-red-600 dark:text-red-400">{photoError}</p>}

        <div className="flex items-center gap-2">
          <Button type="submit" disabled={ask.isPending || uploading || question.trim().length < 2} className="min-h-11 bg-[#2f5d3a] hover:bg-[#264a2f]">
            {ask.isPending ? "Asking…" : "Ask the Shipwright"}
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="environment"
            multiple
            className="hidden"
            onChange={(e) => void addPhotos(e.target.files)}
          />
          <Button
            type="button"
            variant="outline"
            className="min-h-11"
            disabled={uploading || photos.length >= MAX_PHOTOS}
            onClick={() => fileRef.current?.click()}
          >
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : <Camera className="w-4 h-4" aria-hidden="true" />}
            <span className="ml-1.5">{photos.length ? `Photos (${photos.length}/${MAX_PHOTOS})` : "Add a photo"}</span>
          </Button>
        </div>
      </form>
    </div>
  );
}
