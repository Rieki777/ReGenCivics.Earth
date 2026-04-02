/**
 * SiteTour - AI-powered site guide that answers questions about ReGen Civics.
 * Floating "Show Me Around" button (bottom-right) opens a slide-in chat panel.
 * Uses the siteTour.chat tRPC endpoint backed by Claude.
 */
import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { Sparkles, X, Send, ChevronRight } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { analytics } from "@/lib/analytics";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const STARTER_PROMPTS = [
  "How does the ReGen Civics fund work?",
  "What are quests and how do I earn rewards?",
  "How do I invest or contribute?",
  "What is the difference between the 4 paths?",
];

const PAGE_LABELS: Record<string, string> = {
  "/": "Home",
  "/fund": "Fund page",
  "/land": "Land Projects page",
  "/ally": "Alliance Orgs page",
  "/play": "Play/Players page",
  "/quest": "Quests page",
  "/game": "Game Overview page",
  "/opportunity": "Opportunity page",
  "/governance": "Governance page",
  "/tokenomics": "Tokenomics page",
  "/crowd-pooling": "Crowd Pooling page",
  "/crowd-pooling-projects": "Crowd Pooling Projects page",
  "/map": "Map page",
  "/calculator": "Calculator page",
  "/blog": "Blog",
  "/community": "Community Forum",
  "/apply": "Apply page",
  "/profile": "Player Profile",
  "/team": "Team page",
};

export function SiteTour() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [location] = useLocation();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const currentPage = PAGE_LABELS[location] ?? location;

  const chatMutation = trpc.siteTour.chat.useMutation();

  // Scroll to bottom when messages update
  useEffect(() => {
    if (open) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, open]);

  // Focus input when panel opens
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100);
      // Add welcome message on first open
      if (messages.length === 0) {
        setMessages([
          {
            role: "assistant",
            content:
              "Hi! I'm your ReGen Civics guide. I can explain how the fund works, how to earn quest rewards, how to invest, and anything else about the platform. What would you like to know?",
          },
        ]);
      }
    }
  }, [open]);

  async function sendMessage(content: string) {
    if (!content.trim() || chatMutation.isPending) return;
    setInput("");

    const newMessages: Message[] = [...messages, { role: "user", content }];
    setMessages(newMessages);

    try {
      const result = await chatMutation.mutateAsync({
        messages: newMessages,
        currentPage,
        userRole: "guest",
      });
      setMessages([...newMessages, { role: "assistant", content: result.content }]);
    } catch {
      setMessages([
        ...newMessages,
        { role: "assistant", content: "Sorry, I ran into an issue. Please try again." },
      ]);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    sendMessage(input);
  }

  return (
    <>
      {/* Floating trigger button */}
      <button
        onClick={() => { setOpen(true); analytics.siteTourOpened(); }}
        className={`fixed bottom-[72px] right-4 z-40 flex items-center gap-2 px-4 py-3 rounded-full shadow-lg transition-all duration-200 font-medium text-sm
          bg-[#1a472a] border border-[#7dd87d]/40 text-[#7dd87d] hover:bg-[#1e5533] hover:border-[#7dd87d]/70 hover:shadow-xl
          ${open ? "opacity-0 pointer-events-none" : "opacity-100"}`}
        aria-label="Open site tour"
      >
        <Sparkles className="w-4 h-4" />
        <span className="hidden sm:inline">Show Me Around</span>
      </button>

      {/* Backdrop (mobile only) */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/50 sm:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Chat panel  -  slide in from right */}
      <div
        className={`fixed z-50 flex flex-col transition-transform duration-300 ease-in-out
          inset-0 sm:inset-auto sm:bottom-0 sm:right-0 sm:top-auto sm:h-[580px] sm:w-[380px] sm:rounded-t-2xl sm:rounded-bl-2xl
          bg-[#0f2d1a] border border-[#7dd87d]/20 shadow-2xl
          ${open ? "translate-y-0 sm:translate-y-0" : "translate-y-full sm:translate-y-full"}`}
        style={{ maxHeight: "100dvh" }}
        aria-hidden={!open}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#7dd87d]/15 shrink-0">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#7dd87d]" />
            <span className="font-semibold text-white text-sm">ReGen Civics Guide</span>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="text-white/50 hover:text-white/90 transition-colors p-1 rounded"
            aria-label="Close guide"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-0">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                  msg.role === "user"
                    ? "bg-[#7dd87d] text-[#0f2d1a] rounded-br-sm font-medium"
                    : "bg-[#1a472a] text-white/90 rounded-bl-sm border border-[#7dd87d]/10"
                }`}
              >
                {msg.content}
              </div>
            </div>
          ))}
          {chatMutation.isPending && (
            <div className="flex justify-start">
              <div className="bg-[#1a472a] border border-[#7dd87d]/10 rounded-2xl rounded-bl-sm px-3 py-2">
                <span className="flex gap-1">
                  {[0, 1, 2].map((i) => (
                    <span
                      key={i}
                      className="w-1.5 h-1.5 bg-[#7dd87d]/60 rounded-full animate-bounce"
                      style={{ animationDelay: `${i * 150}ms` }}
                    />
                  ))}
                </span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Starter prompts  -  shown when only the welcome message exists */}
        {messages.length <= 1 && (
          <div className="px-4 pb-2 space-y-1.5 shrink-0">
            <p className="text-white/60 text-xs mb-2">Suggested questions:</p>
            {STARTER_PROMPTS.map((prompt) => (
              <button
                key={prompt}
                onClick={() => sendMessage(prompt)}
                className="w-full text-left text-xs text-white/70 hover:text-[#7dd87d] bg-[#1a472a]/60 hover:bg-[#1a472a] border border-[#7dd87d]/10 hover:border-[#7dd87d]/30 rounded-lg px-3 py-2 transition-colors flex items-center gap-2"
              >
                <ChevronRight className="w-3 h-3 shrink-0 text-[#7dd87d]/60" />
                {prompt}
              </button>
            ))}
          </div>
        )}

        {/* Input */}
        <form
          onSubmit={handleSubmit}
          className="flex items-center gap-2 px-3 py-3 border-t border-[#7dd87d]/15 shrink-0"
        >
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask anything about ReGen Civics..."
            className="flex-1 bg-[#1a472a]/60 border border-[#7dd87d]/20 rounded-xl px-3 py-2 text-sm text-white placeholder-white/30 outline-none focus:border-[#7dd87d]/50 transition-colors"
            disabled={chatMutation.isPending}
          />
          <button
            type="submit"
            disabled={!input.trim() || chatMutation.isPending}
            className="p-2 rounded-xl bg-[#7dd87d] text-[#0f2d1a] hover:bg-[#6bc96b] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            aria-label="Send message"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </>
  );
}
