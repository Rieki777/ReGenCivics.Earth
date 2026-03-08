/**
 * ReGenGuide - Floating AI chat assistant widget.
 * Uses streaming SSE for real-time word-by-word responses.
 */
import { useState, useCallback, useRef } from "react";
import { MessageCircle, X, Sparkles } from "lucide-react";
import { AIChatBox, type Message } from "@/components/AIChatBox";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";

const PATH_WELCOMES: Record<string, string> = {
  investor: "Welcome back! As your personal guide, I can help you explore investment opportunities, understand our fund structure, review the seasonal accelerator model, or connect you to the right resources. What can I help you with?",
  land_project: "Welcome back! I'm here to support your land project journey  -  whether that's showcasing your project, connecting with investors, navigating the platform, or understanding the accelerator. What would you like to explore?",
  ally: "Welcome back! I can help you understand partnership opportunities, how Alliance Partners contribute to the ecosystem, and how your organisation can plug in and add value. What are you curious about?",
  player: "Welcome, Player! I'm your guide to Quests, the Infinite Game, token rewards, and all the ways you can contribute and co-create. What would you like to know?",
};

export default function ReGenGuide() {
  const { user } = useAuth();
  const { data: profile } = trpc.userProfiles.getMe.useQuery(undefined, {
    enabled: !!user,
    staleTime: 300_000,
  });

  const userPath = profile?.path ?? undefined;
  const welcomeMessage =
    userPath && PATH_WELCOMES[userPath]
      ? PATH_WELCOMES[userPath]
      : "Hi! I'm your personal ReGen Guide. I can help you explore the Fund, understand the Infinite Game, find your path, or answer any questions about the regenerative ecosystem. What would you like to know?";

  const [isOpen, setIsOpen] = useState(false);
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
                "Sorry, I ran into a hiccup. Please try again in a moment  -  or visit /schedule to book a live session with the team.",
            };
          }
          return updated;
        });
      } finally {
        setIsStreaming(false);
      }
    },
    [messages]
  );

  return (
    <>
      {/* Chat Panel */}
      {isOpen && (
        <div className="fixed bottom-20 right-2 left-2 sm:left-auto sm:right-4 z-[9999] sm:w-[380px] max-h-[60vh] sm:max-h-[70vh] rounded-2xl overflow-hidden shadow-2xl shadow-black/50 border border-[#7dd87d]/30 bg-[#0a2314]">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-[#1a472a] to-[#2d5a3d] border-b border-[#7dd87d]/20">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[#7dd87d]" />
              <span
                className="text-white font-bold text-sm"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Your ReGen Guide
              </span>
              {isStreaming && (
                <span className="flex gap-0.5 ml-1">
                  <span className="w-1 h-1 bg-[#7dd87d] rounded-full animate-bounce [animation-delay:0ms]" />
                  <span className="w-1 h-1 bg-[#7dd87d] rounded-full animate-bounce [animation-delay:150ms]" />
                  <span className="w-1 h-1 bg-[#7dd87d] rounded-full animate-bounce [animation-delay:300ms]" />
                </span>
              )}
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-white/60 hover:text-white transition-colors p-1"
              aria-label="Close chat"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

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
      )}

      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed bottom-4 right-4 z-[9999] w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-all duration-300 btn-press ${
          isOpen
            ? "bg-white/10 border border-white/20 text-white/60 hover:text-white"
            : "bg-[#7dd87d] text-[#1a472a] hover:bg-[#9de89d] shadow-[0_0_20px_rgba(125,216,125,0.4)]"
        }`}
        aria-label={isOpen ? "Close Your ReGen Guide" : "Open Your ReGen Guide"}
      >
        {isOpen ? (
          <X className="w-6 h-6" />
        ) : (
          <MessageCircle className="w-6 h-6" />
        )}
      </button>
    </>
  );
}
