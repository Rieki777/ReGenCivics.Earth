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
  investor: "Welcome back! I can help you explore investment opportunities in regenerative land projects, understand our fund structure, or connect you with promising projects. What would you like to know?",
  land_project: "Welcome! I can help you understand how to showcase your land project, connect with investors, and navigate our platform. What would you like to know?",
  ally: "Welcome! I can help you explore partnership opportunities, understand how Alliance Partners contribute to our ecosystem, and find ways to connect your organization. What would you like to know?",
  player: "Welcome, Player! I can help you discover Quests, understand the Infinite Game mechanics, and find ways to contribute and earn rewards. What would you like to know?",
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
      : "Welcome to ReGen Civics! I can help you understand the Fund, the Infinite Game, how to participate, or anything else about our regenerative ecosystem. What would you like to know?";

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
                "Sorry, I had trouble processing that. Please try again or visit our /schedule page to join a live session where the team can help directly.",
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
                ReGen Guide
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
        aria-label={isOpen ? "Close ReGen Guide" : "Open ReGen Guide"}
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
