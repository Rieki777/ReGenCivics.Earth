/**
 * HarvestNoteComposer: the Add note capture surface inside the admin FAB
 * (Harvest Phase 1, build item 7). Friction is the enemy; losing a capture
 * is a P0. So:
 *
 *  - Text saves are optimistic: the note appears in the strip instantly and a
 *    failed save lands in a localStorage queue that flushes on reconnect.
 *  - Voice recordings are held in memory the moment recording stops, uploaded
 *    to the PRIVATE R2 prefix, transcribed, and the transcript is shown for
 *    Rye to confirm or tweak BEFORE the note is final. Transcription failure
 *    never loses audio (it is already stored server-side).
 *
 * Rendered only when quickNotes.status succeeds, i.e. only for the owner.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { TRPCClientError } from "@trpc/client";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Check, CloudOff, Loader2, Mic, Square, X } from "lucide-react";

const QUEUE_KEY = "harvest-offline-notes";

/**
 * A save the server actively refused, as opposed to one that never reached it.
 * The two must not be confused: queueing a refusal would show "waiting to sync"
 * over a note that can never sync. quickNotes.create is ownerProcedure, so a
 * non-owner admin lands here every time.
 */
function isRefusal(err: unknown): boolean {
  if (!(err instanceof TRPCClientError)) return false;
  const code = (err.data as { code?: string } | null | undefined)?.code;
  return code === "FORBIDDEN" || code === "UNAUTHORIZED" || code === "BAD_REQUEST";
}

type QueuedNote = { body: string; ts: number };

