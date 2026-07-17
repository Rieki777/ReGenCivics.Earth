/**
 * ReGenGuide - AI chat assistant panel.
 * Uses streaming SSE for real-time word-by-word responses.
 * Opened/closed via the Command Panel's Guide button (ReGenGuideContext).
 */
import { useState, useCallback, useRef, useEffect } from "react";
import { X, Sparkles, Settings, Volume2, VolumeX } from "lucide-react";
import { AIChatBox, type Message } from "@/components/AIChatBox";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useReGenGuide } from "@/contexts/ReGenGuideContext";
import { DesignYourGuide } from "@/components/DesignYourGuide";
import { guidePortraitUrl, guideArchetype } from "@shared/guide";
import { useSpeech, useSilentPreference, useVoicePreference } from "@/components/companion/useVoice";

const PATH_WELCOMES: Record<string, string> = {
  investor: "Welcome back! I'm your personal ReGen Guide, here to walk you through the Fund: the investment thesis, the seasonal accelerator, or your next step. What's on your mind?",
  land_project: "Welcome back! Glad you're here. I'm your guide for everything on the land project journey: showcasing your work, connecting with investors, or making the most of the accelerator. Where would you like to start?",
  ally: "Welcome back! I'm here to help you find where your organisation fits in the ReGen Civics ecosystem: understanding alliance partnerships, the value exchange model, or how to get involved. What would you like to explore?",
  player: "Welcome back, Player! I'm your guide to Quests, the Infinite Game, and all the ways you can contribute and co-create in the regenerative movement. What would you like to know?",
};

const STARTER_PROMPTS = [
  "How does the ReGen Civics fund work?",
  "What are quests and how do I earn rewards?",
  "How do I invest or contribute?",
  "What is the difference between the 4 paths?",
];

