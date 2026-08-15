/**
 * <FormCompanion> - the reusable Conversational Companion that fills any wrapped
 * form by talking. Audio-first is the site-wide default: the entry button opens
 * conversation mode straight away, and typing stays one tap away.
 *
 * How a host wires it: render <FormCompanion> above your form, pass the formId,
 * and hand it an onField callback that writes an extracted value into your form's
 * state. As the person talks, values stream into your visible fields in real
 * time, so they watch the form fill itself. The companion ends with "here's what
 * I've got" and hands back to your form for the person to confirm and submit. It
 * never submits on its own (AI-AUTOMATION-RISKS).
 *
 * Accessibility: captions always render, aria-live on the companion's messages,
 * visible focus states, and animations respect prefers-reduced-motion.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Mic, MicOff, Volume2, VolumeX, Send, X, MessageSquare } from "lucide-react";
import {
  COMPANION_FORMS, COMPANION_PERSONAS,
  type CompanionFormId,
} from "@shared/companions";
import {
  useListening, useSpeech, useSilentPreference, useVoicePreference,
  speechRecognitionSupported, mediaRecorderSupported,
} from "./useVoice";
import { VoicePicker } from "./VoicePicker";

type Turn = { role: "user" | "assistant"; content: string };

export type FormCompanionProps = {
  formId: CompanionFormId;
  /** Write an extracted value into the host form's state. */
  onField: (key: string, value: string) => void;
  /** Fired once the companion is ready for the human to review and submit. */
  onReadyForReview?: () => void;
  /**
   * Fired after every turn with the full conversation so far. Hosts that keep a
   * record (e.g. the land application saves it for reviewers) subscribe here;
   * everything else ignores it and the conversation stays ephemeral.
   */
  onTranscript?: (turns: Turn[]) => void;
  /** Trusted grounding for the form, e.g. the chosen booking week. */
  context?: string;
  /** Current host values, passed back so the companion knows what is filled. */
  collected?: Record<string, string>;
  className?: string;
};

function portraitUrl(name: string): string {
  return `/images/ship/${name}`;
}

