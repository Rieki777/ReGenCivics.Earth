/**
 * <VoicePicker> - lets a member choose which voice one of the speaking agents
 * uses.
 *
 * The list leads with the curated Kokoro voices (natural voices generated in
 * the browser, the same five everywhere), then any hosted signature voices the
 * server offers for this persona, and keeps the device's own voices as a
 * fallback group when the Kokoro engine can't run here or an old device-voice
 * choice is still active. Voices matching the character's gender sort first
 * and provide the default; every voice stays choosable.
 *
 * The choice is remembered per persona on this device. It renders nothing only
 * when nothing here can speak at all.
 */
import { useMemo } from "react";
import { Volume2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc";
import type { VoiceGender } from "@shared/voices";
import {
  useAvailableVoices, useKokoroEngineState, useSpeech, useVoicePreference, speechSynthesisSupported,
} from "./useVoice";
import { curatedVoicesFor, defaultVoiceFor, kokoroSupported } from "./kokoroVoices";
import { isHostedVoiceId, HOSTED_PREFIX } from "./hostedVoices";

/** Strip the noisy platform suffixes so a device voice reads like a name. */
function deviceVoiceLabel(v: SpeechSynthesisVoice): string {
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
  const deviceVoices = useAvailableVoices();
  const [preferred, setPreferred] = useVoicePreference(personaKey);
  const engine = useKokoroEngineState();
  const { speak } = useSpeech(false, { gender, voiceURI: preferred });

  // Signature character voices, present only when the server is configured.
  const hosted = trpc.companion.voices.useQuery({ persona: personaKey }, { staleTime: 300_000 });
  const hostedVoices = hosted.data ?? [];

  const curated = useMemo(() => curatedVoicesFor(gender), [gender]);
  const fallbackVoice = defaultVoiceFor(gender);

  // The device group only appears when it is genuinely needed: the engine
  // can't run here, or the member's saved choice is still a device voice.
  const legacySelected = Boolean(preferred) && !preferred!.startsWith("kokoro:") && !isHostedVoiceId(preferred!);
  const showDeviceGroup = (engine === "failed" || !kokoroSupported() || legacySelected) && deviceVoices.length > 0;

  const canSpeakAtAll = kokoroSupported() || speechSynthesisSupported();
  if (!canSpeakAtAll) return null;

  const selectValue = preferred ?? "";

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <label htmlFor={`voice-${personaKey}`} className="text-xs text-muted-foreground shrink-0">
        {label}
      </label>
      <select
        id={`voice-${personaKey}`}
        value={selectValue}
        onChange={(e) => setPreferred(e.target.value || null)}
        className="min-w-0 flex-1 h-9 rounded-md border bg-background px-2 text-sm"
      >
        <option value="">{`Default (${fallbackVoice.label})`}</option>
        {hostedVoices.length > 0 && (
          <optgroup label="Signature voices">
            {hostedVoices.map((v) => (
              <option key={v.id} value={`${HOSTED_PREFIX}${v.id}`}>{`${v.label} - ${v.tone}`}</option>
            ))}
          </optgroup>
        )}
        <optgroup label="Voices">
          {curated.map((v) => (
            <option key={v.id} value={v.id}>{`${v.label} - ${v.tone}`}</option>
          ))}
        </optgroup>
        {showDeviceGroup && (
          <optgroup label="This device">
            {deviceVoices.map((v) => (
              <option key={v.voiceURI} value={v.voiceURI}>{deviceVoiceLabel(v)}</option>
            ))}
          </optgroup>
        )}
      </select>
      <button
        type="button"
        onClick={() => speak(sampleText, preferred ?? undefined)}
        className="shrink-0 inline-flex items-center gap-1 rounded-md border px-2 h-9 text-xs hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffd700]"
        aria-label="Hear this voice"
      >
        <Volume2 className="w-3.5 h-3.5" aria-hidden="true" />
        Hear it
      </button>
      {engine === "loading" && (
        <span className="text-[11px] text-muted-foreground shrink-0" aria-live="polite">warming up</span>
      )}
    </div>
  );
}