export default function ReGenGuide() {
  const { user } = useAuth();
  const { isOpen, close } = useReGenGuide();
  const { data: profile } = trpc.userProfiles.getMe.useQuery(undefined, {
    enabled: !!user,
    staleTime: 300_000,
  });
  const guidePrefsQuery = trpc.guide.mine.useQuery(undefined, { enabled: !!user, staleTime: 60_000 });
  const prefs = guidePrefsQuery.data ?? null;
  const guideName = prefs?.guideName || "Your ReGen Guide";
  const voiceEnabled = Boolean(prefs?.voiceEnabled);
  const [silent, setSilent] = useSilentPreference();
  // The Guide speaks in the voice the member chose for it, matched to the face
  // they picked (the Grandmother never speaks in a man's voice).
  const guideGender = guideArchetype(prefs?.portraitKey).gender;
  const [guideVoiceURI] = useVoicePreference("guide");
  const { speak, stop: stopSpeaking } = useSpeech(silent || !voiceEnabled, {
    gender: guideGender,
    voiceURI: guideVoiceURI,
  });
  const [designOpen, setDesignOpen] = useState(false);

  const userPath = profile?.path ?? undefined;
  const welcomeMessage =
    userPath && PATH_WELCOMES[userPath]
      ? PATH_WELCOMES[userPath]
      : "Hi! I'm Your ReGen Guide, here to help you find your footing in the regenerative ecosystem. Whether you're curious about the Fund, the Infinite Game, or just figuring out where you fit, I've got you. What would you like to explore?";

  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: welcomeMessage,
    },
  ]);
  const [isStreaming, setIsStreaming] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const handleSendMessage = useCallback(
    async (content: string) => {
      const userMessage: Message = { role: "user", content };
      const withUser = [...messages, userMessage];
      setMessages(withUser);
      setIsStreaming(true);

      // Add an empty placeholder for the streaming assistant response
      setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      stopSpeaking();
      let spoken = "";

      try {
        const response = await fetch("/api/chat/stream", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: withUser.map((m) => ({ role: m.role, content: m.content })),
            userPath,
          }),
          signal: controller.signal,
        });

        if (!response.body) throw new Error("No response body");

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const data = line.slice(6);
            if (data === "[DONE]") break;

            try {
              const parsed = JSON.parse(data) as { content?: string; error?: string };
              if (parsed.content) {
                spoken += parsed.content;
                setMessages((prev) => {
                  const updated = [...prev];
                  const last = updated[updated.length - 1];
                  if (last?.role === "assistant") {
                    updated[updated.length - 1] = {
                      ...last,
                      content: last.content + parsed.content,
                    };
                  }
                  return updated;
                });
              }
            } catch {
              // ignore malformed JSON lines
            }
          }
        }
      } catch (err: unknown) {
        if (err instanceof Error && err.name === "AbortError") return;
        setMessages((prev) => {
          const updated = [...prev];
          const last = updated[updated.length - 1];
          if (last?.role === "assistant" && last.content === "") {
            updated[updated.length - 1] = {
              ...last,
              content:
                "Sorry, I ran into a hiccup. Please try again in a moment. Visit /schedule to book a live session with the team.",
            };
          }
          return updated;
        });
      } finally {
        setIsStreaming(false);
        if (voiceEnabled && !silent && spoken.trim()) speak(spoken.trim());
      }
    },
    [messages, voiceEnabled, silent, speak, stopSpeaking]
  );

  // Listen for starter prompts dispatched by other panels (e.g. AssistTab).
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<string>).detail;
      if (typeof detail === "string" && detail.trim().length > 0) {
        handleSendMessage(detail);
      }
    };
    window.addEventListener("regen-guide-prompt", handler);
    return () => window.removeEventListener("regen-guide-prompt", handler);
  }, [handleSendMessage]);

  if (!isOpen) return null;

  return (
    <div className="fixed bottom-[8.5rem] md:bottom-20 right-2 left-2 sm:right-auto sm:left-4 z-[9999] sm:w-[380px] max-h-[50vh] sm:max-h-[70vh] rounded-2xl overflow-hidden shadow-2xl shadow-black/50 border border-[#7dd87d]/30 bg-[#0a2314]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-[#1a472a] to-[#2d5a3d] border-b border-[#7dd87d]/20">
        <div className="flex items-center gap-2 min-w-0">
          {prefs?.portraitKey ? (
            <img src={guidePortraitUrl(prefs.portraitKey)} alt="" className="w-6 h-6 rounded-full object-cover shrink-0 ring-1 ring-[#7dd87d]/40" />
          ) : (
            <Sparkles className="w-5 h-5 text-[#7dd87d] shrink-0" />
          )}
          <span
            className="text-white font-bold text-sm truncate"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {guideName}
          </span>
          {isStreaming && (
            <span className="flex gap-0.5 ml-1">
              <span className="w-1 h-1 bg-[#7dd87d] rounded-full animate-bounce [animation-delay:0ms]" />
              <span className="w-1 h-1 bg-[#7dd87d] rounded-full animate-bounce [animation-delay:150ms]" />
              <span className="w-1 h-1 bg-[#7dd87d] rounded-full animate-bounce [animation-delay:300ms]" />
            </span>
          )}
        </div>
        <div className="flex items-center gap-0.5">
          {voiceEnabled && (
            <button
              onClick={() => { setSilent(!silent); if (!silent) stopSpeaking(); }}
              aria-pressed={silent}
              className="text-white/60 hover:text-white transition-colors p-1"
              aria-label={silent ? "Turn the Guide's voice on" : "Mute the Guide's voice"}
              title={silent ? "Voice off (reading mode)" : "Voice on"}
            >
              {silent ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
          )}
          {user && (
            <button
              onClick={() => setDesignOpen(true)}
              className="text-white/60 hover:text-white transition-colors p-1"
              aria-label="Design your Guide"
              title="Design your Guide"
            >
              <Settings className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={close}
            className="text-white/60 hover:text-white transition-colors p-1"
            aria-label="Close chat"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {user && (
        <DesignYourGuide
          open={designOpen}
          onOpenChange={setDesignOpen}
          existing={prefs}
          onSaved={() => guidePrefsQuery.refetch()}
        />
      )}

      {/* First-time invite to make the Guide your own. */}
      {user && guidePrefsQuery.isSuccess && !prefs && messages.length <= 1 && (
        <button
          onClick={() => setDesignOpen(true)}
          className="mx-3 mt-3 w-[calc(100%-1.5rem)] rounded-xl border border-[#7dd87d]/30 bg-[#1a472a]/50 px-3 py-2 text-left text-xs text-[#7dd87d] hover:border-[#7dd87d]/60 transition-colors"
        >
          Make this Guide your own: name it, choose its face, and how it talks.
        </button>
      )}

      {/* Starter prompts - shown when conversation is fresh */}
      {messages.length <= 1 && (
        <div className="px-3 pt-3 pb-1 flex flex-wrap gap-1.5">
          {STARTER_PROMPTS.map((prompt) => (
            <button
              key={prompt}
              onClick={() => handleSendMessage(prompt)}
              className="text-xs px-2.5 py-1 rounded-full bg-[#1a472a]/60 border border-[#7dd87d]/30 text-[#7dd87d]/80 hover:border-[#7dd87d]/60 hover:text-[#7dd87d] transition-colors"
            >
              {prompt}
            </button>
          ))}
        </div>
      )}

      {/* Chat Body */}
      <AIChatBox
        messages={messages}
        onSendMessage={handleSendMessage}
        isLoading={isStreaming}
        placeholder="Ask about the Fund, Game, or how to participate..."
        height={320}
        className="border-0 rounded-none"
      />
    </div>
  );
}