export default function FormCompanion(props: FormCompanionProps) {
  const { formId, onField, onReadyForReview, onTranscript, context, collected, className } = props;
  const form = COMPANION_FORMS[formId];
  const persona = form ? COMPANION_PERSONAS[form.personaId] : null;

  const flags = trpc.companion.flags.useQuery(undefined, { staleTime: 60_000 });
  const turnMut = trpc.companion.turn.useMutation();
  const transcribeMut = trpc.companion.transcribe.useMutation();

  const [mode, setMode] = useState<"invitation" | "talking" | "typed">("invitation");
  const [collapsed, setCollapsed] = useState(false);
  const [transcript, setTranscript] = useState<Turn[]>([]);
  const [caption, setCaption] = useState("");
  const [typed, setTyped] = useState("");
  const [ready, setReady] = useState(false);
  const [portraitErr, setPortraitErr] = useState(false);
  const [silent, setSilent] = useSilentPreference();

  // The voice is chosen per persona and matched to the character: the First Mate
  // only ever speaks in a woman's voice, the Harbormaster in a man's.
  const personaGender = persona?.gender ?? "neutral";
  const [voiceURI] = useVoicePreference(form?.personaId ?? "companion");
  const { speak, stop: stopSpeaking, speaking } = useSpeech(silent, { gender: personaGender, voiceURI });
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const recorderRef = useRef<{ rec: any; chunks: Blob[] } | null>(null);
  const [recording, setRecording] = useState(false);

  const invitation = useMemo(() => {
    if (!persona) return "";
    const lines = persona.invitations;
    return lines[Math.floor((transcript.length + Date.now() / 1e7) % lines.length)] ?? lines[0];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [persona]);

  const sttSupported = useMemo(speechRecognitionSupported, []);
  const serverStt = Boolean(flags.data?.serverStt);
  const canVoiceInput = sttSupported || (serverStt && mediaRecorderSupported());

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [transcript, caption]);

  // Hand the running transcript to hosts that keep a record of the conversation.
  useEffect(() => {
    if (transcript.length > 0) onTranscript?.(transcript);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transcript]);

  const applyUpdates = useCallback((updates: Array<{ field: string; value: string }>) => {
    for (const u of updates) onField(u.field, u.value);
  }, [onField]);

  // Send one turn to the server, apply updates, speak the reply.
  const sendTurn = useCallback(async (history: Turn[]) => {
    try {
      const res = await turnMut.mutateAsync({
        formId,
        history,
        collected: collected ?? {},
        context,
      });
      applyUpdates(res.updates);
      setTranscript((t) => [...t, { role: "assistant", content: res.reply }]);
      speak(res.reply);
      if (res.readyForReview && !ready) {
        setReady(true);
        onReadyForReview?.();
      }
    } catch (err: any) {
      const msg = err?.message ?? "I lost the thread. Say that again, or type it below.";
      setTranscript((t) => [...t, { role: "assistant", content: msg }]);
      speak(msg);
    }
  }, [applyUpdates, collected, context, formId, onReadyForReview, ready, speak, turnMut]);

  // A completed user answer (from voice or typing).
  const submitAnswer = useCallback((text: string) => {
    const clean = text.trim();
    if (!clean) return;
    setCaption("");
    setTranscript((prev) => {
      const next = [...prev, { role: "user" as const, content: clean }];
      void sendTurn(next);
      return next;
    });
  }, [sendTurn]);

  const listening = useListening({
    onFinal: (t) => submitAnswer(t),
    onInterim: (t) => setCaption(t),
    onError: () => setCaption(""),
  });

  // Begin the conversation: greet, then open the ears (or the keyboard).
  const begin = useCallback((withVoice: boolean) => {
    if (!persona) return;
    stopSpeaking();
    setMode(withVoice ? "talking" : "typed");
    setCollapsed(false);
    setTranscript([{ role: "assistant", content: persona.greeting }]);
    if (withVoice) speak(persona.greeting);
  }, [persona, speak, stopSpeaking]);

  // Push-to-talk via MediaRecorder for browsers without SpeechRecognition.
  const toggleRecord = useCallback(async () => {
    if (recording) {
      recorderRef.current?.rec?.stop();
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new (window as any).MediaRecorder(stream);
      const chunks: Blob[] = [];
      rec.ondataavailable = (e: any) => { if (e.data?.size) chunks.push(e.data); };
      rec.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        setRecording(false);
        const blob = new Blob(chunks, { type: rec.mimeType || "audio/webm" });
        const buf = await blob.arrayBuffer();
        let bin = "";
        const bytes = new Uint8Array(buf);
        for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
        const base64 = btoa(bin);
        try {
          const res = await transcribeMut.mutateAsync({ audioBase64: base64, mimeType: blob.type });
          if (res.text) setTyped((prev) => (prev ? `${prev} ${res.text}` : res.text));
        } catch {
          setCaption("");
        }
      };
      recorderRef.current = { rec, chunks };
      rec.start();
      setRecording(true);
    } catch {
      setCaption("");
    }
  }, [recording, transcribeMut]);

  const toggleMic = useCallback(() => {
    if (sttSupported) {
      if (listening.state === "listening") listening.stop();
      else listening.start();
    } else if (serverStt) {
      void toggleRecord();
    }
  }, [listening, serverStt, sttSupported, toggleRecord]);

  if (!form || !persona) return null;
  // If the companion is not aboard (no LLM key), step aside so the plain form is
  // used. We only hide once we know it is off, not while flags are loading.
  if (flags.data && !flags.data.companion) return null;

  // Collapsed reopener after "I'd rather type" / close.
  if (collapsed) {
    return (
      <div className={cn("mb-4", className)}>
        <button
          type="button"
          onClick={() => { setCollapsed(false); if (mode === "invitation") setMode("invitation"); }}
          className={cn("inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium hover:bg-muted transition-colors", persona.accent)}
        >
          <MessageSquare className="w-4 h-4" aria-hidden="true" />
          Talk it out with {persona.name}
        </button>
      </div>
    );
  }

  // The invitation card.
  if (mode === "invitation") {
    return (
      <div className={cn("mb-5 rounded-2xl border bg-card p-4 sm:p-5", persona.accent, className)}>
        <div className="flex items-start gap-4">
          <div className="shrink-0 h-16 w-16 sm:h-20 sm:w-20 rounded-full overflow-hidden bg-gradient-to-br from-[#2f5d3a] to-[#d4a574] flex items-center justify-center">
            {portraitErr
              ? <span className="text-2xl" aria-hidden="true">⚓</span>
              : <img src={portraitUrl(persona.portrait)} alt={persona.name} className="h-full w-full object-cover" onError={() => setPortraitErr(true)} />}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs uppercase tracking-widest font-semibold opacity-80">{persona.role}</p>
            <p className="font-semibold text-foreground mt-0.5">{invitation}</p>
            <p className="text-sm text-muted-foreground mt-1">
              Step outside or find a window with a tree in it. Let's get your eyes on something beautiful and just talk this out like friends.
            </p>
            <div className="flex flex-wrap items-center gap-3 mt-3">
              <Button
                type="button"
                onClick={() => begin(true)}
                className="bg-[#2f5d3a] hover:bg-[#264a2f] text-white font-semibold"
              >
                <Mic className="w-4 h-4 mr-1.5" aria-hidden="true" />
                {form.entryLabel}
              </Button>
              <button
                type="button"
                onClick={() => setCollapsed(true)}
                className="text-sm text-muted-foreground underline underline-offset-2 hover:text-foreground"
              >
                I'd rather type
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Conversation mode (voice or typed).
  return (
    <div className={cn("mb-5 rounded-2xl border bg-card overflow-hidden", persona.accent, className)}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b bg-muted/40">
        <div className="shrink-0 h-9 w-9 rounded-full overflow-hidden bg-gradient-to-br from-[#2f5d3a] to-[#d4a574] flex items-center justify-center">
          {portraitErr
            ? <span className="text-base" aria-hidden="true">⚓</span>
            : <img src={portraitUrl(persona.portrait)} alt="" className="h-full w-full object-cover" onError={() => setPortraitErr(true)} />}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-sm truncate">{persona.name}</p>
          <p className="text-xs text-muted-foreground">{ready ? "Ready for you to look it over" : "Filling this out with you"}</p>
        </div>
        <button
          type="button"
          onClick={() => setSilent(!silent)}
          aria-pressed={silent}
          aria-label={silent ? "Turn her voice on" : "Reading mode, mute her voice"}
          className="rounded-full p-2 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffd700]"
          title={silent ? "Voice off (reading mode)" : "Voice on"}
        >
          {silent ? <VolumeX className="w-4 h-4" aria-hidden="true" /> : <Volume2 className="w-4 h-4" aria-hidden="true" />}
        </button>
        <button
          type="button"
          onClick={() => { stopSpeaking(); listening.stop(); setCollapsed(true); }}
          aria-label="Close the companion"
          className="rounded-full p-2 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffd700]"
        >
          <X className="w-4 h-4" aria-hidden="true" />
        </button>
      </div>

      {/* Choose her voice. Only the voices that match this character are offered,
          and it is pointless while in reading mode, so it hides when muted. */}
      {!silent && (
        <div className="px-4 py-2 border-b bg-muted/20">
          <VoicePicker
            personaKey={form.personaId}
            gender={personaGender}
            sampleText={persona.greeting}
          />
        </div>
      )}

      {/* Captions transcript (always rendered, so voice is never required) */}
      <div ref={scrollRef} className="max-h-72 overflow-y-auto px-4 py-3 space-y-2" aria-live="polite">
        {transcript.map((m, i) => (
          <div key={i} className={m.role === "user" ? "text-right" : ""}>
            <span className={cn(
              "inline-block px-3 py-2 rounded-2xl text-sm max-w-[85%] text-left",
              m.role === "user" ? "bg-[#2f5d3a] text-white" : "bg-muted text-foreground",
            )}>
              {m.content}
            </span>
          </div>
        ))}
        {caption && (
          <div className="text-right">
            <span className="inline-block px-3 py-2 rounded-2xl text-sm bg-[#2f5d3a]/50 text-white italic max-w-[85%] text-left">{caption}…</span>
          </div>
        )}
        {turnMut.isPending && (
          <div><span className="inline-block px-3 py-2 rounded-2xl text-sm bg-muted text-muted-foreground">…</span></div>
        )}
      </div>

      {/* Input row */}
      <form
        onSubmit={(e) => { e.preventDefault(); submitAnswer(typed); setTyped(""); }}
        className="flex items-center gap-2 px-3 py-3 border-t"
        style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
      >
        {canVoiceInput && (
          <button
            type="button"
            onClick={toggleMic}
            aria-label={listening.state === "listening" || recording ? "Stop listening" : "Talk to her"}
            aria-pressed={listening.state === "listening" || recording}
            className={cn(
              "shrink-0 rounded-full h-11 w-11 flex items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffd700]",
              (listening.state === "listening" || recording)
                ? "bg-red-600 text-white animate-pulse motion-reduce:animate-none"
                : "bg-[#2f5d3a] text-white hover:bg-[#264a2f]",
            )}
          >
            {(listening.state === "listening" || recording) ? <MicOff className="w-5 h-5" aria-hidden="true" /> : <Mic className="w-5 h-5" aria-hidden="true" />}
          </button>
        )}
        <Input
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          placeholder={canVoiceInput ? "Or type your answer" : "Type your answer"}
          className="flex-1 h-11 text-base"
          aria-label="Type your answer"
          enterKeyHint="send"
        />
        <Button type="submit" size="icon" disabled={!typed.trim() || turnMut.isPending} className="shrink-0 h-11 w-11 bg-[#2f5d3a] hover:bg-[#264a2f]">
          <Send className="w-4 h-4" aria-hidden="true" />
          <span className="sr-only">Send</span>
        </Button>
      </form>

      {ready && (
        <div className="px-4 py-3 border-t bg-[#ffd700]/10 text-sm">
          Here's what I've got. Look it over just below and send it when it's right.
        </div>
      )}
      {speaking && !silent && (
        <button type="button" onClick={stopSpeaking} className="sr-only">Stop speaking</button>
      )}
    </div>
  );
}
