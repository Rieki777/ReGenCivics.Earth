/**
 * VideoWithTutor: the video tutor module, meant to sit at the heart of every
 * video on the site. A YouTube player wired to the IFrame API (so we know the
 * current playback second) plus an ask-the-Guide panel whose answers are
 * grounded in the transcript around the moment being watched.
 *
 * Drop-in: give it any YouTube URL (same parsing as VideoEmbed). Non-YouTube
 * URLs render a plain VideoEmbed with no tutor, so it is always safe to use.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, MessageCircleQuestion, Send, Sparkles } from "lucide-react";
import { trpc } from "@/lib/trpc";
import VideoEmbed from "@/components/VideoEmbed";

// Minimal typings for the YouTube IFrame API (avoids an @types dependency).
declare global {
  interface Window {
    YT?: {
      Player: new (
        el: HTMLElement | string,
        opts: {
          videoId: string;
          playerVars?: Record<string, string | number>;
          events?: { onReady?: () => void };
        }
      ) => { getCurrentTime: () => number; destroy: () => void };
      loaded?: number;
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

function extractYouTubeId(url: string): string | null {
  const m = url
    ?.trim()
    .match(/(?:youtube\.com\/(?:watch\?.*v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  return m ? m[1] : /^[a-zA-Z0-9_-]{11}$/.test(url?.trim() ?? "") ? url.trim() : null;
}

let apiLoading: Promise<void> | null = null;
function loadYouTubeApi(): Promise<void> {
  if (window.YT?.Player) return Promise.resolve();
  if (!apiLoading) {
    apiLoading = new Promise((resolve) => {
      const prev = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        prev?.();
        resolve();
      };
      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      document.head.appendChild(tag);
    });
  }
  return apiLoading;
}

type ChatMessage = { role: "you" | "guide"; text: string; atTime?: string };

const SUGGESTED = ["Explain this part", "What am I looking at?", "What should I do next?"];

interface VideoWithTutorProps {
  url: string;
  title?: string;
  className?: string;
}

export default function VideoWithTutor({ url, title, className = "" }: VideoWithTutorProps) {
  const videoId = extractYouTubeId(url);
  const playerHostRef = useRef<HTMLDivElement | null>(null);
  const playerRef = useRef<{ getCurrentTime: () => number; destroy: () => void } | null>(null);
  const [playerReady, setPlayerReady] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  const statusQuery = trpc.videoTutor.status.useQuery(
    { videoId: videoId ?? "" },
    { enabled: Boolean(videoId), staleTime: 10 * 60 * 1000 }
  );
  const askMutation = trpc.videoTutor.ask.useMutation();

  useEffect(() => {
    if (!videoId || !playerHostRef.current) return;
    let cancelled = false;
    loadYouTubeApi().then(() => {
      if (cancelled || !playerHostRef.current || !window.YT?.Player) return;
      playerRef.current = new window.YT.Player(playerHostRef.current, {
        videoId,
        playerVars: { rel: 0, modestbranding: 1 },
        events: { onReady: () => setPlayerReady(true) },
      });
    });
    return () => {
      cancelled = true;
      try {
        playerRef.current?.destroy();
      } catch {
        // player already gone
      }
      playerRef.current = null;
    };
  }, [videoId]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [messages]);

  const ask = useCallback(
    (question: string) => {
      const q = question.trim();
      if (!q || !videoId || askMutation.isPending) return;
      let t = 0;
      try {
        t = Math.max(0, Math.floor(playerRef.current?.getCurrentTime() ?? 0));
      } catch {
        t = 0;
      }
      const atTime = `${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")}`;
      setMessages((prev) => [...prev, { role: "you", text: q, atTime }]);
      setInput("");
      askMutation.mutate(
        { videoId, currentTimeSec: t, question: q },
        {
          onSuccess: (res) => {
            setMessages((prev) => [
              ...prev,
              { role: "guide", text: res.ok ? res.answer : res.reason },
            ]);
          },
          onError: () => {
            setMessages((prev) => [
              ...prev,
              { role: "guide", text: "The tutor hit a snag. Give it a moment and ask again." },
            ]);
          },
        }
      );
    },
    [videoId, askMutation]
  );

  // Non-YouTube (or unparseable): plain embed, no tutor. Always safe.
  if (!videoId) return <VideoEmbed url={url} title={title} className={className} />;

  const tutorAvailable = statusQuery.data?.configured !== false;

  return (
    <div className={className}>
      <div className="rounded-xl overflow-hidden bg-black">
        <div className="w-full aspect-video">
          <div ref={playerHostRef} className="w-full h-full" title={title || "Video"} />
        </div>
      </div>

      {tutorAvailable && (
        <div className="mt-3 rounded-xl border border-[#1a472a]/30 bg-white/60 dark:bg-black/30 backdrop-blur p-3">
          <div className="flex items-center gap-2 text-sm font-medium text-[#1a472a] dark:text-[#7dd87d]">
            <Sparkles className="w-4 h-4" />
            Ask the Guide about this video
            {statusQuery.data && !statusQuery.data.hasTranscript && (
              <span className="text-xs font-normal opacity-60">
                (no captions found; answers use ReGen context only)
              </span>
            )}
          </div>

          {messages.length > 0 && (
            <div className="mt-3 max-h-72 overflow-y-auto space-y-2 pr-1">
              {messages.map((m, i) => (
                <div
                  key={i}
                  className={
                    m.role === "you"
                      ? "ml-8 rounded-lg bg-[#1a472a] text-white px-3 py-2 text-sm"
                      : "mr-8 rounded-lg bg-[#7dd87d]/15 px-3 py-2 text-sm"
                  }
                >
                  {m.role === "you" && m.atTime && (
                    <span className="block text-[10px] opacity-60">at {m.atTime}</span>
                  )}
                  <span className="whitespace-pre-wrap">{m.text}</span>
                </div>
              ))}
              {askMutation.isPending && (
                <div className="mr-8 rounded-lg bg-[#7dd87d]/15 px-3 py-2 text-sm flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  thinking with the transcript...
                </div>
              )}
              <div ref={chatEndRef} />
            </div>
          )}

          {messages.length === 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {SUGGESTED.map((s) => (
                <button
                  key={s}
                  onClick={() => ask(s)}
                  disabled={askMutation.isPending || !playerReady}
                  className="text-xs rounded-full border border-[#1a472a]/30 px-3 py-1.5 hover:bg-[#7dd87d]/20 transition-colors disabled:opacity-50"
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          <form
            className="mt-3 flex items-center gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              ask(input);
            }}
          >
            <MessageCircleQuestion className="w-4 h-4 shrink-0 opacity-50" />
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about the moment you're watching..."
              maxLength={1000}
              className="flex-1 bg-transparent border-b border-[#1a472a]/30 focus:border-[#1a472a] outline-none text-sm py-1"
            />
            <button
              type="submit"
              disabled={!input.trim() || askMutation.isPending}
              aria-label="Ask"
              className="rounded-full bg-[#1a472a] text-white p-2 disabled:opacity-40 hover:scale-105 transition-transform"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
