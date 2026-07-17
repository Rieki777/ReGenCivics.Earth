/**
 * <VoicePicker> - lets a member choose which voice one of the speaking agents
 * uses, from the voices their own device offers.
 *
 * The list is filtered to the character: a woman persona only offers woman
 * voices, a man only offers man voices, and neutral characters (the Fox, the
 * Lantern-Bearer) offer everything. The choice is remembered per persona on this
 * device, because voices belong to the device rather than the account.
 *
 * It renders nothing when the device has no speech synthesis or no voices, so
 * a browser without them simply never sees the control.
 */
import { useCallback } from "react";
import { Volume2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { VoiceGender } from "@shared/voices";
import { useVoiceChoices, useVoicePreference, resolveVoice, useAvailableVoices, speechSynthesisSupported } from "./useVoice";

/** Strip the noisy platform suffixes so the dropdown reads like a list of names. */
function voiceLabel(v: SpeechSynthesisVoice): string {
  const name = v.name.replace(/^(microsoft|google)\s+/i, "").replace(/\s*-\s*english.*$/i, "").trim();
  const lang = v.lang ? ` (${v.lang})` : "";
  return `${name || v.name}${lang}`;
}

export function VoicePicker({
  personaKey,
  gender,
  sampleText,
  label = "Voice",
  className,
}: {
  /** Stable key the choice is stored under, e.g. a persona id or "guide". */
  personaKey: string;
  gender: VoiceGender;
  /** Spoken when the member taps Hear it. Keep it in the character's voice. */
  sampleText: string;
  label?: string;
  className?: string;
}) {
  const all = useAvailableVoices();
  const choices = useVoiceChoices(gender);
  const [preferred, setPreferred] = useVoicePreference(personaKey);

  // What is actually speaking right now, so the dropdown shows the true state
  // rather than an empty selection before the member has chosen.
  const active = resolveVoice(all, gender, preferred);

  const preview = useCallback((uri: string) => {
    if (!speechSynthesisSupported()) return;
    const voice = all.find((v) => v.voiceURI === uri);
    try {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(sampleText);
      if (voice) u.voice = voice;
      window.speechSynthesis.speak(u);
    } catch { /* nothing to do; the picker still works */ }
  }, [all, sampleText]);

  if (!speechSynthesisSupported() || choices.length === 0) return null;

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <label htmlFor={`voice-${personaKey}`} className="text-xs text-muted-foreground shrink-0">
        {label}
      </label>
      <select
        id={`voice-${personaKey}`}
        value={active?.voiceURI ?? ""}
        onChange={(e) => setPreferred(e.target.value || null)}
        className="min-w-0 flex-1 h-9 rounded-md border bg-background px-2 text-sm"
      >
        {choices.map((v) => (
          <option key={v.voiceURI} value={v.voiceURI}>{voiceLabel(v)}</option>
        ))}
      </select>
      <button
        type="button"
        onClick={() => active && preview(active.voiceURI)}
        disabled={!active}
        className="shrink-0 inline-flex items-center gap-1 rounded-md border px-2 h-9 text-xs hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffd700] disabled:opacity-50"
        aria-label="Hear this voice"
      >
        <Volume2 className="w-3.5 h-3.5" aria-hidden="true" />
        Hear it
      </button>
    </div>
  );
}
