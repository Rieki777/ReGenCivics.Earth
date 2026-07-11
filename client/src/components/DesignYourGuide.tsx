/**
 * Design your Guide: the one-time (revisitable) moment where a member makes the
 * general ReGen Guide their own. Name it, pick its face from four painterly
 * archetypes, pick a tone, and turn voice on or off. Saved to
 * user_guide_preferences via the guide router, then used everywhere the Guide
 * appears.
 *
 * The Guide's forum/governance behavior (ADR-23) is a separate system and is not
 * affected by anything chosen here.
 */
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { Volume2, VolumeX, Check } from "lucide-react";
import {
  GUIDE_ARCHETYPES, GUIDE_TONES, guidePortraitUrl,
  DEFAULT_GUIDE_PORTRAIT_KEY, DEFAULT_GUIDE_TONE,
  type GuideTone,
} from "@shared/guide";

export function DesignYourGuide({
  open,
  onOpenChange,
  existing,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  existing?: { guideName?: string; portraitKey?: string; tone?: string; voiceEnabled?: boolean } | null;
  onSaved?: () => void;
}) {
  const save = trpc.guide.save.useMutation();
  const [name, setName] = useState(existing?.guideName ?? "");
  const [portraitKey, setPortraitKey] = useState(existing?.portraitKey ?? DEFAULT_GUIDE_PORTRAIT_KEY);
  const [tone, setTone] = useState<GuideTone>((existing?.tone as GuideTone) ?? DEFAULT_GUIDE_TONE);
  const [voiceEnabled, setVoiceEnabled] = useState(existing?.voiceEnabled ?? false);

  async function submit() {
    const trimmed = name.trim();
    if (trimmed.length < 1) {
      toast.error("Give your Guide a name first.");
      return;
    }
    try {
      await save.mutateAsync({ guideName: trimmed, portraitKey, tone, voiceEnabled });
      toast.success(`${trimmed} is ready to walk with you.`);
      onOpenChange(false);
      onSaved?.();
    } catch (err: any) {
      toast.error(err?.message ?? "Could not save your Guide.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Design your Guide</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Your Guide is yours. Give it a name, a face, and a way of talking. You can change any of this later.
        </p>

        <div className="space-y-4">
          <div>
            <Label htmlFor="guide-name">Name</Label>
            <Input id="guide-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Sage, Fern, Compass, whatever feels right" maxLength={60} />
          </div>

          <div>
            <Label className="mb-1.5 block">Face</Label>
            <div className="grid grid-cols-4 gap-2">
              {GUIDE_ARCHETYPES.map((a) => {
                const picked = a.key === portraitKey;
                return (
                  <button
                    key={a.key}
                    type="button"
                    onClick={() => setPortraitKey(a.key)}
                    aria-pressed={picked}
                    aria-label={a.label}
                    title={a.label}
                    className={cn(
                      "relative aspect-square rounded-xl overflow-hidden border-2 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7dd87d]",
                      picked ? "border-[#2f5d3a] ring-2 ring-[#7dd87d]" : "border-transparent hover:border-[#4a7c59]/50",
                    )}
                  >
                    <img src={guidePortraitUrl(a.key)} alt={a.label} className="h-full w-full object-cover" loading="lazy" />
                    {picked && (
                      <span className="absolute bottom-1 right-1 rounded-full bg-[#2f5d3a] text-white p-0.5"><Check className="w-3 h-3" /></span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <Label className="mb-1.5 block">Tone</Label>
            <div className="flex flex-wrap gap-2">
              {GUIDE_TONES.map((t) => {
                const picked = t.id === tone;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTone(t.id)}
                    aria-pressed={picked}
                    className={cn(
                      "rounded-full border px-3 py-1.5 text-sm transition-colors",
                      picked ? "border-[#2f5d3a] bg-[#4a7c59]/15 text-foreground" : "border-border text-muted-foreground hover:border-[#4a7c59]/50",
                    )}
                    title={t.blurb}
                  >
                    {t.label}
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-muted-foreground mt-1">{GUIDE_TONES.find((t) => t.id === tone)?.blurb}</p>
          </div>

          <button
            type="button"
            onClick={() => setVoiceEnabled(!voiceEnabled)}
            aria-pressed={voiceEnabled}
            className="flex items-center gap-2 text-sm rounded-lg border px-3 py-2 w-full hover:bg-muted transition-colors"
          >
            {voiceEnabled ? <Volume2 className="w-4 h-4 text-[#2f5d3a] dark:text-[#7dd87d]" /> : <VolumeX className="w-4 h-4 text-muted-foreground" />}
            <span className="flex-1 text-left">{voiceEnabled ? "Voice on: your Guide speaks aloud" : "Voice off: reading only"}</span>
          </button>
        </div>

        <Button onClick={submit} disabled={save.isPending} className="bg-[#2f5d3a] hover:bg-[#264a2f] mt-1">
          {save.isPending ? "Saving…" : existing?.guideName ? "Save changes" : "Meet your Guide"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