function readQueue(): QueuedNote[] {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    const parsed = raw ? (JSON.parse(raw) as QueuedNote[]) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeQueue(queue: QueuedNote[]): void {
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  } catch {
    // Quota or private mode: nothing else we can do; the note is still in state.
  }
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      resolve(dataUrl.slice(dataUrl.indexOf(",") + 1));
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

type SavedChip = { key: string; preview: string; state: "saving" | "saved" | "queued" };

export function HarvestNoteComposer({ voiceEnabled }: { voiceEnabled: boolean }) {
  const [body, setBody] = useState("");
  const [audioKey, setAudioKey] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [chips, setChips] = useState<SavedChip[]>([]);
  const [queuedCount, setQueuedCount] = useState(() => readQueue().length);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savedFlash, setSavedFlash] = useState(false);
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const createMutation = trpc.quickNotes.create.useMutation();
  const transcribeMutation = trpc.quickNotes.transcribeVoice.useMutation();

  const flushQueue = useCallback(async () => {
    const queue = readQueue();
    if (queue.length === 0) return;
    const remaining: QueuedNote[] = [];
    for (const item of queue) {
      try {
        await createMutation.mutateAsync({ body: item.body });
      } catch {
        remaining.push(item);
      }
    }
    writeQueue(remaining);
    setQueuedCount(remaining.length);
  }, [createMutation]);

  useEffect(() => {
    void flushQueue();
    const onOnline = () => void flushQueue();
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function pushChip(preview: string, state: SavedChip["state"]): string {
    const key = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setChips((prev) => [{ key, preview: preview.slice(0, 60), state }, ...prev].slice(0, 4));
    return key;
  }

  function setChipState(key: string, state: SavedChip["state"]) {
    setChips((prev) => prev.map((c) => (c.key === key ? { ...c, state } : c)));
  }

  function flashSaved() {
    setSavedFlash(true);
    if (flashTimer.current) clearTimeout(flashTimer.current);
    flashTimer.current = setTimeout(() => setSavedFlash(false), 2500);
  }

  useEffect(() => () => {
    if (flashTimer.current) clearTimeout(flashTimer.current);
  }, []);

  async function saveNote() {
    const text = body.trim();
    if (!text) return;
    const keyForVoice = audioKey;
    // Optimistic: clear the composer immediately so the next thought can land.
    setBody("");
    setAudioKey(null);
    setVoiceError(null);
    setSaveError(null);
    const chip = pushChip(text, "saving");
    try {
      await createMutation.mutateAsync({ body: text, ...(keyForVoice ? { audioKey: keyForVoice } : {}) });
      setChipState(chip, "saved");
      flashSaved();
    } catch (err) {
      if (isRefusal(err)) {
        // The server said no and will keep saying no. Never queue this: give the
        // text back so it is not lost, and say what actually happened.
        setChips((prev) => prev.filter((c) => c.key !== chip));
        setBody(text);
        setAudioKey(keyForVoice);
        setSaveError(
          (err as TRPCClientError<never>).message ||
            "This capture inbox belongs to its owner, so the note was not saved.",
        );
        return;
      }
      // Offline or server hiccup: queue it (text only; the voice audio is
      // already stored server-side, so the transcript text is what matters).
      const queue = readQueue();
      queue.push({ body: text, ts: Date.now() });
      writeQueue(queue);
      setQueuedCount(queue.length);
      setChipState(chip, "queued");
    }
  }

  async function startRecording() {
    setVoiceError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : MediaRecorder.isTypeSupported("audio/mp4")
          ? "audio/mp4"
          : "";
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        // The capture is held in memory the moment recording stops.
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        void handleRecordingReady(blob);
      };
      recorderRef.current = recorder;
      recorder.start();
      setRecording(true);
    } catch {
      setVoiceError("Microphone access was blocked. Type the note instead.");
    }
  }

  function stopRecording() {
    recorderRef.current?.stop();
    recorderRef.current = null;
    setRecording(false);
  }

  async function handleRecordingReady(blob: Blob) {
    setTranscribing(true);
    try {
      const audioBase64 = await blobToBase64(blob);
      const res = await transcribeMutation.mutateAsync({
        audioBase64,
        mimeType: blob.type || "audio/webm",
      });
      // Show the transcript for confirm/tweak/split before it is final.
      setAudioKey(res.audioKey);
      setBody((prev) => (prev.trim() ? `${prev.trim()}\n\n${res.transcript}` : res.transcript));
      setTimeout(() => textareaRef.current?.focus(), 50);
    } catch (err) {
      setVoiceError((err as Error)?.message ?? "Transcription failed. Try again or type it.");
    } finally {
      setTranscribing(false);
    }
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      void saveNote();
    }
  }

  return (
    <div className="flex flex-col gap-2 p-3">
      <Textarea
        ref={textareaRef}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        onKeyDown={handleKey}
        placeholder={transcribing ? "Transcribing your voice note..." : "Capture the idea. Save with Ctrl+Enter."}
        className="min-h-[120px] max-h-[220px] resize-none text-sm border-[#4a7c59]/30 focus-visible:ring-[#7dd87d] rounded-xl"
        disabled={transcribing}
      />

      {audioKey && (
        <p className="text-xs text-[#4a7c59] flex items-center gap-1.5">
          <Mic className="w-3 h-3" />
          Voice transcript. Tweak it, then save.
          <button
            onClick={() => setAudioKey(null)}
            className="ml-1 text-[#4a7c59]/60 hover:text-[#4a7c59]"
            title="Treat as typed text"
          >
            <X className="w-3 h-3" />
          </button>
        </p>
      )}

      {voiceError && <p className="text-xs text-red-700">{voiceError}</p>}
      {saveError && (
        <p className="text-xs text-red-700" data-testid="harvest-save-error">
          {saveError}
        </p>
      )}
      {savedFlash && (
        <p className="text-xs text-[#4a7c59] flex items-center gap-1.5" data-testid="harvest-saved-flash">
          <Check className="w-3 h-3" />
          Saved to your brain
        </p>
      )}

      <div className="flex items-center gap-2">
        {voiceEnabled && (
          <Button
            onClick={recording ? stopRecording : startRecording}
            disabled={transcribing}
            variant={recording ? "destructive" : "outline"}
            size="icon"
            className={recording ? "h-10 w-10 rounded-xl" : "h-10 w-10 rounded-xl border-[#4a7c59]/40 text-[#1a472a]"}
            aria-label={recording ? "Stop recording" : "Record a voice note"}
            title={recording ? "Stop recording" : "Record a voice note"}
          >
            {transcribing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : recording ? (
              <Square className="w-4 h-4" />
            ) : (
              <Mic className="w-4 h-4" />
            )}
          </Button>
        )}
        {recording && <span className="text-xs text-red-700 animate-pulse">Recording... tap to stop</span>}
        <div className="flex-1" />
        <Button
          onClick={() => void saveNote()}
          disabled={!body.trim() || transcribing}
          data-testid="harvest-save"
          className="h-10 rounded-xl bg-[#1a472a] hover:bg-[#2d5a3d] px-5 font-semibold shadow-sm"
        >
          Save note
        </Button>
      </div>

      {queuedCount > 0 && (
        <p className="text-xs text-amber-700 flex items-center gap-1.5">
          <CloudOff className="w-3 h-3" />
          {queuedCount} note{queuedCount === 1 ? "" : "s"} waiting to sync. They send when you are back online.
        </p>
      )}

      {chips.length > 0 && (
        <div className="space-y-1 pt-1 border-t border-[#1a472a]/10">
          {chips.map((c) => (
            <p key={c.key} className="text-xs text-[#1a472a]/70 flex items-center gap-1.5 truncate">
              {c.state === "saving" && <Loader2 className="w-3 h-3 animate-spin flex-shrink-0" />}
              {c.state === "saved" && <Check className="w-3 h-3 text-[#4a7c59] flex-shrink-0" />}
              {c.state === "queued" && <CloudOff className="w-3 h-3 text-amber-700 flex-shrink-0" />}
              <span className="truncate">{c.preview}</span>
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

export default HarvestNoteComposer;
